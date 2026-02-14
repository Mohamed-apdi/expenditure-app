# Data Model: Support Negative Values and Accurate Calculations

**Feature**: 003-negative-values-support  
**Date**: 2025-02-14

## Scope

No schema or table changes. Existing types and storage already support negative values. This document clarifies validation rules and constraints that change for this feature.

---

## Account

**Table**: `accounts`  
**Type**: `Account` (lib/types/types.ts)

| Field | Type | Constraint Change |
|-------|------|-------------------|
| `amount` | number | **No minimum** — may be negative. Previously implied non-negative by client validation. |

**Validation Rules (updated)**:
- `amount` MUST be a valid number (can be negative, zero, or positive)
- No client-side or server-side constraint enforcing `amount >= 0`

**State transitions**: N/A — balance is derived from transactions; stored `amount` is updated by services. No explicit state machine.

---

## Transaction

**Table**: `transactions`  
**Type**: `Transaction`

| Field | Type | Notes |
|-------|------|-------|
| `amount` | number | Always positive; direction via `type` (income/expense/transfer) |

**Validation Rules**:
- `amount` MUST be > 0 (transaction amounts are always positive)
- Balance change: income +amount, expense -amount, transfer: -from, +to

---

## Balance Calculation

**Formula** (for single account):
```
balance = prior_balance + (income_amount) - (expense_amount)
```

For transfers: source account -amount, destination account +amount.

**Aggregation** (all accounts):
```
total_balance = sum(account.amount for each account)
```

---

## Entities Affected (no schema change)

| Entity | Change |
|--------|--------|
| Account | `amount` semantics: negative allowed |
| Expense | No schema change; client validation removed |
| Transaction | No schema change |
| Loan | No schema change; client validation removed for loan_given |
| Transfer | No schema change; client validation removed |

---

## TypeScript Types

Existing types remain valid:

```typescript
interface Account {
  amount: number;  // May be negative
  // ... other fields
}

interface Transaction {
  amount: number;  // Always positive
  type: 'income' | 'expense' | 'transfer';
  // ... other fields
}
```
