import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseEnv";
import { mapTransactionRow } from "@/lib/mapSupabaseRealtime";
import { useAuth } from "@/hooks/useAuth";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import {
  useBackendStreamStore,
  type StreamedActivityItem,
  type StreamedNotification,
} from "@/store/useBackendStreamStore";
import type { Tables } from "@/integrations/supabase/types";

function isTxRow(row: unknown): row is Tables<"transactions"> {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.user_id === "string";
}

function isSnapshotRow(row: unknown): row is Tables<"portfolio_snapshots"> {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === "string" && r.payload != null;
}

function isNotificationRow(row: unknown): row is Tables<"notifications"> {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.title === "string";
}

function isActivityRow(row: unknown): row is Tables<"activity_feed"> {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.summary === "string";
}

function metadataAsRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

/**
 * Subscribes to Supabase Realtime `postgres_changes` for the signed-in user:
 * transactions, portfolio_snapshots, notifications, activity_feed.
 * Mutates portfolio store and backend stream store; shows toast on new notifications.
 */
export function useSupabaseEventStream() {
  const { user } = useAuth();
  const userId = user?.id;
  const subscribedOnce = useRef(false);

  useEffect(() => {
    if (!userId) {
      useBackendStreamStore.getState().reset();
      subscribedOnce.current = false;
      return;
    }

    if (!isSupabaseConfigured) {
      useBackendStreamStore.getState().setStreamConnected(false);
      return;
    }

    const uid = userId;
    const filter = `user_id=eq.${uid}`;
    const setStreamConnected = useBackendStreamStore.getState().setStreamConnected;

    const onTx = (payload: RealtimePostgresChangesPayload<Tables<"transactions">>) => {
      const row = payload.new ?? payload.old;
      if (!isTxRow(row)) return;
      const tx = mapTransactionRow(row);
      usePortfolioStore.getState().upsertTransactionFromBackend(tx);
      if (payload.eventType === "INSERT") {
        toast.info("Transaction synced", {
          description: `${tx.type} · ${tx.hash.length > 14 ? `${tx.hash.slice(0, 10)}…` : tx.hash}`,
          duration: 4200,
          id: `tx-${tx.hash}`,
        });
      }
    };

    const onSnapshot = (payload: RealtimePostgresChangesPayload<Tables<"portfolio_snapshots">>) => {
      const row = payload.new;
      if (!isSnapshotRow(row)) return;
      usePortfolioStore.getState().mergeBackendSnapshot(row.payload);
    };

    const onNotification = (payload: RealtimePostgresChangesPayload<Tables<"notifications">>) => {
      const row = payload.new;
      if (!isNotificationRow(row)) return;
      if (payload.eventType === "UPDATE") {
        if (row.read_at) {
          useBackendStreamStore.getState().patchNotificationRead(row.id, row.read_at);
        }
        return;
      }
      const n: StreamedNotification = {
        id: row.id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        metadata: metadataAsRecord(row.metadata),
        read_at: row.read_at,
        created_at: row.created_at,
      };
      useBackendStreamStore.getState().pushNotification(n);
      if (n.read_at == null) {
        toast(n.title, {
          description: n.body ?? undefined,
          duration: 6500,
          id: `notification-${n.id}`,
        });
      }
    };

    const onActivity = (payload: RealtimePostgresChangesPayload<Tables<"activity_feed">>) => {
      const row = payload.new;
      if (!isActivityRow(row)) return;
      const a: StreamedActivityItem = {
        id: row.id,
        category: row.category,
        summary: row.summary,
        detail: row.detail,
        metadata: metadataAsRecord(row.metadata),
        created_at: row.created_at,
      };
      useBackendStreamStore.getState().pushActivity(a);
      const desc = [a.category, a.detail].filter(Boolean).join(" · ") || undefined;
      toast.message(a.summary, {
        description: desc,
        duration: 5000,
        id: `activity-${a.id}`,
      });
    };

    let cancelled = false;
    const channel = supabase
      .channel(`cockpit-events:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter }, onTx)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "portfolio_snapshots", filter }, onSnapshot)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter }, onNotification)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed", filter }, onActivity)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setStreamConnected(true);
          if (!subscribedOnce.current) {
            subscribedOnce.current = true;
            toast.success("Live updates connected", {
              description: "Transactions, portfolio snapshots, and notifications stream in real time.",
              duration: 3200,
              id: "realtime-handshake",
            });
          }
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setStreamConnected(false);
          if (subscribedOnce.current && !cancelled) {
            toast.warning("Live stream interrupted", {
              description: "Reconnecting in the background…",
              duration: 4000,
              id: "realtime-reconnect",
            });
          }
        }
      });

    return () => {
      cancelled = true;
      setStreamConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
