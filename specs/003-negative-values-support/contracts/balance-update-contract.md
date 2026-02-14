# Contract: Balance Update Operations

**Feature**: 003-negative-values-support  
**Type**: Internal service / UI behavior contract

## Overview

Defines the expected behavior of balance-affecting operations when negative balances are allowed. No new REST endpoints; these are internal app flows.

---

## 1. Add Expense (handleSaveExpense)

**Location**: `app/(expense)/AddExpense.tsx`

| Aspect | Before | After |
|--------|--------|-------|
| Validation | Block if `amount > selectedAccount.amount` | No balance check; always allow |
| Balance update | `newBalance = selectedAccount.amount - amount` | Same formula; may be negative |
| Error | Toast "Insufficient Funds" | Not shown for low balance |

**Input**: `amountNum`, `selectedAccount`, `entryType === "Expense"`  
**Output**: Expense saved; transaction created; `updateAccountBalance(selectedAccount.id, newBalance)` called with `newBalance` (may be negative)

---

## 2. Transfer (handleTransfer)

**Location**: `app/(expense)/AddExpense.tsx`

| Aspect | Before | After |
|--------|--------|-------|
| Validation | Block if `amountNum > fromAccount.amount` | No balance check; always allow |
| Balance update | Same formulas | Same; `fromAccount.amount - amountNum` may be negative |

**Input**: `transferAmount`, `fromAccount`, `toAccount`  
**Output**: Transfer saved; two transactions; both account balances updated (source may go negative)

---

## 3. Loan Given (handleAddLoan / loan update)

**Location**: `app/components/Debt_Loan.tsx`

| Aspect | Before | After |
|--------|--------|-------|
| Validation | Block if `selectedAccount.amount < loanAmount` | No balance check; always allow |
| Balance update | `updateAccountBalance` via `loans.ts` | Same; balance may go negative |

**Input**: `principal_amount`, `account_id`, `type === 'loan_given'`  
**Output**: Loan created; account balance decreased (may be negative)

---

## 4. updateAccountBalance

**Location**: `lib/services/accounts.ts`

| Aspect | Behavior |
|--------|----------|
| Input | `accountId: string`, `newBalance: number` |
| Constraint | `newBalance` may be negative |
| Persistence | Supabase `accounts.update({ amount: newBalance })` |
| Error | Throw on Supabase error |

No change to implementation; contract clarifies that negative values are valid.

---

## 5. formatCurrency

**Location**: `lib/services/localReports.ts`

| Aspect | Behavior |
|--------|----------|
| Input | `amount: number`, `currency?: string` |
| Output | Formatted string (e.g., "-$50.00" for negative) |
| Note | `Intl.NumberFormat` handles negatives; verify no `Math.abs` wrapping negatives |

---

## Test Scenarios (Contract Tests)

1. Add expense $100 when balance $50 → balance becomes -$50
2. Transfer $200 from account with $100 → source -$100, destination +$200
3. Loan given $500 from account with $100 → balance becomes -$400
4. formatCurrency(-50) → "-$50.00" or equivalent
