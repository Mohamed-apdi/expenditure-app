import { accounts$ } from "../../stores/accountsStore";
import { conflicts$ } from "../../stores/conflictsStore";
import { syncCursors$ } from "../../stores/syncCursorsStore";
import { syncState$ } from "../../stores/syncStateStore";
import { __test__, isOfflineGateLocked, triggerSync } from "../legendSync";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  },
}));

const rangeMock = jest.fn().mockResolvedValue({ data: [], error: null });
const orMock = jest.fn().mockReturnThis();
const selectMock = jest.fn().mockReturnThis();
const eqMock = jest.fn().mockReturnThis();
const updateMock = jest.fn().mockReturnThis();
const upsertMock = jest.fn().mockReturnThis();
const singleMock = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock("../../database/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: "user1" } }, error: null }),
    },
    from: jest.fn((_table: string) => ({
      select: selectMock,
      eq: eqMock,
      or: orMock,
      range: rangeMock,
      update: updateMock,
      upsert: upsertMock,
      single: singleMock,
    })),
  },
}));

describe("legendSync", () => {
  beforeEach(() => {
    (accounts$ as any).set({ byId: {}, allIds: [] });
    (conflicts$ as any).set({ byId: {}, allIds: [] });
    (syncCursors$ as any).set(syncCursors$.get());
    (syncState$ as any).set(syncState$.get());
    rangeMock.mockClear();
    orMock.mockClear();
    selectMock.mockClear();
    eqMock.mockClear();
    updateMock.mockClear();
    upsertMock.mockClear();
    singleMock.mockClear();
  });

  it("marks conflict when pending local and remote updated_at differ from __remote_updated_at", async () => {
    const now = new Date().toISOString();

    (accounts$ as any).set({
      byId: {
        acc1: {
          id: "acc1",
          user_id: "user1",
          account_type: "type",
          name: "Local Account",
          amount: 100,
          description: null,
          created_at: now,
          updated_at: now,
          group_id: null,
          is_default: false,
          currency: "USD",
          deleted_at: null,
          __local_status: "pending",
          __local_updated_at: now,
          __last_error: null,
          __remote_updated_at: now,
        },
      },
      allIds: ["acc1"],
    });

    await __test__.applyRemoteRow("accounts", "user1", {
      id: "acc1",
      user_id: "user1",
      account_type: "type",
      name: "Remote Account",
      amount: 200,
      description: null,
      created_at: now,
      updated_at: new Date(Date.now() + 1000).toISOString(),
      group_id: null,
      is_default: false,
      currency: "USD",
      deleted_at: null,
    });

    const conflicts = conflicts$.get();
    expect(Object.keys(conflicts.byId).length).toBe(1);
    expect(accounts$.get().byId["acc1"].__local_status).toBe("conflict");
  });

  it("does not call Supabase when offline gate is locked", async () => {
    const legendSync = await import("../legendSync");
    const gateSpy = jest
      .spyOn(legendSync, "isOfflineGateLocked")
      .mockResolvedValue(true);

    const { supabase } = await import("../../database/supabase");
    const fromSpy = jest.spyOn(supabase, "from");

    await triggerSync();

    expect(gateSpy).toHaveBeenCalled();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("isOfflineGateLocked returns true when NetInfo reports offline", async () => {
    const NetInfo = require("@react-native-community/netinfo").default;
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });
    const locked = await isOfflineGateLocked();
    expect(locked).toBe(true);
  });

  it("isOfflineGateLocked returns false when NetInfo reports online", async () => {
    const NetInfo = require("@react-native-community/netinfo").default;
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: true });
    const locked = await isOfflineGateLocked();
    expect(locked).toBe(false);
  });

  it("delete-vs-modify applies delete wins and clears conflicts", async () => {
    const now = new Date().toISOString();

    (accounts$ as any).set({
      byId: {
        acc1: {
          id: "acc1",
          user_id: "user1",
          account_type: "type",
          name: "Local Account",
          amount: 100,
          description: null,
          created_at: now,
          updated_at: now,
          group_id: null,
          is_default: false,
          currency: "USD",
          deleted_at: null,
          __local_status: "pending",
          __local_updated_at: now,
          __last_error: null,
          __remote_updated_at: now,
        },
      },
      allIds: ["acc1"],
    });

    (conflicts$ as any).set({
      byId: {
        cf1: {
          id: "cf1",
          entityType: "account",
          entityId: "acc1",
          localVersion: {},
          remoteVersion: {},
          conflictType: "modify_vs_modify",
          detectedAt: new Date(now),
          deleted_at: null,
          __local_status: "conflict",
          __local_updated_at: now,
          __last_error: null,
        },
      },
      allIds: ["cf1"],
    });

    const deletedAt = new Date(Date.now() + 1000).toISOString();

    await __test__.applyRemoteRow("accounts", "user1", {
      id: "acc1",
      user_id: "user1",
      account_type: "type",
      name: "Remote Account",
      amount: 200,
      description: null,
      created_at: now,
      updated_at: deletedAt,
      group_id: null,
      is_default: false,
      currency: "USD",
      deleted_at: deletedAt,
    });

    const local = (accounts$.get() as any).byId["acc1"];
    expect(local.deleted_at).toBe(deletedAt);
    expect(local.__local_status).toBe("synced");

    const conflicts = conflicts$.get();
    const activeConflicts = Object.values(conflicts.byId).filter(
      (c: any) =>
        c.entityId === "acc1" &&
        c.__local_status === "conflict" &&
        !c.deleted_at
    );
    expect(activeConflicts.length).toBe(0);
  });

  it("successful push updates __remote_updated_at", async () => {
    const now = new Date().toISOString();
    const remoteUpdatedAt = "2026-02-17T10:00:00.000Z";

    (accounts$ as any).set({
      byId: {
        acc1: {
          id: "acc1",
          user_id: "user1",
          account_type: "type",
          name: "Local Account",
          amount: 100,
          description: null,
          created_at: now,
          updated_at: now,
          group_id: null,
          is_default: false,
          currency: "USD",
          deleted_at: null,
          __local_status: "pending",
          __local_updated_at: now,
          __last_error: null,
          __remote_updated_at: null,
        },
      },
      allIds: ["acc1"],
    });

    (singleMock as jest.Mock).mockResolvedValueOnce({
      data: {
        id: "acc1",
        updated_at: remoteUpdatedAt,
        created_at: now,
        deleted_at: null,
      },
      error: null,
    });

    await __test__.pushTable("accounts", "user1");

    const local = (accounts$.get() as any).byId["acc1"];
    expect(local.__local_status).toBe("synced");
    expect(local.__remote_updated_at).toBe(remoteUpdatedAt);
  });

  it("pagination pulls multiple pages and advances cursor", async () => {
    const now = new Date().toISOString();
    const next = new Date(Date.now() + 1000).toISOString();

    (rangeMock as jest.Mock)
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, i) => ({
          id: `tx${i}`,
          user_id: "user1",
          amount: 1,
          date: now,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
        error: null,
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 200 }, (_, i) => ({
          id: `tx${500 + i}`,
          user_id: "user1",
          amount: 1,
          date: now,
          created_at: now,
          updated_at: next,
          deleted_at: null,
        })),
        error: null,
      });

    const before = syncCursors$.get();
    expect(before.byTable.transactions.lastSyncAt).toBeNull();

    await __test__.pullTable("transactions", "user1");

    expect(rangeMock).toHaveBeenCalledTimes(2);
    const after = syncCursors$.get();
    expect(after.byTable.transactions.lastSyncAt).toBe(next);
  });

  it("incremental pull uses OR on updated_at and deleted_at", async () => {
    const now = new Date().toISOString();

    (syncCursors$ as any).set({
      byTable: {
        ...syncCursors$.get().byTable,
        transactions: {
          table: "transactions",
          lastSyncAt: now,
        },
      },
    });

    (rangeMock as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    });

    await __test__.pullTable("transactions", "user1");

    expect(orMock).toHaveBeenCalledWith(
      `updated_at.gt.${now},deleted_at.gt.${now}`
    );
  });

  it("triggerSync pushes pending accounts and updates __remote_updated_at", async () => {
    const now = new Date().toISOString();
    const remoteUpdatedAt = "2026-02-17T11:00:00.000Z";

    (accounts$ as any).set({
      byId: {
        acc1: {
          id: "acc1",
          user_id: "user1",
          account_type: "type",
          name: "Local Account",
          amount: 100,
          description: null,
          created_at: now,
          updated_at: now,
          group_id: null,
          is_default: false,
          currency: "USD",
          deleted_at: null,
          __local_status: "pending",
          __local_updated_at: now,
          __last_error: null,
          __remote_updated_at: null,
        },
      },
      allIds: ["acc1"],
    });

    (singleMock as jest.Mock).mockResolvedValueOnce({
      data: {
        id: "acc1",
        updated_at: remoteUpdatedAt,
        created_at: now,
        deleted_at: null,
      },
      error: null,
    });

    // Ensure gate is open for this test
    const legendSync = await import("../legendSync");
    jest
      .spyOn(legendSync, "isOfflineGateLocked")
      .mockResolvedValue(false as any);

    upsertMock.mockClear();

    await triggerSync();

    expect(upsertMock).toHaveBeenCalled();

    const local = (accounts$.get() as any).byId["acc1"];
    expect(local.__local_status).toBe("synced");
    expect(local.__remote_updated_at).toBe(remoteUpdatedAt);
  });
});

