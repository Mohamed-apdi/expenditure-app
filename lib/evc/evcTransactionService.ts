/**
 * Apply parsed EVC SMS to local expense + transaction stores (offline-first).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUserOfflineFirst } from "../auth";
import {
  selectAccounts,
  updateAccountLocal,
} from "../stores/accountsStore";
import {
  createExpenseLocal,
  updateExpenseLocal,
  selectExpenseById,
} from "../stores/expensesStore";
import {
  createTransactionLocal,
  updateTransactionLocal,
  selectTransactions,
  selectTransactionById,
} from "../stores/transactionsStore";
import { isOfflineGateLocked, triggerSync } from "../sync/legendSync";
import type { EvcMessageKind } from "./evcMessageClassifier";
import { parseEvcFields } from "./evcSmsParser";
import {
  buildCanonicalEvcDedupeKey,
  checkAndMarkDedupe,
} from "./evcDedupe";
import { runSerializedEvcApply } from "./evcApplySerialize";
import { resolveEvcCategory } from "./resolveEvcCategory";
import {
  getMemoryCategoryByNormalizedPhone,
  getMemoryNoteByNormalizedPhone,
} from "../stores/categoryMemoryStore";
import {
  buildEvcTransactionDescription,
  isLikelyEvcTopupLedgerMatch,
} from "./evcTransactionDescription";
import { isEvcNoteUserEdited } from "./evcNoteUserEdited";

function getDefaultAccountForUser(userId: string) {
  const accounts = selectAccounts(userId);
  const d = accounts.find((a) => a.is_default);
  return d ?? accounts[0];
}

function toDateStr(dateIso?: string): string {
  if (!dateIso) return new Date().toISOString().split("T")[0];
  try {
    return new Date(dateIso).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

const PENDING_KEY = "@evc_pending_bundle_v1";
const MATCH_WINDOW_MS = 10 * 60 * 1000;

type PendingBundle = {
  transactionId: string;
  expenseId: string;
  amount: number;
  at: number;
};

async function loadPending(): Promise<PendingBundle[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as PendingBundle[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

async function savePending(list: PendingBundle[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

/** Most recent top-up waits for NOTICE next (LIFO). */
async function pushPending(row: PendingBundle): Promise<void> {
  const now = Date.now();
  const list = (await loadPending()).filter((p) => now - p.at < MATCH_WINDOW_MS);
  list.push(row);
  await savePending(list.slice(-20));
}

async function popLatestPending(): Promise<PendingBundle | null> {
  const now = Date.now();
  const list = (await loadPending()).filter((p) => now - p.at < MATCH_WINDOW_MS);
  if (list.length === 0) return null;
  const last = list[list.length - 1];
  const rest = list.slice(0, -1);
  await savePending(rest);
  return last;
}

function memoryLookupForUser(userId: string) {
  return (normalizedPhone: string) =>
    getMemoryCategoryByNormalizedPhone(userId, normalizedPhone) ?? null;
}

function memoryNoteLookupForUser(userId: string) {
  return (normalizedPhone: string) =>
    getMemoryNoteByNormalizedPhone(userId, normalizedPhone) ?? null;
}

async function mergeBundleNoticeForUser(
  userId: string,
  summary: string,
): Promise<boolean> {
  const pending = await popLatestPending();
  if (pending) {
    if (
      (await isEvcNoteUserEdited(pending.transactionId)) ||
      (await isEvcNoteUserEdited(pending.expenseId))
    ) {
      return true;
    }
    const curTx = selectTransactionById(userId, pending.transactionId);
    const curEx = selectExpenseById(userId, pending.expenseId);
    const extra = ` · ${summary}`;
    const baseTx = (curTx?.description ?? "").trim();
    const baseEx = (curEx?.description ?? "").trim();
    updateTransactionLocal(pending.transactionId, {
      description: `${baseTx}${extra}`.trim().slice(0, 500),
    });
    updateExpenseLocal(pending.expenseId, {
      description: `${baseEx}${extra}`.trim().slice(0, 500),
    });
    if (!(await isOfflineGateLocked())) void triggerSync();
    return true;
  }

  const txs = selectTransactions(userId)
    .filter(
      (t) =>
        isLikelyEvcTopupLedgerMatch(t) &&
        Date.now() - new Date(t.created_at).getTime() < MATCH_WINDOW_MS,
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  const t0 = txs[0];
  if (!t0) return false;

  if (await isEvcNoteUserEdited(t0.id)) return true;

  const extra = ` · ${summary}`;
  const baseTx = (t0.description ?? "").trim();
  updateTransactionLocal(t0.id, {
    description: `${baseTx}${extra}`.trim().slice(0, 500),
  });

  const expenseId = t0.source_expense_id;
  if (
    expenseId &&
    !(await isEvcNoteUserEdited(expenseId))
  ) {
    const curEx = selectExpenseById(userId, expenseId);
    const baseEx = (curEx?.description ?? "").trim();
    updateExpenseLocal(expenseId, {
      description: `${baseEx}${extra}`.trim().slice(0, 500),
    });
  }

  if (!(await isOfflineGateLocked())) void triggerSync();
  return true;
}

/**
 * Process a single SMS after classifier + parser. Returns true if ledger was updated.
 */
export async function applyEvcSmsToLedger(input: {
  sender: string;
  body: string;
  kind: EvcMessageKind;
}): Promise<boolean> {
  return runSerializedEvcApply(() => applyEvcSmsToLedgerInner(input));
}

async function applyEvcSmsToLedgerInner(input: {
  sender: string;
  body: string;
  kind: EvcMessageKind;
}): Promise<boolean> {
  const { sender, body, kind } = input;
  if (kind === "ignored") return false;

  const user = await getCurrentUserOfflineFirst();
  if (!user) {
    console.log("[EVC SMS] skip: no user session");
    return false;
  }

  const account = getDefaultAccountForUser(user.id);
  if (!account) {
    console.log("[EVC SMS] skip: no account");
    return false;
  }

  const parsed = parseEvcFields(kind, body);
  console.log("[EVC SMS] parsed", {
    kind,
    amount: parsed.amount,
    dateIso: parsed.dateIso,
    hasNotice: !!parsed.noticeSummary,
  });

  if (kind === "bundle_notice") {
    const summary = parsed.noticeSummary;
    if (!summary) return false;
    return mergeBundleNoticeForUser(user.id, summary);
  }

  const amount = parsed.amount;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    console.log("[EVC SMS] skip: invalid amount", { amount });
    return false;
  }

  const dedupeKey = buildCanonicalEvcDedupeKey({
    sender,
    kind,
    amount,
    dateIso: parsed.dateIso,
    tarRaw: parsed.tarRaw,
    phone: parsed.phone,
    merchantName: parsed.merchantName,
    counterpartyName: parsed.counterpartyName,
  });
  if (await checkAndMarkDedupe(dedupeKey)) {
    console.log("[EVC SMS] skip: deduped");
    return false;
  }

  const dateStr = toDateStr(parsed.dateIso);

  if (kind === "receive") {
    const evc = resolveEvcCategory({
      kind: "receive",
      phoneRaw: parsed.phone,
      lookupMemory: memoryLookupForUser(user.id),
      lookupNote: memoryNoteLookupForUser(user.id),
    });
    const description =
      evc.description ??
      buildEvcTransactionDescription(kind, {
        phone: parsed.phone,
        counterpartyName: parsed.counterpartyName,
        merchantName: parsed.merchantName,
      });
    const exp = createExpenseLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      category: evc.category,
      description,
      date: dateStr,
      is_recurring: false,
      is_essential: false,
      entry_type: "Income",
      evc_kind: evc.evc_kind,
      evc_counterparty_phone: evc.evc_counterparty_phone,
    });
    createTransactionLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      description,
      date: dateStr,
      category: evc.category,
      is_recurring: false,
      type: "income",
      evc_kind: evc.evc_kind,
      evc_counterparty_phone: evc.evc_counterparty_phone,
      source_expense_id: exp.id,
      source: "evc",
    });
    updateAccountLocal(account.id, { amount: account.amount + amount });
    if (!(await isOfflineGateLocked())) void triggerSync();
    return true;
  }

  if (kind === "topup") {
    const description = buildEvcTransactionDescription(kind, {
      phone: parsed.phone,
      counterpartyName: parsed.counterpartyName,
      merchantName: parsed.merchantName,
    });
    const categoryExpense = "electronics";
    const exp = createExpenseLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      category: categoryExpense,
      description,
      date: dateStr,
      is_recurring: false,
      is_essential: false,
      entry_type: "Expense",
    });
    const tx = createTransactionLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      description,
      date: dateStr,
      category: categoryExpense,
      is_recurring: false,
      type: "expense",
      source_expense_id: exp.id,
      source: "evc",
    });
    updateAccountLocal(account.id, { amount: account.amount - amount });
    await pushPending({
      transactionId: tx.id,
      expenseId: exp.id,
      amount,
      at: Date.now(),
    });
    if (!(await isOfflineGateLocked())) void triggerSync();
    return true;
  }

  const evc = resolveEvcCategory({
    kind,
    merchantName: parsed.merchantName,
    phoneRaw: parsed.phone,
    lookupMemory: memoryLookupForUser(user.id),
    lookupNote: memoryNoteLookupForUser(user.id),
  });
  const description =
    evc.description ??
    buildEvcTransactionDescription(kind, {
      phone: parsed.phone,
      counterpartyName: parsed.counterpartyName,
      merchantName: parsed.merchantName,
    });

  const exp = createExpenseLocal({
    user_id: user.id,
    account_id: account.id,
    amount,
    category: evc.category,
    description,
    date: dateStr,
    is_recurring: false,
    is_essential: false,
    entry_type: "Expense",
    evc_kind: evc.evc_kind,
    evc_counterparty_phone: evc.evc_counterparty_phone,
  });
  createTransactionLocal({
    user_id: user.id,
    account_id: account.id,
    amount,
    description,
    date: dateStr,
    category: evc.category,
    is_recurring: false,
    type: "expense",
    evc_kind: evc.evc_kind,
    evc_counterparty_phone: evc.evc_counterparty_phone,
    source_expense_id: exp.id,
    source: "evc",
  });
  updateAccountLocal(account.id, { amount: account.amount - amount });

  if (!(await isOfflineGateLocked())) void triggerSync();
  return true;
}

/** Whether a native-queue row may be deleted after processing. */
export type NativeEvcQueueResult =
  | "applied"
  | "skipped_duplicate"
  | "deferred";

export type NativeEvcPendingRow = {
  sender: string;
  kind: EvcMessageKind;
  amount?: number | null;
  dateIso?: string | null;
  tarRaw?: string | null;
  phone?: string | null;
  name?: string | null;
  merchantName?: string | null;
  noticeSummary?: string | null;
};

/**
 * Apply a parsed row captured natively (when JS was not running).
 * No full SMS content is required or persisted.
 */
export async function applyNativeEvcRowToLedger(
  row: NativeEvcPendingRow,
): Promise<NativeEvcQueueResult> {
  return runSerializedEvcApply(() => applyNativeEvcRowToLedgerInner(row));
}

async function applyNativeEvcRowToLedgerInner(
  row: NativeEvcPendingRow,
): Promise<NativeEvcQueueResult> {
  const kind = row.kind;
  if (kind === "ignored") return "skipped_duplicate";

  const user = await getCurrentUserOfflineFirst();
  if (!user) return "deferred";

  const account = getDefaultAccountForUser(user.id);
  if (!account) return "deferred";

  if (kind === "bundle_notice") {
    const summary = row.noticeSummary?.trim();
    if (!summary) return "skipped_duplicate";
    const ok = await mergeBundleNoticeForUser(user.id, summary);
    return ok ? "applied" : "deferred";
  }

  const amount = row.amount ?? undefined;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return "skipped_duplicate";
  }

  const nativeDedupeKey = buildCanonicalEvcDedupeKey({
    sender: row.sender,
    kind,
    amount,
    dateIso: row.dateIso ?? undefined,
    tarRaw: row.tarRaw ?? undefined,
    phone: row.phone ?? undefined,
    merchantName: row.merchantName ?? undefined,
    counterpartyName: row.name ?? undefined,
  });
  if (await checkAndMarkDedupe(nativeDedupeKey)) {
    console.log("[EVC SMS] native row skip: deduped");
    return "skipped_duplicate";
  }

  const dateStr = toDateStr(row.dateIso ?? undefined);

  if (kind === "receive") {
    const evc = resolveEvcCategory({
      kind: "receive",
      phoneRaw: row.phone ?? undefined,
      lookupMemory: memoryLookupForUser(user.id),
      lookupNote: memoryNoteLookupForUser(user.id),
    });
    const description =
      evc.description ??
      buildEvcTransactionDescription(kind, {
        phone: row.phone,
        name: row.name,
        merchantName: row.merchantName,
      });
    const exp = createExpenseLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      category: evc.category,
      description,
      date: dateStr,
      is_recurring: false,
      is_essential: false,
      entry_type: "Income",
      evc_kind: evc.evc_kind,
      evc_counterparty_phone: evc.evc_counterparty_phone,
    });
    createTransactionLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      description,
      date: dateStr,
      category: evc.category,
      is_recurring: false,
      type: "income",
      evc_kind: evc.evc_kind,
      evc_counterparty_phone: evc.evc_counterparty_phone,
      source_expense_id: exp.id,
      source: "evc",
    });
    updateAccountLocal(account.id, { amount: account.amount + amount });
    if (!(await isOfflineGateLocked())) void triggerSync();
    return "applied";
  }

  if (kind === "topup") {
    const description = buildEvcTransactionDescription(kind, {
      phone: row.phone,
      name: row.name,
      merchantName: row.merchantName,
    });
    const categoryExpense = "electronics";
    const exp = createExpenseLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      category: categoryExpense,
      description,
      date: dateStr,
      is_recurring: false,
      is_essential: false,
      entry_type: "Expense",
    });
    const tx = createTransactionLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      description,
      date: dateStr,
      category: categoryExpense,
      is_recurring: false,
      type: "expense",
      source_expense_id: exp.id,
      source: "evc",
    });
    updateAccountLocal(account.id, { amount: account.amount - amount });
    await pushPending({
      transactionId: tx.id,
      expenseId: exp.id,
      amount,
      at: Date.now(),
    });
    if (!(await isOfflineGateLocked())) void triggerSync();
    return "applied";
  }

  const evc = resolveEvcCategory({
    kind,
    merchantName: row.merchantName ?? undefined,
    phoneRaw: row.phone ?? undefined,
    lookupMemory: memoryLookupForUser(user.id),
    lookupNote: memoryNoteLookupForUser(user.id),
  });
  const description =
    evc.description ??
    buildEvcTransactionDescription(kind, {
      phone: row.phone,
      name: row.name,
      merchantName: row.merchantName,
    });

  const exp = createExpenseLocal({
    user_id: user.id,
    account_id: account.id,
    amount,
    category: evc.category,
    description,
    date: dateStr,
    is_recurring: false,
    is_essential: false,
    entry_type: "Expense",
    evc_kind: evc.evc_kind,
    evc_counterparty_phone: evc.evc_counterparty_phone,
  });
  createTransactionLocal({
    user_id: user.id,
    account_id: account.id,
    amount,
    description,
    date: dateStr,
    category: evc.category,
    is_recurring: false,
    type: "expense",
    evc_kind: evc.evc_kind,
    evc_counterparty_phone: evc.evc_counterparty_phone,
    source_expense_id: exp.id,
    source: "evc",
  });
  updateAccountLocal(account.id, { amount: account.amount - amount });

  if (!(await isOfflineGateLocked())) void triggerSync();
  return "applied";
}
