# Quickstart: Total Offline and Online Support

**Feature**: 002-offline-online-support  
**Date**: 2025-02-14

## Summary

Implement local-first architecture so the app works fully offline and syncs automatically when online. Uses PowerSync for sync, local SQLite for storage, and user-choice conflict resolution for modify-vs-modify conflicts.

---

## Prerequisites

- Expo project with Continuous Native Generation (CNG) enabled (`expo prebuild` workflow)
- Supabase project with existing tables (accounts, transactions, expenses, budgets, goals, etc.)
- PowerSync account (or self-hosted PowerSync) connected to Supabase

---

## Implementation Checklist

### Phase 0: Setup

- [ ] 1. **Install PowerSync**
   ```bash
   npx expo install @powersync/react-native @journeyapps/react-native-quick-sqlite
   ```

- [ ] 2. **Install NetInfo** (connectivity detection)
   ```bash
   npx expo install @react-native-community/netinfo
   ```

- [ ] 3. **Configure PowerSync**
   - Create PowerSync backend connected to Supabase
   - Define sync rules per user (match RLS policies)
   - Add PowerSync URL/endpoint to app config

### Phase 1: Local Database and Sync Engine

- [ ] 4. **Create local schema** (`lib/database/schema/`)
   - Define local tables mirroring Supabase (transactions, expenses, accounts, budgets, goals, subscriptions, transfers, personal_loans, account_groups, account_types, profiles)
   - Use client-generated UUIDs for new records

- [ ] 5. **Implement sync engine** (`lib/sync/syncEngine.ts`)
   - Connect PowerSync; wire to Supabase
   - Handle connect/disconnect on app foreground and network changes
   - Expose `getStatus()` for SyncState

- [ ] 6. **Implement change queue / fallback** (`lib/sync/changeQueue.ts`)
   - Fallback queue for transient failures
   - Retry with exponential backoff

### Phase 2: Conflict Resolution

- [ ] 7. **Implement conflict resolver** (`lib/sync/conflictResolver.ts`)
   - Detect modify-vs-modify and delete-vs-modify
   - Apply delete-dominates automatically
   - Expose `resolveConflict(conflictId, choice)` and `getPendingConflicts()`

- [ ] 8. **Conflict resolution UI**
   - Modal or screen for "keep my version" / "use cloud version"
   - Notification when conflicts exist
   - Message when delete-dominates applied

### Phase 3: Service Layer Refactor

- [ ] 9. **Introduce repository layer**
   - Read from local DB (PowerSync)
   - Write to local DB first; PowerSync handles upload
   - Keep existing service signatures where possible

- [ ] 10. **Update services**
   - `transactions.ts`, `expenses.ts`, `accounts.ts`, `budgets.ts`, `goals.ts`, etc.
   - Replace direct Supabase calls with local-first + sync

### Phase 4: Sync Status and UX

- [ ] 11. **SyncContext** (`lib/providers/SyncContext.tsx`)
   - `useSyncStatus()` hook
   - Combine PowerSync status + NetInfo

- [ ] 12. **SyncStatusIndicator** component
   - Show offline / syncing / up-to-date / conflict / error
   - Place in header or settings

- [ ] 13. **First launch offline**
   - Allow onboarding and data entry without sign-in
   - On sign-in: attach local data to user, begin sync

### Phase 5: Tests and Verification

- [ ] 14. **Unit tests**
   - Conflict resolution (delete dominates, user choice)
   - Sync state transitions

- [ ] 15. **Integration tests**
   - Offline CRUD → go online → verify sync
   - Conflict simulation and resolution

- [ ] 16. **Manual verification**
   - Add transaction offline → reconnect → see in cloud
   - Edit same record on two devices → resolve conflict
   - Delete on one device, edit on other → delete wins

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `lib/sync/syncEngine.ts` | Create |
| `lib/sync/changeQueue.ts` | Create |
| `lib/sync/conflictResolver.ts` | Create |
| `lib/sync/syncStatus.ts` | Create |
| `lib/sync/types.ts` | Create |
| `lib/database/localDb.ts` | Create |
| `lib/database/schema/*` | Create |
| `lib/providers/SyncContext.tsx` | Create |
| `lib/services/*.ts` | Refactor to local-first |
| `app/components/SyncStatusIndicator.tsx` | Create |
| `app/(main)/*` | Consume SyncContext |

---

## Key Contracts

- [sync-engine-contract.md](./contracts/sync-engine-contract.md)
- [conflict-resolution-contract.md](./contracts/conflict-resolution-contract.md)
- [sync-status-contract.md](./contracts/sync-status-contract.md)

---

## Rollback

If critical issues arise: revert service layer to direct Supabase calls; PowerSync/sync layer can be disabled. Local DB will retain data; re-enable sync when ready.
