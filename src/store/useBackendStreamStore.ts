import { create } from "zustand";

export interface StreamedNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface StreamedActivityItem {
  id: string;
  category: string;
  summary: string;
  detail: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface BackendStreamState {
  streamConnected: boolean;
  notifications: StreamedNotification[];
  activity: StreamedActivityItem[];
  setStreamConnected: (v: boolean) => void;
  pushNotification: (n: StreamedNotification) => void;
  pushActivity: (a: StreamedActivityItem) => void;
  patchNotificationRead: (id: string, readAt: string) => void;
  patchAllNotificationsRead: (ids: string[], readAt: string) => void;
  reset: () => void;
}

const MAX_NOTIFICATIONS = 40;
const MAX_ACTIVITY = 80;

export const useBackendStreamStore = create<BackendStreamState>((set) => ({
  streamConnected: false,
  notifications: [],
  activity: [],

  setStreamConnected: (v) => set({ streamConnected: v }),

  pushNotification: (n) =>
    set((s) => {
      if (s.notifications.some((x) => x.id === n.id)) return s;
      return { notifications: [n, ...s.notifications].slice(0, MAX_NOTIFICATIONS) };
    }),

  pushActivity: (a) =>
    set((s) => {
      if (s.activity.some((x) => x.id === a.id)) return s;
      return { activity: [a, ...s.activity].slice(0, MAX_ACTIVITY) };
    }),

  patchNotificationRead: (id, readAt) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read_at: readAt } : n)),
    })),

  patchAllNotificationsRead: (ids, readAt) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        ids.includes(n.id) ? { ...n, read_at: readAt } : n,
      ),
    })),

  reset: () => set({ streamConnected: false, notifications: [], activity: [] }),
}));
