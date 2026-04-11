import {
  buildEvcTransactionDescription,
  isLikelyEvcTopupLedgerMatch,
} from "../evcTransactionDescription";

describe("buildEvcTransactionDescription", () => {
  it("uses counterparty name for P2P send", () => {
    expect(
      buildEvcTransactionDescription("send_p2p", {
        counterpartyName: "MAHAD LIBAN OMAR",
        phone: "617703215",
      }),
    ).toBe("MAHAD LIBAN OMAR");
  });

  it("falls back to phone for P2P when no name", () => {
    expect(
      buildEvcTransactionDescription("send_p2p", { phone: "617703215" }),
    ).toBe("617703215");
  });

  it("uses native name field for P2P", () => {
    expect(
      buildEvcTransactionDescription("send_p2p", {
        name: "ALI",
        phone: "252",
      }),
    ).toBe("ALI");
  });

  it("does not prefix with EVC", () => {
    const d = buildEvcTransactionDescription("send_merchant", {
      merchantName: "Shop",
    });
    expect(d).toBe("Shop");
    expect(d.includes("EVC")).toBe(false);
  });
});

describe("isLikelyEvcTopupLedgerMatch", () => {
  it("matches phone-like electronics expense", () => {
    expect(
      isLikelyEvcTopupLedgerMatch({
        type: "expense",
        category: "electronics",
        description: "252612673277",
      }),
    ).toBe(true);
  });

  it("rejects non-electronics", () => {
    expect(
      isLikelyEvcTopupLedgerMatch({
        type: "expense",
        category: "food",
        description: "252612673277",
      }),
    ).toBe(false);
  });

  it("rejects income", () => {
    expect(
      isLikelyEvcTopupLedgerMatch({
        type: "income",
        category: "electronics",
        description: "252612673277",
      }),
    ).toBe(false);
  });
});
