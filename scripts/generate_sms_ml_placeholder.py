"""
Generate a tiny ONNX linear classifier for SMS category smoke-testing.
Replace sms_category.onnx with a model trained in Python / exported from your Flutter pipeline.
Input: float32 [1, 128] bag-of-hashes features (see lib/evc/smsMlClassifier.ts).
Output: float32 [1, C] logits (C = number of labels in sms_category_labels.json).
"""
from __future__ import annotations

import json
import os

import numpy as np
import onnx
from onnx import TensorProto, helper

ROOT = os.path.join(os.path.dirname(__file__), "..")
LABELS_PATH = os.path.join(ROOT, "assets", "ml", "sms_category_labels.json")
OUT_PATH = os.path.join(ROOT, "assets", "ml", "sms_category.onnx")

D = 128


def main() -> None:
  with open(LABELS_PATH, encoding="utf-8") as f:
    labels = json.load(f)
  if not isinstance(labels, list) or not labels:
    raise SystemExit("sms_category_labels.json must be a non-empty array of strings")

  c = len(labels)
  rng = np.random.default_rng(42)
  w = rng.normal(0, 0.02, size=(D, c)).astype(np.float32)
  b = np.zeros(c, dtype=np.float32)
  # Nudge "shopping" so sanity checks are predictable if that label exists
  try:
    b[labels.index("shopping")] = 0.35
  except ValueError:
    b[c // 2] = 0.35

  w_tensor = helper.make_tensor("W", TensorProto.FLOAT, [D, c], w.flatten().tolist())
  b_tensor = helper.make_tensor("B", TensorProto.FLOAT, [c], b.tolist())

  input_x = helper.make_tensor_value_info("x", TensorProto.FLOAT, [1, D])
  logits_info = helper.make_tensor_value_info("logits", TensorProto.FLOAT, [1, c])

  graph = helper.make_graph(
    [
      helper.make_node("MatMul", ["x", "W"], ["xw"]),
      helper.make_node("Add", ["xw", "B"], ["logits"]),
    ],
    "sms_category_linear",
    [input_x],
    [logits_info],
    initializer=[w_tensor, b_tensor],
  )

  model = helper.make_model(
    graph,
    opset_imports=[helper.make_opsetid("", 13)],
    producer_name="expenditure-app-placeholder",
  )
  onnx.checker.check_model(model)
  os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
  onnx.save(model, OUT_PATH)
  print(f"Wrote {OUT_PATH} (D={D}, classes={c})")


if __name__ == "__main__":
  main()
