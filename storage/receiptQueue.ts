/**
 * Attachment queue for expense receipts.
 *
 * Constraint: PowerSync only syncs DB rows; files in Supabase Storage are
 * handled here. Backend bucket policies and migrations live in the backend
 * repo; this module only:
 * - Stores local file URIs and metadata
 * - Uploads files when online
 * - Updates the expense row (receipt_url) in the local DB and Supabase
 */

import * as FileSystem from "expo-file-system";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "../lib/database/supabase";
import { getPowerSyncDb } from "../lib/powersync/client";
import type { AttachmentQueueItem } from "../lib/db/schema";
import { getSessionStatus } from "../lib/auth/session";

async function insertQueueItem(item: AttachmentQueueItem): Promise<void> {
  const db = getPowerSyncDb();
  if (!db) return;

  await db.execute(
    `
    INSERT INTO attachment_queue (
      id, user_id, kind, entity_table, entity_id, local_uri,
      bucket, object_path, mime_type, status, retry_count, last_error,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      item.id,
      item.user_id,
      item.kind,
      item.entity_table,
      item.entity_id,
      item.local_uri,
      item.bucket,
      item.object_path,
      item.mime_type,
      item.status,
      item.retry_count,
      item.last_error,
      item.created_at,
      item.updated_at,
    ],
  );
}

async function getPendingReceiptItems(): Promise<AttachmentQueueItem[]> {
  const db = getPowerSyncDb();
  if (!db) return [];

  const result = await db.execute(
    `
    SELECT * FROM attachment_queue
    WHERE kind = 'receipt'
      AND status IN ('queued', 'failed')
  `,
  );

  return (result.rows?._array ?? []) as AttachmentQueueItem[];
}

async function updateQueueItemStatus(
  id: string,
  status: AttachmentQueueItem["status"],
  last_error: string | null,
  retry_count?: number,
  object_path?: string | null,
): Promise<void> {
  const db = getPowerSyncDb();
  if (!db) return;

  const now = new Date().toISOString();
  await db.execute(
    `
    UPDATE attachment_queue
    SET status = ?, last_error = ?, retry_count = COALESCE(?, retry_count), object_path = COALESCE(?, object_path), updated_at = ?
    WHERE id = ?
  `,
    [status, last_error, retry_count ?? null, object_path ?? null, now, id],
  );
}

export async function enqueueReceipt(item: {
  id: string;
  user_id: string | null;
  expenseId: string;
  localUri: string;
  mimeType?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await insertQueueItem({
    id: item.id,
    user_id: item.user_id,
    kind: "receipt",
    entity_table: "expenses",
    entity_id: item.expenseId,
    local_uri: item.localUri,
    bucket: "receipts",
    object_path: null,
    mime_type: item.mimeType ?? "image/jpeg",
    status: "queued",
    retry_count: 0,
    last_error: null,
    created_at: now,
    updated_at: now,
  });
}

export async function getQueuedReceipts(): Promise<AttachmentQueueItem[]> {
  return getPendingReceiptItems();
}

export async function processReceiptQueue(): Promise<void> {
  const net = await NetInfo.fetch();
  const online = !!net.isConnected && !!net.isInternetReachable;
  if (!online) return;

  const sessionStatus = await getSessionStatus();
  if (!sessionStatus.isOnline || sessionStatus.offlineGateState === "locked") {
    // Do not process uploads when the offline gate is locked or when we
    // cannot confirm a valid session.
    return;
  }

  const db = getPowerSyncDb();
  if (!db) return;

  const items = await getPendingReceiptItems();

  for (const item of items) {

    try {
      // 1) Ensure file still exists locally
      const info = await FileSystem.getInfoAsync(item.local_uri);
      if (!info.exists) {
        await updateQueueItemStatus(item.id, "failed", "File not found", item.retry_count + 1);
        continue;
      }

      // 2) Upload to Supabase Storage (bucket: receipts)
      const fileContents = await FileSystem.readAsStringAsync(item.local_uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const path = `${item.entity_id}/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(path, Buffer.from(fileContents, "base64"), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error || !data) {
        await updateQueueItemStatus(
          item.id,
          "failed",
          error?.message ?? "Unknown upload error",
          item.retry_count + 1,
        );
        continue;
      }

      const publicUrl = supabase.storage.from("receipts").getPublicUrl(data.path).data.publicUrl;

      // 3) Update expense row locally (PowerSync will sync to server)
      await db.execute(
        "UPDATE expenses SET receipt_url = ? WHERE id = ?",
        [publicUrl, item.entity_id],
      );

      await updateQueueItemStatus(item.id, "done", null, item.retry_count, data.path);
    } catch (e) {
      await updateQueueItemStatus(
        item.id,
        "failed",
        e instanceof Error ? e.message : String(e),
        item.retry_count + 1,
      );
    }
  }
}

