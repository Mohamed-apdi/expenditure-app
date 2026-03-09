import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";
import { legendPersist } from "./legendPersist";
import {
  LocalMetadata,
  ensureId,
  markPending,
  nowIso,
  softDelete,
} from "./storeUtils";
import type {
  Notification,
  NotificationType,
  NotificationPriority,
} from "../services/notifications";

export type LocalNotification = Notification & LocalMetadata;

export interface NotificationsState {
  byId: Record<string, LocalNotification>;
  allIds: string[];
  unreadCount: number;
  lastFetched: string | null;
}

const initialState: NotificationsState = {
  byId: {},
  allIds: [],
  unreadCount: 0,
  lastFetched: null,
};

export const notifications$ = observable<NotificationsState>(initialState);

legendPersist(notifications$, "notifications");

export function selectNotifications(userId: string): LocalNotification[] {
  const state = notifications$.get();
  return state.allIds
    .map((id) => state.byId[id])
    .filter((n) => n && n.user_id === userId && n.deleted_at == null)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function selectUnreadCount(userId: string): number {
  const state = notifications$.get();
  return state.allIds
    .map((id) => state.byId[id])
    .filter(
      (n) => n && n.user_id === userId && !n.is_read && n.deleted_at == null
    ).length;
}

export function selectNotificationsByAccount(
  userId: string,
  accountId: string
): LocalNotification[] {
  const state = notifications$.get();
  return state.allIds
    .map((id) => state.byId[id])
    .filter((n) => {
      if (!n || n.user_id !== userId || n.deleted_at != null) return false;
      const metaAccountId = n.metadata?.account_id;
      return metaAccountId === accountId;
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function selectUnreadCountByAccount(
  userId: string,
  accountId: string
): number {
  const state = notifications$.get();
  return state.allIds
    .map((id) => state.byId[id])
    .filter((n) => {
      if (!n || n.user_id !== userId || n.is_read || n.deleted_at != null)
        return false;
      const metaAccountId = n.metadata?.account_id;
      return metaAccountId === accountId;
    }).length;
}

export function createNotificationLocal(
  data: Omit<Notification, "id" | "created_at"> & { id?: string }
): LocalNotification {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalNotification = {
    id,
    user_id: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type,
    priority: data.priority || "medium",
    is_read: data.is_read ?? false,
    metadata: data.metadata,
    action_url: data.action_url,
    created_at: now,
    read_at: data.read_at,
    expires_at: data.expires_at,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  notifications$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = ensureId(state.allIds, id);
    const unreadCount = !row.is_read ? state.unreadCount + 1 : state.unreadCount;
    return { ...state, byId: nextById, allIds: nextAllIds, unreadCount };
  });

  return row;
}

export function updateNotificationLocal(
  id: string,
  patch: Partial<Omit<Notification, "id" | "created_at">>
): LocalNotification | undefined {
  let updated: LocalNotification | undefined;

  notifications$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const wasUnread = !existing.is_read;
    const merged: LocalNotification = {
      ...existing,
      ...patch,
    };

    const row = markPending(merged);
    updated = row;

    let unreadCount = state.unreadCount;
    if (wasUnread && row.is_read) {
      unreadCount = Math.max(0, unreadCount - 1);
    }

    const nextById = { ...state.byId, [id]: row };
    return { ...state, byId: nextById, unreadCount };
  });

  return updated;
}

export function markNotificationAsReadLocal(id: string): void {
  updateNotificationLocal(id, {
    is_read: true,
    read_at: nowIso(),
  });
}

export function markAllNotificationsAsReadLocal(userId: string): void {
  const now = nowIso();

  notifications$.set((state) => {
    const nextById = { ...state.byId };

    for (const id of state.allIds) {
      const notification = nextById[id];
      if (
        notification &&
        notification.user_id === userId &&
        !notification.is_read &&
        notification.deleted_at == null
      ) {
        nextById[id] = markPending({
          ...notification,
          is_read: true,
          read_at: now,
        });
      }
    }

    return { ...state, byId: nextById, unreadCount: 0 };
  });
}

export function deleteNotificationLocal(id: string): void {
  notifications$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const wasUnread = !existing.is_read;
    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const unreadCount = wasUnread
      ? Math.max(0, state.unreadCount - 1)
      : state.unreadCount;

    return { ...state, byId: nextById, unreadCount };
  });
}

export function syncNotificationsFromServer(
  notifications: Notification[],
  userId: string
): void {
  const now = nowIso();

  notifications$.set((state) => {
    const nextById = { ...state.byId };
    let nextAllIds = [...state.allIds];

    for (const notification of notifications) {
      const existing = nextById[notification.id];

      if (existing && existing.__local_status === "pending") {
        continue;
      }

      const synced: LocalNotification = {
        ...notification,
        deleted_at: null,
        __local_status: "synced",
        __local_updated_at: now,
        __last_error: null,
        __remote_updated_at: notification.created_at,
      };

      nextById[notification.id] = synced;
      nextAllIds = ensureId(nextAllIds, notification.id);
    }

    const unreadCount = nextAllIds
      .map((id) => nextById[id])
      .filter(
        (n) => n && n.user_id === userId && !n.is_read && n.deleted_at == null
      ).length;

    return {
      ...state,
      byId: nextById,
      allIds: nextAllIds,
      unreadCount,
      lastFetched: now,
    };
  });
}

export function getLocalUnreadCount(): number {
  return notifications$.get().unreadCount;
}
