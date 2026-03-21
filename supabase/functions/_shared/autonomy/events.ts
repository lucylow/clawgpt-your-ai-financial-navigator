import { structuredLog } from "../logging.ts";

/**
 * Optional hooks for async confirmations (e.g. indexer TX_CONFIRMED) to resume or audit plans.
 */

export type AutonomyRuntimeEvent =
  | { type: "TX_CONFIRMED"; payload: Record<string, unknown> }
  | { type: "BALANCE_UPDATED"; payload: Record<string, unknown> };

export function handleAutonomyEvent(event: AutonomyRuntimeEvent): void {
  switch (event.type) {
    case "TX_CONFIRMED":
      structuredLog("info", "autonomy.tx_confirmed", event.payload);
      break;
    case "BALANCE_UPDATED":
      structuredLog("info", "autonomy.balance_updated", event.payload);
      break;
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
    }
  }
}
