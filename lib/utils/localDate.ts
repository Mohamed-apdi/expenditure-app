/**
 * Calendar YYYY-MM-DD in the device local timezone.
 * Do not use toISOString().split("T")[0] for calendar bounds — it is UTC and
 * shifts the day at month boundaries for non-UTC zones (e.g. April 1 local → Mar 31 UTC).
 */
export function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inclusive start/end strings for a calendar month (monthIndex 0 = January). */
export function monthRangeLocalYmd(
  year: number,
  monthIndex: number,
): { startDate: string; endDate: string } {
  const startDate = toLocalYmd(new Date(year, monthIndex, 1));
  const endDate = toLocalYmd(new Date(year, monthIndex + 1, 0));
  return { startDate, endDate };
}
