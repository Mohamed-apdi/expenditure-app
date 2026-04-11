jest.mock("../../config/language/languages", () => ({
  LANGUAGES: { en: {} },
}));

import { inferMerchantCategory } from "../evcMerchantCategoryRules";
import { resolveEvcCategory } from "../resolveEvcCategory";

describe("inferMerchantCategory", () => {
  it("maps market / shop / store to shopping id", () => {
    expect(inferMerchantCategory("HAYAT MARKET CASHIER")).toBe("shopping");
    expect(inferMerchantCategory("corner SHOP 12")).toBe("shopping");
    expect(inferMerchantCategory("Mini STORE")).toBe("shopping");
  });

  it("maps fuel / petrol to transport id", () => {
    expect(inferMerchantCategory("SHELL FUEL STATION")).toBe("transport");
    expect(inferMerchantCategory("PETROL ONE")).toBe("transport");
  });

  it("maps restaurant / cafe to food id", () => {
    expect(inferMerchantCategory("PIZZA RESTAURANT")).toBe("food");
    expect(inferMerchantCategory("STARBUCKS CAFE")).toBe("food");
  });

  it("returns null for unknown merchant strings", () => {
    expect(inferMerchantCategory("RANDOM MERCHANT XYZ")).toBeNull();
    expect(inferMerchantCategory("")).toBeNull();
  });
});

describe("resolveEvcCategory", () => {
  const noMem = () => null;

  it("merchant: applies keyword category id and kind", () => {
    const r = resolveEvcCategory({
      kind: "send_merchant",
      merchantName: "HAYAT MARKET",
      phoneRaw: "+252610433145",
      lookupMemory: noMem,
    });
    expect(r.evc_kind).toBe("merchant");
    expect(r.evc_counterparty_phone).toBe("252610433145");
    expect(r.category).toBe("shopping");
  });

  it("transfer: uses memory only (category id)", () => {
    const mem = (p: string) => (p === "252617703215" ? "transport" : null);
    const r = resolveEvcCategory({
      kind: "send_p2p",
      phoneRaw: "617703215",
      lookupMemory: mem,
    });
    expect(r.evc_kind).toBe("transfer");
    expect(r.evc_counterparty_phone).toBe("252617703215");
    expect(r.category).toBe("transport");
  });

  it("transfer: no phone → no counterparty, no category", () => {
    const r = resolveEvcCategory({
      kind: "send_p2p",
      lookupMemory: () => "food",
    });
    expect(r.evc_kind).toBe("transfer");
    expect(r.evc_counterparty_phone).toBeUndefined();
    expect(r.category).toBeUndefined();
  });

  it("transfer: no memory → category omitted", () => {
    const r = resolveEvcCategory({
      kind: "receive",
      phoneRaw: "0617182497",
      lookupMemory: noMem,
    });
    expect(r.evc_kind).toBe("transfer");
    expect(r.evc_counterparty_phone).toBe("252617182497");
    expect(r.category).toBeUndefined();
  });

  it("transfer: applies saved note as description when lookupNote returns text", () => {
    const r = resolveEvcCategory({
      kind: "send_p2p",
      phoneRaw: "0617703215",
      lookupMemory: noMem,
      lookupNote: (p) => (p === "252617703215" ? "Rent help" : null),
    });
    expect(r.description).toBe("Rent help");
  });

  it("merchant: applies saved note when phone normalizes", () => {
    const r = resolveEvcCategory({
      kind: "send_merchant",
      merchantName: "HAYAT MARKET",
      phoneRaw: "+252610433145",
      lookupMemory: noMem,
      lookupNote: (p) => (p === "252610433145" ? "Weekly groceries" : null),
    });
    expect(r.description).toBe("Weekly groceries");
    expect(r.category).toBe("shopping");
  });
});
