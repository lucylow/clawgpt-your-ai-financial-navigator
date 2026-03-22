import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { SendTokenParams } from "./wallet.service.js";

const spendingLimitsSchema = z
  .object({
    dailyUsd: z.number().positive().optional(),
    perTxUsd: z.number().positive().optional(),
  })
  .partial();

export type TxSafetyInput = SendTokenParams & { amountUsdHint?: number };

export type TxSafetyResult = {
  safe: boolean;
  reason?: string;
  requiresConfirm: boolean;
  riskLevel: "low" | "medium" | "high";
};

/** Conservative defaults when user policy JSON is absent. */
const DEFAULT_PER_TX_USD = 500;
const DEFAULT_DAILY_USD = 2000;
const CONFIRM_ABOVE_USD = 100;

export class SafetyService {
  constructor(private readonly db: PrismaClient) {}

  async checkTx(
    userId: string,
    params: TxSafetyInput,
    options?: { skipConfirmGate?: boolean },
  ): Promise<TxSafetyResult> {
    const amount = Number.parseFloat(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { safe: false, reason: "Invalid amount", requiresConfirm: false, riskLevel: "high" };
    }

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { spendingLimits: true, recipientAllowlist: true, microPaymentAutoApprove: true },
    });
    if (!user) {
      return { safe: false, reason: "User not found", requiresConfirm: false, riskLevel: "high" };
    }

    const limits = spendingLimitsSchema.safeParse(user.spendingLimits ?? {}).data ?? {};
    const perTxCap = limits.perTxUsd ?? DEFAULT_PER_TX_USD;
    const dailyCap = limits.dailyUsd ?? DEFAULT_DAILY_USD;

    const usd = params.amountUsdHint ?? amount;
    if (usd > perTxCap) {
      return {
        safe: false,
        reason: `Amount exceeds per-transaction limit (${perTxCap} USD₮ equivalent).`,
        requiresConfirm: false,
        riskLevel: "high",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recent = await this.db.agentActionLog.findMany({
      where: { userId, createdAt: { gte: today }, type: { in: ["send_token", "agent_send"] } },
      select: { payload: true },
      take: 200,
    });
    let dayTotal = 0;
    for (const row of recent) {
      const p = row.payload as { amountUsdHint?: number };
      if (typeof p.amountUsdHint === "number") dayTotal += p.amountUsdHint;
    }
    if (dayTotal + usd > dailyCap) {
      return {
        safe: false,
        reason: `Would exceed daily spend limit (${dailyCap} USD₮ equivalent).`,
        requiresConfirm: false,
        riskLevel: "high",
      };
    }

    const allow = user.recipientAllowlist as string[] | null;
    if (Array.isArray(allow) && allow.length > 0) {
      const ok = allow.some((a) => a.toLowerCase() === params.toAddress.toLowerCase());
      if (!ok) {
        return {
          safe: false,
          reason: "Recipient not on allowlist",
          requiresConfirm: true,
          riskLevel: "medium",
        };
      }
    }

    const requiresConfirm =
      !options?.skipConfirmGate && usd >= CONFIRM_ABOVE_USD && !user.microPaymentAutoApprove;
    return { safe: true, requiresConfirm, riskLevel: requiresConfirm ? "medium" : "low" };
  }
}
