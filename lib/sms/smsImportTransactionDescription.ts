import type { EvcMessageKind } from "~/lib/evc/evcMessageClassifier";
import { buildEvcTransactionDescription } from "~/lib/evc/evcTransactionDescription";
import type { SmsParsedTransaction } from "~/lib/sms/providers/types";

/**
 * Ledger description for SMS-imported rows (provider-specific copy where needed).
 */
export function buildSmsImportTransactionDescription(
  parsed: Pick<SmsParsedTransaction, "provider" | "kind" | "name" | "phone" | "merchantName">,
): string {
  const name = parsed.name?.trim();
  const phone = parsed.phone?.trim();

  if (parsed.provider === "somtel_edahab") {
    if (parsed.kind === "receive") {
      return name ? `Received from ${name}` : phone || "Received";
    }
    if (parsed.kind === "send_p2p" || parsed.kind === "send_merchant") {
      return name ? `Sent to ${name}` : phone || "Transfer";
    }
  }

  return buildEvcTransactionDescription(parsed.kind as EvcMessageKind, {
    name: parsed.name,
    phone: parsed.phone,
    merchantName: parsed.merchantName,
    counterpartyName: parsed.name,
  });
}
