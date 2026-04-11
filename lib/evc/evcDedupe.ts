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

/**
 * Single canonical identity for an EVC money movement (live SMS or native row).
 * Does not use SMS body text so native-queue and live paths always match.
 */
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
  const raw = [
    normalizeSender(parts.sender),
    parts.kind,
    amountKey(parts.amount),
    parts.dateIso?.trim() || "na",
    (parts.tarRaw?.trim() || "na").toLowerCase(),
    normalizePhoneKey(parts.phone),
    normalizeDedupeText(parts.merchantName),
    normalizeDedupeText(parts.counterpartyName),
  ].join("|");
  return hashDjb2(raw);
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
