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
  CreditCard,
  DollarSign,
  Wallet,
  Home,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "~/lib/supabase";
import { useTheme } from "~/lib/theme";

const ENTRY_TABS = [
  { id: "Income", label: "Income" },
  { id: "Expense", label: "Expense" },
  { id: "Lent", label: "Lent" },
  { id: "Debt/Loan", label: "Debt/Loan" },
  { id: "Saving", label: "Saving" },
];

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

type Frequency = "daily" | "weekly" | "monthly" | "yearly";
type PaymentMethod =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "digital_wallet"
  | "EVC";

export default function AddExpenseScreen() {
  const router = useRouter();
  const theme = useTheme();

  // States
  const [entryType, setEntryType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null
  );
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] =
    useState<Frequency>("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: Category[] = [
    { id: "food", name: "Food", icon: ShoppingCart, color: "#10b981" },
    { id: "rent", name: "Rent", icon: Home, color: "#f59e0b" },
    { id: "transport", name: "Transport", icon: Truck, color: "#3b82f6" },
    { id: "utilities", name: "Utilities", icon: Zap, color: "#f59e0b" },
    {
      id: "entertainment",
      name: "Entertainment",
      icon: Film,
      color: "#8b5cf6",
    },
    { id: "healthcare", name: "Healthcare", icon: Heart, color: "#ef4444" },
    { id: "shopping", name: "Shopping", icon: ShoppingBag, color: "#06b6d4" },
    { id: "education", name: "Education", icon: Book, color: "#84cc16" },
    { id: "other", name: "Other", icon: MoreHorizontal, color: "#64748b" },
  ];

  const paymentMethods = [
    { id: "cash", name: "Cash", icon: DollarSign, color: "#84cc16" },
    { id: "EVC", name: "EVC", icon: CreditCard, color: "#ef4444" },
    {
      id: "credit_card",
      name: "Credit Card",
      icon: CreditCard,
      color: "#3b82f6",
    },
    {
      id: "debit_card",
      name: "Debit Card",
      icon: CreditCard,
      color: "#8b5cf6",
    },
    {
      id: "digital_wallet",
      name: "Digital Wallet",
      icon: Wallet,
      color: "#f59e0b",
    },
  ];

  const quickAmounts = [10, 25, 50, 100];

  const handleSaveExpense = async () => {
    if (!amount || !description.trim()) {
      Alert.alert("Missing Information", "Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Expense balance check
      if (entryType === "Expense") {
        const { data: incomes } = await supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", user.id)
          .eq("entry_type", "Income");

        const totalIncome =
          incomes?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;

        const { data: expenses } = await supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", user.id)
          .eq("entry_type", "Expense");

        const totalExpenses =
          expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

        const balance = totalIncome - totalExpenses;
        if (Number.parseFloat(amount) > balance) {
          Alert.alert(
            "Insufficient Funds",
            "You don't have enough income to cover this expense."
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Save record
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        entry_type: entryType,
        amount: Number.parseFloat(amount),
        category: selectedCategory?.name || null,
        description: description.trim(),
        payment_method: paymentMethod,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurringFrequency : null,
        date: date.toISOString().split("T")[0],
      });

      if (error) throw error;

      Alert.alert("Success", `${entryType} added successfully!`, [
        {
          text: "Add Another",
          onPress: () => {
            setAmount("");
            setDescription("");
            setSelectedCategory(null);
            setPaymentMethod(null);
            setEntryType("Expense");
          },
        },
        {
          text: "View Records",
          onPress: () => router.push("/(main)/ExpenseListScreen"),
        },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save record. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 "
      style={{ backgroundColor: theme.background }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          className="flex-row justify-between items-center px-6 py-4 border-b "
          style={{ borderColor: theme.border }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <X size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text className=" text-lg font-bold" style={{ color: theme.text }}>
            Add Expense
          </Text>
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${
              !amount ||
              !selectedCategory ||
              !description.trim() ||
              isSubmitting
                ? "bg-slate-700"
                : "bg-emerald-500"
            }`}
            onPress={handleSaveExpense}
            disabled={
              !amount ||
              !selectedCategory ||
              !description.trim() ||
              isSubmitting
            }
          >
            <Text
              className={`font-bold ${
                !amount ||
                !selectedCategory ||
                !description.trim() ||
                isSubmitting
                  ? "text-slate-500"
                  : "text-white"
              }`}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {/* Tabs */}
          <View style={{ flexDirection: "row", margin: 12 }}>
            {ENTRY_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={{
                  flex: 1,
                  marginHorizontal: 4,
                  padding: 5,
                  borderRadius: 8,
                  backgroundColor:
                    entryType === tab.id ? "#10b981" : theme.cardBackground,
                }}
                onPress={() => setEntryType(tab.id)}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: entryType === tab.id ? "#fff" : theme.text,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Amount Input */}
          <View className="px-6 py-8 items-center">
            <Text className=" mb-4" style={{ color: theme.textSecondary }}>
              Amount
            </Text>
            <View className="flex-row items-center mb-6">
              <Text className="text-emerald-500 text-3xl font-bold mr-2">
                $
              </Text>
              <TextInput
                className=" text-4xl font-bold min-w-[120px] text-center"
                style={{ color: theme.placeholder }}
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            {/* Quick Amount Buttons */}
            <View className="flex-row gap-3">
              {quickAmounts.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={{
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  }}
                  className=" py-2 px-4 rounded-full border "
                  onPress={() => setAmount(quickAmount.toString())}
                >
                  <Text className=" font-medium" style={{ color: theme.text }}>
                    ${quickAmount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Selection */}
          <View className="px-6 mb-8">
            <Text
              className=" text-lg font-bold mb-4"
              style={{ color: theme.text }}
            >
              Category
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <TouchableOpacity
                    key={category.id}
                    className={`w-[22%] aspect-square justify-center items-center rounded-xl border ${
                      selectedCategory?.id === category.id
                        ? " bg-emerald-500/10"
                        : theme.cardBackground
                    }`}
                    style={{ borderColor: theme.border }}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <View
                      className={`w-8 h-8 rounded-full justify-center items-center ${
                        selectedCategory?.id === category.id
                          ? ""
                          : `bg-[${category.color}50]`
                      }`}
                    >
                      <IconComponent
                        size={20}
                        color={
                          selectedCategory?.id === category.id
                            ? category.color
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
            <Text
              className=" text-lg font-bold mb-4"
              style={{ color: theme.text }}
            >
              Description
            </Text>
            <TextInput
              className=" rounded-xl border p-4  text-base h-24"
              style={{
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.background,
              }}
              value={description}
              onChangeText={setDescription}
              placeholder="What did you spend on?"
              placeholderTextColor="#64748b"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Payment Method */}
          <View className="px-6 mb-8">
            <Text
              className=" text-lg font-bold mb-4"
              style={{ color: theme.text }}
            >
              Payment Method
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {paymentMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <TouchableOpacity
                    key={method.id}
                    className={`flex-1 min-w-[45%] flex-row items-center p-3 rounded-lg border ${
                      paymentMethod === method.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : ""
                    }`}
                    style={{
                      backgroundColor:
                        paymentMethod === method.id
                          ? "rgba(16, 185, 129, 0.1)"
                          : theme.cardBackground,
                      borderColor:
                        paymentMethod === method.id ? "#10b981" : theme.border,
                    }}
                    onPress={() => setPaymentMethod(method.id as PaymentMethod)}
                  >
                    <View
                      className={`w-8 h-8 rounded-full justify-center items-center mr-2 ${
                        paymentMethod === method.id
                          ? "bg-emerald-500"
                          : `bg-[${method.color}20]`
                      }`}
                    >
                      <IconComponent
                        size={16}
                        color={
                          paymentMethod === method.id ? "#ffffff" : method.color
                        }
                      />
                    </View>
                    <Text
                      className={`${paymentMethod === method.id ? "text-emerald-500 font-semibold" : "text-slate-400"}`}
                    >
                      {method.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date Selection */}
          <View className="px-6 mb-8">
            <Text
              className="text-lg font-bold mb-4"
              style={{ color: theme.text }}
            >
              Date
            </Text>
            <TouchableOpacity
              className="flex-row items-center  p-4 rounded-xl border "
              onPress={() => setShowDatePicker(true)}
              style={{
                borderColor: theme.border,
                backgroundColor: theme.background,
              }}
            >
              <Calendar size={20} color="#10b981" />
              <Text className=" ml-3 flex-1" style={{ color: theme.text }}>
                {formatDate(date)}
              </Text>
              <ChevronDown size={16} color="#64748b" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Recurring Option */}
          <View className="px-6 mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text
                className=" text-lg font-bold"
                style={{ color: theme.text }}
              >
                Recurring Expense
              </Text>
              <TouchableOpacity
                className={`w-12 h-7 rounded-full justify-center ${isRecurring ? "bg-emerald-500" : "bg-slate-700"}`}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white ${isRecurring ? "self-end" : "self-start"}`}
                />
              </TouchableOpacity>
            </View>

            {isRecurring && (
              <View>
                <Text className="mb-3" style={{ color: theme.textSecondary }}>
                  Frequency
                </Text>
                <View className="flex-row gap-3">
                  {["daily", "weekly", "monthly", "yearly"].map((freq) => {
                    const isSelected = recurringFrequency === freq;
                    return (
                      <TouchableOpacity
                        key={freq}
                        className="flex-1 py-3 rounded-lg border"
                        style={{
                          backgroundColor: isSelected
                            ? "#10b981"
                            : theme.cardBackground,
                          borderColor: isSelected ? "#10b981" : theme.border,
                        }}
                        onPress={() => setRecurringFrequency(freq as Frequency)}
                      >
                        <Text
                          className="text-center font-medium"
                          style={{
                            color: isSelected ? "#ffffff" : theme.textSecondary,
                            fontWeight: isSelected ? "600" : "500",
                          }}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
