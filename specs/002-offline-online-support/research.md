# Research: Total Offline and Online Support

**Feature**: 002-offline-online-support  
**Date**: 2025-02-14

## 1. Sync Engine Choice: PowerSync vs WatermelonDB

### Decision: PowerSync

PowerSync is chosen as the sync layer for React Native + Expo + Supabase.

### Rationale

- **Supabase integration**: PowerSync has official Supabase connector and sync rules; minimal custom glue.
- **Conflict resolution**: Built-in support for detecting conflicts; we layer user-choice resolution on top.
- **Local SQLite**: Uses SQLite via `@journeyapps/react-native-quick-sqlite`; compatible with Expo CNG.
- **Background sync**: Handles connectivity changes, retries, and queuing without custom networking.
- **Maturity**: Production-focused; used in finance and productivity apps.

### Alternatives Considered

| Alternative | Pros | Cons |
|-------------|------|------|
| WatermelonDB + custom sync | Flexible, React Native–optimized | Custom sync logic, conflict handling, and Supabase adapter required |
| AsyncStorage + REST queue | Simple, no new deps | No SQL, no partial sync, poor for large datasets |
| Supabase Realtime only | Minimal changes | Requires connectivity; not offline-first |

### Implementation Notes

- PowerSync requires Expo with Continuous Native Generation (CNG); verify project uses `expo prebuild`.
- Sync rules define which tables and rows sync per user; map to existing RLS policies.
- For delete-dominates and user-choice conflict behavior, use PowerSync’s conflict callbacks and our resolution logic.

---

## 2. Change Queue and Retry Strategy

### Decision: PowerSync Built-in + Local Fallback Queue

PowerSync handles the primary change queue. A small local fallback queue stores mutations that fail server-side (e.g., auth expired, server down) for retry after reconnect or re-auth.

### Rationale

- PowerSync already queues local changes and uploads when online.
- Fallback queue covers edge cases (transient 4xx/5xx) without duplicating PowerSync’s core logic.
- Retries use exponential backoff (e.g., 5s, 15s, 45s) with a cap to avoid battery drain.

### Alternatives Considered

- **PowerSync only**: Sufficient for most cases; fallback queue adds resilience for auth/transient errors.
- **Custom queue only**: Rejects PowerSync’s built-in sync; more work for little gain.

---

## 3. Conflict Resolution Implementation

### Decision: User Choice per Conflict + Delete Dominates

- **Modify vs modify**: Present "keep my version" / "use cloud version" per conflict.
- **Delete vs modify**: Delete wins; discard remote modifications and inform user.

### Rationale

- Aligns with spec clarifications.
- PowerSync conflict handlers can detect conflicts; we surface them in UI and apply user choice.
- Delete-dominates implemented in sync layer before presenting conflicts; user sees only modify-vs-modify choices.

### Implementation Notes

- Conflict metadata: record id, entity type, local version, remote version.
- Conflict UI: modal or inline prompt with diff preview if feasible; otherwise simple "keep mine" / "use theirs" buttons.
- After resolution, update local and/or remote via PowerSync APIs to converge state.

---

## 4. Sync Status and Connectivity Detection

### Decision: PowerSync Connection Status + NetInfo

- Use PowerSync’s connection status for sync state (connected, syncing, disconnected).
- Use `@react-native-community/netinfo` for connectivity presence (online/offline).
- Combine: offline = no network; syncing = connected and uploading/downloading; up-to-date = connected and idle; conflict = conflicts pending resolution.

### Rationale

- PowerSync provides sync-level status; NetInfo provides network-level status.
- Together they support FR-005 and SC-006 (status visible, &lt;2s delay).
- Avoids custom polling; both sources emit events.

---

## 5. First Launch and Anonymous Data

### Decision: Local-First Without Auth

- New users can create data locally without signing in.
- Local data lives in device SQLite; no user_id until sign-in.
- On first sign-in, attach local records to the new user and begin sync.

### Rationale

- Matches spec: first-time setup and initial data entry without internet.
- PowerSync sync rules can scope by user_id; pre-auth data uses a temporary device-scoped identifier, then migrates on sign-in.
- Implementation: generate client-side UUIDs for records; on sign-in, batch-update user_id and push to PowerSync.

### Alternatives Considered

- **Require sign-in first**: Contradicts spec for offline-first onboarding.
- **Separate "anonymous" and "synced" DBs**: Adds complexity; single DB with migration on sign-in is simpler.
