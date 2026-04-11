import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { AccountType } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalAccountType,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface AccountTypesState {
  byId: Record<string, LocalAccountType>;
  allIds: string[];
}

const initialState: AccountTypesState = {
  byId: {},
  allIds: [],
};

export const accountTypes$ = observable<AccountTypesState>(initialState);

legendPersist(accountTypes$, "account_types");

function sortIds(ids: string[], byId: Record<string, LocalAccountType>): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aName = aRow?.name ?? "";
    const bName = bRow?.name ?? "";
    return aName.localeCompare(bName);
  });
}

export function selectAccountTypes(): LocalAccountType[] {
  const state = accountTypes$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter((row): row is LocalAccountType => !!row && row.deleted_at == null);
}

export function selectAccountTypeById(id: string): LocalAccountType | undefined {
  const row = accountTypes$.get().byId[id];
  if (!row || row.deleted_at != null) return undefined;
  return row;
}

// Although account types are usually read-only lookup data, we still support
// local CRUD for completeness and potential admin flows.

export function createAccountTypeLocal(
  data: Omit<AccountType, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): LocalAccountType {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalAccountType = {
    id,
    name: data.name,
    description: data.description,
    is_asset: data.is_asset,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  accountTypes$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateAccountTypeLocal(
  id: string,
  patch: Partial<Omit<AccountType, "id" | "created_at">>
): LocalAccountType | undefined {
  let updated: LocalAccountType | undefined;

  accountTypes$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalAccountType>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalAccountType>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deleteAccountTypeLocal(id: string): void {
  accountTypes$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

