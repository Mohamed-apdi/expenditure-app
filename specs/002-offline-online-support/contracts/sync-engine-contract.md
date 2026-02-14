# Contract: Sync Engine

**Feature**: 002-offline-online-support  
**Type**: Internal service contract

## Overview

Defines the behavior of the sync engine that coordinates local SQLite with Supabase via PowerSync.

---

## 1. Sync Engine API

**Location**: `lib/sync/syncEngine.ts` (or equivalent)

| Function | Input | Output | Behavior |
|----------|-------|--------|----------|
| `connect()` | — | `Promise<void>` | Initialize PowerSync, connect to Supabase, start sync. Resolves when connected. |
| `disconnect()` | — | `Promise<void>` | Stop sync, close connections. |
| `triggerSync()` | — | `Promise<void>` | Manually trigger a sync cycle (e.g., pull + push). Used after conflict resolution. |
| `getStatus()` | — | `SyncState` | Return current sync status. |

---

## 2. Connectivity Behavior

| Event | Action |
|-------|--------|
| App foreground + online | Connect and sync if signed in |
| App foreground + offline | Disconnect; local operations continue |
| Network: offline → online | Auto-connect and sync within 60s |
| Network: online → offline | Update status to `offline`; no data loss |
| Sign-in | Connect and begin sync |
| Sign-out | Disconnect; clear remote connection; local data persists per FR-014 |

---

## 3. Sync Timing

| Scenario | Requirement |
|----------|-------------|
| Connectivity restored | Sync starts within 60s (SC-002) |
| New local change while online | Sync triggered within 60s |
| During sync | App remains responsive; no blocking (SC-008) |

---

## 4. Error Handling

| Error | Behavior |
|-------|----------|
| Supabase unreachable | Retry with backoff; status = `error` |
| Auth expired | Pause uploads; keep local data; retry on re-auth |
| Conflict detected | Status = `conflict`; surface to conflict resolver |
| Local storage full | Log error; do not corrupt data |
