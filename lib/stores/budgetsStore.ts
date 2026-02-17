import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { Budget } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalBudget,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface BudgetsState {
  byId: Record<string, LocalBudget>;
  allIds: string[];
}

const initialState: BudgetsState = {
  byId: {},
  allIds: [],
};

export const budgets$ = observable<BudgetsState>(initialState);

legendPersist(budgets$, "budgets");

function sortIds(ids: string[], byId: Record<string, LocalBudget>): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.created_at ?? "";
    const bDate = bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function selectBudgets(userId: string): LocalBudget[] {
  const state = budgets$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is LocalBudget =>
        !!row && row.user_id === userId && row.deleted_at == null
    );
}

export function selectBudgetById(
  userId: string,
  id: string
): LocalBudget | undefined {
  const row = budgets$.get().byId[id];
  if (!row || row.deleted_at != null || row.user_id !== userId) return undefined;
  return row;
}

export function createBudgetLocal(
  data: Omit<Budget, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): LocalBudget {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalBudget = {
    id,
    user_id: data.user_id,
    account_id: data.account_id,
    category: data.category,
    amount: data.amount,
    period: data.period,
    start_date: data.start_date,
    end_date: data.end_date,
    is_active: data.is_active,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  budgets$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateBudgetLocal(
  id: string,
  patch: Partial<Omit<Budget, "id" | "created_at">>
): LocalBudget | undefined {
  let updated: LocalBudget | undefined;

  budgets$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalBudget>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalBudget>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deleteBudgetLocal(id: string): void {
  budgets$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

