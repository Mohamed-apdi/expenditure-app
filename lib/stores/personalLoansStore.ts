import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type { PersonalLoan } from "../types/types";
import { legendPersist } from "./legendPersist";
import {
  LocalPersonalLoan,
  ensureId,
  markPending,
  nowIso,
  safeMerge,
  softDelete,
} from "./storeUtils";

export interface PersonalLoansState {
  byId: Record<string, LocalPersonalLoan>;
  allIds: string[];
}

const initialState: PersonalLoansState = {
  byId: {},
  allIds: [],
};

export const personalLoans$ = observable<PersonalLoansState>(initialState);

legendPersist(personalLoans$, "personal_loans");

function sortIds(
  ids: string[],
  byId: Record<string, LocalPersonalLoan>
): string[] {
  return [...ids].sort((a, b) => {
    const aRow = byId[a];
    const bRow = byId[b];
    const aDate = aRow?.created_at ?? "";
    const bDate = bRow?.created_at ?? "";
    return bDate.localeCompare(aDate);
  });
}

export function selectPersonalLoans(userId: string): LocalPersonalLoan[] {
  const state = personalLoans$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is LocalPersonalLoan =>
        !!row && row.user_id === userId && row.deleted_at == null
    );
}

export function selectPersonalLoanById(
  userId: string,
  id: string
): LocalPersonalLoan | undefined {
  const row = personalLoans$.get().byId[id];
  if (!row || row.deleted_at != null || row.user_id !== userId) return undefined;
  return row;
}

export function createPersonalLoanLocal(
  data: Omit<PersonalLoan, "id" | "created_at" | "updated_at"> & {
    id?: string;
  }
): LocalPersonalLoan {
  const now = nowIso();
  const id = data.id ?? uuidv4();

  const base: LocalPersonalLoan = {
    id,
    user_id: data.user_id,
    account_id: data.account_id,
    type: data.type,
    party_name: data.party_name,
    principal_amount: data.principal_amount,
    remaining_amount: data.remaining_amount,
    interest_rate: data.interest_rate,
    due_date: data.due_date,
    status: data.status,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    __local_status: "pending",
    __local_updated_at: now,
    __last_error: null,
    __remote_updated_at: null,
  };

  const row = markPending(base);

  personalLoans$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(ensureId(state.allIds, id), nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function updatePersonalLoanLocal(
  id: string,
  patch: Partial<Omit<PersonalLoan, "id" | "created_at">>
): LocalPersonalLoan | undefined {
  let updated: LocalPersonalLoan | undefined;

  personalLoans$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const now = nowIso();
    const merged = safeMerge<LocalPersonalLoan>(existing, {
      ...patch,
      updated_at: now,
    } as Partial<LocalPersonalLoan>);

    const row = markPending(merged);
    updated = row;

    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return updated;
}

export function deletePersonalLoanLocal(id: string): void {
  personalLoans$.set((state) => {
    const existing = state.byId[id];
    if (!existing) return state;

    const row = softDelete(existing);
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = sortIds(state.allIds, nextById);
    return { ...state, byId: nextById, allIds: nextAllIds };
  });
}

