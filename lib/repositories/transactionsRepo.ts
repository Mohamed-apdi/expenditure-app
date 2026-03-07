import { getPowerSyncDb } from "../powersync/client";
import type { LocalStatus } from "../db/schema";
import { buildUpsert } from "../db/sql";

export interface TransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  date: string;
  type: string;
  description?: string | null;
  category?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  __local_status?: LocalStatus;
}

export async function listTransactionsForAccount(
  userId: string,
  accountId: string,
): Promise<TransactionRow[]> {
  const db = getPowerSyncDb();
  if (!db) return [];

  const result = await db.execute(
    `
    SELECT * FROM transactions
    WHERE user_id = ? AND account_id = ?
    ORDER BY date DESC, created_at DESC
  `,
    [userId, accountId],
  );

  return (result.rows?._array ?? []) as TransactionRow[];
}

export async function addLocalTransaction(
  tx: Omit<TransactionRow, "__local_status">,
): Promise<void> {
  const db = getPowerSyncDb();
  if (!db) {
    throw new Error("[transactionsRepo] Local DB is not available");
  }

  const now = new Date().toISOString();

  const UPSERT_SQL = buildUpsert("transactions", "id", [
    "id",
    "user_id",
    "account_id",
    "amount",
    "description",
    "date",
    "category",
    "type",
    "created_at",
    "updated_at",
  ]);

  await db.execute(UPSERT_SQL, [
    tx.id,
    tx.user_id,
    tx.account_id,
    tx.amount,
    tx.description ?? null,
    tx.date,
    tx.category ?? null,
    tx.type,
    tx.created_at ?? now,
    tx.updated_at ?? now,
  ]);
}

