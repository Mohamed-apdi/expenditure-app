# Data Model: Total Offline and Online Support

**Feature**: 002-offline-online-support  
**Date**: 2025-02-14

## Overview

This document extends the existing data model with sync-specific entities. Core domain entities (Transaction, Expense, Account, Budget, etc.) remain unchanged; they are replicated locally and synced via PowerSync.

## New Sync Entities

### SyncState

Tracks the current sync status for the app.

| Field | Type | Description |
|-------|------|-------------|
| status | enum | `offline` \| `syncing` \| `up-to-date` \| `conflict` \| `error` |
| lastSyncAt | datetime? | Last successful full sync timestamp |
| pendingCount | number | Number of local changes pending upload |
| errorMessage | string? | Last error message if status is `error` |

**Validation**: status must be one of the enum values.  
**Persistence**: In-memory / React state; derived from PowerSync connection and conflict state.

---

### SyncConflict

Represents a single conflict requiring user resolution.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique conflict identifier |
| entityType | string | `transaction` \| `expense` \| `account` \| `budget` \| `category` \| etc. |
| entityId | string | ID of the conflicted record |
| localVersion | object | Local (on-device) version of the record |
| remoteVersion | object | Remote (cloud) version of the record |
| conflictType | enum | `modify_vs_modify` \| `delete_vs_modify` |
| detectedAt | datetime | When the conflict was detected |

**Validation**: entityType must match a known syncable entity.  
**Lifecycle**: Created when conflict detected; removed after user resolves.  
**Note**: For `delete_vs_modify`, delete wins automatically; user is informed. No resolution choice. Only `modify_vs_modify` presents "keep my version" / "use cloud version".

---

### PendingChange (Fallback Queue)

For changes that fail server-side and need retry. PowerSync handles the primary queue; this is a fallback for transient failures.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique change identifier |
| entityType | string | Same as SyncConflict |
| entityId | string | Record ID |
| operation | enum | `insert` \| `update` \| `delete` |
| payload | object | Serialized record or partial update |
| createdAt | datetime | When the change was queued |
| retryCount | number | Number of retry attempts |
| lastError | string? | Last failure message |

**Validation**: operation must be insert/update/delete.  
**Lifecycle**: Removed after successful sync or after max retries (e.g., 10).

---

## Existing Entities (Sync-Relevant Attributes)

All entities below already exist in Supabase. For local-first sync, each needs:

- **id**: UUID, client-generated for inserts (to allow offline creation)
- **created_at**, **updated_at**: Used for conflict detection and ordering
- **user_id**: Scopes data per user; null/device-scoped before sign-in

### Synced Tables

| Table | Key Fields | Conflict Scope |
|-------|------------|----------------|
| transactions | id, user_id, account_id, amount, date, created_at, updated_at | Row-level |
| expenses | id, user_id, account_id, amount, category, date, created_at, updated_at | Row-level |
| accounts | id, user_id, amount, name, created_at, updated_at | Row-level |
| budgets | id, user_id, account_id, category, amount, period, created_at, updated_at | Row-level |
| goals | id, user_id, account_id, target_amount, current_amount, created_at, updated_at | Row-level |
| subscriptions | id, user_id, account_id, amount, created_at, updated_at | Row-level |
| transfers | id, user_id, from_account_id, to_account_id, amount, created_at, updated_at | Row-level |
| personal_loans | id, user_id, account_id, remaining_amount, created_at, updated_at | Row-level |
| account_groups | id, user_id, name, created_at, updated_at | Row-level |
| account_types | id, name, created_at, updated_at | Row-level (shared) |
| profiles | id (user_id), full_name, email, created_at, updated_at | Row-level |

### Categories

If categories are stored in a table, include in sync. If derived from config/enum, no sync needed.

---

## State Transitions

### SyncState

```text
offline --> syncing (connectivity restored)
syncing --> up-to-date (sync complete, no conflicts)
syncing --> conflict (conflict detected)
syncing --> error (sync failed)
up-to-date --> syncing (new local changes or remote changes)
up-to-date --> offline (connectivity lost)
conflict --> up-to-date (user resolved all conflicts)
error --> syncing (retry triggered)
```

### SyncConflict

```text
[detected] --> pending (awaiting user choice)
pending --> resolved_keep_local (user chose "keep my version")
pending --> resolved_use_remote (user chose "use cloud version")
resolved_* --> [removed]
```

---

## Identity and Uniqueness

- **Client-generated IDs**: Use UUID v4 for new records created offline. Ensures global uniqueness before sync.
- **PowerSync**: Uses `id` as primary key; Supabase tables already use UUID primary keys.
- **Conflict detection**: Compare `updated_at` or use PowerSync’s built-in conflict metadata (e.g., last-writer-wins hints) to detect modify-vs-modify.
