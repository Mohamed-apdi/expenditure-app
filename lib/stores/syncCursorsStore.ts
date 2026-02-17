import { observable } from "@legendapp/state";

import { legendPersist } from "./legendPersist";
import { nowIso } from "./storeUtils";

export type SyncCursorTable =
  | "account_types"
  | "account_groups"
  | "accounts"
  | "expenses"
  | "transactions"
  | "transfers"
  | "budgets"
  | "goals"
  | "subscriptions"
  | "personal_loans"
  | "profiles";

export interface SyncCursorRow {
  table: SyncCursorTable;
  lastSyncAt: string | null;
}

export interface SyncCursorsState {
  byTable: Record<SyncCursorTable, SyncCursorRow>;
}

const defaultRow = (table: SyncCursorTable): SyncCursorRow => ({
  table,
  lastSyncAt: null,
});

const initialState: SyncCursorsState = {
  byTable: {
    account_types: defaultRow("account_types"),
    account_groups: defaultRow("account_groups"),
    accounts: defaultRow("accounts"),
    expenses: defaultRow("expenses"),
    transactions: defaultRow("transactions"),
    transfers: defaultRow("transfers"),
    budgets: defaultRow("budgets"),
    goals: defaultRow("goals"),
    subscriptions: defaultRow("subscriptions"),
    personal_loans: defaultRow("personal_loans"),
    profiles: defaultRow("profiles"),
  },
};

export const syncCursors$ = observable<SyncCursorsState>(initialState);

legendPersist(syncCursors$, "sync_cursors");

export function getLastSyncAt(table: SyncCursorTable): string | null {
  const state = syncCursors$.get();
  return state.byTable[table]?.lastSyncAt ?? null;
}

export function updateLastSyncAt(
  table: SyncCursorTable,
  lastSyncAt: string | null
): void {
  syncCursors$.set((state) => ({
    ...state,
    byTable: {
      ...state.byTable,
      [table]: {
        table,
        lastSyncAt: lastSyncAt ?? nowIso(),
      },
    },
  }));
}

