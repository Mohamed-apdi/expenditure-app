import { useEffect, useState } from "react";
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
  category: string;
  description: string;
  created_at: string;
  payment_method: string;
  entry_type: "Income" | "Expense";
};

type QuickAction = {
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  screen: string;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState({
    fullName: "",
    email: "",
    image_url: "",
  });
  const [todaySpending, setTodaySpending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, image_url, created_at")
        .eq("id", user.id)
        .single();

      setUserProfile({
        fullName: profileData?.full_name || "",
        email: user.email || "",
        image_url: profileData?.image_url || "",
      });

      // Today's spending (expenses only)
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfToday = new Date(
        today.setHours(23, 59, 59, 999)
      ).toISOString();

      const { data: todaySpendingData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .eq("entry_type", "Expense")
        .gte("date", startOfToday)
        .lte("date", endOfToday);

      const todayTotal =
        todaySpendingData?.reduce(
          (sum, item) => sum + (item?.amount || 0),
          0
        ) || 0;
      setTodaySpending(todayTotal);

      // Totals by entry_type
      const { data: allTransactions } = await supabase
        .from("expenses")
        .select("amount, entry_type")
        .eq("user_id", user.id);

      let incomeTotal = 0;
      let expenseTotal = 0;
      allTransactions?.forEach((t) => {
        const amount = t.amount || 0;
        switch (t.entry_type) {
          case "Income":
            incomeTotal += amount;
            break;
          case "Expense":
            expenseTotal += amount;
            break;
        }
      });

      setTotalIncome(incomeTotal);
      setTotalExpense(expenseTotal);

      // Recent transactions - include entry_type
      const { data: transactionsData } = await supabase
        .from("expenses")
        .select(
          "id, amount, category, description, created_at, payment_method, entry_type"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Update the fetchMonthData function to also fetch transactions for the month
  const fetchMonthData = async (month: number, year: number) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return { income: 0, expense: 0, balance: 0 };

      // Get first and last day of selected month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      // Fetch transactions for selected month
      const { data: monthTransactions } = await supabase
        .from("expenses")
        .select(
          "amount, entry_type, id, category, description, created_at, payment_method"
        )
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      let monthIncome = 0;
      let monthExpense = 0;
      const monthTransactionsList: Transaction[] = [];

      monthTransactions?.forEach((t) => {
        const amount = t.amount || 0;
        if (t.entry_type === "Income") {
          monthIncome += amount;
        } else {
          monthExpense += amount;
        }
        monthTransactionsList.push(t as Transaction);
      });

      // Update the filtered transactions for the selected month
      setFilteredTransactions(monthTransactionsList);

      return {
        income: monthIncome,
        expense: monthExpense,
        balance: monthIncome - monthExpense,
      };
    } catch (error) {
      console.error("Error fetching month data:", error);
      return { income: 0, expense: 0, balance: 0 };
    }
  };

  // Update the handleMonthChange function
  const handleMonthChange = async (month: number, year: number) => {
    setSelectedMonth({ month, year });
    // The fetchMonthData will now update the filteredTransactions
  };

  useEffect(() => {
    fetchData();

    const subscription = supabase
      .channel("dashboard_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

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

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-[#F6F8FD] justify-center items-center">
        <ActivityIndicator size="large" color="#2D6CF6" />
      </View>
    );
  }

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
              const IconComponent = getCategoryIcon(t.category);
              const color = getCategoryColor(t.category);

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
                                t.entry_type === "Expense"
                                  ? "#DC2626"
                                  : "#16A34A",
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {t.entry_type === "Expense" ? "-" : "+"}$
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
