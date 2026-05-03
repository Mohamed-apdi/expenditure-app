/**
 * Multi-provider SMS auto-import shared types.
 */

import type { EvcMessageKind } from "~/lib/evc/evcMessageClassifier";

export type SmsProvider = "evc" | "somnet_jeeb" | "salaam_bank" | "somtel";

export type SmsCurrency = "USD" | "SOS";

/** Canonical label for EVC→bank rows (category + description). */
export const SMS_TRANSFER_TO_BANK_LABEL = "Transfer to bank";

export type SmsParsedTransaction = {
  provider: SmsProvider;
  kind: EvcMessageKind;
  amount?: number;
  currency?: SmsCurrency;
  /** ISO date string when parsed safely */
  dateIso?: string;
  tarRaw?: string | null;
  phone?: string | null;
  /** Counterparty / payer name depending on kind */
  name?: string | null;
  merchantName?: string | null;
  accountNumber?: string | null;
  reference?: string | null;
  transactionId?: string | null;
  balance?: number | null;
  note?: string | null;
  rawType?: string;
  /** EVC NOTICE bundle summary (native queue only; live path may omit). */
  noticeSummary?: string | null;
};

export type NativeSmsImportConfig = {
  globalEnabled: boolean;
  providerEvc: boolean;
  providerSomnetJeeb: boolean;
  providerSalaamBank: boolean;
  providerSomtel: boolean;
};

export const DEFAULT_NATIVE_SMS_IMPORT_CONFIG: NativeSmsImportConfig = {
  globalEnabled: false,
  providerEvc: false,
  providerSomnetJeeb: false,
  providerSalaamBank: false,
  providerSomtel: false,
};
