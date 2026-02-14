# Contract: Sync Status

**Feature**: 002-offline-online-support  
**Type**: Internal state / UI contract

## Overview

Defines the sync status states and how they are exposed to the UI for FR-005 and SC-006.

---

## 1. Sync Status States

| Status | Meaning | UI Indicator |
|--------|---------|--------------|
| `offline` | No network or not connected | "Offline" icon/label |
| `syncing` | Connected; uploading or downloading | "Syncing..." / spinner |
| `up-to-date` | Connected; no pending changes; no conflicts | "Synced" / checkmark (or hide) |
| `conflict` | One or more conflicts need resolution | "Conflict" / warning icon |
| `error` | Sync failed; will retry | "Sync error" / error icon |

---

## 2. SyncStatus API

**Location**: `lib/providers/SyncContext.tsx` (or `lib/sync/syncStatus.ts`)

| Export | Type | Description |
|--------|------|-------------|
| `useSyncStatus()` | `() => SyncState` | Hook returning current sync state |
| `SyncStatusIndicator` | Component | Renders status in header/settings |

---

## 3. Update Latency

| Requirement | Target |
|-------------|--------|
| Status change visibility | Within 2 seconds (SC-006) |
| Source | PowerSync connection events + NetInfo |

---

## 4. Placement

- Sync status indicator: Header, settings screen, or persistent footer
- Non-intrusive: Small icon; expandable for details
- Conflict: Prominent when conflicts exist; modal or banner for resolution
