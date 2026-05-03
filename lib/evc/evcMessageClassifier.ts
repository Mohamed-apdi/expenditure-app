/**
 * EVC SMS classification from sender + Somali keyword patterns.
 */

export type EvcMessageKind =
  | "ignored"
  | "send_p2p"
  | "send_merchant"
  | "receive"
  | "topup"
  | "bundle_notice";

const EXPENSE_SEND = [
  "uwareejisay",
  "u wareejisay",
  "diray",
  "wareejisay",
  /** EVC → Somnet / similar: "ayaad u dirtay … (252…)" */
  "ayaad u dirtay",
  "u dirtay",
] as const;
const INCOME = ["ka heshay", "laguu soo diray", "heshay"] as const;
const TOPUP = ["ugu shubtay"] as const;

function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Match sender short codes (192, NOTICE) and numeric variants. */
export function normalizeSender(sender: string): string {
  const trimmed = sender.trim().toUpperCase();
  if (trimmed === "192" || trimmed === "+192") return "192";
  if (trimmed === "NOTICE") return "NOTICE";
  const digitsOnly = sender.replace(/\D/g, "");
  if (digitsOnly === "192") return "192";
  return trimmed;
}

export function passesContentFilter(senderNorm: string, body: string): boolean {
  if (senderNorm === "192" || senderNorm === "NOTICE") return true;
  const u = body.toUpperCase();
  if (u.includes("EVCPLUS") || u.includes("[-EVCPLUS-]")) return true;
  if (body.toLowerCase().includes("evc plus")) return true;
  if (body.includes("[-JEEB-]") || body.includes("[-jeeb-]")) return true;
  if (senderNorm.replace(/\s+/g, "") === "898") return true;
  return false;
}

function containsAny(haystack: string, needles: readonly string[]): boolean {
  const h = normalizeText(haystack);
  return needles.some((n) => h.includes(n));
}

function looksMerchant(bodyNorm: string): boolean {
  return bodyNorm.includes("tel:") && bodyNorm.includes("uwareejisay");
}

/**
 * Classify after native prefilter. `senderNorm` from {@link normalizeSender}.
 */
export function classifyEvcMessage(
  senderNorm: string,
  body: string,
): EvcMessageKind {
  const b = normalizeText(body);
  if (!passesContentFilter(senderNorm, body)) return "ignored";

  if (senderNorm === "NOTICE") {
    return "bundle_notice";
  }

  if (senderNorm !== "192" && !b.includes("evcplus")) {
    return "ignored";
  }

  if (containsAny(b, TOPUP)) return "topup";
  if (containsAny(b, INCOME)) return "receive";

  if (containsAny(b, EXPENSE_SEND)) {
    return looksMerchant(b) ? "send_merchant" : "send_p2p";
  }

  return "ignored";
}
