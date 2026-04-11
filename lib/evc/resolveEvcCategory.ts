import type { EvcMessageKind } from "./evcMessageClassifier";
import { inferMerchantCategory } from "./evcMerchantCategoryRules";
import { normalizePhone } from "./phoneNormalize";

export type EvcResolvedLedgerMeta = {
  evc_kind?: "merchant" | "transfer";
  evc_counterparty_phone?: string;
  /** Expense category id, or undefined if uncategorized */
  category?: string;
  /** When set, used as transaction/expense description instead of parser default */
  description?: string;
};

/**
 * Resolve EVC-specific fields for a new ledger row. Does not handle topup / bundle_notice.
 */
export function resolveEvcCategory(params: {
  kind: EvcMessageKind;
  merchantName?: string;
  phoneRaw?: string;
  lookupMemory: (normalizedPhone: string) => string | null | undefined;
  lookupNote?: (normalizedPhone: string) => string | null | undefined;
}): EvcResolvedLedgerMeta {
  const { kind, merchantName, phoneRaw, lookupMemory, lookupNote } = params;

  const savedNoteFor = (phoneNorm: string): string | undefined => {
    if (!phoneNorm || !lookupNote) return undefined;
    const n = lookupNote(phoneNorm)?.trim();
    return n && n.length ? n : undefined;
  };

  if (kind === "send_merchant") {
    const cat = inferMerchantCategory(merchantName ?? "") ?? undefined;
    const phoneNorm = phoneRaw ? normalizePhone(phoneRaw) : "";
    const note = phoneNorm ? savedNoteFor(phoneNorm) : undefined;
    return {
      evc_kind: "merchant",
      ...(phoneNorm ? { evc_counterparty_phone: phoneNorm } : {}),
      ...(cat ? { category: cat } : {}),
      ...(note ? { description: note } : {}),
    };
  }

  if (kind === "send_p2p" || kind === "receive") {
    const phoneNorm = phoneRaw ? normalizePhone(phoneRaw) : "";
    if (!phoneNorm) {
      return { evc_kind: "transfer" };
    }
    const fromMem = lookupMemory(phoneNorm);
    const note = savedNoteFor(phoneNorm);
    return {
      evc_kind: "transfer",
      evc_counterparty_phone: phoneNorm,
      ...(fromMem ? { category: fromMem } : {}),
      ...(note ? { description: note } : {}),
    };
  }

  return {};
}
