/**
 * Display-only helpers for transaction lists. Does not modify stored data.
 */

const LEGACY_EVC_TITLE_PREFIXES: RegExp[] = [
  /^EVC\s+send\s*(?:→|->|➡)?\s*/i,
  /^EVC\s+receive\s+/i,
  /^EVC\s+merchant\s+/i,
  /^EVC\s+top-?up\s+/i,
  /^EVC\s+/i,
];

/**
 * Strip legacy EVC system prefixes from `description` for list titles (e.g. "SAHRA AXMED").
 */
export function stripLegacyEvcDescriptionForListTitle(
  raw: string | undefined | null,
): string {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  let prev = "";
  let guard = 0;
  while (s !== prev && guard++ < 8) {
    prev = s;
    for (const re of LEGACY_EVC_TITLE_PREFIXES) {
      s = s.replace(re, "").trim();
    }
    s = s.replace(/^(?:→|->|➡)\s*/u, "").trim();
  }
  return s;
}
