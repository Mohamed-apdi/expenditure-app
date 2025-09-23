import React, { useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "~/lib";
import { useAccount } from "~/lib";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { useDashboardData } from "~/lib/hooks/useDashboardData";
import DashboardHeader from "~/components/(Dashboard)/DashboardHeader";
import MonthYearScroller from "~/components/(Dashboard)/MonthYearScroll";
import NotificationPermissionRequest from "~/components/NotificationPermissionRequest";
import MemoizedTransactionItem from "~/components/(Dashboard)/MemoizedTransactionItem";

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  created_at: string;
  date: string;
  type: "expense" | "income" | "transfer";
  account_id: string;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { selectedAccount, refreshBalances, accounts } = useAccount();
  const theme = useTheme();

  // Get user ID
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{
    month: number;
    year: number;
  }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [currentMonthData, setCurrentMonthData] = useState<{
    income: number;
    expense: number;
    balance: number;
  }>({ income: 0, expense: 0, balance: 0 });

  // Use centralized data hook
  const {
    data: dashboardData,
    isLoading,
    refetch,
  } = useDashboardData(userId, selectedAccount?.id);

  // Derived state from centralized data
  const [userProfile, setUserProfile] = useState({
    fullName: "",
    email: "",
    image_url: "",
  });

  // Get user ID on mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Process data when dashboardData changes
  useEffect(() => {
    if (dashboardData?.profile) {
      setUserProfile({
        fullName: dashboardData.profile.full_name || "",
        email: dashboardData.profile.email || "",
        image_url: dashboardData.profile.image_url || "",
      });
    }
  }, [dashboardData]);

  // Memoize fetchMonthData to prevent infinite loops
  const fetchMonthData = React.useCallback(
    async (month: number, year: number) => {
      try {
        if (!dashboardData?.transactions) {
          return { income: 0, expense: 0, balance: 0 };
        }

        // Get first and last day of selected month
        const startDate = new Date(year, month, 1).toISOString().split("T")[0];
        const endDate = new Date(year, month + 1, 0)
          .toISOString()
          .split("T")[0];

        // Filter transactions for selected month
        let monthTransactions = dashboardData.transactions.filter(
          (t: Transaction) => t.date >= startDate && t.date <= endDate
        );

        // If account is selected, filter by account
        if (selectedAccount) {
          monthTransactions = monthTransactions.filter(
            (t: Transaction) => t.account_id === selectedAccount.id
          );
        }

        let monthIncome = 0;
        let monthExpense = 0;
        const monthTransactionsList: Transaction[] = [];

        monthTransactions?.forEach((t) => {
          const amount = t.amount || 0;
          if (t.type === "income") {
            monthIncome += amount;
          } else if (t.type === "expense") {
            monthExpense += amount;
          }
          monthTransactionsList.push(t as Transaction);
        });

        // Sort transactions by created_at in descending chronological order (newest first)
        const sortedTransactions = monthTransactionsList.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Update the filtered transactions for the selected month
        setFilteredTransactions(sortedTransactions);

        // Calculate balance based on whether an account is selected
        let balance;
        if (selectedAccount) {
          balance = selectedAccount.amount || 0;
        } else {
          balance = monthIncome - monthExpense;
        }

        return {
          income: monthIncome,
          expense: monthExpense,
          balance: balance,
        };
      } catch (error) {
        console.error("Error fetching month data:", error);
        return { income: 0, expense: 0, balance: 0 };
      }
    },
    [dashboardData?.transactions, selectedAccount?.id]
  );

  // Update the handleMonthChange function
  const handleMonthChange = React.useCallback(
    async (month: number, year: number) => {
      setSelectedMonth({ month, year });
      // Fetch data for the selected month
      const monthData = await fetchMonthData(month, year);
      setCurrentMonthData(monthData);
      return monthData;
    },
    [fetchMonthData]
  );

  // Refetch data when selected account changes
  useEffect(() => {
    if (selectedAccount && !isLoading && !refreshing) {
      // Data will be automatically refetched by the hook due to accountId change

      // Also refresh the MonthYearScroller data for the current month
      const current = new Date();
      const currentMonth = current.getMonth();
      const currentYear = current.getFullYear();
      fetchMonthData(currentMonth, currentYear).then(setCurrentMonthData);
    }
  }, [selectedAccount?.id, isLoading, refreshing, fetchMonthData]);

  // Initial month data load
  useEffect(() => {
    if (dashboardData?.transactions && !isLoading) {
      const current = new Date();
      const currentMonth = current.getMonth();
      const currentYear = current.getFullYear();
      fetchMonthData(currentMonth, currentYear).then(setCurrentMonthData);
    }
  }, [dashboardData?.transactions, isLoading, fetchMonthData]);

  // Refresh MonthYearScroller when accounts change
  useEffect(() => {
    if (accounts.length > 0 && selectedAccount && !isLoading && !refreshing) {
      const current = new Date();
      const currentMonth = current.getMonth();
      const currentYear = current.getFullYear();
      fetchMonthData(currentMonth, currentYear).then(setCurrentMonthData);
    }
  }, [accounts.length, selectedAccount, isLoading, refreshing, fetchMonthData]);

  const onRefresh = React.useCallback(async () => {
    if (!isLoading && !refreshing) {
      setRefreshing(true);
      await refreshBalances(); // Refresh account balances
      await refetch(); // Refetch all data
      setRefreshing(false);
    }
  }, [isLoading, refreshing, refreshBalances, refetch]);

  if (isLoading && !refreshing) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600 dark:text-gray-300">
          Loading data...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 pt-safe bg-[#3b82f6] relative">
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor="#3b82f6"
      />
      {/* Header */}
      <DashboardHeader
        userName={userProfile.fullName}
        userImageUrl={userProfile.image_url}
        onNotificationPress={() => router.push("/(main)/notifications")}
      />
      <View className="">
        <View style={{ marginBottom: 20 }}>
          <MonthYearScroller
            onMonthChange={handleMonthChange}
            monthData={currentMonthData}
          />
        </View>
      </View>

      {/* Notification Permission Request */}
      <NotificationPermissionRequest />

      {/* Recent Transactions */}
      <View
        className="flex-1 rounded-t-3xl"
        style={{ backgroundColor: theme.background }}
      >
        <View className="px-5 pt-6 pb-2 flex-1">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold" style={{ color: theme.text }}>
              {t.recentTransactions}
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => router.push("/components/TransactionsScreen")}
              >
                <Text className="text-blue-500">{t.seeMore}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item: t }) => (
              <MemoizedTransactionItem
                transaction={t}
                onPress={() =>
                  router.push(`/(transactions)/transaction-detail/${t.id}`)
                }
              />
            )}
            ListEmptyComponent={
              <View className="p-4 bg-white rounded-xl items-center justify-center">
                <Text className="text-sm text-gray-500">
                  {t.noTransactionsForMonth}
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
