/**
 * Budgets service functions for managing spending budgets
 * Handles CRUD operations and queries by account, category, or period
 */
import { supabase } from "../database/supabase";
import type { Budget, BudgetWithAccount } from "../types/types";

export const fetchBudgets = async (userId: string): Promise<Budget[]> => {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required");
  }

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching budgets:", error);
    throw error;
  }

  return data || [];
};

export const fetchBudgetsWithAccounts = async (
  userId: string
): Promise<BudgetWithAccount[]> => {
  const { data, error } = await supabase
    .from("budgets")
    .select(
      `
      *,
      account:accounts(*)
    `
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching budgets with accounts:", error);
    throw error;
  }

  return data || [];
};

export const addBudget = async (
  budget: Omit<Budget, "id" | "created_at" | "updated_at">
): Promise<Budget> => {
  const { data, error } = await supabase
    .from("budgets")
    .insert(budget)
    .select()
    .single();

  if (error) {
    console.error("Error adding budget:", error);
    throw error;
  }

  return data;
};

export const updateBudget = async (
  budgetId: string,
  updates: Partial<Omit<Budget, "id" | "created_at" | "updated_at">>
): Promise<Budget> => {
  if (!budgetId || budgetId.trim() === "") {
    throw new Error("Budget ID is required");
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No updates provided");
  }

  const { data, error } = await supabase
    .from("budgets")
    .update(updates)
    .eq("id", budgetId)
    .select()
    .single();

  if (error) {
    console.error("Error updating budget:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Budget not found");
  }

  return data;
};

export const deleteBudget = async (budgetId: string): Promise<void> => {
  if (!budgetId || budgetId.trim() === "") {
    throw new Error("Budget ID is required");
  }

  const { error } = await supabase.from("budgets").delete().eq("id", budgetId);

  if (error) {
    console.error("Error deleting budget:", error);
    throw error;
  }
};

export const getBudgetById = async (
  budgetId: string
): Promise<Budget | null> => {
  if (!budgetId || budgetId.trim() === "") {
    throw new Error("Budget ID is required");
  }

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("id", budgetId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching budget by ID:", error);
    throw error;
  }

  return data;
};

export const getBudgetsByAccount = async (
  userId: string,
  accountId: string
): Promise<Budget[]> => {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required");
  }

  if (!accountId || accountId.trim() === "") {
    throw new Error("Account ID is required");
  }

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching budgets by account:", error);
    throw error;
  }

  return data || [];
};

export const getBudgetsByCategory = async (
  userId: string,
  category: string
): Promise<Budget[]> => {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching budgets by category:", error);
    throw error;
  }

  return data || [];
};

export const getBudgetsByPeriod = async (
  userId: string,
  period: "weekly" | "monthly" | "yearly"
): Promise<Budget[]> => {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("period", period)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching budgets by period:", error);
    throw error;
  }

  return data || [];
};

export const deactivateBudget = async (budgetId: string): Promise<void> => {
  if (!budgetId || budgetId.trim() === "") {
    throw new Error("Budget ID is required");
  }

  const { error } = await supabase
    .from("budgets")
    .update({ is_active: false })
    .eq("id", budgetId);

  if (error) {
    console.error("Error deactivating budget:", error);
    throw error;
  }
};

export const getActiveBudgets = async (userId: string): Promise<Budget[]> => {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching active budgets:", error);
    throw error;
  }

  return data || [];
};
