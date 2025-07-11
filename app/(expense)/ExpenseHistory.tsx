import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Plus,
  Search,
  Filter,
  X,
  Check,
  ShoppingCart,
  Truck,
  Coffee,
  Zap,
  Film,
  Heart,
  ShoppingBag,
  Utensils,
  Repeat,
  MoreVertical,
} from "lucide-react-native";
import { supabase } from "~/lib/supabase";

type Expense = {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  payment_method: string;
  location?: string;
  is_recurring?: boolean;
  icon?: any;
  color?: string;
};

type DateRange = {
  key: string;
  label: string;
};

export default function ExpenseHistoryScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("this_month");

  const categoryMeta = {
    Food: { icon: ShoppingCart, color: "#10b981" },
    Transport: { icon: Truck, color: "#3b82f6" },
    Utilities: { icon: Zap, color: "#f59e0b" },
    Entertainment: { icon: Film, color: "#8b5cf6" },
    Healthcare: { icon: Heart, color: "#ef4444" },
    Shopping: { icon: ShoppingBag, color: "#06b6d4" },
    Coffee: { icon: Coffee, color: "#f43f5e" },
    Other: { icon: Utensils, color: "#64748b" },
  };

  const categories = ["all", ...Object.keys(categoryMeta)];

  const dateRanges: DateRange[] = [
    { key: "today", label: "Today" },
    { key: "this_week", label: "This Week" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "this_year", label: "This Year" },
  ];

  useEffect(() => {
    fetchExpenses();
  }, [selectedFilter, selectedDateRange, searchQuery]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from("expenses").select("*").eq("user_id", user.id);

      if (selectedFilter !== "all") {
        query = query.eq("category", selectedFilter);
      }

      if (selectedDateRange) {
        const today = new Date();
        let start: string | null = null;
        let end: string | null = null;

        switch (selectedDateRange) {
          case "today":
            start = today.toISOString().split("T")[0];
            end = start;
            break;
          case "this_week": {
            const day = today.getDay();
            const first = new Date(today);
            first.setDate(today.getDate() - day);
            start = first.toISOString().split("T")[0];
            end = today.toISOString().split("T")[0];
            break;
          }
          case "this_month": {
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            start = first.toISOString().split("T")[0];
            end = today.toISOString().split("T")[0];
            break;
          }
          case "last_month": {
            const first = new Date(
              today.getFullYear(),
              today.getMonth() - 1,
              1
            );
            const last = new Date(today.getFullYear(), today.getMonth(), 0);
            start = first.toISOString().split("T")[0];
            end = last.toISOString().split("T")[0];
            break;
          }
          case "this_year":
            start = `${today.getFullYear()}-01-01`;
            end = today.toISOString().split("T")[0];
            break;
        }

        if (start && end) {
          query = query.gte("date", start).lte("date", end);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const enriched = (data || []).map((e) => {
        const meta = categoryMeta[e.category] || categoryMeta.Other;
        return { ...e, icon: meta.icon, color: meta.color };
      });

      setExpenses(enriched);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  const groupExpensesByDate = (expenses: Expense[]) => {
    const groups: Record<string, Expense[]> = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      let dateKey: string;

      if (date.toDateString() === today.toDateString()) {
        dateKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = "Yesterday";
      } else {
        dateKey = date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(expense);
    });

    return groups;
  };

  const filteredExpenses = expenses.filter((expense) => {
    return (
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const groupedExpenses = groupExpensesByDate(filteredExpenses);
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const FilterModal = () => (
    <Modal visible={showFilterModal} animationType="slide">
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
          <Text className="text-white text-xl font-bold">Filter Expenses</Text>
          <TouchableOpacity onPress={() => setShowFilterModal(false)}>
            <X size={24} color="#f8fafc" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6">
          <View className="my-6">
            <Text className="text-white text-lg font-bold mb-4">Category</Text>
            <View className="gap-2">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  className={`flex-row justify-between items-center p-4 rounded-xl border ${
                    selectedFilter === cat
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-slate-800 border-slate-700"
                  }`}
                  onPress={() => setSelectedFilter(cat)}
                >
                  <Text
                    className={`${
                      selectedFilter === cat
                        ? "text-white font-semibold"
                        : "text-slate-200"
                    }`}
                  >
                    {cat === "all" ? "All Categories" : cat}
                  </Text>
                  {selectedFilter === cat && (
                    <Check size={16} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="my-6">
            <Text className="text-white text-lg font-bold mb-4">
              Date Range
            </Text>
            <View className="gap-2">
              {dateRanges.map((range) => (
                <TouchableOpacity
                  key={range.key}
                  className={`flex-row justify-between items-center p-4 rounded-xl border ${
                    selectedDateRange === range.key
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-slate-800 border-slate-700"
                  }`}
                  onPress={() => setSelectedDateRange(range.key)}
                >
                  <Text
                    className={`${
                      selectedDateRange === range.key
                        ? "text-white font-semibold"
                        : "text-slate-200"
                    }`}
                  >
                    {range.label}
                  </Text>
                  {selectedDateRange === range.key && (
                    <Check size={16} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            className="bg-emerald-500 py-4 rounded-xl items-center my-6"
            onPress={() => setShowFilterModal(false)}
          >
            <Text className="text-white font-bold">Apply Filters</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-5">
        <Text className="text-white text-2xl font-bold">Expense History</Text>
        <TouchableOpacity
          className="bg-emerald-500 w-10 h-10 rounded-full justify-center items-center"
          onPress={() => router.push("/AddExpense")}
        >
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search + Filter */}
      <View className="flex-row px-6 mb-5 gap-3">
        <View className="flex-row items-center flex-1 bg-slate-800 rounded-xl border border-slate-700 px-4">
          <Search size={20} color="#64748b" />
          <TextInput
            className="flex-1 py-3 px-3 text-white"
            placeholder="Search expenses..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          className="bg-slate-800 w-12 h-12 rounded-xl border border-slate-700 justify-center items-center"
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color="#f8fafc" />
        </TouchableOpacity>
      </View>

      {/* Total Summary */}
      <View className="px-6 mb-5">
        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 items-center">
          <Text className="text-slate-400 mb-2">Total Expenses</Text>
          <Text className="text-rose-500 text-3xl font-bold mb-1">
            ${totalAmount}
          </Text>
          <Text className="text-slate-500 text-sm">
            {filteredExpenses.length} transactions
          </Text>
        </View>
      </View>

      {/* Expenses List */}
      {loading ? (
        <ActivityIndicator color="#10b981" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {Object.entries(groupedExpenses).map(([dateKey, dayExpenses]) => (
            <View key={dateKey} className="mb-6">
              <Text className="text-white font-bold px-6 mb-3">{dateKey}</Text>
              <View className="px-6 gap-2">
                {dayExpenses.map((expense) => {
                  const Icon = expense.icon;
                  return (
                    <TouchableOpacity
                      key={expense.id}
                      className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700"
                    >
                      <View
                        className="w-10 h-10 rounded-full justify-center items-center mr-3"
                        style={{ backgroundColor: `${expense.color}20` }}
                      >
                        <Icon size={20} color={expense.color} />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-white font-medium">
                            {expense.description}
                          </Text>
                          <Text className="text-rose-500 font-bold">
                            -${expense.amount}
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <Text className="text-slate-400 text-xs">
                            {expense.category}
                          </Text>
                          {expense.location && (
                            <>
                              <Text className="text-slate-600 mx-2">•</Text>
                              <Text className="text-slate-400 text-xs">
                                {expense.location}
                              </Text>
                            </>
                          )}
                          {expense.is_recurring && (
                            <>
                              <Text className="text-slate-600 mx-2">•</Text>
                              <View className="flex-row items-center bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                <Repeat size={10} color="#10b981" />
                                <Text className="text-emerald-500 text-xs ml-1 font-medium">
                                  Recurring
                                </Text>
                              </View>
                            </>
                          )}
                        </View>
                      </View>

                      <TouchableOpacity className="p-2 ml-2">
                        <MoreVertical size={16} color="#64748b" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <FilterModal />
    </SafeAreaView>
  );
}
