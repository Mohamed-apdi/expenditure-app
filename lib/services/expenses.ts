import { supabase } from "../database/supabase";
import type { Expense, ExpenseWithAccount } from "../types/types";

interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  entry_type?: string;
}

export const fetchExpenses = async (
  userId: string,
  filters: ExpenseFilters = {}
) => {
  let query = supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  // Apply filters
  if (filters.startDate) query = query.gte("date", filters.startDate);
  if (filters.endDate) query = query.lte("date", filters.endDate);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.entry_type) query = query.eq("entry_type", filters.entry_type);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }

  return data || [];
};

export const fetchExpensesWithAccounts = async (
  userId: string,
  filters: ExpenseFilters = {}
): Promise<ExpenseWithAccount[]> => {
  let query = supabase
    .from("expenses")
    .select(
      `
      *,
      account:accounts(*)
    `
    )
    .eq("user_id", userId)
    .order("date", { ascending: false });

  // Apply filters
  if (filters.startDate) query = query.gte("date", filters.startDate);
  if (filters.endDate) query = query.lte("date", filters.endDate);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.entry_type) query = query.eq("entry_type", filters.entry_type);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching expenses with accounts:", error);
    throw error;
  }

  return data || [];
};

export const addExpense = async (
  expense: Omit<Expense, "id" | "created_at" | "updated_at">
): Promise<Expense> => {
  const { data, error } = await supabase
    .from("expenses")
    .insert(expense)
    .select()
    .single();

  if (error) {
    console.error("Error adding expense:", error);
    throw error;
  }

  return data;
};

export const updateExpense = async (
  expenseId: string,
  updates: Partial<Omit<Expense, "id" | "created_at" | "updated_at">>
): Promise<Expense> => {
  const { data, error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", expenseId)
    .select()
    .single();

  if (error) {
    console.error("Error updating expense:", error);
    throw error;
  }

  return data;
};

export const deleteExpense = async (id: string): Promise<void> => {
  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};

export const getExpenseById = async (
  expenseId: string
): Promise<Expense | null> => {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", expenseId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching expense by ID:", error);
    throw error;
  }

  return data;
};

export const getExpensesByCategory = async (
  userId: string,
  category: string
): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching expenses by category:", error);
    throw error;
  }

  return data || [];
};

export const getExpensesByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching expenses by date range:", error);
    throw error;
  }

  return data || [];
};
