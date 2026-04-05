/**
 * Keyword-based expense/income category inference from SMS text (Flutter AIService fallback parity).
 * Returns category ids aligned with {@link getExpenseCategories} / {@link getIncomeCategories}.
 *
 * {@link inferExpenseCategoryIdFromSmsAsync} tries the bundled ONNX classifier first, then keywords.
 */

import type { EvcMessageKind } from "./evcMessageClassifier";
import { predictMlExpenseCategoryId } from "./smsMlClassifier";

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Expense category id for ledger rows (English keys from categories.ts).
 */
export function inferExpenseCategoryIdFromSms(
  body: string,
  kind: EvcMessageKind,
): string {
  if (kind === "topup") return "utilities";

  const text = norm(body);

  if (
    text.includes("market") ||
    text.includes("shop") ||
    text.includes("store") ||
    text.includes("supermarket")
  ) {
    return "food";
  }
  if (text.includes("fuel") || text.includes("gas") || text.includes("petrol")) {
    return "transport";
  }
  if (
    text.includes("hospital") ||
    text.includes("clinic") ||
    text.includes("pharmacy")
  ) {
    return "healthcare";
  }
  if (text.includes("internet") || text.includes("data") || text.includes("wifi")) {
    return "utilities";
  }
  if (text.includes("taxi") || text.includes("bajaj") || text.includes("uber")) {
    return "transport";
  }
  if (
    text.includes("movie") ||
    text.includes("cinema") ||
    text.includes("theatre")
  ) {
    return "entertainment";
  }
  if (
    text.includes("airtime") ||
    text.includes("mobile") ||
    text.includes("recharge") ||
    text.includes("top up") ||
    text.includes("ugu shubtay")
  ) {
    return "utilities";
  }
  if (
    text.includes("rent") ||
    text.includes("house") ||
    text.includes("apartment")
  ) {
    return "rent";
  }
  if (
    text.includes("school") ||
    text.includes("university") ||
    text.includes("education")
  ) {
    return "education";
  }
  if (text.includes("family") || text.includes("support")) {
    return "gifts";
  }
  if (
    text.includes("donation") ||
    text.includes("sadaqo") ||
    text.includes("zakat")
  ) {
    return "charity";
  }
  if (text.includes("clothes") || text.includes("shoes") || text.includes("apparel")) {
    return "shopping";
  }
  if (
    text.includes("electronic") ||
    text.includes("gadget") ||
    text.includes("device")
  ) {
    return "electronics";
  }
  if (text.includes("coffee") || text.includes("cafe") || text.includes("restaurant")) {
    return "food";
  }
  if (text.includes("debt") || text.includes("loan") || text.includes("credit")) {
    return "debt";
  }
  if (text.includes("baby") || text.includes("child") || text.includes("children")) {
    return "kids";
  }
  if (
    text.includes("business") ||
    text.includes("office") ||
    text.includes("company")
  ) {
    return "shopping";
  }
  if (text.includes("travel") || text.includes("hotel") || text.includes("flight")) {
    return "travel";
  }
  if (
    text.includes("construction") ||
    text.includes("build") ||
    text.includes("renovate")
  ) {
    return "repairs";
  }
  if (
    text.includes("government") ||
    text.includes("fee") ||
    text.includes("tax")
  ) {
    return "taxes";
  }

  if (kind === "send_merchant") return "shopping";
  if (kind === "send_p2p") return "transport";

  return "shopping";
}

/**
 * ONNX (on-device) when available, then {@link inferExpenseCategoryIdFromSms}.
 * Top-ups skip ML and use utilities-only routing from the keyword path.
 */
export async function inferExpenseCategoryIdFromSmsAsync(
  body: string,
  kind: EvcMessageKind,
): Promise<string> {
  if (kind !== "topup") {
    const mlId = await predictMlExpenseCategoryId(body);
    if (mlId) return mlId;
  }
  return inferExpenseCategoryIdFromSms(body, kind);
}

/** Income category id for mobile-money receives. */
export function inferIncomeCategoryIdFromSms(body: string): string {
  const text = norm(body);
  if (text.includes("salary") || text.includes("mushahar")) {
    return "salary";
  }
  if (text.includes("payment") && text.includes("salary")) return "salary";
  return "sales";
}
