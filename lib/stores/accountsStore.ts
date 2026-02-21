import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { Account } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalAccount,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface AccountsState {
  byId: Record<string, LocalAccount>;
  allIds: string[];
}

const initialState: AccountsState = {
  byId: {},
  allIds: [],
};

export const accounts$ = observable<AccountsState>(initialState);

// Persist the whole accounts tree locally for offline use
legendPersist(accounts$, "accounts");

function sortIds(ids: string[], byId: Record<string, LocalAccount>): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.updated_at ?? aRow?.created_at ?? "";
    const bDate = bRow?.updated_at ?? bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

/** Convert store row to UI Account (strip local metadata). */
export function toAccount(row: LocalAccount): Account {
  const {
    deleted_at: _da,
    __local_status: _ls,
    __local_updated_at: _lu,
    __last_error: _le,
    __remote_updated_at: _ru,
    ...account
  } = row;
  return account as Account;
}

export function selectAccounts(userId: string): LocalAccount[] {
  const state = accounts$.get();
  const { byId, allIds } = state;
  const ids = Array.isArray(allIds) ? allIds : [];

  return ids
    .map((id) => byId[id])
    .filter(
      (row): row is LocalAccount =>
        !!row && row.user_id === userId && row.deleted_at == null
    );
}

export function selectAccountById(
  userId: string,
  id: string
): LocalAccount | undefined {
  const row = accounts$.get().byId[id];
  if (!row || row.deleted_at != null || row.user_id !== userId) return undefined;
  return row;
}

export function createAccountLocal(
  data: Omit<Account, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): LocalAccount {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalAccount = {
    id,
    user_id: data.user_id,
    account_type: data.account_type,
    name: data.name,
    amount: data.amount,
    description: data.description,
    created_at: now,
    updated_at: now,
    group_id: data.group_id,
    is_default: data.is_default ?? false,
    currency: data.currency ?? "USD",
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  accounts$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updateAccountLocal(
  id: string,
  patch: Partial<Omit<Account, "id" | "created_at">>
): LocalAccount | undefined {
  let updated: LocalAccount | undefined;

  accounts$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalAccount>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalAccount>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deleteAccountLocal(id: string): void {
  accounts$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    // Keep id in allIds so history/conflicts can still surface it
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

/**
 * Seed local store from server when sync hasn't run or failed (e.g. right after login).
 * Inserts each remote row as "synced" so dashboard and WalletDropdown show accounts immediately.
 */
export function setAccountsFromServer(
  userId: string,
  remotes: Array<Record<string, unknown>>
): void {
  if (!remotes.length) return;
  const now = nowIso();
  accounts$.set((state) => {
    let nextById = { ...state.byId };
    let nextAllIds = [...state.allIds];
    for (const remote of remotes) {
      const id = remote.id as string;
      if (!id || (remote.user_id as string) !== userId) continue;
      const existing = nextById[id];
      if (existing) continue;
      const remoteVersion =
        (remote.updated_at as string) ?? (remote.created_at as string) ?? null;
      const row: LocalAccount = {
        ...remote,
        id,
        user_id: (remote.user_id as string) ?? userId,
        account_type: (remote.account_type as string) ?? "Other",
        name: (remote.name as string) ?? "",
        amount: typeof remote.amount === "number" ? remote.amount : 0,
        description: (remote.description as string) ?? null,
        created_at: (remote.created_at as string) ?? now,
        updated_at: (remote.updated_at as string) ?? now,
        group_id: (remote.group_id as string) ?? null,
        is_default: Boolean(remote.is_default),
        currency: (remote.currency as string) ?? "USD",
        deleted_at: (remote.deleted_at as string) ?? null,
        __local_status: "synced",
        __local_updated_at: now,
        __last_error: null,
        __remote_updated_at: remoteVersion,
      } as LocalAccount;
      nextById = { ...nextById, [id]: row };
      nextAllIds = ensureId(nextAllIds, id);
    }
    nextAllIds = sortIds(nextAllIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}
