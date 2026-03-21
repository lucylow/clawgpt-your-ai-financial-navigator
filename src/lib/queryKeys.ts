/**
 * Central query key factory — use for React Query invalidation after auth, portfolio sync, and chat.
 */
export const queryKeys = {
  auth: {
    session: ["auth", "session"] as const,
  },
  portfolio: {
    all: ["portfolio"] as const,
    snapshot: () => ["portfolio", "snapshot"] as const,
  },
  chat: {
    conversation: (userId: string, conversationId: string) =>
      ["chat", "messages", userId, conversationId] as const,
  },
} as const;
