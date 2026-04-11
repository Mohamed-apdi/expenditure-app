import {
  classifyEvcMessage,
  normalizeSender,
} from "../evcMessageClassifier";
import {
  extractPrimaryAmount,
  parseEvcFields,
  parseTarDate,
} from "../evcSmsParser";

const SEND_192 =
  "[-EVCPLUS-] $1 ayaad uwareejisay cabduqadir axmed xasan(617703215), Tar: 21/03/26 12:22:27, Haraagaagu waa $130.5.";
const RECV_192 =
  "[-EVCPLUS-] waxaad $1 ka heshay 0617182497, Tar: 19/03/26 17:40:16 haraagagu waa $173.5.";
const RECV_LAGUU =
  "[-EVCPLUS-] waxaad $2 laguu soo diray 252617000000, Tar: 01/04/26 10:00:00 haraagagu waa $50.";
const MERCH_192 =
  "[-EVCPlus-] $1.89 Ayaad uwareejisay HAYAT MARKET CASHIER 31(709540), Tel: +252610433145, Tar: 19/03/26 16:11:20, Haraagaagu waa $220.25.";
const TOPUP_192 =
  "[-EVCPlus-] Waxaad $0.5 ugu shubtay 252612673277, Haraagaagu waa $142.";
const NOTICE =
  "Waxaad heshay Anfacplus_Minutes 30 daqiiqado, waqtiga uu dhacayo: 08:27:43 30/03/2026. Anfacplus_data 850.000 MB...";

describe("normalizeSender", () => {
  it("maps 192", () => {
    expect(normalizeSender("192")).toBe("192");
    expect(normalizeSender(" 192 ")).toBe("192");
  });
  it("maps NOTICE", () => {
    expect(normalizeSender("NOTICE")).toBe("NOTICE");
  });
});

describe("classifyEvcMessage", () => {
  it("classifies send / receive / merchant / topup / notice", () => {
    expect(classifyEvcMessage("192", SEND_192)).toBe("send_p2p");
    expect(classifyEvcMessage("192", RECV_192)).toBe("receive");
    expect(classifyEvcMessage("192", MERCH_192)).toBe("send_merchant");
    expect(classifyEvcMessage("192", TOPUP_192)).toBe("topup");
    expect(classifyEvcMessage("NOTICE", NOTICE)).toBe("bundle_notice");
  });
});

describe("parseEvcFields", () => {
  it("parses amounts and Tar from 192 samples", () => {
    const s = parseEvcFields("send_p2p", SEND_192);
    expect(s.amount).toBe(1);
    expect(s.balanceAfter).toBe(130.5);
    expect(parseTarDate(SEND_192).dateIso).toBeDefined();

    const r = parseEvcFields("receive", RECV_192);
    expect(r.amount).toBe(1);

    const t = parseEvcFields("topup", TOPUP_192);
    expect(t.amount).toBe(0.5);
  });

  it("extractPrimaryAmount", () => {
    expect(extractPrimaryAmount(SEND_192)).toBe(1);
  });

  it("parses receive phone from laguu soo diray", () => {
    const r = parseEvcFields("receive", RECV_LAGUU);
    expect(r.phone).toBe("252617000000");
  });
});
