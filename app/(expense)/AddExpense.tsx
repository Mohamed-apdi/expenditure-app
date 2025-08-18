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
import TransferScreen from "../components/TransferScreen";

const ENTRY_TABS = [
  { id: "Income", label: "Income" },
  { id: "Expense", label: "Expense" },
  { id: "Transfer", label: "Transfer" },
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
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  
  // Transfer-specific state
  const [fromAccount, setFromAccount] = useState<Account | null>(null);
  const [toAccount, setToAccount] = useState<Account | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [showAccountSelectionModal, setShowAccountSelectionModal] = useState(false);
  const [accountSelectionType, setAccountSelectionType] = useState<'from' | 'to'>('from');

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
    // Basic validation
    if (!amount || !description.trim()) {
      Alert.alert("Missing Info", "Please fill in the amount and description");
      return;
    }

    if (!selectedAccount) {
      Alert.alert("Select Account", "Please select an account");
      return;
    }

    // Type-specific validation
    if (entryType === "Income" && !selectedCategory) {
      Alert.alert("Choose Category", "Please select a category for income");
      return;
    }

    if (entryType === "Expense") {
      if (!selectedCategory) {
        Alert.alert("Choose Category", "Please select a category for expense");
        return;
      }
      if (!paymentMethod) {
        Alert.alert("Payment Method", "Please select a payment method for expense");
        return;
      }
    }

    if (entryType === "Transfer") {
      if (!fromAccount || !toAccount) {
        Alert.alert("Select Accounts", "Please select both from and to accounts for transfer");
        return;
      }
      if (fromAccount.id === toAccount.id) {
        Alert.alert("Invalid Transfer", "From and to accounts must be different");
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
            "Insufficient Funds",
            `Your ${selectedAccount.name} account doesn't have enough balance for this expense.`
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Add expense using the service
      await addExpense({
        user_id: user.id,
        entry_type: entryType as 'Income' | 'Expense',
        amount: amountNum,
        category: selectedCategory?.name || '',
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
        category: selectedCategory?.name || '',
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurringFrequency : undefined,
        type: entryType === 'Income' ? 'income' : 'expense',
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
          const billingCycle = recurringFrequency === "weekly" ? "weekly" : 
                              recurringFrequency === "yearly" ? "yearly" : "monthly";

          // Create subscription
          await addSubscription({
            user_id: user.id,
            account_id: selectedAccount.id,
            name: description.trim() || selectedCategory.name,
            amount: amountNum,
            category: selectedCategory.name,
            billing_cycle: billingCycle,
            next_payment_date: nextPaymentDate.toISOString().split('T')[0],
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
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || Number.parseFloat(transferAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid transfer amount");
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
      Alert.alert("Insufficient Funds", "Insufficient balance in the from account");
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
        category: 'Transfer',
        is_recurring: false,
        type: 'expense', // This will increase expenses for Account 1
      });

      // Add INCOME transaction for the TO account (incoming transfer)
      await addTransaction({
        user_id: user.id,
        account_id: toAccount.id,
        amount: amountNum,
        description: `Transfer from ${fromAccount.name}`,
        date: date.toISOString().split("T")[0],
        category: 'Transfer',
        is_recurring: false,
        type: 'income', // This will increase income for Account 2
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
  }, [amount, description, selectedAccount, isSubmitting, entryType, selectedCategory, paymentMethod, fromAccount, toAccount]);

  const categories = entryType === "Expense" ? expenseCategories : 
                    entryType === "Income" ? incomeCategories : 
                    []; // Transfers don't need categories

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
              backgroundColor: isFormValid() ? theme.primary : theme.stepInactive,
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

            {/* Updated Category Section with Dropdown - Only for Income and Expenses */}
            {(entryType === "Expense") && (
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
                    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                            <selectedCategory.icon size={20} color={selectedCategory.color} />
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
                                <IconComponent size={20} color={category.color} />
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

            {(entryType === "Income") && (
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
                    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                            <selectedCategory.icon size={20} color={selectedCategory.color} />
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
                                <IconComponent size={20} color={category.color} />
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
                  Payment Method
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
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {paymentMethod ? (
                      <>
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: `${paymentMethods.find(m => m.id === paymentMethod)?.color}20`,
                            marginRight: 16,
                          }}
                        >
                          {React.createElement(paymentMethods.find(m => m.id === paymentMethod)?.icon, {
                            size: 20,
                            color: paymentMethods.find(m => m.id === paymentMethod)?.color
                          })}
                        </View>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.text,
                          }}
                        >
                          {paymentMethods.find(m => m.id === paymentMethod)?.name}
                        </Text>
                      </>
                    ) : (
                      <Text
                        style={{
                          fontSize: 16,
                          color: theme.placeholder,
                        }}
                      >
                        Select payment method
                      </Text>
                    )}
                  </View>
                  <ChevronDown
                    size={16}
                    color={theme.iconMuted}
                  />
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
                            {selectedAccount.account_type} {/* Changed from group_name to account_type */}
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
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                          <selectedCategory.icon size={20} color={selectedCategory.color} />
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
                              <IconComponent size={20} color={category.color} />
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
                            {selectedAccount.account_type} {/* Changed from group_name to account_type */}
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
                placeholder="Add a note about this income..."
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

            </>
          )}

          {entryType === "Transfer" && (
            <View className="space-y-4">
              {/* Transfer Amount */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Transfer Amount
                </Text>
                <TextInput
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
                  placeholder="0.00"
                  value={transferAmount}
                  onChangeText={setTransferAmount}
                  keyboardType="numeric"
                  style={{ color: theme.text }}
                />
              </View>

              {/* From Account */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  From Account
                </Text>
                <TouchableOpacity
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg flex-row justify-between items-center"
                  onPress={() => {
                    // Show account selection modal for from account
                    setShowAccountSelectionModal(true);
                    setAccountSelectionType('from');
                  }}
                >
                  <Text className="text-lg" style={{ color: theme.text }}>
                    {fromAccount ? fromAccount.name : "Select Account"}
                  </Text>
                  <ChevronDown size={20} color={theme.iconMuted} />
                </TouchableOpacity>
                {fromAccount && (
                  <Text className="text-sm text-gray-500 mt-1">
                    Balance: ${fromAccount.amount.toFixed(2)}
                  </Text>
                )}
              </View>

              {/* To Account */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  To Account
                </Text>
                <TouchableOpacity
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg flex-row justify-between items-center"
                  onPress={() => {
                    // Show account selection modal for to account
                    setShowAccountSelectionModal(true);
                    setAccountSelectionType('to');
                  }}
                >
                  <Text className="text-lg" style={{ color: theme.text }}>
                    {toAccount ? toAccount.name : "Select Account"}
                  </Text>
                  <ChevronDown size={20} color={theme.iconMuted} />
                </TouchableOpacity>
                {toAccount && (
                  <Text className="text-sm text-gray-500 mt-1">
                    Balance: ${toAccount.amount.toFixed(2)}
                  </Text>
                )}
              </View>

              {/* Transfer Button */}
              <TouchableOpacity
                className={`w-full py-4 rounded-lg ${
                  fromAccount && toAccount && transferAmount && Number.parseFloat(transferAmount) > 0
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
                }`}
                onPress={handleTransfer}
                disabled={!fromAccount || !toAccount || !transferAmount || Number.parseFloat(transferAmount) <= 0 || isSubmitting}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {isSubmitting ? "Processing..." : "Transfer"}
                </Text>
              </TouchableOpacity>
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
                  <Text className="font-bold text-xl text-gray-900">Select Category</Text>
                  <TouchableOpacity onPress={() => setShowCategoryDropdown(false)}>
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
                          className={`w-1/3 p-4 items-center ${selectedCategory?.id === category.id ? 'bg-blue-50 rounded-lg' : ''}`}
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
                  <Text className="font-bold text-xl text-gray-900">Select Payment Method</Text>
                  <TouchableOpacity onPress={() => setShowPaymentMethodModal(false)}>
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
                          className={`w-1/3 p-4 items-center ${paymentMethod === method.id ? 'bg-blue-50 rounded-lg' : ''}`}
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
                    Select {accountSelectionType === 'from' ? 'From' : 'To'} Account
                  </Text>
                  <TouchableOpacity onPress={() => setShowAccountSelectionModal(false)}>
                    <X size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView className="max-h-[400px]">
                  <View className="space-y-3">
                    {accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        className={`p-4 rounded-lg border ${
                          (accountSelectionType === 'from' && fromAccount?.id === account.id) ||
                          (accountSelectionType === 'to' && toAccount?.id === account.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                        onPress={() => {
                          if (accountSelectionType === 'from') {
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
                                {account.account_type} {/* Changed from group_name to account_type */}
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