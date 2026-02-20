/**
 * Sync status context: reads from Legend-State sync state (syncStateStore).
 * Starts Legend-State sync loop (startSync) on mount; status reflects isOnline, isSyncing, conflicts, errors.
 * See specs/002-offline-online-support/contracts/sync-status-contract.md
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import type { SyncState } from "../sync/types";
import { syncState$, selectSyncState } from "../stores/syncStateStore";
import { startSync } from "../sync/legendSync";

const SyncContext = createContext<SyncState>({
  status: "offline",
  pendingCount: 0,
});

export function useSyncStatus(): SyncState {
  return useContext(SyncContext);
}

function deriveSyncState(row: ReturnType<typeof selectSyncState>): SyncState {
  const status: SyncState["status"] = !row.isOnline
    ? "offline"
    : row.isSyncing
      ? "syncing"
      : row.conflictsCount > 0
        ? "conflict"
        : row.lastError
          ? "error"
          : "up-to-date";
  return {
    status,
    lastSyncAt: row.lastSyncedAt ? new Date(row.lastSyncedAt) : undefined,
    pendingCount: row.pendingCount,
    errorMessage: row.lastError ?? undefined,
    conflictsCount: row.conflictsCount,
  };
}

interface SyncProviderProps {
  children: React.ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps): React.ReactElement {
  const [state, setState] = useState<SyncState>(() =>
    deriveSyncState(selectSyncState())
  );

  useEffect(() => {
    const unsub = syncState$.onChange(() => {
      setState(deriveSyncState(selectSyncState()));
    });
    startSync();
    return () => {
      unsub();
    };
  }, []);

  return <SyncContext.Provider value={state}>{children}</SyncContext.Provider>;
}
