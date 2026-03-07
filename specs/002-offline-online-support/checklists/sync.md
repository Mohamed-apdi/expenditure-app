# Sync Requirements Quality Checklist: Total Offline and Online Support

**Purpose**: Validate the clarity, completeness, and consistency of offline-first sync requirements (PowerSync, conflicts, attachment queues, and auth) before further implementation.
**Created**: 2025-02-17
**Feature**: [spec.md](../spec.md)

## Sync Rules & RLS Alignment

- [ ] CHK001 Are sync rules explicitly defined so that only rows with `user_id = current user` are synced for all user-scoped tables? [Coverage, Spec §Key Entities / Non-Negotiable Laws]
- [ ] CHK002 Does the spec clearly require that the `profiles` table is filtered by `id = current user` for sync? [Coverage, Spec §Key Entities]
- [ ] CHK003 Is it clear that sync rules must mirror backend RLS policies (no possibility of other users’ data being synced)? [Consistency, Spec §Non-Negotiable Offline Laws]

## Versioning, Soft Delete & Conflict Detection

- [ ] CHK004 Are `updated_at` and (optionally) `version` consistently required across all synced tables for conflict detection? [Completeness, Spec §Requirements]
- [ ] CHK005 Does the spec define whether `deleted_at` (soft delete) or hard delete is used, and is this consistent across entities? [Consistency, Spec §Requirements]
- [ ] CHK006 Is the conflict detection mechanism (modify-vs-modify vs delete-vs-modify) described in a way that can be implemented and tested deterministically? [Clarity, Spec §Requirements / Edge Cases]

## Conflict Surfacing & Resolution

- [ ] CHK007 Are requirements for a dedicated Conflict Center (and per-record badges) clearly stated, including how users discover and resolve conflicts? [Completeness, Spec §User Story 6 / Requirements]
- [ ] CHK008 Does the spec forbid silent overwrites for finance entities and require explicit user choice or clear messaging (e.g. delete-wins)? [Clarity, Spec §Non-Negotiable Offline Laws, NFR-001]
- [ ] CHK009 Is the Conflict entity (local/remote snapshots, resolution states) defined with enough detail to support auditability and UI flows? [Measurability, Spec §Key Entities]

## Attachment Queues (Receipts & Profile Images)

- [ ] CHK010 Are requirements for offline receipt/profile capture, local storage, and queued upload explicitly defined (including failure behavior)? [Completeness, Spec §User Story 6 / Requirements]
- [ ] CHK011 Does the spec clearly distinguish between DB row sync (PowerSync) and file upload (app-owned queues)? [Clarity, Spec §Requirements]
- [ ] CHK012 Is the behavior for viewing attachments offline specified (prefer local file; placeholder when only signed URL exists)? [Clarity, Spec §Edge Cases / Requirements]

## Offline Auth & Session Policy

- [ ] CHK013 Is the “session expired + offline” policy (biometric/PIN gate) clearly documented with expected user experience and scope? [Clarity, Spec §Clarifications Session 2025-02-17 / Requirements]
- [ ] CHK014 Does the spec state what users can do after unlocking (read-only vs full local writes queued for later sync) and is it consistent across sections? [Consistency, Spec §Requirements / Assumptions]

## Transfers Ordering & Atomicity

- [ ] CHK015 Are requirements for transfers (two accounts updated atomically, no double-apply during sync) explicitly documented? [Completeness, Spec §Key Entities / Requirements]
- [ ] CHK016 Is the expected ordering for applying transfers vs account updates during sync described so that implementation can avoid race conditions? [Clarity, Spec §Assumptions / Success Criteria]

## Reporting, Indexes & Performance

- [ ] CHK017 Do reporting requirements specify which dimensions must be queryable offline (date range, account, category, user) and how paging works for large datasets? [Coverage, Spec §Requirements / Success Criteria]
- [ ] CHK018 Are index expectations (e.g. on user_id + date/account/category) described at the requirement level without leaking implementation details? [Clarity, Spec §Assumptions / Key Entities]

## Observability & Testing

- [ ] CHK019 Are logging requirements for sync/attachment/conflict events expressed in terms of structured, non-PII signals (not implementation-level logs)? [Clarity, Spec §Non-Functional Requirements]
- [ ] CHK020 Do success criteria cover crash-recovery scenarios (app kill mid-write/mid-sync) in a way that can be validated by tests? [Measurability, Spec §Success Criteria]

## Notes

- Check items off as completed: `[x]` once the spec clearly satisfies them.
- Use this checklist alongside `requirements.md` to review offline-first and sync-specific requirements quality before further changes.

