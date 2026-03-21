/**
 * Maps raw RPC / wallet SDK strings into stable codes and short user-facing copy.
 */

export type ClassifiedWalletErrorCode =
  | "USER_REJECTED"
  | "NETWORK"
  | "INSUFFICIENT_FUNDS"
  | "NONCE"
  | "EXECUTION";

export interface ClassifiedWalletError {
  code: ClassifiedWalletErrorCode;
  /** Short message for toasts and banners */
  message: string;
  /** Actionable hint for recovery */
  hint: string;
}

export function classifyWalletError(raw: string): ClassifiedWalletError {
  const s = raw.trim();
  const lower = s.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request") ||
    lower.includes("cancelled") ||
    lower.includes("canceled") ||
    (lower.includes("reject") && lower.includes("transaction"))
  ) {
    return {
      code: "USER_REJECTED",
      message: "Transaction was cancelled.",
      hint: "Submit again when ready; no funds were moved.",
    };
  }

  if (
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance") ||
    lower.includes("exceeds balance") ||
    lower.includes("gas required exceeds allowance")
  ) {
    return {
      code: "INSUFFICIENT_FUNDS",
      message: "Insufficient balance for this transfer (including gas).",
      hint: "Top up native gas on the chain or reduce the amount.",
    };
  }

  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("econnreset") ||
    lower.includes("socket hang up") ||
    lower.includes("rpc error") ||
    lower.includes("could not coalesce error")
  ) {
    return {
      code: "NETWORK",
      message: "Network or RPC error.",
      hint: "Check your connection and retry; RPC may be rate-limited.",
    };
  }

  if (lower.includes("nonce") || lower.includes("replacement transaction")) {
    return {
      code: "NONCE",
      message: "Nonce conflict or pending transaction.",
      hint: "Wait for the previous transaction to confirm or reset the wallet nonce in settings.",
    };
  }

  return {
    code: "EXECUTION",
    message: s.length > 160 ? `${s.slice(0, 157)}…` : s,
    hint: "If this persists, reconnect the wallet or switch to demo mode from the header.",
  };
}
