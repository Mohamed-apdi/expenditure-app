# Offline-First Rules (Qoondeeye)

This project is **offline-first** and uses **PowerSync**. These rules are **non-negotiable**.

## Source of truth
- **All screens read from local PowerSync SQLite**.
- The network is an enhancement (background sync), not a dependency.

## Forbidden: direct Supabase reads from screens
- Screens/components/services must **not** call Supabase directly for reading data.
- Network calls are allowed only in:
  - `lib/auth/**` (Auth)
  - `storage/**` (Storage uploads)
  - `lib/signedUrls/**` (signed URL refresh)

ESLint enforces this with restricted imports.

## Local-first writes
- All CRUD is **local-first** via repositories writing to SQLite.
- Writes must never block on network.

### Local status columns
Every syncable row uses local metadata:
- `__local_status`: `pending | failed | conflict | synced | deleted`
- `__local_updated_at`
- `__last_error` (row-sync failures only)

On any user mutation:
- set `__local_status = 'pending'`
- set `__local_updated_at = now`
- clear `__last_error`

## Status UI must never lie
- Lists and detail screens must derive state from row metadata only:
  - badge precedence: `conflict > failed > pending > synced`
- Never infer row status from `isOnline` or `isSyncing`.

## Conflicts (finance safety)
- **No silent overwrites** for finance entities.
- Modify-vs-modify conflicts must be recorded and resolved via **Conflict Center**.
- Conflict rows:
  - set `__local_status = 'conflict'`
  - show “Resolve conflict” CTA (edit disabled until resolved)
- Delete-vs-modify rule: **delete wins + inform user**.

## Attachments are queue-owned (not row-owned)
PowerSync syncs rows; it does not upload files.

Receipts/profile images:
- Offline capture is allowed:
  - store file locally
  - enqueue an item in `attachment_queue` (SQLite)
- Upload is processed only when:
  - online AND session is valid AND offline gate is not locked
- Attachment failure is reflected in queue state:
  - queue row `status='failed'` shows “Receipt Failed”
  - DO NOT set the parent entity `__local_status='failed'` just for attachment issues

Signed URLs:
- Treat signed URLs as ephemeral (online best-effort).
- Offline viewing must prefer local files.

## Offline security gate (session expired offline)
If the Supabase session is expired and the device is offline:
- show Locked state
- require biometric/PIN unlock before showing cached data
- upload workers must not run while locked

## One place for post-sync reconciliation
Only one global hook runs post-sync tasks:
- stuck upload cleanup (`uploading` too long → `failed`)
- (future) pending → synced heuristic
- sync-state count refresh

Screens must not implement their own sync cleanup logic.

## Release QA (must pass on iOS + Android)
1) First-time install offline: “needs initial login online”
2) Normal offline: dashboard loads, offline expense → Pending, survives restart
3) Session expired offline: Locked → biometric/PIN unlock works
4) Receipt queue: offline capture → local view; online → single upload + receipt_url
5) Two-device conflict: conflict detected, no silent overwrite, resolution works

