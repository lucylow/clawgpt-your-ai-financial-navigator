/**
 * Client-side analytics & observability: errors, interactions, chain execution, Web Vitals.
 * Optional backend: set VITE_OBSERVABILITY_INGEST_URL to POST JSON batches.
 */

const SESSION_KEY = "claw_obs_session_id";
const QUEUE_KEY = "claw_obs_queue";
const MAX_QUEUE = 80;
const FLUSH_INTERVAL_MS = 8_000;

type BaseEvent = {
  ts: number;
  sessionId: string;
  path: string;
};

export type ErrorEvent = BaseEvent & {
  kind: "error";
  message: string;
  name?: string;
  stack?: string;
  source?: "boundary" | "window" | "unhandledrejection" | "manual";
  context?: Record<string, unknown>;
};

export type InteractionEvent = BaseEvent & {
  kind: "interaction";
  name: string;
  props?: Record<string, unknown>;
};

export type ChainExecutionEvent = BaseEvent & {
  kind: "chain";
  operation: string;
  phase: "start" | "end" | "snapshot";
  chain?: string;
  durationMs?: number;
  ok?: boolean;
  error?: string;
  detail?: Record<string, unknown>;
};

export type PerformanceEvent = BaseEvent & {
  kind: "performance";
  metric: string;
  value: number;
  rating?: string;
  id?: string;
  navigationType?: string;
  delta?: number;
  detail?: Record<string, unknown>;
};

export type ObservabilityEvent =
  | ErrorEvent
  | InteractionEvent
  | ChainExecutionEvent
  | PerformanceEvent;

let queue: ObservabilityEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let globalInit = false;
let dataTrackInit = false;

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

function currentPath(): string {
  try {
    return window.location.pathname + window.location.search;
  } catch {
    return "";
  }
}

function persistQueue(): void {
  try {
    const trimmed = queue.slice(-MAX_QUEUE);
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota */
  }
}

function ingestUrl(): string | undefined {
  const u = import.meta.env.VITE_OBSERVABILITY_INGEST_URL?.trim();
  return u || undefined;
}

export function flushObservability(): void {
  const url = ingestUrl();
  if (!url || queue.length === 0) return;
  const batch = [...queue];
  queue = [];
  persistQueue();

  const body = JSON.stringify({
    events: batch,
    app: "clawgpt-web",
    env: import.meta.env.MODE,
    sentAt: Date.now(),
  });

  if (navigator.sendBeacon) {
    const ok = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    if (ok) return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    queue = batch.concat(queue).slice(-MAX_QUEUE);
    persistQueue();
  });
}

function enqueue(event: Omit<ObservabilityEvent, "ts" | "sessionId" | "path">): void {
  const full: ObservabilityEvent = {
    ...event,
    ts: Date.now(),
    sessionId: getSessionId(),
    path: currentPath(),
  } as ObservabilityEvent;
  queue.push(full);
  persistQueue();

  if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
    const label =
      full.kind === "error"
        ? `[obs:error] ${full.message}`
        : full.kind === "interaction"
          ? `[obs:ui] ${full.name}`
          : full.kind === "chain"
            ? `[obs:chain] ${full.operation} ${full.phase}`
            : `[obs:perf] ${full.metric}=${full.value}`;
    console.debug(label, full);
  }

  if (queue.length >= 25) flushObservability();
}

export function captureError(
  error: unknown,
  opts?: {
    source?: ErrorEvent["source"];
    context?: Record<string, unknown>;
  },
): void {
  const e = error instanceof Error ? error : new Error(String(error));
  enqueue({
    kind: "error",
    message: e.message.slice(0, 2_000),
    name: e.name,
    stack: import.meta.env.PROD ? undefined : e.stack?.slice(0, 8_000),
    source: opts?.source ?? "manual",
    context: opts?.context,
  });
  flushObservability();
}

export function trackInteraction(name: string, props?: Record<string, unknown>): void {
  if (!name?.trim()) return;
  enqueue({
    kind: "interaction",
    name: name.slice(0, 200),
    props: props && Object.keys(props).length ? sanitizeProps(props) : undefined,
  });
}

export function logChainExecution(
  payload: Omit<ChainExecutionEvent, "kind" | "ts" | "sessionId" | "path">,
): void {
  enqueue({
    kind: "chain",
    ...payload,
    error: payload.error?.slice(0, 500),
  });
}

function sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (k.toLowerCase().includes("password") || k.toLowerCase().includes("seed")) continue;
    if (typeof v === "string") out[k] = v.length > 200 ? `${v.slice(0, 200)}…` : v;
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else if (typeof v === "object" && v !== null)
      try {
        out[k] = JSON.parse(JSON.stringify(v));
      } catch {
        out[k] = "[object]";
      }
  }
  return out;
}

function reportWebVital(metric: { name: string; value: number; rating?: string; id?: string; delta?: number }): void {
  enqueue({
    kind: "performance",
    metric: metric.name,
    value: Math.round(metric.value * 1_000) / 1_000,
    rating: metric.rating,
    id: metric.id,
    delta: metric.delta,
    navigationType:
      typeof performance !== "undefined" && "getEntriesByType" in performance
        ? (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type
        : undefined,
  });
}

export function initWebVitals(): void {
  if (typeof window === "undefined") return;
  void import("web-vitals").then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
    onCLS(reportWebVital);
    onINP(reportWebVital);
    onLCP(reportWebVital);
    onFCP(reportWebVital);
    onTTFB(reportWebVital);
  });

  if ("PerformanceObserver" in window) {
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const le = e as PerformanceEntry & { duration?: number };
          if (le.duration != null && le.duration >= 50) {
            enqueue({
              kind: "performance",
              metric: "longtask",
              value: Math.round(le.duration),
              rating: le.duration >= 200 ? "poor" : "needs-improvement",
              detail: { name: le.name },
            });
          }
        }
      });
      po.observe({ type: "longtask", buffered: true });
    } catch {
      /* longtask not supported */
    }
  }
}

/** Delegated click tracking: elements with data-track="event_name" and optional data-track-props JSON */
export function initInteractionDataAttributes(): void {
  if (dataTrackInit || typeof document === "undefined") return;
  dataTrackInit = true;
  document.addEventListener(
    "click",
    (ev) => {
      const el = (ev.target as HTMLElement | null)?.closest?.("[data-track]");
      if (!el) return;
      const name = el.getAttribute("data-track")?.trim();
      if (!name) return;
      let props: Record<string, unknown> | undefined;
      const raw = el.getAttribute("data-track-props");
      if (raw) {
        try {
          props = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          props = { parseError: true };
        }
      }
      trackInteraction(name, props);
    },
    true,
  );
}

export function initGlobalErrorHandlers(): void {
  if (globalInit || typeof window === "undefined") return;
  globalInit = true;

  window.addEventListener("error", (ev) => {
    const err = ev.error instanceof Error ? ev.error : new Error(ev.message || "window.error");
    captureError(err, {
      source: "window",
      context: { filename: ev.filename, lineno: ev.lineno, colno: ev.colno },
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason;
    captureError(reason instanceof Error ? reason : new Error(String(reason)), {
      source: "unhandledrejection",
    });
  });

  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => flushObservability(), FLUSH_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushObservability();
  });
  window.addEventListener("pagehide", () => flushObservability());
}

export function trackPageView(path: string): void {
  trackInteraction("page_view", { path });
}

/** Latency / outcome for agent-chat turns (mock agent does not call this). */
export function trackAgentChatTurn(metrics: {
  ok: boolean;
  latencyMs: number;
  correlationId?: string;
  errorCode?: string;
  errorCategory?: string;
}): void {
  trackInteraction("agent_chat_turn", {
    ok: metrics.ok,
    latencyMs: Math.round(metrics.latencyMs),
    correlationId: metrics.correlationId?.slice(0, 64),
    errorCode: metrics.errorCode,
    errorCategory: metrics.errorCategory,
  });
}
