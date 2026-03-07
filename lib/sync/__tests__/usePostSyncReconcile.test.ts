// @ts-nocheck

/**
 * Jest tests for usePostSyncReconcile
 * Focus:
 *  - Only runs after syncing -> up-to-date with no error
 *  - Does not run for syncing -> offline
 *  - Does not run if errorMessage exists
 *  - Single-flight guard prevents overlap
 */

import React from "react";
import renderer, { act } from "react-test-renderer";

// Mock SyncContext hook
jest.mock("../../providers/SyncContext", () => ({
  useSyncStatus: jest.fn(),
}));

// Mock DB access
jest.mock("../../powersync/client", () => ({
  getPowerSyncDb: jest.fn(() => ({
    execute: jest.fn(async () => undefined),
  })),
}));

// Import after mocks
import { useSyncStatus } from "../../providers/SyncContext";
import { usePostSyncReconcile } from "../usePostSyncReconcile";

type SyncState = {
  status: "offline" | "syncing" | "up-to-date" | string;
  errorMessage?: string | null;
};

const useSyncStatusMock = useSyncStatus as unknown as jest.Mock<SyncState>;

function TestHarness() {
  usePostSyncReconcile();
  return null;
}

describe("usePostSyncReconcile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs reconcile only when transitioning syncing -> up-to-date with no error", async () => {
    useSyncStatusMock.mockReturnValue({ status: "offline", errorMessage: null });

    const tree = renderer.create(<TestHarness />);

    await act(async () => {
      useSyncStatusMock.mockReturnValue({ status: "syncing", errorMessage: null });
      tree.update(<TestHarness />);
    });

    const { getPowerSyncDb } = require("../../powersync/client");
    const db = getPowerSyncDb();

    await act(async () => {
      useSyncStatusMock.mockReturnValue({ status: "up-to-date", errorMessage: null });
      tree.update(<TestHarness />);
    });

    expect(db.execute).toHaveBeenCalledTimes(1);
    const firstSql = (db.execute as jest.Mock).mock.calls[0]?.[0] as string;
    expect(firstSql).toContain("UPDATE attachment_queue");
  });

  it("does NOT run reconcile on syncing -> offline", async () => {
    useSyncStatusMock.mockReturnValue({ status: "syncing", errorMessage: null });
    const tree = renderer.create(<TestHarness />);

    const { getPowerSyncDb } = require("../../powersync/client");
    const db = getPowerSyncDb();

    await act(async () => {
      useSyncStatusMock.mockReturnValue({ status: "offline", errorMessage: null });
      tree.update(<TestHarness />);
    });

    expect(db.execute).toHaveBeenCalledTimes(0);
  });

  it("does NOT run reconcile on syncing -> up-to-date when errorMessage exists", async () => {
    useSyncStatusMock.mockReturnValue({ status: "syncing", errorMessage: null });
    const tree = renderer.create(<TestHarness />);

    const { getPowerSyncDb } = require("../../powersync/client");
    const db = getPowerSyncDb();

    await act(async () => {
      useSyncStatusMock.mockReturnValue({
        status: "up-to-date",
        errorMessage: "some error",
      });
      tree.update(<TestHarness />);
    });

    expect(db.execute).toHaveBeenCalledTimes(0);
  });

  it("single-flight guard prevents overlapping reconcile calls", async () => {
    const { getPowerSyncDb } = require("../../powersync/client");
    const db = getPowerSyncDb();
    const executeMock = db.execute as jest.Mock;

    let resolveExecute: (() => void) | null = null;
    executeMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveExecute = resolve;
        }),
    );

    useSyncStatusMock.mockReturnValue({ status: "syncing", errorMessage: null });
    const tree = renderer.create(<TestHarness />);

    await act(async () => {
      useSyncStatusMock.mockReturnValue({ status: "up-to-date", errorMessage: null });
      tree.update(<TestHarness />);
    });

    expect(executeMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      useSyncStatusMock.mockReturnValue({ status: "syncing", errorMessage: null });
      tree.update(<TestHarness />);
      useSyncStatusMock.mockReturnValue({ status: "up-to-date", errorMessage: null });
      tree.update(<TestHarness />);
    });

    expect(executeMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveExecute?.();
    });
  });
}

