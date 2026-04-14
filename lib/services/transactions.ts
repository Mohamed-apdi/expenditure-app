/**
 * Transactions service functions for managing financial transactions
 * Handles CRUD operations, filtering, search, and analytics
 */
import { supabase } from "../database/supabase";
import type { Transaction, TransactionWithAccounts } from "../types/types";
import { format } from "date-fns";

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
      related_account:accounts!transactions_account_id_fkey(*)
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
  if (!transactionId || transactionId.trim() === "") {
    throw new Error("Transaction ID is required");
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No updates provided");
  }

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

  if (!data) {
    throw new Error("Transaction not found");
  }

  return data;
};

/**
 * Insert or update a transaction by id. Use when the row may not exist in
 * Supabase yet (e.g. local-only or not yet synced) to avoid PGRST116.
 */
export const upsertTransaction = async (
  transactionId: string,
  data: Omit<Transaction, "id" | "created_at" | "updated_at">
): Promise<Transaction> => {
  if (!transactionId || transactionId.trim() === "") {
    throw new Error("Transaction ID is required");
  }

  const { data: row, error } = await supabase
    .from("transactions")
    .upsert({ id: transactionId, ...data }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Error upserting transaction:", error);
    throw error;
  }

  if (!row) {
    throw new Error("Transaction upsert failed");
  }

  return row;
};

export const deleteTransaction = async (
  transactionId: string
): Promise<void> => {
  if (!transactionId || transactionId.trim() === "") {
    throw new Error("Transaction ID is required");
  }

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
  if (!transactionId || transactionId.trim() === "") {
    throw new Error("Transaction ID is required");
  }

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
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required");
  }

  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required");
  }

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

// Enhanced filtering and search functions
export const searchTransactions = async (
  userId: string,
  searchQuery: string,
  filters?: {
    accountId?: string;
    type?: "expense" | "income" | "transfer";
    category?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<Transaction[]> => {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId);

  // Apply filters
  if (filters?.accountId) {
    query = query.eq("account_id", filters.accountId);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.startDate) {
    query = query.gte("date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("date", filters.endDate);
  }

  // Apply search query
  if (searchQuery.trim()) {
    query = query.or(
      `description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`
    );
  }

  const { data, error } = await query.order("date", { ascending: false });

  if (error) {
    console.error("Error searching transactions:", error);
    throw error;
  }

  return data || [];
};

// Get transaction analytics/summary
export const getTransactionAnalytics = async (
  userId: string,
  filters?: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId);

  // Apply filters
  if (filters?.accountId) {
    query = query.eq("account_id", filters.accountId);
  }
  if (filters?.startDate) {
    query = query.gte("date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("date", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching transaction analytics:", error);
    throw error;
  }

  const transactions = data || [];

  // Calculate analytics
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalTransfers = transactions
    .filter(t => t.type === "transfer")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const categoryBreakdown = transactions.reduce((acc, t) => {
    if (t.category) {
      if (!acc[t.category]) {
        acc[t.category] = { amount: 0, count: 0 };
      }
      acc[t.category].amount += Math.abs(t.amount);
      acc[t.category].count += 1;
    }
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);

  // Calculate percentages for categories
  Object.keys(categoryBreakdown).forEach(category => {
    const total = categoryBreakdown[category].amount;
    categoryBreakdown[category].percentage = totalExpenses > 0
      ? (total / totalExpenses) * 100
      : 0;
  });

  return {
    summary: {
      total_transactions: transactions.length,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      total_transfers: totalTransfers,
      net_amount: totalIncome - totalExpenses,
      average_transaction: transactions.length > 0
        ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length
        : 0,
    },
    category_breakdown: categoryBreakdown,
    transactions: transactions,
  };
};

// Get transactions grouped by date (for section lists)
export const getTransactionsGroupedByDate = async (
  userId: string,
  filters?: {
    accountId?: string;
    type?: "expense" | "income" | "transfer";
    searchQuery?: string;
    category?: string;
  }
) => {
  const transactions = await searchTransactions(userId, filters?.searchQuery || "", {
    accountId: filters?.accountId,
    type: filters?.type,
    category: filters?.category,
  });

  const txYmd = (t: any): string | null => {
    const d = typeof t?.date === "string" ? t.date : "";
    if (d && d.length >= 10) return d.slice(0, 10);
    const c = typeof t?.created_at === "string" ? t.created_at : "";
    if (c && c.length >= 10) return c.slice(0, 10);
    return null;
  };

  const byDay = new Map<string, any[]>();
  for (const t of transactions as any[]) {
    const key = txYmd(t);
    if (!key) continue;
    const arr = byDay.get(key);
    if (arr) arr.push(t);
    else byDay.set(key, [t]);
  }

  const sortedKeys = [...byDay.keys()].sort((a, b) => b.localeCompare(a));
  return sortedKeys.map((dateKey) => {
    const items = [...(byDay.get(dateKey) ?? [])];
    items.sort((a, b) => {
      const aTime = a?.created_at ?? "";
      const bTime = b?.created_at ?? "";
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    const [y, m, d] = dateKey.split("-").map(Number);
    const localDay = new Date(y, m - 1, d);
    // Match Dashboard label format: "Sun, 5 Apr"
    const title = format(localDay, "EEE, d MMM");
    return { title, data: items };
  });
};
