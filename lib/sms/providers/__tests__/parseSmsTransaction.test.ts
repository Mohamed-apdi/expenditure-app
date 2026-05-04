import { detectSmsProvider } from "../detectSmsProvider";
import { parseSmsTransaction } from "../parseSmsTransaction";
import { SMS_TRANSFER_TO_BANK_LABEL } from "../types";

const EVC_VIA_SALAAM_BANK = `[-EVCPlus-] waxaad $ 0.01 ka heshay MAHDI ABDULKADIR AHMED(38XXXX54), via Salaam Somali Bank,  haraagagu waa $0.65. La soo deg App-ka WAAFI http://onelink.to/waafi
30868567270`;

const EVC_SEND = "[-EVCPLUS-] $1 ayaad uwareejisay cabduqadir axmed xasan(617703215), Tar: 21/03/26 12:22:27, Haraagaagu waa $130.5.";
const EVC_SEND_SOMNET_DIRTAY =
  "[-EVCPLUS-] Tixraac: 2361595058, $0.01 ayaad u dirtay 252684387407 252684387407 252684387407(252684387407) via 252684387407 252684387407 252684387407,Tar: 03/05/26 06:43:57 haraagaagu waa $0.7.";
const EVC_BANK =
  "[-EVCPlus-] waxaad $20 ku shubtay Bank account: MOHAMED ABDIFITAH MOHAMED (374XXX11), haraagaagu waa $0.";
const EVC_TOPUP =
  "[-EVCPlus-] Waxaad $0.5 ugu shubtay 252612673277, Haraagaagu waa $142.";
const JEEB_VIA_EVC =
  "[-JEEB-] [-EVCPLUS-] waxaad $1 ka heshay 0617182497, Tar: 19/03/26 17:40:16 haraagagu waa $173.5.";
const SOMNET_RECV =
  "[-JEEB-] waxaad $0.5 ayaad ka heshay Test User(617032150), 30/01/26 09:18:47 haraagagu waa $0.5";

const SALAAM_APP =
  "Salaam App: 2.5 USD ayaad u wareejisay ALI AHMED(252617000001) , xilliga: 1/15/2024 3:30:45 PM";
const SALAAM_TRANSFER_IN =
  "10.50 USD, AYAA LAGU WAREEJIYAY KONTADAADA ACC999. KANA TIMID SOME BANK Xarunta: HQ, Tix: 1001 , Xilliga: 03-05-2026 1:30:45 PM";
const SALAAM_OWN_EVC =
  "15.00 USD, AYAA LAGU WAREEJIYAY KONTADAADA ACC001. KANA TIMID #EX: ref bit #REF: 55555 more Xarunta: CENTER, Tix: 2002 , Xilliga: 04-05-2026 2:00:00 PM";
const SALAAM_EXT_EVC =
  "7.25 USD, AYAA LA DHIGAY KOONTO ACC777 KANA TIMID EVC+ 252617000099 FAAHFAAHIN: Note text Tix: 3003 Xilliga: 05-05-2026 10:15:30 AM";
const SALAAM_BANK_CARD_DEBIT = `1.99 USD, ayaa laga saaray koontadaada bangiga 372XXX74 ayado la istimaalayo Card kaaga bangiga.  Xarunta: BANK CARD, Tix: 133675, Xilliga: 03-05-2026 10:16:57 AM.

Laso deg https://salaambank.so/salaam-app-download`;

describe("detectSmsProvider", () => {
  it("prefers Somnet over EVC when JEEB marker present", () => {
    expect(detectSmsProvider("192", JEEB_VIA_EVC)).toBe("somnet_jeeb");
  });

  it("detects Somnet from sender 898", () => {
    expect(detectSmsProvider("898", "hello")).toBe("somnet_jeeb");
  });

  it("detects Salaam before EVC body markers would matter", () => {
    expect(detectSmsProvider("unknown", SALAAM_APP)).toBe("salaam_bank");
  });

  it("detects Salaam for bank card debit SMS (laga saaray + card)", () => {
    expect(detectSmsProvider("SalaamBank", SALAAM_BANK_CARD_DEBIT)).toBe("salaam_bank");
  });

  it("detects EVC from 192", () => {
    expect(detectSmsProvider("192", EVC_SEND)).toBe("evc");
  });
});

describe("parseSmsTransaction", () => {
  it("parses EVC send_p2p", () => {
    const p = parseSmsTransaction("192", EVC_SEND);
    expect(p?.provider).toBe("evc");
    expect(p?.kind).toBe("send_p2p");
    expect(p?.amount).toBe(1);
  });

  it("parses EVC send to Somnet (ayaad u dirtay) with Tixraac and repeated MSISDN", () => {
    const p = parseSmsTransaction("192", EVC_SEND_SOMNET_DIRTAY);
    expect(p?.provider).toBe("evc");
    expect(p?.kind).toBe("send_p2p");
    expect(p?.amount).toBe(0.01);
    expect(p?.phone).toBe("252684387407");
    expect(p?.reference).toBe("2361595058");
    expect(p?.balance).toBe(0.7);
    expect(p?.tarRaw).toContain("Tar:");
  });

  it("classifies bank transfer before topup (evc_to_bank)", () => {
    const p = parseSmsTransaction("192", EVC_BANK);
    expect(p?.provider).toBe("evc");
    expect(p?.kind).toBe("send_p2p");
    expect(p?.rawType).toBe("evc_to_bank");
    expect(p?.note).toBe(SMS_TRANSFER_TO_BANK_LABEL);
    expect(p?.amount).toBe(20);
  });

  it("parses EVC topup when not bank transfer", () => {
    const p = parseSmsTransaction("192", EVC_TOPUP);
    expect(p?.kind).toBe("topup");
    expect(p?.amount).toBe(0.5);
  });

  it("keeps Somnet provider for JEEB + EVC Plus body", () => {
    const p = parseSmsTransaction("192", JEEB_VIA_EVC);
    expect(p?.provider).toBe("somnet_jeeb");
    expect(p?.kind).toBe("receive");
  });

  it("parses Somnet receive with Somnet-specific date line", () => {
    const p = parseSmsTransaction("898", SOMNET_RECV);
    expect(p?.provider).toBe("somnet_jeeb");
    expect(p?.kind).toBe("receive");
    expect(p?.amount).toBe(0.5);
    expect(p?.phone).toBe("617032150");
  });

  it("parses Salaam App send as P2P when id is long", () => {
    const p = parseSmsTransaction("Salaam", SALAAM_APP);
    expect(p?.provider).toBe("salaam_bank");
    expect(p?.kind).toBe("send_p2p");
    expect(p?.amount).toBe(2.5);
  });

  it("parses Salaam bank card debit (linked card charge)", () => {
    const p = parseSmsTransaction("SalaamBank", SALAAM_BANK_CARD_DEBIT);
    expect(p?.provider).toBe("salaam_bank");
    expect(p?.kind).toBe("send_merchant");
    expect(p?.amount).toBe(1.99);
    expect(p?.rawType).toBe("salaam_bank_card_debit");
    expect(p?.accountNumber).toBe("372XXX74");
    expect(p?.merchantName).toBe("BANK CARD");
    expect(p?.reference).toBe("133675");
    expect(p?.transactionId).toBe("133675");
    expect(p?.dateIso).toBeDefined();
  });

  it("parses Salaam transfer in", () => {
    const p = parseSmsTransaction("Salaam", SALAAM_TRANSFER_IN);
    expect(p?.provider).toBe("salaam_bank");
    expect(p?.kind).toBe("receive");
    expect(p?.rawType).toBe("salaam_bank_transfer_in");
    expect(p?.amount).toBe(10.5);
  });

  it("parses Salaam own EVC to bank as receive", () => {
    const p = parseSmsTransaction("Salaam", SALAAM_OWN_EVC);
    expect(p?.provider).toBe("salaam_bank");
    expect(p?.kind).toBe("receive");
    expect(p?.rawType).toBe("salaam_own_evc_to_bank");
    expect(p?.reference).toBe("55555");
  });

  it("parses external EVC to Salaam receive", () => {
    const p = parseSmsTransaction("Salaam", SALAAM_EXT_EVC);
    expect(p?.provider).toBe("salaam_bank");
    expect(p?.kind).toBe("receive");
    expect(p?.rawType).toBe("salaam_external_evc_to_bank");
    expect(p?.phone).toBe("252617000099");
  });

  it("returns null for unrelated SMS", () => {
    expect(parseSmsTransaction("friend", "see you tomorrow")).toBeNull();
  });

  /** Plan / product samples (parity with Kotlin SmsImportParser). */
  it("parses exact EVC-to-bank sample", () => {
    const body =
      "[-EVCPlus-] waxaad $20 ku shubtay Bank account: MOHAMED ABDIFITAH MOHAMED (374XXX11), haraagaagu waa $0.";
    const p = parseSmsTransaction("192", body);
    expect(p?.provider).toBe("evc");
    expect(p?.kind).toBe("send_p2p");
    expect(p?.rawType).toBe("evc_to_bank");
    expect(p?.amount).toBe(20);
    expect(p?.name).toContain("MOHAMED");
    expect(p?.accountNumber).toBe("374XXX11");
    expect(p?.balance).toBe(0);
    expect(p?.note).toBe(SMS_TRANSFER_TO_BANK_LABEL);
  });

  it("parses Somnet receive with via EVC Plus suffix", () => {
    const body =
      "[-JEEB-] $0.5 ayaad ka Heshay MAAHIR ABDI HASSAN(252610291545),30/01/26 09:18:47 via EVC Plus, Haraagaagu waa $0.5.";
    expect(detectSmsProvider("898", body)).toBe("somnet_jeeb");
    const p = parseSmsTransaction("898", body);
    expect(p?.provider).toBe("somnet_jeeb");
    expect(p?.kind).toBe("receive");
    expect(p?.amount).toBe(0.5);
    expect(p?.name).toContain("MAAHIR");
    expect(p?.phone).toBe("252610291545");
    expect(p?.balance).toBe(0.5);
  });

  it("parses Salaam transfer-in sample A", () => {
    const body =
      "210.00 USD, AYAA LAGU WAREEJIYAY KONTADAADA 372XXX74. KANA TIMID MAHDI CABDULQAADIR   Xarunta: HQBRANCH, Tix: 382109, Xilliga: 28-03-2026 07:10:10 PM.";
    const p = parseSmsTransaction("Salaam", body);
    expect(p?.rawType).toBe("salaam_bank_transfer_in");
    expect(p?.amount).toBe(210);
    expect(p?.accountNumber).toBe("372XXX74");
    expect(p?.name).toContain("MAHDI");
    expect(p?.transactionId).toBe("382109");
  });

  it("parses Salaam App P2P sample B", () => {
    const body =
      "Salaam App: 0.5 USD ayaad u wareejisay Qasim Abdulahi Kaahiye(613181818), xilliga: 5/2/2026 10:53:40 PM, Waad ku mahadsantahay isticmaalka salaam app";
    const p = parseSmsTransaction("Salaam", body);
    expect(p?.kind).toBe("send_p2p");
    expect(p?.rawType).toBe("salaam_app_send");
    expect(p?.amount).toBe(0.5);
    expect(p?.phone).toBe("613181818");
  });

  it("parses Salaam App merchant samples C and D", () => {
    const c =
      "Salaam App: 1.25 USD ayaad u wareejisay HAYAAT MARKET 11(735461), xilliga: 4/9/2026 3:55:00 PM, Waad ku mahadsantahay isticmaalka salaam app";
    const pc = parseSmsTransaction("Salaam", c);
    expect(pc?.kind).toBe("send_merchant");
    expect(pc?.rawType).toBe("salaam_app_send_merchant");
    expect(pc?.merchantName).toContain("HAYAAT");

    const d =
      "Salaam App: 1.5 USD ayaad u wareejisay ENJOY CASHIER THREE(614442616), xilliga: 4/9/2026 12:22:33 AM, Waad ku mahadsantahay isticmaalka salaam app";
    const pd = parseSmsTransaction("Salaam", d);
    expect(pd?.kind).toBe("send_merchant");
    expect(pd?.merchantName).toContain("ENJOY");
  });

  it("parses Salaam own EVC sample E", () => {
    const body =
      "399.00 USD, AYAA LAGU WAREEJIYAY KONTADAADA 372XXX74. KANA TIMID #EX:1#Keydin #REF:28990583696  Xarunta: HQBRANCH, Tix: 152028, Xilliga: 06-01-2026 11:13:20 AM.";
    const p = parseSmsTransaction("Salaam", body);
    expect(p?.rawType).toBe("salaam_own_evc_to_bank");
    expect(p?.amount).toBe(399);
    expect(p?.reference).toBe("28990583696");
    expect(p?.transactionId).toBe("152028");
    expect(p?.phone).toBeNull();
  });

  it("detects EVC (not Salaam) when body mentions Salaam Somali Bank on EVC receive", () => {
    expect(detectSmsProvider("192", EVC_VIA_SALAAM_BANK)).toBe("evc");
  });

  it("parses EVC receive via Salaam bank line with masked parens and trailing MSISDN line", () => {
    const p = parseSmsTransaction("192", EVC_VIA_SALAAM_BANK);
    expect(p?.provider).toBe("evc");
    expect(p?.kind).toBe("receive");
    expect(p?.amount).toBe(0.01);
    expect(p?.balance).toBe(0.65);
    expect(p?.name).toBe("MAHDI ABDULKADIR AHMED");
    expect(p?.phone).toBe("38XXXX54");
    expect(p?.rawType).toBe("evc_receive_from_bank");
  });

  it("parses same EVC bank receive when carrier prepends MSISDN before [-EVCPlus-]", () => {
    const inverted = `30868567270
[-EVCPlus-] waxaad $ 0.01 ka heshay MAHDI ABDULKADIR AHMED(38XXXX54), via Salaam Somali Bank,  haraagagu waa $0.65. La soo deg App-ka WAAFI http://onelink.to/waafi`;
    const p = parseSmsTransaction("192", inverted);
    expect(p?.provider).toBe("evc");
    expect(p?.kind).toBe("receive");
    expect(p?.amount).toBe(0.01);
    expect(p?.balance).toBe(0.65);
    expect(p?.name).toBe("MAHDI ABDULKADIR AHMED");
    expect(p?.phone).toBe("38XXXX54");
    expect(p?.rawType).toBe("evc_receive_from_bank");
  });

  it("parses Salaam external EVC sample F", () => {
    const body =
      ".50 USD, AYAA LA DHIGAY KOONTO 372XXX82 KANA TIMID EVC+  612673277 #, FAAHFAAHIN: Sadaq Test,   Xarunta: HQBRANCH, Tix: 17180, Xilliga: 03-05-2026 02:59:12 AM.";
    const p = parseSmsTransaction("Salaam", body);
    expect(p?.rawType).toBe("salaam_external_evc_to_bank");
    expect(p?.amount).toBe(0.5);
    expect(p?.accountNumber).toBe("372XXX82");
    expect(p?.phone).toBe("612673277");
    expect(p?.name).toContain("Sadaq");
    expect(p?.transactionId).toBe("17180");
  });
});
