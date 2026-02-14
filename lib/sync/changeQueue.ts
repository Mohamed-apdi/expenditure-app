/**
 * Fallback queue for changes that fail server-side (auth expired, server down).
 * PowerSync handles primary queue; this retries with exponential backoff.
 * See specs/002-offline-online-support/contracts and research.md
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PendingChange, SyncableEntityType } from "./types";

const QUEUE_KEY = "@sync/pending_changes";
const MAX_RETRIES = 10;
const BACKOFF_BASE_MS = 5000;

function getBackoffMs(retryCount: number): number {
  return Math.min(BACKOFF_BASE_MS * Math.pow(3, retryCount), 300000);
}

async function loadQueue(): Promise<PendingChange[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : []).map((p: PendingChange) => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
    }));
  } catch {
    return [];
  }
}

async function saveQueue(queue: PendingChange[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(
  entityType: SyncableEntityType,
  entityId: string,
  operation: "insert" | "update" | "delete",
  payload: Record<string, unknown>
): Promise<void> {
  const queue = await loadQueue();
  const change: PendingChange = {
    id: `pc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    entityType,
    entityId,
    operation,
    payload,
    createdAt: new Date(),
    retryCount: 0,
  };
  queue.push(change);
  await saveQueue(queue);
}

export async function dequeue(changeId: string): Promise<void> {
  const queue = await loadQueue();
  const filtered = queue.filter((c) => c.id !== changeId);
  if (filtered.length !== queue.length) await saveQueue(filtered);
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  return loadQueue();
}

export async function recordRetry(
  changeId: string,
  error: string
): Promise<{ shouldRetry: boolean }> {
  const queue = await loadQueue();
  const idx = queue.findIndex((c) => c.id === changeId);
  if (idx === -1) return { shouldRetry: false };
  queue[idx].retryCount += 1;
  queue[idx].lastError = error;
  if (queue[idx].retryCount >= MAX_RETRIES) {
    queue.splice(idx, 1);
    await saveQueue(queue);
    return { shouldRetry: false };
  }
  await saveQueue(queue);
  return { shouldRetry: true };
}

export function getNextRetryDelayMs(change: PendingChange): number {
  return getBackoffMs(change.retryCount);
}
