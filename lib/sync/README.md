# Sync Module (Offline-First with Legend-State)

Implements local-first sync for specs/002-offline-online-support using **Legend-State** stores (persisted to SQLite) and a single sync layer to Supabase.

## Architecture

- **Stores** (`lib/stores/`): Normalized entity state (accounts, expenses, transactions, budgets, goals, subscriptions, transfers, personal_loans, etc.) with `byId` / `allIds`, persisted via `legendPersist` (SQLite).
- **Sync** (`lib/sync/legendSync.ts`): Pull from Supabase (incremental by cursor), push pending rows, conflict detection (modify-vs-modify → conflict record; delete wins), and resolution (keep local / use remote).
- **Offline gate**: `isOfflineGateLocked()` returns `true` when the device is offline (NetInfo). When locked, `triggerSync()` does not call Supabase. Use this guard for uploads (e.g. profile image) so they only run when online.
- **Sync status**: `lib/stores/syncStateStore.ts` holds `isOnline`, `isSyncing`, `lastSyncedAt`, `lastError`, `pendingCount`, `conflictsCount`. `SyncContext` derives UI state from this store and starts the sync loop on mount (`startSync()`).

## Usage

```ts
import { useSyncStatus } from "~/lib/providers/SyncContext";
import { SyncStatusIndicator } from "~/components/SyncStatusIndicator";
import { triggerSync, isOfflineGateLocked } from "~/lib";

// In a component:
const status = useSyncStatus(); // { status, pendingCount, conflictsCount, ... }
<SyncStatusIndicator />

// Before uploading attachments (e.g. profile image):
if (await isOfflineGateLocked()) {
  Alert.alert("Offline", "Please go online to upload.");
  return;
}
```

## Conflict resolution

- Conflicts are stored in `lib/stores/conflictsStore.ts`. The **Conflicts** screen (Settings → Resolve conflicts) lists them and offers **Keep mine** (re-queue local for push) or **Use server** (overwrite local with remote).
- Exported helpers: `resolveConflictKeepLocal(conflictId)`, `resolveConflictUseRemote(conflictId)`.

## Files

- `types.ts` — SyncState, SyncConflict, SyncableEntityType
- `legendSync.ts` — pull/push, conflict detection, `triggerSync`, `startSync`, `isOfflineGateLocked`, conflict resolution
- `lib/stores/syncStateStore.ts` — global sync state (online, syncing, errors, counts)
- `lib/stores/conflictsStore.ts` — conflict records and resolution
- `lib/providers/SyncContext.tsx` — provides sync state from Legend-State; starts sync on mount

## Guardrails

- Prefer reading/writing entity data through Legend-State stores and sync; avoid direct Supabase from UI for entities that are synced. Auth and storage are allowed in their designated modules (e.g. profile image upload after checking `isOfflineGateLocked()`).
