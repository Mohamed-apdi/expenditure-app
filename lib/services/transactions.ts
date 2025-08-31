import { supabase } from "../database/supabase";
import type { Transaction, TransactionWithAccounts } from "./types";

export const fetchTransactions = async (
  userId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }

  return data || [];
};

export const fetchTransactionsWithAccounts = async (
  userId: string
): Promise<TransactionWithAccounts[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      *,
      account:accounts(*),
      related_account:accounts!transactions_related_account_id_fkey(*)
    `
    )
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions with accounts:", error);
    throw error;
  }

  return data || [];
};

export const addTransaction = async (
  transaction: Omit<Transaction, "id" | "created_at" | "updated_at">
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from("transactions")
    .insert(transaction)
    .select()
    .single();

  if (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }

  return data;
};

export const updateTransaction = async (
  transactionId: string,
  updates: Partial<Omit<Transaction, "id" | "created_at" | "updated_at">>
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transactionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }

  return data;
};

export const deleteTransaction = async (
  transactionId: string
): Promise<void> => {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

export const getTransactionById = async (
  transactionId: string
): Promise<Transaction | null> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching transaction by ID:", error);
    throw error;
  }

  return data;
};

export const getTransactionsByAccount = async (
  userId: string,
  accountId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by account:", error);
    throw error;
  }

  return data || [];
};

export const getTransactionsByType = async (
  userId: string,
  type: "expense" | "income" | "transfer"
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by type:", error);
    throw error;
  }

  return data || [];
};

export const getTransactionsByCategory = async (
  userId: string,
  category: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by category:", error);
    throw error;
  }

  return data || [];
};

export const getTransactionsByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by date range:", error);
    throw error;
  }

  return data || [];
};

export const getRecurringTransactions = async (
  userId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_recurring", true)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching recurring transactions:", error);
    throw error;
  }

  return data || [];
};
