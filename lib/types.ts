/*
Database Schema Changes Made:
- Renamed 'group_name' to 'account_type' in accounts table
- Removed 'type' field (asset/liability) from accounts table
- Updated all related TypeScript interfaces and functions
*/

export type AccountType = {
  id: string;
  name: string;
  description?: string;
  is_asset: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountGroup = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type_id?: string;
  created_at: string;
  updated_at: string;
};

export interface Account {
  id: string;
  user_id: string;
  account_type: string; // Renamed from group_name
  name: string;
  amount: number;
  description?: string;
  // Removed type field
  created_at: string;
  updated_at: string;
  group_id?: string;
  is_default: boolean;
  currency: string;
}

export type Budget = {
  id: string;
  user_id: string;
  account_id: string;
  category: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  user_id?: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  payment_method?: string;
  is_recurring: boolean;
  recurrence_interval?: string;
  is_essential: boolean;
  created_at: string;
  updated_at: string;
  receipt_url?: string;
  entry_type: 'Income' | 'Expense';
  account_id?: string;
};

export type Profile = {
  id: string;
  full_name?: string;
  phone?: string;
  user_type: string;
  created_at: string;
  image_url?: string;
  email?: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  related_account_id?: string;
  amount: number;
  description?: string;
  date: string;
  category?: string;
  is_recurring: boolean;
  recurrence_interval?: string;
  type: 'expense' | 'income' | 'transfer';
  created_at: string;
  updated_at: string;
};

export type Transfer = {
  id: string;
  user_id?: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description?: string;
  date: string;
  created_at: string;
  updated_at: string;
};

// Extended types with relationships
export type AccountWithGroup = Account & {
  group?: AccountGroup;
  type_info?: AccountType;
};

export type BudgetWithAccount = Budget & {
  account?: Account;
};

export type ExpenseWithAccount = Expense & {
  account?: Account;
};

export type TransactionWithAccounts = Transaction & {
  account?: Account;
  related_account?: Account;
};

export type TransferWithAccounts = Transfer & {
  from_account?: Account;
  to_account?: Account;
};

export type Subscription = {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  amount: number;
  category: string;
  billing_cycle: 'weekly' | 'monthly' | 'yearly';
  next_payment_date: string;
  is_active: boolean;
  icon: string;
  icon_color: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type SubscriptionWithAccount = Subscription & {
  account?: Account;
};

export type Goal = {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  category: string;
  target_date: string;
  is_active: boolean;
  icon: string;
  icon_color: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type GoalWithAccount = Goal & {
  account?: Account;
};
