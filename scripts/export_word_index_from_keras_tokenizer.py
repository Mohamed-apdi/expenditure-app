"""
Export sms_word_index.json + sms_tokenizer_meta.json from a Keras tokenizer JSON
(tokenizer.to_json() from TensorFlow / Flutter / Python).

No TensorFlow required: rebuilds word_index the same way as keras.preprocessing.text.Tokenizer.fit_on_texts
(sort by frequency, stable tie-break = word_counts key order in JSON; OOV first if set).

Usage:
  python scripts/export_word_index_from_keras_tokenizer.py path/to/tokenizer.json

Optional (slow): set USE_TF=1 to load via tensorflow.keras.preprocessing.text.tokenizer_from_json
when the JSON includes word_index / index_word (full Keras export).

Writes:
  assets/ml/sms_word_index.json
  assets/ml/sms_tokenizer_meta.json
"""
from __future__ import annotations

import json
import os
import sys


def word_index_from_word_counts_keras(
    word_counts: dict[str, int],
    oov_token: str | None,
) -> dict[str, int]:
    """Match tf.keras.preprocessing.text.Tokenizer.fit_on_texts ordering."""
    wcounts = list(word_counts.items())
    wcounts.sort(key=lambda x: x[1], reverse=True)
    if oov_token is None:
        sorted_voc: list[str] = []
    else:
        sorted_voc = [oov_token]
    sorted_voc.extend(wc[0] for wc in wcounts)
    return dict(zip(sorted_voc, list(range(1, len(sorted_voc) + 1))))


def export_from_parsed_config(cfg: dict) -> tuple[dict[str, int], dict]:
    word_counts_raw = cfg.get("word_counts")
    if not isinstance(word_counts_raw, str):
        raise ValueError("config.word_counts must be a JSON string (Keras tokenizer export)")
    word_counts = json.loads(word_counts_raw)
    # Keys may be non-str after load in edge cases
    wc = {str(k): int(v) for k, v in word_counts.items()}
    oov = cfg.get("oov_token")
    if oov is not None:
        oov = str(oov)
    word_index = word_index_from_word_counts_keras(wc, oov)
    # String keys for RN / JSON
    out_wi = {str(k): int(v) for k, v in word_index.items()}
    meta = {
        "filters": cfg.get("filters") or "",
        "lower": bool(cfg.get("lower", True)),
        "split": cfg.get("split") or " ",
        "numWords": cfg.get("num_words"),
        "oovToken": oov,
    }
    return out_wi, meta


def try_tensorflow_path(src: str) -> tuple[dict[str, int], dict] | None:
    if os.environ.get("USE_TF") != "1":
        return None
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
    try:
        from tensorflow.keras.preprocessing.text import tokenizer_from_json
    except ImportError:
        return None
    with open(src, encoding="utf-8") as f:
        t = tokenizer_from_json(f.read())
    word_index = {str(k): int(v) for k, v in t.word_index.items()}
    meta = {
        "filters": getattr(t, "filters", "") or "",
        "lower": bool(getattr(t, "lower", True)),
        "split": getattr(t, "split", " ") or " ",
        "numWords": getattr(t, "num_words", None),
        "oovToken": getattr(t, "oov_token", None),
    }
    return word_index, meta


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python export_word_index_from_keras_tokenizer.py <tokenizer.json>", file=sys.stderr)
        raise SystemExit(2)

    src = sys.argv[1]
    root = os.path.join(os.path.dirname(__file__), "..")
    out_dir = os.path.join(root, "assets", "ml")
    os.makedirs(out_dir, exist_ok=True)

    tf_result = try_tensorflow_path(src)
    if tf_result is not None:
        word_index, meta = tf_result
        print("Used TensorFlow tokenizer_from_json")
    else:
        with open(src, encoding="utf-8") as f:
            doc = json.load(f)
        if not isinstance(doc, dict) or doc.get("class_name") != "Tokenizer":
            raise SystemExit("Expected Keras Tokenizer JSON with top-level class_name: Tokenizer")
        cfg = doc.get("config")
        if not isinstance(cfg, dict):
            raise SystemExit("Missing config object")
        word_index, meta = export_from_parsed_config(cfg)
        print("Built word_index from word_counts (no TensorFlow)")

    out_wi = os.path.join(out_dir, "sms_word_index.json")
    out_meta = os.path.join(out_dir, "sms_tokenizer_meta.json")
    with open(out_wi, "w", encoding="utf-8") as f:
        json.dump(word_index, f, ensure_ascii=False, indent=0)
    with open(out_meta, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(word_index)} entries to assets/ml/sms_word_index.json")
    print("Set assets/ml/sms_ml_input_config.json: inputMode \"tokens\", inputDtype \"int32\", seqLen + ONNX names.")


if __name__ == "__main__":
    main()
