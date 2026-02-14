/**
 * PowerSync schema mirroring Supabase tables for offline-first sync.
 * See specs/002-offline-online-support/data-model.md
 *
 * Schema format follows PowerSync schema definition.
 * Tables and columns must match Supabase for sync to work.
 */

export const SCHEMA = `
-- Core finance tables
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  account_type TEXT,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_at TEXT,
  updated_at TEXT,
  group_id TEXT,
  is_default INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  category TEXT,
  is_recurring INTEGER DEFAULT 0,
  recurrence_interval TEXT,
  type TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  account_id TEXT,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  is_recurring INTEGER DEFAULT 0,
  recurrence_interval TEXT,
  is_essential INTEGER DEFAULT 1,
  entry_type TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  receipt_url TEXT
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  period TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  category TEXT,
  target_date TEXT,
  is_active INTEGER DEFAULT 1,
  icon TEXT,
  icon_color TEXT,
  description TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  next_payment_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  icon TEXT,
  icon_color TEXT,
  description TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT,
  from_account_id TEXT NOT NULL,
  to_account_id TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS personal_loans (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT,
  type TEXT NOT NULL,
  party_name TEXT NOT NULL,
  principal_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL,
  interest_rate REAL,
  due_date TEXT,
  status TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS account_groups (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type_id TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS account_types (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_asset INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  full_name TEXT,
  phone TEXT,
  user_type TEXT,
  email TEXT,
  image_url TEXT,
  created_at TEXT,
  updated_at TEXT
);
`;
