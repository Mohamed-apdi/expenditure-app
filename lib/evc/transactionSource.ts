import type { Transaction } from "../types/types";

export type LedgerSource = "evc";

/**
 * EVC-backed ledger row: explicit `source` or legacy inference from EVC columns.
 * Not synced to Supabase until a `source` column exists; persists locally in Legend.
 */
export function getTransactionSource(
  tx: Pick<Transaction, "source" | "evc_kind" | "evc_counterparty_phone">,
): LedgerSource | undefined {
  if (tx.source === "evc") return "evc";
  if (tx.evc_kind != null || tx.evc_counterparty_phone) return "evc";
  return undefined;
}

/** List subtitle: resolved category label + direction + EVC (e.g. "Food • Sent via EVC"). */
export function formatEvcCategoryChannelSubtitle(
  categoryLabel: string,
  type: "expense" | "income" | "transfer",
  labels: { sentViaEvc: string; receivedViaEvc: string },
): string {
  const channel =
    type === "income"
      ? labels.receivedViaEvc
      : type === "expense"
        ? labels.sentViaEvc
        : "EVC";
  return `${categoryLabel} • ${channel}`;
}

export function evcDetailViaLabel(
  tx: Pick<Transaction, "type">,
  labels: { sentViaEvc: string; receivedViaEvc: string },
): string | null {
  if (tx.type === "income") return labels.receivedViaEvc;
  if (tx.type === "expense") return labels.sentViaEvc;
  return null;
}
