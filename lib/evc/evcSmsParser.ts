/**
 * Parse structured fields from EVC SMS bodies (Somali + mixed Latin digits).
 */

import type { EvcMessageKind } from "./evcMessageClassifier";

export type ParsedEvcFields = {
  amount?: number;
  phone?: string;
  counterpartyName?: string;
  merchantName?: string;
  dateIso?: string;
  balanceAfter?: number;
  tarRaw?: string;
  /** Short human summary for NOTICE (not full SMS). */
  noticeSummary?: string;
};

const AMOUNT_RE = /\$\s*([\d]+(?:[.,]\d+)?)/gi;
const TAR_RE =
  /Tar:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{1,2}:\d{1,2})/i;
const PHONE_LOOSE_RE =
  /(?:\+?252|0)?\d{9,12}|\b\d{9}\b/g;
const TEL_PREFIX_RE = /Tel:\s*(\+?\d[\d\s-]{6,20})/i;

function parseAmount(m: string): number | undefined {
  const n = Number.parseFloat(m.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/** First $ amount in message — used as transaction amount in samples. */
export function extractPrimaryAmount(body: string): number | undefined {
  AMOUNT_RE.lastIndex = 0;
  const m = AMOUNT_RE.exec(body);
  if (!m?.[1]) return undefined;
  return parseAmount(m[1]);
}

/** Last "… waa $X" balance line (Haraagaagu / haraagagu variants). */
export function extractBalanceAfter(body: string): number | undefined {
  const re = /\bwaa\s+\$\s*([\d]+(?:[.,]\d+)?)/gi;
  let match: RegExpExecArray | null;
  let last: number | undefined;
  while ((match = re.exec(body)) !== null) {
    last = parseAmount(match[1]);
  }
  return last;
}

/** Parse Tar: dd/mm/yy HH:mm:ss → ISO date string (local interpretation). */
export function parseTarDate(body: string): { dateIso?: string; tarRaw?: string } {
  const m = body.match(TAR_RE);
  if (!m) return {};
  const tarRaw = m[0];
  const d = m[1];
  const time = m[2];
  const dp = d.split("/");
  if (dp.length !== 3) return { tarRaw };
  const day = Number.parseInt(dp[0], 10);
  const month = Number.parseInt(dp[1], 10) - 1;
  let year = Number.parseInt(dp[2], 10);
  if (year < 100) year += 2000;
  const [hh, mm, ss] = time.split(":").map((x) => Number.parseInt(x, 10));
  const dt = new Date(year, month, day, hh || 0, mm || 0, ss || 0);
  if (Number.isNaN(dt.getTime())) return { tarRaw };
  return { dateIso: dt.toISOString(), tarRaw };
}

function extractPhoneFromSegment(segment: string): string | undefined {
  const tel = segment.match(TEL_PREFIX_RE);
  if (tel?.[1]) return tel[1].replace(/\s/g, "");
  PHONE_LOOSE_RE.lastIndex = 0;
  const m = PHONE_LOOSE_RE.exec(segment);
  return m?.[0]?.replace(/\s/g, "");
}

/** P2P send: name before (617703215) */
function parseP2PName(body: string): string | undefined {
  const re = /uwareejisay\s+(.+?)\s*\(\d[\d\s]+\)/i;
  const m = body.match(re);
  return m?.[1]?.trim();
}

function parseReceivePhone(body: string): string | undefined {
  const ka = body.match(/ka\s+heshay\s+(\+?\d[\d\s]+)/i);
  if (ka?.[1]) return ka[1].replace(/\s/g, "");
  const laguu = body.match(/laguu\s+soo\s+diray\s+(\+?\d[\d\s]+)/i);
  if (laguu?.[1]) return laguu[1].replace(/\s/g, "");
  return undefined;
}

/** Merchant: ... uwareejisay NAME... (709540) */
function parseMerchantName(body: string): string | undefined {
  const re = /uwareejisay\s+(.+?)\s*\(\d+\)/i;
  const m = body.match(re);
  return m?.[1]?.trim();
}

/** Top-up: ugu shubtay 252612673277 */
function parseTopupPhone(body: string): string | undefined {
  const re = /ugu\s+shubtay\s+(\+?\d[\d\s]+)/i;
  const m = body.match(re);
  if (m?.[1]) return m[1].replace(/\s/g, "");
  return undefined;
}

/** NOTICE: keep a short single-line summary (privacy — not full SMS). */
export function summarizeNotice(body: string): string {
  const one = body.replace(/\s+/g, " ").trim();
  return one.length > 160 ? `${one.slice(0, 157)}...` : one;
}

export function parseEvcFields(
  kind: EvcMessageKind,
  body: string,
): ParsedEvcFields {
  const { dateIso, tarRaw } = parseTarDate(body);
  const balanceAfter = extractBalanceAfter(body);
  const primaryAmount = extractPrimaryAmount(body);

  if (kind === "bundle_notice") {
    return {
      noticeSummary: summarizeNotice(body),
      dateIso,
      tarRaw,
    };
  }

  const base: ParsedEvcFields = {
    amount: primaryAmount,
    dateIso,
    tarRaw,
    balanceAfter,
  };

  switch (kind) {
    case "send_p2p":
      return {
        ...base,
        counterpartyName: parseP2PName(body),
        phone: extractPhoneFromSegment(body),
      };
    case "send_merchant":
      return {
        ...base,
        merchantName: parseMerchantName(body),
        phone: extractPhoneFromSegment(body),
      };
    case "receive":
      return {
        ...base,
        phone: parseReceivePhone(body),
      };
    case "topup":
      return {
        ...base,
        phone: parseTopupPhone(body),
      };
    default:
      return base;
  }
}
