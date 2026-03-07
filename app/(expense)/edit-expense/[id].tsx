import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getCurrentUserOfflineFirst,
  selectExpenseById,
  selectTransactionById,
  updateExpenseLocal,
  updateTransactionLocal,
  updateAccountLocal,
  updateAccountBalance,
  isOfflineGateLocked,
  triggerSync,
  useAccount,
  upsertTransaction,
  updateExpense,
} from "~/lib";
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
  Calendar as CalendarIcon,
  ChevronDown,
  Tag,
  CreditCard,
  Wallet,
  DollarSign,
  Check,
  ChevronRight,
} from "lucide-react-native";
import { useTheme, useScreenStatusBar } from "~/lib";

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

type Frequency = "weekly" | "monthly" | "yearly";

export default function EditExpenseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] =
    useState<Frequency>("monthly");

  const [tags, setTags] = useState<string[]>([]);
  const [isEssential, setIsEssential] = useState(false);
  const [isTransactionRecord, setIsTransactionRecord] = useState(false);
  const theme = useTheme();
  const { accounts } = useAccount();
  useScreenStatusBar();

  const [originalAmount, setOriginalAmount] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const categories: Category[] = [
    { id: "food", name: "Food", icon: ShoppingCart, color: "#10b981" },
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

  const quickAmounts = [10, 25, 50, 100];

  useEffect(() => {
    const loadExpense = async () => {
      if (!id || typeof id !== "string") return;
      try {
        setLoading(true);
        const user = await getCurrentUserOfflineFirst();
        if (!user) {
          Alert.alert("Error", "Please sign in");
          router.back();
          return;
        }
        let data = selectExpenseById(user.id, id);
        if (data) {
          setAmount(data.amount.toString());
          setDescription(data.description ?? "");
          setDate(new Date(data.date));
          setIsRecurring(data.is_recurring ?? false);
          setRecurringFrequency(
            (data.recurrence_interval as Frequency) || "monthly",
          );
          setTags(data.tags ?? []);
          setIsEssential(data.is_essential ?? false);
          setOriginalAmount(data.amount);
          setAccountId(data.account_id ?? null);
          const category = categories.find((c) => c.name === data.category);
          if (category) setSelectedCategory(category);
          setIsTransactionRecord(false);
        } else {
          const tx = selectTransactionById(user.id, id);
          if (tx && tx.type === "expense") {
            setAmount(tx.amount.toString());
            setDescription(tx.description ?? "");
            setDate(new Date(tx.date));
            setIsRecurring(tx.is_recurring ?? false);
            setRecurringFrequency(
              (tx.recurrence_interval as Frequency) || "monthly",
            );
            setIsEssential(false);
            setOriginalAmount(tx.amount);
            setAccountId(tx.account_id);
            const category = categories.find(
              (c) => c.name === (tx.category ?? ""),
            );
            if (category) setSelectedCategory(category);
            else if (tx.category)
              setSelectedCategory({
                id: "other",
                name: tx.category,
                icon: MoreHorizontal,
                color: "#64748b",
              });
            setIsTransactionRecord(true);
          } else {
            Alert.alert("Error", "Expense not found");
            router.back();
            return;
          }
        }
      } catch (error) {
        console.error("Error loading expense:", error);
        Alert.alert("Error", "Failed to load expense data");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadExpense();
  }, [id]);

  const handleSave = async () => {
    if (!amount || !selectedCategory || !id || typeof id !== "string") {
      Alert.alert("Missing Information", "Please fill in amount and category");
      return;
    }

    setSaving(true);

    try {
      const newAmountNum = parseFloat(amount);
      const basePatch = {
        amount: newAmountNum,
        category: selectedCategory.name,
        description: description.trim() || undefined,
        date: date.toISOString().split("T")[0],
        is_recurring: isRecurring,
      } as const;

      if (isTransactionRecord) {
        const txPatch = {
          ...basePatch,
          recurrence_interval: isRecurring ? recurringFrequency : undefined,
        };

        // 1) Update local transaction store (offline-first)
        updateTransactionLocal(id, txPatch);

        // 2) Best-effort Supabase upsert (insert or update so local-only rows are created)
        try {
          const user = await getCurrentUserOfflineFirst();
          if (user && accountId) {
            await upsertTransaction(id, {
              user_id: user.id,
              account_id: accountId,
              type: "expense",
              ...txPatch,
            });
          }
        } catch (remoteError) {
          console.error("Error upserting transaction on Supabase:", remoteError);
          // Safe to ignore here; sync engine will retry when online
        }
      } else {
        const expensePatch = {
          ...basePatch,
          recurrence_interval: isRecurring ? recurringFrequency : null,
          is_essential: isEssential,
          tags: tags.length > 0 ? tags : null,
        };

        // 1) Update local expense store (offline-first)
        updateExpenseLocal(id, expensePatch);

        // 2) Best-effort Supabase update (online path)
        try {
          await updateExpense(id, expensePatch);
        } catch (remoteError) {
          console.error("Error updating expense on Supabase:", remoteError);
          // Safe to ignore here; sync engine will retry when online
        }
      }

      // Adjust account balance locally so Dashboard reflects the change immediately
      if (accountId && originalAmount != null) {
        const acc = accounts.find((a) => a.id === accountId);
        if (acc) {
          const diff = newAmountNum - originalAmount; // positive if expense increased
          const newBalance = acc.amount - diff; // expenses reduce balance
          updateAccountLocal(accountId, { amount: newBalance });
          // Persist balance to Supabase so it survives reload
          try {
            await updateAccountBalance(accountId, newBalance);
          } catch (balanceError) {
            console.error("Error updating account balance on Supabase:", balanceError);
          }
        }
      }

      if (!(await isOfflineGateLocked())) void triggerSync();

      Alert.alert("Success", "Expense updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error updating expense:", error);
      Alert.alert("Error", "Failed to update expense");
    } finally {
      setSaving(false);
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

  const toggleEssential = () => {
    setIsEssential(!isEssential);
  };

  if (loading) {
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
            Edit Expense
          </Text>
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${
              !amount || !selectedCategory || !description.trim() || saving
                ? "bg-slate-700"
                : "bg-emerald-500"
            }`}
            onPress={handleSave}
            disabled={
              !amount || !selectedCategory || !description.trim() || saving
            }
          >
            <Text
              className={`font-bold ${
                !amount || !selectedCategory || !description.trim() || saving
                  ? "text-slate-500"
                  : "text-white"
              }`}
            >
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
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
                  <Text
                    className=" font-medium"
                    style={{ color: theme.textSecondary }}
                  >
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
              <CalendarIcon size={20} color="#10b981" />
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
                <Text className="mb-3" style={{ color: theme.textSecondary }}>
                  Frequency
                </Text>
                <View className="flex-row gap-3">
                  {["weekly", "monthly", "yearly"].map((freq) => {
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

          {/* Essential/Discretionary Toggle */}
          <View className="px-6 mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-bold">
                Essential Expense
              </Text>
              <TouchableOpacity
                className={`w-12 h-7 rounded-full justify-center ${
                  isEssential ? "bg-emerald-500" : "bg-slate-700"
                }`}
                onPress={toggleEssential}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white ${
                    isEssential ? "self-end" : "self-start"
                  }`}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tags */}
          <View className="px-6 mb-8">
            <Text className="mb-3" style={{ color: theme.text }}>
              Tags
            </Text>
            <TouchableOpacity
              className="flex-row items-center p-4 rounded-xl border "
              style={{
                backgroundColor: theme.background,
                borderColor: theme.border,
              }}
            >
              <Tag size={20} color="#f59e0b" />
              <Text
                className=" ml-3 flex-1 font-medium"
                style={{ color: theme.text }}
              >
                {tags.length > 0 ? tags.join(", ") : "Add tags..."}
              </Text>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
