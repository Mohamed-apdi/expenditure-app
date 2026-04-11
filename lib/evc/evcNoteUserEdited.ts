import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@evc_tx_note_user_edited_v1";

let cache: Set<string> | null = null;

async function loadSet(): Promise<Set<string>> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    cache = new Set(
      Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [],
    );
  } catch {
    cache = new Set();
  }
  return cache;
}

async function persist(set: Set<string>): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify([...set]));
}

/** Mark a transaction or expense id so EVC automation must not change its description. */
export async function markEvcNoteUserEdited(recordId: string): Promise<void> {
  if (!recordId?.trim()) return;
  const s = await loadSet();
  s.add(recordId);
  await persist(s);
}

export async function isEvcNoteUserEdited(recordId: string): Promise<boolean> {
  if (!recordId?.trim()) return false;
  const s = await loadSet();
  return s.has(recordId);
}
