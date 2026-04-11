import { buildCanonicalEvcDedupeKey } from "../evcDedupe";

describe("buildCanonicalEvcDedupeKey", () => {
  it("matches live vs native-style fields for the same payment", () => {
    const live = buildCanonicalEvcDedupeKey({
      sender: " 192 ",
      kind: "send",
      amount: 10.5,
      dateIso: "2026-03-21T12:22:27.000Z",
      tarRaw: "Tar: 21/03/26 12:22:27",
      phone: "617703215",
      merchantName: undefined,
      counterpartyName: "Test User",
    });
    const native = buildCanonicalEvcDedupeKey({
      sender: "192",
      kind: "send",
      amount: 10.5,
      dateIso: "2026-03-21T12:22:27.000Z",
      tarRaw: "Tar: 21/03/26 12:22:27",
      phone: "617703215",
      merchantName: undefined,
      counterpartyName: "Test User",
    });
    expect(live).toBe(native);
  });

  it("treats counterpartyName and native name slot the same when equal", () => {
    const a = buildCanonicalEvcDedupeKey({
      sender: "192",
      kind: "send",
      amount: 1,
      dateIso: "2026-01-01T00:00:00.000Z",
      tarRaw: "Tar: 1/1/26 0:0:0",
      phone: "252611234567",
      counterpartyName: "ACME",
    });
    const b = buildCanonicalEvcDedupeKey({
      sender: "192",
      kind: "send",
      amount: 1,
      dateIso: "2026-01-01T00:00:00.000Z",
      tarRaw: "Tar: 1/1/26 0:0:0",
      phone: "252611234567",
      counterpartyName: "ACME",
    });
    expect(a).toBe(b);
  });

  it("differs when tar line differs", () => {
    const a = buildCanonicalEvcDedupeKey({
      sender: "192",
      kind: "send",
      amount: 5,
      dateIso: "2026-01-01T12:00:00.000Z",
      tarRaw: "Tar: 1/1/26 12:00:01",
      phone: "61",
    });
    const b = buildCanonicalEvcDedupeKey({
      sender: "192",
      kind: "send",
      amount: 5,
      dateIso: "2026-01-01T12:00:00.000Z",
      tarRaw: "Tar: 1/1/26 12:00:02",
      phone: "61",
    });
    expect(a).not.toBe(b);
  });
});
