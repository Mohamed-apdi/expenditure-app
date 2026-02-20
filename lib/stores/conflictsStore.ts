import { observable } from "@legendapp/state";
import { v4 as uuidv4 } from "uuid";

import type {
  SyncConflict,
  SyncableEntityType,
  ConflictType,
} from "../sync/types";
import { legendPersist } from "./legendPersist";
import { LocalMetadata, LocalStatus, nowIso } from "./storeUtils";

export interface ConflictRecord extends SyncConflict, LocalMetadata {}

export interface ConflictsState {
  byId: Record<string, ConflictRecord>;
  allIds: string[];
}

const initialState: ConflictsState = {
  byId: {},
  allIds: [],
};

export const conflicts$ = observable<ConflictsState>(initialState);

legendPersist(conflicts$, "conflicts");

export function selectConflicts(): ConflictRecord[] {
  const state = conflicts$.get();
  const { byId, allIds } = state;

  return allIds
    .map((id) => byId[id])
    .filter(
      (row): row is ConflictRecord =>
        !!row && row.deleted_at == null && row.__local_status === "conflict"
    );
}

export function selectConflictsCount(): number {
  return selectConflicts().length;
}

export function selectConflictById(conflictId: string): ConflictRecord | undefined {
  const state = conflicts$.get();
  const row = state.byId[conflictId];
  if (!row || row.deleted_at != null || row.__local_status !== "conflict")
    return undefined;
  return row;
}

export function addConflictLocal(params: {
  entityType: SyncableEntityType;
  entityId: string;
  localVersion: Record<string, unknown>;
  remoteVersion: Record<string, unknown>;
  conflictType: ConflictType;
}): ConflictRecord {
  const now = nowIso();
  const id = `cf_${now}_${uuidv4()}`;

  const row: ConflictRecord = {
    id,
    entityType: params.entityType,
    entityId: params.entityId,
    localVersion: params.localVersion,
    remoteVersion: params.remoteVersion,
    conflictType: params.conflictType,
    detectedAt: new Date(now),
    deleted_at: null,
    __local_status: "conflict",
    __local_updated_at: now,
    __last_error: null,
  };

  conflicts$.set((state) => {
    const nextById = { ...state.byId, [id]: row };
    const nextAllIds = state.allIds.includes(id)
      ? state.allIds
      : [id, ...state.allIds];
    return { ...state, byId: nextById, allIds: nextAllIds };
  });

  return row;
}

export function resolveConflictLocal(conflictId: string): void {
  conflicts$.set((state) => {
    const existing = state.byId[conflictId];
    if (!existing) return state;

    const row: ConflictRecord = {
      ...existing,
      deleted_at: nowIso(),
      __local_status: "deleted" as LocalStatus,
      __local_updated_at: nowIso(),
    };

    const nextById = { ...state.byId, [conflictId]: row };
    return { ...state, byId: nextById, allIds: state.allIds };
  });
}

export function resolveConflictsForEntity(
  entityType: SyncableEntityType,
  entityId: string
): void {
  conflicts$.set((state) => {
    const nextById: Record<string, ConflictRecord> = { ...state.byId };
    for (const id of state.allIds) {
      const existing = nextById[id];
      if (!existing) continue;
      if (existing.entityType === entityType && existing.entityId === entityId) {
        nextById[id] = {
          ...existing,
          deleted_at: nowIso(),
          __local_status: "deleted" as LocalStatus,
          __local_updated_at: nowIso(),
        };
      }
    }
    return { ...state, byId: nextById, allIds: state.allIds };
  });
}

