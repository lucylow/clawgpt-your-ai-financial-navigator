export function numArg(args: Record<string, unknown>, key: string, fallback = 0): number {
  const v = args[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function strArg(args: Record<string, unknown>, key: string, fallback = ""): string {
  const v = args[key];
  if (v == null) return fallback;
  return String(v);
}
