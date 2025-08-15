"use client";

import React, { useState, useEffect } from "react";
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
import { useRouter } from "expo-router";
import {
  X,
  Zap,
  Film,
  ShoppingBag,
  Book,
  MoreHorizontal,
  Calendar,
  ChevronDown,
  CreditCard,
  DollarSign,
  Wallet,
  Home,
  User,
  Gift,
  HandCoins,
  Laptop,
  RefreshCw,
  Award,
  Dice5,
  Percent,
  TrendingUp,
  Briefcase,
  Clock,
  Utensils,
  Bus,
  HeartPulse,
  GraduationCap,
  Smile,
  Shield,
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
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "~/lib/supabase";
import { NAV_THEME, useTheme } from "~/lib/theme";
import { fetchAccounts } from "~/lib/accounts";
import type { Account } from "~/lib/accounts";

const ENTRY_TABS = [
  { id: "Income", label: "Income" },
  { id: "Expense", label: "Expense" },
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

const expenseCategories: Category[] = [
  { id: "food", name: "Food & Drinks", icon: Utensils, color: "#059669" },
  { id: "rent", name: "Home & Rent", icon: Home, color: "#0891b2" },
  { id: "transport", name: "Travel", icon: Bus, color: "#3b82f6" },
  { id: "utilities", name: "Bills", icon: Zap, color: "#f97316" },
  { id: "entertainment", name: "Fun", icon: Film, color: "#8b5cf6" },
  { id: "healthcare", name: "Health", icon: HeartPulse, color: "#dc2626" },
  { id: "shopping", name: "Shopping", icon: ShoppingBag, color: "#06b6d4" },
  { id: "education", name: "Learning", icon: GraduationCap, color: "#84cc16" },
  { id: "personal_care", name: "Personal Care", icon: Smile, color: "#ec4899" },
  { id: "insurance", name: "Insurance", icon: Shield, color: "#14b8a6" },
  { id: "debt", name: "Loans", icon: CreditCard, color: "#f97316" },
  { id: "gifts", name: "Gifts", icon: Gift, color: "#8b5cf6" },
  { id: "charity", name: "Donations", icon: HandHeart, color: "#ef4444" },
  { id: "travel", name: "Vacation", icon: Luggage, color: "#3b82f6" },
  { id: "pets", name: "Pets", icon: PawPrint, color: "#f59e0b" },
  { id: "kids", name: "Children", icon: Baby, color: "#ec4899" },
  {
    id: "subscriptions",
    name: "Subscriptions",
    icon: Repeat,
    color: "#8b5cf6",
  },
  { id: "fitness", name: "Gym & Sports", icon: Dumbbell, color: "#059669" },
  {
    id: "electronics",
    name: "Electronics",
    icon: Smartphone,
    color: "#64748b",
  },
  { id: "furniture", name: "Furniture", icon: Sofa, color: "#f59e0b" },
  { id: "repairs", name: "Repairs", icon: Wrench, color: "#3b82f6" },
  { id: "taxes", name: "Taxes", icon: Receipt, color: "#ef4444" },
];

const incomeCategories: Category[] = [
  { id: "salary", name: "Job Salary", icon: DollarSign, color: "#059669" },
  { id: "bonus", name: "Bonus", icon: Zap, color: "#3b82f6" },
  { id: "part_time", name: "Part-time Work", icon: Clock, color: "#f97316" },
  { id: "business", name: "Business", icon: Briefcase, color: "#8b5cf6" },
  {
    id: "investments",
    name: "Investments",
    icon: TrendingUp,
    color: "#ef4444",
  },
  { id: "interest", name: "Bank Interest", icon: Percent, color: "#06b6d4" },
  { id: "rental", name: "Rent Income", icon: Home, color: "#84cc16" },
  { id: "sales", name: "Sales", icon: ShoppingBag, color: "#64748b" },
  { id: "gambling", name: "Gambling", icon: Dice5, color: "#f43f5e" },
  { id: "awards", name: "Awards", icon: Award, color: "#8b5cf6" },
  { id: "refunds", name: "Refunds", icon: RefreshCw, color: "#3b82f6" },
  { id: "freelance", name: "Freelance", icon: Laptop, color: "#f97316" },
  { id: "royalties", name: "Royalties", icon: Book, color: "#84cc16" },
  { id: "grants", name: "Grants", icon: HandCoins, color: "#059669" },
  { id: "gifts", name: "Gifts Received", icon: Gift, color: "#8b5cf6" },
  { id: "pension", name: "Pension", icon: User, color: "#64748b" },
];

const paymentMethods = [
  { id: "cash", name: "Cash", icon: DollarSign, color: "#059669" },
  { id: "EVC", name: "EVC Plus", icon: CreditCard, color: "#dc2626" },
  {
    id: "credit_card",
    name: "Credit Card",
    icon: CreditCard,
    color: "#3b82f6",
  },
  { id: "debit_card", name: "Debit Card", icon: CreditCard, color: "#8b5cf6" },
  {
    id: "digital_wallet",
    name: "Mobile Money",
    icon: Wallet,
    color: "#f97316",
  },
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
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
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    const loadAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const accountsData = await fetchAccounts();
        setAccounts(accountsData);
        if (accountsData.length > 0) {
          setSelectedAccount(accountsData[0]);
        }
      } catch (error) {
        console.error("Error loading accounts:", error);
        Alert.alert("Error", "Failed to load accounts");
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, []);

  const handleEntryTypeChange = (type: string) => {
    setEntryType(type);
    setSelectedCategory(null);
  };

  const handleSaveExpense = async () => {
    if (!amount || !description.trim()) {
      Alert.alert("Missing Info", "Please fill in the amount and description");
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Choose Category", "Please select a category");
      return;
    }

    if (!selectedAccount) {
      Alert.alert("Select Account", "Please select an account");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in first");

      const amountNum = Number.parseFloat(amount);

      // For expenses, check account balance
      if (entryType === "Expense") {
        if (amountNum > selectedAccount.amount) {
          Alert.alert(
            "Insufficient Funds",
            `Your ${selectedAccount.name} account doesn't have enough balance for this expense.`
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Start a transaction
      const { error: expenseError } = await supabase.from("expenses").insert({
        user_id: user.id,
        entry_type: entryType,
        amount: amountNum,
        category: selectedCategory?.name || null,
        description: description.trim(),
        payment_method: paymentMethod,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurringFrequency : null,
        date: date.toISOString().split("T")[0],
        account_id: selectedAccount.id,
      });

      if (expenseError) throw expenseError;

      // Update account balance
      const newBalance =
        entryType === "Expense"
          ? selectedAccount.amount - amountNum
          : selectedAccount.amount + amountNum;

      const { error: accountError } = await supabase
        .from("accounts")
        .update({ amount: newBalance })
        .eq("id", selectedAccount.id);

      if (accountError) throw accountError;

      Alert.alert(
        "Success!",
        `Your ${entryType.toLowerCase()} has been saved!`,
        [
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
            text: "View All",
            onPress: () => router.push("/(main)/ExpenseListScreen"),
          },
        ]
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong. Please try again.");
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

  const isFormValid =
    amount &&
    selectedCategory &&
    description.trim() &&
    selectedAccount &&
    !isSubmitting;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <X size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "700",
              fontFamily: "Work Sans",
            }}
          >
            Add Transaction
          </Text>
          <TouchableOpacity
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: isFormValid ? theme.primary : theme.stepInactive,
            }}
            onPress={handleSaveExpense}
            disabled={!isFormValid}
          >
            <Text
              style={{
                fontWeight: "600",
                color: isFormValid ? theme.primaryText : theme.textMuted,
              }}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", margin: 16, gap: 8 }}>
            {ENTRY_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor:
                    entryType === tab.id ? theme.primary : theme.cardBackground,
                  borderWidth: 1,
                  borderColor:
                    entryType === tab.id ? theme.primary : theme.border,
                }}
                onPress={() => handleEntryTypeChange(tab.id)}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: 16,
                    color:
                      entryType === tab.id ? theme.primaryText : theme.text,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 24,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: theme.textSecondary,
                marginBottom: 16,
                fontSize: 16,
                fontWeight: "500",
              }}
            >
              How much?
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color: theme.primary,
                  fontSize: 32,
                  fontWeight: "700",
                  marginRight: 8,
                }}
              >
                $
              </Text>
              <TextInput
                style={{
                  color: theme.text,
                  fontSize: 36,
                  fontWeight: "700",
                  minWidth: 120,
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

          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 16,
                color: theme.text,
                fontFamily: "Work Sans",
              }}
            >
              Choose Category
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "space-between",
              }}
            >
              {(entryType === "Expense" ? expenseCategories : incomeCategories)
                .slice(0, showMoreCategories ? undefined : 7)
                .map((category) => {
                  const IconComponent = category.icon;
                  const isSelected = selectedCategory?.id === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={{
                        width: "22%",
                        aspectRatio: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: 16,
                        backgroundColor: isSelected
                          ? `${category.color}20`
                          : theme.cardBackground,
                        borderWidth: 2,
                        borderColor: isSelected ? category.color : theme.border,
                        padding: 8,
                      }}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: isSelected
                            ? category.color
                            : `${category.color}30`,
                          marginBottom: 8,
                        }}
                      >
                        <IconComponent
                          size={18}
                          color={isSelected ? "#ffffff" : category.color}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 11,
                          textAlign: "center",
                          color: isSelected
                            ? category.color
                            : theme.textSecondary,
                          fontWeight: isSelected ? "600" : "500",
                        }}
                        numberOfLines={2}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

              {/* Show More button */}
              <TouchableOpacity
                style={{
                  width: "22%",
                  aspectRatio: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 16,
                  backgroundColor: showMoreCategories
                    ? `${theme.accent}20`
                    : theme.cardBackground,
                  borderWidth: 2,
                  borderColor: showMoreCategories ? theme.accent : theme.border,
                  padding: 8,
                }}
                onPress={() => setShowMoreCategories(!showMoreCategories)}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: showMoreCategories
                      ? theme.accent
                      : `${theme.accent}30`,
                    marginBottom: 8,
                  }}
                >
                  <MoreHorizontal
                    size={18}
                    color={showMoreCategories ? "#ffffff" : theme.accent}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    textAlign: "center",
                    color: showMoreCategories
                      ? theme.accent
                      : theme.textSecondary,
                    fontWeight: showMoreCategories ? "600" : "500",
                  }}
                >
                  {showMoreCategories ? "Less" : "More"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 16,
                color: theme.text,
                fontFamily: "Work Sans",
              }}
            >
              What's this for?
            </Text>
            <TextInput
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 16,
                fontSize: 16,
                minHeight: 80,
                backgroundColor: theme.inputBackground,
                color: theme.text,
                textAlignVertical: "top",
              }}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a note about this transaction..."
              placeholderTextColor={theme.placeholder}
              multiline
            />
          </View>

          {/*Replace the current Select Account section with this:*/}

          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 16,
                color: theme.text,
                fontFamily: "Work Sans",
              }}
            >
              Select Account
            </Text>
            {loadingAccounts ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <View>
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.inputBackground,
                  }}
                  onPress={() => setShowAccountDropdown(!showAccountDropdown)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: `${theme.primary}30`,
                        marginRight: 16,
                      }}
                    >
                      <Wallet size={20} color={theme.primary} />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                        }}
                      >
                        {selectedAccount?.name || "Select an account"}
                      </Text>
                      {selectedAccount && (
                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.textSecondary,
                          }}
                        >
                          {selectedAccount.group_name} • £
                          {selectedAccount.amount.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <ChevronDown
                    size={16}
                    color={theme.iconMuted}
                    style={{
                      transform: [
                        { rotate: showAccountDropdown ? "180deg" : "0deg" },
                      ],
                    }}
                  />
                </TouchableOpacity>

                {showAccountDropdown && (
                  <View
                    style={{
                      marginTop: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.inputBackground,
                      maxHeight: 300,
                    }}
                  >
                    <ScrollView>
                      {accounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={{
                            padding: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.border,
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor:
                              selectedAccount?.id === account.id
                                ? `${theme.primary}10`
                                : undefined,
                          }}
                          onPress={() => {
                            setSelectedAccount(account);
                            setShowAccountDropdown(false);
                          }}
                        >
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: `${theme.primary}30`,
                              marginRight: 16,
                            }}
                          >
                            <Wallet size={20} color={theme.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: theme.text,
                              }}
                            >
                              {account.name}
                            </Text>
                            <Text
                              style={{
                                fontSize: 14,
                                color: theme.textSecondary,
                              }}
                            >
                              {account.group_name}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "600",
                              color: theme.text,
                            }}
                          >
                            £{account.amount.toFixed(2)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>

          {/*When ?*/}
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 16,
                color: theme.text,
                fontFamily: "Work Sans",
              }}
            >
              When?
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.inputBackground,
              }}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color={theme.primary} />
              <Text
                style={{
                  marginLeft: 12,
                  flex: 1,
                  fontSize: 16,
                  color: theme.text,
                }}
              >
                {formatDate(date)}
              </Text>
              <ChevronDown size={16} color={theme.iconMuted} />
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

          <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: theme.text,
                  fontFamily: "Work Sans",
                }}
              >
                Repeat this?
              </Text>
              <TouchableOpacity
                style={{
                  width: 50,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: isRecurring
                    ? theme.success
                    : theme.stepInactive,
                  justifyContent: "center",
                  paddingHorizontal: 2,
                }}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: "#ffffff",
                    alignSelf: isRecurring ? "flex-end" : "flex-start",
                  }}
                />
              </TouchableOpacity>
            </View>

            {isRecurring && (
              <View>
                <Text
                  style={{
                    marginBottom: 12,
                    fontSize: 16,
                    color: theme.textSecondary,
                  }}
                >
                  How often?
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {["daily", "weekly", "monthly", "yearly"].map((freq) => {
                    const isSelected = recurringFrequency === freq;
                    return (
                      <TouchableOpacity
                        key={freq}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 8,
                          backgroundColor: isSelected
                            ? theme.primary
                            : theme.cardBackground,
                          borderWidth: 1,
                          borderColor: isSelected
                            ? theme.primary
                            : theme.border,
                        }}
                        onPress={() => setRecurringFrequency(freq as Frequency)}
                      >
                        <Text
                          style={{
                            textAlign: "center",
                            fontWeight: "600",
                            color: isSelected ? theme.primaryText : theme.text,
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
