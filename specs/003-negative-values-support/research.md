# Research: Support Negative Values and Accurate Calculations

**Feature**: 003-negative-values-support  
**Date**: 2025-02-14

## 1. Numeric Handling for Negative Balances

**Decision**: Use native JavaScript/TypeScript `number` type; `accounts.amount` (PostgreSQL numeric) already supports negative values. No schema change required.

**Rationale**: PostgreSQL `numeric`/`decimal` types support negative values by default. Supabase/PostgREST passes them through as JavaScript numbers. Existing `updateAccountBalance(accountId, newBalance)` accepts any number.

**Alternatives considered**:
- Separate `is_overdraft` flag: Rejected—redundant; sign of amount is sufficient
- BigInt for precision: Rejected—no requirement for high-precision decimals; 2 decimal places sufficient per spec assumptions

---

## 2. Display Formatting for Negative Amounts

**Decision**: Use minus sign prefix (`-$50.00`) consistently. Optionally apply distinct color (e.g., red) for negative balances in UI.

**Rationale**: ISO 4217 and common accounting practice use minus sign. Parenthetical notation `($50.00)` is common in accounting reports but less familiar in mobile app contexts. Currency formatting libraries (Intl.NumberFormat) handle negatives with `signDisplay: 'always'` or `'negative'`.

**Alternatives considered**:
- Parentheses `($50.00)`: Acceptable for reports/export; can be configurable later
- Red color only, no minus: Rejected—accessibility requires both sign and optional color

---

## 3. Rounding and Calculation Accuracy

**Decision**: Use `Number` with 2 decimal places; avoid floating-point accumulation by rounding at point of persistence and display. For aggregations, sum raw values then round once.

**Rationale**: Spec assumes "2 decimal places" and "supported decimal precision." JavaScript IEEE 754 can introduce minor errors (e.g., 0.1 + 0.2). Mitigations: (a) store amounts as numbers with 2 decimals; (b) when summing, round final result; (c) avoid repeated += in loops.

**Alternatives considered**:
- Decimal.js or similar: Rejected for now—scope is limited; standard number sufficient
- Integer cents: Would require schema migration; current schema uses decimal amount

---

## 4. Validation Removal and Consistency

**Decision**: Remove client-side "insufficient funds" checks in AddExpense and Debt_Loan (loan_given). Allow all operations that logically change balance to proceed. Server-side (Supabase) has no such check on `accounts.amount` update.

**Rationale**: Spec FR-001 and FR-007 explicitly require allowing expenses and loans when balance is insufficient. Current blocks are client-side only; no RLS or DB constraint enforces positive balance.

**Alternatives considered**:
- Optional "allow overdraft" toggle: Rejected—spec requires always allowing negative
- Warning toast instead of block: Rejected—spec says no blocking; optional warning can be added later if desired

---

## 5. Transfer from Negative Balance

**Decision**: Allow transfers from accounts with negative balance. Deduct from source, add to destination; both operations proceed regardless of source balance.

**Rationale**: Spec FR-006 requires transfers to work "when one or both accounts have negative balance." Current AddExpense transfer flow checks "insufficient balance in from account"—that check must be removed for transfers as well.

**Alternatives considered**:
- Block transfer if source negative: Rejected—violates FR-006

---

## 6. Aggregation Across Accounts

**Decision**: Total balance = sum of all account `amount` values. Negative accounts reduce the total (e.g., $100 + (-$30) = $70).

**Rationale**: Standard arithmetic. Spec SC-004 requires correct aggregation. Implementation: `accounts.reduce((sum, a) => sum + (a.amount ?? 0), 0)`.

**Alternatives considered**:
- Exclude negative accounts from total: Rejected—would misrepresent net worth
- Separate "assets" and "liabilities": Out of scope; current schema does not enforce asset/liability split for all accounts
