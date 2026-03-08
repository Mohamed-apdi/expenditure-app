/**
 * Post-sync reconciliation hook.
 *
 * Mounted once (e.g. in RootLayout), it listens for sync status
 * transitions (syncing -> idle) and runs lightweight reconciliation.
 *
 * With Legend-State, most reconciliation is handled automatically.
 * This hook is kept for future extensibility.
 */

import { useEffect, useRef } from "react";
import type { SyncState } from "./types";
import { useSyncStatus } from "../providers/SyncContext";

function isSuccessfulIdle(sync: SyncState): boolean {
  return sync.status === "up-to-date" && !sync.errorMessage;
}

async function reconcileAfterSync(): Promise<void> {
  // With Legend-State, reconciliation is handled by the sync engine.
  // This function is kept as a placeholder for future extensibility.
  // 
  // Potential future uses:
  // - Process queued file uploads (receipts, profile images)
  // - Refresh local caches
  // - Update UI state
}

export function usePostSyncReconcile(): void {
  const sync = useSyncStatus();
  const prevStatus = useRef<SyncState["status"]>("offline");
  const running = useRef(false);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = sync.status;

    const becameIdleSuccessfully = prev === "syncing" && isSuccessfulIdle(sync);
    if (!becameIdleSuccessfully || running.current) return;

    running.current = true;
    void (async () => {
      try {
        await reconcileAfterSync();
      } finally {
        running.current = false;
      }
    })();
  }, [sync.status]);
}
