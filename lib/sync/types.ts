/**
 * Sync-specific types for offline-online support.
 * See specs/002-offline-online-support/data-model.md
 */

export type SyncStatus =
  | "offline"
  | "syncing"
  | "up-to-date"
  | "conflict"
  | "error";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt?: Date;
  pendingCount: number;
  errorMessage?: string;
  conflictsCount?: number;
}

export type ConflictType = "modify_vs_modify" | "delete_vs_modify";

export type SyncableEntityType =
  | "transaction"
  | "expense"
  | "account"
  | "budget"
  | "goal"
  | "subscription"
  | "transfer"
  | "personal_loan"
  | "account_group"
  | "account_type"
  | "profile";

export interface SyncConflict {
  id: string;
  entityType: SyncableEntityType;
  entityId: string;
  localVersion: Record<string, unknown>;
  remoteVersion: Record<string, unknown>;
  conflictType: ConflictType;
  detectedAt: Date;
}

export type PendingChangeOperation = "insert" | "update" | "delete";

export interface PendingChange {
  id: string;
  entityType: SyncableEntityType;
  entityId: string;
  operation: PendingChangeOperation;
  payload: Record<string, unknown>;
  createdAt: Date;
  retryCount: number;
  lastError?: string;
}

export type ConflictResolutionChoice = "keep_local" | "use_remote";
