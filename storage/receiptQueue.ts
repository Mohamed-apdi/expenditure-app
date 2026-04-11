/**
 * Attachment queue for expense receipts using Legend-State.
 * Queues receipt uploads for when the device comes back online.
 */

import * as FileSystem from "expo-file-system/legacy";
import NetInfo from "@react-native-community/netinfo";
import { observable } from "@legendapp/state";
import { supabase } from "../lib/database/supabase";
import { updateExpenseLocal } from "../lib/stores/expensesStore";
import { isOfflineGateLocked, triggerSync } from "../lib/sync/legendSync";
import { decode } from "base64-arraybuffer";

interface QueuedReceipt {
  id: string;
  user_id: string;
  expenseId: string;
  localUri: string;
  mimeType: string;
  status: "queued" | "uploading" | "done" | "failed";
  retryCount: number;
  lastError: string | null;
  createdAt: string;
}

interface ReceiptQueueState {
  items: QueuedReceipt[];
}

const receiptQueue$ = observable<ReceiptQueueState>({
  items: [],
});

export async function enqueueReceipt(item: {
  id: string;
  user_id: string | null;
  expenseId: string;
  localUri: string;
  mimeType?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  
  const queueItem: QueuedReceipt = {
    id: item.id,
    user_id: item.user_id || "",
    expenseId: item.expenseId,
    localUri: item.localUri,
    mimeType: item.mimeType ?? "image/jpeg",
    status: "queued",
    retryCount: 0,
    lastError: null,
    createdAt: now,
  };
  
  receiptQueue$.items.push(queueItem);
  
  // Try to process immediately if online
  processReceiptQueue().catch(() => {});
}

export function getQueuedReceipts(): QueuedReceipt[] {
  return receiptQueue$.items.get().filter(
    (item) => item.status === "queued" || item.status === "failed"
  );
}

export async function processReceiptQueue(): Promise<void> {
  const net = await NetInfo.fetch();
  const online = !!net.isConnected && !!net.isInternetReachable;
  if (!online) return;

  const isOffline = await isOfflineGateLocked();
  if (isOffline) return;

  const items = getQueuedReceipts();

  for (const item of items) {
    const itemIndex = receiptQueue$.items.get().findIndex((i) => i.id === item.id);
    if (itemIndex === -1) continue;

    try {
      // Update status to uploading
      receiptQueue$.items[itemIndex].status.set("uploading");

      const info = await FileSystem.getInfoAsync(item.localUri);
      if (!info.exists) {
        receiptQueue$.items[itemIndex].status.set("failed");
        receiptQueue$.items[itemIndex].lastError.set("File not found");
        receiptQueue$.items[itemIndex].retryCount.set(item.retryCount + 1);
        continue;
      }

      const fileContents = await FileSystem.readAsStringAsync(item.localUri, {
        encoding: "base64",
      });

      const path = `receipts/${item.expenseId}_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("receipts")
        .upload(path, decode(fileContents), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error || !data) {
        receiptQueue$.items[itemIndex].status.set("failed");
        receiptQueue$.items[itemIndex].lastError.set(error?.message ?? "Unknown upload error");
        receiptQueue$.items[itemIndex].retryCount.set(item.retryCount + 1);
        continue;
      }

      const publicUrl = supabase.storage.from("receipts").getPublicUrl(data.path).data.publicUrl;

      // Update expense with new receipt URL
      updateExpenseLocal(item.expenseId, { receipt_url: publicUrl });
      
      // Mark as done
      receiptQueue$.items[itemIndex].status.set("done");
      
      // Trigger sync to push changes
      void triggerSync();
      
    } catch (e) {
      receiptQueue$.items[itemIndex].status.set("failed");
      receiptQueue$.items[itemIndex].lastError.set(e instanceof Error ? e.message : String(e));
      receiptQueue$.items[itemIndex].retryCount.set(item.retryCount + 1);
    }
  }

  // Clean up completed items
  const currentItems = receiptQueue$.items.get();
  const pendingItems = currentItems.filter((item) => item.status !== "done");
  receiptQueue$.items.set(pendingItems);
}

// Set up network listener to process queue when coming online
NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) {
    processReceiptQueue().catch(() => {});
  }
});
