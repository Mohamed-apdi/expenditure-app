"""Repair a Keras tokenizer JSON truncated mid-string (e.g. copy/paste size limit)."""
import json
import re
import sys

DEFAULT_PATH = "qoondeeye.tokenizer.json"


def repair(s: str) -> str:
    s = s.rstrip("\r\n\u2028\u2029")
    # Trailing partial entry after last complete pair: , \"keyfragment
    s = re.sub(r', \\"[^"]*$', "", s)
    if not s.endswith("}\"}}"):
        s = s.rstrip(",").rstrip()
        if s.endswith("1") or re.search(r": \d+$", s):
            s += "}\"}}"
    return s


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    fixed = repair(raw)
    json.loads(fixed)  # validate before write
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(fixed)
    print("OK", path, "chars", len(fixed))


if __name__ == "__main__":
    main()
