/**
 * Hex (#RRGGBB) → rgba for softer accents without changing hue.
 */

export function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return hex;
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** ~8% softer warning for list borders & labels (premium feel). */
export function softenedWarningColor(hex: string): string {
  return hexWithAlpha(hex, 0.92);
}
