import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { Transfer } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalTransfer,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface TransfersState {
  byId: Record<string, LocalTransfer>;
  allIds: string[];
}

const initialState: TransfersState = {
  byId: {},
  allIds: [],
};

export const transfers$ = observable<TransfersState>(initialState);

legendPersist(transfers$, "transfers");

function sortIds(ids: string[], byId: Record<string, LocalTransfer>): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.date ?? aRow?.created_at ?? "";
    const bDate = bRow?.date ?? bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function selectTransfers(userId: string): LocalTransfer[] {
  const state = transfers$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is LocalTransfer =>
        !!row && row.user_id === userId && row.deleted_at == null
    );
}

export function selectTransferById(
  userId: string,
  id: string
): LocalTransfer | undefined {
  const row = transfers$.get().byId[id];
  if (!row || row.deleted_at != null || row.user_id !== userId) return undefined;
  return row;
}

export function createTransferLocal(
  data: Omit<Transfer, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): LocalTransfer {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalTransfer = {
    id,
    user_id: data.user_id,
    from_account_id: data.from_account_id,
    to_account_id: data.to_account_id,
    amount: data.amount,
    description: data.description,
    date: data.date,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  transfers$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateTransferLocal(
  id: string,
  patch: Partial<Omit<Transfer, "id" | "created_at">>
): LocalTransfer | undefined {
  let updated: LocalTransfer | undefined;

  transfers$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalTransfer>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalTransfer>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deleteTransferLocal(id: string): void {
  transfers$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

