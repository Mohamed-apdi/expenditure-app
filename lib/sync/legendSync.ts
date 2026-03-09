import NetInfo from "@react-native-community/netinfo";

import { getCurrentUserOfflineFirst } from "../auth";
import { supabase } from "../database/supabase";
import { accountGroups$ } from "../stores/accountGroupsStore";
import { accountTypes$ } from "../stores/accountTypesStore";
import { accounts$ } from "../stores/accountsStore";
import { budgets$ } from "../stores/budgetsStore";
import {
  resolveConflictsForEntity,
  selectConflictsCount,
  selectConflictById,
  resolveConflictLocal,
} from "../stores/conflictsStore";
import { expenses$ } from "../stores/expensesStore";
import { goals$ } from "../stores/goalsStore";
import { investments$ } from "../stores/investmentsStore";
import { loanRepayments$ } from "../stores/loanRepaymentsStore";
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
import type { SyncableEntityType } from "./types";

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
  | "loan_repayments"
  | "investments"
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
  "loan_repayments",
  "investments",
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
    loanRepayments$,
    investments$,
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

  if (table === "loan_repayments") {
    // loan_repayments doesn't have user_id directly; we'll filter via personal_loans
    // For now, just pull all and filter locally, or we join. Simplified: pull all related to user's loans.
    // Actually, let's add a subquery approach or just pull all repayments for user's loans.
    // For simplicity, we'll need to handle this differently - pull all then filter.
    return query;
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
    case "loan_repayments":
      return {
        byId: () => loanRepayments$.get().byId as any,
        set: loanRepayments$.set as any,
      };
    case "investments":
      return {
        byId: () => investments$.get().byId as any,
        set: investments$.set as any,
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
    case "loan_repayments":
      return "loan_repayment";
    case "investments":
      return "investment";
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
    loan_repayment: "loan_repayments",
    investment: "investments",
    profile: "profiles",
  };
  return map[entityType];
}

function remoteUpdatedAt(remote: any): string | null {
  return remote.updated_at ?? remote.created_at ?? null;
}

function buildPayload(table: SyncEntity, row: any, userId: string): any {
  // Define allowed columns for each table to avoid sending invalid fields
  // NOTE: deleted_at is NOT included here - it's handled separately for soft deletes
  // If your database doesn't have deleted_at columns, records are hard-deleted
  const tableColumns: Record<SyncEntity, string[]> = {
    account_types: ["id", "name", "description", "is_asset", "created_at", "updated_at"],
    account_groups: ["id", "user_id", "name", "description", "type_id", "created_at", "updated_at"],
    accounts: ["id", "user_id", "account_type", "name", "amount", "description", "created_at", "updated_at", "is_default", "currency"],
    expenses: ["id", "user_id", "account_id", "amount", "category", "description", "date", "is_recurring", "recurrence_interval", "is_essential", "created_at", "updated_at", "receipt_url", "entry_type"],
    transactions: ["id", "user_id", "account_id", "amount", "description", "date", "category", "is_recurring", "recurrence_interval", "type", "created_at", "updated_at"],
    transfers: ["id", "user_id", "from_account_id", "to_account_id", "amount", "description", "date", "created_at", "updated_at"],
    budgets: ["id", "user_id", "account_id", "category", "amount", "period", "start_date", "end_date", "is_active", "created_at", "updated_at"],
    goals: ["id", "user_id", "account_id", "name", "target_amount", "current_amount", "category", "target_date", "is_active", "icon", "icon_color", "description", "created_at", "updated_at"],
    subscriptions: ["id", "user_id", "account_id", "name", "amount", "category", "billing_cycle", "next_payment_date", "is_active", "icon", "icon_color", "description", "created_at", "updated_at"],
    personal_loans: ["id", "user_id", "account_id", "type", "party_name", "principal_amount", "remaining_amount", "interest_rate", "due_date", "status", "created_at", "updated_at"],
    loan_repayments: ["id", "loan_id", "amount", "payment_date", "created_at"],
    investments: ["id", "user_id", "account_id", "type", "name", "invested_amount", "current_value", "created_at", "updated_at"],
    profiles: ["id", "full_name", "phone", "user_type", "created_at", "image_url", "email"],
  };

  const allowedColumns = tableColumns[table] || [];
  const payload: any = {};

  // Only include allowed columns (explicitly excludes deleted_at)
  for (const col of allowedColumns) {
    if (row[col] !== undefined) {
      payload[col] = row[col];
    }
  }

  // Ensure user_id is set for tables that need it
  if (table !== "account_types" && table !== "profiles" && table !== "loan_repayments") {
    payload.user_id = row.user_id ?? userId;
  }

  // For profiles, ensure id matches userId
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
  // NOTE: Database doesn't have deleted_at column, so we only filter by created_at and updated_at
  let filteredQuery = baseQuery;
  if (lastSyncAt) {
    filteredQuery = filteredQuery.or(
      `created_at.gt.${lastSyncAt},updated_at.gt.${lastSyncAt}`,
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
    // Auto-resolve by keeping local changes (last-write-wins from user's device)
    // This simplifies UX - user's local edits are preserved, will sync on next push
    if (
      remoteVersion &&
      remoteVersion !== local.__remote_updated_at &&
      !local.deleted_at &&
      !remote.deleted_at
    ) {
      // Keep local version as-is, it will be pushed on next sync cycle
      // Update the remote version tracker so we don't re-detect this conflict
      store.set((state: any) => {
        const existing = state.byId[remote.id];
        if (!existing) return state;
        const updated = {
          ...existing,
          __remote_updated_at: remoteVersion,
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

  if (pending.length > 0) {
    console.log(`[Sync] Pushing ${pending.length} pending rows for ${table}`);
  }

  for (const row of pending) {
    try {
      const payload = buildPayload(table, row, userId);
      let remoteRow: any | null = null;

      if (row.deleted_at) {
        console.log(`[Sync] Pushing delete for ${table}/${row.id}`);
        
        // First check if the record exists on the server
        let checkQuery = supabase
          .from(table)
          .select("id")
          .eq("id", row.id);
        
        if (table !== "account_types" && table !== "profiles") {
          checkQuery = checkQuery.eq("user_id", userId);
        }
        
        const { data: existsData } = await checkQuery.maybeSingle();
        
        if (existsData) {
          // Record exists on server - perform hard delete (database has no deleted_at column)
          let deleteQuery = supabase
            .from(table)
            .delete()
            .eq("id", row.id);

          if (table !== "account_types" && table !== "profiles") {
            deleteQuery = deleteQuery.eq("user_id", userId);
          }

          const { error } = await deleteQuery;

          if (error) {
            console.error(`[Sync] Supabase delete error for ${table}/${row.id}:`, error.message, error.details, error.hint);
            throw error;
          }
          console.log(`[Sync] Successfully deleted ${table}/${row.id} from server`);
          remoteRow = null;
        } else {
          // Record doesn't exist on server (was created and deleted offline)
          // Just mark as synced locally, nothing to do on server
          console.log(`[Sync] Record ${table}/${row.id} doesn't exist on server, skipping delete`);
          remoteRow = null;
        }
      } else {
        console.log(`[Sync] Pushing upsert for ${table}/${row.id}`, JSON.stringify(payload));
        const { data, error } = await supabase
          .from(table)
          .upsert(payload, { onConflict: "id" })
          .select()
          .single();
        if (error) {
          console.error(`[Sync] Supabase upsert error for ${table}/${row.id}:`, error.message, error.details, error.hint);
          throw error;
        }
        remoteRow = data;
      }

      const remoteVersion = remoteUpdatedAt(remoteRow ?? {});
      console.log(`[Sync] Successfully pushed ${table}/${row.id}`);

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
    } catch (e: any) {
      const msg = e?.message || `Failed to sync changes for ${table}`;
      const details = e?.details || e?.hint || '';
      console.error(`[Sync] Failed to push ${table}/${row.id}:`, msg, details);
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
  if (isSyncing) {
    console.log("[Sync] Sync already in progress, skipping");
    return;
  }

  const gateLocked = await isOfflineGateLocked();
  if (gateLocked) {
    console.log("[Sync] Offline - skipping sync");
    await updateGlobalSyncState({ lastError: null });
    return;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    console.log("[Sync] No user ID - skipping sync");
    return;
  }

  isSyncing = true;
  const pendingBefore = await computePendingCount();
  console.log("[Sync] Starting sync, pending changes:", pendingBefore);
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

    const pendingAfter = await computePendingCount();
    console.log("[Sync] Sync completed, pending changes remaining:", pendingAfter);

    await updateGlobalSyncState({
      isSyncing: false,
      lastSyncedAt: nowIso(),
      lastError: null, // Clear any previous errors on successful sync
    });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Sync failed due to unexpected error";
    console.error("[Sync] Sync failed:", msg);
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
  bumpFailed(loanRepayments$);
  bumpFailed(investments$);
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

let wasOffline = true;

export async function startSync(): Promise<void> {
  if (netInfoUnsubscribe) return;

  netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    const connected = !!state.isConnected;
    const internetReachable =
      state.isInternetReachable === null ? true : !!state.isInternetReachable;

    const online = connected && internetReachable;

    console.log("[Sync] Network state changed:", { connected, internetReachable, online, wasOffline });
    
    updateSyncStateLocal({ isOnline: online });
    
    if (online) {
      // If we were offline and now online, retry any failed syncs first
      if (wasOffline) {
        console.log("[Sync] Coming back online - retrying failed syncs and triggering full sync");
        void retryFailedSync();
      } else {
        void triggerSync();
      }
    }
    
    wasOffline = !online;
  });

  // Initial kick
  const initialState = await NetInfo.fetch();
  wasOffline = !(initialState.isConnected && (initialState.isInternetReachable ?? true));
  console.log("[Sync] Initial sync kick, wasOffline:", wasOffline);
  void triggerSync();
}

export async function stopSync(): Promise<void> {
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }
}
