import { buildSmsImportTransactionDescription } from "../smsImportTransactionDescription";

describe("buildSmsImportTransactionDescription", () => {
  it("formats Somtel eDahab income with counterparty name", () => {
    expect(
      buildSmsImportTransactionDescription({
        provider: "somtel_edahab",
        kind: "receive",
        name: "Mohamed Musse Mohamud",
        phone: "627194533",
      }),
    ).toBe("Received from Mohamed Musse Mohamud");
  });

  it("formats Somtel eDahab expense with counterparty name", () => {
    expect(
      buildSmsImportTransactionDescription({
        provider: "somtel_edahab",
        kind: "send_p2p",
        name: "Mohamed Musse Mohamud",
        phone: "627194533",
      }),
    ).toBe("Sent to Mohamed Musse Mohamud");
  });

  it("keeps EVC receive description unchanged", () => {
    expect(
      buildSmsImportTransactionDescription({
        provider: "evc",
        kind: "receive",
        name: "ALI",
        phone: "617000001",
      }),
    ).toBe("617000001");
  });
});
