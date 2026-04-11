# Qoondeeye — Project Overview

**Purpose**: Single source of truth for product and architecture decisions, with emphasis on enabling **offline-first** implementation.  
**Last updated**: 2025-02-17

---

## 1) App Summary

| Item | Description |
|------|-------------|
| **Name** | Qoondeeye (expenditure / money manager) |
| **Problem** | Users need to track personal finances (expenses, income, budgets, goals, loans, subscriptions) reliably, including in low- or no-connectivity environments. |
| **Target users** | Individuals managing their own money (personal finance). No B2B or multi-organization scope. |
| **Platforms** | iOS and Android (Expo React Native). Web is secondary and must not compromise mobile UX. |
| **Key workflows** | (1) Sign in / sign up → (2) View dashboard and accounts → (3) Add/edit expenses and transactions → (4) Manage budgets, goals, subscriptions, loans → (5) Reports and settings. |

---

## 2) Screens & User Flows

### Screen inventory

| Area | Screens | Notes |
|------|---------|------|
| **Auth** | Login (Email/Password + Google OAuth), Sign up | AuthGateScreen; optional Apple Sign-In in UI. |
| **Onboarding** | Welcome | Entry before auth. |
| **Main (tabs)** | Dashboard, Reports, Budget, Accounts | Tab bar; Dashboard = home. |
| **Accounts** | List (Accounts), Detail (`account-details/[id]`), Add account, Edit account | |
| **Expenses / Transactions** | Add expense (income/expense/transfer), Expense detail, Edit expense, Transaction detail, Transactions list | Forms: ExpenseForm, IncomeForm, TransferForm. |
| **Other features** | Budget screen, Subscriptions, Savings/Goals, Debt/Loan, Investments | Components or dedicated screens. |
| **Profile / Settings** | Settings, Update profile, Notifications | Profile image upload → Supabase Storage. |
| **Other** | Receipt scan (OCR), Notifications list | Receipts → Storage bucket `receipts`. |

### Top 3 workflows (bulleted flow)

**Workflow A — Login and land on Dashboard**

1. User opens app → Welcome (or deep link).
2. User taps Login → AuthGateScreen.
3. User signs in via Email/Password or Google OAuth.
4. Session stored (token, userId, supabase_session in secure store); optional “remember me” for email/password.
5. `ensureDefaultAccount(userId)` runs (create default account if none).
6. Router replaces to `(main)/Dashboard`.
7. Dashboard loads accounts, balance, recent transactions (user-scoped).

**Workflow B — Add expense (online or offline)**

1. User is on Dashboard or Expenses flow.
2. User navigates to Add Expense (or equivalent entry).
3. User picks type: Expense / Income / Transfer and fills form (amount, category, account, date, etc.).
4. On submit: today → write to Supabase (and/or local DB when offline); redirect/feedback.
5. If offline: record written to local DB and queued for sync; UI shows success.
6. Dashboard / lists reflect new data from local source when offline-first is active.

**Workflow C — View and edit account**

1. User is on Accounts tab → list of accounts.
2. User taps an account → `account-details/[id]` (detail).
3. User can edit → `account-details/edit/[id]`.
4. Save updates account (and optionally related balances); sync when online.
5. User can navigate back to list or Dashboard.

---

## 3) Data Model (Supabase)

All tables use **UUID** primary keys (`id`). Client-generated UUIDs for offline-created rows. `user_id` on user-owned tables; `profiles.id` = auth user id.

| Table | Description | PK | Important fields | Relationships | Row count | Offline priority |
|-------|-------------|----|------------------|---------------|-----------|-------------------|
| **accounts** | User’s wallets/accounts | uuid | user_id, account_type, name, amount, currency, is_default, group_id | group_id → account_groups; account_type → account_types | Medium | **Must cache** |
| **transactions** | Generic transaction log | uuid | user_id, account_id, amount, date, type, category, is_recurring | account_id → accounts | Large | **Must cache** |
| **expenses** | Expense/income entries | uuid | user_id, account_id, amount, category, date, entry_type, receipt_url, is_recurring | account_id → accounts | Large | **Must cache** |
| **budgets** | Budget per category/period | uuid | user_id, account_id, category, amount, period, start_date, end_date, is_active | account_id → accounts | Small | **Must cache** |
| **goals** | Savings goals | uuid | user_id, account_id, name, target_amount, current_amount, target_date, is_active | account_id → accounts | Small | **Must cache** |
| **subscriptions** | Recurring subscriptions | uuid | user_id, account_id, name, amount, billing_cycle, next_payment_date, is_active | account_id → accounts | Small | **Must cache** |
| **transfers** | Between accounts | uuid | user_id, from_account_id, to_account_id, amount, date | FKs → accounts | Medium | **Must cache** |
| **personal_loans** | Loans / debt | uuid | user_id, account_id, type, party_name, principal_amount, remaining_amount, status, due_date | account_id → accounts | Small | **Must cache** |
| **account_groups** | Grouping of accounts | uuid | user_id, name, type_id | type_id → account_types | Small | **Must cache** |
| **account_types** | Asset/type lookup | uuid | name, is_asset | — | Small (shared) | **Must cache** |
| **profiles** | User profile (1:1 auth) | uuid (user id) | full_name, email, phone, image_url, user_type | id = auth.users.id | 1 per user | **Must cache** (current user) |

**Sync metadata (app-side, not Supabase tables)**  
- SyncState (status, lastSyncAt, pendingCount, errorMessage).  
- SyncConflict (entityType, entityId, local/remote version, conflictType).  
- PendingChange (queue for retries).  

See `lib/database/schema/index.ts` and `specs/002-offline-online-support/data-model.md` for full column lists.

---

## 4) Auth, Roles & Security

| Aspect | Choice |
|--------|--------|
| **Roles** | Single role: **user**. No admin/manager; all authenticated users have same permissions over their own data. (TODO: confirm if any future “admin” or support role is planned.) |
| **Tenant model** | **Single-tenant per user**: every row is scoped by `user_id` (or `profiles.id`). No org/workspace/team. |
| **RLS summary** | All user tables: `SELECT/INSERT/UPDATE/DELETE` only where `auth.uid() = user_id` (or `id` for profiles). PowerSync uses a dedicated role with replication; sync rules must mirror RLS (filter by `user_id`). |
| **Session / tokens** | Supabase Auth: access_token and refresh_token; session persisted in expo-secure-store (and optionally “remember me” for email/password). Token used for Supabase client; PowerSync connector uses same auth for sync. |

---

## 5) Supabase Features Used

| Feature | Usage |
|---------|--------|
| **Postgres** | Tables: accounts, transactions, expenses, budgets, goals, subscriptions, transfers, personal_loans, account_groups, account_types, profiles. Views/functions: TODO: confirm if any DB views or RPCs are used. |
| **Auth** | Email/Password sign up and sign in; Google OAuth; session persistence. |
| **Storage** | **Buckets**: `images` (profile photos), `receipts` (expense receipt files). Profile: public URL; receipts: signed URLs. |
| **Realtime** | Postgres Changes on `expenses` for expense detail screen (single-row filter by `id`). Optional for other tables: TODO: confirm. |
| **Edge Functions** | TODO: confirm if any Edge Functions are used or planned. |

---

## 6) Offline Expectations (Desired)

| Area | Expectation |
|------|-------------|
| **Read** | All list/detail/dashboard/reports data must be readable from local DB when offline (after initial sync). |
| **Write (CRUD)** | Full CRUD for: accounts, transactions, expenses, budgets, goals, subscriptions, transfers, personal_loans, account_groups; profile (current user). Create/edit/delete must persist locally and sync when online. |
| **Search / filter / sort** | Must work offline on cached data (same behavior as online, possibly with acceptable staleness). |
| **Attachments** | Receipts: upload requires network; offline: store reference or queue upload; download/view can use cached/signed URL when online. Profile image: same (upload when online). |
| **Notifications** | In-app notification list can be cached for offline read; push delivery may require network. TODO: confirm if push must work offline in any form. |
| **Require internet** | Login/signup (except possibly cached session restore); OAuth; first-time sync; receipt/profile image upload; any payment or third-party API; admin operations if added later. |

---

## 7) Sync & Conflict Expectations

| Topic | Expectation |
|-------|-------------|
| **Conflict-prone records** | Same row edited on two devices offline: expenses, transactions, accounts, budgets, goals, subscriptions, transfers, personal_loans, profile. |
| **Resolution** | **modify vs modify**: user choice per conflict (“keep my version” or “use cloud version”). **delete vs modify**: delete wins; user is informed that the other device’s changes were discarded. |
| **Staleness** | Data can be stale up to last successful sync. Target: sync within ~60 s of connectivity; no strict “max staleness” defined (TODO: confirm e.g. “acceptable if data is up to 1 day old when offline”). |
| **Idempotency** | Client-generated UUIDs for new rows; last-writer-wins or explicit resolution for conflicts. |

---

## 8) Non-Functional Requirements

| Requirement | Target / note |
|-------------|----------------|
| **Performance** | Initial screen load &lt; 2 s on standard mobile networks; heavy work in background. |
| **Local storage budget** | TODO: confirm max DB size (e.g. 100–500 MB) and retention (e.g. sync last N months of transactions). |
| **Privacy / security** | Encrypt at rest and in transit; no secrets in repo; RLS and user-scoped queries only; PII handling compliant with applicable regulations. |
| **Analytics / logging** | Structured logging for API calls, mutations, and errors; financial operations with transaction IDs for audit; errors to monitoring. No PII in logs by default (TODO: confirm). |

---

## 9) Open Questions / Assumptions

- **Assumption**: Single consumer user per device; no shared budgets or real-time collaboration.  
- **Assumption**: PowerSync (or equivalent) will be the sync layer; schema in `lib/database/schema/index.ts` is the source of truth for local schema.  
- **TODO: confirm**: Any Postgres views or RPCs used by the app?  
- **TODO: confirm**: Use of Supabase Edge Functions (none assumed).  
- **TODO: confirm**: Realtime beyond `expenses` (e.g. accounts, transactions).  
- **TODO: confirm**: Max local storage size and data retention for sync.  
- **TODO: confirm**: Acceptable max staleness when offline (e.g. “1 day”).  
- **TODO: confirm**: Push notification behavior when offline.  
- **TODO: confirm**: Future roles (e.g. admin) or multi-tenant/org model.  
- **Assumption**: Apple Sign-In is optional; auth contract is Google + Email/Password as minimum.

---

*This document is the recommended entry point for offline-first design (sync boundaries, conflict handling, and local schema) and for onboarding new contributors.*
