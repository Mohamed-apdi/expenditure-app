/**
 * Unit tests for conflict resolver: delete dominates, user choice.
 * TDD: tests first, then implement. See specs/002-offline-online-support.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addConflict,
  getPendingConflicts,
  resolveConflict,
  getDeleteDominatesMessage,
} from "../conflictResolver";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

describe("conflictResolver", () => {
  describe("getDeleteDominatesMessage", () => {
    it("returns the delete-dominates user message", () => {
      const msg = getDeleteDominatesMessage();
      expect(msg).toContain("deleted");
      expect(msg).toContain("modified on another device");
    });
  });

  describe("addConflict", () => {
    it("adds a conflict and returns it", async () => {
      const conflict = await addConflict(
        "transaction",
        "tx-1",
        { amount: 10 },
        { amount: 20 },
        "modify_vs_modify"
      );
      expect(conflict.id).toMatch(/^cf_/);
      expect(conflict.entityType).toBe("transaction");
      expect(conflict.entityId).toBe("tx-1");
      expect(conflict.conflictType).toBe("modify_vs_modify");
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe("getPendingConflicts", () => {
    it("returns empty when no conflicts", async () => {
      const conflicts = await getPendingConflicts();
      expect(conflicts).toEqual([]);
    });

    it("returns stored conflicts", async () => {
      await addConflict("expense", "ex-1", {}, {}, "modify_vs_modify");
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([
          {
            id: "cf_1",
            entityType: "expense",
            entityId: "ex-1",
            localVersion: {},
            remoteVersion: {},
            conflictType: "modify_vs_modify",
            detectedAt: new Date().toISOString(),
          },
        ])
      );
      const conflicts = await getPendingConflicts();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].entityId).toBe("ex-1");
    });
  });

  describe("resolveConflict", () => {
    it("removes conflict by id", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([
          {
            id: "cf_1",
            entityType: "transaction",
            entityId: "tx-1",
            localVersion: {},
            remoteVersion: {},
            conflictType: "modify_vs_modify",
            detectedAt: new Date().toISOString(),
          },
        ])
      );
      await resolveConflict("cf_1", "keep_local");
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.any(String),
        "[]"
      );
    });
  });
});
