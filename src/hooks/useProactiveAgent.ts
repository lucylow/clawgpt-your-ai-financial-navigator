import { useCallback, useEffect, useRef } from "react";
import { scanProactiveInsights } from "@/lib/agent-engine";
import type { Message } from "@/types";

const DEDUPE_MS = 5 * 60_000;

/**
 * OpenClaw-style proactive loop: scans portfolio periodically and emits at most one insight
 * per dedupe window (demo + live store).
 */
export function useProactiveAgent(opts: {
  enabled: boolean;
  onInsight: (msg: Message) => void;
}) {
  const lastPushRef = useRef(0);
  const onInsight = opts.onInsight;

  const stableOnInsight = useCallback(
    (msg: Message) => {
      onInsight(msg);
    },
    [onInsight],
  );

  useEffect(() => {
    if (!opts.enabled) return;

    const maybePush = () => {
      const now = Date.now();
      if (now - lastPushRef.current < DEDUPE_MS) return;
      const insight = scanProactiveInsights();
      if (!insight) return;
      lastPushRef.current = now;
      stableOnInsight({
        id: insight.id,
        role: "assistant",
        content: insight.content,
        card: insight.card,
      });
    };

    const t0 = window.setTimeout(maybePush, 8000);
    const id = window.setInterval(maybePush, 60_000);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, [opts.enabled, stableOnInsight]);
}
