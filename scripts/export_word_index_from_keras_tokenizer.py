"""
Export sms_word_index.json + sms_tokenizer_meta.json from a Keras tokenizer JSON
(the output of tokenizer.to_json() in TensorFlow / the Flutter/Python training pipeline).

Usage:
  pip install tensorflow
  python scripts/export_word_index_from_keras_tokenizer.py path/to/tokenizer.json

Writes:
  assets/ml/sms_word_index.json   — { "word": index, ... } matches t.word_index exactly
  assets/ml/sms_tokenizer_meta.json — filters, num_words, oov_token, etc.
"""
from __future__ import annotations

import json
import os
import sys


def main() -> None:
  if len(sys.argv) < 2:
    print("Usage: python export_word_index_from_keras_tokenizer.py <tokenizer.json>", file=sys.stderr)
    raise SystemExit(2)

  src = sys.argv[1]
  root = os.path.join(os.path.dirname(__file__), "..")
  out_dir = os.path.join(root, "assets", "ml")
  os.makedirs(out_dir, exist_ok=True)

  try:
    from tensorflow.keras.preprocessing.text import tokenizer_from_json
  except ImportError:
    print("Install TensorFlow: pip install tensorflow", file=sys.stderr)
    raise SystemExit(1)

  with open(src, encoding="utf-8") as f:
    t = tokenizer_from_json(f.read())

  word_index = {str(k): int(v) for k, v in t.word_index.items()}
  meta = {
    "filters": getattr(t, "filters", '') or '',
    "lower": bool(getattr(t, "lower", True)),
    "split": getattr(t, "split", " ") or " ",
    "numWords": getattr(t, "num_words", None),
    "oovToken": getattr(t, "oov_token", None),
  }

  with open(os.path.join(out_dir, "sms_word_index.json"), "w", encoding="utf-8") as f:
    json.dump(word_index, f, ensure_ascii=False, indent=0)

  with open(os.path.join(out_dir, "sms_tokenizer_meta.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

  print(f"Wrote {len(word_index)} entries to assets/ml/sms_word_index.json")
  print("Update assets/ml/sms_ml_input_config.json: inputMode \"tokens\", inputDtype \"int32\", matching ONNX names.")


if __name__ == "__main__":
  main()
