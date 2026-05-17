/**
 * Apply parsed EVC SMS to local expense + transaction stores (offline-first).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUserOfflineFirst } from "../auth";
import { selectAccounts, updateAccountLocal } from "../stores/accountsStore";
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
import { parseEvcFields } from "./evcSmsParser";
import { buildCanonicalSmsDedupeKey, checkAndMarkDedupe } from "./evcDedupe";
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
import { buildSmsImportTransactionDescription } from "../sms/smsImportTransactionDescription";
import { isEvcNoteUserEdited } from "./evcNoteUserEdited";
import { parseSmsTransaction } from "../sms/providers/parseSmsTransaction";
import type { SmsParsedTransaction } from "../sms/providers/types";
import { SMS_TRANSFER_TO_BANK_LABEL } from "../sms/providers/types";
import type { SmsProvider } from "../sms/providers/types";
import { resolveSmsImportTargetAccount } from "../sms/resolveSmsImportAccount";
import {
  classifyEvcMessage,
  normalizeSender,
  passesContentFilter,
  type EvcMessageKind,
} from "./evcMessageClassifier";
import type { Account } from "../types/types";
import { notifySmsImportRecordedIfEligible } from "./smsImportRecordedNotification";

function notifySmsImportSuccess(
  userId: string,
  entryType: "income" | "expense",
  amount: number,
  parsed: SmsParsedTransaction,
  account: { id: string; amount: number; name?: string; currency?: string },
  meta?: { ledgerCategory?: string | null; ledgerDescription?: string | null },
) {
  const a = account as Account;
  void notifySmsImportRecordedIfEligible(userId, {
    entryType,
    amount,
    parsed,
    accountName: a.name ?? "",
    accountCurrency: a.currency ?? "USD",
    ledgerCategory: meta?.ledgerCategory,
    ledgerDescription: meta?.ledgerDescription,
  });
}

function getDefaultAccountForUser(userId: string) {
  const accounts = selectAccounts(userId);
  const d = accounts.find((a) => a.is_default);
  return d ?? accounts[0];
}

function slotIndexToSim(
  slot: number | null | undefined,
): "sim1" | "sim2" | null {
  // We only treat 0/1 as authoritative slot indices.
  // If a device reports 1/2, Android receiver now derives 0/1 from subId via SubscriptionManager.
  if (slot === 0) return "sim1";
  if (slot === 1) return "sim2";
  return null;
}

function ledgerSourceFromProvider(
  p: SmsProvider,
): "evc" | "somnet_jeeb" | "salaam_bank" | "somtel_edahab" {
  return p;
}

function legacyParsedFromEvcFields(
  kind: EvcMessageKind,
  body: string,
): SmsParsedTransaction {
  const f = parseEvcFields(kind, body);
  return {
    provider: "evc",
    kind,
    amount: f.amount,
    dateIso: f.dateIso,
    tarRaw: f.tarRaw ?? null,
    phone: f.phone ?? null,
    name: f.counterpartyName ?? null,
    merchantName: f.merchantName ?? null,
    balance: f.balanceAfter ?? null,
    noticeSummary: f.noticeSummary ?? null,
  };
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
  const list = (await loadPending()).filter(
    (p) => now - p.at < MATCH_WINDOW_MS,
  );
  list.push(row);
  await savePending(list.slice(-20));
}

async function popLatestPending(): Promise<PendingBundle | null> {
  const now = Date.now();
  const list = (await loadPending()).filter(
    (p) => now - p.at < MATCH_WINDOW_MS,
  );
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
  if (expenseId && !(await isEvcNoteUserEdited(expenseId))) {
    const curEx = selectExpenseById(userId, expenseId);
    const baseEx = (curEx?.description ?? "").trim();
    updateExpenseLocal(expenseId, {
      description: `${baseEx}${extra}`.trim().slice(0, 500),
    });
  }

  if (!(await isOfflineGateLocked())) void triggerSync();
  return true;
}

/** Apply fully parsed multi-provider SMS to the ledger. */
export async function applySmsImportToLedger(input: {
  parsed: SmsParsedTransaction;
  sender: string;
  slot?: number | null;
}): Promise<boolean> {
  return runSerializedEvcApply(() => applySmsImportLedgerRow(input));
}

/**
 * Process a single SMS after classifier + parser. Returns true if ledger was updated.
 * @deprecated Prefer {@link applySmsImportToLedger} with {@link parseSmsTransaction}.
 */
export async function applyEvcSmsToLedger(input: {
  sender: string;
  body: string;
  kind: EvcMessageKind;
  slot?: number | null;
  subId?: number | null;
}): Promise<boolean> {
  return runSerializedEvcApply(() => applyEvcSmsToLedgerInner(input));
}

async function applyEvcSmsToLedgerInner(input: {
  sender: string;
  body: string;
  kind: EvcMessageKind;
  slot?: number | null;
  subId?: number | null;
}): Promise<boolean> {
  const { sender, body, kind, slot } = input;
  if (kind === "ignored") return false;

  let parsed = parseSmsTransaction(sender, body);
  if (!parsed || parsed.kind === "ignored") {
    const n = normalizeSender(sender);
    if (!passesContentFilter(n, body)) return false;
    const k = classifyEvcMessage(n, body);
    if (k === "ignored") return false;
    parsed = legacyParsedFromEvcFields(k, body);
  }

  return applySmsImportLedgerRow({ parsed, sender, slot });
}

async function applySmsImportLedgerRow(input: {
  parsed: SmsParsedTransaction;
  sender: string;
  slot?: number | null;
  /** When set (e.g. native queue), skip session resolve — caller must verify user/account. */
  preloaded?: { userId: string; account: { id: string; amount: number } };
  /** When true, skip JS "recorded" notification (native already showed "Transaction captured"). */
  suppressImportRecordedNotification?: boolean;
}): Promise<boolean> {
  const {
    parsed,
    sender,
    slot,
    preloaded,
    suppressImportRecordedNotification,
  } = input;
  const skipRecordedNotify = suppressImportRecordedNotification === true;
  if (parsed.kind === "ignored") return false;

  const user = preloaded
    ? { id: preloaded.userId }
    : await getCurrentUserOfflineFirst();
  if (!user) {
    console.log("[SMS import] skip: no user session");
    return false;
  }

  const account =
    preloaded?.account ??
    (await resolveSmsImportTargetAccount({
      userId: user.id,
      provider: parsed.provider,
      slot: slot ?? null,
    }));
  if (!account) {
    console.log("[SMS import] skip: no account");
    return false;
  }

  console.log("[SMS import] parsed", {
    provider: parsed.provider,
    kind: parsed.kind,
    rawType: parsed.rawType,
    amount: parsed.amount,
  });

  if (parsed.kind === "bundle_notice") {
    const summary = parsed.noticeSummary?.trim();
    if (!summary) return false;
    return mergeBundleNoticeForUser(user.id, summary);
  }

  const amount = parsed.amount;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    console.log("[SMS import] skip: invalid amount", { amount });
    return false;
  }

  const dedupeKey = buildCanonicalSmsDedupeKey({
    provider: parsed.provider,
    sender,
    kind: parsed.kind,
    amount,
    dateIso: parsed.dateIso,
    tarRaw: parsed.tarRaw,
    phone: parsed.phone,
    merchantName: parsed.merchantName,
    counterpartyName: parsed.name,
    rawType: parsed.rawType,
    reference: parsed.reference,
    transactionId: parsed.transactionId,
    accountNumber: parsed.accountNumber,
    balance: parsed.balance ?? null,
  });
  if (await checkAndMarkDedupe(dedupeKey)) {
    console.log("[SMS import] skip: deduped");
    return false;
  }

  const dateStr = toDateStr(parsed.dateIso);
  const src = ledgerSourceFromProvider(parsed.provider);

  if (parsed.kind === "receive") {
    const evc = resolveEvcCategory({
      kind: "receive",
      phoneRaw: parsed.phone ?? undefined,
      lookupMemory: memoryLookupForUser(user.id),
      lookupNote: memoryNoteLookupForUser(user.id),
    });
    const description =
      (parsed.note && parsed.note.trim().length > 0 ? parsed.note : null) ??
      evc.description ??
      buildSmsImportTransactionDescription(parsed);
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
      source: src,
    });
    updateAccountLocal(account.id, { amount: account.amount + amount });
    if (!skipRecordedNotify) {
      notifySmsImportSuccess(user.id, "income", amount, parsed, account, {
        ledgerCategory: evc.category ?? null,
        ledgerDescription: description,
      });
    }
    if (!(await isOfflineGateLocked())) void triggerSync();
    return true;
  }

  if (parsed.kind === "topup") {
    const description = buildEvcTransactionDescription("topup", {
      phone: parsed.phone,
      name: parsed.name,
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
      source: src,
    });
    updateAccountLocal(account.id, { amount: account.amount - amount });
    if (!skipRecordedNotify) {
      notifySmsImportSuccess(user.id, "expense", amount, parsed, account, {
        ledgerCategory: categoryExpense,
        ledgerDescription: description,
      });
    }
    await pushPending({
      transactionId: tx.id,
      expenseId: exp.id,
      amount,
      at: Date.now(),
    });
    if (!(await isOfflineGateLocked())) void triggerSync();
    return true;
  }

  if (parsed.rawType === "evc_to_bank") {
    const label = SMS_TRANSFER_TO_BANK_LABEL;
    const exp = createExpenseLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      category: label,
      description: label,
      date: dateStr,
      is_recurring: false,
      is_essential: false,
      entry_type: "Expense",
      evc_kind: "transfer",
      evc_counterparty_phone: null,
    });
    createTransactionLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      description: label,
      date: dateStr,
      category: label,
      is_recurring: false,
      type: "expense",
      evc_kind: "transfer",
      evc_counterparty_phone: null,
      source_expense_id: exp.id,
      source: src,
    });
    updateAccountLocal(account.id, { amount: account.amount - amount });
    if (!skipRecordedNotify) {
      notifySmsImportSuccess(user.id, "expense", amount, parsed, account, {
        ledgerCategory: label,
        ledgerDescription: label,
      });
    }
    if (!(await isOfflineGateLocked())) void triggerSync();
    return true;
  }

  const evc = resolveEvcCategory({
    kind: parsed.kind,
    merchantName: parsed.merchantName ?? undefined,
    phoneRaw: parsed.phone ?? undefined,
    lookupMemory: memoryLookupForUser(user.id),
    lookupNote: memoryNoteLookupForUser(user.id),
  });
  const description =
    evc.description ??
    buildSmsImportTransactionDescription(parsed);

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
    source: src,
  });
  updateAccountLocal(account.id, { amount: account.amount - amount });
  if (!skipRecordedNotify) {
    notifySmsImportSuccess(user.id, "expense", amount, parsed, account, {
      ledgerCategory: evc.category ?? null,
      ledgerDescription: description,
    });
  }

  if (!(await isOfflineGateLocked())) void triggerSync();
  return true;
}

/** Whether a native-queue row may be deleted after processing. */
export type NativeEvcQueueResult = "applied" | "skipped_duplicate" | "deferred";

export type NativeEvcPendingRow = {
  provider?: string | null;
  sender: string;
  kind: EvcMessageKind;
  amount?: number | null;
  dateIso?: string | null;
  tarRaw?: string | null;
  phone?: string | null;
  name?: string | null;
  merchantName?: string | null;
  noticeSummary?: string | null;
  subId?: number | null;
  slot?: number | null;
  rawType?: string | null;
  reference?: string | null;
  transactionId?: string | null;
  accountNumber?: string | null;
  balance?: number | null;
  currency?: string | null;
  note?: string | null;
  /** From native queue: user already saw "Transaction captured" notification. */
  capturedNotificationShown?: boolean | number | null;
};

function nativeRowToParsed(row: NativeEvcPendingRow): SmsParsedTransaction {
  const provider = (row.provider as SmsProvider) || "evc";
  return {
    provider,
    kind: row.kind,
    amount: row.amount ?? undefined,
    dateIso: row.dateIso ?? undefined,
    tarRaw: row.tarRaw ?? null,
    phone: row.phone ?? null,
    name: row.name ?? null,
    merchantName: row.merchantName ?? null,
    noticeSummary: row.noticeSummary ?? null,
    rawType: row.rawType ?? undefined,
    reference: row.reference ?? null,
    transactionId: row.transactionId ?? null,
    accountNumber: row.accountNumber ?? null,
    balance: row.balance ?? null,
    currency:
      row.currency === "SOS" || row.currency === "USD"
        ? row.currency
        : undefined,
    note: row.note ?? null,
  };
}

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
  const parsed = nativeRowToParsed(row);
  if (parsed.kind === "ignored") return "skipped_duplicate";

  const user = await getCurrentUserOfflineFirst();
  if (!user) return "deferred";

  const account = await resolveSmsImportTargetAccount({
    userId: user.id,
    provider: parsed.provider,
    slot: row.slot ?? null,
  });
  if (!account) return "deferred";

  const suppressRecorded =
    row.capturedNotificationShown === true ||
    row.capturedNotificationShown === 1;

  const ok = await applySmsImportLedgerRow({
    parsed,
    sender: row.sender,
    slot: row.slot ?? null,
    preloaded: { userId: user.id, account },
    suppressImportRecordedNotification: suppressRecorded,
  });
  return ok ? "applied" : "skipped_duplicate";
}
