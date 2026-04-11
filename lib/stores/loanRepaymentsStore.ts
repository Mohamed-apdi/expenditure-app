import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { LoanRepayment } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalLoanRepayment,
  ensureId,
  markPending,
  nowIso,
  softDelete,
} from "./storeUtils";

export interface LoanRepaymentsState {
  byId: Record<string, LocalLoanRepayment>;
  allIds: string[];
}

const initialState: LoanRepaymentsState = {
  byId: {},
  allIds: [],
};

export const loanRepayments$ = observable<LoanRepaymentsState>(initialState);

legendPersist(loanRepayments$, "loan_repayments");

function sortIds(
  ids: string[],
  byId: Record<string, LocalLoanRepayment>
): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.created_at ?? "";
    const bDate = bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function selectLoanRepayments(loanId: string): LocalLoanRepayment[] {
  const state = loanRepayments$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is LocalLoanRepayment =>
        !!row && row.loan_id === loanId && row.deleted_at == null
    );
}

export function selectLoanRepaymentById(
  id: string
): LocalLoanRepayment | undefined {
  const row = loanRepayments$.get().byId[id];
  if (!row || row.deleted_at != null) return undefined;
  return row;
}

export function createLoanRepaymentLocal(
  data: Omit<LoanRepayment, "id" | "created_at"> & {
    id?: string;
  }
): LocalLoanRepayment {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalLoanRepayment = {
    id,
    loan_id: data.loan_id,
    amount: data.amount,
    payment_date: data.payment_date,
    created_at: now,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  loanRepayments$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function deleteLoanRepaymentLocal(id: string): void {
  loanRepayments$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}
