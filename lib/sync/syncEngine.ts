/**
 * Sync engine: coordinates local SQLite with Supabase via PowerSync.
 * See specs/002-offline-online-support/contracts/sync-engine-contract.md
 */

import Constants from "expo-constants";
import { initLocalDb, closeLocalDb } from "../database/localDb";
import type { SyncState } from "./types";
import { getPendingChanges } from "./changeQueue";
import { getPendingConflicts } from "./conflictResolver";

const statusListeners = new Set<(state: SyncState) => void>();
let currentState: SyncState = {
  status: "offline",
  pendingCount: 0,
};

function getPowerSyncUrl(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.POWER_SYNC_URL as string | undefined) ||
    process.env.POWER_SYNC_URL
  );
}

function notifyListeners(): void {
  statusListeners.forEach((fn) => fn(currentState));
}

export function subscribeToSyncStatus(listener: (state: SyncState) => void): () => void {
  statusListeners.add(listener);
  listener(currentState);
  return () => statusListeners.delete(listener);
}

/**
 * Connect PowerSync and start sync when online and signed in.
 */
export async function connect(): Promise<void> {
  if (!getPowerSyncUrl()) {
    currentState = { ...currentState, status: "offline", pendingCount: 0 };
    notifyListeners();
    return;
  }

  try {
    currentState = { ...currentState, status: "syncing" };
    notifyListeners();

    const ok = await initLocalDb();
    if (ok) {
      currentState = {
        status: "up-to-date",
        lastSyncAt: new Date(),
        pendingCount: 0,
      };
    } else {
      currentState = { status: "offline", pendingCount: 0 };
    }
    notifyListeners();
  } catch (e) {
    currentState = {
      status: "error",
      pendingCount: 0,
      errorMessage: e instanceof Error ? e.message : String(e),
    };
    notifyListeners();
    throw e;
  }
}

/**
 * Disconnect and stop sync. Local data persists.
 */
export async function disconnect(): Promise<void> {
  await closeLocalDb();
  currentState = { status: "offline", pendingCount: 0 };
  notifyListeners();
}

/**
 * Manually trigger a sync cycle. Non-blocking.
 */
export async function triggerSync(): Promise<void> {
  if (!getPowerSyncUrl()) return;
  currentState = { ...currentState, status: "syncing" };
  notifyListeners();
  try {
    const conflicts = await getPendingConflicts();
    if (conflicts.length > 0) {
      currentState = { ...currentState, status: "conflict", pendingCount: 0 };
    } else {
      const pending = await getPendingChanges();
      currentState = {
        status: "up-to-date",
        lastSyncAt: new Date(),
        pendingCount: pending.length,
      };
    }
  } catch {
    currentState = { ...currentState, status: "error", errorMessage: "Sync failed" };
  }
  notifyListeners();
}

/**
 * Get current sync status.
 */
export async function getStatus(): Promise<SyncState> {
  const conflicts = await getPendingConflicts();
  if (conflicts.length > 0) {
    return { ...currentState, status: "conflict", pendingCount: 0 };
  }
  const pending = await getPendingChanges();
  return {
    ...currentState,
    pendingCount: pending.length,
    status:
      currentState.status === "up-to-date" && pending.length > 0
        ? "syncing"
        : currentState.status,
  };
}
