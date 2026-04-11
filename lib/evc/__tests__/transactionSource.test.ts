import {
  evcDetailViaLabel,
  formatEvcCategoryChannelSubtitle,
  getTransactionSource,
} from "../transactionSource";

describe("getTransactionSource", () => {
  it("returns evc when source is set", () => {
    expect(getTransactionSource({ source: "evc" })).toBe("evc");
  });

  it("infers evc from evc_kind", () => {
    expect(
      getTransactionSource({
        evc_kind: "transfer",
        evc_counterparty_phone: null,
      }),
    ).toBe("evc");
  });

  it("infers evc from counterparty phone", () => {
    expect(
      getTransactionSource({
        evc_kind: null,
        evc_counterparty_phone: "252612345678",
      }),
    ).toBe("evc");
  });

  it("returns undefined for ordinary rows", () => {
    expect(
      getTransactionSource({
        evc_kind: null,
        evc_counterparty_phone: null,
      }),
    ).toBeUndefined();
  });
});

describe("formatEvcCategoryChannelSubtitle", () => {
  const labels = {
    sentViaEvc: "Sent via EVC",
    receivedViaEvc: "Received via EVC",
  };

  it("formats expense", () => {
    expect(formatEvcCategoryChannelSubtitle("Food", "expense", labels)).toBe(
      "Food • Sent via EVC",
    );
  });

  it("formats income", () => {
    expect(formatEvcCategoryChannelSubtitle("Salary", "income", labels)).toBe(
      "Salary • Received via EVC",
    );
  });

  it("formats transfer with plain EVC", () => {
    expect(formatEvcCategoryChannelSubtitle("Transfer", "transfer", labels)).toBe(
      "Transfer • EVC",
    );
  });
});

describe("evcDetailViaLabel", () => {
  const labels = {
    sentViaEvc: "Sent via EVC",
    receivedViaEvc: "Received via EVC",
  };

  it("maps expense to sent", () => {
    expect(evcDetailViaLabel({ type: "expense" }, labels)).toBe("Sent via EVC");
  });

  it("maps income to received", () => {
    expect(evcDetailViaLabel({ type: "income" }, labels)).toBe("Received via EVC");
  });

  it("returns null for transfer", () => {
    expect(evcDetailViaLabel({ type: "transfer" }, labels)).toBeNull();
  });
});
