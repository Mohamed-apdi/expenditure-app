/**
 * Prevent duplicate inserts when the SMS receiver fires more than once.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@evc_sms_dedupe_v1";
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

export function buildDedupeKey(parts: {
  sender: string;
  kind: string;
  amount?: number;
  dateIso?: string;
  tarRaw?: string;
  body: string;
}): string {
  const normalizedBody = parts.body.replace(/\s+/g, " ").trim();
  const head = normalizedBody.slice(0, 80);
  const tail = normalizedBody.slice(-80);
  const raw = [
    parts.sender,
    parts.kind,
    parts.amount ?? "na",
    parts.dateIso ?? "na",
    parts.tarRaw ?? "na",
    head,
    tail,
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
