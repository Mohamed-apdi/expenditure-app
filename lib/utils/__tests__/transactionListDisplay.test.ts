import { stripLegacyEvcDescriptionForListTitle } from "../transactionListDisplay";

describe("stripLegacyEvcDescriptionForListTitle", () => {
  it("strips EVC send with arrow", () => {
    expect(
      stripLegacyEvcDescriptionForListTitle("EVC send → SAHRA AXMED"),
    ).toBe("SAHRA AXMED");
  });

  it("strips EVC send without arrow", () => {
    expect(stripLegacyEvcDescriptionForListTitle("EVC send SAHRA AXMED")).toBe(
      "SAHRA AXMED",
    );
  });

  it("strips EVC receive", () => {
    expect(stripLegacyEvcDescriptionForListTitle("EVC receive 252612345678")).toBe(
      "252612345678",
    );
  });

  it("strips EVC merchant", () => {
    expect(stripLegacyEvcDescriptionForListTitle("EVC merchant Shop Name")).toBe(
      "Shop Name",
    );
  });

  it("strips EVC top-up", () => {
    expect(stripLegacyEvcDescriptionForListTitle("EVC top-up 252612345678")).toBe(
      "252612345678",
    );
  });

  it("leaves clean notes unchanged", () => {
    expect(stripLegacyEvcDescriptionForListTitle("SAHRA AXMED")).toBe("SAHRA AXMED");
  });

  it("leaves ordinary descriptions unchanged", () => {
    expect(stripLegacyEvcDescriptionForListTitle("Coffee")).toBe("Coffee");
  });

  it("returns empty for blank", () => {
    expect(stripLegacyEvcDescriptionForListTitle("")).toBe("");
  });
});
