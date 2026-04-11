import { observable } from "@legendapp/state";

import { legendPersist } from "./legendPersist";
import { LocalMetadata, nowIso } from "./storeUtils";

export interface SyncStateRow extends LocalMetadata {
  id: "global";
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  pendingCount: number;
  pendingUploadsCount: number;
  conflictsCount: number;
}

export interface SyncStateStore {
  byId: Record<string, SyncStateRow>;
  allIds: string[];
}

const initialRow: SyncStateRow = {
  id: "global",
  isOnline: false,
  isSyncing: false,
  lastSyncedAt: null,
  lastError: null,
  pendingCount: 0,
  pendingUploadsCount: 0,
  conflictsCount: 0,
  deleted_at: null,
  __local_status: "synced",
  __local_updated_at: null,
  __last_error: null,
};

const initialState: SyncStateStore = {
  byId: { global: initialRow },
  allIds: ["global"],
};

export const syncState$ = observable<SyncStateStore>(initialState);

legendPersist(syncState$, "sync_state");

export function selectSyncState(): SyncStateRow {
  const state = syncState$.get();
  return state.byId.global ?? initialRow;
}

export function updateSyncStateLocal(
  patch: Partial<Omit<SyncStateRow, "id">>
): SyncStateRow {
  let updated: SyncStateRow = initialRow;

  syncState$.set((state) => {
    const existing = state.byId.global ?? initialRow;
    const row: SyncStateRow = {
      ...existing,
      ...patch,
      // Sync state is purely local bookkeeping; always treat as "synced".
      __local_status: "synced",
      __local_updated_at: nowIso(),
    };

    updated = row;

    return {
      ...state,
      byId: { ...state.byId, global: row },
      allIds: state.allIds.length ? state.allIds : ["global"],
    };
  });

  return updated;
}

