export type LogLevel = "debug" | "info" | "warn" | "error";

export function structuredLog(
  level: LogLevel,
  msg: string,
  fields: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
