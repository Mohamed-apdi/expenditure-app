# Quickstart: Support Negative Values and Accurate Calculations

**Feature**: 003-negative-values-support  
**Date**: 2025-02-14

## Summary

Remove validation that blocks expenses, transfers, and loans when account balance is insufficient. Ensure all balance displays, aggregations, and reports handle negative values correctly.

---

## Implementation Checklist

### Phase 1: Remove balance blocks

- [x] 1. **AddExpense.tsx** — Remove expense balance check (lines ~306–317)
   - Delete the `if (entryType === "Expense") { if (amountNum > selectedAccount.amount) { ... return; } }` block

- [x] 2. **AddExpense.tsx** — Remove transfer balance check (lines ~456–462)
   - Delete the `if (amountNum > fromAccount.amount) { Toast... return; }` block

- [x] 3. **Debt_Loan.tsx** — Remove loan_given balance check
   - In `handleAddLoan`: remove check `if (formData.type === 'loan_given') { if (selectedAccount.amount < loanAmount) { Alert... return; } }`
   - In loan update/edit flow: remove similar balance check for `loan_given`

### Phase 2: Verify calculations

- [x] 4. **Balance update logic** — Already correct
   - `newBalance = selectedAccount.amount - amountNum` (expense) or `+ amountNum` (income)
   - No changes needed in `updateAccountBalance` or `accounts.ts`

- [x] 5. **Dashboard / MonthYearScroll** — Verify negative display
   - `currentBalance.toLocaleString()` shows negative; MonthYearScroll OK
   - Accounts.tsx updated to use `formatCurrency` for balance display

- [x] 6. **ReportsScreen / localReports** — Verify aggregation
   - `total_balance = sum(account.balance)` — negative accounts reduce total
   - ReportsScreen: removed Math.abs from trend.amount and item.remaining

- [x] 7. **Analytics / analytics.ts** — `balance = income - totalExpenses` OK for negative

### Phase 3: Formatting and tests

- [x] 8. **formatCurrency** — Confirm negative formatting
   - In `lib/services/localReports.ts`: `formatCurrency(amount)` — no `Math.abs(amount)` before formatting for balance displays

- [x] 9. **Add unit tests** (per constitution)
   - Added `lib/utils/__tests__/balance.test.ts`; requires Jest to run

- [ ] 10. **Manual verification**
    - Create expense when balance $0 → balance -$X
    - Transfer when source balance $10, amount $50 → source -$40
    - Loan given when balance $20, amount $100 → balance -$80
    - Dashboard total with mixed positive/negative accounts

---

## Files to Modify

| File | Change |
|------|--------|
| `app/(expense)/AddExpense.tsx` | Remove 2 validation blocks (expense + transfer) |
| `app/components/Debt_Loan.tsx` | Remove loan_given balance check(s) |
| `lib/services/localReports.ts` | Audit formatCurrency; ensure no abs() for balance |
| (Optional) `lib/config/theme/constants.ts` | Add negative balance color if desired |
| (New) `lib/utils/__tests__/balance.test.ts` | Unit tests for calculations |

---

## Rollback

If issues arise: re-add the validation blocks. No schema or migration changes; rollback is code-only.
