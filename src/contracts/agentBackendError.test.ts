import { describe, expect, it } from "vitest";
import {
  formatAgentErrorMessage,
  parseAgentBackendError,
  agentErrorToObservabilityContext,
} from "./agentBackendError";

describe("parseAgentBackendError", () => {
  it("parses a valid backend error body", () => {
    const raw = {
      error: true,
      code: "RATE_LIMIT",
      message: "Slow down.",
      category: "RATE_LIMIT",
      recoverable: true,
      correlationId: "abc12345-6789-0000-0000-000000000000",
    };
    const parsed = parseAgentBackendError(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.code).toBe("RATE_LIMIT");
    expect(parsed?.category).toBe("RATE_LIMIT");
  });

  it("returns null for non-error payloads", () => {
    expect(parseAgentBackendError({ text: "ok" })).toBeNull();
    expect(parseAgentBackendError(null)).toBeNull();
  });
});

describe("formatAgentErrorMessage", () => {
  it("returns the server message", () => {
    const err = parseAgentBackendError({
      error: true,
      code: "X",
      message: "  Hello  ",
      category: "INTERNAL_ERROR",
      recoverable: false,
      correlationId: "c1",
    });
    expect(err).not.toBeNull();
    expect(formatAgentErrorMessage(err!)).toBe("Hello");
  });
});

describe("agentErrorToObservabilityContext", () => {
  it("includes stable fields only", () => {
    const err = parseAgentBackendError({
      error: true,
      code: "VALIDATION_ERROR",
      message: "Bad",
      category: "VALIDATION_ERROR",
      recoverable: true,
      correlationId: "corr",
      debug: "should not leak in obs context",
    });
    expect(err).not.toBeNull();
    const ctx = agentErrorToObservabilityContext(err!);
    expect(ctx).not.toHaveProperty("debug");
    expect(ctx.correlationId).toBe("corr");
  });
});
