// @ts-nocheck

import type { Mocked } from "jest-mock";
import { processReceiptQueue } from "../receiptQueue";

jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(),
}));

jest.mock("../../lib/auth/session", () => ({
  getSessionStatus: jest.fn(),
}));

jest.mock("../../lib/powersync/client", () => ({
  getPowerSyncDb: jest.fn(() => ({
    execute: jest.fn(async () => undefined),
    getAll: jest.fn(async () => []),
  })),
}));

const NetInfo = jest.requireMock("@react-native-community/netinfo") as {
  fetch: jest.Mock;
};
const sessionModule = jest.requireMock("../../lib/auth/session") as {
  getSessionStatus: jest.Mock;
};
const dbModule = jest.requireMock("../../lib/powersync/client") as {
  getPowerSyncDb: jest.Mock;
};

describe("processReceiptQueue security gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns early when offline gate is locked (even if online)", async () => {
    NetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    sessionModule.getSessionStatus.mockResolvedValue({
      isOnline: true,
      offlineGateState: "locked",
    });

    const db = dbModule.getPowerSyncDb() as {
      execute: Mocked<() => Promise<void>>;
      getAll?: Mocked<() => Promise<unknown[]>>;
    };

    await processReceiptQueue();

    expect(db.execute).toHaveBeenCalledTimes(0);
  });

  it("returns early when network is offline", async () => {
    NetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });
    sessionModule.getSessionStatus.mockResolvedValue({
      isOnline: true,
      offlineGateState: "open",
    });

    const db = dbModule.getPowerSyncDb();

    await processReceiptQueue();

    expect(db.execute).toHaveBeenCalledTimes(0);
  });

  it("does not return early when online and gate is open", async () => {
    NetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    sessionModule.getSessionStatus.mockResolvedValue({
      isOnline: true,
      offlineGateState: "open",
    });

    const db = dbModule.getPowerSyncDb() as {
      execute: jest.Mock;
      getAll?: jest.Mock;
    };

    await processReceiptQueue();

    const executeCalls = db.execute.mock.calls.length;
    const getAllCalls = db.getAll?.mock.calls.length ?? 0;
    expect(executeCalls + getAllCalls).toBeGreaterThan(0);
  });
});

