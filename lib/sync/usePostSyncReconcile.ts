/**
 * Post-sync reconciliation hook.
 *
 * Mounted once (e.g. in RootLayout), it listens for PowerSync status
 * transitions (syncing -> idle) and runs lightweight reconciliation:
 *
 * - Future: apply pending -> synced heuristic for rows that are no longer
 *   dirty and have no conflicts.
 * - Refresh sync-related counts (conflicts + pending uploads) via the
 *   existing useSyncState machinery.
 * - Clean up attachment_queue rows stuck in 'uploading' state for too long.
 *
 * Constraint: this hook MUST NOT perform any direct Supabase reads.
 */

import { useEffect, useRef } from "react";
import type { SyncState } from "./types";
import { useSyncStatus } from "../providers/SyncContext";
import { getPowerSyncDb } from "../powersync/client";

const STUCK_UPLOAD_MINUTES = 10;

function isSuccessfulIdle(sync: SyncState): boolean {
  // Adjust here if you ever change or extend the "success" states.
  return sync.status === "up-to-date" && !sync.errorMessage;
}

async function reconcileAfterSync(): Promise<void> {
  const db = getPowerSyncDb();
  if (!db) return;

  const now = new Date();
  const cutoff = new Date(now.getTime() - STUCK_UPLOAD_MINUTES * 60 * 1000).toISOString();

  // 1) Mark attachment_queue rows that have been "uploading" for too long as failed.
  await db.execute(
    `
    UPDATE attachment_queue
    SET status = 'failed',
        last_error = COALESCE(last_error, 'Upload stuck; will retry later'),
        retry_count = retry_count + 1,
        last_attempt_at = ?,
        updated_at = ?
    WHERE status = 'uploading'
      AND last_attempt_at IS NOT NULL
      AND last_attempt_at < ?
  `,
    [now.toISOString(), now.toISOString(), cutoff],
  );

  // 2) FUTURE: pending -> synced heuristic for rows that are no longer dirty:
  //
  // - Find rows with __local_status='pending'.
  // - Check that they are not present in any "pending changes" view and have
  //   no ConflictRecord.
  // - Only then mark __local_status='synced'.
  //
  // This logic is left intentionally unimplemented here to avoid guessing at
  // table-specific shapes; implement it alongside explicit metadata columns.
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

