/**
 * Prevent duplicate inserts when the SMS receiver fires more than once.
 * Keys are canonical (live vs native queue use the same material).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@evc_sms_dedupe_v2";
const MAX_ENTRIES = 200;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type DedupeEntry = { key: string; at: number };

function hashDjb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

function normalizeSender(sender: string): string {
  return sender.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeDedupeText(s: string | null | undefined): string {
  if (s == null || s === "") return "na";
  return s
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizePhoneKey(phone: string | null | undefined): string {
  if (phone == null || phone === "") return "na";
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : "na";
}

/** Stable amount string for hashing (avoids float noise). */
function amountKey(amount: number): string {
  return Number(amount.toFixed(4)).toString();
}

function balanceDedupePart(balance: number | null | undefined): string {
  if (balance == null || !Number.isFinite(balance)) return "na";
  return amountKey(balance);
}

/**
 * Single canonical identity for SMS import (live or native queue).
 * Does not use SMS body text so native-queue and live paths always match.
 */
export function buildCanonicalSmsDedupeKey(parts: {
  provider?: string | null;
  sender: string;
  kind: string;
  amount: number;
  dateIso?: string | null;
  tarRaw?: string | null;
  phone?: string | null;
  merchantName?: string | null;
  counterpartyName?: string | null;
  rawType?: string | null;
  reference?: string | null;
  transactionId?: string | null;
  accountNumber?: string | null;
  /** When set, avoids false duplicate suppression for same amount/tar-less rows (e.g. micro bank credits). */
  balance?: number | null;
}): string {
  const raw = [
    normalizeDedupeText(parts.provider ?? "evc"),
    normalizeSender(parts.sender),
    parts.kind,
    amountKey(parts.amount),
    parts.dateIso?.trim() || "na",
    (parts.tarRaw?.trim() || "na").toLowerCase(),
    normalizePhoneKey(parts.phone),
    normalizeDedupeText(parts.merchantName),
    normalizeDedupeText(parts.counterpartyName),
    normalizeDedupeText(parts.rawType),
    normalizeDedupeText(parts.reference),
    normalizeDedupeText(parts.transactionId),
    normalizeDedupeText(parts.accountNumber),
    balanceDedupePart(parts.balance),
  ].join("|");
  return hashDjb2(raw);
}

/** @deprecated Use {@link buildCanonicalSmsDedupeKey}; kept for tests and older call sites. */
export function buildCanonicalEvcDedupeKey(parts: {
  sender: string;
  kind: string;
  amount: number;
  dateIso?: string | null;
  tarRaw?: string | null;
  phone?: string | null;
  merchantName?: string | null;
  counterpartyName?: string | null;
}): string {
  return buildCanonicalSmsDedupeKey({ ...parts, provider: "evc" });
}

async function readStore(): Promise<DedupeEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DedupeEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(entries: DedupeEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Returns true if this key was already seen (and records it if new). */
export async function checkAndMarkDedupe(dedupeKey: string): Promise<boolean> {
  const now = Date.now();
  let entries = (await readStore()).filter((e) => now - e.at < TTL_MS);

  if (entries.some((e) => e.key === dedupeKey)) {
    await writeStore(entries);
    return true;
  }

  entries = [{ key: dedupeKey, at: now }, ...entries].slice(0, MAX_ENTRIES);
  await writeStore(entries);
  return false;
}
