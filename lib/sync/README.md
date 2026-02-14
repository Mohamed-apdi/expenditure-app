# Sync Module (Offline/Online Support)

Implements local-first sync for specs/002-offline-online-support.

## Setup

1. **Install dependencies** (already in package.json):
   ```bash
   npm install
   ```

2. **Configure PowerSync** (optional for full sync):
   - Create a PowerSync backend connected to your Supabase project
   - Add `POWER_SYNC_URL` to EAS secrets and app.config.js extra
   - Run `npx expo prebuild` and `npx expo run:android` (or ios) — PowerSync requires a development build (not Expo Go)

3. **Without PowerSync**: The app runs in offline-only mode; sync engine reports "offline" status. Services continue using direct Supabase.

## Files

- `types.ts` — SyncState, SyncConflict, PendingChange types
- `changeQueue.ts` — Fallback queue for transient sync failures
- `conflictResolver.ts` — User-choice and delete-dominates resolution
- `syncEngine.ts` — connect, disconnect, triggerSync, getStatus
- `lib/database/localDb.ts` — PowerSync DB init
- `lib/database/schema/` — Local SQLite schema mirroring Supabase

## Usage

```ts
import { useSyncStatus } from "~/lib/providers/SyncContext";
import { SyncStatusIndicator } from "~/components/SyncStatusIndicator";

// In a component:
const status = useSyncStatus(); // { status, pendingCount, ... }
<SyncStatusIndicator />
```

## Next Steps (Tasks T011, T014–T020)

- Wire PowerSync Supabase connector and sync rules
- Create repository layer for local-first service reads/writes
- Refactor transactions, expenses, accounts, budgets to use local DB
