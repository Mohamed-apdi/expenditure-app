import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  Calendar,
  DollarSign,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Plus,
  PieChart,
  TrendingUp,
  FileText,
  ShoppingCart,
  Truck,
  Coffee,
  Zap,
  Film,
  Zap as Lightning,
} from "lucide-react-native";

import { supabase } from "~/lib/supabase";
import { UserProfile } from "~/types/userTypes";

type Transaction = {
  id: number;
  category: string;
  amount: number;
  description: string;
  time: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
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
  const [todaySpending] = useState(45);
  const [dailyBudget] = useState(120);
  const [monthlySpending] = useState(1850);
  const [monthlyBudget] = useState(2500);
  const [userProfile, setUserProfile] = useState<UserProfile>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);

        // Get the current user session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Fetch profile data from profiles table
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("full_name, phone, image_url, created_at")
            .eq("id", user.id)
            .single();

          if (error) throw error;

          setUserProfile({
            fullName: profileData?.full_name || "",
            email: user.email || "",
            phone: profileData?.phone || "",
            image_url: profileData?.image_url || "",
            totalPredictions: 0,
            avgAccuracy: 0,
            joinDate: profileData?.created_at || new Date().toISOString(),
            lastSignIn: user.last_sign_in_at || new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const [recentTransactions] = useState<Transaction[]>([
    {
      id: 1,
      category: "Food",
      amount: 25,
      description: "Grocery Store",
      time: "2 hours ago",
      icon: ShoppingCart,
      color: "#10b981",
    },
    {
      id: 2,
      category: "Transport",
      amount: 12,
      description: "Bus Fare",
      time: "4 hours ago",
      icon: Truck,
      color: "#3b82f6",
    },
    {
      id: 3,
      category: "Food",
      amount: 8,
      description: "Coffee Shop",
      time: "Yesterday",
      icon: Coffee,
      color: "#10b981",
    },
    {
      id: 4,
      category: "Utilities",
      amount: 85,
      description: "Electricity Bill",
      time: "2 days ago",
      icon: Zap,
      color: "#f59e0b",
    },
    {
      id: 5,
      category: "Entertainment",
      amount: 15,
      description: "Movie Ticket",
      time: "3 days ago",
      icon: Film,
      color: "#8b5cf6",
    },
  ]);

  const [alerts] = useState<Alert[]>([
    {
      id: 1,
      type: "warning",
      message: "Food spending 20% above average",
      icon: AlertTriangle,
      color: "#f59e0b",
    },
    {
      id: 2,
      type: "success",
      message: "On track for monthly savings goal",
      icon: CheckCircle,
      color: "#10b981",
    },
  ]);

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
      screen: "budget",
    },
    {
      title: "Analytics",
      icon: TrendingUp,
      color: "#8b5cf6",
      screen: "../(analytics)/AdvancedAnalytics",
    },
    {
      title: "Generate Report",
      icon: FileText,
      color: "#f59e0b",
      screen: "reports",
    },
  ];

  const getProgressColor = (progress: number) => {
    if (progress > 100) return "#ef4444";
    if (progress > 80) return "#f59e0b";
    return "#10b981";
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-5">
          <View>
            <Text className="text-white text-2xl font-bold">
              Good Morning! {userProfile.fullName}
            </Text>
            <Text className="text-slate-400 mt-1">
              Here's your spending overview
            </Text>
          </View>
          <TouchableOpacity className="relative">
            <Bell size={24} color="#f8fafc" />
            <View className="absolute -top-1 -right-1 bg-rose-500 rounded-full w-5 h-5 justify-center items-center">
              <Text className="text-white text-xs font-bold">2</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Today's Spending Widget */}
        <View className="bg-slate-800 mx-6 mb-5 p-5 rounded-xl border border-slate-700">
          <View className="flex-row items-center mb-4">
            <Calendar size={20} color="#10b981" />
            <Text className="text-white font-semibold ml-2">
              Today's Spending
            </Text>
          </View>

          <View className="items-center mb-5">
            <Text className="text-emerald-500 text-4xl font-bold">
              ${todaySpending}
            </Text>
            <Text className="text-slate-400">of ${dailyBudget} budget</Text>
          </View>

          <View>
            <View className="h-2 bg-slate-700 rounded-full mb-1">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(todayProgress, 100)}%`,
                  backgroundColor: getProgressColor(todayProgress),
                }}
              />
            </View>
            <Text className="text-slate-400 text-xs text-center">
              {todayProgress > 100
                ? `${(todayProgress - 100).toFixed(0)}% over budget`
                : `${(100 - todayProgress).toFixed(0)}% remaining`}
            </Text>
          </View>
        </View>

        {/* Monthly Overview */}
        <View className="px-6 mb-5">
          <Text className="text-white text-lg font-bold mb-4">
            Monthly Overview
          </Text>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700 items-center">
              <DollarSign size={20} color="#10b981" />
              <Text className="text-slate-400 text-xs mt-2 mb-1">Spent</Text>
              <Text className="text-white text-lg font-bold">
                ${monthlySpending}
              </Text>
              <Text className="text-slate-500 text-xs">
                of ${monthlyBudget}
              </Text>
            </View>

            <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700 items-center">
              <TrendingDown size={20} color="#3b82f6" />
              <Text className="text-slate-400 text-xs mt-2 mb-1">
                Remaining
              </Text>
              <Text className="text-white text-lg font-bold">
                ${monthlyBudget - monthlySpending}
              </Text>
              <Text className="text-slate-500 text-xs">
                {Math.round(
                  ((monthlyBudget - monthlySpending) / monthlyBudget) * 100
                )}
                % left
              </Text>
            </View>

            <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700 items-center">
              <Target size={20} color="#8b5cf6" />
              <Text className="text-slate-400 text-xs mt-2 mb-1">Avg/Day</Text>
              <Text className="text-white text-lg font-bold">
                ${Math.round(monthlySpending / new Date().getDate())}
              </Text>
              <Text className="text-slate-500 text-xs">this month</Text>
            </View>
          </View>

          <View className="h-2 bg-slate-700 rounded-full">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.min(monthlyProgress, 100)}%`,
                backgroundColor: getProgressColor(monthlyProgress),
              }}
            />
          </View>
        </View>

        {/* Alerts */}
        {alerts.length > 0 && (
          <View className="px-6 mb-5">
            <Text className="text-white text-lg font-bold mb-4">Alerts</Text>
            <View className="gap-2">
              {alerts.map((alert) => {
                const IconComponent = alert.icon;
                return (
                  <View
                    key={alert.id}
                    className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700"
                  >
                    <IconComponent size={20} color={alert.color} />
                    <Text className="text-white flex-1 ml-3">
                      {alert.message}
                    </Text>
                    <ChevronRight size={16} color="#64748b" />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View className="px-6 mb-5">
          <Text className="text-white text-lg font-bold mb-4">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <TouchableOpacity
                  key={index}
                  className="bg-slate-800 p-4 rounded-xl border border-slate-700 items-center flex-1 min-w-[45%]"
                  onPress={() => router.push(`/${action.screen}` as any)}
                >
                  <View
                    className="w-12 h-12 rounded-full justify-center items-center mb-2"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <IconComponent size={24} color={action.color} />
                  </View>
                  <Text className="text-white font-medium text-center">
                    {action.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="px-6 mb-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-bold">
              Recent Transactions
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/expense-history" as any)}
            >
              <Text className="text-emerald-500 font-medium">See All</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            {recentTransactions.slice(0, 5).map((transaction) => {
              const IconComponent = transaction.icon;
              return (
                <View
                  key={transaction.id}
                  className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700"
                >
                  <View
                    className="w-10 h-10 rounded-full justify-center items-center mr-3"
                    style={{ backgroundColor: `${transaction.color}20` }}
                  >
                    <IconComponent size={20} color={transaction.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">
                      {transaction.description}
                    </Text>
                    <Text className="text-slate-400 text-xs">
                      {transaction.category} • {transaction.time}
                    </Text>
                  </View>
                  <Text className="text-rose-500 font-bold">
                    -${transaction.amount}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Prediction Teaser */}
        <TouchableOpacity
          className="flex-row items-center bg-slate-800 mx-6 mb-8 p-5 rounded-xl border border-emerald-500"
          onPress={() => router.push("/predict" as any)}
        >
          <Lightning size={24} color="#10b981" />
          <View className="ml-3 flex-1">
            <Text className="text-white font-semibold">
              Next Month Prediction
            </Text>
            <Text className="text-slate-400 text-sm">
              Get AI-powered spending forecast
            </Text>
          </View>
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
