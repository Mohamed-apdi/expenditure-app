import NetInfo from "@react-native-community/netinfo";

import { getCurrentUserOfflineFirst } from "../auth";
import { supabase } from "../database/supabase";
import { accountGroups$ } from "../stores/accountGroupsStore";
import { accountTypes$ } from "../stores/accountTypesStore";
import { accounts$ } from "../stores/accountsStore";
import { budgets$ } from "../stores/budgetsStore";
import {
  addConflictLocal,
  resolveConflictLocal,
  resolveConflictsForEntity,
  selectConflictById,
  selectConflictsCount,
} from "../stores/conflictsStore";
import { expenses$ } from "../stores/expensesStore";
import { goals$ } from "../stores/goalsStore";
import { personalLoans$ } from "../stores/personalLoansStore";
import { profiles$ } from "../stores/profileStore";
import { ensureId, type LocalStatus } from "../stores/storeUtils";
import { subscriptions$ } from "../stores/subscriptionsStore";
import {
  getLastSyncAt,
  updateLastSyncAt,
  type SyncCursorTable,
} from "../stores/syncCursorsStore";
import {
  selectSyncState,
  updateSyncStateLocal,
} from "../stores/syncStateStore";
import { transactions$ } from "../stores/transactionsStore";
import { transfers$ } from "../stores/transfersStore";
import type { ConflictType, SyncableEntityType } from "./types";

type SyncEntity =
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

const ENTITY_ORDER: SyncEntity[] = [
  "account_types",
  "account_groups",
  "accounts",
  "expenses",
  "transactions",
  "transfers",
  "budgets",
  "goals",
  "subscriptions",
  "personal_loans",
  "profiles",
];

function nowIso(): string {
  return new Date().toISOString();
}

function isDirtyStatus(status: LocalStatus | undefined): boolean {
  return status === "pending" || status === "conflict" || status === "failed";
}

async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUserOfflineFirst();
  return user?.id ?? null;
}

/** When true, sync (push/pull) is skipped. Wired to connectivity: locked when offline. */
// export async function isOfflineGateLocked(): Promise<boolean> {
//   const net = await NetInfo.fetch();
//   const connected = net.isConnected ?? false;
//   return !connected;
// }
export async function isOfflineGateLocked(): Promise<boolean> {
  const net = await NetInfo.fetch();
  const connected = net.isConnected ?? false;
  const internetReachable =
    net.isInternetReachable === null
      ? true
      : (net.isInternetReachable ?? false);

  return !(connected && internetReachable);
}

async function computePendingCount(): Promise<number> {
  const tables = [
    accounts$,
    accountGroups$,
    accountTypes$,
    expenses$,
    transactions$,
    transfers$,
    budgets$,
    goals$,
    subscriptions$,
    personalLoans$,
    profiles$,
  ];

  let total = 0;
  for (const store of tables) {
    const { byId } = store.get();
    total += Object.values(byId).filter(
      (row: any) => row.__local_status === "pending",
    ).length;
  }
  return total;
}

async function updateGlobalSyncState(
  patch: Partial<Parameters<typeof updateSyncStateLocal>[0]> = {},
): Promise<void> {
  const isOnline = (await NetInfo.fetch()).isConnected ?? false;
  const pendingCount = await computePendingCount();
  const conflictsCount = selectConflictsCount();

  updateSyncStateLocal({
    isOnline,
    pendingCount,
    conflictsCount,
    pendingUploadsCount: selectSyncState().pendingUploadsCount,
    ...patch,
  });
}

function baseQueryForTable(table: SyncEntity, userId: string) {
  let query = supabase.from(table).select("*");

  if (table === "profiles") {
    return query.eq("id", userId);
  }

  if (table !== "account_types") {
    query = query.eq("user_id", userId);
  }

  return query;
}

function storeForTable(table: SyncEntity): {
  byId: () => Record<string, any>;
  set: (updater: (s: any) => any) => void;
} {
  switch (table) {
    case "account_types":
      return {
        byId: () => accountTypes$.get().byId as any,
        set: accountTypes$.set as any,
      };
    case "account_groups":
      return {
        byId: () => accountGroups$.get().byId as any,
        set: accountGroups$.set as any,
      };
    case "accounts":
      return {
        byId: () => accounts$.get().byId as any,
        set: accounts$.set as any,
      };
    case "expenses":
      return {
        byId: () => expenses$.get().byId as any,
        set: expenses$.set as any,
      };
    case "transactions":
      return {
        byId: () => transactions$.get().byId as any,
        set: transactions$.set as any,
      };
    case "transfers":
      return {
        byId: () => transfers$.get().byId as any,
        set: transfers$.set as any,
      };
    case "budgets":
      return {
        byId: () => budgets$.get().byId as any,
        set: budgets$.set as any,
      };
    case "goals":
      return {
        byId: () => goals$.get().byId as any,
        set: goals$.set as any,
      };
    case "subscriptions":
      return {
        byId: () => subscriptions$.get().byId as any,
        set: subscriptions$.set as any,
      };
    case "personal_loans":
      return {
        byId: () => personalLoans$.get().byId as any,
        set: personalLoans$.set as any,
      };
    case "profiles":
      return {
        byId: () => profiles$.get().byId as any,
        set: profiles$.set as any,
      };
  }
}

function syncableEntityTypeFor(table: SyncEntity): SyncableEntityType {
  switch (table) {
    case "accounts":
      return "account";
    case "account_groups":
      return "account_group";
    case "account_types":
      return "account_type";
    case "expenses":
      return "expense";
    case "transactions":
      return "transaction";
    case "transfers":
      return "transfer";
    case "budgets":
      return "budget";
    case "goals":
      return "goal";
    case "subscriptions":
      return "subscription";
    case "personal_loans":
      return "personal_loan";
    case "profiles":
      return "profile";
  }
}

function tableForEntityType(entityType: SyncableEntityType): SyncEntity {
  const map: Record<SyncableEntityType, SyncEntity> = {
    account: "accounts",
    account_group: "account_groups",
    account_type: "account_types",
    expense: "expenses",
    transaction: "transactions",
    transfer: "transfers",
    budget: "budgets",
    goal: "goals",
    subscription: "subscriptions",
    personal_loan: "personal_loans",
    profile: "profiles",
  };
  return map[entityType];
}

function remoteUpdatedAt(remote: any): string | null {
  return remote.updated_at ?? remote.created_at ?? null;
}

function buildPayload(table: SyncEntity, row: any, userId: string): any {
  const payload: any = { ...row };

  // Remove local-only metadata
  delete payload.__local_status;
  delete payload.__local_updated_at;
  delete payload.__last_error;
  delete payload.__remote_updated_at;

  if (table !== "account_types" && table !== "profiles") {
    payload.user_id = row.user_id ?? userId;
  }

  if (table === "profiles") {
    payload.id = userId;
  }

  return payload;
}

async function pullTable(table: SyncEntity, userId: string): Promise<void> {
  const lastSyncAt = getLastSyncAt(table as SyncCursorTable);
  const baseQuery = baseQueryForTable(table, userId);

  const pageSize = 500;
  let from = 0;
  let maxUpdatedAt = lastSyncAt;

  // Build filter for incremental sync if we have a cursor
  let filteredQuery = baseQuery;
  if (lastSyncAt) {
    // filteredQuery = filteredQuery.or(
    //   `updated_at.gt.${lastSyncAt},deleted_at.gt.${lastSyncAt}`
    // );
    filteredQuery = filteredQuery.or(
      `created_at.gt.${lastSyncAt},updated_at.gt.${lastSyncAt},deleted_at.gt.${lastSyncAt}`,
    );
  }

  // Paginate
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pageQuery = filteredQuery.range(from, from + pageSize - 1);
    const { data, error } = (await pageQuery) as {
      data: any[] | null;
      error: any;
    };

    if (error) {
      await updateGlobalSyncState({ lastError: error.message });
      return;
    }

    if (!data || data.length === 0) break;

    for (const remote of data as any[]) {
      const updatedAt = remoteUpdatedAt(remote);
      if (updatedAt && (!maxUpdatedAt || updatedAt > maxUpdatedAt)) {
        maxUpdatedAt = updatedAt;
      }

      await applyRemoteRow(table, userId, remote);
    }

    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  if (maxUpdatedAt) {
    updateLastSyncAt(table as SyncCursorTable, maxUpdatedAt);
  }
}

async function applyRemoteRow(
  table: SyncEntity,
  userId: string,
  remote: any,
): Promise<void> {
  const store = storeForTable(table);
  const byId = store.byId();
  const local = byId[remote.id];
  const remoteIsDeleted = !!remote.deleted_at;
  const remoteVersion = remoteUpdatedAt(remote);

  // No local row: insert directly from remote as synced
  if (!local) {
    const row = {
      ...remote,
      deleted_at: remote.deleted_at ?? null,
      __local_status: "synced" as LocalStatus,
      __local_updated_at: nowIso(),
      __last_error: null,
      __remote_updated_at: remoteVersion,
    };

    store.set((state: any) => {
      const nextById = { ...state.byId, [remote.id]: row };
      const nextAllIds = ensureId(state.allIds, remote.id);
      return { ...state, byId: nextById, allIds: nextAllIds };
    });
    return;
  }

  // Local row exists and is dirty
  if (isDirtyStatus(local.__local_status)) {
    // Delete-vs-modify: delete wins
    if (remoteIsDeleted) {
      store.set((state: any) => {
        const existing = state.byId[remote.id];
        if (!existing) return state;
        const updated = {
          ...existing,
          deleted_at: remote.deleted_at,
          __local_status: "synced" as LocalStatus,
          __last_error: null,
          __local_updated_at: nowIso(),
          __remote_updated_at: remoteVersion,
        };
        return {
          ...state,
          byId: { ...state.byId, [remote.id]: updated },
        };
      });
      // Clear any conflicts associated with this entity
      resolveConflictsForEntity(syncableEntityTypeFor(table), remote.id);
      return;
    }

    // Modify-vs-modify: remote version changed compared to base
    if (
      remoteVersion &&
      remoteVersion !== local.__remote_updated_at &&
      !local.deleted_at &&
      !remote.deleted_at
    ) {
      addConflictLocal({
        entityType: syncableEntityTypeFor(table),
        entityId: remote.id,
        localVersion: local,
        remoteVersion: remote,
        conflictType: "modify_vs_modify" as ConflictType,
      });

      store.set((state: any) => {
        const existing = state.byId[remote.id];
        if (!existing) return state;
        const updated = {
          ...existing,
          __local_status: "conflict" as LocalStatus,
        };
        return {
          ...state,
          byId: { ...state.byId, [remote.id]: updated },
        };
      });
    }

    return;
  }

  // Local not dirty
  if (remoteIsDeleted) {
    // Delete wins
    store.set((state: any) => {
      const existing = state.byId[remote.id];
      if (!existing) return state;
      const updated = {
        ...existing,
        deleted_at: remote.deleted_at,
        __local_status: "synced" as LocalStatus,
        __last_error: null,
        __local_updated_at: nowIso(),
        __remote_updated_at: remoteVersion,
      };
      return {
        ...state,
        byId: { ...state.byId, [remote.id]: updated },
      };
    });
    resolveConflictsForEntity(syncableEntityTypeFor(table), remote.id);
    return;
  }

  // Normal remote update
  store.set((state: any) => {
    const existing = state.byId[remote.id];
    if (!existing) return state;

    const merged = {
      ...existing,
      ...remote,
      deleted_at: remote.deleted_at ?? existing.deleted_at ?? null,
      __local_status: "synced" as LocalStatus,
      __last_error: null,
      __local_updated_at: nowIso(),
      __remote_updated_at:
        remoteVersion ?? existing.__remote_updated_at ?? null,
    };

    const nextById = { ...state.byId, [remote.id]: merged };
    const nextAllIds = ensureId(state.allIds, remote.id);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

async function pushTable(table: SyncEntity, userId: string): Promise<void> {
  const store = storeForTable(table);
  const byId = store.byId();

  const pending = Object.values(byId).filter(
    (row: any) => row.__local_status === "pending",
  );

  for (const row of pending) {
    try {
      const payload = buildPayload(table, row, userId);
      let remoteRow: any | null = null;

      if (row.deleted_at) {
        let query = supabase
          .from(table)
          .update({
            deleted_at: row.deleted_at,
          })
          .eq("id", row.id);

        if (table !== "account_types" && table !== "profiles") {
          query = query.eq("user_id", userId);
        }

        const { data, error } = await query.select().single();

        if (error) throw error;
        remoteRow = data;
      } else {
        const { data, error } = await supabase
          .from(table)
          .upsert(payload, { onConflict: "id" })
          .select()
          .single();
        if (error) throw error;
        remoteRow = data;
      }

      const remoteVersion = remoteUpdatedAt(remoteRow ?? {});

      // Mark as synced
      store.set((state: any) => {
        const existing = state.byId[row.id];
        if (!existing) return state;
        const updated = {
          ...existing,
          __local_status: "synced" as LocalStatus,
          __last_error: null,
          __local_updated_at: nowIso(),
          __remote_updated_at:
            remoteVersion ?? existing.__remote_updated_at ?? null,
        };
        return {
          ...state,
          byId: { ...state.byId, [row.id]: updated },
        };
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : `Failed to sync changes for ${table}`;
      store.set((state: any) => {
        const existing = state.byId[row.id];
        if (!existing) return state;
        const updated = {
          ...existing,
          __local_status: "failed" as LocalStatus,
          __last_error: msg,
          __local_updated_at: nowIso(),
        };
        return {
          ...state,
          byId: { ...state.byId, [row.id]: updated },
        };
      });
      await updateGlobalSyncState({ lastError: msg });
    }
  }
}

let isSyncing = false;
let netInfoUnsubscribe: (() => void) | null = null;

export async function triggerSync(): Promise<void> {
  if (isSyncing) return;

  const gateLocked = await isOfflineGateLocked();
  if (gateLocked) {
    // Offline is normal; don't set lastError so UI shows "Offline" not "Sync error"
    await updateGlobalSyncState({ lastError: null });
    return;
  }

  const userId = await getCurrentUserId();
  if (!userId) return;

  isSyncing = true;
  await updateGlobalSyncState({ isSyncing: true, lastError: null });

  try {
    // Pull all tables in order
    for (const table of ENTITY_ORDER) {
      await pullTable(table, userId);
    }

    // Then push all tables in order
    for (const table of ENTITY_ORDER) {
      await pushTable(table, userId);
    }

    await updateGlobalSyncState({
      isSyncing: false,
      lastSyncedAt: nowIso(),
    });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Sync failed due to unexpected error";
    await updateGlobalSyncState({ isSyncing: false, lastError: msg });
  } finally {
    isSyncing = false;
  }
}

export async function retryFailedSync(): Promise<void> {
  const tables = [
    accounts$,
    accountGroups$,
    accountTypes$,
    expenses$,
    transactions$,
    transfers$,
    budgets$,
    goals$,
    subscriptions$,
    personalLoans$,
    profiles$,
  ];

  // Split per-store to keep types simple for TS
  const bumpFailed = (store: { set: (fn: (s: any) => any) => void }) => {
    store.set((state: any) => {
      const byId = { ...state.byId };
      let changed = false;
      for (const id of Object.keys(byId)) {
        const row = byId[id];
        if (row && row.__local_status === "failed") {
          changed = true;
          byId[id] = {
            ...row,
            __local_status: "pending" as LocalStatus,
            __last_error: null,
            __local_updated_at: nowIso(),
          };
        }
      }
      if (!changed) return state;
      return { ...state, byId };
    });
  };

  bumpFailed(accounts$);
  bumpFailed(accountGroups$);
  bumpFailed(accountTypes$);
  bumpFailed(expenses$);
  bumpFailed(transactions$);
  bumpFailed(transfers$);
  bumpFailed(budgets$);
  bumpFailed(goals$);
  bumpFailed(subscriptions$);
  bumpFailed(personalLoans$);
  bumpFailed(profiles$);

  await triggerSync();
}

/**
 * Resolve a conflict by keeping the local version (will be pushed on next sync).
 */
export function resolveConflictKeepLocal(conflictId: string): void {
  const conflict = selectConflictById(conflictId);
  if (!conflict) return;
  const table = tableForEntityType(conflict.entityType);
  const store = storeForTable(table);
  store.set((state: any) => {
    const existing = state.byId[conflict.entityId];
    if (!existing) return state;
    const updated = {
      ...existing,
      __local_status: "pending" as LocalStatus,
      __local_updated_at: nowIso(),
      __last_error: null,
    };
    return {
      ...state,
      byId: { ...state.byId, [conflict.entityId]: updated },
    };
  });
  resolveConflictLocal(conflictId);
  void updateGlobalSyncState();
}

/**
 * Resolve a conflict by accepting the server version (overwrites local).
 */
export function resolveConflictUseRemote(conflictId: string): void {
  const conflict = selectConflictById(conflictId);
  if (!conflict) return;
  const remote = conflict.remoteVersion as any;
  const table = tableForEntityType(conflict.entityType);
  const store = storeForTable(table);
  const remoteVersion = remote?.updated_at ?? remote?.created_at ?? null;
  store.set((state: any) => {
    const existing = state.byId[conflict.entityId];
    if (!existing) return state;
    const merged = {
      ...existing,
      ...remote,
      deleted_at: remote?.deleted_at ?? existing.deleted_at ?? null,
      __local_status: "synced" as LocalStatus,
      __last_error: null,
      __local_updated_at: nowIso(),
      __remote_updated_at:
        remoteVersion ?? existing.__remote_updated_at ?? null,
    };
    return {
      ...state,
      byId: { ...state.byId, [conflict.entityId]: merged },
    };
  });
  resolveConflictLocal(conflictId);
  void updateGlobalSyncState();
}

export const __test__ = {
  applyRemoteRow,
  pullTable,
  pushTable,
};

export async function startSync(): Promise<void> {
  if (netInfoUnsubscribe) return;

  // netInfoUnsubscribe = NetInfo.addEventListener((state) => {
  //   const online = !!state.isConnected;
  //   updateSyncStateLocal({
  //     isOnline: online,
  //   });
  //   if (online) {
  //     void triggerSync();
  //   }
  // });

  netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    const connected = !!state.isConnected;
    const internetReachable =
      state.isInternetReachable === null ? true : !!state.isInternetReachable;

    const online = connected && internetReachable;

    updateSyncStateLocal({ isOnline: online });
    if (online) void triggerSync();
  });

  // Initial kick
  void triggerSync();
}

export async function stopSync(): Promise<void> {
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }
}
