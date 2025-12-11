import { useQuery } from "@tanstack/react-query";
import { supabase } from "../database/supabase";
import {
  getFinancialSummary,
  getExpensesByCategory,
  getAccountBalances,
} from "../services/analytics";
import { fetchTransactions } from "../services/transactions";
import { fetchProfile } from "../services/profiles";
import type { Transaction } from "../types/types";

/**
 * Hook to fetch user profile data
 * @param userId - The user ID to fetch profile for
 * @returns React Query result with user profile data
 */
export const useUserProfile = (userId: string | null) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch transactions for a user, optionally filtered by account
 * @param userId - The user ID to fetch transactions for
 * @param accountId - Optional account ID to filter transactions
 * @returns React Query result with filtered transaction data
 */
export const useTransactions = (userId: string | null, accountId?: string) => {
  return useQuery({
    queryKey: ["transactions", userId, accountId],
    queryFn: () => fetchTransactions(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => {
      if (accountId) {
        return data.filter((t: Transaction) => t.account_id === accountId);
      }
      return data;
    },
  });
};

/**
 * Hook to fetch financial summary data for a user
 * @param userId - The user ID to fetch summary for
 * @param accountId - Optional account ID (currently not used in query but included for consistency)
 * @returns React Query result with financial summary data
 */
export const useFinancialSummary = (
  userId: string | null,
  accountId?: string
) => {
  return useQuery({
    queryKey: ["financial-summary", userId, accountId],
    queryFn: () => getFinancialSummary(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch expenses grouped by category
 * @param userId - The user ID to fetch category summary for
 * @param accountId - Optional account ID (currently not used in query but included for consistency)
 * @returns React Query result with expenses grouped by category
 */
export const useCategorySummary = (
  userId: string | null,
  accountId?: string
) => {
  return useQuery({
    queryKey: ["category-summary", userId, accountId],
    queryFn: () => getExpensesByCategory(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch account balances for a user
 * @param userId - The user ID to fetch balances for
 * @param accountId - Optional account ID (currently not used in query but included for consistency)
 * @returns React Query result with account balance data
 */
export const useAccountBalances = (
  userId: string | null,
  accountId?: string
) => {
  return useQuery({
    queryKey: ["account-balances", userId, accountId],
    queryFn: () => getAccountBalances(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to fetch recent transactions, sorted by date and limited to a specified count
 * @param userId - The user ID to fetch transactions for
 * @param accountId - Optional account ID to filter transactions
 * @param limit - Maximum number of transactions to return (default: 6)
 * @returns React Query result with recent transaction data
 */
export const useRecentTransactions = (
  userId: string | null,
  accountId?: string,
  limit: number = 6
) => {
  return useQuery({
    queryKey: ["recent-transactions", userId, accountId, limit],
    queryFn: () => fetchTransactions(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => {
      let filteredData = data;
      if (accountId) {
        filteredData = data.filter((t: Transaction) => t.account_id === accountId);
      }

      return filteredData
        .sort(
          (a: Transaction, b: Transaction) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, limit);
    },
  });
};

/**
 * Hook to fetch transaction data for a specific month with summary calculations
 * @param userId - The user ID to fetch data for
 * @param month - Month number (0-11, where 0 is January)
 * @param year - Year number
 * @param accountId - Optional account ID to filter transactions
 * @returns React Query result with month transactions and income/expense summary
 */
export const useMonthData = (
  userId: string | null,
  month: number,
  year: number,
  accountId?: string
) => {
  return useQuery({
    queryKey: ["month-data", userId, month, year, accountId],
    queryFn: async () => {
      const allTransactions = await fetchTransactions(userId!);

      const startDate = new Date(year, month, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

      let monthTransactions = allTransactions.filter(
        (t: Transaction) => t.date >= startDate && t.date <= endDate
      );

      if (accountId) {
        monthTransactions = monthTransactions.filter(
          (t: Transaction) => t.account_id === accountId
        );
      }

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
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
