# Contract: Conflict Resolution

**Feature**: 002-offline-online-support  
**Type**: Internal service / UI behavior contract

## Overview

Defines how sync conflicts are detected and resolved per spec clarifications: user choice for modify-vs-modify; delete dominates over modify.

---

## 1. Conflict Types

| Type | Local | Remote | Resolution |
|------|-------|--------|------------|
| `modify_vs_modify` | Modified | Modified | User chooses "keep my version" or "use cloud version" |
| `delete_vs_modify` | Deleted | Modified | Delete wins; discard remote; inform user |

---

## 2. Conflict Resolution API

**Location**: `lib/sync/conflictResolver.ts`

| Function | Input | Output | Behavior |
|----------|-------|--------|----------|
| `resolveConflict(conflictId, choice)` | `conflictId: string`, `choice: 'keep_local' \| 'use_remote'` | `Promise<void>` | Apply user choice; update local and/or remote; remove conflict |
| `getPendingConflicts()` | — | `SyncConflict[]` | Return all unresolved conflicts |
| `onDeleteVsModify(conflict)` | `conflict: SyncConflict` | — | Apply delete; discard remote; notify user |

---

## 3. User-Facing Resolution Flow

| Step | Behavior |
|------|----------|
| Conflict detected | Add to pending conflicts; set sync status = `conflict` |
| User opens app/screen | Show conflict notification (modal or banner) |
| User taps conflict | Show resolution UI with "keep my version" / "use cloud version" |
| User selects | Call `resolveConflict`; update state; trigger sync |
| All resolved | Clear conflict status; set status = `up-to-date` |

---

## 4. Delete-Dominates Implementation

When PowerSync or sync layer detects: local = delete, remote = modify:

1. Apply delete (record removed locally and remotely).
2. Discard remote modifications.
3. Show user a brief message: "A record you deleted was modified on another device. Your delete was kept."
