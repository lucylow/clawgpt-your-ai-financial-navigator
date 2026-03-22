import { describe, expect, it } from "vitest";
import { ClawUserIntent } from "@/ai/chat-schema";
import { detectClawIntent } from "@/ai/intent-detector";

describe("detectClawIntent", () => {
  it("detects portfolio", () => {
    const d = detectClawIntent("How much USDT do I have on Polygon?");
    expect(d.intent).toBe(ClawUserIntent.SHOW_PORTFOLIO);
    expect(d.entities.chains).toContain("polygon");
  });

  it("detects send", () => {
    const d = detectClawIntent("Send 50 USDT to bob on arbitrum");
    expect(d.intent).toBe(ClawUserIntent.SEND_FUNDS);
    expect(d.entities.amounts.some((a) => a.value === 50)).toBe(true);
  });

  it("detects yield", () => {
    const d = detectClawIntent("Best yield for idle USDT?");
    expect(d.intent).toBe(ClawUserIntent.OPTIMIZE_YIELD);
  });
});
