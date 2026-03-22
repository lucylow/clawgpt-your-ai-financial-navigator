import type { Server as IoServer } from "socket.io";
import type { PrismaClient } from "@prisma/client";
import cron from "node-cron";
import type { AgentOrchestrator } from "../services/agent-orchestrator.service.js";
import { logger } from "../lib/logger.js";

const IDLE_USDT_THRESHOLD = 10;
const THROTTLE_MS = 60 * 60 * 1000;
const lastProactiveAt = new Map<string, number>();

export function startAutonomyScheduler(input: {
  orchestrator: AgentOrchestrator;
  prisma: PrismaClient;
  io: IoServer;
}): () => void {
  const enabled = process.env.AUTONOMY_CRON_ENABLED === "1";
  if (!enabled) {
    logger.info("Autonomy cron disabled (set AUTONOMY_CRON_ENABLED=1 to enable)");
    return () => {};
  }

  const task = cron.schedule("*/5 * * * *", async () => {
    const users = await input.prisma.user.findMany({
      where: { autonomyOptIn: true },
      select: { id: true },
    });
    const now = Date.now();
    for (const u of users) {
      try {
        if (now - (lastProactiveAt.get(u.id) ?? 0) < THROTTLE_MS) continue;
        const ctx = await input.orchestrator.getUserContext(u.id);
        if (ctx.idleUsdtHint < IDLE_USDT_THRESHOLD) continue;
        const res = await input.orchestrator.handleMessage(u.id, "optimize idle funds");
        if (res.pendingConfirmation) {
          lastProactiveAt.set(u.id, now);
        }
        input.io.to(`user:${u.id}`).emit("system:autonomy_tick", {
          version: 1,
          correlationId: res.correlationId,
          message: res.message,
          planId: "planId" in res ? res.planId : undefined,
        });
      } catch (e) {
        logger.warn("autonomy tick failed", { userId: u.id, err: String(e) });
      }
    }
  });

  return () => task.stop();
}
