import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { Expense } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalExpense,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface ExpensesState {
  byId: Record<string, LocalExpense>;
  allIds: string[];
}

const initialState: ExpensesState = {
  byId: {},
  allIds: [],
};

export const expenses$ = observable<ExpensesState>(initialState);

legendPersist(expenses$, "expenses");

function sortIds(ids: string[], byId: Record<string, LocalExpense>): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.date ?? aRow?.created_at ?? "";
    const bDate = bRow?.date ?? bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function selectExpenses(userId: string): LocalExpense[] {
  const state = expenses$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is LocalExpense =>
        !!row && row.user_id === userId && row.deleted_at == null
    );
}

export function selectExpensesByDateRange(
  userId: string,
  startDate?: string,
  endDate?: string
): LocalExpense[] {
  return selectExpenses(userId).filter((row) => {
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });
}

export function selectExpenseById(
  userId: string,
  id: string
): LocalExpense | undefined {
  const row = expenses$.get().byId[id];
  if (!row || row.deleted_at != null || row.user_id !== userId) return undefined;
  return row;
}

export function createExpenseLocal(
  data: Omit<Expense, "id" | "created_at" | "updated_at"> & {
    id?: string;
    user_id: string;
  }
): LocalExpense {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalExpense = {
    id,
    user_id: data.user_id,
    account_id: data.account_id,
    amount: data.amount,
    category: data.category,
    description: data.description,
    date: data.date,
    is_recurring: data.is_recurring,
    recurrence_interval: data.recurrence_interval,
    is_essential: data.is_essential,
    created_at: now,
    updated_at: now,
    receipt_url: data.receipt_url,
    entry_type: data.entry_type,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  expenses$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateExpenseLocal(
  id: string,
  patch: Partial<Omit<Expense, "id" | "created_at">>
): LocalExpense | undefined {
  let updated: LocalExpense | undefined;

  expenses$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalExpense>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalExpense>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deleteExpenseLocal(id: string): void {
  expenses$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

