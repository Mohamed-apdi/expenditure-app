import type { Transaction } from "../types/types";

export type LedgerSource = "evc" | "somnet_jeeb" | "salaam_bank" | "somtel";

const SMS_SOURCES: readonly LedgerSource[] = [
  "evc",
  "somnet_jeeb",
  "salaam_bank",
  "somtel",
];

function isLedgerSource(s: string | undefined): s is LedgerSource {
  return s != null && (SMS_SOURCES as readonly string[]).includes(s);
}

/**
 * SMS-import-backed ledger row: explicit `source` or legacy inference from EVC columns.
 */
export function getTransactionSource(
  tx: Pick<Transaction, "source" | "evc_kind" | "evc_counterparty_phone">,
): LedgerSource | undefined {
  if (isLedgerSource(tx.source)) return tx.source;
  if (tx.evc_kind != null || tx.evc_counterparty_phone) return "evc";
  return undefined;
}

/** List subtitle: resolved category label + direction + channel. */
export function formatEvcCategoryChannelSubtitle(
  categoryLabel: string,
  type: "expense" | "income" | "transfer",
  labels: { sentViaEvc: string; receivedViaEvc: string },
  source?: LedgerSource,
): string {
  let channel: string;
  if (source === "somnet_jeeb") channel = "Somnet";
  else if (source === "salaam_bank") channel = "Salaam Bank";
  else if (source === "somtel") channel = "Somtel";
  else if (type === "income") channel = labels.receivedViaEvc;
  else if (type === "expense") channel = labels.sentViaEvc;
  else channel = "EVC";
  return `${categoryLabel} • ${channel}`;
}

export function evcDetailViaLabel(
  tx: Pick<Transaction, "type">,
  labels: { sentViaEvc: string; receivedViaEvc: string },
  source?: LedgerSource,
): string | null {
  if (source === "somnet_jeeb") return "Somnet";
  if (source === "salaam_bank") return "Salaam Bank";
  if (source === "somtel") return "Somtel";
  if (tx.type === "income") return labels.receivedViaEvc;
  if (tx.type === "expense") return labels.sentViaEvc;
  return null;
}
