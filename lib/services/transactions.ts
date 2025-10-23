import { supabase } from "../database/supabase";
import type { Transaction, TransactionWithAccounts } from "../types/types";

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
  }
) => {
  const transactions = await searchTransactions(userId, filters?.searchQuery || "", {
    accountId: filters?.accountId,
    type: filters?.type,
  });

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const todayStr = today.toISOString().split("T")[0];
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const lastWeekStr = lastWeek.toISOString().split("T")[0];

  const todayTransactions = transactions.filter((t) => t.date === todayStr);
  const yesterdayTransactions = transactions.filter((t) => t.date === yesterdayStr);
  const lastWeekTransactions = transactions.filter(
    (t) => t.date < yesterdayStr && t.date >= lastWeekStr
  );
  const olderTransactions = transactions.filter((t) => t.date < lastWeekStr);

  const sections = [];

  if (todayTransactions.length > 0) {
    sections.push({ title: "Today", data: todayTransactions });
  }
  if (yesterdayTransactions.length > 0) {
    sections.push({ title: "Yesterday", data: yesterdayTransactions });
  }
  if (lastWeekTransactions.length > 0) {
    sections.push({ title: "Last Week", data: lastWeekTransactions });
  }
  if (olderTransactions.length > 0) {
    sections.push({ title: "Older", data: olderTransactions });
  }

  return sections;
};
