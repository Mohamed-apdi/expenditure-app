# Implementation Plan: Total Offline and Online Support

**Branch**: `002-offline-online-support` | **Date**: 2025-02-14 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-offline-online-support/spec.md`

## Summary

Implement local-first architecture so the expenditure app works fully offline and syncs automatically when online. Users can add, edit, and delete transactions, budgets, categories, and view dashboards without connectivity. For signed-in users, cloud sync is always on; conflict resolution lets users choose "keep my version" or "use cloud version" per conflict. Delete operations dominate over modifications.

**Technical approach**: Introduce a sync layer (PowerSync or WatermelonDB + custom sync) between local SQLite and Supabase. All reads/writes go through local storage; a background sync engine uploads changes when online and pulls remote changes. Add sync status UI and conflict resolution flows.

## Technical Context

**Language/Version**: TypeScript 5.8  
**Primary Dependencies**: React Native 0.79.6, Expo 53, Supabase 2.50.2, @powersync/react-native (or WatermelonDB + custom sync)  
**Storage**: Supabase PostgreSQL (remote), local SQLite via PowerSync or WatermelonDB  
**Testing**: Jest or Vitest (add per constitution TDD); integration tests for sync flows  
**Target Platform**: iOS, Android, Web (React Native + Expo)  
**Project Type**: Mobile application with shared lib/  
**Performance Goals**: Initial screen load <2s; sync within 60s of connectivity; no blocking during sync  
**Constraints**: Type safety (strict TypeScript), offline-capable per constitution VI  
**Scale/Scope**: Single-user personal finance; ~10 tables; typical user 1k–10k transactions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Type Safety** | ✅ Pass | All sync entities, queue items, and status types will be strictly typed |
| **II. Mobile-First** | ✅ Pass | Offline-first improves mobile UX; sync status and conflict UI mobile-optimized |
| **III. Test-First** | ⚠️ Action | Add unit tests for sync logic, conflict resolution; integration tests for offline CRUD and sync |
| **IV. Data Security & Privacy** | ✅ Pass | Local data encrypted per device; Supabase Auth and RLS unchanged; sync over TLS |
| **V. Cross-Platform** | ✅ Pass | Local-first and sync work across iOS, Android, Web |
| **VI. Performance & Offline** | ✅ Pass | Core feature—aligns with constitution; local DB for instant reads |
| **VII. Observability** | ✅ Pass | Sync events, conflicts, and failures logged with structured context |

**Gate result**: Pass. Test-first requires adding tests for new sync and conflict logic.

## Project Structure

### Documentation (this feature)

```text
specs/002-offline-online-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created here)
```

### Source Code (repository root)

```text
lib/
├── sync/
│   ├── syncEngine.ts        # Sync orchestration (connect, disconnect, retry)
│   ├── changeQueue.ts       # Pending changes for upload
│   ├── conflictResolver.ts  # Conflict detection and user-choice resolution
│   ├── syncStatus.ts        # Sync state (offline, syncing, up-to-date, conflict, error)
│   └── types.ts             # Sync-specific types
├── database/
│   ├── supabase.ts          # Existing
│   ├── localDb.ts           # Local SQLite (PowerSync/WatermelonDB)
│   └── schema/              # Local schema definitions
├── services/                # Existing services refactored to use local-first layer
│   ├── transactions.ts
│   ├── expenses.ts
│   ├── accounts.ts
│   ├── budgets.ts
│   ├── goals.ts
│   └── ...
└── providers/
    └── SyncContext.tsx      # Sync status, connectivity, conflict notifications

app/
├── (main)/Dashboard.tsx     # Consume SyncContext for status
├── components/
│   └── SyncStatusIndicator.tsx
└── ... (conflict resolution modal/screen)
```

**Structure Decision**: Add `lib/sync/` for sync engine, queue, and conflict logic. Introduce `lib/database/localDb.ts` for local SQLite access. Wrap existing services with a repository layer that writes to local DB first, then queues for sync. SyncContext provides global sync status for UI.

## Complexity Tracking

*No constitution violations requiring justification.*
