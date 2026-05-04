import {
  buildSmsImportNotificationCopy,
  counterpartyDisplay,
  smsImportTailLabel,
} from "../smsImportRecordedNotificationCopy";
import type { SmsParsedTransaction } from "~/lib/sms/providers/types";

function baseParsed(over: Partial<SmsParsedTransaction> = {}): SmsParsedTransaction {
  return {
    provider: "evc",
    kind: "send_p2p",
    amount: 0.5,
    ...over,
  } as SmsParsedTransaction;
}

describe("counterpartyDisplay", () => {
  it("prefers name over merchant", () => {
    expect(
      counterpartyDisplay(
        baseParsed({ name: "  Qasim  ", merchantName: "Shop" }),
      ),
    ).toBe("Qasim");
  });

  it("uses merchant when name missing", () => {
    expect(counterpartyDisplay(baseParsed({ name: null, merchantName: "Cafe" }))).toBe(
      "Cafe",
    );
  });

  it("masks phone when no name", () => {
    expect(
      counterpartyDisplay(
        baseParsed({ name: null, merchantName: null, phone: "+2526112345678" }),
      ),
    ).toBe("···5678");
  });

  it("returns Unknown when nothing usable", () => {
    expect(counterpartyDisplay(baseParsed({ name: null, merchantName: null, phone: null }))).toBe(
      "Unknown",
    );
  });
});

describe("smsImportTailLabel", () => {
  it("uses account name when present", () => {
    expect(smsImportTailLabel("My Wallet", "evc")).toBe("My Wallet");
  });

  it("falls back to provider short label", () => {
    expect(smsImportTailLabel("", "somnet_jeeb")).toBe("Somnet/JEEB");
  });
});

describe("buildSmsImportNotificationCopy", () => {
  it("builds expense with SMS balance", () => {
    const { title, body } = buildSmsImportNotificationCopy({
      entryType: "expense",
      amount: 0.5,
      parsed: baseParsed({
        name: "Qasim",
        balance: 0.72,
        currency: "USD",
      }),
      accountName: "EVC",
      accountCurrency: "USD",
    });
    expect(title).toBe("Expense recorded");
    expect(body).toContain("$0.50");
    expect(body).toContain("to Qasim");
    expect(body).toContain("EVC balance:");
    expect(body).toContain("$0.72");
  });

  it("builds income with Added-to tail when no SMS balance", () => {
    const { title, body } = buildSmsImportNotificationCopy({
      entryType: "income",
      amount: 1,
      parsed: baseParsed({
        kind: "receive",
        name: "Mahdi",
        balance: null,
        currency: "USD",
      }),
      accountName: "",
      accountCurrency: "USD",
    });
    expect(title).toBe("Income recorded");
    expect(body).toContain("from Mahdi");
    expect(body).toContain("Added to EVC");
    expect(body).not.toMatch(/balance:/);
  });

  it("uses mapped account name in tail when no SMS balance", () => {
    const { body } = buildSmsImportNotificationCopy({
      entryType: "expense",
      amount: 0.5,
      parsed: baseParsed({ name: "X", balance: undefined }),
      accountName: "Pocket Cash",
      accountCurrency: "USD",
    });
    expect(body).toContain("Added to Pocket Cash");
  });

  it("prefers resolved category and note over SMS counterparty", () => {
    const { body } = buildSmsImportNotificationCopy({
      entryType: "expense",
      amount: 10,
      parsed: baseParsed({
        name: "Qasim",
        balance: 5,
        currency: "USD",
      }),
      accountName: "EVC",
      accountCurrency: "USD",
      resolvedCategoryLabel: "Food & Drinks",
      ledgerDescriptionTrimmed: "Lunch split",
    });
    expect(body).toContain("$10.00");
    expect(body).toContain("Food & Drinks");
    expect(body).toContain("Lunch split");
    expect(body).not.toContain("to Qasim");
    expect(body).toContain("EVC balance:");
  });

  it("omits description when it only repeats counterparty", () => {
    const { body } = buildSmsImportNotificationCopy({
      entryType: "expense",
      amount: 1,
      parsed: baseParsed({ name: "Ali", balance: null }),
      accountName: "",
      accountCurrency: "USD",
      resolvedCategoryLabel: "Travel",
      ledgerDescriptionTrimmed: "Ali",
    });
    expect(body).toContain("$1.00 · Travel");
    expect(body).not.toContain("Travel · Ali");
    expect(body).toContain("Added to EVC");
  });
});
