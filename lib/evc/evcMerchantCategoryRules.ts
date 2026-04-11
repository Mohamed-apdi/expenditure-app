/**
 * Deterministic merchant name → expense category id. No AI.
 */

/** Expense category id → keywords matched in uppercased merchant text (first match wins). */
const RULES: ReadonlyArray<{
  keywords: readonly string[];
  category: string;
}> = [
  {
    keywords: ["MARKET", "SHOP", "STORE", "SUPERMARKET", "MART", "BAKAAR"],
    category: "shopping",
  },
  {
    keywords: ["RESTAURANT", "CAFE", "HOTEL", "FAST FOOD", "BURGER", "PIZZA"],
    category: "food",
  },
  {
    keywords: ["FUEL", "PETROL", "GAS", "STATION", "TAXI"],
    category: "transport",
  },
  {
    keywords: [
      "ELECTRIC",
      "ELECTRICITY",
      "POWER",
      "WATER",
      "INTERNET",
      "HORMUUD",
      "SOMTEL",
    ],
    category: "utilities",
  },
  {
    keywords: ["TOPUP", "AIRTIME", "DATA", "BUNDLE"],
    category: "electronics",
  },
  {
    keywords: ["PHARMACY", "HOSPITAL", "CLINIC"],
    category: "healthcare",
  },
  {
    keywords: ["SCHOOL", "UNIVERSITY", "COLLEGE", "ACADEMY"],
    category: "education",
  },
];

function normalizeMerchantText(merchantName: string): string {
  const raw = merchantName == null ? "" : String(merchantName);
  return raw.replace(/\s+/g, " ").trim().toUpperCase();
}

/**
 * Map EVC merchant payee string to an expense category id, or null if unknown.
 */
export function inferMerchantCategory(merchantName: string): string | null {
  const u = normalizeMerchantText(merchantName);
  if (!u) return null;

  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => u.includes(keyword))) {
      return rule.category;
    }
  }

  return null;
}
