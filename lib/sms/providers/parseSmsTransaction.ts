/**
 * Full SMS parse: provider-specific routing + EVC-shaped engine + Salaam.
 * Must stay in sync with Kotlin SmsImportParser.
 */

import type { EvcMessageKind } from "~/lib/evc/evcMessageClassifier";
import { normalizeSender as normalizeEvcSender } from "~/lib/evc/evcMessageClassifier";
import {
  extractPrimaryAmount,
  extractBalanceAfter,
  extractSendP2pCounterpartyPhone,
  parseTarDate,
  summarizeNotice,
} from "~/lib/evc/evcSmsParser";
import { detectSmsProvider } from "./detectSmsProvider";
import type { SmsCurrency, SmsParsedTransaction, SmsProvider } from "./types";
import { SMS_TRANSFER_TO_BANK_LABEL } from "./types";

const EVC_TO_BANK_RE =
  /waxaad\s+\$?\s*([\d.]+)\s+ku\s+shubtay\s+Bank\s+account:\s*(.+?)\s*\(([^)]+)\)/i;
/** Hormuud uses `haraagaagu` and `haraagagu` spellings (1–2 a's before `gu`). */
const HARAAGA_RE =
  /haraaga{1,2}gu\s+waa\s+(?:\$|\uFF04|\uFE69)?\s*([\d.]+)/i;

/** Bank / carrier multipart SMS sometimes prepends a line (e.g. MSISDN) before the EVC header. */
function prioritizeEvcHeaderBody(body: string): string {
  const s = body.replace(/\r\n/g, "\n");
  const re = /\[-\s*EVCPlus\s*-\]/i;
  const m = re.exec(s);
  if (m == null || m.index < 1) return body;
  const prefix = s.slice(0, m.index).trim();
  const fromHeader = s.slice(m.index).trim();
  if (!prefix || !fromHeader) return body;
  return `${fromHeader}\n${prefix}`;
}

const SOMNET_RECEIVE_RE =
  /ayaad\s+ka\s+heshay\s+(.+?)\((\d[\d\s]+)\)\s*,\s*(\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{1,2}:\d{1,2})/i;

const SALAAM_APP_SEND_RE =
  /Salaam App:\s*(\d*\.?\d+)\s*USD\s+ayaad\s+u\s+wareejisay\s+(.+?)\(([^)]+)\)\s*,\s*xilliga:\s*([^,\n]+)/i;

const SALAAM_TRANSFER_IN_RE =
  /(\d*\.?\d+)\s+USD,\s*AYAA\s+LAGU\s+WAREEJIYAY\s+KONTADAADA\s+(\S+?)\.\s+KANA\s+TIMID\s+(.+?)\s+Xarunta:\s*([^,]+),\s*Tix:\s*(\d+)\s*,\s*Xilliga:\s*([^\n.]+)/i;

const SALAAM_OWN_EVC_RE =
  /(\d*\.?\d+)\s+USD,\s*AYAA\s+LAGU\s+WAREEJIYAY\s+KONTADAADA\s+(\S+?)\.\s+KANA\s+TIMID\s+#EX:[\s\S]*?#REF:\s*(\d+)[\s\S]*?Xarunta:\s*([^,]+),\s*Tix:\s*(\d+)\s*,\s*Xilliga:\s*([^\n.]+)/i;

const SALAAM_EXT_EVC_RE =
  /(\d*\.?\d+)\s+USD,\s*AYAA\s+LA\s+DHIGAY\s+KOONTO\s+(\S+)\s+KANA\s+TIMID\s+EVC\+\s*(\d[\d\s]*)[\s\S]*?FAAHFAAHIN:\s*([^,]+)[\s\S]*?Tix:\s*(\d+)[\s\S]*?Xilliga:\s*([^\n.]+)/i;

/** Debit from bank account via linked bank card (Somali template). */
const SALAAM_BANK_CARD_DEBIT_RE =
  /(\d*\.?\d+)\s*USD\s*,\s*ayaa\s+laga\s+saaray\s+(?:koontadaada|kontadaada)\s+bangiga\s+(\S+?)\s+ayado\s+la\s+istimaalayo\s+Card\s+kaaga\s+bangiga\.?\s*Xarunta:\s*([^,]+),\s*Tix:\s*(\d+)\s*,\s*Xilliga:\s*([^\n.]+)/i;

const SALAAM_MERCHANT_WORDS = [
  "MARKET",
  "CASHIER",
  "SHOP",
  "STORE",
  "HOTEL",
  "RESTAURANT",
  "CAFE",
  "PHARMACY",
  "SUPERMARKET",
  "COMPANY",
  "TRADING",
  "ELECTRONIC",
  "FUEL",
  "PETROL",
  "STATION",
  "SCHOOL",
  "UNIVERSITY",
  "CLINIC",
  "HOSPITAL",
];

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function parseAmountLoose(raw: string): number | undefined {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Balances may be zero (e.g. EVC bank transfer after emptying wallet). */
function parseBalanceLoose(raw: string): number | undefined {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function parseDdMmYyTime(raw: string): { dateIso?: string; tarRaw?: string } {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (!m) return { tarRaw: raw };
  const day = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10) - 1;
  let year = Number.parseInt(m[3], 10);
  if (year < 100) year += 2000;
  const hh = Number.parseInt(m[4], 10);
  const mi = Number.parseInt(m[5], 10);
  const ss = Number.parseInt(m[6], 10);
  const dt = new Date(year, month, day, hh, mi, ss);
  if (Number.isNaN(dt.getTime())) return { tarRaw: raw };
  return { dateIso: dt.toISOString(), tarRaw: raw };
}

/** Salaam bank hyphen date: dd-MM-yyyy h:mm:ss AM/PM */
function parseSalaamBankDate(raw: string): { dateIso?: string; tarRaw?: string } {
  const m = raw
    .trim()
    .match(
      /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})\s*(AM|PM)/i,
    );
  if (!m) return { tarRaw: raw };
  let hour = Number.parseInt(m[4], 10);
  const min = Number.parseInt(m[5], 10);
  const sec = Number.parseInt(m[6], 10);
  const ap = m[7].toUpperCase();
  if (ap === "PM" && hour < 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;
  const day = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10) - 1;
  const year = Number.parseInt(m[3], 10);
  const dt = new Date(year, month, day, hour, min, sec);
  if (Number.isNaN(dt.getTime())) return { tarRaw: raw };
  return { dateIso: dt.toISOString(), tarRaw: raw };
}

/** Salaam App: M/d/yyyy h:mm:ss AM/PM */
function parseSalaamAppDate(raw: string): { dateIso?: string; tarRaw?: string } {
  const m = raw
    .trim()
    .match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})\s*(AM|PM)/i,
    );
  if (!m) return { tarRaw: raw };
  let hour = Number.parseInt(m[4], 10);
  const min = Number.parseInt(m[5], 10);
  const sec = Number.parseInt(m[6], 10);
  const ap = m[7].toUpperCase();
  if (ap === "PM" && hour < 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;
  const month = Number.parseInt(m[1], 10) - 1;
  const day = Number.parseInt(m[2], 10);
  const year = Number.parseInt(m[3], 10);
  const dt = new Date(year, month, day, hour, min, sec);
  if (Number.isNaN(dt.getTime())) return { tarRaw: raw };
  return { dateIso: dt.toISOString(), tarRaw: raw };
}

function salaamMerchantHeuristic(name: string, idInParens: string): boolean {
  const id = idInParens.replace(/\s/g, "");
  if (id.length > 0 && id.length < 9) return true;
  const u = name.toUpperCase();
  return SALAAM_MERCHANT_WORDS.some((w) => u.includes(w));
}

function stripJeebPrefix(body: string): string {
  return body.replace(/\[-JEEB-\]\s*/i, "").trim();
}

const EXPENSE_SEND = [
  "uwareejisay",
  "u wareejisay",
  "diray",
  "wareejisay",
  "ayaad u dirtay",
  "u dirtay",
] as const;
const INCOME = ["ka heshay", "laguu soo diray", "ayaad ka heshay"] as const;
const TOPUP = ["ugu shubtay"] as const;

function containsAny(h: string, needles: readonly string[]): boolean {
  const n = norm(h);
  return needles.some((x) => n.includes(x));
}

function looksMerchant(bodyNorm: string): boolean {
  return bodyNorm.includes("tel:") && bodyNorm.includes("uwareejisay");
}

function classifyEvcShapedBody(
  senderNorm: string,
  body: string,
  provider: SmsProvider,
): EvcMessageKind {
  const inner = provider === "somnet_jeeb" ? stripJeebPrefix(body) : body;
  const b = norm(inner);

  if (provider === "evc" && senderNorm === "NOTICE") {
    return "bundle_notice";
  }

  if (EVC_TO_BANK_RE.test(inner)) {
    return "send_p2p";
  }

  if (containsAny(inner, TOPUP)) {
    return "topup";
  }

  if (
    containsAny(inner, INCOME) ||
    /\bheshay\b/.test(b) ||
    b.includes("heshay,") ||
    b.includes("heshay ")
  ) {
    return "receive";
  }

  if (containsAny(inner, EXPENSE_SEND)) {
    return looksMerchant(b) ? "send_merchant" : "send_p2p";
  }

  return "ignored";
}

function extractHaraagaaguBalance(body: string): number | undefined {
  const m = body.match(HARAAGA_RE);
  if (!m?.[1]) return undefined;
  return parseBalanceLoose(m[1]);
}

function parseEvcToBank(inner: string): Partial<SmsParsedTransaction> {
  const m = inner.match(EVC_TO_BANK_RE);
  if (!m) return {};
  const amount = parseAmountLoose(m[1]);
  const name = m[2]?.trim() ?? null;
  const accountNumber = m[3]?.trim() ?? null;
  const balance = extractHaraagaaguBalance(inner) ?? null;
  return {
    kind: "send_p2p",
    amount: amount ?? undefined,
    name,
    accountNumber,
    balance,
    rawType: "evc_to_bank",
    note: SMS_TRANSFER_TO_BANK_LABEL,
  };
}

function parseEvcShaped(
  provider: "evc" | "somnet_jeeb",
  sender: string,
  body: string,
): SmsParsedTransaction | null {
  const senderTrim = sender.trim();
  const senderNorm = normalizeEvcSender(senderTrim);
  const inner = provider === "somnet_jeeb" ? stripJeebPrefix(body) : body;
  const kind = classifyEvcShapedBody(senderNorm, body, provider);
  if (kind === "ignored") return null;

  const { dateIso, tarRaw } = parseTarDate(inner);
  let dateIsoOut = dateIso;
  let tarRawOut = tarRaw ?? null;

  if (kind === "bundle_notice") {
    return {
      provider,
      kind,
      noticeSummary: summarizeNotice(body),
      dateIso,
      tarRaw: tarRawOut,
    };
  }

  if (kind === "send_p2p" && EVC_TO_BANK_RE.test(inner)) {
    const bank = parseEvcToBank(inner);
    const { dateIso: d2, tarRaw: t2 } = parseTarDate(inner);
    return {
      provider,
      kind: "send_p2p",
      amount: bank.amount,
      currency: "USD",
      dateIso: d2 ?? dateIsoOut,
      tarRaw: t2 ?? tarRawOut,
      phone: null,
      name: bank.name ?? null,
      accountNumber: bank.accountNumber ?? null,
      balance: bank.balance ?? null,
      rawType: "evc_to_bank",
      note: SMS_TRANSFER_TO_BANK_LABEL,
    };
  }

  const primaryAmount = extractPrimaryAmount(inner);
  const balanceAfter = extractBalanceAfter(inner) ?? extractHaraagaaguBalance(inner);

  const somnetReceive = inner.match(SOMNET_RECEIVE_RE);
  if (kind === "receive" && somnetReceive) {
    const name = somnetReceive[1]?.trim();
    const phone = somnetReceive[2]?.replace(/\s/g, "");
    const d = parseDdMmYyTime(somnetReceive[3]);
    if (d.dateIso) dateIsoOut = d.dateIso;
    if (d.tarRaw) tarRawOut = d.tarRaw;
    return {
      provider,
      kind: "receive",
      amount: primaryAmount,
      currency: "USD",
      dateIso: dateIsoOut,
      tarRaw: tarRawOut,
      phone: phone ?? null,
      name: name ?? null,
      balance: balanceAfter ?? null,
    };
  }

  const base: SmsParsedTransaction = {
    provider,
    kind,
    amount: primaryAmount,
    currency: primaryAmount != null ? "USD" : undefined,
    dateIso: dateIsoOut,
    tarRaw: tarRawOut,
    balance: balanceAfter ?? null,
    phone: null,
    name: null,
    merchantName: null,
  };

  if (kind === "send_merchant") {
    const re = /uwareejisay\s+(.+?)\s*\(\d+\)/i;
    const m = inner.match(re);
    base.merchantName = m?.[1]?.trim() ?? null;
    const tel = inner.match(/Tel:\s*(\+?\d[\d\s-]{6,20})/i);
    const loose = inner.match(/(?:\+?252|0)?\d{9,12}|\b\d{9}\b/);
    base.phone = (tel?.[1]?.replace(/\s/g, "") ?? loose?.[0]?.replace(/\s/g, "")) ?? null;
  } else if (kind === "send_p2p") {
    const refM = inner.match(/Tixraac:\s*(\d+)/i);
    if (refM?.[1]) base.reference = refM[1].trim();

    const uw = inner.match(/uwareejisay\s+(.+?)\s*\(\d[\d\s]+\)/i);
    if (uw?.[1]) base.name = uw[1].trim();

    base.phone = extractSendP2pCounterpartyPhone(inner) ?? null;
  } else if (kind === "receive") {
    const kaNameParens = inner.match(/ka\s+heshay\s+(.+?)\s*\(([^)]+)\)/i);
    const idFromParens = kaNameParens?.[2]?.replace(/\s/g, "") ?? "";
    if (
      kaNameParens?.[1] &&
      idFromParens.length >= 3 &&
      /^[\d+.\sXx]+$/.test(idFromParens)
    ) {
      base.name = kaNameParens[1].trim();
      base.phone = idFromParens;
    } else {
      const ka = inner.match(/ka\s+heshay\s+(\+?\d[\d\s]+)/i);
      const laguu = inner.match(/laguu\s+soo\s+diray\s+(\+?\d[\d\s]+)/i);
      base.phone = (ka?.[1] ?? laguu?.[1])?.replace(/\s/g, "") ?? null;
    }
    if (/\bvia\s+salaam\b/i.test(inner) || /salaam\s+somali\s+bank/i.test(inner)) {
      base.rawType = "evc_receive_from_bank";
    }
  } else if (kind === "topup") {
    const re = /ugu\s+shubtay\s+(\+?\d[\d\s]+)/i;
    const m = inner.match(re);
    base.phone = m?.[1]?.replace(/\s/g, "") ?? null;
  }

  return base;
}

function parseSalaamBank(body: string): SmsParsedTransaction | null {
  const bu = body.toUpperCase();

  if (bu.includes("SALAAM APP:") && body.toLowerCase().includes("ayaad u wareejisay")) {
    const m = body.match(SALAAM_APP_SEND_RE);
    if (!m) return null;
    const amount = parseAmountLoose(m[1]);
    if (amount == null) return null;
    const namePart = m[2].trim();
    const idPart = m[3].trim();
    const { dateIso, tarRaw } = parseSalaamAppDate(m[4]);
    const merchant = salaamMerchantHeuristic(namePart, idPart);
    return {
      provider: "salaam_bank",
      kind: merchant ? "send_merchant" : "send_p2p",
      amount,
      currency: "USD",
      dateIso,
      tarRaw,
      phone: idPart.replace(/\s/g, ""),
      name: merchant ? null : namePart,
      merchantName: merchant ? namePart : null,
      rawType: merchant ? "salaam_app_send_merchant" : "salaam_app_send",
    };
  }

  if (/\bayaa\s+laga\s+saaray\b/i.test(body) && /card\s+kaaga\s+bangiga/i.test(body)) {
    const m = body.match(SALAAM_BANK_CARD_DEBIT_RE);
    if (m) {
      const amount = parseAmountLoose(m[1]);
      if (amount != null) {
        const { dateIso, tarRaw } = parseSalaamBankDate(m[5].trim());
        const tix = m[4].trim();
        const outlet = m[3].trim();
        return {
          provider: "salaam_bank",
          kind: "send_merchant",
          amount,
          currency: "USD",
          dateIso,
          tarRaw,
          phone: null,
          name: null,
          merchantName: outlet,
          accountNumber: m[2].trim(),
          reference: tix,
          transactionId: tix,
          note: "Salaam Bank card",
          rawType: "salaam_bank_card_debit",
        };
      }
    }
  }

  if (bu.includes("AYAA LAGU WAREEJIYAY KONTADAADA") && bu.includes("KANA TIMID #EX:")) {
    const m = body.match(SALAAM_OWN_EVC_RE);
    if (!m) return null;
    const amount = parseAmountLoose(m[1]);
    if (amount == null) return null;
    const { dateIso, tarRaw } = parseSalaamBankDate(m[6]);
    return {
      provider: "salaam_bank",
      kind: "receive",
      amount,
      currency: "USD",
      accountNumber: m[2].replace(/\.$/, "").trim(),
      reference: m[3],
      transactionId: m[5],
      dateIso,
      tarRaw,
      phone: null,
      name: "Own EVC transfer",
      note: "Own EVC transfer",
      rawType: "salaam_own_evc_to_bank",
    };
  }

  if (bu.includes("AYAA LA DHIGAY KOONTO") && bu.includes("KANA TIMID EVC+")) {
    const m = body.match(SALAAM_EXT_EVC_RE);
    if (!m) return null;
    const amount = parseAmountLoose(m[1]);
    if (amount == null) return null;
    const { dateIso, tarRaw } = parseSalaamBankDate(m[6].trim());
    return {
      provider: "salaam_bank",
      kind: "receive",
      amount,
      currency: "USD",
      accountNumber: m[2].trim(),
      phone: m[3].replace(/\s/g, ""),
      name: m[4].trim(),
      transactionId: m[5],
      dateIso,
      tarRaw,
      rawType: "salaam_external_evc_to_bank",
    };
  }

  if (bu.includes("AYAA LAGU WAREEJIYAY KONTADAADA")) {
    const m = body.match(SALAAM_TRANSFER_IN_RE);
    if (!m) return null;
    const amount = parseAmountLoose(m[1]);
    if (amount == null) return null;
    const { dateIso, tarRaw } = parseSalaamBankDate(m[6]);
    return {
      provider: "salaam_bank",
      kind: "receive",
      amount,
      currency: "USD",
      accountNumber: m[2].replace(/\.$/, "").trim(),
      name: m[3].trim(),
      transactionId: m[5],
      dateIso,
      tarRaw,
      rawType: "salaam_bank_transfer_in",
    };
  }

  return null;
}

/**
 * Parse incoming SMS. Returns null if message should be ignored.
 */
export function parseSmsTransaction(sender: string, body: string): SmsParsedTransaction | null {
  const bodyNorm = prioritizeEvcHeaderBody(body);
  const provider = detectSmsProvider(sender, bodyNorm);
  if (!provider || provider === "somtel") return null;

  if (provider === "salaam_bank") {
    return parseSalaamBank(bodyNorm);
  }

  return parseEvcShaped(provider, sender, bodyNorm);
}
