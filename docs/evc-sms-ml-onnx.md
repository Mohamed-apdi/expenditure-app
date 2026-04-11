# Adding on-device SMS → category ML later

The app currently categorizes EVC flows with **counterparty memory**, **merchant keyword rules** (`lib/evc/evcMerchantCategoryRules.ts`), and **`resolveEvcCategory`** — no bundled ONNX or Keras-style tokenizer.

To add a small classifier again:

1. **Dependencies**  
   Install `onnxruntime-react-native` (and follow its Expo / native setup: pods, Gradle, any required config plugins).

2. **Model + labels**  
   - Train a model (e.g. scikit-learn → ONNX, or Keras → ONNX) that outputs logits aligned with your expense category **ids** in `lib/utils/categories.ts`.  
   - Ship `sms_category.onnx` and `sms_category_labels.json` (array of ids, same order as model outputs).

3. **Inputs**  
   Choose one:
   - **Hash features**: fixed-size vector (e.g. 128 dims) from normalized SMS text — simple, no tokenizer file.  
   - **Token ids**: add `sms_word_index.json` + tokenizer meta, and a small **Keras-compatible tokenizer** in JS (previously `kerasLikeTokenizer.ts`) so sequences match training.

4. **Config**  
   A tiny JSON (e.g. `sms_ml_input_config.json`) should describe `inputMode`, tensor names, dtypes, and sequence length for token mode.

5. **Inference module**  
   - Load the ONNX asset with `expo-asset`, create an `InferenceSession`, run one forward pass, `argmax` → label index → category id.  
   - Skip on web/tests if the native module is unavailable.

6. **Wire into EVC**  
   Call the predictor from the SMS → ledger path **before** or **after** keyword rules (e.g. only when merchant rules return null, or as a fallback). Keep memory and user overrides as the source of truth.

7. **Metro**  
   If `.onnx` is not treated as an asset, add it to `resolver.assetExts` in `metro.config.js`.

8. **Size & privacy**  
   Keep the model small; document that SMS text is processed on-device only.

This is optional; the current product does not require it.
