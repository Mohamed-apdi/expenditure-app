import { kerasPreprocessText, textsToPaddedSequence } from "../kerasLikeTokenizer";

describe("kerasLikeTokenizer", () => {
  it("preprocesses with default filters", () => {
    const meta = {
      filters: '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~\t\n',
      lower: true,
      split: " ",
    };
    const parts = kerasPreprocessText("[-EVCPLUS-] $3 ayaad uwareejisay COFFEE, Tar:", meta);
    expect(parts.some((p) => p.includes("evcplus"))).toBe(true);
    expect(parts).toContain("coffee");
  });

  it("pads and truncates sequences", () => {
    const meta = {
      filters: "",
      lower: true,
      split: " ",
      numWords: 100,
      oovToken: "<OOV>",
    };
    const wi = { a: 1, b: 2, "<OOV>": 3 };
    const s = textsToPaddedSequence("a b a", wi, meta, 8);
    expect(s.length).toBe(8);
    expect(Array.from(s).filter((x) => x !== 0).length).toBeGreaterThan(0);
  });
});
