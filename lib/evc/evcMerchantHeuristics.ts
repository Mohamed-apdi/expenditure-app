/**
 * Pay-to-merchant vs P2P heuristics (Flutter SmsParser._isMerchantTransfer parity).
 */

const MERCHANT_KEYWORDS = [
  "market",
  "shop",
  "store",
  "restaurant",
  "cafe",
  "coffee",
  "hotel",
  "gas",
  "fuel",
  "petrol",
  "pharmacy",
  "hospital",
  "clinic",
  "school",
  "university",
  "bank",
  "atm",
  "supermarket",
  "mall",
  "plaza",
  "center",
  "office",
  "company",
  "corp",
  "ltd",
  "inc",
  "llc",
  "enterprise",
  "business",
  "trading",
  "services",
  "merchant",
  "cashier",
  "bajaj",
  "taxi",
  "uber",
] as const;

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** First Somali-style mobile match (0 + 9 digits), if any. */
export function extractSomaliMobileCandidate(body: string): string {
  const m = body.match(/0\d{9}/);
  return m?.[0] ?? "";
}

/**
 * True if transfer looks like pay-to-merchant using SMS body + optional counterparty / phone hint.
 */
export function isLikelyMerchantTransfer(
  body: string,
  counterpartyHint: string,
): boolean {
  const messageLower = norm(body);
  const cp = counterpartyHint.trim();
  const cpLower = cp.toLowerCase();

  for (const keyword of MERCHANT_KEYWORDS) {
    if (messageLower.includes(keyword) || cpLower.includes(keyword)) {
      return true;
    }
  }

  if (!cp) return false;

  const compact = cp.replace(/\s/g, "");
  const isSomaliMobile = /^0\d{9}$/.test(compact);
  if (!isSomaliMobile || compact.length > 10) return true;

  return false;
}
