import type { EvcMessageKind } from "./evcMessageClassifier";

export type EvcDescriptionFields = {
  phone?: string | null;
  counterpartyName?: string | null;
  /** Native pending rows use `name` for P2P payee */
  name?: string | null;
  merchantName?: string | null;
};

/**
 * Human-facing transaction description for new EVC rows (counterparty / merchant / phone only).
 */
export function buildEvcTransactionDescription(
  kind: EvcMessageKind,
  fields: EvcDescriptionFields,
): string {
  const phone = fields.phone?.trim() || undefined;
  const counterparty =
    fields.counterpartyName?.trim() || fields.name?.trim() || undefined;
  const merchant = fields.merchantName?.trim() || undefined;

  switch (kind) {
    case "send_p2p":
      return counterparty || phone || "Transfer";
    case "send_merchant":
      return merchant || phone || "Payment";
    case "receive":
      return phone || "Received";
    case "topup":
      return phone || "Airtime";
    default:
      return "Transaction";
  }
}

/**
 * Fallback match for bundle NOTICE when the pending queue is empty (e.g. process restart).
 * Avoids relying on a literal "EVC top-up" prefix in description.
 */
export function isLikelyEvcTopupLedgerMatch(transaction: {
  type: string;
  category?: string | null;
  description?: string | null;
}): boolean {
  if (transaction.type !== "expense") return false;
  if (String(transaction.category ?? "").trim() !== "electronics") return false;
  const d = String(transaction.description ?? "").trim();
  if (!d) return false;
  const compact = d.replace(/\s/g, "");
  if (/^\+?\d{9,15}$/.test(compact)) return true;
  if (d === "Airtime" || d === "Top-up") return true;
  return false;
}
