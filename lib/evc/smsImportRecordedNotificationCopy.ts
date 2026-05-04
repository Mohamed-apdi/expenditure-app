/**
 * Pure copy for SMS import success notifications (no Expo / native deps).
 * Uses Intl locally so Jest does not pull the full reports/accounts graph.
 */

import type { SmsCurrency, SmsParsedTransaction } from "~/lib/sms/providers/types";
import type { SmsProvider } from "~/lib/sms/providers/types";

function formatMoney(amount: number, currency: string): string {
  const c = currency?.trim() || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c.length === 3 ? c : "USD",
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
}

export function shortProviderLabel(provider: SmsProvider): string {
  switch (provider) {
    case "evc":
      return "EVC";
    case "somnet_jeeb":
      return "Somnet/JEEB";
    case "salaam_bank":
      return "Salaam Bank";
    case "somtel":
      return "Somtel";
    default:
      return "Wallet";
  }
}

function isSmsCurrency(c: string | undefined): c is SmsCurrency {
  return c === "USD" || c === "SOS";
}

function amountCurrency(parsed: SmsParsedTransaction, accountCurrency: string): string {
  if (parsed.currency && isSmsCurrency(parsed.currency)) return parsed.currency;
  if (accountCurrency?.trim()) return accountCurrency.trim();
  return "USD";
}

/** Short counterparty for notification — no raw SMS. */
export function counterpartyDisplay(parsed: SmsParsedTransaction): string {
  const n = parsed.name?.trim();
  if (n) return n;
  const m = parsed.merchantName?.trim();
  if (m) return m;
  const digits = (parsed.phone ?? "").replace(/\D/g, "");
  if (digits.length >= 4) return `···${digits.slice(-4)}`;
  return "Unknown";
}

/** Label for balance / “Added to” tail: mapped account name, else provider short name. */
export function smsImportTailLabel(accountName: string, provider: SmsProvider): string {
  const trimmed = accountName?.trim();
  if (trimmed) return trimmed;
  return shortProviderLabel(provider);
}

export type SmsImportNotificationInput = {
  entryType: "income" | "expense";
  amount: number;
  parsed: SmsParsedTransaction;
  accountName: string;
  accountCurrency: string;
  /** Raw category id/label as stored on the ledger row (resolved to a label in the notify layer). */
  ledgerCategory?: string | null;
  ledgerDescription?: string | null;
  /**
   * Human category label (e.g. from category memory). When non-empty, the body matches
   * in-app treatment: amount · category · optional note, then balance tail.
   */
  resolvedCategoryLabel?: string;
  /** Trimmed ledger description (memory note + app text); truncated here. */
  ledgerDescriptionTrimmed?: string;
};

const MAX_DESC_IN_NOTIFICATION = 52;

function clipDescriptionForNotify(s: string): string {
  const t = s.trim();
  if (!t) return "";
  if (t.length <= MAX_DESC_IN_NOTIFICATION) return t;
  return `${t.slice(0, MAX_DESC_IN_NOTIFICATION - 1)}…`;
}

/** Omit description segment if it only repeats the counterparty name (SMS line). */
function descriptionNoteForBody(
  descTrim: string,
  parsed: SmsParsedTransaction,
): string {
  if (!descTrim) return "";
  const who = counterpartyDisplay(parsed);
  if (descTrim === who || descTrim.startsWith(`${who} ·`)) return "";
  return clipDescriptionForNotify(descTrim);
}

export function buildSmsImportNotificationCopy(
  input: SmsImportNotificationInput,
): { title: string; body: string } {
  const { entryType, amount, parsed, accountName, accountCurrency } = input;
  const curr = amountCurrency(parsed, accountCurrency);
  const amtStr = formatMoney(amount, curr);
  const who = counterpartyDisplay(parsed);
  const tailLabel = smsImportTailLabel(accountName, parsed.provider);

  const preposition = entryType === "income" ? "from" : "to";
  const title = entryType === "income" ? "Income recorded" : "Expense recorded";

  const bal = parsed.balance;
  const hasSmsBalance =
    bal != null && typeof bal === "number" && Number.isFinite(bal);
  const balanceCurr =
    parsed.currency && isSmsCurrency(parsed.currency) ? parsed.currency : curr;
  const tail = hasSmsBalance
    ? `• ${tailLabel} balance: ${formatMoney(bal as number, balanceCurr)}`
    : `• Added to ${tailLabel}`;

  const cat = (input.resolvedCategoryLabel ?? "").trim();
  const descRaw = (input.ledgerDescriptionTrimmed ?? "").trim();
  const descPart = descriptionNoteForBody(descRaw, parsed);

  let middle: string;
  if (cat) {
    middle = descPart ? `${amtStr} · ${cat} · ${descPart}` : `${amtStr} · ${cat}`;
  } else {
    middle = `${amtStr} ${preposition} ${who}`;
  }

  const body = `${middle} ${tail}`;
  return { title, body };
}
