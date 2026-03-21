import type { AssetRole } from "./types";

export function assetRoleForSymbol(asset: string): AssetRole {
  const a = asset.trim();
  if (a === "USDt" || a === "USDT") return "reserve";
  if (a === "XAUt" || a === "XAUT") return "hedge";
  return "growth";
}

export function assetRoleLabel(role: AssetRole): string {
  switch (role) {
    case "reserve":
    case "settlement":
      return "Reserve / liquidity";
    case "hedge":
      return "Hedge sleeve";
    case "growth":
      return "Growth / volatile";
    case "liability":
      return "Liability / borrowed";
    case "locked":
      return "Locked / illiquid";
    case "speculative":
      return "Speculative";
    default:
      return role;
  }
}
