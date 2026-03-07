/**
 * Local-first data layer: read from local DB, write to local DB + enqueue for sync.
 * Services use these when isLocalDbAvailable() so the app works offline.
 */

import { getLocalDb } from "../database/localDb";
import { enqueue } from "./changeQueue";
import type { Transaction } from "../types/types";
import type { Account } from "../types/types";

function rowToTransaction(r: Record<string, unknown>): Transaction {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    account_id: String(r.account_id),
    amount: Number(r.amount),
    description: r.description != null ? String(r.description) : undefined,
    date: String(r.date),
    category: r.category != null ? String(r.category) : undefined,
    is_recurring: Number(r.is_recurring) === 1,
    recurrence_interval: r.recurrence_interval != null ? String(r.recurrence_interval) : undefined,
    type: r.type as "expense" | "income" | "transfer",
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

function rowToAccount(r: Record<string, unknown>): Account {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    account_type: String(r.account_type ?? ""),
    name: String(r.name),
    amount: Number(r.amount),
    description: r.description != null ? String(r.description) : undefined,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
    group_id: r.group_id != null ? String(r.group_id) : undefined,
    is_default: Number(r.is_default) === 1,
    currency: String(r.currency ?? "USD"),
  };
}

export async function fetchTransactionsLocal(userId: string): Promise<Transaction[]> {
  const db = getLocalDb();
  if (!db) return [];
  const result = await db.execute(
    "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC",
    [userId]
  );
  const rows = result.rows?._array ?? [];
  return rows.map((r: unknown) => rowToTransaction(r as Record<string, unknown>));
}

export async function addTransactionLocal(
  t: Omit<Transaction, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<Transaction> {
  const db = getLocalDb();
  if (!db) throw new Error("Local DB not available");
  const id = t.id ?? `txn_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: t.user_id,
    account_id: t.account_id,
    amount: t.amount,
    description: t.description ?? null,
    date: t.date,
    category: t.category ?? null,
    is_recurring: t.is_recurring ? 1 : 0,
    recurrence_interval: t.recurrence_interval ?? null,
    type: t.type,
    created_at: now,
    updated_at: now,
  };
  await db.execute(
    `INSERT OR REPLACE INTO transactions (id, user_id, account_id, amount, description, date, category, is_recurring, recurrence_interval, type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.user_id,
      row.account_id,
      row.amount,
      row.description,
      row.date,
      row.category,
      row.is_recurring,
      row.recurrence_interval,
      row.type,
      row.created_at,
      row.updated_at,
    ]
  );
  await enqueue("transaction", id, "insert", row as Record<string, unknown>);
  return rowToTransaction(row as Record<string, unknown>);
}

export async function updateTransactionLocal(
  transactionId: string,
  updates: Partial<Omit<Transaction, "id" | "created_at" | "updated_at">>
): Promise<Transaction> {
  const db = getLocalDb();
  if (!db) throw new Error("Local DB not available");
  const result = await db.execute("SELECT * FROM transactions WHERE id = ?", [transactionId]);
  const existing = result.rows?._array?.[0] as Record<string, unknown> | undefined;
  if (!existing) throw new Error("Transaction not found");
  const now = new Date().toISOString();
  const merged = { ...existing, ...updates, updated_at: now };
  await db.execute(
    `UPDATE transactions SET user_id=?, account_id=?, amount=?, description=?, date=?, category=?, is_recurring=?, recurrence_interval=?, type=?, updated_at=? WHERE id=?`,
    [
      merged.user_id,
      merged.account_id,
      merged.amount,
      merged.description ?? null,
      merged.date,
      merged.category ?? null,
      merged.is_recurring ? 1 : 0,
      merged.recurrence_interval ?? null,
      merged.type,
      merged.updated_at,
      transactionId,
    ]
  );
  await enqueue("transaction", transactionId, "update", merged as Record<string, unknown>);
  return rowToTransaction(merged as Record<string, unknown>);
}

export async function deleteTransactionLocal(transactionId: string): Promise<void> {
  const db = getLocalDb();
  if (!db) throw new Error("Local DB not available");
  await db.execute("DELETE FROM transactions WHERE id = ?", [transactionId]);
  await enqueue("transaction", transactionId, "delete", { id: transactionId });
}

export async function fetchAccountsLocal(userId: string): Promise<Account[]> {
  const db = getLocalDb();
  if (!db) return [];
  const result = await db.execute(
    "SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  const rows = result.rows?._array ?? [];
  return rows.map((r: unknown) => rowToAccount(r as Record<string, unknown>));
}

export async function createAccountLocal(accountData: {
  user_id: string;
  account_type: string;
  name: string;
  amount: number;
  description?: string;
  group_id?: string;
  is_default?: boolean;
  currency?: string;
}): Promise<Account> {
  const db = getLocalDb();
  if (!db) throw new Error("Local DB not available");
  const id = `acc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: accountData.user_id,
    account_type: accountData.account_type,
    name: accountData.name,
    amount: accountData.amount,
    description: accountData.description ?? null,
    created_at: now,
    updated_at: now,
    group_id: accountData.group_id ?? null,
    is_default: accountData.is_default ? 1 : 0,
    currency: accountData.currency ?? "USD",
  };
  await db.execute(
    `INSERT OR REPLACE INTO accounts (id, user_id, account_type, name, amount, description, created_at, updated_at, group_id, is_default, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.user_id,
      row.account_type,
      row.name,
      row.amount,
      row.description,
      row.created_at,
      row.updated_at,
      row.group_id,
      row.is_default,
      row.currency,
    ]
  );
  await enqueue("account", id, "insert", row as Record<string, unknown>);
  return rowToAccount(row as Record<string, unknown>);
}

export async function updateAccountLocal(
  accountId: string,
  updates: Partial<{
    account_type: string;
    name: string;
    amount: number;
    description: string;
    group_id: string;
    is_default: boolean;
    currency: string;
  }>
): Promise<Account> {
  const db = getLocalDb();
  if (!db) throw new Error("Local DB not available");
  const result = await db.execute("SELECT * FROM accounts WHERE id = ?", [accountId]);
  const existing = result.rows?._array?.[0] as Record<string, unknown> | undefined;
  if (!existing) throw new Error("Account not found");
  const now = new Date().toISOString();
  const merged = { ...existing, ...updates, updated_at: now };
  await db.execute(
    `UPDATE accounts SET account_type=?, name=?, amount=?, description=?, updated_at=?, group_id=?, is_default=?, currency=? WHERE id=?`,
    [
      merged.account_type,
      merged.name,
      merged.amount,
      merged.description ?? null,
      merged.updated_at,
      merged.group_id ?? null,
      merged.is_default ? 1 : 0,
      merged.currency ?? "USD",
      accountId,
    ]
  );
  await enqueue("account", accountId, "update", merged as Record<string, unknown>);
  return rowToAccount(merged as Record<string, unknown>);
}

export async function deleteAccountLocal(accountId: string): Promise<void> {
  const db = getLocalDb();
  if (!db) throw new Error("Local DB not available");
  await db.execute("DELETE FROM accounts WHERE id = ?", [accountId]);
  await enqueue("account", accountId, "delete", { id: accountId });
}

export async function getTransactionByIdLocal(transactionId: string): Promise<Transaction | null> {
  const db = getLocalDb();
  if (!db) return null;
  const result = await db.execute("SELECT * FROM transactions WHERE id = ?", [transactionId]);
  const row = result.rows?._array?.[0] as Record<string, unknown> | undefined;
  return row ? rowToTransaction(row) : null;
}
