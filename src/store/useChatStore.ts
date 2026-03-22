import { create } from "zustand";
import type { ClawUserIntent } from "@/ai/chat-schema";
import type { ParsedClawEntities } from "@/ai/intent-detector";

const MAX_SUMMARY_CHARS = 3500;

type ChatTurn = {
  user: string;
  assistant: string;
};

function rollSummary(previous: string, turn: ChatTurn): string {
  const line = `User: ${turn.user.slice(0, 200)} | Assistant: ${turn.assistant.slice(0, 240)}`;
  const parts = previous ? previous.split("\n---\n") : [];
  parts.push(line);
  const joined = parts.slice(-5).join("\n---\n");
  return joined.length > MAX_SUMMARY_CHARS ? joined.slice(joined.length - MAX_SUMMARY_CHARS) : joined;
}

interface ChatNavigatorState {
  conversationSummary: string;
  lastPrimaryIntent: ClawUserIntent | null;
  lastEntities: ParsedClawEntities | null;
  /** Last few turns for follow-up resolution */
  recentTurns: ChatTurn[];
  appendAssistantTurn: (userMessage: string, assistantMarkdown: string) => void;
  setLastDetection: (intent: ClawUserIntent, entities: ParsedClawEntities) => void;
  reset: () => void;
}

export const useChatStore = create<ChatNavigatorState>((set, get) => ({
  conversationSummary: "",
  lastPrimaryIntent: null,
  lastEntities: null,
  recentTurns: [],
  appendAssistantTurn: (userMessage, assistantMarkdown) => {
    const turn: ChatTurn = { user: userMessage, assistant: assistantMarkdown };
    const next = rollSummary(get().conversationSummary, turn);
    const rt = [...get().recentTurns, turn].slice(-6);
    set({ conversationSummary: next, recentTurns: rt });
  },
  setLastDetection: (intent, entities) => set({ lastPrimaryIntent: intent, lastEntities: entities }),
  reset: () =>
    set({
      conversationSummary: "",
      lastPrimaryIntent: null,
      lastEntities: null,
      recentTurns: [],
    }),
}));
