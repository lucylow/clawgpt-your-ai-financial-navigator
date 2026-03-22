import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../lib/appError.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthService {
  constructor(private readonly db: PrismaClient) {}

  async register(raw: unknown): Promise<{ token: string; userId: string; email: string }> {
    const { email, password } = registerSchema.parse(raw);
    const existing = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new AppError("Email already registered", "EMAIL_TAKEN", 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.db.user.create({
      data: { email: email.toLowerCase(), passwordHash },
    });
    const token = this.signToken(user.id, user.email);
    return { token, userId: user.id, email: user.email };
  }

  async login(raw: unknown): Promise<{ token: string; userId: string; email: string }> {
    const { email, password } = loginSchema.parse(raw);
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError("Invalid email or password", "INVALID_CREDENTIALS", 401);
    }
    const token = this.signToken(user.id, user.email);
    return { token, userId: user.id, email: user.email };
  }

  private signToken(userId: string, email: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
      throw new AppError("JWT_SECRET must be set (16+ chars)", "SERVER_MISCONFIG", 500, false);
    }
    return jwt.sign({ sub: userId, email }, secret, { expiresIn: "7d" });
  }
}
