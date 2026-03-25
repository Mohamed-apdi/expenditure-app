/**
 * Apply parsed EVC SMS to local expense + transaction stores (offline-first).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGES } from "../config/language/languages";
import { getCurrentUserOfflineFirst } from "../auth";
import { getExpenseCategories, getIncomeCategories } from "../utils/categories";
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
import { buildDedupeKey, checkAndMarkDedupe } from "./evcDedupe";

const EN = LANGUAGES.en;
const EXPENSE_CAT = getExpenseCategories(EN);
const INCOME_CAT = getIncomeCategories(EN);

function categoryNameForExpense(id: string): string {
  return EXPENSE_CAT.find((c) => c.id === id)?.name ?? "Shopping";
}

function categoryNameForIncome(id: string): string {
  return INCOME_CAT.find((c) => c.id === id)?.name ?? "Refunds";
}

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

function buildDescription(
  kind: EvcMessageKind,
  parsed: ReturnType<typeof parseEvcFields>,
): string {
  switch (kind) {
    case "send_p2p": {
      const n = parsed.counterpartyName || parsed.phone || "Transfer";
      return `EVC send → ${n}`;
    }
    case "send_merchant":
      return `EVC merchant ${parsed.merchantName || parsed.phone || ""}`.trim();
    case "receive":
      return `EVC receive ${parsed.phone || ""}`.trim();
    case "topup":
      return `EVC top-up ${parsed.phone || ""}`.trim();
    default:
      return "EVC";
  }
}

/**
 * Process a single SMS after classifier + parser. Returns true if ledger was updated.
 */
export async function applyEvcSmsToLedger(input: {
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

    const pending = await popLatestPending();
    if (pending) {
      const curTx = selectTransactionById(user.id, pending.transactionId);
      const curEx = selectExpenseById(user.id, pending.expenseId);
      const extra = ` · ${summary}`;
      updateTransactionLocal(pending.transactionId, {
        description: `${curTx?.description ?? "EVC"}${extra}`.slice(0, 500),
      });
      updateExpenseLocal(pending.expenseId, {
        description: `${curEx?.description ?? "EVC"}${extra}`.slice(0, 500),
      });
      if (!(await isOfflineGateLocked())) void triggerSync();
      return true;
    }

    const txs = selectTransactions(user.id)
      .filter(
        (t) =>
          (t.description?.includes("EVC top-up") ?? false) &&
          Date.now() - new Date(t.created_at).getTime() < MATCH_WINDOW_MS,
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    const t0 = txs[0];
    if (t0) {
      updateTransactionLocal(t0.id, {
        description: `${t0.description ?? "EVC"} · ${summary}`.slice(0, 500),
      });
      if (!(await isOfflineGateLocked())) void triggerSync();
      return true;
    }

    return false;
  }

  const amount = parsed.amount;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    console.log("[EVC SMS] skip: invalid amount", { amount });
    return false;
  }

  const dedupeKey = buildDedupeKey({
    sender,
    kind,
    amount,
    dateIso: parsed.dateIso,
    tarRaw: parsed.tarRaw,
    body,
  });
  if (await checkAndMarkDedupe(dedupeKey)) {
    console.log("[EVC SMS] skip: deduped");
    return false;
  }

  const dateStr = toDateStr(parsed.dateIso);
  const description = buildDescription(kind, parsed);

  if (kind === "receive") {
    const categoryIncome = categoryNameForIncome("sales");
    createExpenseLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      category: categoryIncome,
      description,
      date: dateStr,
      is_recurring: false,
      is_essential: false,
      entry_type: "Income",
    });
    createTransactionLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      description,
      date: dateStr,
      category: categoryIncome,
      is_recurring: false,
      type: "income",
    });
    updateAccountLocal(account.id, { amount: account.amount + amount });
    if (!(await isOfflineGateLocked())) void triggerSync();
    return true;
  }

  let categoryExpense = categoryNameForExpense("transport");
  if (kind === "send_merchant") categoryExpense = categoryNameForExpense("shopping");
  if (kind === "topup") categoryExpense = categoryNameForExpense("electronics");

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
  });
  updateAccountLocal(account.id, { amount: account.amount - amount });

  if (kind === "topup") {
    await pushPending({
      transactionId: tx.id,
      expenseId: exp.id,
      amount,
      at: Date.now(),
    });
  }

  if (!(await isOfflineGateLocked())) void triggerSync();
  return true;
}

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
): Promise<boolean> {
  const kind = row.kind;
  if (kind === "ignored") return false;

  const user = await getCurrentUserOfflineFirst();
  if (!user) return false;

  const account = getDefaultAccountForUser(user.id);
  if (!account) return false;

  if (kind === "bundle_notice") {
    const summary = row.noticeSummary?.trim();
    if (!summary) return false;

    const pending = await popLatestPending();
    if (pending) {
      const curTx = selectTransactionById(user.id, pending.transactionId);
      const curEx = selectExpenseById(user.id, pending.expenseId);
      const extra = ` · ${summary}`;
      updateTransactionLocal(pending.transactionId, {
        description: `${curTx?.description ?? "EVC"}${extra}`.slice(0, 500),
      });
      updateExpenseLocal(pending.expenseId, {
        description: `${curEx?.description ?? "EVC"}${extra}`.slice(0, 500),
      });
      if (!(await isOfflineGateLocked())) void triggerSync();
      return true;
    }

    const txs = selectTransactions(user.id)
      .filter(
        (t) =>
          (t.description?.includes("EVC top-up") ?? false) &&
          Date.now() - new Date(t.created_at).getTime() < MATCH_WINDOW_MS,
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    const t0 = txs[0];
    if (t0) {
      updateTransactionLocal(t0.id, {
        description: `${t0.description ?? "EVC"} · ${summary}`.slice(0, 500),
      });
      if (!(await isOfflineGateLocked())) void triggerSync();
      return true;
    }

    return false;
  }

  const amount = row.amount ?? undefined;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return false;

  const dateStr = toDateStr(row.dateIso ?? undefined);

  // Build a short description without SMS body
  const descParts: string[] = ["EVC"];
  if (kind === "receive") descParts.push("receive");
  if (kind === "send_p2p") descParts.push("send");
  if (kind === "send_merchant") descParts.push("merchant");
  if (kind === "topup") descParts.push("top-up");
  const who =
    row.merchantName ?? row.name ?? row.phone ?? (row.sender === "192" ? "" : row.sender);
  const description = `${descParts.join(" ")} ${who}`.trim();

  if (kind === "receive") {
    const categoryIncome = categoryNameForIncome("sales");
    createExpenseLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      category: categoryIncome,
      description,
      date: dateStr,
      is_recurring: false,
      is_essential: false,
      entry_type: "Income",
    });
    createTransactionLocal({
      user_id: user.id,
      account_id: account.id,
      amount,
      description,
      date: dateStr,
      category: categoryIncome,
      is_recurring: false,
      type: "income",
    });
    updateAccountLocal(account.id, { amount: account.amount + amount });
    if (!(await isOfflineGateLocked())) void triggerSync();
    return true;
  }

  let categoryExpense = categoryNameForExpense("transport");
  if (kind === "send_merchant") categoryExpense = categoryNameForExpense("shopping");
  if (kind === "topup") categoryExpense = categoryNameForExpense("electronics");

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
  });
  updateAccountLocal(account.id, { amount: account.amount - amount });

  if (kind === "topup") {
    await pushPending({
      transactionId: tx.id,
      expenseId: exp.id,
      amount,
      at: Date.now(),
    });
  }

  if (!(await isOfflineGateLocked())) void triggerSync();
  return true;
}
