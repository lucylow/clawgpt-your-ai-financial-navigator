/** Geographic + brand colors for supported chains in the cockpit globe & heatmap. */
export const COCKPIT_CHAIN_NODES = [
  { id: "ethereum", label: "Ethereum", lat: 51.5, lon: -0.13, color: "#627EEA" },
  { id: "polygon", label: "Polygon", lat: 40.7, lon: -74.0, color: "#8247E5" },
  { id: "arbitrum", label: "Arbitrum", lat: 48.85, lon: 2.35, color: "#28A0F0" },
  { id: "solana", label: "Solana", lat: 37.77, lon: -122.4, color: "#14F195" },
  { id: "tron", label: "Tron", lat: 39.9, lon: 116.4, color: "#FF0013" },
  { id: "ton", label: "TON", lat: 55.75, lon: 37.6, color: "#0088CC" },
] as const;

export type CockpitChainId = (typeof COCKPIT_CHAIN_NODES)[number]["id"];

export const CHAIN_COLOR_BY_ID: Record<string, string> = Object.fromEntries(
  COCKPIT_CHAIN_NODES.map((n) => [n.id, n.color])
);
