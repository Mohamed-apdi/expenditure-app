# Feature Specification: Support Negative Values and Accurate Calculations

**Feature Branch**: *(current branch)*  
**Created**: 2025-02-14  
**Status**: Draft  
**Input**: User description: "This project now not support negative values user can't create expense without the balance so i want this project support negative values and all calculation accurate"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Expenses with Insufficient or Zero Balance (Priority: P1)

A user can create an expense even when their account balance is zero or less than the expense amount. The account balance is allowed to go negative (overdraft). The system records the transaction and updates the balance correctly without blocking or showing an error for insufficient funds.

**Why this priority**: This is the core value. Currently, users cannot record expenses when they have no funds, which prevents accurate tracking of overspending and overdraft situations. Many real-world users spend before they get paid; blocking expense entry creates inaccurate records and poor user experience.

**Independent Test**: Can be fully tested by setting an account balance to zero or a small amount, creating an expense larger than the balance, and verifying the expense is saved and the balance correctly reflects the negative amount.

**Acceptance Scenarios**:

1. **Given** an account with balance of $50, **When** the user creates an expense of $100, **Then** the expense is saved and the account balance becomes -$50
2. **Given** an account with balance of $0, **When** the user creates an expense of $25, **Then** the expense is saved and the account balance becomes -$25
3. **Given** an account with balance of -$20, **When** the user creates an expense of $30, **Then** the expense is saved and the account balance becomes -$50
4. **Given** an account with balance of $100, **When** the user creates an expense of $50, **Then** the expense is saved and the account balance becomes $50 (positive flow unchanged)

---

### User Story 2 - Accurate Financial Calculations Throughout the App (Priority: P1)

All monetary calculations—including balance, income minus expenses, totals, reports, and summaries—are mathematically correct for both positive and negative values. Rounding and aggregation errors are avoided.

**Why this priority**: Users rely on displayed numbers for financial decisions. Incorrect totals, especially with mixed positive/negative values, erode trust and can lead to poor financial choices.

**Independent Test**: Can be fully tested by creating a series of income and expense transactions (including those that produce negative balances), then verifying that dashboard totals, account summaries, and reports match the expected values.

**Acceptance Scenarios**:

1. **Given** multiple transactions (income and expenses, some producing negative balance), **When** the user views the dashboard, **Then** the displayed balance, income total, and expense total match the sum of all transactions
2. **Given** an account with negative balance, **When** the user views account details or reports, **Then** the balance is shown correctly with negative sign and correct currency formatting
3. **Given** transfers between accounts (including those with negative balance), **When** the transfer completes, **Then** both source and destination account balances update correctly
4. **Given** aggregated views (e.g., "all accounts"), **When** the user views total balance, **Then** the total correctly sums positive and negative account balances

---

### User Story 3 - Loans and Other Flows Support Negative Balance (Priority: P2)

Operations that currently block when balance is insufficient—such as giving a loan or creating certain transaction types—allow the operation to proceed when the user chooses, resulting in negative balance where applicable.

**Why this priority**: Consistency across the app. If expenses can go negative, loans given and similar flows should behave similarly to avoid confusing users and incomplete records.

**Independent Test**: Can be fully tested by attempting to give a loan larger than account balance and verifying the loan is created and the account balance correctly reflects the negative amount.

**Acceptance Scenarios**:

1. **Given** an account with balance less than the loan amount, **When** the user gives a loan from that account, **Then** the loan is created and the account balance correctly decreases (may go negative)
2. **Given** an account with negative balance, **When** the user receives income or a loan repayment, **Then** the balance updates correctly (e.g., -$50 + $100 = $50)
3. **Given** any transaction type (expense, income, transfer, loan), **When** it affects account balance, **Then** the balance change is calculated correctly for both positive and negative starting balances

---

### Edge Cases

- What happens when the user deletes or edits a transaction that contributed to a negative balance—does the balance recalculate correctly?
- How does the system display and format negative balances in the UI (e.g., -$50.00 vs ($50.00))?
- Are there any reports or exports that incorrectly handle negative values (e.g., treating them as positive)?
- What happens when transferring from an account with negative balance—is the transfer allowed, and does it update both accounts correctly?
- How does the total "all accounts" balance behave when some accounts are positive and others negative?
- Are budget comparisons and spending limits calculated correctly when account balance is negative?
- What happens with recurring expenses that would push balance further negative—do they process correctly?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to create expenses when the account balance is less than or equal to zero or less than the expense amount
- **FR-002**: The system MUST update account balance correctly when expenses exceed current balance, resulting in a negative balance (overdraft)
- **FR-003**: The system MUST perform all monetary calculations (balance, totals, summaries) accurately for both positive and negative values
- **FR-004**: The system MUST display negative balances clearly and correctly in all relevant screens (dashboard, accounts, reports, etc.)
- **FR-005**: The system MUST correctly aggregate balances across multiple accounts when some have positive and some have negative balances
- **FR-006**: The system MUST handle transfers between accounts correctly when one or both accounts have negative balance
- **FR-007**: The system MUST allow loan-given and similar operations to proceed even when account balance is insufficient, updating balance correctly (including negative)
- **FR-008**: The system MUST recalculate balances correctly when transactions are added, edited, or deleted, including when balances become or cease to be negative
- **FR-009**: The system MUST format negative monetary values appropriately (e.g., negative sign or parentheses) so users can distinguish them from positive amounts
- **FR-010**: The system MUST ensure reports, exports, and analytics correctly include and sum negative values

### Key Entities

- **Account**: Represents a wallet, bank, or card; has a balance that may be positive, zero, or negative
- **Transaction**: Income or expense with amount; affects account balance; amounts are always positive; direction (income vs expense) determines balance change
- **Balance**: Calculated or stored value representing net funds in an account; must support negative values
- **Transfer**: Movement of funds between accounts; must update both source and destination balances correctly regardless of sign

## Assumptions

- Users understand that negative balance represents overspending or overdraft; no additional warning is required beyond clear display of the negative value
- Currency and rounding behavior (e.g., 2 decimal places) remains unchanged; only the allowance of negative values and calculation correctness are in scope
- All existing transaction types (income, expense, transfer, loan, etc.) should support negative balance where logically applicable
- No change to authentication, sync, or data storage structure is required; only validation rules and calculation logic are in scope
- Reports and exports (CSV, PDF) should display negative values in a consistent, readable format

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create an expense when account balance is zero or negative in 100% of cases without being blocked by "insufficient funds"
- **SC-002**: Account balance after any single transaction matches the expected value (prior balance ± transaction amount) with no rounding errors beyond the supported decimal precision
- **SC-003**: Dashboard totals (income, expense, balance) match the sum of all transactions for the selected account(s) in 100% of tested scenarios
- **SC-004**: Aggregated balance across multiple accounts (e.g., "all accounts") correctly sums positive and negative account balances
- **SC-005**: Negative balances are clearly distinguishable from positive balances in all UI screens where balance is displayed
- **SC-006**: Edits and deletions of transactions correctly update account balances, including when balance transitions between positive and negative
- **SC-007**: Transfers between accounts correctly update both source and destination balances regardless of whether either account has negative balance
- **SC-008**: Reports and exports include negative values and display them correctly without data loss or incorrect aggregation
