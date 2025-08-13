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
import QuickActionCard from "~/components/(Dashboard)/QuickActionCard";
import TransactionItem from "~/components/(Dashboard)/TransactionItem";
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
  entry_type?: "Income" | "Expense" | "Lent" | "Debt/Loan" | "Saving"; // ⬅️ added
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
  const theme = useTheme();

  // Category totals
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalLent, setTotalLent] = useState(0);
  const [totalDebtLoan, setTotalDebtLoan] = useState(0);
  const [totalSaving, setTotalSaving] = useState(0);

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
      let lentTotal = 0;
      let debtLoanTotal = 0;
      let savingTotal = 0;

      allTransactions?.forEach((t) => {
        const amount = t.amount || 0;
        switch (t.entry_type) {
          case "Income":
            incomeTotal += amount;
            break;
          case "Expense":
            expenseTotal += amount;
            break;
          case "Lent":
            lentTotal += amount;
            break;
          case "Debt/Loan":
            debtLoanTotal += amount;
            break;
          case "Saving":
            savingTotal += amount;
            break;
        }
      });

      setTotalIncome(incomeTotal);
      setTotalExpense(expenseTotal);
      setTotalLent(lentTotal);
      setTotalDebtLoan(debtLoanTotal);
      setTotalSaving(savingTotal);

      // Recent transactions — include entry_type
      const { data: transactionsData } = await supabase
        .from("expenses")
        .select(
          "id, amount, category, description, created_at, payment_method, entry_type"
        )
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
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
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

        <SpendingWidget spent={todaySpending} />

        <MonthlyOverview
          income={totalIncome}
          expense={totalExpense}
          lent={totalLent}
          debtLoan={totalDebtLoan}
          saving={totalSaving}
        />

        {/* Quick Actions */}
        <View className="px-6 mb-5">
          <Text
            className="text-lg font-bold mb-4"
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
            <Text className="text-lg font-bold" style={{ color: theme.text }}>
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
              transactions.map((t) => {
                const IconComponent = getCategoryIcon(t.category);
                const color = getCategoryColor(t.category);
                return (
                  <TransactionItem
                    key={t.id}
                    icon={IconComponent}
                    description={t.description}
                    category={t.category}
                    time={formatDistanceToNow(new Date(t.created_at), {
                      addSuffix: true,
                    })}
                    amount={t.amount}
                    color={color}
                    entryType={t.entry_type} // ⬅️ pass entry type
                  />
                );
              })
            ) : (
              <View
                className="bg-slate-800 p-4 rounded-xl border"
                style={{ borderColor: theme.border }}
              >
                <Text className="text-center" style={{ color: theme.text }}>
                  No transactions yet
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
