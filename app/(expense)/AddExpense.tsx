"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  ArrowRight,
  ArrowUpDown,
  Copy,
  Eye,
  EyeOff,
  Check,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "~/lib/supabase";
import { NAV_THEME, useTheme } from "~/lib/theme";
import { fetchAccounts, updateAccountBalance } from "~/lib/accounts";
import { addExpense } from "~/lib/expenses";
import { addTransaction } from "~/lib/transactions";
import { addTransfer } from "~/lib/transfers";
import { addSubscription } from "~/lib/subscriptions";
import type { Account } from "~/lib/accounts";
import notificationService from "~/lib/notificationService";
import { useLanguage } from "~/lib/LanguageProvider";

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

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
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

  // Transfer-specific state
  const [fromAccount, setFromAccount] = useState<Account | null>(null);
  const [toAccount, setToAccount] = useState<Account | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [showAccountSelectionModal, setShowAccountSelectionModal] =
    useState(false);
  const [accountSelectionType, setAccountSelectionType] = useState<
    "from" | "to"
  >("from");
  const { t } = useLanguage();

  // Create dynamic tabs with translations
  const ENTRY_TABS = [
    { id: "Income", label: t.income },
    { id: "Expense", label: t.expense },
    { id: "Transfer", label: t.transfer },
  ];
  type Frequency = "daily" | "weekly" | "monthly" | "yearly";
  type PaymentMethod =
    | "cash"
    | "credit_card"
    | "debit_card"
    | "digital_wallet"
    | "EVC";

  const expenseCategories: Category[] = [
    { id: "food", name: t.foodAndDrinks, icon: Utensils, color: "#059669" },
    { id: "rent", name: t.homeAndRent, icon: Home, color: "#0891b2" },
    { id: "transport", name: t.travel, icon: Bus, color: "#3b82f6" },
    { id: "utilities", name: t.bills, icon: Zap, color: "#f97316" },
    { id: "entertainment", name: t.fun, icon: Film, color: "#8b5cf6" },
    { id: "healthcare", name: t.health, icon: HeartPulse, color: "#dc2626" },
    { id: "shopping", name: t.shopping, icon: ShoppingBag, color: "#06b6d4" },
    {
      id: "education",
      name: t.learning,
      icon: GraduationCap,
      color: "#84cc16",
    },
    {
      id: "personal_care",
      name: t.personalCare,
      icon: Smile,
      color: "#ec4899",
    },
    { id: "insurance", name: t.insurance, icon: Shield, color: "#14b8a6" },
    { id: "debt", name: t.loans, icon: CreditCard, color: "#f97316" },
    { id: "gifts", name: t.gifts, icon: Gift, color: "#8b5cf6" },
    { id: "charity", name: t.donations, icon: HandHeart, color: "#ef4444" },
    { id: "travel", name: t.vacation, icon: Luggage, color: "#3b82f6" },
    { id: "pets", name: t.pets, icon: PawPrint, color: "#f59e0b" },
    { id: "kids", name: t.children, icon: Baby, color: "#ec4899" },
    {
      id: "subscriptions",
      name: t.subscriptions,
      icon: Repeat,
      color: "#8b5cf6",
    },
    { id: "fitness", name: t.gymAndSports, icon: Dumbbell, color: "#059669" },
    {
      id: "electronics",
      name: t.electronics,
      icon: Smartphone,
      color: "#64748b",
    },
    { id: "furniture", name: t.furniture, icon: Sofa, color: "#f59e0b" },
    { id: "repairs", name: t.repairs, icon: Wrench, color: "#3b82f6" },
    { id: "taxes", name: t.taxes, icon: Receipt, color: "#ef4444" },
  ];

  const incomeCategories: Category[] = [
    { id: "salary", name: t.jobSalary, icon: DollarSign, color: "#059669" },
    { id: "bonus", name: t.bonus, icon: Zap, color: "#3b82f6" },
    { id: "part_time", name: t.partTimeWork, icon: Clock, color: "#f97316" },
    { id: "business", name: t.business, icon: Briefcase, color: "#8b5cf6" },
    {
      id: "investments",
      name: t.investments,
      icon: TrendingUp,
      color: "#ef4444",
    },
    { id: "interest", name: t.bankInterest, icon: Percent, color: "#06b6d4" },
    { id: "rental", name: t.rentIncome, icon: Home, color: "#84cc16" },
    { id: "sales", name: t.sales, icon: ShoppingBag, color: "#64748b" },
    { id: "gambling", name: t.gambling, icon: Dice5, color: "#f43f5e" },
    { id: "awards", name: t.awards, icon: Award, color: "#8b5cf6" },
    { id: "refunds", name: t.refunds, icon: RefreshCw, color: "#3b82f6" },
    { id: "freelance", name: t.freelance, icon: Laptop, color: "#f97316" },
    { id: "royalties", name: t.royalties, icon: Book, color: "#84cc16" },
    { id: "grants", name: t.grants, icon: HandCoins, color: "#059669" },
    { id: "gifts", name: t.giftsReceived, icon: Gift, color: "#8b5cf6" },
    { id: "pension", name: t.pension, icon: User, color: "#64748b" },
  ];

  const paymentMethods = [
    { id: "cash", name: t.cash, icon: DollarSign, color: "#059669" },
    { id: "EVC", name: t.evcPlus, icon: CreditCard, color: "#dc2626" },
    {
      id: "credit_card",
      name: t.creditCard,
      icon: CreditCard,
      color: "#3b82f6",
    },
    {
      id: "debit_card",
      name: t.debitCard,
      icon: CreditCard,
      color: "#8b5cf6",
    },
    {
      id: "digital_wallet",
      name: t.mobileMoney,
      icon: Wallet,
      color: "#f97316",
    },
  ];

  useEffect(() => {
    const loadAccounts = async () => {
      setLoadingAccounts(true);
      try {
        // Get the current user first
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("User not authenticated");
          return;
        }

        const accountsData = await fetchAccounts(user.id);
        setAccounts(accountsData);
        if (accountsData.length > 0) {
          setSelectedAccount(accountsData[0]);
        }
      } catch (error) {
        console.error("Error loading accounts:", error);
        Alert.alert(t.error, t.failedToLoadAccounts);
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
    // Basic validation
    if (!amount || !description.trim()) {
      Alert.alert(t.missingInfo, t.pleaseFillRequiredFields);
      return;
    }

    if (!selectedAccount) {
      Alert.alert(t.selectAccount, t.pleaseSelectAccount);
      return;
    }

    // Type-specific validation
    if (entryType === "Income" && !selectedCategory) {
      Alert.alert(t.chooseCategory, t.pleaseSelectCategoryForIncome);
      return;
    }

    if (entryType === "Expense") {
      if (!selectedCategory) {
        Alert.alert(t.chooseCategory, t.pleaseSelectCategoryForExpense);
        return;
      }
      if (!paymentMethod) {
        Alert.alert(t.paymentMethod, t.pleaseSelectPaymentMethodForExpense);
        return;
      }
    }

    if (entryType === "Transfer") {
      if (!fromAccount || !toAccount) {
        Alert.alert(t.selectAccounts, t.pleaseSelectBothAccountsForTransfer);
        return;
      }
      if (fromAccount.id === toAccount.id) {
        Alert.alert(t.invalidTransfer, t.fromAndToAccountsMustBeDifferent);
        return;
      }
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
            t.insufficientFunds,
            `${t.yourAccountDoesntHaveEnoughBalance} ${selectedAccount.name} ${t.forThisExpense}.`
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Add expense using the service
      await addExpense({
        user_id: user.id,
        entry_type: entryType as "Income" | "Expense",
        amount: amountNum,
        category: selectedCategory?.name || "",
        description: description.trim(),
        payment_method: paymentMethod,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurringFrequency : undefined,
        date: date.toISOString().split("T")[0],
        account_id: selectedAccount.id,
        is_essential: true,
      });

      // Add transaction using the service
      await addTransaction({
        user_id: user.id,
        account_id: selectedAccount.id,
        amount: amountNum,
        description: description.trim(),
        date: date.toISOString().split("T")[0],
        category: selectedCategory?.name || "",
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurringFrequency : undefined,
        type: entryType === "Income" ? "income" : "expense",
      });

      // Update account balance using the service
      const newBalance =
        entryType === "Expense"
          ? selectedAccount.amount - amountNum
          : selectedAccount.amount + amountNum;

      await updateAccountBalance(selectedAccount.id, newBalance);

      // Auto-create subscription if this is a recurring expense
      if (entryType === "Expense" && isRecurring && selectedCategory) {
        try {
          // Calculate next payment date based on recurrence interval
          let nextPaymentDate = new Date();
          switch (recurringFrequency) {
            case "weekly":
              nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
              break;
            case "monthly":
              nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
              break;
            case "yearly":
              nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
              break;
            default:
              nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          }

          // Map recurrence interval to billing cycle
          const billingCycle =
            recurringFrequency === "weekly"
              ? "weekly"
              : recurringFrequency === "yearly"
                ? "yearly"
                : "monthly";

          // Create subscription
          await addSubscription({
            user_id: user.id,
            account_id: selectedAccount.id,
            name: description.trim() || selectedCategory.name,
            amount: amountNum,
            category: selectedCategory.name,
            billing_cycle: billingCycle,
            next_payment_date: nextPaymentDate.toISOString().split("T")[0],
            is_active: true,
            icon: "subscriptions", // Default icon for auto-created subscriptions
            icon_color: selectedCategory.color,
            description: `Auto-created from recurring ${entryType.toLowerCase()}`,
          });

          console.log("Auto-created subscription for recurring expense");
        } catch (subscriptionError) {
          console.error("Error auto-creating subscription:", subscriptionError);
          // Don't fail the main operation if subscription creation fails
        }
      }

      // Check budget thresholds after adding an expense
      if (entryType === "Expense" && selectedCategory?.name) {
        try {
          await notificationService.checkBudgetsAndNotify();
        } catch (error) {
          console.error("Error checking budget notifications:", error);
          // Don't fail the main operation if budget checking fails
        }
      }

      Alert.alert(
        "Success!",
        `Your ${entryType.toLowerCase()} has been saved!`,
        [
          {
            text: "Ok",
            onPress: () => router.push("/(main)/Dashboard"),
          },
        ]
      );
    } catch (error) {
      console.error(error);
      Alert.alert(t.error, t.somethingWentWrongPleaseTryAgain);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || Number.parseFloat(transferAmount) <= 0) {
      Alert.alert(t.error, t.pleaseEnterValidTransferAmount);
      return;
    }

    if (!fromAccount || !toAccount) {
      Alert.alert("Select Accounts", "Please select both from and to accounts");
      return;
    }

    if (fromAccount.id === toAccount.id) {
      Alert.alert("Error", "Cannot transfer to the same account");
      return;
    }

    const amountNum = Number.parseFloat(transferAmount);
    if (amountNum > fromAccount.amount) {
      Alert.alert(
        "Insufficient Funds",
        "Insufficient balance in the from account"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in first");

      // Add transfer record
      await addTransfer({
        user_id: user.id,
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        amount: amountNum,
        description: `Transfer from ${fromAccount.name} to ${toAccount.name}`,
        date: date.toISOString().split("T")[0],
      });

      // Add EXPENSE transaction for the FROM account (outgoing transfer)
      await addTransaction({
        user_id: user.id,
        account_id: fromAccount.id,
        amount: amountNum,
        description: `Transfer to ${toAccount.name}`,
        date: date.toISOString().split("T")[0],
        category: "Transfer",
        is_recurring: false,
        type: "expense", // This will increase expenses for Account 1
      });

      // Add INCOME transaction for the TO account (incoming transfer)
      await addTransaction({
        user_id: user.id,
        account_id: toAccount.id,
        amount: amountNum,
        description: `Transfer from ${fromAccount.name}`,
        date: date.toISOString().split("T")[0],
        category: "Transfer",
        is_recurring: false,
        type: "income", // This will increase income for Account 2
      });

      // Update account balances using the service
      const fromAccountNewBalance = fromAccount.amount - amountNum;
      const toAccountNewBalance = toAccount.amount + amountNum;

      await Promise.all([
        updateAccountBalance(fromAccount.id, fromAccountNewBalance),
        updateAccountBalance(toAccount.id, toAccountNewBalance),
      ]);

      // Refresh real-time balances after transfer
      // await refreshBalances();

      Alert.alert(
        "Transfer Successful!",
        `$${amountNum} transferred from ${fromAccount.name} to ${toAccount.name}`,
        [
          {
            text: "Ok",
            onPress: () => router.push("/(main)/Dashboard"),
          },
        ]
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Transfer failed. Please try again.");
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

  const isFormValid = useCallback(() => {
    // Basic validation - all transaction types need these
    if (!amount || !description.trim() || !selectedAccount || isSubmitting) {
      return false;
    }

    // Different validation based on transaction type
    switch (entryType) {
      case "Income":
        // Income needs: amount, description, category, account
        return !!selectedCategory;

      case "Expense":
        // Expense needs: amount, description, category, account, payment method
        return !!selectedCategory && !!paymentMethod;

      case "Transfer":
        // Transfer needs: amount, description, from account, to account
        return !!fromAccount && !!toAccount && fromAccount.id !== toAccount.id;

      default:
        return false;
    }
  }, [
    amount,
    description,
    selectedAccount,
    isSubmitting,
    entryType,
    selectedCategory,
    paymentMethod,
    fromAccount,
    toAccount,
  ]);

  const categories =
    entryType === "Expense"
      ? expenseCategories
      : entryType === "Income"
        ? incomeCategories
        : []; // Transfers don't need categories

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
            {t.add_transaction}
          </Text>
          <TouchableOpacity
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: isFormValid()
                ? theme.primary
                : theme.stepInactive,
            }}
            onPress={handleSaveExpense}
            disabled={!isFormValid()}
          >
            <Text
              style={{
                fontWeight: "600",
                color: isFormValid() ? theme.primaryText : theme.textMuted,
              }}
            >
              {isSubmitting ? t.saving : t.save}
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

          {entryType === "Expense" && (
            <>
              {/* Amount Input (Common for both) */}
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
                  {t.how_much}
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
                    onChangeText={(text) =>
                      setAmount(text.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="0.00"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
              </View>

              {/* Updated Category Section with Dropdown - Only for Income and Expenses */}
              {entryType === "Expense" && (
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
                    {t.choose_category}
                  </Text>

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
                      onPress={() =>
                        setShowCategoryDropdown(!showCategoryDropdown)
                      }
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        {selectedCategory ? (
                          <>
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: `${selectedCategory.color}20`,
                                marginRight: 16,
                              }}
                            >
                              <selectedCategory.icon
                                size={20}
                                color={selectedCategory.color}
                              />
                            </View>
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: theme.text,
                              }}
                            >
                              {selectedCategory.name}
                            </Text>
                          </>
                        ) : (
                          <Text
                            style={{
                              fontSize: 16,
                              color: theme.placeholder,
                            }}
                          >
                            {t.select_category}
                          </Text>
                        )}
                      </View>
                      <ChevronDown
                        size={16}
                        color={theme.iconMuted}
                        style={{
                          transform: [
                            {
                              rotate: showCategoryDropdown ? "180deg" : "0deg",
                            },
                          ],
                        }}
                      />
                    </TouchableOpacity>

                    {showCategoryDropdown && (
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
                          {categories.map((category) => {
                            const IconComponent = category.icon;
                            return (
                              <TouchableOpacity
                                key={category.id}
                                style={{
                                  padding: 16,
                                  borderBottomWidth: 1,
                                  borderBottomColor: theme.border,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  backgroundColor:
                                    selectedCategory?.id === category.id
                                      ? `${category.color}10`
                                      : undefined,
                                }}
                                onPress={() => {
                                  setSelectedCategory(category);
                                  setShowCategoryDropdown(false);
                                }}
                              >
                                <View
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    backgroundColor: `${category.color}20`,
                                    marginRight: 16,
                                  }}
                                >
                                  <IconComponent
                                    size={20}
                                    color={category.color}
                                  />
                                </View>
                                <Text
                                  style={{
                                    fontSize: 16,
                                    fontWeight: "600",
                                    color: theme.text,
                                  }}
                                >
                                  {category.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {entryType === "Income" && (
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
                    {t.choose_category}
                  </Text>

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
                      onPress={() =>
                        setShowCategoryDropdown(!showCategoryDropdown)
                      }
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        {selectedCategory ? (
                          <>
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: `${selectedCategory.color}20`,
                                marginRight: 16,
                              }}
                            >
                              <selectedCategory.icon
                                size={20}
                                color={selectedCategory.color}
                              />
                            </View>
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: theme.text,
                              }}
                            >
                              {selectedCategory.name}
                            </Text>
                          </>
                        ) : (
                          <Text
                            style={{
                              fontSize: 16,
                              color: theme.placeholder,
                            }}
                          >
                            {t.select_category}
                          </Text>
                        )}
                      </View>
                      <ChevronDown
                        size={16}
                        color={theme.iconMuted}
                        style={{
                          transform: [
                            {
                              rotate: showCategoryDropdown ? "180deg" : "0deg",
                            },
                          ],
                        }}
                      />
                    </TouchableOpacity>

                    {showCategoryDropdown && (
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
                          {categories.map((category) => {
                            const IconComponent = category.icon;
                            return (
                              <TouchableOpacity
                                key={category.id}
                                style={{
                                  padding: 16,
                                  borderBottomWidth: 1,
                                  borderBottomColor: theme.border,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  backgroundColor:
                                    selectedCategory?.id === category.id
                                      ? `${category.color}10`
                                      : undefined,
                                }}
                                onPress={() => {
                                  setSelectedCategory(category);
                                  setShowCategoryDropdown(false);
                                }}
                              >
                                <View
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    backgroundColor: `${category.color}20`,
                                    marginRight: 16,
                                  }}
                                >
                                  <IconComponent
                                    size={20}
                                    color={category.color}
                                  />
                                </View>
                                <Text
                                  style={{
                                    fontSize: 16,
                                    fontWeight: "600",
                                    color: theme.text,
                                  }}
                                >
                                  {category.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Payment Method Section - Only for Expenses */}
              {entryType === "Expense" && (
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
                    {t.payment_method}
                  </Text>

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
                    onPress={() => setShowPaymentMethodModal(true)}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {paymentMethod ? (
                        <>
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: `${paymentMethods.find((m) => m.id === paymentMethod)?.color}20`,
                              marginRight: 16,
                            }}
                          >
                            {React.createElement(
                              paymentMethods.find((m) => m.id === paymentMethod)
                                ?.icon,
                              {
                                size: 20,
                                color: paymentMethods.find(
                                  (m) => m.id === paymentMethod
                                )?.color,
                              }
                            )}
                          </View>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "600",
                              color: theme.text,
                            }}
                          >
                            {
                              paymentMethods.find((m) => m.id === paymentMethod)
                                ?.name
                            }
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={{
                            fontSize: 16,
                            color: theme.placeholder,
                          }}
                        >
                          {t.select_payment_method}
                        </Text>
                      )}
                    </View>
                    <ChevronDown size={16} color={theme.iconMuted} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Rest of the code remains exactly the same */}
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
                  {t.whats_this_for}
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
                  placeholder={t.add_note_about_transaction}
                  placeholderTextColor={theme.placeholder}
                  multiline
                />
              </View>

              {/* Account Selection */}
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
                  {t.select_account}
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
                      onPress={() =>
                        setShowAccountDropdown(!showAccountDropdown)
                      }
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
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
                        <View>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "600",
                              color: theme.text,
                            }}
                          >
                            {selectedAccount?.name || t.select_account}
                          </Text>
                          {selectedAccount && (
                            <Text
                              style={{
                                fontSize: 14,
                                color: theme.textSecondary,
                              }}
                            >
                              {selectedAccount.account_type}{" "}
                              {/* Changed from group_name to account_type */}
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
                                  {account.account_type}
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

              {/* Date Selection */}
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
                  {t.when}
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
                    {t.repeatThis}
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
                      {t.howOften}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {["weekly", "monthly", "yearly"].map((freq) => {
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
                            onPress={() =>
                              setRecurringFrequency(freq as Frequency)
                            }
                          >
                            <Text
                              style={{
                                textAlign: "center",
                                fontWeight: "600",
                                color: isSelected
                                  ? theme.primaryText
                                  : theme.text,
                              }}
                            >
                              {freq === "weekly"
                                ? t.weekly
                                : freq === "monthly"
                                  ? t.monthly
                                  : freq === "yearly"
                                    ? t.yearly
                                    : freq.charAt(0).toUpperCase() +
                                      freq.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          {entryType === "Income" && (
            <>
              {/* Amount Input (Common for both) */}
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
                  {t.how_much}
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
                    onChangeText={(text) =>
                      setAmount(text.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="0.00"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
              </View>

              {/* Updated Category Section with Dropdown */}
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
                    onPress={() =>
                      setShowCategoryDropdown(!showCategoryDropdown)
                    }
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {selectedCategory ? (
                        <>
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              justifyContent: "center",
                              alignItems: "center",
                              backgroundColor: `${selectedCategory.color}20`,
                              marginRight: 16,
                            }}
                          >
                            <selectedCategory.icon
                              size={20}
                              color={selectedCategory.color}
                            />
                          </View>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "600",
                              color: theme.text,
                            }}
                          >
                            {selectedCategory.name}
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={{
                            fontSize: 16,
                            color: theme.placeholder,
                          }}
                        >
                          Select a category
                        </Text>
                      )}
                    </View>
                    <ChevronDown
                      size={16}
                      color={theme.iconMuted}
                      style={{
                        transform: [
                          { rotate: showCategoryDropdown ? "180deg" : "0deg" },
                        ],
                      }}
                    />
                  </TouchableOpacity>

                  {showCategoryDropdown && (
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
                        {categories.map((category) => {
                          const IconComponent = category.icon;
                          return (
                            <TouchableOpacity
                              key={category.id}
                              style={{
                                padding: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.border,
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor:
                                  selectedCategory?.id === category.id
                                    ? `${category.color}10`
                                    : undefined,
                              }}
                              onPress={() => {
                                setSelectedCategory(category);
                                setShowCategoryDropdown(false);
                              }}
                            >
                              <View
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 20,
                                  justifyContent: "center",
                                  alignItems: "center",
                                  backgroundColor: `${category.color}20`,
                                  marginRight: 16,
                                }}
                              >
                                <IconComponent
                                  size={20}
                                  color={category.color}
                                />
                              </View>
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: "600",
                                  color: theme.text,
                                }}
                              >
                                {category.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Account Selection */}
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
                  {t.select_account}
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
                      onPress={() =>
                        setShowAccountDropdown(!showAccountDropdown)
                      }
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
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
                              {selectedAccount.account_type}{" "}
                              {/* Changed from group_name to account_type */}
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
                                  {account.account_type}
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

              {/* Description Field - Required for Income */}
              <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    marginBottom: 16,
                    color: theme.text,
                    fontFamily: "Work Sans",
                  }}
                >
                  {t.whats_this_for}
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
                  placeholder={t.addNoteAboutIncome}
                  placeholderTextColor={theme.placeholder}
                  multiline
                />
              </View>

              {/* Date Selection */}
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
                  {t.when}
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
            </>
          )}

          {entryType === "Transfer" && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {/* Transfer Header */}
              <View style={{ marginBottom: 32 }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: theme.text,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  {t.transferMoney}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: theme.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {t.moveFundsBetweenAccounts}
                </Text>
              </View>

              {/* Amount Input Section */}
              <View
                style={{
                  backgroundColor: theme.cardBackground,
                  borderRadius: 16,
                  padding: 24,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.text,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  {t.howMuchDoYouWantToTransfer}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 40,
                      fontWeight: "300",
                      color: theme.primary,
                      marginRight: 8,
                    }}
                  >
                    $
                  </Text>
                  <TextInput
                    style={{
                      fontSize: 40,
                      fontWeight: "700",
                      color: theme.text,
                      textAlign: "center",
                      minWidth: 120,
                      borderBottomWidth: 2,
                      borderBottomColor: theme.primary,
                      paddingVertical: 8,
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.placeholder}
                    value={transferAmount}
                    onChangeText={setTransferAmount}
                    keyboardType="numeric"
                  />
                </View>

                {/* Quick Amount Buttons */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-around",
                    marginTop: 16,
                  }}
                >
                  {[50, 100, 200, 500].map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={{
                        backgroundColor: theme.inputBackground,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => setTransferAmount(amount.toString())}
                    >
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: "500",
                          fontSize: 14,
                        }}
                      >
                        ${amount}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Transfer Flow Visual */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                {/* From Account Card */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: fromAccount
                      ? theme.primary + "10"
                      : theme.cardBackground,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: fromAccount ? theme.primary : theme.border,
                    marginRight: 12,
                  }}
                  onPress={() => {
                    setShowAccountSelectionModal(true);
                    setAccountSelectionType("from");
                  }}
                >
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "600",
                        color: theme.textSecondary,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {t.from}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: fromAccount
                            ? theme.primary
                            : theme.iconMuted,
                          borderRadius: 20,
                          padding: 8,
                          marginRight: 8,
                        }}
                      >
                        <Wallet size={16} color="white" />
                      </View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                          textAlign: "center",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {fromAccount ? fromAccount.name : t.select_account}
                      </Text>
                    </View>

                    {fromAccount && (
                      <View style={{ alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: theme.primary,
                          }}
                        >
                          ${fromAccount.amount.toFixed(2)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.textSecondary,
                          }}
                        >
                          {t.available}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Arrow */}
                <View
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 25,
                    padding: 12,
                    marginHorizontal: 4,
                  }}
                >
                  <ArrowRight size={20} color="white" />
                </View>

                {/* To Account Card */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: toAccount
                      ? theme.success + "10"
                      : theme.cardBackground,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: toAccount ? theme.success : theme.border,
                    marginLeft: 12,
                  }}
                  onPress={() => {
                    setShowAccountSelectionModal(true);
                    setAccountSelectionType("to");
                  }}
                >
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "600",
                        color: theme.textSecondary,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {t.to}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: toAccount
                            ? theme.success
                            : theme.iconMuted,
                          borderRadius: 20,
                          padding: 8,
                          marginRight: 8,
                        }}
                      >
                        <Wallet size={16} color="white" />
                      </View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                          textAlign: "center",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {toAccount ? toAccount.name : t.select_account}
                      </Text>
                    </View>

                    {toAccount && (
                      <View style={{ alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: theme.success,
                          }}
                        >
                          ${toAccount.amount.toFixed(2)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.textSecondary,
                          }}
                        >
                          {t.current}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Swap Accounts Button */}
              {fromAccount && toAccount && (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.inputBackground,
                    borderRadius: 25,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    marginBottom: 24,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  onPress={() => {
                    const temp = fromAccount;
                    setFromAccount(toAccount);
                    setToAccount(temp);
                  }}
                >
                  <ArrowUpDown size={16} color={theme.primary} />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: theme.primary,
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    {t.swapAccounts}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Transfer Preview */}
              {fromAccount &&
                toAccount &&
                transferAmount &&
                Number.parseFloat(transferAmount) > 0 && (
                  <View
                    style={{
                      backgroundColor: theme.cardBackground,
                      borderRadius: 12,
                      padding: 20,
                      marginBottom: 24,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: theme.text,
                        marginBottom: 16,
                        textAlign: "center",
                      }}
                    >
                      {t.transferPreview}
                    </Text>

                    <View style={{ marginBottom: 12 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ color: theme.textSecondary }}>
                          {t.from}
                        </Text>
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "500",
                          }}
                        >
                          {fromAccount.name}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ color: theme.textSecondary }}>
                          {t.to}
                        </Text>
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "500",
                          }}
                        >
                          {toAccount.name}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ color: theme.textSecondary }}>
                          {t.amount}
                        </Text>
                        <Text
                          style={{
                            color: theme.primary,
                            fontWeight: "700",
                            fontSize: 16,
                          }}
                        >
                          ${Number.parseFloat(transferAmount).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: theme.border,
                        paddingTop: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{ color: theme.textSecondary, fontSize: 12 }}
                        >
                          {t.newBalance} {fromAccount.name}
                        </Text>
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "500",
                            fontSize: 12,
                          }}
                        >
                          $
                          {(
                            fromAccount.amount -
                            Number.parseFloat(transferAmount)
                          ).toFixed(2)}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{ color: theme.textSecondary, fontSize: 12 }}
                        >
                          {t.newBalance} {toAccount.name}
                        </Text>
                        <Text
                          style={{
                            color: theme.success,
                            fontWeight: "500",
                            fontSize: 12,
                          }}
                        >
                          $
                          {(
                            toAccount.amount + Number.parseFloat(transferAmount)
                          ).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

              {/* Transfer Button */}
              <TouchableOpacity
                style={{
                  backgroundColor:
                    fromAccount &&
                    toAccount &&
                    transferAmount &&
                    Number.parseFloat(transferAmount) > 0 &&
                    Number.parseFloat(transferAmount) <= fromAccount.amount
                      ? theme.primary
                      : theme.border,
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                onPress={handleTransfer}
                disabled={
                  !fromAccount ||
                  !toAccount ||
                  !transferAmount ||
                  Number.parseFloat(transferAmount) <= 0 ||
                  Number.parseFloat(transferAmount) > fromAccount.amount ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ActivityIndicator color="white" size="small" />
                    <Text
                      style={{
                        color: "white",
                        fontSize: 10,
                        fontWeight: "600",
                        marginLeft: 12,
                      }}
                    >
                      {t.processingTransfer}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ArrowRight size={20} color="white" />
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "600",
                        marginLeft: 8,
                      }}
                    >
                      {t.completeTransfer}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Transfer Info */}
              {transferAmount &&
                Number.parseFloat(transferAmount) > 0 &&
                fromAccount && (
                  <View style={{ marginTop: 16, alignItems: "center" }}>
                    {Number.parseFloat(transferAmount) > fromAccount.amount ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: theme.error + "20",
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 20,
                        }}
                      >
                        <X size={16} color={theme.error} />
                        <Text
                          style={{
                            color: theme.error,
                            fontSize: 12,
                            marginLeft: 6,
                            fontWeight: "500",
                          }}
                        >
                          {t.insufficientFunds}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: theme.success + "20",
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 20,
                        }}
                      >
                        <Check size={16} color={theme.success} />
                        <Text
                          style={{
                            color: theme.success,
                            fontSize: 12,
                            marginLeft: 6,
                            fontWeight: "500",
                          }}
                        >
                          {t.transferReady}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
            </View>
          )}

          {/* Category Selection Modal */}
          <Modal
            visible={showCategoryDropdown}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowCategoryDropdown(false)}
          >
            <View className="flex-1 justify-center items-center bg-black/50 p-4">
              <View className="bg-white rounded-2xl p-6 w-full max-w-md">
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="font-bold text-xl text-gray-900">
                    {t.selectCategory}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCategoryDropdown(false)}
                  >
                    <X size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView className="max-h-[400px]">
                  <View className="flex-row flex-wrap justify-between">
                    {categories.map((category) => {
                      const IconComponent = category.icon;
                      return (
                        <TouchableOpacity
                          key={category.id}
                          className={`w-1/3 p-4 items-center ${selectedCategory?.id === category.id ? "bg-blue-50 rounded-lg" : ""}`}
                          onPress={() => {
                            setSelectedCategory(category);
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <View
                            className="p-3 rounded-full mb-2"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            <IconComponent size={24} color={category.color} />
                          </View>
                          <Text className="text-xs text-gray-700 text-center">
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
          {/* Payment Method Selection Modal */}
          <Modal
            visible={showPaymentMethodModal}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowPaymentMethodModal(false)}
          >
            <View className="flex-1 justify-center items-center bg-black/50 p-4">
              <View className="bg-white rounded-2xl p-6 w-full max-w-md">
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="font-bold text-xl text-gray-900">
                    {t.selectPaymentMethod}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPaymentMethodModal(false)}
                  >
                    <X size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView className="max-h-[400px]">
                  <View className="flex-row flex-wrap justify-between">
                    {paymentMethods.map((method) => {
                      const IconComponent = method.icon;
                      return (
                        <TouchableOpacity
                          key={method.id}
                          className={`w-1/3 p-4 items-center ${paymentMethod === method.id ? "bg-blue-50 rounded-lg" : ""}`}
                          onPress={() => {
                            setPaymentMethod(method.id as PaymentMethod);
                            setShowPaymentMethodModal(false);
                          }}
                        >
                          <View
                            className="p-3 rounded-full mb-2"
                            style={{ backgroundColor: `${method.color}20` }}
                          >
                            <IconComponent size={24} color={method.color} />
                          </View>
                          <Text className="text-xs text-gray-700 text-center">
                            {method.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Account Selection Modal for Transfers */}
          <Modal
            visible={showAccountSelectionModal}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowAccountSelectionModal(false)}
          >
            <View className="flex-1 justify-center items-center bg-black/50 p-4">
              <View className="bg-white rounded-2xl p-6 w-full max-w-md">
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="font-bold text-xl text-gray-900">
                    {t.select} {accountSelectionType === "from" ? t.from : t.to}{" "}
                    {t.account}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAccountSelectionModal(false)}
                  >
                    <X size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView className="max-h-[400px]">
                  <View className="space-y-3">
                    {accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        className={`p-4 rounded-lg border ${
                          (accountSelectionType === "from" &&
                            fromAccount?.id === account.id) ||
                          (accountSelectionType === "to" &&
                            toAccount?.id === account.id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200"
                        }`}
                        onPress={() => {
                          if (accountSelectionType === "from") {
                            setFromAccount(account);
                          } else {
                            setToAccount(account);
                          }
                          setShowAccountSelectionModal(false);
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <View className="p-2 rounded-full bg-gray-100 mr-3">
                              <Wallet size={20} color="#3B82F6" />
                            </View>
                            <View>
                              <Text className="text-lg font-medium text-gray-900">
                                {account.name}
                              </Text>
                              <Text className="text-sm text-gray-500">
                                {account.account_type}{" "}
                                {/* Changed from group_name to account_type */}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-lg font-semibold text-gray-900">
                            ${account.amount.toFixed(2)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
