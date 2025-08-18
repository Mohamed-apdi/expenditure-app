import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  ImageBackground,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "~/lib/supabase";
import { 
  getFinancialSummary, 
  getExpensesByCategory, 
  getRecentTransactions,
  getAccountBalances,
  type FinancialSummary,
  type CategorySummary
} from "~/lib/analytics";
import { fetchExpenses } from "~/lib/expenses";
import { fetchTransactions } from "~/lib/transactions";
import { fetchProfile } from "~/lib/profiles";
import { useAccount } from "~/lib/AccountContext";
import {
  PieChart,
  TrendingUp,
  ShoppingCart,
  Truck,
  Zap,
  Film,
  Heart,
  ShoppingBag,
  Book,
  MoreHorizontal,
  Search,
  Plus,
  ChevronDown,
  Utensils,
  Home,
  Bus,
  Ticket,
  HeartPulse,
  GraduationCap,
  Smile,
  Shield,
  CreditCard,
  Gift,
  HandHeart,
  Luggage,
  PawPrint,
  Baby,
  Repeat,
  Dumbbell,
  Smartphone,
  Sofa,
  Wrench,
  Receipt,
  Landmark,
  Gem,
  Clock,
  Briefcase,
  LineChart,
  Percent,
  Key,
  Tag,
  Dice5,
  Trophy,
  RefreshCw,
  Laptop,
  Copyright,
  HandCoins,
  User,
  TrendingDown,
  TrendingUpDown,
} from "lucide-react-native";
import { formatDistanceToNow } from "date-fns";
import { useTheme } from "~/lib/theme";
import DashboardHeader from "~/components/(Dashboard)/DashboardHeader";
import MonthYearScroller from "~/components/(Dashboard)/MonthYearScroll";

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  created_at: string;
  date: string;
  type: 'expense' | 'income' | 'transfer';
  account_id: string;
};

type QuickAction = {
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  screen: string;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { selectedAccount, refreshBalances, accounts } = useAccount(); // Remove initializeAccounts since it's auto-loaded
  const [userProfile, setUserProfile] = useState({
    fullName: "",
    email: "",
    image_url: "",
  });
  const [todaySpending, setTodaySpending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [accountBalances, setAccountBalances] = useState<{ name: string; balance: number; type: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchValue, setSearchValue] = useState("");
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

  const theme = useTheme();

  // Category totals
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const fetchData = async () => {
    try {
      // Prevent multiple simultaneous calls
      if (loading) {
        console.log("Dashboard - Already loading, skipping fetchData call");
        return;
      }
      
      console.log("Dashboard - Starting fetchData...");
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("User not authenticated yet, skipping data fetch");
        setLoading(false);
        return;
      }

      console.log("Dashboard - User authenticated, fetching data for user:", user.id);

      // Profile
      const profileData = await fetchProfile(user.id);
      setUserProfile({
        fullName: profileData?.full_name || "",
        email: user.email || "",
        image_url: profileData?.image_url || "",
      });

      // Refresh account balances to ensure real-time display
      console.log("Dashboard - Refreshing account balances...");
      await refreshBalances();
      console.log("Dashboard - Account balances refreshed");

      // If no account is selected, show all data
      if (!selectedAccount) {
        console.log("Dashboard - No account selected, showing all data");
        // Financial Summary
        const summary = await getFinancialSummary(user.id);
        console.log("Dashboard - Financial summary:", summary);
        setFinancialSummary(summary);
        setTotalIncome(summary.totalIncome);
        setTotalExpense(summary.totalExpenses);

        // Today's spending (expenses only)
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
        const endOfToday = new Date(today.setHours(23, 59, 59, 999)).toISOString().split('T')[0];

        // Get all transactions and filter for today's expenses
        const allTransactions = await fetchTransactions(user.id);
        console.log("Dashboard - All transactions fetched:", allTransactions.length);
        const todayExpenses = allTransactions.filter(t => 
          t.type === 'expense' && 
          t.date >= startOfToday && 
          t.date <= endOfToday
        );

        const todayTotal = todayExpenses.reduce((sum, item) => sum + (item?.amount || 0), 0);
        setTodaySpending(todayTotal);
        console.log("Dashboard - Today's spending:", todayTotal);

        // Category Summary - use transactions
        const categoryData = await getExpensesByCategory(user.id);
        setCategorySummary(categoryData);

        // Account Balances
        const balances = await getAccountBalances(user.id);
        setAccountBalances(balances);

        // Recent transactions - use transactions table
        const recent = allTransactions
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 8);
        setRecentTransactions(recent);
        console.log("Dashboard - Recent transactions set:", recent.length);
      } else {
        console.log("Dashboard - Account selected, filtering data for:", selectedAccount.name);
        // Filter data for selected account
        const accountId = selectedAccount.id;
        
        // Get transactions for selected account
        const accountTransactions = await fetchTransactions(user.id);
        const accountTransactionsFiltered = accountTransactions.filter(t => t.account_id === accountId);
        console.log("Dashboard - Filtered transactions for account:", accountTransactionsFiltered.length);

        // Calculate totals for selected account
        const accountIncome = accountTransactionsFiltered
          .filter(t => t.type === 'income')
          .reduce((sum, item) => sum + (item?.amount || 0), 0);
        
        const accountExpensesTotal = accountTransactionsFiltered
          .filter(t => t.type === 'expense')
          .reduce((sum, item) => sum + (item?.amount || 0), 0);

        console.log("Dashboard - Account income:", accountIncome, "expenses:", accountExpensesTotal);

        // Set financial summary for selected account
        setFinancialSummary({
          totalIncome: accountIncome,
          totalExpenses: accountExpensesTotal,
          netIncome: accountIncome - accountExpensesTotal,
          totalBalance: selectedAccount.amount
        });

        setTotalIncome(accountIncome);
        setTotalExpense(accountExpensesTotal);

        // Today's spending for selected account
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
        const endOfToday = new Date(today.setHours(23, 59, 59, 999)).toISOString().split('T')[0];

        const todayExpenses = accountTransactionsFiltered.filter(t => 
          t.type === 'expense' && 
          t.date >= startOfToday && 
          t.date <= endOfToday
        );

        const todayTotal = todayExpenses.reduce((sum, item) => sum + (item?.amount || 0), 0);
        setTodaySpending(todayTotal);
        console.log("Dashboard - Today's spending for account:", todayTotal);

        // Category summary for selected account
        const categoryMap = new Map<string, number>();
        accountTransactionsFiltered
          .filter(t => t.type === 'expense')
          .forEach(t => {
            const current = categoryMap.get(t.category || '') || 0;
            categoryMap.set(t.category || '', current + t.amount);
          });

        const accountCategorySummary: CategorySummary[] = Array.from(categoryMap.entries()).map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / accountExpensesTotal) * 100
        }));

        setCategorySummary(accountCategorySummary);

        // Account balances (show only selected account)
        setAccountBalances([{
          name: selectedAccount.name,
          balance: selectedAccount.amount,
          type: selectedAccount.account_type // Changed from group_name to account_type
        }]);

        // Recent transactions for selected account
        const recent = accountTransactionsFiltered
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 8);
        setRecentTransactions(recent);
        console.log("Dashboard - Recent transactions for account set:", recent.length);
      }
      
      console.log("Dashboard - fetchData completed successfully");
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Update the handleMonthChange function
  const handleMonthChange = React.useCallback(async (month: number, year: number) => {
    if (!loading) {
      setSelectedMonth({ month, year });
      // The fetchMonthData will now update the filteredTransactions
    }
  }, [loading]);

  // Memoize fetchMonthData to prevent infinite loops
  const fetchMonthData = React.useCallback(async (month: number, year: number) => {
    try {
      // Prevent multiple simultaneous calls
      if (loading) {
        console.log("Dashboard - Already loading month data, skipping call");
        return { income: 0, expense: 0, balance: 0 };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return { income: 0, expense: 0, balance: 0 };

      // Get first and last day of selected month
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      // Fetch transactions for selected month
      let monthTransactions;
      if (selectedAccount) {
        // Filter by selected account
        monthTransactions = await fetchTransactions(user.id);
        monthTransactions = monthTransactions.filter(t => 
          t.account_id === selectedAccount.id &&
          t.date >= startDate &&
          t.date <= endDate
        );
        console.log("Dashboard - Fetching month data for account:", selectedAccount.name);
      } else {
        // Fetch all transactions
        monthTransactions = await fetchTransactions(user.id);
        monthTransactions = monthTransactions.filter(t => 
          t.date >= startDate &&
          t.date <= endDate
        );
        console.log("Dashboard - Fetching month data for all accounts");
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

      // Update the filtered transactions for the selected month
      setFilteredTransactions(monthTransactionsList);

      // Calculate balance based on whether an account is selected
      let balance;
      if (selectedAccount) {
        // For selected account, show the actual account balance
        balance = selectedAccount.amount || 0;
      } else {
        // For all accounts, show the monthly transaction balance
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
  }, [selectedAccount?.id, loading]);

  // Refetch data when selected account changes
  useEffect(() => {
    if (selectedAccount && !loading && !refreshing) {
      console.log("Dashboard - selectedAccount changed to:", selectedAccount.name);
      fetchData();
      
      // Also refresh the MonthYearScroller data for the current month
      const current = new Date();
      const currentMonth = current.getMonth();
      const currentYear = current.getFullYear();
      fetchMonthData(currentMonth, currentYear);
    }
  }, [selectedAccount?.id]); // Only depend on selectedAccount.id, not the entire object

  useEffect(() => {
    // Initial load - fetch data immediately when component mounts
    const checkAuthAndFetch = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log("Dashboard - Initial load, user authenticated, fetching data...");
          fetchData(); // Accounts are already loaded by AccountContext
        }
      } catch (error) {
        console.error("Error in initial auth check:", error);
      }
    };
    checkAuthAndFetch();
    return () => {
      setLoading(false);
      setRefreshing(false);
    };
  }, []); // Empty dependency array for initial load only

  // Additional effect to handle when selectedAccount becomes available
  useEffect(() => {
    if (selectedAccount && !financialSummary && !loading && !refreshing) {
      console.log("Dashboard - selectedAccount available, fetching data for:", selectedAccount.name);
      fetchData();
    }
  }, [selectedAccount, financialSummary, loading, refreshing]);

  // Refresh MonthYearScroller when accounts change (e.g., new account added)
  useEffect(() => {
    if (accounts.length > 0 && selectedAccount && !loading && !refreshing) {
      console.log("Dashboard - Accounts updated, refreshing MonthYearScroller...");
      const current = new Date();
      const currentMonth = current.getMonth();
      const currentYear = current.getFullYear();
      fetchMonthData(currentMonth, currentYear);
    }
  }, [accounts.length, selectedAccount, loading, refreshing]);

  const onRefresh = React.useCallback(() => {
    if (!loading && !refreshing) {
      setRefreshing(true);
      fetchData();
    }
  }, []); // Remove selectedAccount dependency to prevent infinite loop

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ElementType> = {
      // Expense categories
      Food: Utensils,
      Rent: Home,
      Transport: Bus,
      Utilities: Zap,
      Entertainment: Ticket,
      Healthcare: HeartPulse,
      Shopping: ShoppingBag,
      Education: GraduationCap,
      Other: MoreHorizontal,
      PersonalCare: Smile,
      Insurance: Shield,
      Debt: CreditCard,
      Gifts: Gift,
      Charity: HandHeart,
      Travel: Luggage,
      Pets: PawPrint,
      Kids: Baby,
      Subscriptions: Repeat,
      Fitness: Dumbbell,
      Electronics: Smartphone,
      Furniture: Sofa,
      Repairs: Wrench,
      Taxes: Receipt,

      // Income categories
      Salary: Landmark,
      Bonus: Gem,
      PartTime: Clock,
      Business: Briefcase,
      Investments: LineChart,
      Interest: Percent,
      Rental: Key,
      Sales: Tag,
      Gambling: Dice5,
      Awards: Trophy,
      Refunds: RefreshCw,
      Freelance: Laptop,
      Royalties: Copyright,
      Grants: HandCoins,
      Pension: User,
    };
    return icons[category] || MoreHorizontal;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      // Expense colors
      Food: "#10b981",
      Rent: "#f59e0b",
      Transport: "#3b82f6",
      Utilities: "#f59e0b",
      Entertainment: "#8b5cf6",
      Healthcare: "#ef4444",
      Shopping: "#06b6d4",
      Education: "#84cc16",
      Other: "#64748b",
      PersonalCare: "#ec4899",
      Insurance: "#14b8a6",
      Debt: "#f97316",
      Gifts: "#8b5cf6",
      Charity: "#ef4444",
      Travel: "#3b82f6",
      Pets: "#f59e0b",
      Kids: "#ec4899",
      Subscriptions: "#8b5cf6",
      Fitness: "#10b981",
      Electronics: "#64748b",
      Furniture: "#f59e0b",
      Repairs: "#3b82f6",
      Taxes: "#ef4444",

      // Income colors
      Salary: "#10b981",
      Bonus: "#3b82f6",
      PartTime: "#f59e0b",
      Business: "#8b5cf6",
      Investments: "#ef4444",
      Interest: "#06b6d4",
      Rental: "#84cc16",
      Sales: "#64748b",
      Gambling: "#f43f5e",
      Awards: "#8b5cf6",
      Refunds: "#3b82f6",
      Freelance: "#f59e0b",
      Royalties: "#84cc16",
      Grants: "#10b981",
      Pension: "#64748b",
    };
    return colors[category] || "#64748b";
  };

  const quickActions: QuickAction[] = [
    {
      title: "History Expenses",
      icon: PieChart,
      color: "#3b82f6",
      screen: "../(expense)/ExpenseHistory",
    },
    {
      title: "Generate Report",
      icon: PieChart,
      color: "#f43f5e",
      screen: "../(expense)/ExpenseReport",
    },
    {
      title: "Compare Expenses",
      icon: TrendingUp,
      color: "#f43f5e",
      screen: "../(expense)/ExpenseComparison",
    },
  ];

  // if (loading && !refreshing) {
  //   return (
  //     <View className="flex-1 bg-[#F6F8FD] justify-center items-center">
  //       <ActivityIndicator size="large" color="#2D6CF6" />
  //     </View>
  //   );
  // }

  return (
    <SafeAreaView className="flex-1 pt-safe bg-[#3b82f6] relative">
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />
      {/* Header */}
      <DashboardHeader
        userName={userProfile.fullName}
        userEmail={userProfile.email}
        userImageUrl={userProfile.image_url}
        onLogoutPress={() => {
          supabase.auth.signOut();
          router.replace("/login");
        }}
        onSettingsPress={() => router.push("/(main)/ProfileScreen")}
      />
      <View className="">
        <View style={{ marginBottom: 20 }}>
          <MonthYearScroller
            onMonthChange={handleMonthChange}
            fetchMonthData={fetchMonthData}
          />
        </View>
      </View>

      {/* Recent Transactions */}
      <View className="flex-1 bg-white rounded-t-3xl">
        <View className="px-5 pt-6 pb-2 flex-1">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">
              Recent Transactions
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => router.push("/components/TransactionsScreen")}
              >
                <Text className="text-blue-500">See More</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item: t }) => {
              const IconComponent = getCategoryIcon(t.category || '');
              const color = getCategoryColor(t.category || '');

              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => router.push(`/expense-detail/${t.id}`)}
                >
                  <View className="flex-row items-center p-4 bg-gray-50 rounded-xl gap-3 mb-2">
                    <View
                      className="w-11 h-11 rounded-xl items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <IconComponent size={20} color={color} />
                    </View>
                    <View className="flex-1 flex-row justify-between items-center">
                      <View className="flex-1 flex-row items-center">
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text
                            className="text-base font-semibold text-gray-900"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {t.category}
                          </Text>
                          {t.description && (
                            <Text
                              className="text-xs text-gray-500"
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {t.description}
                            </Text>
                          )}
                        </View>
                        <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
                          <Text
                            className="text-base font-bold"
                            style={{
                              color:
                                t.type === "expense"
                                  ? "#DC2626"
                                  : "#16A34A",
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {t.type === "expense" ? "-" : "+"}$
                            {Math.abs(t.amount).toFixed(2)}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(t.created_at), {
                              addSuffix: true,
                            })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="p-4 bg-white rounded-xl items-center justify-center">
                <Text className="text-sm text-gray-500">
                  No transactions for this month
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
