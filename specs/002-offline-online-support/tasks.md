# Tasks: Total Offline and Online Support

**Input**: Design documents from `/specs/002-offline-online-support/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per constitution III (Test-First Development). TDD: tests written → fail → implement.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure PowerSync/Supabase integration

- [x] T001 Install PowerSync and SQLite: added to package.json; run `npm install`
- [x] T002 [P] Install NetInfo for connectivity detection: added to package.json
- [x] T003 Add PowerSync URL/endpoint to app config (app.config.js extra.POWER_SYNC_URL)
- [x] T004 [P] Create directory structure: `lib/sync/`, `lib/database/schema/` at repo root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core sync infrastructure that MUST be complete before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Create `lib/sync/types.ts` with SyncState, SyncConflict, PendingChange types per data-model.md
- [x] T006 Create PowerSync schema in `lib/database/schema/` mirroring Supabase tables (transactions, expenses, accounts, budgets, goals, subscriptions, transfers, personal_loans, account_groups, account_types, profiles)
- [x] T007 Create `lib/database/localDb.ts` with PowerSync DB initialization and table definitions
- [x] T008 Implement `lib/sync/changeQueue.ts` with fallback queue, exponential backoff retry, and max 10 retries per PendingChange
- [x] T009 Implement `lib/sync/syncEngine.ts` with connect(), disconnect(), triggerSync(), getStatus() per sync-engine-contract.md
- [x] T010 Implement `lib/sync/conflictResolver.ts` with resolveConflict(), getPendingConflicts(), delete-dominates logic per conflict-resolution-contract.md
- [ ] T011 Wire sync engine to PowerSync Supabase connector; configure sync rules per user_id (match RLS) — requires PowerSync backend

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - Core Tracking Works Offline (Priority: P1) 🎯 MVP

**Goal**: Users can add, edit, delete transactions, budgets, categories and view dashboards while offline; all changes persist locally.

**Independent Test**: Enable airplane mode, perform CRUD on transactions/budgets/categories, view Dashboard; verify changes persist and display.

### Tests for User Story 1 (TDD)

- [x] T012 [P] [US1] Add unit test for conflict resolver delete-dominates in `lib/sync/__tests__/conflictResolver.test.ts`
- [x] T013 [P] [US1] Add unit test for sync state transitions in `lib/sync/__tests__/syncStatus.test.ts`

### Implementation for User Story 1

- [ ] T014 [US1] Create repository abstraction in `lib/sync/repository.ts` that writes to local DB first and enqueues for sync (used by services)
- [ ] T015 [US1] Refactor `lib/services/transactions.ts` to use local-first repository; read from PowerSync, write to local DB
- [ ] T016 [US1] Refactor `lib/services/expenses.ts` to use local-first repository
- [ ] T017 [US1] Refactor `lib/services/accounts.ts` to use local-first repository
- [ ] T018 [US1] Refactor `lib/services/budgets.ts` to use local-first repository
- [ ] T019 [US1] Update `lib/hooks/useDashboardData.ts` to read from PowerSync local DB instead of Supabase
- [ ] T020 [US1] Update `app/(main)/Dashboard.tsx` to work offline using local data (no network-dependent calls for core data)

**Checkpoint**: User Story 1 functional — core tracking works offline

---

## Phase 4: User Story 2 - Automatic Sync When Online (Priority: P1)

**Goal**: When connectivity returns, offline changes sync automatically within 60s; sync runs in background without blocking UI.

**Independent Test**: Make changes offline, restore connectivity; verify changes appear in cloud within 60s without user action; app stays responsive during sync.

### Implementation for User Story 2

- [ ] T021 [US2] Wire NetInfo to sync engine in `lib/sync/syncEngine.ts`; connect when online, disconnect when offline
- [ ] T022 [US2] Implement auto-sync trigger on connectivity restore (within 60s) in `lib/sync/syncEngine.ts`
- [ ] T023 [US2] Ensure sync runs in background; verify `triggerSync()` does not block main thread (async/queue)
- [ ] T024 [US2] Wire sync engine connect on app foreground when user is signed in; disconnect on sign-out (scope to current device per FR-014)

**Checkpoint**: User Story 2 functional — automatic sync when online

---

## Phase 5: User Story 3 - Sync Status Visibility (Priority: P2)

**Goal**: Users see sync status (offline, syncing, up-to-date, conflict) and can resolve conflicts with "keep my version" / "use cloud version".

**Independent Test**: Change status (airplane mode, reconnect); verify indicator updates within 2s; simulate conflict, verify notification and resolution UI.

### Implementation for User Story 3

- [x] T025 [P] [US3] Create `lib/providers/SyncContext.tsx` with useSyncStatus() hook combining PowerSync status and NetInfo per sync-status-contract.md
- [x] T026 [US3] Create `app/components/SyncStatusIndicator.tsx` showing offline/syncing/up-to-date/conflict/error states
- [x] T027 [US3] Add SyncProvider to root layout; SyncStatusIndicator ready for use in screens (e.g. Settings)
- [ ] T028 [US3] Create conflict resolution modal/screen with "keep my version" and "use cloud version" buttons; wire to conflictResolver.resolveConflict()
- [ ] T029 [US3] Show conflict notification when getPendingConflicts().length > 0; open resolution modal on tap
- [ ] T030 [US3] Show brief message when delete-dominates applied: "A record you deleted was modified on another device. Your delete was kept."

**Checkpoint**: User Story 3 functional — sync status visible, conflicts resolvable

---

## Phase 6: User Story 4 - Full Feature Parity Offline and Online (Priority: P2)

**Goal**: All features (transactions, budgets, categories, dashboards, reports, export) work identically offline and online.

**Independent Test**: Enable airplane mode; use transactions, budgets, categories, dashboards, reports, export; verify all work as when online.

### Implementation for User Story 4

- [ ] T031 [US4] Refactor `lib/services/goals.ts` to use local-first repository
- [ ] T032 [US4] Refactor `lib/services/subscriptions.ts` to use local-first repository
- [ ] T033 [US4] Refactor `lib/services/transfers.ts` to use local-first repository
- [ ] T034 [US4] Refactor `lib/services/loans.ts` to use local-first repository (personal_loans, loan_repayments)
- [ ] T035 [US4] Update `lib/services/analytics.ts` to read from PowerSync local DB
- [ ] T036 [US4] Update `lib/services/localReports.ts` to read from PowerSync local DB for reports
- [ ] T037 [US4] Ensure export (CSV/PDF) in `app/(main)/ReportsScreen.tsx` or export flow uses local data only when offline
- [ ] T038 [US4] Update `app/(main)/ReportsScreen.tsx` to read from local DB; remove direct Supabase dependency for report data

**Checkpoint**: User Story 4 functional — full feature parity offline

---

## Phase 7: User Story 5 - First Launch and New Device Setup Offline (Priority: P3)

**Goal**: New users can install, onboard, and add transactions offline; on sign-in, data attaches to user and syncs.

**Independent Test**: Install app offline, complete onboarding, add transactions; go online and sign in; verify data syncs to cloud.

### Implementation for User Story 5

- [ ] T039 [US5] Allow onboarding flow to complete without network in `app/(onboarding)/` (skip network checks, allow local-only state)
- [ ] T040 [US5] Support records with null/device-scoped user_id in local schema and PowerSync sync rules
- [ ] T041 [US5] Implement attach-on-sign-in: on first sign-in, batch-update user_id for all local records and trigger sync in `lib/sync/syncEngine.ts` or auth flow
- [ ] T042 [US5] Update AuthGateScreen or auth callback to call attach-on-sign-in when user authenticates for first time with existing local data

**Checkpoint**: User Story 5 functional — first launch offline, attach on sign-in

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Tests, observability, and validation

- [ ] T043 [P] Add integration test: offline CRUD → go online → verify sync in `lib/sync/__tests__/sync.integration.test.ts`
- [ ] T044 [P] Add integration test: conflict simulation and resolution in `lib/sync/__tests__/conflict.integration.test.ts`
- [ ] T045 Add structured logging for sync events (connect, disconnect, sync complete, conflict, error) in `lib/sync/syncEngine.ts`
- [ ] T046 Run quickstart.md manual verification checklist (add transaction offline, reconnect, conflict resolution, delete-dominates)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — MVP
- **Phase 4 (US2)**: Depends on Phase 2 — Can run in parallel with US1 after Phase 2
- **Phase 5 (US3)**: Depends on Phase 2, 4 (needs sync engine + status) — After US2
- **Phase 6 (US4)**: Depends on Phase 3 (extends service refactor) — After US1
- **Phase 7 (US5)**: Depends on Phase 2, 3 — After US1
- **Phase 8 (Polish)**: Depends on Phases 3–7

### User Story Dependencies

- **US1 (P1)**: After Foundational — No dependency on other stories
- **US2 (P1)**: After Foundational — No dependency on US1 (sync engine is foundational)
- **US3 (P2)**: After US2 (needs sync status from engine)
- **US4 (P2)**: After US1 (extends service layer)
- **US5 (P3)**: After US1 (needs local-first services and attach logic)

### Parallel Opportunities

- T002, T004 can run in parallel with T001, T003
- T005, T006 can run in parallel within Phase 2
- T012, T013 (tests) can run in parallel
- T025 can run in parallel with other US3 tasks that don’t depend on it
- T031–T034 (service refactors) can run in parallel within US4
- T043, T044 (integration tests) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Tests first (TDD):
Task T012: "Add unit test for conflict resolver in lib/sync/__tests__/conflictResolver.test.ts"
Task T013: "Add unit test for sync state transitions in lib/sync/__tests__/syncStatus.test.ts"

# Service refactors (after T014 repository):
Task T015: "Refactor lib/services/transactions.ts"
Task T016: "Refactor lib/services/expenses.ts"
Task T017: "Refactor lib/services/accounts.ts"
Task T018: "Refactor lib/services/budgets.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (core offline)
4. Complete Phase 4: User Story 2 (auto sync)
5. **STOP and VALIDATE**: Test offline CRUD + sync independently
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Core tracking offline → Test → MVP
3. US2 → Auto sync → Test → Full P1
4. US3 → Sync status + conflict UI → Test
5. US4 → Full feature parity → Test
6. US5 → First launch offline → Test
7. Polish → Tests, logging, quickstart validation

### Format Validation

- ✅ All tasks use `- [ ]` checkbox
- ✅ All tasks have Task ID (T001–T046)
- ✅ [P] marker on parallelizable tasks
- ✅ [USn] label on user story tasks
- ✅ All tasks include file path or concrete action
