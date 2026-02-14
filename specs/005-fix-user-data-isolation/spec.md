# Feature Specification: Fix New User Seeing Other User's Data on Dashboard

**Feature Branch**: *(current branch)*  
**Created**: 2025-02-14  
**Status**: Draft  
**Input**: User description: "fix this issue i created new user when i come the dashboard i see other user data ?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Sees Only Their Own Data on Dashboard (Priority: P1)

When a user completes registration (or logs in for the first time) and reaches the dashboard, the screen shows only that user's data: their default account (e.g. "Main Account"), their balance (e.g. zero for a new user), and their transactions (e.g. none). No accounts, balances, or transactions belonging to any other user are ever displayed.

**Why this priority**: This is the core fix. Seeing another user's financial data is a serious privacy and trust issue and must not occur.

**Independent Test**: Can be fully tested by (1) logging in as User A and noting account/balance, (2) logging out or closing the app and registering or logging in as User B, (3) opening the dashboard and verifying that only User B's data (e.g. one default account, zero balance, no transactions) is shown—never User A's.

**Acceptance Scenarios**:

1. **Given** a new user has just registered and lands on the dashboard, **When** they view the dashboard, **Then** they see only their own default account and zero (or their own) balance; no accounts or balances from any other user
2. **Given** User A was previously logged in and User B has just logged in or registered, **When** User B views the dashboard, **Then** the account name, balance, and transactions shown belong only to User B
3. **Given** a new user with no transactions, **When** they view the dashboard, **Then** they see "No transactions" (or equivalent) and no transactions from other users
4. **Given** the authenticated user changes (logout then login as another user, or new signup), **When** the user opens any screen that shows user-specific data (dashboard, accounts, reports, etc.), **Then** that screen shows only the current user's data

---

### User Story 2 - User-Scoped State Cleared or Refreshed on Auth Change (Priority: P1)

When the authenticated user changes (e.g. logout and login as a different user, or new user signup), any in-memory or cached state that is tied to a previous user (e.g. selected account, account list, balances, transactions) is either cleared immediately or replaced with the current user's data before the user sees the screen. The user never sees a flash or brief display of the previous user's data.

**Why this priority**: Prevents the exact bug reported—stale state from a previous user being shown to a new user until new data loads.

**Independent Test**: Can be fully tested by switching users (logout, login as different user or new user) and verifying that the dashboard and account list never show the previous user's account name or balance, even for a moment.

**Acceptance Scenarios**:

1. **Given** the app has just switched to a different authenticated user, **When** the dashboard (or any user-scoped screen) is displayed, **Then** the data shown is either empty/loading for the new user or already the new user's data—never the previous user's data
2. **Given** the authenticated user has changed, **When** account list or selected account is used, **Then** the list and selection correspond to the current user only
3. **Given** a new user opens the app after registration, **When** they reach the dashboard, **Then** they do not see another user's balance (e.g. a non-zero or negative balance that does not belong to them)

---

### Edge Cases

- What happens when the session is restored from storage (e.g. app reopen) and the restored user is different from the user last in memory?
- What happens if the backend returns data for the wrong user due to a bug—how do we detect or prevent showing it?
- Are there other screens (reports, budgets, goals, loans) that must also be verified to show only the current user's data after an auth change?
- What happens on very fast user switch (e.g. logout then immediate login as another user)—is there a race where old data is shown?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST ensure that after registration or login, all user-specific data displayed on the dashboard (accounts, balance, transactions) belongs only to the currently authenticated user
- **FR-002**: The system MUST ensure that when the authenticated user changes (logout then login as another user, or new user signup), any in-memory or cached state that is scoped to a previous user is cleared or refreshed so that no previous user's data is shown to the new user
- **FR-003**: The system MUST ensure that the dashboard (and any other screens showing user-specific financial data) never display another user's accounts, balances, or transactions—whether due to stale state, caching, or incorrect user scoping
- **FR-004**: The system MUST scope all data fetches (accounts, transactions, balance, reports, etc.) to the currently authenticated user (e.g. by current user id from the active session)
- **FR-005**: The system MUST ensure that on app load or navigation to the dashboard after an auth change, the UI does not show a previous user's data before the current user's data is loaded; either show a loading state or ensure current user's data is loaded before displaying

### Key Entities

- **Authenticated user**: The user identified by the active session; all displayed data must be scoped to this user
- **User-scoped state**: In-memory or cached data tied to a user (e.g. account list, selected account, transactions, balance); must be cleared or refreshed when the authenticated user changes
- **Dashboard (and similar screens)**: Views that show accounts, balance, transactions, or other financial data; must display only the current user's data

## Assumptions

- The bug is caused by in-memory or cached state (e.g. account context, selected account) from a previous user not being cleared or refreshed when a new user logs in or registers, rather than by the backend returning wrong data
- "Other user data" includes account name, balance, and transactions; the fix applies to all screens that show user-specific financial data
- Session and authentication correctly identify the current user (e.g. Supabase auth returns the right user id); the fix focuses on clearing/refreshing client-side state on auth change
- Existing backend queries that filter by user_id are correct; any leakage is from client-side state reuse

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the time, when a new user registers and reaches the dashboard, they see only their own account(s) and balance (e.g. one default account and zero balance)—never another user's data
- **SC-002**: 100% of the time, when the authenticated user changes (logout then login as different user, or new signup), the dashboard and account list do not display the previous user's account name or balance at any point
- **SC-003**: All user-specific data displayed in the app (dashboard, accounts, transactions, reports, etc.) is verifiably scoped to the currently authenticated user in every tested scenario
- **SC-004**: No tester can reproduce the issue "created new user, came to dashboard, saw other user data" after the fix is applied
