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

type Transaction = {
  id: string;
  amount: number;
  category: string;
  description: string;
  created_at: string;
  payment_method: string;
  entry_type: "Income" | "Expense" | "Lent" | "Debt/Loan" | "Saving";
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
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

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

      // Recent transactions - include entry_type
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

  // Filter transactions based on active tab
  const filteredTransactions = transactions.filter(
    (t) => t.entry_type === (activeTab === "expense" ? "Expense" : "Income")
  );

  return (
    <SafeAreaView className="flex-1 py-safe">
      <StatusBar barStyle="dark-content" />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2D6CF6"
          />
        }
      >
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

        <View style={{ padding: 16 }}>
          <View
            style={{
              padding: 24,
              marginBottom: 20,
              backgroundColor: "#3b82f6",
              borderRadius: 16,
              shadowColor: "#3b82f6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text className="text-sm text-white/90 mb-1" numberOfLines={1}>
              Available Balance
            </Text>
            <Text className="text-2xl text-white font-extrabold">
              £ {(totalIncome - totalExpense).toFixed(2)}
            </Text>
          </View>

          {/* Totals Container */}
          <View
            style={{
              padding: 20,
              marginBottom: 20,
              backgroundColor: "#ffffff",
              borderRadius: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Toggle Buttons */}
            <View
              style={{
                flexDirection: "row",
                marginBottom: 24,
                padding: 4,
                backgroundColor: "#f1f5f9",
                borderRadius: 12,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor:
                    activeTab === "expense" ? "#3b82f6" : "transparent",
                }}
                onPress={() => setActiveTab("expense")}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: activeTab === "expense" ? "#ffffff" : "#64748b",
                  }}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor:
                    activeTab === "income" ? "#3b82f6" : "transparent",
                }}
                onPress={() => setActiveTab("income")}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: activeTab === "income" ? "#ffffff" : "#64748b",
                  }}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <View style={{ flex: 1, alignItems: "center" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#fee2e2",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <TrendingDown size={24} color="#dc2626" />
                </View>
                <Text
                  style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}
                >
                  Spent
                </Text>
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", color: "#1e293b" }}
                >
                  £{totalExpense.toFixed(2)}
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: "center" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#dcfce7",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <TrendingUp size={24} color="#16a34a" />
                </View>
                <Text
                  style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}
                >
                  Earned
                </Text>
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", color: "#1e293b" }}
                >
                  £{totalIncome.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Search */}
          <View className="flex-row justify-center items-center bg-blue-100 pl-7 rounded-full mb-2">
            <Search
              size={22}
              color="#2563eb"
              className="absolute left-3 top-3"
            />
            <TextInput
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder="Search"
              placeholderTextColor="#000000"
              className="rounded-xl text-xl w-full pl-2 outline-none"
            />
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="px-4 mb-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">
              Recent {activeTab === "expense" ? "Expenses" : "Income"}
            </Text>
          </View>

          <View className="gap-3">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((t) => {
                const IconComponent = getCategoryIcon(t.category);
                const color = getCategoryColor(t.category);
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => router.push(`/expense-detail/${t.id}`)}
                  >
                    <View className="flex-row items-center p-4 bg-white rounded-xl gap-3">
                      <View
                        className="w-11 h-11 rounded-xl items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <IconComponent size={20} color={color} />
                      </View>
                      <View className="flex-1 flex-row justify-between items-center">
                        <View>
                          <Text className="text-base font-semibold text-gray-900">
                            {t.category}
                          </Text>
                          {t.description && (
                            <Text className="text-xs text-gray-500">
                              {t.description}
                            </Text>
                          )}
                        </View>
                        <View className="items-end">
                          <Text
                            className="text-base font-bold"
                            style={{
                              color:
                                t.entry_type === "Expense"
                                  ? "#DC2626"
                                  : "#16A34A",
                            }}
                          >
                            {t.entry_type === "Expense" ? "-" : "+"}£
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
                  </TouchableOpacity>
                );
              })
            ) : (
              <View className="p-4 bg-white rounded-xl items-center justify-center">
                <Text className="text-sm text-gray-500">
                  No {activeTab === "expense" ? "expenses" : "income"} yet
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={{
          position: "absolute",
          bottom: 4,
          right: 180,
          width: 56,
          height: 56,
          backgroundColor: "#3b82f6",
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#3b82f6",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        className="z-50"
        onPress={() => router.push("/(expense)/AddExpense")}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
