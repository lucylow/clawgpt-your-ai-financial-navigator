import { describe, expect, it } from "vitest";
import {
  clawResponseToAssistantMarkdown,
  extractJsonPayload,
  parseClawChatResponse,
} from "@/ai/chat-schema";

describe("parseClawChatResponse", () => {
  it("parses fenced JSON", () => {
    const raw = "```json\n" + sampleJson() + "\n```";
    const r = parseClawChatResponse(raw);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.mode).toBe("analysis");
  });

  it("rejects invalid JSON", () => {
    const r = parseClawChatResponse("not json");
    expect(r.ok).toBe(false);
  });
});

describe("extractJsonPayload", () => {
  it("strips fences", () => {
    expect(extractJsonPayload("```json\n{}\n```").trim()).toBe("{}");
  });
});

function sampleJson(): string {
  return JSON.stringify({
    v: 1,
    mode: "analysis",
    primary_intent: "SHOW_PORTFOLIO",
    blocks: [{ type: "text", body: "Hello" }],
    footer_disclaimer:
      "Reminder: I am an AI assistant, not a financial advisor. Double-check critical transactions and consider consulting a professional.",
  });
}

describe("clawResponseToAssistantMarkdown", () => {
  it("includes footer", () => {
    const r = parseClawChatResponse(sampleJson());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const md = clawResponseToAssistantMarkdown(r.data);
    expect(md).toContain("Reminder: I am an AI assistant");
  });
});
