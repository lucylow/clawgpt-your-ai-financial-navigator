import { describe, expect, it } from "vitest";
import { resolveMockAgentPreference } from "./agentClient";

describe("resolveMockAgentPreference", () => {
  it("forces mock when flag is true", () => {
    expect(resolveMockAgentPreference("true", true)).toBe(true);
    expect(resolveMockAgentPreference("true", false)).toBe(true);
  });

  it("forces live when flag is false", () => {
    expect(resolveMockAgentPreference("false", false)).toBe(false);
  });

  it("defaults to mock without Supabase", () => {
    expect(resolveMockAgentPreference(undefined, false)).toBe(true);
  });

  it("defaults to live when Supabase env is configured and flag unset", () => {
    expect(resolveMockAgentPreference(undefined, true)).toBe(false);
  });
});
