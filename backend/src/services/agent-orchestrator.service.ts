import type { Server as IoServer } from "socket.io";
import type { PrismaClient } from "@prisma/client";
import { PlanStatus } from "@prisma/client";
import { z } from "zod";
import type { AgentChainId } from "../lib/constants.js";
import { SUPPORTED_CHAINS } from "../lib/constants.js";
import { AppError } from "../lib/appError.js";
import { logger } from "../lib/logger.js";
import { computeIdleUsdt, OpenClawAgent, type PlanStep } from "./openclaw-agent.js";
import { AgentToolsService } from "./agent-tools.service.js";
import type { WalletService } from "./wallet.service.js";
import type { SendTokenParams } from "./wallet.service.js";

const chainEnum = z.enum(SUPPORTED_CHAINS as unknown as [AgentChainId, ...AgentChainId[]]);

export class AgentOrchestrator {
  private readonly openClaw = new OpenClawAgent();

  constructor(
    private readonly db: PrismaClient,
    private readonly walletService: WalletService,
    private readonly tools: AgentToolsService,
    private readonly io?: IoServer,
  ) {}

  async getUserContext(userId: string) {
    const wallets = await this.db.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const defaultWalletId = wallets[0]?.id ?? null;
    let balances = null;
    if (defaultWalletId) {
      try {
        balances = await this.walletService.getBalances(userId, defaultWalletId);
      } catch (e) {
        logger.warn("getBalances failed in context", { userId, err: String(e) });
      }
    }
    const idleUsdtHint = computeIdleUsdt(balances);
    return { defaultWalletId, balances, idleUsdtHint };
  }

  async handleMessage(userId: string, message: string) {
    const context = await this.getUserContext(userId);
    const agentResponse = await this.openClaw.process(userId, message, context);

    if (agentResponse.plan.length === 0) {
      return {
        message: agentResponse.message,
        correlationId: agentResponse.correlationId,
        pendingConfirmation: false,
      };
    }

    const needsUserConfirm =
      agentResponse.requiresConfirm ||
      agentResponse.plan.some((s) => s.tool === "sendToken" || s.tool === "rankYield");

    if (needsUserConfirm) {
      const plan = await this.db.agentPlan.create({
        data: {
          userId,
          status: PlanStatus.PENDING,
          intent: agentResponse.intent,
          steps: agentResponse.plan as object,
          rationale: agentResponse.message,
          requiresReview: true,
        },
      });
      const payload = {
        version: 1 as const,
        planId: plan.id,
        summary: agentResponse.message,
        plan: agentResponse.plan,
        intent: agentResponse.intent,
        correlationId: agentResponse.correlationId,
        requiresConfirm: true,
      };
      this.io?.to(`user:${userId}`).emit("agent:proposal", payload);
      return {
        message: agentResponse.message,
        planId: plan.id,
        correlationId: agentResponse.correlationId,
        pendingConfirmation: true,
      };
    }

    const result = await this.executePlan(userId, agentResponse.plan, { userConfirmedPlan: false });
    await this.emitPortfolioRefresh(userId);
    return {
      message: agentResponse.message,
      correlationId: agentResponse.correlationId,
      result,
      pendingConfirmation: false,
    };
  }

  async confirmPlan(userId: string, planId: string) {
    const plan = await this.db.agentPlan.findFirst({
      where: { id: planId, userId, status: PlanStatus.PENDING },
    });
    if (!plan) throw new AppError("Plan not found or not pending", "PLAN_NOT_FOUND", 404);

    await this.db.agentPlan.update({
      where: { id: planId },
      data: { status: PlanStatus.EXECUTING },
    });

    const steps = plan.steps as PlanStep[];
    let result: unknown;
    try {
      result = await this.executePlan(userId, steps, { userConfirmedPlan: true });
    } catch (e) {
      await this.db.agentPlan.update({
        where: { id: planId },
        data: { status: PlanStatus.FAILED, result: { error: String(e) } as object },
      });
      throw e;
    }

    await this.db.agentPlan.update({
      where: { id: planId },
      data: { status: PlanStatus.COMPLETED, result: result as object },
    });

    await this.emitPortfolioRefresh(userId);

    this.io?.to(`user:${userId}`).emit("agent:plan_completed", {
      version: 1,
      planId,
      status: "COMPLETED",
      result,
    });

    return result;
  }

  async rejectPlan(userId: string, planId: string) {
    const n = await this.db.agentPlan.updateMany({
      where: { id: planId, userId, status: PlanStatus.PENDING },
      data: { status: PlanStatus.REJECTED },
    });
    if (n.count === 0) throw new AppError("Plan not found", "PLAN_NOT_FOUND", 404);
  }

  private async emitPortfolioRefresh(userId: string) {
    const w = await this.db.wallet.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!w) return;
    try {
      const balances = await this.walletService.getBalances(userId, w.id);
      const payload = { version: 1 as const, walletId: w.id, balances };
      this.io?.to(`user:${userId}`).emit("portfolio:update", payload);
      this.io?.to(`user:${userId}`).emit("balance:updated", payload);
    } catch (e) {
      logger.warn("emitPortfolioRefresh failed", { userId, err: String(e) });
    }
  }

  private async executePlan(
    userId: string,
    steps: PlanStep[],
    opts: { userConfirmedPlan: boolean },
  ) {
    const out: unknown[] = [];
    for (const step of steps) {
      if (step.tool === "getPortfolio") {
        const w = z.string().parse(step.params.walletId);
        out.push(await this.tools.getPortfolio(userId, w));
        continue;
      }
      if (step.tool === "sendToken") {
        const p = step.params as Record<string, unknown>;
        const parsed: SendTokenParams = {
          userId,
          walletId: String(p.walletId),
          chain: chainEnum.parse(p.chain),
          asset: z.enum(["USDT", "USAT", "XAUT"]).parse(p.asset),
          amount: String(p.amount),
          toAddress: String(p.toAddress),
        };
        const amountUsdHint =
          typeof p.amountUsdHint === "number" ? p.amountUsdHint : Number.parseFloat(parsed.amount);
        out.push(
          await this.tools.sendToken({ ...parsed, amountUsdHint }, { userConfirmedPlan: opts.userConfirmedPlan }),
        );
        continue;
      }
      if (step.tool === "rankYield") {
        const p = step.params as Record<string, unknown>;
        out.push(
          await this.tools.rankYield({
            chain: chainEnum.parse(p.chain),
            asset: String(p.asset ?? "USDT"),
            balanceUsd: typeof p.balanceUsd === "number" ? p.balanceUsd : undefined,
          }),
        );
        continue;
      }
      if (step.tool === "executeYieldStrategy") {
        out.push(await this.tools.executeYieldStrategy(userId, step.params));
        continue;
      }
      if (step.tool === "rebalancePreview") {
        out.push(await this.tools.rebalancePreview(userId, step.params));
        continue;
      }
      logger.warn("Unknown tool step", { tool: step.tool });
    }
    return out;
  }
}
