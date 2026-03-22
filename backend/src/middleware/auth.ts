import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../lib/appError.js";

export type AuthedRequest = Request & { userId?: string; userEmail?: string };

export function authMiddleware(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    next(new AppError("Missing bearer token", "UNAUTHORIZED", 401, true));
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    next(new AppError("Server JWT misconfiguration", "SERVER_MISCONFIG", 500, false));
    return;
  }
  try {
    const payload = jwt.verify(token, secret) as { sub: string; email?: string };
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    next(new AppError("Invalid or expired token", "UNAUTHORIZED", 401, true));
  }
}
