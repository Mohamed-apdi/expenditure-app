import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { Goal } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalGoal,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface GoalsState {
  byId: Record<string, LocalGoal>;
  allIds: string[];
}

const initialState: GoalsState = {
  byId: {},
  allIds: [],
};

export const goals$ = observable<GoalsState>(initialState);

legendPersist(goals$, "goals");

function sortIds(ids: string[], byId: Record<string, LocalGoal>): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.created_at ?? "";
    const bDate = bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function selectGoals(userId: string): LocalGoal[] {
  const state = goals$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is LocalGoal =>
        !!row && row.user_id === userId && row.deleted_at == null
    );
}

export function selectGoalById(
  userId: string,
  id: string
): LocalGoal | undefined {
  const row = goals$.get().byId[id];
  if (!row || row.deleted_at != null || row.user_id !== userId) return undefined;
  return row;
}

export function createGoalLocal(
  data: Omit<Goal, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): LocalGoal {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalGoal = {
    id,
    user_id: data.user_id,
    account_id: data.account_id,
    name: data.name,
    target_amount: data.target_amount,
    current_amount: data.current_amount,
    category: data.category,
    target_date: data.target_date,
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

  goals$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateGoalLocal(
  id: string,
  patch: Partial<Omit<Goal, "id" | "created_at">>
): LocalGoal | undefined {
  let updated: LocalGoal | undefined;

  goals$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalGoal>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalGoal>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deleteGoalLocal(id: string): void {
  goals$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

