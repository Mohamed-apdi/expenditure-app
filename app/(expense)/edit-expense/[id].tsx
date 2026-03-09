import { useEffect, useState, useCallback } from "react";
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
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  useLanguage,
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
  Wallet,
  Briefcase,
  TrendingUp,
  Gift,
  DollarSign,
} from "lucide-react-native";
import { useTheme, useScreenStatusBar } from "~/lib";

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

type TransactionType = "expense" | "income";

const CARD_STYLE = {
  paddingVertical: 16,
  paddingHorizontal: 16,
  borderRadius: 16,
  minHeight: 72,
  borderWidth: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

export default function EditExpenseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [isTransactionRecord, setIsTransactionRecord] = useState(false);
  
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  
  const theme = useTheme();
  const { t } = useLanguage();
  const { accounts } = useAccount();
  const insets = useSafeAreaInsets();
  useScreenStatusBar();

  const [originalAmount, setOriginalAmount] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const expenseCategories: Category[] = [
    { id: "food", name: "Food", icon: ShoppingCart, color: "#10b981" },
    { id: "transport", name: "Transport", icon: Truck, color: "#3b82f6" },
    { id: "utilities", name: "Utilities", icon: Zap, color: "#f59e0b" },
    { id: "entertainment", name: "Entertainment", icon: Film, color: "#8b5cf6" },
    { id: "healthcare", name: "Healthcare", icon: Heart, color: "#ef4444" },
    { id: "shopping", name: "Shopping", icon: ShoppingBag, color: "#06b6d4" },
    { id: "education", name: "Education", icon: Book, color: "#84cc16" },
    { id: "other", name: "Other", icon: MoreHorizontal, color: "#64748b" },
  ];

  const incomeCategories: Category[] = [
    { id: "salary", name: "Salary", icon: Briefcase, color: "#10b981" },
    { id: "freelance", name: "Freelance", icon: DollarSign, color: "#3b82f6" },
    { id: "investment", name: "Investment", icon: TrendingUp, color: "#8b5cf6" },
    { id: "gift", name: "Gift", icon: Gift, color: "#f59e0b" },
    { id: "other", name: "Other", icon: MoreHorizontal, color: "#64748b" },
  ];

  const categories = transactionType === "expense" ? expenseCategories : incomeCategories;

  const openDateSheet = useCallback(() => setDateSheetOpen(true), []);
  const closeDateSheet = useCallback(() => setDateSheetOpen(false), []);
  const openCategorySheet = useCallback(() => setCategorySheetOpen(true), []);
  const closeCategorySheet = useCallback(() => setCategorySheetOpen(false), []);

  const handleSelectCategory = useCallback(
    (category: Category) => {
      setSelectedCategory(category);
      setCategorySheetOpen(false);
    },
    []
  );

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onDateChange = useCallback(
    (_event: any, selectedDate?: Date) => {
      if (selectedDate) {
        setDate(selectedDate);
        setDateSheetOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    const loadTransaction = async () => {
      if (!id || typeof id !== "string") return;
      try {
        setLoading(true);
        const user = await getCurrentUserOfflineFirst();
        if (!user) {
          Alert.alert(t.error || "Error", t.pleaseSignIn || "Please sign in");
          router.back();
          return;
        }
        
        const expenseData = selectExpenseById(user.id, id);
        if (expenseData) {
          setAmount(expenseData.amount.toString());
          setDescription(expenseData.description ?? "");
          setDate(new Date(expenseData.date));
          setOriginalAmount(expenseData.amount);
          setAccountId(expenseData.account_id ?? null);
          setTransactionType("expense");
          const category = expenseCategories.find((c) => c.name === expenseData.category);
          if (category) setSelectedCategory(category);
          else if (expenseData.category) {
            setSelectedCategory({
              id: "other",
              name: expenseData.category,
              icon: MoreHorizontal,
              color: "#64748b",
            });
          }
          setIsTransactionRecord(false);
        } else {
          const tx = selectTransactionById(user.id, id);
          if (tx) {
            setAmount(tx.amount.toString());
            setDescription(tx.description ?? "");
            setDate(new Date(tx.date));
            setOriginalAmount(tx.amount);
            setAccountId(tx.account_id);
            setTransactionType(tx.type === "income" ? "income" : "expense");
            
            const catList = tx.type === "income" ? incomeCategories : expenseCategories;
            const category = catList.find((c) => c.name === (tx.category ?? ""));
            if (category) setSelectedCategory(category);
            else if (tx.category) {
              setSelectedCategory({
                id: "other",
                name: tx.category,
                icon: MoreHorizontal,
                color: "#64748b",
              });
            }
            setIsTransactionRecord(true);
          } else {
            Alert.alert(t.error || "Error", t.transactionNotFound || "Transaction not found");
            router.back();
            return;
          }
        }
      } catch (error) {
        console.error("Error loading transaction:", error);
        Alert.alert(t.error || "Error", t.failedToLoadTransaction || "Failed to load transaction data");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [id]);

  const handleSave = async () => {
    if (!amount || !selectedCategory || !id || typeof id !== "string") {
      Alert.alert(
        t.missingInformation || "Missing Information", 
        t.pleaseFillAmountAndCategory || "Please fill in amount and category"
      );
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
      };

      if (isTransactionRecord) {
        const txPatch = { ...basePatch };

        updateTransactionLocal(id, txPatch);

        try {
          const user = await getCurrentUserOfflineFirst();
          if (user && accountId) {
            await upsertTransaction(id, {
              user_id: user.id,
              account_id: accountId,
              type: transactionType,
              ...txPatch,
            });
          }
        } catch (remoteError) {
          console.error("Error upserting transaction on Supabase:", remoteError);
        }
      } else {
        const expensePatch = { ...basePatch };
        updateExpenseLocal(id, expensePatch);

        try {
          await updateExpense(id, expensePatch);
        } catch (remoteError) {
          console.error("Error updating expense on Supabase:", remoteError);
        }
      }

      if (accountId && originalAmount != null) {
        const acc = accounts.find((a) => a.id === accountId);
        if (acc) {
          const diff = newAmountNum - originalAmount;
          const balanceChange = transactionType === "expense" ? -diff : diff;
          const newBalance = acc.amount + balanceChange;
          updateAccountLocal(accountId, { amount: newBalance });
          try {
            await updateAccountBalance(accountId, newBalance);
          } catch (balanceError) {
            console.error("Error updating account balance on Supabase:", balanceError);
          }
        }
      }

      if (!(await isOfflineGateLocked())) void triggerSync();

      const successMsg = transactionType === "expense" 
        ? (t.expenseUpdatedSuccessfully || "Expense updated successfully!")
        : (t.incomeUpdatedSuccessfully || "Income updated successfully!");
      
      Alert.alert(t.success || "Success", successMsg, [
        { text: t.ok || "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert(t.error || "Error", t.failedToUpdateTransaction || "Failed to update transaction");
    } finally {
      setSaving(false);
    }
  };

  const accentColor = transactionType === "expense" ? theme.danger : theme.success;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <TouchableOpacity
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: theme.cardBackground,
            }}
            onPress={() => router.back()}
          >
            <X size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}>
            {transactionType === "expense" 
              ? (t.editExpense || "Edit Expense")
              : (t.editIncome || "Edit Income")}
          </Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Amount Input */}
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: accentColor, fontSize: 28, fontWeight: "600", marginRight: 8 }}>
                $
              </Text>
              <TextInput
                style={{
                  color: theme.text,
                  fontSize: 28,
                  fontWeight: "600",
                  minWidth: 100,
                  textAlign: "center",
                }}
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                placeholderTextColor={theme.placeholder}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {/* Category Selection */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  marginBottom: 8,
                  color: theme.textSecondary,
                }}
              >
                {t.select_category || "Category"}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openCategorySheet}
                style={{
                  ...CARD_STYLE,
                  backgroundColor: theme.cardBackground,
                  borderColor: selectedCategory ? selectedCategory.color : theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: selectedCategory
                        ? `${selectedCategory.color}18`
                        : `${theme.border}40`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    {selectedCategory ? (
                      <selectedCategory.icon size={22} color={selectedCategory.color} />
                    ) : (
                      <ChevronDown size={22} color={theme.textMuted} />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: selectedCategory ? theme.text : theme.placeholder,
                    }}
                    numberOfLines={1}
                  >
                    {selectedCategory?.name ?? (t.select_category || "Select category")}
                  </Text>
                </View>
                <ChevronDown size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Category bottom sheet */}
            <Modal
              visible={categorySheetOpen}
              transparent
              animationType="slide"
              onRequestClose={closeCategorySheet}
            >
              <Pressable
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                  backgroundColor: "rgba(0,0,0,0.4)",
                }}
                onPress={closeCategorySheet}
              >
                <Pressable
                  style={{
                    maxHeight: "75%",
                    backgroundColor: theme.cardBackground,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    overflow: "hidden",
                  }}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: "center" }}>
                    <View
                      style={{
                        width: 36,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: theme.border,
                      }}
                    />
                  </View>
                  <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: theme.text,
                        marginBottom: 16,
                      }}
                    >
                      {t.select_category || "Select category"}
                    </Text>
                    <ScrollView
                      style={{ maxHeight: 320 }}
                      contentContainerStyle={{ paddingBottom: 16 }}
                      showsVerticalScrollIndicator={false}
                    >
                      {categories
                        .filter((cat) => cat.name && cat.name !== "undefined")
                        .map((category) => {
                          const CategoryIcon = category.icon;
                          return (
                            <TouchableOpacity
                              key={category.id}
                              activeOpacity={0.7}
                              onPress={() => handleSelectCategory(category)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingVertical: 14,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                                backgroundColor: theme.background,
                                marginBottom: 8,
                                borderWidth: 1,
                                borderColor: theme.border,
                              }}
                            >
                              <View
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 10,
                                  backgroundColor: `${category.color}18`,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginRight: 12,
                                }}
                              >
                                <CategoryIcon size={20} color={category.color} />
                              </View>
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: "600",
                                  color: theme.text,
                                  flex: 1,
                                }}
                              >
                                {category.name}
                              </Text>
                              <View style={{ transform: [{ rotate: "-90deg" }] }}>
                                <ChevronDown size={18} color={theme.textMuted} />
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                    </ScrollView>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>

            {/* Note - Optional */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  marginBottom: 8,
                  color: theme.textSecondary,
                }}
              >
                {t.note || "Note"} ({t.optional || "optional"})
              </Text>
              <TextInput
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 16,
                  fontSize: 16,
                  minHeight: 50,
                  backgroundColor: theme.inputBackground ?? theme.background,
                  color: theme.text,
                  textAlignVertical: "top",
                }}
                value={description}
                onChangeText={setDescription}
                placeholder={
                  transactionType === "expense"
                    ? (t.addNoteAboutExpense || "Add a note (optional)...")
                    : (t.addNoteAboutIncome || "Add a note (optional)...")
                }
                placeholderTextColor={theme.placeholder}
                multiline
              />
            </View>

            {/* Date Selection */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  marginBottom: 8,
                  color: theme.textSecondary,
                }}
              >
                {t.date || "Date"}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openDateSheet}
                style={{
                  ...CARD_STYLE,
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: `${accentColor}18`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <CalendarIcon size={22} color={accentColor} />
                  </View>
                  <Text
                    style={{ fontSize: 16, fontWeight: "600", color: theme.text }}
                    numberOfLines={1}
                  >
                    {formatDate(date)}
                  </Text>
                </View>
                <ChevronDown size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Date bottom sheet */}
            <Modal
              visible={dateSheetOpen}
              transparent
              animationType="slide"
              onRequestClose={closeDateSheet}
            >
              <Pressable
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                  backgroundColor: "rgba(0,0,0,0.4)",
                }}
                onPress={closeDateSheet}
              >
                <Pressable
                  style={{
                    backgroundColor: theme.cardBackground,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    overflow: "hidden",
                    paddingBottom: 24,
                  }}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: "center" }}>
                    <View
                      style={{
                        width: 36,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: theme.border,
                      }}
                    />
                  </View>
                  <View style={{ paddingHorizontal: 20 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: theme.text,
                        marginBottom: 16,
                      }}
                    >
                      {t.selectDate || "Select date"}
                    </Text>
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={onDateChange}
                      maximumDate={new Date()}
                    />
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          </View>
        </ScrollView>

        {/* Save button - Fixed at bottom right */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 12),
            alignItems: "flex-end",
            backgroundColor: theme.background,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          <TouchableOpacity
            style={{
              paddingVertical: 14,
              paddingHorizontal: 28,
              borderRadius: 14,
              backgroundColor: !amount || !selectedCategory || saving
                ? theme.border
                : accentColor,
              minWidth: 120,
              alignItems: "center",
              opacity: !amount || !selectedCategory ? 0.7 : 1,
            }}
            onPress={handleSave}
            disabled={!amount || !selectedCategory || saving}
          >
            <Text
              style={{
                fontWeight: "600",
                fontSize: 16,
                color: !amount || !selectedCategory || saving
                  ? theme.textMuted
                  : "#ffffff",
              }}
            >
              {saving ? (t.saving || "Saving...") : (t.save || "Save")}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
