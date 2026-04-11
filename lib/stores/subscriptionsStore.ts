import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { Subscription } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalSubscription,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface SubscriptionsState {
  byId: Record<string, LocalSubscription>;
  allIds: string[];
}

const initialState: SubscriptionsState = {
  byId: {},
  allIds: [],
};

export const subscriptions$ = observable<SubscriptionsState>(initialState);

legendPersist(subscriptions$, "subscriptions");

function sortIds(
  ids: string[],
  byId: Record<string, LocalSubscription>
): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.created_at ?? "";
    const bDate = bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function selectSubscriptions(userId: string): LocalSubscription[] {
  const state = subscriptions$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is LocalSubscription =>
        !!row && row.user_id === userId && row.deleted_at == null
    );
}

export function selectSubscriptionById(
  userId: string,
  id: string
): LocalSubscription | undefined {
  const row = subscriptions$.get().byId[id];
  if (!row || row.deleted_at != null || row.user_id !== userId) return undefined;
  return row;
}

export function createSubscriptionLocal(
  data: Omit<Subscription, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): LocalSubscription {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalSubscription = {
    id,
    user_id: data.user_id,
    account_id: data.account_id,
    name: data.name,
    amount: data.amount,
    category: data.category,
    billing_cycle: data.billing_cycle,
    next_payment_date: data.next_payment_date,
    is_active: data.is_active,
    icon: data.icon,
    icon_color: data.icon_color,
    description: data.description,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  subscriptions$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateSubscriptionLocal(
  id: string,
  patch: Partial<Omit<Subscription, "id" | "created_at">>
): LocalSubscription | undefined {
  let updated: LocalSubscription | undefined;

  subscriptions$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalSubscription>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalSubscription>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deleteSubscriptionLocal(id: string): void {
  subscriptions$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

