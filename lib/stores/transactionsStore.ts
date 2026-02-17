import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { Transaction } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalTransaction,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface TransactionsState {
  byId: Record<string, LocalTransaction>;
  allIds: string[];
}

const initialState: TransactionsState = {
  byId: {},
  allIds: [],
};

export const transactions$ = observable<TransactionsState>(initialState);

legendPersist(transactions$, "transactions");

function sortIds(
  ids: string[],
  byId: Record<string, LocalTransaction>
): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.date ?? aRow?.created_at ?? "";
    const bDate = bRow?.date ?? bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function selectTransactions(userId: string): LocalTransaction[] {
  const state = transactions$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is LocalTransaction =>
        !!row && row.user_id === userId && row.deleted_at == null
    );
}

export function selectTransactionsByDateRange(
  userId: string,
  startDate?: string,
  endDate?: string
): LocalTransaction[] {
  return selectTransactions(userId).filter((row) => {
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });
}

export function selectTransactionById(
  userId: string,
  id: string
): LocalTransaction | undefined {
  const row = transactions$.get().byId[id];
  if (!row || row.deleted_at != null || row.user_id !== userId) return undefined;
  return row;
}

export function createTransactionLocal(
  data: Omit<Transaction, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): LocalTransaction {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalTransaction = {
    id,
    user_id: data.user_id,
    account_id: data.account_id,
    amount: data.amount,
    description: data.description,
    date: data.date,
    category: data.category,
    is_recurring: data.is_recurring,
    recurrence_interval: data.recurrence_interval,
    type: data.type,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  transactions$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateTransactionLocal(
  id: string,
  patch: Partial<Omit<Transaction, "id" | "created_at">>
): LocalTransaction | undefined {
  let updated: LocalTransaction | undefined;

  transactions$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalTransaction>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalTransaction>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deleteTransactionLocal(id: string): void {
  transactions$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

