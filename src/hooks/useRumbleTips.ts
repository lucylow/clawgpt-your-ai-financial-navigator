import { useMemo } from "react";

export interface RumbleTipEvent {
  id: string;
  amount: number;
  currency: string;
  receivedAt: number;
}

/**
 * Placeholder for Rumble creator tipping (WDK webhook). Wire `VITE_RUMBLE_WEBHOOK_URL` + edge function later.
 */
export function useRumbleTips(): RumbleTipEvent[] {
  return useMemo(() => [], []);
}
