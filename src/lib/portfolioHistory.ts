/** Deterministic synthetic NAV series for demo / when no time-series API exists. */

export type HistoryRange = "24h" | "7d" | "30d" | "90d";

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RANGE_META: Record<
  HistoryRange,
  { points: number; label: (i: number, n: number) => string }
> = {
  "24h": {
    points: 9,
    label: (i, n) => {
      if (i === n - 1) return "Now";
      const h = Math.round((i / (n - 1)) * 24);
      return `${String(h).padStart(2, "0")}:00`;
    },
  },
  "7d": {
    points: 8,
    label: (i, n) => {
      if (i === n - 1) return "Today";
      return `D-${n - 1 - i}`;
    },
  },
  "30d": {
    points: 12,
    label: (i, n) => {
      if (i === n - 1) return "Now";
      const daysAgo = Math.round((1 - i / (n - 1)) * 30);
      return `${daysAgo}d`;
    },
  },
  "90d": {
    points: 13,
    label: (i, n) => {
      if (i === n - 1) return "Now";
      const daysAgo = Math.round((1 - i / (n - 1)) * 90);
      return `${daysAgo}d`;
    },
  },
};

export interface HistoryPoint {
  label: string;
  value: number;
}

/**
 * Builds a smooth-ish path ending at `endValue` (current NAV). Same inputs always yield the same curve.
 */
export function buildSyntheticHistory(endValue: number, range: HistoryRange): HistoryPoint[] {
  const safeEnd = Number.isFinite(endValue) && endValue >= 0 ? endValue : 0;
  const { points: n, label } = RANGE_META[range];
  const seed = Math.floor(safeEnd * 1000) % 2147483647 || 1;
  const rand = mulberry32(seed);

  const startFactor =
    range === "24h" ? 0.985 + rand() * 0.02 : range === "7d" ? 0.94 + rand() * 0.04 : range === "30d" ? 0.88 + rand() * 0.06 : 0.82 + rand() * 0.08;

  const out: HistoryPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = n <= 1 ? 1 : i / (n - 1);
    const wave =
      Math.sin(seed * 0.0001 + i * 1.1) * 0.008 +
      Math.cos(seed * 0.00007 + i * 0.7) * 0.005 +
      (rand() - 0.5) * 0.004;
    const interp = startFactor + (1 - startFactor) * t + wave;
    const value = i === n - 1 ? Math.round(safeEnd) : Math.max(0, Math.round(safeEnd * interp));
    out.push({ label: label(i, n), value });
  }
  out[n - 1] = { label: out[n - 1].label, value: Math.round(safeEnd) };
  return out;
}

export function historyRangeLabel(range: HistoryRange): string {
  switch (range) {
    case "24h":
      return "24 hours";
    case "7d":
      return "7 days";
    case "30d":
      return "30 days";
    case "90d":
      return "90 days";
    default:
      return range;
  }
}
