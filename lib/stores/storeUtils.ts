import type {
  Account,
  AccountGroup,
  AccountType,
  Budget,
  Expense,
  Goal,
  Investment,
  LoanRepayment,
  PersonalLoan,
  Profile,
  Subscription,
  Transaction,
  Transfer,
} from "../types/types";

export type LocalStatus =
  | "pending"
  | "failed"
  | "conflict"
  | "synced"
  | "deleted";

export interface LocalMetadata {
  deleted_at: string | null;
  __local_status: LocalStatus;
  __local_updated_at: string | null;
  __last_error: string | null;
  /**
   * Last remote updated_at/version we successfully synced against.
   * Used for conflict detection: if remote.updated_at !== __remote_updated_at
   * while the row is pending locally, we treat it as modify-vs-modify.
   */
  __remote_updated_at?: string | null;
}

export type WithLocalMetadata<T> = T & LocalMetadata;

export function nowIso(): string {
  return new Date().toISOString();
}

export function markPending<T extends LocalMetadata>(row: T): T {
  const now = nowIso();
  return {
    ...row,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
  };
}

export function softDelete<T extends LocalMetadata>(row: T): T {
  const now = nowIso();
  return markPending({
    ...row,
    deleted_at: now,
  });
}

export function safeMerge<T>(existing: T, patch: Partial<T>): T {
  return {
    ...existing,
    ...patch,
  };
}

export function ensureId(allIds: string[], id: string): string[] {
  return allIds.includes(id) ? allIds : [id, ...allIds];
}

// Convenience mapped types for all entities with metadata attached.
export type LocalAccount = WithLocalMetadata<Account>;
export type LocalAccountGroup = WithLocalMetadata<AccountGroup>;
export type LocalAccountType = WithLocalMetadata<AccountType>;
export type LocalBudget = WithLocalMetadata<Budget>;
export type LocalExpense = WithLocalMetadata<Expense>;
export type LocalGoal = WithLocalMetadata<Goal>;
export type LocalSubscription = WithLocalMetadata<Subscription>;
export type LocalTransaction = WithLocalMetadata<Transaction>;
export type LocalTransfer = WithLocalMetadata<Transfer>;
export type LocalPersonalLoan = WithLocalMetadata<PersonalLoan>;
export type LocalProfile = WithLocalMetadata<Profile>;
export type LocalInvestment = WithLocalMetadata<Investment>;
export type LocalLoanRepayment = WithLocalMetadata<LoanRepayment>;

