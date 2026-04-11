/**
 * Attachment queue for profile images using Legend-State.
 * Queues profile image uploads for when the device comes back online.
 */

import * as FileSystem from "expo-file-system/legacy";
import NetInfo from "@react-native-community/netinfo";
import { observable } from "@legendapp/state";
import { supabase } from "../lib/database/supabase";
import { updateProfileLocal } from "../lib/stores/profileStore";
import { isOfflineGateLocked, triggerSync } from "../lib/sync/legendSync";
import { decode } from "base64-arraybuffer";

interface QueuedProfileImage {
  id: string;
  user_id: string;
  profileId: string;
  localUri: string;
  mimeType: string;
  status: "queued" | "uploading" | "done" | "failed";
  retryCount: number;
  lastError: string | null;
  createdAt: string;
}

interface ProfileImageQueueState {
  items: QueuedProfileImage[];
}

const profileImageQueue$ = observable<ProfileImageQueueState>({
  items: [],
});

export async function enqueueProfileImage(item: {
  id: string;
  user_id: string | null;
  profileId: string;
  localUri: string;
  mimeType?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  
  const queueItem: QueuedProfileImage = {
    id: item.id,
    user_id: item.user_id || "",
    profileId: item.profileId,
    localUri: item.localUri,
    mimeType: item.mimeType ?? "image/jpeg",
    status: "queued",
    retryCount: 0,
    lastError: null,
    createdAt: now,
  };
  
  profileImageQueue$.items.push(queueItem);
  
  // Try to process immediately if online
  processProfileImageQueue().catch(() => {});
}

export function getQueuedProfileImages(): QueuedProfileImage[] {
  return profileImageQueue$.items.get().filter(
    (item) => item.status === "queued" || item.status === "failed"
  );
}

export async function processProfileImageQueue(): Promise<void> {
  const net = await NetInfo.fetch();
  const online = !!net.isConnected && !!net.isInternetReachable;
  if (!online) return;

  const isOffline = await isOfflineGateLocked();
  if (isOffline) return;

  const items = getQueuedProfileImages();

  for (const item of items) {
    const itemIndex = profileImageQueue$.items.get().findIndex((i) => i.id === item.id);
    if (itemIndex === -1) continue;

    try {
      // Update status to uploading
      profileImageQueue$.items[itemIndex].status.set("uploading");

      const info = await FileSystem.getInfoAsync(item.localUri);
      if (!info.exists) {
        profileImageQueue$.items[itemIndex].status.set("failed");
        profileImageQueue$.items[itemIndex].lastError.set("File not found");
        profileImageQueue$.items[itemIndex].retryCount.set(item.retryCount + 1);
        continue;
      }

      const fileContents = await FileSystem.readAsStringAsync(item.localUri, {
        encoding: "base64",
      });

      const path = `profile_images/${item.profileId}_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("images")
        .upload(path, decode(fileContents), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error || !data) {
        profileImageQueue$.items[itemIndex].status.set("failed");
        profileImageQueue$.items[itemIndex].lastError.set(error?.message ?? "Unknown upload error");
        profileImageQueue$.items[itemIndex].retryCount.set(item.retryCount + 1);
        continue;
      }

      const publicUrl = supabase.storage.from("images").getPublicUrl(data.path).data.publicUrl;

      // Update profile with new image URL
      updateProfileLocal(item.profileId, { image_url: publicUrl });
      
      // Mark as done
      profileImageQueue$.items[itemIndex].status.set("done");
      
      // Trigger sync to push changes
      void triggerSync();
      
    } catch (e) {
      profileImageQueue$.items[itemIndex].status.set("failed");
      profileImageQueue$.items[itemIndex].lastError.set(e instanceof Error ? e.message : String(e));
      profileImageQueue$.items[itemIndex].retryCount.set(item.retryCount + 1);
    }
  }

  // Clean up completed items
  const currentItems = profileImageQueue$.items.get();
  const pendingItems = currentItems.filter((item) => item.status !== "done");
  profileImageQueue$.items.set(pendingItems);
}

// Set up network listener to process queue when coming online
NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) {
    processProfileImageQueue().catch(() => {});
  }
});
