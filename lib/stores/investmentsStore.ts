import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { Investment } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalInvestment,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface InvestmentsState {
  byId: Record<string, LocalInvestment>;
  allIds: string[];
}

const initialState: InvestmentsState = {
  byId: {},
  allIds: [],
};

export const investments$ = observable<InvestmentsState>(initialState);

legendPersist(investments$, "investments");

function sortIds(
  ids: string[],
  byId: Record<string, LocalInvestment>
): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.created_at ?? "";
    const bDate = bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function selectInvestments(userId: string): LocalInvestment[] {
  const state = investments$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is LocalInvestment =>
        !!row && row.user_id === userId && row.deleted_at == null
    );
}

export function selectInvestmentById(
  userId: string,
  id: string
): LocalInvestment | undefined {
  const row = investments$.get().byId[id];
  if (!row || row.deleted_at != null || row.user_id !== userId) return undefined;
  return row;
}

export function createInvestmentLocal(
  data: Omit<Investment, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): LocalInvestment {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalInvestment = {
    id,
    user_id: data.user_id,
    account_id: data.account_id,
    type: data.type,
    name: data.name,
    invested_amount: data.invested_amount,
    current_value: data.current_value,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  investments$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateInvestmentLocal(
  id: string,
  patch: Partial<Omit<Investment, "id" | "created_at">>
): LocalInvestment | undefined {
  let updated: LocalInvestment | undefined;

  investments$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalInvestment>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalInvestment>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deleteInvestmentLocal(id: string): void {
  investments$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}
