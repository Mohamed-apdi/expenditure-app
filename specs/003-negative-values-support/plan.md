# Implementation Plan: Support Negative Values and Accurate Calculations

**Branch**: `(current branch)` | **Date**: 2025-02-14 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-negative-values-support/spec.md`

## Summary

Enable users to create expenses, loans, and other transactions even when account balance is insufficient, allowing negative balances (overdraft). Remove validation blocks that prevent operations when balance is low. Ensure all monetary calculations, displays, reports, and exports correctly handle negative values.

**Technical approach**: Remove client-side balance checks in AddExpense and Debt_Loan; centralize balance update logic; ensure UI, analytics, and reports format and sum negative amounts correctly.

## Technical Context

**Language/Version**: TypeScript 5.8  
**Primary Dependencies**: React Native, Expo 53, Supabase  
**Storage**: Supabase (PostgreSQL) — `accounts.amount` already numeric; supports negative  
**Testing**: No formal test framework in package.json; add Jest or Vitest per constitution TDD  
**Target Platform**: iOS, Android, Web (React Native + Expo)  
**Project Type**: Mobile (React Native) with shared lib/  
**Performance Goals**: No new performance constraints; calculations must remain fast  
**Constraints**: Type safety (strict TypeScript), offline-capable per constitution  
**Scale/Scope**: Single-user personal finance; low transaction volume

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Type Safety** | ✅ Pass | All balance/amount types remain `number`; no `any` introduced |
| **II. Mobile-First** | ✅ Pass | No UI/UX changes that compromise mobile |
| **III. Test-First** | ⚠️ Action | Add unit tests for balance calculations; integration tests for expense/loan flows |
| **IV. Data Security & Privacy** | ✅ Pass | No changes to auth, RLS, or data isolation |
| **V. Cross-Platform** | ✅ Pass | Negative display/formatting consistent across iOS, Android, Web |
| **VI. Performance & Offline** | ✅ Pass | No new network or heavy compute; local calculations unchanged |
| **VII. Observability** | ✅ Pass | Existing logging sufficient; no new error paths that hide failures |

**Gate result**: Pass. Test-first requires adding tests for new/affected logic.

## Project Structure

### Documentation (this feature)

```text
specs/003-negative-values-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created here)
```

### Source Code (repository root)

```text
app/
├── (expense)/AddExpense.tsx     # Remove insufficient-funds check
├── (main)/Dashboard.tsx         # Verify balance display for negatives
├── (main)/Accounts.tsx          # Account list balance display
├── (main)/ReportsScreen.tsx     # Reports balance aggregation
├── account-details/[id].tsx     # Account detail balance
└── components/
    ├── Debt_Loan.tsx            # Remove balance check for loan_given
    └── (others as needed)

lib/
├── services/
│   ├── accounts.ts              # updateAccountBalance (already supports negative)
│   ├── expenses.ts              # No change; validation in UI
│   ├── loans.ts                 # No change; validation in UI
│   └── analytics.ts             # Verify negative handling
├── utils/
│   └── utils.ts                 # formatCurrency / negative formatting
└── config/
    └── theme/constants.ts       # Optional: negative balance color

components/
└── (Dashboard)/MonthYearScroll.tsx  # Balance display
```

**Structure Decision**: React Native app with `app/` routes, `lib/` services and utils, `components/` shared UI. No new modules; changes localized to existing screens and services.

## Complexity Tracking

*No constitution violations requiring justification.*
