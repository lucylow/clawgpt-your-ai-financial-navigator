import { useCallback, useMemo } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabaseEnv";
import { markAllNotificationsReadInDb, markNotificationReadInDb } from "@/lib/backendNotifications";
import { useBackendStreamStore } from "@/store/useBackendStreamStore";

export default function BackendNotificationsBell() {
  const streamConnected = useBackendStreamStore((s) => s.streamConnected);
  const notifications = useBackendStreamStore((s) => s.notifications);
  const activity = useBackendStreamStore((s) => s.activity);
  const patchNotificationRead = useBackendStreamStore((s) => s.patchNotificationRead);
  const patchAllNotificationsRead = useBackendStreamStore((s) => s.patchAllNotificationsRead);

  const unreadSafe = useMemo(() => {
    let n = 0;
    for (const x of notifications) {
      if (x.read_at == null) n += 1;
    }
    return n;
  }, [notifications]);

  const handleMarkOne = useCallback(
    async (id: string) => {
      const readAt = new Date().toISOString();
      patchNotificationRead(id, readAt);
      if (!isSupabaseConfigured) return;
      const { error } = await markNotificationReadInDb(id);
      if (error) console.warn("[BackendNotificationsBell] mark read failed:", error.message);
    },
    [patchNotificationRead],
  );

  const handleMarkAll = useCallback(async () => {
    const unreadIds = notifications.filter((n) => n.read_at == null).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const readAt = new Date().toISOString();
    patchAllNotificationsRead(unreadIds, readAt);
    if (!isSupabaseConfigured) return;
    const { error } = await markAllNotificationsReadInDb(unreadIds);
    if (error) console.warn("[BackendNotificationsBell] mark all failed:", error.message);
  }, [notifications, patchAllNotificationsRead]);

  if (!isSupabaseConfigured) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 text-muted-foreground hover:text-foreground",
            streamConnected && "text-emerald-400/90",
          )}
          title={streamConnected ? "Live backend stream connected" : "Connecting to live stream…"}
          aria-label="Notifications and activity"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {unreadSafe > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadSafe > 9 ? "9+" : unreadSafe}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Live stream</span>
          {unreadSafe > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              className="text-[11px] text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          <div className="px-3 py-2 space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Notifications</p>
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground">No notifications yet.</p>
              ) : (
                <ul className="space-y-2">
                  {notifications.slice(0, 12).map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => void handleMarkOne(n.id)}
                        className={cn(
                          "w-full text-left rounded-md px-2 py-1.5 transition-colors",
                          n.read_at == null ? "bg-muted/50" : "opacity-70",
                        )}
                      >
                        <p className="text-xs font-medium leading-snug">{n.title}</p>
                        {n.body && <p className="text-[11px] text-muted-foreground line-clamp-2">{n.body}</p>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Activity</p>
              {activity.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity events yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {activity.slice(0, 10).map((a) => (
                    <li key={a.id} className="text-xs">
                      <span className="text-muted-foreground">[{a.category}]</span> {a.summary}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
