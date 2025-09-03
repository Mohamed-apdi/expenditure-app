import { useQuery } from "@tanstack/react-query";
import { supabase } from "../database/supabase";
import {
  getFinancialSummary,
  getExpensesByCategory,
  getAccountBalances,
} from "../services/analytics";
import { fetchAllTransactionsAndTransfers } from "../services/transactions";
import { fetchProfile } from "../services/profiles";
import type { Transaction } from "../types/types";

export const useUserProfile = (userId: string | null) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTransactions = (userId: string | null, accountId?: string) => {
  return useQuery({
    queryKey: ["transactions", userId, accountId],
    queryFn: () => fetchAllTransactionsAndTransfers(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: Transaction[]) => {
      if (accountId) {
        return data.filter((t: Transaction) => t.account_id === accountId);
      }
      return data;
    },
  });
};

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

export const useRecentTransactions = (
  userId: string | null,
  accountId?: string,
  limit: number = 6
) => {
  return useQuery({
    queryKey: ["recent-transactions", userId, accountId, limit],
    queryFn: () => fetchAllTransactionsAndTransfers(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: Transaction[]) => {
      let filteredData = data;
      if (accountId) {
        filteredData = data.filter(
          (t: Transaction) => t.account_id === accountId
        );
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

export const useMonthData = (
  userId: string | null,
  month: number,
  year: number,
  accountId?: string
) => {
  return useQuery({
    queryKey: ["month-data", userId, month, year, accountId],
    queryFn: async () => {
      const allTransactions = await fetchAllTransactionsAndTransfers(userId!);

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
