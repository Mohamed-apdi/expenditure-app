import type { LocalStatus } from "../db/schema";
import { buildUpsert } from "../db/sql";
import { getPowerSyncDb } from "../powersync/client";

export interface AccountRow {
  id: string;
  user_id: string | null;
  name: string;
  amount: number;
  account_type?: string | null;
  group_id?: string | null;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  __local_status?: LocalStatus;
  deleted_at?: string | null;
  __local_updated_at?: string | null;
  __last_error?: string | null;
}

export async function listAccounts(userId: string): Promise<AccountRow[]> {
  const db = getPowerSyncDb();
  if (!db) {
    // Local DB not initialized; callers may choose to show an error or fallback.
    return [];
  }

  const result = await db.execute(
    "SELECT * FROM accounts WHERE user_id = ? AND deleted_at IS NULL ORDER BY name ASC",
    [userId],
  );

  const rows = (result.rows?._array ?? []) as AccountRow[];
  return rows;
}

export async function upsertAccount(
  account: Omit<AccountRow, "__local_status">,
): Promise<void> {
  const db = getPowerSyncDb();
  if (!db) {
    throw new Error("[accountsRepo] Local DB is not available");
  }

  const now = new Date().toISOString();
  const UPSERT_SQL = buildUpsert("accounts", "id", [
    "id",
    "user_id",
    "name",
    "amount",
    "account_type",
    "group_id",
    "currency",
    "created_at",
    "updated_at",
    "deleted_at",
    "__local_status",
    "__local_updated_at",
    "__last_error",
  ]);

  await db.execute(UPSERT_SQL, [
    account.id,
    account.user_id,
    account.name,
    account.amount,
    account.account_type ?? null,
    account.group_id ?? null,
    account.currency ?? null,
    account.created_at ?? now,
    account.updated_at ?? now,
    account.deleted_at ?? null,
    account.__local_status ?? "pending",
    account.__local_updated_at ?? now,
    account.__last_error ?? null,
  ]);
}
