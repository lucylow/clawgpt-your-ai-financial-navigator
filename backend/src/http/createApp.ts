import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "node:http";
import { Server as IoServer } from "socket.io";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { isAppError } from "../lib/appError.js";
import { logger } from "../lib/logger.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";
import { AuthService } from "../services/auth.service.js";
import { AgentToolsService } from "../services/agent-tools.service.js";
import { AgentOrchestrator } from "../services/agent-orchestrator.service.js";
import { WalletService } from "../services/wallet.service.js";
import { SafetyService } from "../services/safety.service.js";
import { startAutonomyScheduler } from "../jobs/autonomyScheduler.js";

export type AppBundle = {
  app: express.Express;
  httpServer: ReturnType<typeof createServer>;
  io: IoServer;
  orchestrator: AgentOrchestrator;
};

function asyncHandler(
  fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthedRequest, res, next)).catch(next);
  };
}

export function createApp(): AppBundle {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "512kb" }));

  const httpServer = createServer(app);
  const io = new IoServer(httpServer, {
    cors: { origin: true, credentials: true },
  });

  const walletService = new WalletService(prisma);
  const safetyService = new SafetyService(prisma);
  const tools = new AgentToolsService({
    walletService,
    safetyService,
    db: prisma,
    io,
  });
  const orchestrator = new AgentOrchestrator(prisma, walletService, tools, io);
  const authService = new AuthService(prisma);

  io.use((socket, next) => {
    const raw =
      (socket.handshake.auth as { token?: string })?.token ??
      (typeof socket.handshake.query.token === "string" ? socket.handshake.query.token : undefined);
    const secret = process.env.JWT_SECRET;
    if (!raw || !secret || secret.length < 16) {
      next(new Error("Unauthorized"));
      return;
    }
    try {
      const payload = jwt.verify(raw, secret) as { sub: string };
      socket.data.userId = payload.sub;
      socket.join(`user:${payload.sub}`);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;

    socket.on("agent:message", async (payload: unknown, cb?: (r: unknown) => void) => {
      try {
        const body = z.object({ message: z.string().min(1).max(8000) }).parse(payload);
        const res = await orchestrator.handleMessage(userId, body.message);
        socket.emit("agent:response", { version: 1, ...res });
        cb?.({ ok: true });
      } catch (e) {
        const err = isAppError(e)
          ? { code: e.code, message: e.message, recoverable: e.recoverable }
          : { code: "INTERNAL", message: e instanceof Error ? e.message : String(e), recoverable: false };
        socket.emit("agent:error", { version: 1, error: err });
        cb?.({ ok: false, error: err });
      }
    });

    socket.on("agent:confirm", async (payload: unknown, cb?: (r: unknown) => void) => {
      try {
        const { planId } = z.object({ planId: z.string() }).parse(payload);
        const result = await orchestrator.confirmPlan(userId, planId);
        socket.emit("agent:action_result", { version: 1, planId, result });
        cb?.({ ok: true, result });
      } catch (e) {
        const err = isAppError(e)
          ? { code: e.code, message: e.message }
          : { code: "INTERNAL", message: e instanceof Error ? e.message : String(e) };
        socket.emit("agent:error", { version: 1, error: err });
        cb?.({ ok: false, error: err });
      }
    });

    socket.on("agent:reject", async (payload: unknown, cb?: (r: unknown) => void) => {
      try {
        const { planId } = z.object({ planId: z.string() }).parse(payload);
        await orchestrator.rejectPlan(userId, planId);
        socket.emit("agent:proposal_cancelled", { version: 1, planId });
        cb?.({ ok: true });
      } catch (e) {
        const err = isAppError(e)
          ? { code: e.code, message: e.message }
          : { code: "INTERNAL", message: e instanceof Error ? e.message : String(e) };
        socket.emit("agent:error", { version: 1, error: err });
        cb?.({ ok: false, error: err });
      }
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "clawgpt-agent-backend" });
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const out = await authService.register(req.body);
      res.status(201).json({ version: 1, ...out });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const out = await authService.login(req.body);
      res.json({ version: 1, ...out });
    } catch (e) {
      next(e);
    }
  });

  app.get(
    "/api/wallets",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const rows = await prisma.wallet.findMany({
        where: { userId: req.userId! },
        select: { id: true, label: true, addresses: true, createdAt: true },
      });
      res.json({ version: 1, wallets: rows });
    }),
  );

  app.post(
    "/api/wallets",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const created = await walletService.createWallet(req.userId!);
      res.status(201).json({ version: 1, ...created });
    }),
  );

  app.get(
    "/api/balances",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const q = z.object({ walletId: z.string().optional() }).parse(req.query);
      const w =
        q.walletId ??
        (await prisma.wallet.findFirst({ where: { userId: req.userId! }, orderBy: { createdAt: "asc" } }))?.id;
      if (!w) {
        res.status(400).json({ version: 1, error: { code: "NO_WALLET", message: "Create a wallet first" } });
        return;
      }
      const balances = await walletService.getBalances(req.userId!, w);
      res.json({ version: 1, walletId: w, balances });
    }),
  );

  const messageBody = z.object({
    message: z.string().min(1).max(8000),
    history: z
      .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() }))
      .max(50)
      .optional(),
  });

  app.post(
    "/api/agent/message",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const body = messageBody.parse(req.body);
      const result = await orchestrator.handleMessage(req.userId!, body.message);
      res.json({ version: 1, ...result });
    }),
  );

  app.post(
    "/api/agent/confirm",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const { planId } = z.object({ planId: z.string() }).parse(req.body);
      const result = await orchestrator.confirmPlan(req.userId!, planId);
      res.json({ version: 1, ok: true, result });
    }),
  );

  app.post(
    "/api/agent/reject",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const { planId } = z.object({ planId: z.string() }).parse(req.body);
      await orchestrator.rejectPlan(req.userId!, planId);
      res.json({ version: 1, ok: true });
    }),
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (isAppError(err)) {
      res.status(err.statusCode).json({
        version: 1,
        error: {
          message: err.message,
          code: err.code,
          recoverable: err.recoverable,
          suggested: err.suggested,
        },
      });
      return;
    }
    logger.error("Unhandled error", { err: String(err) });
    res.status(500).json({
      version: 1,
      error: { message: "Internal server error", code: "INTERNAL", recoverable: false },
    });
  });

  const stopCron = startAutonomyScheduler({ orchestrator, prisma, io });

  /** Attach for graceful shutdown */
  (httpServer as unknown as { _stopCron?: () => void })._stopCron = stopCron;

  return { app, httpServer, io, orchestrator };
}
