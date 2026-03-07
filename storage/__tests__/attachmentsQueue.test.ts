import { describe, it, expect } from "@jest/globals";
import {
  enqueueReceipt,
  getQueuedReceipts,
} from "../receiptQueue";

// Skeleton tests for attachment queues. These will be expanded with mocks
// for FileSystem, NetInfo, and Supabase Storage to verify:
// - Retry/backoff behavior
// - Local-first viewing (prefer local file when offline)
// - Correct DB updates after successful upload

describe("attachment queues", () => {
  it("enqueues receipts for later upload", () => {
    enqueueReceipt({
      id: "test",
      entity: "expense",
      entity_id: "expense-1",
      file_uri: "file:///tmp/receipt.jpg",
      bucket: "receipts",
      created_at: new Date().toISOString(),
      last_attempt_at: null,
      retry_count: 0,
      status: "pending",
      error_message: null,
    });

    const items = getQueuedReceipts();
    expect(items.length).toBeGreaterThan(0);
  });
});

