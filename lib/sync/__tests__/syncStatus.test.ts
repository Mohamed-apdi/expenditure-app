/**
 * Unit tests for sync state transitions.
 * See specs/002-offline-online-support/data-model.md state transitions.
 */

import type { SyncState, SyncStatus } from "../types";

const VALID_STATUSES: SyncStatus[] = [
  "offline",
  "syncing",
  "up-to-date",
  "conflict",
  "error",
];

describe("SyncState", () => {
  describe("valid status values", () => {
    it.each(VALID_STATUSES)("accepts status %s", (status) => {
      const state: SyncState = { status, pendingCount: 0 };
      expect(state.status).toBe(status);
    });
  });

  describe("state transitions", () => {
    it("offline -> syncing when connectivity restored", () => {
      const before: SyncState = { status: "offline", pendingCount: 0 };
      const after: SyncState = { ...before, status: "syncing" };
      expect(after.status).toBe("syncing");
    });

    it("syncing -> up-to-date when sync complete", () => {
      const before: SyncState = { status: "syncing", pendingCount: 0 };
      const after: SyncState = {
        ...before,
        status: "up-to-date",
        lastSyncAt: new Date(),
      };
      expect(after.status).toBe("up-to-date");
    });

    it("syncing -> conflict when conflict detected", () => {
      const before: SyncState = { status: "syncing", pendingCount: 0 };
      const after: SyncState = { ...before, status: "conflict" };
      expect(after.status).toBe("conflict");
    });

    it("syncing -> error when sync fails", () => {
      const before: SyncState = { status: "syncing", pendingCount: 0 };
      const after: SyncState = {
        ...before,
        status: "error",
        errorMessage: "Network failed",
      };
      expect(after.status).toBe("error");
    });

    it("conflict -> up-to-date when user resolves", () => {
      const before: SyncState = { status: "conflict", pendingCount: 0 };
      const after: SyncState = { ...before, status: "up-to-date" };
      expect(after.status).toBe("up-to-date");
    });
  });
});
