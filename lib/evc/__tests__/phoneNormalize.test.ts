import { normalizePhone } from "../phoneNormalize";

describe("normalizePhone", () => {
  it("prefixes 9-digit national with 252", () => {
    expect(normalizePhone("617703215")).toBe("252617703215");
  });

  it("strips +252 prefix to consistent form", () => {
    expect(normalizePhone("+252617703215")).toBe("252617703215");
    expect(normalizePhone("+252 61 770 3215")).toBe("252617703215");
  });

  it("maps 0-prefixed local mobile to 252 + 9 digits", () => {
    expect(normalizePhone("0617182497")).toBe("252617182497");
  });

  it("handles spaces and dashes", () => {
    expect(normalizePhone("61 770 32 15")).toBe("252617703215");
  });

  it("returns empty for empty input", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("   ")).toBe("");
  });
});
