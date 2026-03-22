import { beforeAll } from "vitest";

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-123456789012";
  process.env.BACKEND_ENCRYPTION_KEY_HEX =
    process.env.BACKEND_ENCRYPTION_KEY_HEX ??
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});
