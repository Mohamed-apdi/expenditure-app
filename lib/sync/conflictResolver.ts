/**
 * Conflict resolution: user choice for modify-vs-modify, delete dominates over modify.
 * See specs/002-offline-online-support/contracts/conflict-resolution-contract.md
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  SyncConflict,
  ConflictResolutionChoice,
  ConflictType,
  SyncableEntityType,
} from "./types";

const CONFLICTS_KEY = "@sync/pending_conflicts";
const DELETE_DOMINATES_MESSAGE =
  "A record you deleted was modified on another device. Your delete was kept.";

async function loadConflicts(): Promise<SyncConflict[]> {
  try {
    const raw = await AsyncStorage.getItem(CONFLICTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : []).map((c: SyncConflict) => ({
      ...c,
      detectedAt: c.detectedAt ? new Date(c.detectedAt) : new Date(),
    }));
  } catch {
    return [];
  }
}

async function saveConflicts(conflicts: SyncConflict[]): Promise<void> {
  await AsyncStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
}

export function getDeleteDominatesMessage(): string {
  return DELETE_DOMINATES_MESSAGE;
}

export async function addConflict(
  entityType: SyncableEntityType,
  entityId: string,
  localVersion: Record<string, unknown>,
  remoteVersion: Record<string, unknown>,
  conflictType: ConflictType
): Promise<SyncConflict> {
  const conflicts = await loadConflicts();
  const conflict: SyncConflict = {
    id: `cf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    entityType,
    entityId,
    localVersion,
    remoteVersion,
    conflictType,
    detectedAt: new Date(),
  };
  conflicts.push(conflict);
  await saveConflicts(conflicts);
  return conflict;
}

export async function getPendingConflicts(): Promise<SyncConflict[]> {
  return loadConflicts();
}

export async function resolveConflict(
  conflictId: string,
  choice: ConflictResolutionChoice
): Promise<void> {
  const conflicts = await loadConflicts();
  const filtered = conflicts.filter((c) => c.id !== conflictId);
  if (filtered.length !== conflicts.length) await saveConflicts(filtered);
}

export async function applyDeleteDominates(conflictId: string): Promise<void> {
  await resolveConflict(conflictId, "keep_local");
}
