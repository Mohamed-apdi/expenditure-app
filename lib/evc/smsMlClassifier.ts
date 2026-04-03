/**
 * On-device SMS → expense category via bundled ONNX.
 *
 * Two input modes (assets/ml/sms_ml_input_config.json):
 * - hash: float32[1, 128] — {@link smsTextToFeatureVector} (placeholder + sklearn-style exports)
 * - tokens: int32[1, seqLen] — Keras tokenizer via assets/ml/sms_word_index.json + sms_tokenizer_meta.json
 *   Export those from your Keras tokenizer JSON: scripts/export_word_index_from_keras_tokenizer.py
 *
 * Output: float32[1, C] logits — C = len(sms_category_labels.json)
 */

import { Platform } from "react-native";
import { Asset } from "expo-asset";
import { DEFAULT_KERAS_FILTERS, textsToPaddedSequence, type SmsTokenizerMeta } from "./kerasLikeTokenizer";

import inputConfig from "../../assets/ml/sms_ml_input_config.json";
import wordIndexJson from "../../assets/ml/sms_word_index.json";
import tokenizerMetaJson from "../../assets/ml/sms_tokenizer_meta.json";

/** Must match scripts/generate_sms_ml_placeholder.py for hash mode */
export const SMS_ML_FEATURE_DIM = 128;

type MlInputConfig = {
  inputMode: "hash" | "tokens";
  inputName: string;
  outputName: string;
  inputDtype: "float32" | "int32" | "int64";
  seqLen: number;
};

const cfg = inputConfig as MlInputConfig;

let sessionPromise: Promise<import("onnxruntime-react-native").InferenceSession | null> | null =
  null;

function shouldSkipNativeMl(): boolean {
  if (Platform.OS === "web") return true;
  if (process.env.NODE_ENV === "test") return true;
  return false;
}

function hasTokenVocab(): boolean {
  return typeof wordIndexJson === "object" && wordIndexJson !== null && Object.keys(wordIndexJson).length > 0;
}

function loadTokenizerMeta(): SmsTokenizerMeta {
  const m = tokenizerMetaJson as Record<string, unknown>;
  return {
    filters: typeof m.filters === "string" ? m.filters : DEFAULT_KERAS_FILTERS,
    lower: m.lower !== false,
    split: typeof m.split === "string" ? m.split : " ",
    numWords: typeof m.numWords === "number" ? m.numWords : null,
    oovToken: typeof m.oovToken === "string" ? m.oovToken : null,
  };
}

/** Deterministic bag-of-hashes features when not using Keras tokens. */
export function smsTextToFeatureVector(text: string, dim = SMS_ML_FEATURE_DIM): Float32Array {
  const v = new Float32Array(dim);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s\u00c0-\u024f]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (const w of tokens) {
    v[fnv1a32(w) % dim] += 1;
  }
  let sq = 0;
  for (let i = 0; i < dim; i++) sq += v[i] * v[i];
  const norm = sq > 0 ? Math.sqrt(sq) : 1;
  for (let i = 0; i < dim; i++) v[i] /= norm;
  return v;
}

function fnv1a32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function argmax(data: Float32Array): number {
  let j = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i]! > data[j]!) j = i;
  }
  return j;
}

async function loadSession(): Promise<import("onnxruntime-react-native").InferenceSession | null> {
  if (shouldSkipNativeMl()) return null;
  try {
    const { InferenceSession } = await import("onnxruntime-react-native");
    const asset = Asset.fromModule(require("../../assets/ml/sms_category.onnx"));
    await asset.downloadAsync();
    const uri = asset.localUri;
    if (!uri) return null;
    return await InferenceSession.create(uri);
  } catch (e) {
    console.warn("[SMS ML] ONNX load/inference disabled:", e);
    return null;
  }
}

function getSession(): Promise<import("onnxruntime-react-native").InferenceSession | null> {
  if (!sessionPromise) sessionPromise = loadSession();
  return sessionPromise;
}

function useTokenInput(): boolean {
  if (cfg.inputMode !== "tokens") return false;
  if (!hasTokenVocab()) {
    console.warn(
      "[SMS ML] inputMode=tokens but sms_word_index.json is empty — run scripts/export_word_index_from_keras_tokenizer.py; falling back to hash features.",
    );
    return false;
  }
  return true;
}

/** Expense category id, or null if ML unavailable / failed. */
export async function predictMlExpenseCategoryId(smsText: string): Promise<string | null> {
  if (shouldSkipNativeMl()) return null;
  const trimmed = smsText.trim();
  if (!trimmed) return null;

  const labels = require("../../assets/ml/sms_category_labels.json") as string[];
  if (!Array.isArray(labels) || labels.length === 0) return null;

  const session = await getSession();
  if (!session) return null;

  try {
    const { Tensor } = await import("onnxruntime-react-native");
    const tokenMode = useTokenInput();
    let input;

    if (tokenMode) {
      const meta = loadTokenizerMeta();
      const seqLen = cfg.seqLen ?? 128;
      const ids = textsToPaddedSequence(
        trimmed,
        wordIndexJson as Record<string, number>,
        meta,
        seqLen,
      );
      input = new Tensor("int32", ids, [1, seqLen]);
    } else {
      const features = smsTextToFeatureVector(trimmed);
      input = new Tensor("float32", features, [1, SMS_ML_FEATURE_DIM]);
    }

    const out = await session.run({ [cfg.inputName]: input });
    const logits = out[cfg.outputName];
    if (!logits?.data) return null;
    const data = logits.data as Float32Array;
    if (data.length !== labels.length) {
      console.warn("[SMS ML] label count mismatch", data.length, labels.length);
      return null;
    }
    const idx = argmax(data);
    return labels[idx] ?? null;
  } catch (e) {
    console.warn("[SMS ML] run failed:", e);
    return null;
  }
}
