/**
 * Attachment queue for profile images.
 *
 * Similar to receiptQueue but targets the "images" bucket and updates the
 * profiles table. PowerSync keeps the DB row in sync; this module handles
 * file upload and local reference updates.
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

async function getPendingProfileItems(): Promise<AttachmentQueueItem[]> {
  const db = getPowerSyncDb();
  if (!db) return [];

  const result = await db.execute(
    `
    SELECT * FROM attachment_queue
    WHERE kind = 'profile_image'
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

export async function enqueueProfileImage(item: {
  id: string;
  user_id: string | null;
  profileId: string;
  localUri: string;
  mimeType?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await insertQueueItem({
    id: item.id,
    user_id: item.user_id,
    kind: "profile_image",
    entity_table: "profiles",
    entity_id: item.profileId,
    local_uri: item.localUri,
    bucket: "images",
    object_path: null,
    mime_type: item.mimeType ?? "image/jpeg",
    status: "queued",
    retry_count: 0,
    last_error: null,
    created_at: now,
    updated_at: now,
  });
}

export async function getQueuedProfileImages(): Promise<AttachmentQueueItem[]> {
  return getPendingProfileItems();
}

export async function processProfileImageQueue(): Promise<void> {
  const net = await NetInfo.fetch();
  const online = !!net.isConnected && !!net.isInternetReachable;
  if (!online) return;

  const sessionStatus = await getSessionStatus();
  if (!sessionStatus.isOnline || sessionStatus.offlineGateState === "locked") {
    return;
  }

  const db = getPowerSyncDb();
  if (!db) return;

  const items = await getPendingProfileItems();

  for (const item of items) {

    try {
      const info = await FileSystem.getInfoAsync(item.local_uri);
      if (!info.exists) {
        await updateQueueItemStatus(item.id, "failed", "File not found", item.retry_count + 1);
        continue;
      }

      const fileContents = await FileSystem.readAsStringAsync(item.local_uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const path = `${item.entity_id}/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("images")
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

      const publicUrl = supabase.storage.from("images").getPublicUrl(data.path).data.publicUrl;

      await db.execute(
        "UPDATE profiles SET image_url = ? WHERE id = ?",
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

