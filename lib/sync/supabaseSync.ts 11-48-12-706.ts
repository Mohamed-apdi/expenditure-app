/**
 * Push pending changes to Supabase and pull remote data into local DB.
 * Used when PowerSync backend is not available; provides offline-first sync.
 */

import { getLocalDb } from "../database/localDb";
import { supabase } from "../database/supabase";
import { dequeue, getPendingChanges, recordRetry } from "./changeQueue";

export async function pushPendingToSupabase(): Promise<{
  pushed: number;
  failed: number;
}> {
  const pending = await getPendingChanges();
  let pushed = 0;
  let failed = 0;
  for (const change of pending) {
    try {
      const table =
        change.entityType === "transaction"
          ? "transactions"
          : change.entityType === "account"
            ? "accounts"
            : change.entityType;
      if (table !== "transactions" && table !== "accounts") {
        failed++;
        continue;
      }
      const payload = change.payload as Record<string, unknown>;
      if (change.operation === "insert") {
        const { error } = await supabase
          .from(table)
          .upsert(payload, { onConflict: "id" });
        if (error) throw error;
      } else if (change.operation === "update") {
        const { id, ...rest } = payload as { id: string; [k: string]: unknown };
        const { error } = await supabase.from(table).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const id = payload.id as string;
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
      }
      await dequeue(change.id);
      pushed++;
    } catch (e) {
      await recordRetry(change.id, e instanceof Error ? e.message : String(e));
      failed++;
    }
  }
  return { pushed, failed };
}

export async function pullFromSupabaseIntoLocal(userId: string): Promise<void> {
  const local = getLocalDb();
  if (!local) return;

  const now = new Date().toISOString();
  const ts = (v: unknown) =>
    v != null ? `'${String(v).replace(/'/g, "''")}'` : "NULL";

  // Pull transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (transactions?.length) {
    for (const row of transactions) {
      await local.execute(
        `INSERT OR REPLACE INTO transactions (id, user_id, account_id, amount, description, date, category, is_recurring, recurrence_interval, type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.user_id,
          row.account_id,
          row.amount,
          row.description ?? null,
          row.date,
          row.category ?? null,
          row.is_recurring ? 1 : 0,
          row.recurrence_interval ?? null,
          row.type,
          row.created_at ?? now,
          row.updated_at ?? now,
        ],
      );
    }
  }

  // Pull accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (accounts?.length) {
    for (const row of accounts) {
      await local.execute(
        `INSERT OR REPLACE INTO accounts (id, user_id, account_type, name, amount, description, created_at, updated_at, group_id, is_default, currency)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.user_id,
          row.account_type ?? null,
          row.name,
          row.amount ?? 0,
          row.description ?? null,
          row.created_at ?? now,
          row.updated_at ?? now,
          row.group_id ?? null,
          row.is_default ? 1 : 0,
          row.currency ?? "USD",
        ],
      );
    }
  }
}

export async function runSync(
  userId: string,
): Promise<{ pushed: number; failed: number }> {
  const result = await pushPendingToSupabase();
  await pullFromSupabaseIntoLocal(userId);
  return result;
}
