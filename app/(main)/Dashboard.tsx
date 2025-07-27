import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "~/lib/supabase";
import DashboardHeader from "~/components/(Dashboard)/DashboardHeader";
import SpendingWidget from "~/components/(Dashboard)/SpendingWidget";
import MonthlyOverview from "~/components/(Dashboard)/MonthlyOverview";
import AlertCard from "~/components/(Dashboard)/AlertCard";
import QuickActionCard from "~/components/(Dashboard)/QuickActionCard";
import TransactionItem from "~/components/(Dashboard)/TransactionItem";
import PredictionTeaser from "~/components/(Dashboard)/PredictionTeaser";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  PieChart,
  Plus,
  TrendingUp,
  ShoppingCart,
  Truck,
  Zap,
  Film,
  Heart,
  ShoppingBag,
  Book,
  MoreHorizontal,
} from "lucide-react-native";
import { formatDistanceToNow } from "date-fns";
import { useTheme } from "~/lib/theme";
type Transaction = {
  id: string;
  amount: number;
  category: string;
  description: string;
  created_at: string;
  payment_method: string;
};

type Alert = {
  id: number;
  type: string;
  message: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
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
  const [dailyBudget] = useState(120);
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [monthlyBudget] = useState(2500);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Fetch user profile
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

      // Get today's date range
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfToday = new Date(
        today.setHours(23, 59, 59, 999)
      ).toISOString();

      // Fetch today's spending
      const { data: todaySpendingData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .gte("date", startOfToday)
        .lte("date", endOfToday);

      const todayTotal =
        todaySpendingData?.reduce((sum, item) => sum + item.amount, 0) || 0;
      setTodaySpending(todayTotal);

      // Fetch monthly spending (current month)
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: monthlySpendingData } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .eq("date_month", currentMonth)
        .eq("date_year", currentYear);

      const monthlyTotal =
        monthlySpendingData?.reduce((sum, item) => sum + item.amount, 0) || 0;
      setMonthlySpending(monthlyTotal);

      // Fetch recent transactions
      const { data: transactionsData } = await supabase
        .from("expenses")
        .select("id, amount, category, description, created_at, payment_method")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up realtime subscription for expenses
    const subscription = supabase
      .channel("dashboard_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
        },
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
      Food: ShoppingCart,
      Transport: Truck,
      Utilities: Zap,
      Entertainment: Film,
      Healthcare: Heart,
      Shopping: ShoppingBag,
      Education: Book,
      Other: MoreHorizontal,
    };
    return icons[category] || MoreHorizontal;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Food: "#10b981",
      Transport: "#3b82f6",
      Utilities: "#f59e0b",
      Entertainment: "#8b5cf6",
      Healthcare: "#ef4444",
      Shopping: "#06b6d4",
      Education: "#84cc16",
      Other: "#64748b",
    };
    return colors[category] || "#64748b";
  };

  const alerts = [
    {
      id: 1,
      type: "warning",
      message:
        todaySpending > dailyBudget * 0.8
          ? `You've spent ${Math.round((todaySpending / dailyBudget) * 100)}% of your daily budget`
          : "Food spending 20% above average",
      icon: AlertTriangle,
      color: todaySpending > dailyBudget * 0.8 ? "#f59e0b" : "#ef4444",
    },
    {
      id: 2,
      type: "success",
      message:
        monthlySpending < monthlyBudget * 0.7
          ? "On track for monthly savings goal"
          : `You've used ${Math.round((monthlySpending / monthlyBudget) * 100)}% of monthly budget`,
      icon: CheckCircle,
      color: "#10b981",
    },
  ];

  const todayProgress = (todaySpending / dailyBudget) * 100;
  const monthlyProgress = (monthlySpending / monthlyBudget) * 100;

  const quickActions: QuickAction[] = [
    {
      title: "Add Expense",
      icon: Plus,
      color: "#10b981",
      screen: "../(expense)/AddExpense",
    },
    {
      title: "View Budget",
      icon: PieChart,
      color: "#3b82f6",
      screen: "../(expense)/ExpenseHistory",
    },
    {
      title: "Analytics",
      icon: TrendingUp,
      color: "#8b5cf6",
      screen: "../(analytics)/AdvancedAnalytics",
    },
    {
      title: "Scan Report",
      icon: FileText, // Consider replacing with a scanner icon if available
      color: "#f59e0b",
      screen: "../(expense)/ReceiptScanner",
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

  const getProgressColor = (progress: number) => {
    if (progress > 100) return "#ef4444";
    if (progress > 80) return "#f59e0b";
    return "#10b981";
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 "
      style={{ backgroundColor: theme.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
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

        <SpendingWidget
          spent={todaySpending}
          budget={dailyBudget}
          progressColor={getProgressColor(todayProgress)}
        />

        <MonthlyOverview
          spent={monthlySpending}
          budget={monthlyBudget}
          progressColor={getProgressColor(monthlyProgress)}
        />

        {/* Alerts Section */}
        <View className="px-6 mb-5">
          <Text
            className="text-white text-lg font-bold mb-4"
            style={{ color: theme.text }}
          >
            Alerts
          </Text>
          <View className="gap-2">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                icon={alert.icon}
                message={alert.message}
                color={alert.color}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-5">
          <Text
            className=" text-lg font-bold mb-4"
            style={{ color: theme.text }}
          >
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {quickActions.map((action, index) => (
              <QuickActionCard
                key={index}
                icon={action.icon}
                title={action.title}
                color={action.color}
                onPress={() => router.push(`/${action.screen}`)}
              />
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="px-6 mb-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className=" text-lg font-bold" style={{ color: theme.text }}>
              Recent Transactions
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(main)/ExpenseListScreen")}
            >
              <Text className="text-emerald-500 font-medium">See All</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            {transactions.length > 0 ? (
              transactions.map((transaction) => {
                const IconComponent = getCategoryIcon(transaction.category);
                const color = getCategoryColor(transaction.category);

                return (
                  <TransactionItem
                    key={transaction.id}
                    icon={IconComponent}
                    description={transaction.description}
                    category={transaction.category}
                    time={formatDistanceToNow(
                      new Date(transaction.created_at),
                      { addSuffix: true }
                    )}
                    amount={transaction.amount}
                    color={color}
                  />
                );
              })
            ) : (
              <View
                className="bg-slate-800 p-4 rounded-xl border "
                style={{ borderColor: theme.border }}
              >
                <Text className=" text-center" style={{ color: theme.text }}>
                  No transactions yet
                </Text>
              </View>
            )}
          </View>
        </View>

        {/*<PredictionTeaser onPress={() => router.push("/predict")} />*/}
      </ScrollView>
    </SafeAreaView>
  );
}
