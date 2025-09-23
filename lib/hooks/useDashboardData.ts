import { useQuery } from "@tanstack/react-query";
import { supabase } from "../database/supabase";
import {
  getFinancialSummary,
  getExpensesByCategory,
} from "../services/analytics";
import { fetchAllTransactionsAndTransfers } from "../services/transactions";
import { fetchProfile } from "../services/profiles";
import { fetchAccounts } from "../services/accounts";
import type { Transaction } from "../types/types";

// �� CENTRALIZED DATA HOOK - Fetch all data once
export const useDashboardData = (userId: string | null) => {
  return useQuery({
    queryKey: ["dashboard-data", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      // Fetch all data in parallel
      const [
        profile,
        transactions,
        financialSummary,
        categorySummary,
        accounts,
      ] = await Promise.all([
        fetchProfile(userId),
        fetchAllTransactionsAndTransfers(userId),
        getFinancialSummary(userId),
        getExpensesByCategory(userId),
        fetchAccounts(userId),
      ]);

      return {
        profile,
        transactions, // Return all transactions, filter client-side
        financialSummary,
        categorySummary,
        accounts,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
};

// 🎯 DERIVED HOOKS - Use cached data from main hook
export const useUserProfile = (userId: string | null) => {
  const { data } = useDashboardData(userId);
  return {
    data: data?.profile,
    isLoading: !data,
    error: null,
  };
};

export const useTransactions = (userId: string | null, accountId?: string) => {
  const { data, isLoading, error } = useDashboardData(userId);

  // Filter transactions client-side
  const filteredTransactions = accountId
    ? data?.transactions?.filter(
        (t: Transaction) => t.account_id === accountId
      ) || []
    : data?.transactions || [];

  return {
    data: filteredTransactions,
    isLoading,
    error,
  };
};

export const useFinancialSummary = (
  userId: string | null,
  accountId?: string
) => {
  const { data, isLoading, error } = useDashboardData(userId);

  // Filter transactions for financial summary if accountId is provided
  const filteredTransactions = accountId
    ? data?.transactions?.filter(
        (t: Transaction) => t.account_id === accountId
      ) || []
    : data?.transactions || [];

  // Calculate financial summary from filtered transactions
  const financialSummary = data?.financialSummary;
  if (accountId && filteredTransactions.length > 0) {
    // Recalculate summary for specific account
    const income = filteredTransactions
      .filter((t: Transaction) => t.type === "income")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const expense = filteredTransactions
      .filter((t: Transaction) => t.type === "expense")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      data: { ...financialSummary, income, expense, balance: income - expense },
      isLoading,
      error,
    };
  }

  return {
    data: financialSummary,
    isLoading,
    error,
  };
};

export const useCategorySummary = (
  userId: string | null,
  accountId?: string
) => {
  const { data, isLoading, error } = useDashboardData(userId);

  // Filter transactions for category summary if accountId is provided
  const filteredTransactions = accountId
    ? data?.transactions?.filter(
        (t: Transaction) => t.account_id === accountId
      ) || []
    : data?.transactions || [];

  // Calculate category summary from filtered transactions
  const categorySummary = data?.categorySummary;
  if (accountId && filteredTransactions.length > 0) {
    // Recalculate category summary for specific account
    const categoryMap = new Map();
    filteredTransactions
      .filter((t: Transaction) => t.type === "expense" && t.category)
      .forEach((t: Transaction) => {
        const category = t.category!;
        const amount = t.amount || 0;
        categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      });

    const recalculatedSummary = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({
        category,
        amount,
      })
    );

    return {
      data: recalculatedSummary,
      isLoading,
      error,
    };
  }

  return {
    data: categorySummary,
    isLoading,
    error,
  };
};

export const useAccountBalances = (
  userId: string | null,
  accountId?: string
) => {
  const { data, isLoading, error } = useDashboardData(userId);
  return {
    data: data?.accounts,
    isLoading,
    error,
  };
};

export const useRecentTransactions = (
  userId: string | null,
  accountId?: string,
  limit: number = 6
) => {
  const { data, isLoading, error } = useDashboardData(userId);

  // Filter transactions client-side
  const filteredTransactions = accountId
    ? data?.transactions?.filter(
        (t: Transaction) => t.account_id === accountId
      ) || []
    : data?.transactions || [];

  const recentTransactions = filteredTransactions
    .sort(
      (a: Transaction, b: Transaction) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);

  return {
    data: recentTransactions,
    isLoading,
    error,
  };
};

export const useMonthData = (
  userId: string | null,
  month: number,
  year: number,
  accountId?: string
) => {
  const { data, isLoading, error } = useDashboardData(userId);

  // Filter transactions client-side
  const filteredTransactions = accountId
    ? data?.transactions?.filter(
        (t: Transaction) => t.account_id === accountId
      ) || []
    : data?.transactions || [];

  const monthData =
    filteredTransactions.length > 0
      ? (() => {
          const startDate = new Date(year, month, 1)
            .toISOString()
            .split("T")[0];
          const endDate = new Date(year, month + 1, 0)
            .toISOString()
            .split("T")[0];

          const monthTransactions = filteredTransactions.filter(
            (t: Transaction) => t.date >= startDate && t.date <= endDate
          );

          let monthIncome = 0;
          let monthExpense = 0;

          monthTransactions.forEach((t: Transaction) => {
            const amount = t.amount || 0;
            if (t.type === "income") {
              monthIncome += amount;
            } else if (t.type === "expense") {
              monthExpense += amount;
            }
          });

          return {
            transactions: monthTransactions,
            summary: {
              income: monthIncome,
              expense: monthExpense,
              balance: monthIncome - monthExpense,
            },
          };
        })()
      : null;

  return {
    data: monthData,
    isLoading,
    error,
  };
};
