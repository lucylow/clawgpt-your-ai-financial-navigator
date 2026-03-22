import type { Server as IoServer } from "socket.io";
import type { PrismaClient } from "@prisma/client";
import { rankYieldOpportunities } from "../config/defiTestnet.js";
import type { AgentChainId } from "../lib/constants.js";
import { normalizeAssetSymbol } from "../lib/constants.js";
import { AppError } from "../lib/appError.js";
import { SafetyService } from "./safety.service.js";
import type { SendTokenParams, WalletService } from "./wallet.service.js";

export type AgentToolsDeps = {
  walletService: WalletService;
  safetyService: SafetyService;
  db: PrismaClient;
  io?: IoServer;
};

export class AgentToolsService {
  constructor(private readonly deps: AgentToolsDeps) {}

  async getPortfolio(userId: string, walletId: string | null) {
    if (!walletId) throw new AppError("No wallet", "NO_WALLET", 400);
    return this.deps.walletService.getBalances(userId, walletId);
  }

  async sendToken(
    params: SendTokenParams & { amountUsdHint?: number },
    opts?: { userConfirmedPlan?: boolean },
  ) {
    const safety = await this.deps.safetyService.checkTx(params.userId, params, {
      skipConfirmGate: Boolean(opts?.userConfirmedPlan),
    });
    if (!safety.safe) {
      throw new AppError(safety.reason ?? "Policy blocked", "POLICY_BLOCKED", 400);
    }
    if (safety.requiresConfirm && !opts?.userConfirmedPlan) {
      throw new AppError("Confirmation required for this transfer", "CONFIRM_REQUIRED", 409, true);
    }
    const tx = await this.deps.walletService.sendToken(params);
    await this.deps.db.agentActionLog.create({
      data: {
        userId: params.userId,
        type: "agent_send",
        status: "confirmed",
        txHash: tx.txHash,
        payload: {
          chain: tx.chain,
          asset: tx.asset,
          amount: params.amount,
          toAddress: params.toAddress,
          walletId: params.walletId,
          amountUsdHint: params.amountUsdHint,
        },
      },
    });
    this.deps.io?.to(`user:${params.userId}`).emit("transaction:new", {
      version: 1,
      txHash: tx.txHash,
      chain: tx.chain,
      asset: tx.asset,
      amount: params.amount,
      toAddress: params.toAddress,
      walletId: params.walletId,
      status: tx.status,
    });
    return tx;
  }

  async rankYield(input: { chain: AgentChainId; asset: string; balanceUsd?: number }) {
    const sym = normalizeAssetSymbol(input.asset) ?? "USDT";
    const asset = sym === "XAUT" ? "XAUT" : "USDT";
    return rankYieldOpportunities({
      chain: input.chain,
      asset,
      balanceUsd: input.balanceUsd ?? 100,
    });
  }

  /**
   * Multi-step yield / bridge / deposit — simulated until bridge + Aave modules are wired to WDK in this service.
   * Emits WebSocket breadcrumbs for audit.
   */
  async executeYieldStrategy(userId: string, params: Record<string, unknown>) {
    const steps = Array.isArray(params.steps) ? params.steps : [];
    const detail: unknown[] = [];
    for (const raw of steps) {
      const s = raw as { kind?: string };
      detail.push({
        kind: s.kind ?? "unknown",
        note: "Simulated — record for audit; wire WDK + protocol SDK for production.",
      });
      this.deps.io?.to(`user:${userId}`).emit("agent:action_result", {
        version: 1,
        phase: "yield_step",
        step: s,
      });
    }
    await this.deps.db.agentActionLog.create({
      data: {
        userId,
        type: "yield_strategy",
        status: "simulated",
        payload: { steps } as object,
      },
    });
    return { ok: true as const, simulated: true, detail };
  }

  /** Target allocation preview — does not move funds. */
  async rebalancePreview(userId: string, params: Record<string, unknown>) {
    const w = await this.deps.db.wallet.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!w) throw new AppError("No wallet", "NO_WALLET", 400);
    const walletId = String(params.walletId ?? w.id);
    const balances = await this.deps.walletService.getBalances(userId, walletId);
    const chains = Object.keys(balances) as AgentChainId[];
    const target = chains.length ? 100 / chains.length : 0;
    return {
      balances,
      suggestion: chains.map((c) => ({
        chain: c,
        targetPct: target,
        note: "Rebalance execution requires per-step confirmations and bridge wiring.",
      })),
    };
  }
}
