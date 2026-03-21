const EVM_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const TRON_ADDR_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const SOL_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TON_ADDR_RE = /^(EQ|UQ)[a-zA-Z0-9_-]{40,}$/;

export type AddressValidationResult = {
  valid: boolean;
  chain: string;
  normalized?: string;
  errors: string[];
};

export function validateAddressForChain(chain: string, raw?: string | null): AddressValidationResult {
  const errors: string[] = [];
  const addr = typeof raw === "string" ? raw.trim() : "";
  if (!addr) {
    errors.push("Recipient address is required before execution.");
    return { valid: false, chain, errors };
  }
  if (chain === "ethereum" || chain === "polygon" || chain === "arbitrum") {
    if (!EVM_ADDR_RE.test(addr)) errors.push("Invalid EVM address (expect 0x + 40 hex chars).");
    return { valid: errors.length === 0, chain, normalized: addr, errors };
  }
  if (chain === "solana") {
    if (!SOL_ADDR_RE.test(addr)) errors.push("Invalid Solana address format.");
    return { valid: errors.length === 0, chain, errors };
  }
  if (chain === "tron") {
    if (!TRON_ADDR_RE.test(addr)) errors.push("Invalid Tron address (expect T + 33 base58 chars).");
    return { valid: errors.length === 0, chain, errors };
  }
  if (chain === "ton") {
    if (!TON_ADDR_RE.test(addr)) errors.push("Invalid TON address (user-friendly format).");
    return { valid: errors.length === 0, chain, errors };
  }
  errors.push(`Unknown chain for validation: ${chain}`);
  return { valid: false, chain, errors };
}
