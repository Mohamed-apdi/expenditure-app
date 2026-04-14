import { mapExpenseRowToViewState, type LocalExpenseRow } from "../expenseViewModel";

describe("mapExpenseRowToViewState", () => {
  const baseRow: LocalExpenseRow = {
    id: "1",
    amount: 10,
    date: "2026-02-17",
    receipt_url: null,
    deleted_at: null,
    updated_at: "2026-02-17T10:00:00.000Z",
    __local_status: "synced",
    __last_error: null,
    __local_updated_at: null,
  };

  it("conflict wins: shows Conflict badge and CTA, edit disabled", () => {
    const row = { ...baseRow, __local_status: "conflict" as const };
    const vm = mapExpenseRowToViewState(row, "done");
    expect(vm.badge).toBe("Conflict");
    expect(vm.canEdit).toBe(false);
    expect(vm.showConflictCTA).toBe(true);
  });

  it("failed shows Failed badge and error message", () => {
    const row = { ...baseRow, __local_status: "failed" as const, __last_error: "boom" };
    const vm = mapExpenseRowToViewState(row);
    expect(vm.badge).toBe("Failed");
    expect(vm.showErrorMessage).toBe("boom");
  });

  it("pending shows Pending badge", () => {
    const row = { ...baseRow, __local_status: "pending" as const };
    const vm = mapExpenseRowToViewState(row);
    expect(vm.badge).toBe("Pending");
  });

  it("deleted row cannot edit or delete", () => {
    const row = { ...baseRow, deleted_at: "2026-02-16T00:00:00Z" };
    const vm = mapExpenseRowToViewState(row);
    expect(vm.canEdit).toBe(false);
    expect(vm.canDelete).toBe(false);
  });

  it("synced shows Synced badge", () => {
    const row = { ...baseRow, __local_status: "synced" as const };
    const vm = mapExpenseRowToViewState(row);
    expect(vm.badge).toBe("Synced");
  });
});

