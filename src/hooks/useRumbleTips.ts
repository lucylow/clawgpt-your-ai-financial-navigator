import { useMemo } from "react";

const MOCK_KEY = "clawgpt_rumble_tips_mock";

export interface RumbleTipEvent {
  id: string;
  amount: number;
  currency: string;
  receivedAt: number;
}

/**
 * Rumble creator tips — production: WDK / webhook. Dev: set sessionStorage `clawgpt_rumble_tips_mock` to a JSON array
 * of `{ id, amount, currency, receivedAt }` and refresh.
 */
export function useRumbleTips(): RumbleTipEvent[] {
  return useMemo(() => {
    try {
      const raw = sessionStorage.getItem(MOCK_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (x): x is RumbleTipEvent =>
          x != null &&
          typeof x === "object" &&
          typeof (x as RumbleTipEvent).id === "string" &&
          typeof (x as RumbleTipEvent).amount === "number",
      );
    } catch {
      return [];
    }
  }, []);
}
