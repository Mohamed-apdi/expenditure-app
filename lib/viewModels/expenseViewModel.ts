/**
 * Canonical view-model for expense status and badges.
 *
 * This is deliberately UI-agnostic and only encodes business rules about:
 * - How status maps to badges and actions
 * - When to surface receipt upload failures separately from entity status
 */

export type LocalStatus =
  | "pending"
  | "failed"
  | "conflict"
  | "synced"
  | "deleted"
  | null
  | undefined;

export type LocalExpenseRow = {
  id: string;
  amount: number;
  date: string;
  receipt_url?: string | null;
  deleted_at?: string | null;
  updated_at?: string | null;
  __local_status?: LocalStatus;
  __last_error?: string | null;
  __local_updated_at?: string | null;
};

export type ExpenseBadge = "Conflict" | "Failed" | "Pending" | "Synced" | "Receipt Failed";

export interface ExpenseViewState {
  badge: ExpenseBadge;
  canEdit: boolean;
  canDelete: boolean;
  showConflictCTA: boolean;
  showErrorMessage: string | null;
  showReceiptRetry: boolean;
}

export type ReceiptQueueStatus = "queued" | "uploading" | "failed" | "done" | null | undefined;

/**
 * Map a local expense row + optional receipt queue status to a view state
 * suitable for lists and detail screens.
 */
export function mapExpenseRowToViewState(
  row: LocalExpenseRow,
  receiptQueueStatus?: ReceiptQueueStatus,
): ExpenseViewState {
  const status = row.__local_status;
  const isDeleted = !!row.deleted_at;
  const isConflict = status === "conflict";

  // Core badge precedence: conflict > failed > pending > synced
  let badge: ExpenseBadge = "Synced";
  if (status === "conflict") badge = "Conflict";
  else if (status === "failed") badge = "Failed";
  else if (status === "pending") badge = "Pending";

  // Optional: surface receipt upload failure separately, without changing entity status.
  const showReceiptRetry = receiptQueueStatus === "failed";
  if (!isConflict && badge === "Synced" && showReceiptRetry) {
    badge = "Receipt Failed";
  }

  // Editing is blocked for conflicts and deleted rows; instead show Conflict CTA in UI.
  const canEdit = !isDeleted && !isConflict;
  const canDelete = !isDeleted;

  const showErrorMessage =
    status === "failed" && row.__last_error ? row.__last_error : null;

  return {
    badge,
    canEdit,
    canDelete,
    showConflictCTA: isConflict,
    showErrorMessage,
    showReceiptRetry,
  };
}

