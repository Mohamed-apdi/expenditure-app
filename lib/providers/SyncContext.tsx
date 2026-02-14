/**
 * Sync status context: combines PowerSync status with NetInfo for connectivity.
 * See specs/002-offline-online-support/contracts/sync-status-contract.md
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import type { SyncState } from "../sync/types";
import { subscribeToSyncStatus, getStatus } from "../sync/syncEngine";

const SyncContext = createContext<SyncState>({
  status: "offline",
  pendingCount: 0,
});

export function useSyncStatus(): SyncState {
  return useContext(SyncContext);
}

interface SyncProviderProps {
  children: React.ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps): React.ReactElement {
  const [state, setState] = useState<SyncState>({
    status: "offline",
    pendingCount: 0,
  });

  useEffect(() => {
    const unsub = subscribeToSyncStatus(setState);
    getStatus().then(setState);
    return unsub;
  }, []);

  return <SyncContext.Provider value={state}>{children}</SyncContext.Provider>;
}
