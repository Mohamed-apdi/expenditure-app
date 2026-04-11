import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { AccountGroup } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalAccountGroup,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface AccountGroupsState {
  byId: Record<string, LocalAccountGroup>;
  allIds: string[];
}

const initialState: AccountGroupsState = {
  byId: {},
  allIds: [],
};

export const accountGroups$ = observable<AccountGroupsState>(initialState);

legendPersist(accountGroups$, "account_groups");

function sortIds(ids: string[], byId: Record<string, LocalAccountGroup>): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.updated_at ?? aRow?.created_at ?? "";
    const bDate = bRow?.updated_at ?? bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function selectAccountGroups(userId: string): LocalAccountGroup[] {
  const state = accountGroups$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is LocalAccountGroup =>
        !!row && row.user_id === userId && row.deleted_at == null
    );
}

export function selectAccountGroupById(
  userId: string,
  id: string
): LocalAccountGroup | undefined {
  const row = accountGroups$.get().byId[id];
  if (!row || row.deleted_at != null || row.user_id !== userId) return undefined;
  return row;
}

export function createAccountGroupLocal(
  data: Omit<AccountGroup, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): LocalAccountGroup {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalAccountGroup = {
    id,
    user_id: data.user_id,
    name: data.name,
    description: data.description,
    type_id: data.type_id,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  accountGroups$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateAccountGroupLocal(
  id: string,
  patch: Partial<Omit<AccountGroup, "id" | "created_at">>
): LocalAccountGroup | undefined {
  let updated: LocalAccountGroup | undefined;

  accountGroups$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalAccountGroup>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalAccountGroup>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deleteAccountGroupLocal(id: string): void {
  accountGroups$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

