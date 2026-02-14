# Feature Specification: Auto-Create Default Account on Registration

**Feature Branch**: *(current branch)*  
**Created**: 2025-02-14  
**Status**: Draft  
**Input**: User description: "when new user was registered auto create default account behind the sence"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Receives a Default Account Automatically (Priority: P1)

When a user completes registration (sign-up), the system automatically creates one default account for them in the background. The user does not see a separate step or screen for creating this account; it exists as soon as they finish registration. The user can immediately add transactions, view balance, and use the app without manually creating an account first.

**Why this priority**: This is the core value. New users expect to start tracking money right away. Requiring them to create an account before adding their first transaction adds friction and can lead to drop-off. A default account removes that barrier.

**Independent Test**: Can be fully tested by registering a new user, then verifying that exactly one default account exists for that user and that they can add an expense or income to it without creating an account first.

**Acceptance Scenarios**:

1. **Given** a user completes registration successfully, **When** the user is created, **Then** exactly one default account is created for that user automatically and is associated with their profile
2. **Given** a newly registered user, **When** they open the app (e.g., dashboard or accounts screen), **Then** they see one default account and can use it for transactions without creating an account
3. **Given** a newly registered user, **When** they add their first transaction (income or expense), **Then** the transaction can be assigned to the default account and the account balance updates correctly
4. **Given** a newly registered user, **When** they view their account list, **Then** the default account appears with a recognizable default name (e.g., "Cash", "Default", "Main") and zero balance

---

### User Story 2 - Default Account Behaves Like a Normal Account (Priority: P1)

The auto-created default account has the same capabilities as any user-created account: it can receive income, expenses, transfers, and loans; it has a balance; the user can rename or delete it later. There is no special restriction or difference in behavior.

**Why this priority**: Consistency. Users should not encounter "second-class" behavior for the default account. They can keep it as-is or customize it like any other account.

**Independent Test**: Can be fully tested by using the default account for all transaction types and for rename/delete (if supported for accounts), and verifying behavior matches a manually created account.

**Acceptance Scenarios**:

1. **Given** the default account exists, **When** the user adds income or expense to it, **Then** the balance updates correctly and the transaction appears in history
2. **Given** the default account exists, **When** the user renames the account (if the app supports renaming), **Then** the new name is saved and displayed
3. **Given** the default account exists, **When** the user creates additional accounts, **Then** the default account remains in the list and behaves the same as the others
4. **Given** the default account exists, **When** the user deletes it (if the app allows account deletion), **Then** it is removed like any other account; the user is not blocked from deleting the default

---

### Edge Cases

- What happens if account creation fails during registration—does the user see a clear message and can they retry or still complete registration?
- Does the default account receive a sensible initial balance (e.g., zero) and currency consistent with the app or user locale?
- If the user can choose currency or account type during onboarding, should the default account use those choices, or is it always a single fixed type (e.g., "Cash")?
- Are existing users (already registered before this feature) affected—do they keep their current state with no automatic backfill of a "default" account?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST create exactly one default account automatically when a new user completes registration, without requiring the user to perform any account-creation step
- **FR-002**: The default account MUST be created in the same registration flow (e.g., immediately after the user record is created) so it exists before the user reaches the main app
- **FR-003**: The default account MUST be associated with the newly registered user and visible only to that user
- **FR-004**: The default account MUST have an initial balance of zero (or the app’s standard initial value) unless the product defines another sensible default
- **FR-005**: The default account MUST have a recognizable default name (e.g., "Cash", "Default", "Main") that is either fixed or derived from app/localization rules—no blank or technical name
- **FR-006**: The default account MUST support the same operations as any user-created account (income, expense, transfer, balance display, and any supported account actions such as rename or delete)
- **FR-007**: The system MUST NOT create a second default account for the same user on subsequent logins or sync events; only one default account per user, created once at registration
- **FR-008**: If automatic default-account creation fails during registration, the system MUST handle the failure in a way that does not leave the user in an inconsistent state (e.g., clear error and retry, or allow the user to create an account manually on first use)

### Key Entities

- **User**: The registered user; owns one or more accounts; receives exactly one default account at registration
- **Account**: A wallet, bank, or card used for tracking money; has a name, balance, and supports transactions; the default account is a normal account with a system-assigned default name created at registration
- **Default account**: The single account auto-created for a user at registration; same structure and behavior as other accounts, distinguished only by creation trigger and initial name

## Assumptions

- "Registration" means the step where the user signs up (e.g., email/password or equivalent) and the user record is first persisted; the default account is created in that same flow
- The app already has a concept of "account" (wallet/bank/card); this feature only adds automatic creation of one such account at registration
- Existing users who registered before this feature do not receive a retroactive default account unless the product explicitly defines a migration or backfill
- The default account name can be a single localized string (e.g., "Cash" or "Default") chosen by the product; no need for user input at registration
- Currency or account type for the default account follows app defaults or user locale if the app supports it; otherwise a single fixed type is acceptable

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly registered users have exactly one default account created automatically upon successful registration
- **SC-002**: New users can add their first transaction (income or expense) to the default account without creating an account manually, in 100% of cases
- **SC-003**: The default account appears in the user’s account list with a non-empty, recognizable name and zero (or defined initial) balance immediately after first login post-registration
- **SC-004**: No duplicate default accounts are created for the same user across multiple logins or sync events
- **SC-005**: If default account creation fails, the user receives a clear outcome (e.g., error message or ability to create an account on first use) so they are not blocked from using the app
- **SC-006**: The default account supports the same transaction types and balance behavior as any other account, with no functional difference
