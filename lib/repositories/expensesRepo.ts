import { getPowerSyncDb } from "../powersync/client";
import type { LocalStatus } from "../db/schema";
import { buildUpsert } from "../db/sql";

export interface ExpenseRow {
  id: string;
  user_id: string | null;
  account_id: string | null;
  amount: number;
  category: string;
  description?: string | null;
  date: string;
  receipt_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  __local_status?: LocalStatus;
}

export async function listExpensesByDateRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<ExpenseRow[]> {
  const db = getPowerSyncDb();
  if (!db) return [];

  const result = await db.execute(
    `
    SELECT * FROM expenses
    WHERE user_id = ?
      AND date >= ?
      AND date <= ?
    ORDER BY date DESC, created_at DESC
  `,
    [userId, startDate, endDate],
  );

  return (result.rows?._array ?? []) as ExpenseRow[];
}

export async function upsertExpense(
  expense: Omit<ExpenseRow, "__local_status">,
): Promise<void> {
  const db = getPowerSyncDb();
  if (!db) {
    throw new Error("[expensesRepo] Local DB is not available");
  }

  const now = new Date().toISOString();
  const UPSERT_SQL = buildUpsert("expenses", "id", [
    "id",
    "user_id",
    "account_id",
    "amount",
    "category",
    "description",
    "date",
    "receipt_url",
    "created_at",
    "updated_at",
  ]);

  await db.execute(UPSERT_SQL, [
    expense.id,
    expense.user_id,
    expense.account_id,
    expense.amount,
    expense.category,
    expense.description ?? null,
    expense.date,
    expense.receipt_url ?? null,
    expense.created_at ?? now,
    expense.updated_at ?? now,
  ]);
}


