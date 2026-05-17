/**
 * Somtel eDahab SMS ([-eDahab-Service-]). Separate from EVC/Somnet/Salaam parsers.
 * Must stay in sync with Kotlin SmsImportParser.parseSomtelEdahab.
 */

import type { SmsParsedTransaction } from "./types";

const FIRST_DOLLAR_RE = /([\d.]+)\s+Dollar/i;
const EXPENSE_MARKERS = /ayad\s+u\s+warejisay|u\s+warejisay/i;
const INCOME_MARKERS = /Ayaad\s+Ka\s+Heshay|Ka\s+Heshay/i;

function parseNumber(raw: string): number | undefined {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function parseDdMmYyyyDate(raw: string): { dateIso?: string; tarRaw?: string } {
  const m = raw.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (!m) return { tarRaw: raw.trim() };
  const day = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10) - 1;
  const year = Number.parseInt(m[3], 10);
  const dt = new Date(year, month, day, 12, 0, 0);
  if (Number.isNaN(dt.getTime())) return { tarRaw: raw.trim() };
  return { dateIso: dt.toISOString(), tarRaw: raw.trim() };
}

function firstDollarAmount(body: string): number | undefined {
  const m = body.match(FIRST_DOLLAR_RE);
  if (!m?.[1]) return undefined;
  return parseNumber(m[1]);
}

export function parseSomtelEdahab(body: string): SmsParsedTransaction | null {
  const b = body.trim();
  if (!b) return null;

  const amount = firstDollarAmount(b);
  if (amount == null) return null;

  const tariikhMatch = b.match(/Tariikh:\s*([^\n\[]+)/i);
  const tariikhRaw = tariikhMatch?.[1]?.trim() ?? null;
  const { dateIso, tarRaw } = tariikhRaw
    ? parseDdMmYyyyDate(tariikhRaw)
    : {};

  if (EXPENSE_MARKERS.test(b)) {
    return {
      provider: "somtel_edahab",
      kind: "send_p2p",
      amount,
      currency: "USD",
      dateIso,
      tarRaw: tarRaw ?? tariikhRaw,
      name: b.match(/u\s+warejisay\s+(.+?)\.\s*No:/i)?.[1]?.trim() ?? null,
      phone: b.match(/\.?\s*No:\s*(\d+)/i)?.[1]?.trim() ?? null,
      reference: b.match(/Tixrac:\s*(\S+)/i)?.[1]?.trim() ?? null,
      balance: parseNumber(b.match(/Haraaga:\s*([\d.]+)\s+Dollar/i)?.[1] ?? ""),
      fee: parseNumber(
        b.match(/Kharashyada Adeegga:\s*([\d.]+)\s+Dollar/i)?.[1] ?? "",
      ),
      rawType: "somtel_edahab_send",
    };
  }

  if (INCOME_MARKERS.test(b)) {
    return {
      provider: "somtel_edahab",
      kind: "receive",
      amount,
      currency: "USD",
      dateIso,
      tarRaw: tarRaw ?? tariikhRaw,
      name: b.match(/Ka\s+Heshay\s+(.+?)\.Code-ka/i)?.[1]?.trim() ?? null,
      phone: b.match(/Lambarka\s*:\s*(\d+)/i)?.[1]?.trim() ?? null,
      reference: b.match(/Aqanoosiga\s*:\s*(\S+)/i)?.[1]?.trim() ?? null,
      balance: parseNumber(
        b.match(/Haraagaaga\s+Cusubi\s+Waa:\s*([\d.]+)\s+Dollar/i)?.[1] ?? "",
      ),
      rawType: "somtel_edahab_receive",
    };
  }

  return null;
}
