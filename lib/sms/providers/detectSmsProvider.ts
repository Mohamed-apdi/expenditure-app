/**
 * Provider detection — same order as Kotlin: somnet_jeeb → salaam_bank → evc.
 * Somtel is never detected here (placeholder only).
 */

import type { SmsProvider } from "./types";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Normalize sender like Kotlin: uppercase, strip spaces. */
export function normalizeSmsSender(sender: string): string {
  return sender.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Returns detected provider for a message that may be financial SMS, or null if none.
 */
export function detectSmsProvider(sender: string, body: string): SmsProvider | null {
  const d = digitsOnly(sender);
  const b = body;
  const bu = b.toUpperCase();

  if (b.includes("[-JEEB-]") || d === "898" || normalizeSmsSender(sender) === "898") {
    return "somnet_jeeb";
  }

  if (
    bu.includes("SALAAM APP:") ||
    bu.includes("AYAA LAGU WAREEJIYAY KONTADAADA") ||
    bu.includes("AYAA LA DHIGAY KOONTO") ||
    bu.includes("KANA TIMID EVC+") ||
    bu.includes("KANA TIMID #EX:") ||
    /** Bank account debit when paying with linked Salaam bank card */
    (bu.includes("LAGA SAARAY") &&
      (bu.includes("KOONTADAADA BANGIGA") ||
        bu.includes("KONTADAADA BANGIGA") ||
        bu.includes("CARD KAAGA BANGIGA")))
  ) {
    return "salaam_bank";
  }

  const sNorm = normalizeSmsSender(sender);
  if (sNorm === "NOTICE" || sNorm === "192" || d === "192") {
    return "evc";
  }
  if (
    bu.includes("[-EVCPLUS-]") ||
    bu.includes("EVCPLUS") ||
    b.toLowerCase().includes("evc plus")
  ) {
    return "evc";
  }

  return null;
}
