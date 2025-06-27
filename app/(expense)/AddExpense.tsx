import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  X,
  ShoppingCart,
  Truck,
  Zap,
  Film,
  Heart,
  ShoppingBag,
  Book,
  MoreHorizontal,
  Calendar,
  ChevronDown,
  Camera,
  MapPin,
  Tag,
  ChevronRight,
} from "lucide-react-native";

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

type Frequency = "weekly" | "monthly" | "yearly";

export default function AddExpenseScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<Frequency>("monthly");

  const categories: Category[] = [
    { id: "food", name: "Food", icon: ShoppingCart, color: "#10b981" },
    { id: "transport", name: "Transport", icon: Truck, color: "#3b82f6" },
    { id: "utilities", name: "Utilities", icon: Zap, color: "#f59e0b" },
    { id: "entertainment", name: "Entertainment", icon: Film, color: "#8b5cf6" },
    { id: "healthcare", name: "Healthcare", icon: Heart, color: "#ef4444" },
    { id: "shopping", name: "Shopping", icon: ShoppingBag, color: "#06b6d4" },
    { id: "education", name: "Education", icon: Book, color: "#84cc16" },
    { id: "other", name: "Other", icon: MoreHorizontal, color: "#64748b" },
  ];

  const quickAmounts = [10, 25, 50, 100];

  const handleSaveExpense = () => {
    if (!amount || !selectedCategory || !description.trim()) {
      Alert.alert("Missing Information", "Please fill in all required fields");
      return;
    }

    Alert.alert("Success", "Expense added successfully!", [
      {
        text: "Add Another",
        onPress: () => {
          setAmount("");
          setDescription("");
          setSelectedCategory(null);
        },
      },
      { text: "Done", onPress: () => router.back() },
    ]);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
          <TouchableOpacity onPress={() => router.back()}>
            <X size={24} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Add Expense</Text>
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${
              !amount || !selectedCategory || !description.trim()
                ? "bg-slate-700"
                : "bg-emerald-500"
            }`}
            onPress={handleSaveExpense}
            disabled={!amount || !selectedCategory || !description.trim()}
          >
            <Text
              className={`font-bold ${
                !amount || !selectedCategory || !description.trim()
                  ? "text-slate-500"
                  : "text-white"
              }`}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {/* Amount Input */}
          <View className="px-6 py-8 items-center">
            <Text className="text-slate-400 mb-4">Amount</Text>
            <View className="flex-row items-center mb-6">
              <Text className="text-emerald-500 text-3xl font-bold mr-2">$</Text>
              <TextInput
                className="text-white text-4xl font-bold min-w-[120px] text-center"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                autoFocus
              />
            </View>

            {/* Quick Amount Buttons */}
            <View className="flex-row gap-3">
              {quickAmounts.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  className="bg-slate-800 py-2 px-4 rounded-full border border-slate-700"
                  onPress={() => setAmount(quickAmount.toString())}
                >
                  <Text className="text-slate-400 font-medium">${quickAmount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Selection */}
          <View className="px-6 mb-8">
            <Text className="text-white text-lg font-bold mb-4">Category</Text>
            <View className="flex-row flex-wrap gap-3">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <TouchableOpacity
                    key={category.id}
                    className={`w-[22%] aspect-square justify-center items-center rounded-xl border ${
                      selectedCategory?.id === category.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800"
                    }`}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <View
                      className={`w-8 h-8 rounded-full justify-center items-center ${
                        selectedCategory?.id === category.id
                          ? "bg-emerald-500"
                          : `bg-[${category.color}20]`
                      }`}
                    >
                      <IconComponent
                        size={20}
                        color={
                          selectedCategory?.id === category.id
                            ? "#ffffff"
                            : category.color
                        }
                      />
                    </View>
                    <Text
                      className={`mt-2 text-xs ${
                        selectedCategory?.id === category.id
                          ? "text-emerald-500 font-semibold"
                          : "text-slate-400 font-medium"
                      }`}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description */}
          <View className="px-6 mb-8">
            <Text className="text-white text-lg font-bold mb-4">Description</Text>
            <TextInput
              className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-white text-base h-24"
              value={description}
              onChangeText={setDescription}
              placeholder="What did you spend on?"
              placeholderTextColor="#64748b"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Date Selection */}
          <View className="px-6 mb-8">
            <Text className="text-white text-lg font-bold mb-4">Date</Text>
            <TouchableOpacity className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
              <Calendar size={20} color="#10b981" />
              <Text className="text-white ml-3 flex-1">{formatDate(selectedDate)}</Text>
              <ChevronDown size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Recurring Option */}
          <View className="px-6 mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-bold">Recurring Expense</Text>
              <TouchableOpacity
                className={`w-12 h-7 rounded-full justify-center ${
                  isRecurring ? "bg-emerald-500" : "bg-slate-700"
                }`}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white ${
                    isRecurring ? "self-end" : "self-start"
                  }`}
                />
              </TouchableOpacity>
            </View>

            {isRecurring && (
              <View>
                <Text className="text-slate-400 mb-3">Frequency</Text>
                <View className="flex-row gap-3">
                  {["weekly", "monthly", "yearly"].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      className={`flex-1 py-3 rounded-lg border ${
                        recurringFrequency === freq
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-slate-800 border-slate-700"
                      }`}
                      onPress={() => setRecurringFrequency(freq as Frequency)}
                    >
                      <Text
                        className={`text-center font-medium ${
                          recurringFrequency === freq
                            ? "text-white font-semibold"
                            : "text-slate-400"
                        }`}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Additional Options */}
          <View className="px-6 mb-8 gap-3">
            <TouchableOpacity className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
              <Camera size={20} color="#3b82f6" />
              <Text className="text-white ml-3 flex-1 font-medium">Scan Receipt</Text>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
              <MapPin size={20} color="#8b5cf6" />
              <Text className="text-white ml-3 flex-1 font-medium">Add Location</Text>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
              <Tag size={20} color="#f59e0b" />
              <Text className="text-white ml-3 flex-1 font-medium">Add Tags</Text>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}