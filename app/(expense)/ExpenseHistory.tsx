import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal } from "react-native";
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

type Expense = {
  id: number;
  category: string;
  amount: number;
  description: string;
  date: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  location?: string;
  recurring?: boolean;
};

type DateRange = {
  key: string;
  label: string;
};

export default function ExpenseHistoryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("this_month");

  const [expenses] = useState<Expense[]>([
    {
      id: 1,
      category: "Food",
      amount: 25,
      description: "Grocery Store",
      date: "2024-01-15",
      icon: ShoppingCart,
      color: "#10b981",
      location: "Walmart",
    },
    {
      id: 2,
      category: "Transport",
      amount: 12,
      description: "Bus Fare",
      date: "2024-01-15",
      icon: Truck,
      color: "#3b82f6",
    },
    {
      id: 3,
      category: "Food",
      amount: 8,
      description: "Coffee Shop",
      date: "2024-01-14",
      icon: Coffee,
      color: "#10b981",
      location: "Starbucks",
    },
    {
      id: 4,
      category: "Utilities",
      amount: 85,
      description: "Electricity Bill",
      date: "2024-01-13",
      icon: Zap,
      color: "#f59e0b",
      recurring: true,
    },
    {
      id: 5,
      category: "Entertainment",
      amount: 15,
      description: "Movie Ticket",
      date: "2024-01-12",
      icon: Film,
      color: "#8b5cf6",
      location: "AMC Theater",
    },
    {
      id: 6,
      category: "Healthcare",
      amount: 45,
      description: "Pharmacy",
      date: "2024-01-12",
      icon: Heart,
      color: "#ef4444",
    },
    {
      id: 7,
      category: "Shopping",
      amount: 120,
      description: "Clothing Store",
      date: "2024-01-11",
      icon: ShoppingBag,
      color: "#06b6d4",
      location: "H&M",
    },
    {
      id: 8,
      category: "Food",
      amount: 32,
      description: "Restaurant",
      date: "2024-01-10",
      icon: Utensils,
      color: "#10b981",
      location: "Pizza Hut",
    },
  ]);

  const categories = ["all", "Food", "Transport", "Utilities", "Entertainment", "Healthcare", "Shopping"];
  const dateRanges: DateRange[] = [
    { key: "today", label: "Today" },
    { key: "this_week", label: "This Week" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "this_year", label: "This Year" },
    { key: "custom", label: "Custom Range" },
  ];

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedFilter === "all" || expense.category === selectedFilter;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const groupExpensesByDate = (expenses: Expense[]) => {
    const groups: Record<string, Expense[]> = {};
    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

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

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(expense);
    });
    return groups;
  };

  const groupedExpenses = groupExpensesByDate(filteredExpenses);

  const FilterModal = () => (
    <Modal visible={showFilterModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-slate-900">
        {/* Modal Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
          <Text className="text-white text-xl font-bold">Filter Expenses</Text>
          <TouchableOpacity onPress={() => setShowFilterModal(false)}>
            <X size={24} color="#f8fafc" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6">
          {/* Category Filter */}
          <View className="my-6">
            <Text className="text-white text-lg font-bold mb-4">Category</Text>
            <View className="gap-2">
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  className={`flex-row justify-between items-center p-4 rounded-xl border ${
                    selectedFilter === category
                      ? "bg-emerald-500 border-emerald-500"
                      : "bg-slate-800 border-slate-700"
                  }`}
                  onPress={() => setSelectedFilter(category)}
                >
                  <Text
                    className={`font-medium ${
                      selectedFilter === category ? "text-white font-semibold" : "text-slate-200"
                    }`}
                  >
                    {category === "all" ? "All Categories" : category}
                  </Text>
                  {selectedFilter === category && <Check size={16} color="#ffffff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Range Filter */}
          <View className="my-6">
            <Text className="text-white text-lg font-bold mb-4">Date Range</Text>
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
                    className={`font-medium ${
                      selectedDateRange === range.key ? "text-white font-semibold" : "text-slate-200"
                    }`}
                  >
                    {range.label}
                  </Text>
                  {selectedDateRange === range.key && <Check size={16} color="#ffffff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Apply Button */}
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
          onPress={() => router.push("/add-expense" as any)}
        >
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
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

      {/* Summary */}
      <View className="px-6 mb-5">
        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 items-center">
          <Text className="text-slate-400 mb-2">Total Expenses</Text>
          <Text className="text-rose-500 text-3xl font-bold mb-1">${totalAmount}</Text>
          <Text className="text-slate-500 text-sm">{filteredExpenses.length} transactions</Text>
        </View>
      </View>

      {/* Expenses List */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {Object.entries(groupedExpenses).map(([dateKey, dayExpenses]) => (
          <View key={dateKey} className="mb-6">
            <Text className="text-white font-bold px-6 mb-3">{dateKey}</Text>
            <View className="px-6 gap-2">
              {dayExpenses.map((expense) => {
                const IconComponent = expense.icon;
                return (
                  <TouchableOpacity
                    key={expense.id}
                    className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700"
                  >
                    <View
                      className="w-10 h-10 rounded-full justify-center items-center mr-3"
                      style={{ backgroundColor: `${expense.color}20` }}
                    >
                      <IconComponent size={20} color={expense.color} />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-white font-medium">{expense.description}</Text>
                        <Text className="text-rose-500 font-bold">-${expense.amount}</Text>
                      </View>

                      <View className="flex-row items-center">
                        <Text className="text-slate-400 text-xs">{expense.category}</Text>
                        {expense.location && (
                          <>
                            <Text className="text-slate-600 mx-2">•</Text>
                            <Text className="text-slate-400 text-xs">{expense.location}</Text>
                          </>
                        )}
                        {expense.recurring && (
                          <>
                            <Text className="text-slate-600 mx-2">•</Text>
                            <View className="flex-row items-center bg-emerald-500/20 px-1.5 py-0.5 rounded">
                              <Repeat size={10} color="#10b981" />
                              <Text className="text-emerald-500 text-xs ml-1 font-medium">Recurring</Text>
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

        {filteredExpenses.length === 0 && (
          <View className="items-center py-16 px-10">
            <Search size={48} color="#64748b" />
            <Text className="text-white text-xl font-bold mt-4 mb-2">No expenses found</Text>
            <Text className="text-slate-400 text-center mb-6">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Start tracking your expenses to see them here"}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                className="bg-emerald-500 py-3 px-6 rounded-lg"
                onPress={() => router.push("/add-expense" as any)}
              >
                <Text className="text-white font-semibold">Add Your First Expense</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <FilterModal />
    </SafeAreaView>
  );
}