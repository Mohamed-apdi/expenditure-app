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
export const useDashboardData = (userId: string | null, accountId?: string) => {
  return useQuery({
    queryKey: ["dashboard-data", userId, accountId],
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

      // Filter transactions by account if needed
      const filteredTransactions = accountId
        ? transactions.filter((t: Transaction) => t.account_id === accountId)
        : transactions;

      return {
        profile,
        transactions: filteredTransactions,
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
  const { data, isLoading, error } = useDashboardData(userId, accountId);
  return {
    data: data?.transactions || [],
    isLoading,
    error,
  };
};

export const useFinancialSummary = (
  userId: string | null,
  accountId?: string
) => {
  const { data, isLoading, error } = useDashboardData(userId, accountId);
  return {
    data: data?.financialSummary,
    isLoading,
    error,
  };
};

export const useCategorySummary = (
  userId: string | null,
  accountId?: string
) => {
  const { data, isLoading, error } = useDashboardData(userId, accountId);
  return {
    data: data?.categorySummary,
    isLoading,
    error,
  };
};

export const useAccountBalances = (
  userId: string | null,
  accountId?: string
) => {
  const { data, isLoading, error } = useDashboardData(userId, accountId);
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
  const { data, isLoading, error } = useDashboardData(userId, accountId);

  const recentTransactions =
    data?.transactions
      ?.sort(
        (a: Transaction, b: Transaction) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit) || [];

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
  const { data, isLoading, error } = useDashboardData(userId, accountId);

  const monthData = data?.transactions
    ? (() => {
        const startDate = new Date(year, month, 1).toISOString().split("T")[0];
        const endDate = new Date(year, month + 1, 0)
          .toISOString()
          .split("T")[0];

        const monthTransactions = data.transactions.filter(
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
