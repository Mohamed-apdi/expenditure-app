/**
 * Keras tf.keras.preprocessing.text.Tokenizer parity for SMS strings.
 * Prefer exporting word_index via scripts/export_word_index_from_keras_tokenizer.py
 * for an exact match; {@link buildWordIndexFromKerasTokenizerExport} is best-effort from raw JSON.
 */

export type KerasTokenizerExport = {
  class_name?: string;
  config?: KerasTokenizerConfig;
};

export type KerasTokenizerConfig = {
  num_words?: number | null;
  filters?: string;
  lower?: boolean;
  split?: string;
  char_level?: boolean;
  oov_token?: string | null;
  word_counts?: Record<string, number> | string;
};

export type SmsTokenizerMeta = {
  filters: string;
  lower: boolean;
  split: string;
  numWords: number | null;
  oovToken: string | null;
};

/** Default Keras tokenizer filters when meta file is minimal. */
export const DEFAULT_KERAS_FILTERS =
  '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~\t\n';

export function kerasPreprocessText(
  text: string,
  meta: Pick<SmsTokenizerMeta, "filters" | "lower" | "split">,
): string[] {
  let s = meta.lower !== false ? text.toLowerCase() : text;
  const dels = new Set([...meta.filters]);
  let out = "";
  for (const ch of s) {
    out += dels.has(ch) ? " " : ch;
  }
  s = out.replace(/\s+/g, " ").trim();
  const split = meta.split ?? " ";
  return s.split(split).filter(Boolean);
}

/**
 * Build word_index like Keras fit_on_texts: sort word_counts by frequency desc,
 * assign 1..N, then append oov_token.
 */
export function buildWordIndexFromKerasTokenizerExport(
  data: KerasTokenizerExport,
): Map<string, number> | null {
  const c = data.config;
  if (!c || !c.word_counts) return null;

  let wc: Record<string, number>;
  if (typeof c.word_counts === "string") {
    try {
      wc = JSON.parse(c.word_counts) as Record<string, number>;
    } catch {
      return null;
    }
  } else {
    wc = c.word_counts;
  }

  const numWords = c.num_words ?? 0;
  const oovToken = c.oov_token ?? null;

  const sorted = Object.entries(wc)
    .filter(([w]) => (oovToken ? w !== oovToken : true))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const wordIndex = new Map<string, number>();
  for (const [word] of sorted) {
    if (numWords && wordIndex.size >= numWords) break;
    wordIndex.set(word, wordIndex.size + 1);
  }
  if (oovToken) {
    wordIndex.set(oovToken, wordIndex.size + 1);
  }
  return wordIndex;
}

/** texts_to_sequences + pad_sequences (padding=pre, truncating=pre), one row. */
export function textsToPaddedSequence(
  text: string,
  wordIndex: Map<string, number> | Record<string, number>,
  meta: SmsTokenizerMeta,
  seqLen: number,
): Int32Array {
  const idx =
    wordIndex instanceof Map ? wordIndex : new Map(Object.entries(wordIndex));
  const words = kerasPreprocessText(text, meta);
  const numWords = meta.numWords ?? 0;
  const oovIx = meta.oovToken ? idx.get(meta.oovToken) : undefined;

  const ids: number[] = [];
  for (const w of words) {
    const i = idx.get(w);
    if (i !== undefined) {
      if (numWords && i >= numWords) {
        if (oovIx !== undefined) ids.push(oovIx);
      } else {
        ids.push(i);
      }
    } else if (oovIx !== undefined) {
      ids.push(oovIx);
    }
  }

  let chunk = ids;
  if (chunk.length > seqLen) {
    chunk = chunk.slice(chunk.length - seqLen);
  }
  const out = new Int32Array(seqLen);
  const pad = seqLen - chunk.length;
  for (let i = 0; i < chunk.length; i++) {
    out[pad + i] = chunk[i]!;
  }
  return out;
}
