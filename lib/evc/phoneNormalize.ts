/**
 * Normalize Somali / EVC-style phone strings for stable memory keys and storage.
 */

const DIGITS_ONLY = /\D/g;

/**
 * Strip formatting; remove leading +; normalize to 252XXXXXXXXX when possible.
 */
export function normalizePhone(phone: string): string {
  const raw = phone.replace(DIGITS_ONLY, "");
  if (!raw) return "";

  const digits = raw;

  // 0 + 9 digits (local Somali mobile) → 252 + last 9
  if (/^0\d{9}$/.test(digits)) {
    return `252${digits.slice(1)}`;
  }

  // Exactly 9 digits → assume national number without country code
  if (/^\d{9}$/.test(digits)) {
    return `252${digits}`;
  }

  // Already has country code 252...
  if (digits.startsWith("252") && digits.length >= 12) {
    return digits;
  }

  // Fallback: return digits as-is (international variants)
  return digits;
}
