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

import { supabase } from "~/lib";

import { NAV_THEME, useTheme } from "~/lib";

import { fetchAccounts, updateAccountBalance } from "~/lib";

import {
  updateTransaction,
  getTransactionById,
  fetchAllTransactionsAndTransfers,
} from "~/lib";

import { updateTransfer, getTransferById } from "~/lib";
import type { Account, Transaction } from "~/lib";

import { notificationService } from "~/lib";

import { useLanguage } from "~/lib";

import { useLocalSearchParams, useRouter } from "expo-router";

type Category = {
  id: string;

  name: string;

  icon: React.ComponentType<{ size: number; color: string }>;

  color: string;
};

const EditTransactionScreen = () => {
  const router = useRouter();

  const { id } = useLocalSearchParams();

  const theme = useTheme();

  const { t } = useLanguage();

  // States

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [transaction, setTransaction] = useState<Transaction | null>(null);

  const [isEditingTransfer, setIsEditingTransfer] = useState(false);
  const [entryType, setEntryType] = useState<"Income" | "Expense" | "Transfer">(
    "Expense"
  );

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

  const [showMoreCategories, setShowMoreCategories] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const [showRegularAccountModal, setShowRegularAccountModal] = useState(false);

  // Transfer-specific state

  const [fromAccount, setFromAccount] = useState<Account | null>(null);

  const [toAccount, setToAccount] = useState<Account | null>(null);

  const [transferAmount, setTransferAmount] = useState("");

  const [showAccountSelectionModal, setShowAccountSelectionModal] =
    useState(false);

  const [accountSelectionType, setAccountSelectionType] = useState<
    "from" | "to"
  >("from");

  type Frequency = "daily" | "weekly" | "monthly" | "yearly";

  // Create dynamic tabs with translations

  const ENTRY_TABS = [
    { id: "Income", label: t.income },

    { id: "Expense", label: t.expense },

    { id: "Transfer", label: t.transfer },
  ];

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

  // Load transaction/transfer data
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert("Error", "Please log in first");
          router.back();
          return;
        }

        // Fetch all transactions and transfers to find the one we're editing
        const allTransactions = await fetchAllTransactionsAndTransfers(user.id);
        const targetTransaction = allTransactions.find((t) => t.id === id);

        if (!targetTransaction) {
          Alert.alert("Error", "Transaction/Transfer not found");
          router.back();
          return;
        }

        // Check if this is a transfer
        if (targetTransaction.isTransfer) {
          // Extract the original transfer ID from the composite ID
          const transferId = targetTransaction.transferId || (id as string);

          // Load the actual transfer data
          const transferData = await getTransferById(transferId);
          if (!transferData) {
            Alert.alert("Error", "Transfer not found");
            router.back();
            return;
          }

          // Handle transfer data
          setIsEditingTransfer(true);
          setEntryType("Transfer");
          setTransferAmount(transferData.amount.toString());
          setDescription(transferData.description || "");
          setDate(new Date(transferData.date));

          // Load accounts and set from/to accounts
          await loadAccounts();

          // Set from and to accounts after accounts are loaded
          const accountsData = await fetchAccounts(user.id);
          const fromAcc = accountsData.find(
            (acc) => acc.id === transferData.from_account_id
          );
          const toAcc = accountsData.find(
            (acc) => acc.id === transferData.to_account_id
          );
          if (fromAcc) setFromAccount(fromAcc);
          if (toAcc) setToAccount(toAcc);
        } else {
          // Handle regular transaction
          setTransaction(targetTransaction);

          // Set form data based on transaction
          setAmount(targetTransaction.amount.toString());
          setDescription(targetTransaction.description || "");
          setDate(new Date(targetTransaction.date));
          setIsRecurring(targetTransaction.is_recurring);
          setRecurringFrequency(
            (targetTransaction.recurrence_interval as Frequency) || "monthly"
          );

          // Set transaction type and disable tab switching for better UX
          if (targetTransaction.type === "income") {
            setEntryType("Income");
          } else if (targetTransaction.type === "expense") {
            setEntryType("Expense");
          } else if (targetTransaction.type === "transfer") {
            setEntryType("Transfer");
            setTransferAmount(targetTransaction.amount.toString());
          }

          // Set category if exists
          if (targetTransaction.category) {
            const allCategories = [...expenseCategories, ...incomeCategories];
            const category = allCategories.find(
              (cat) => cat.name === targetTransaction.category
            );
            if (category) {
              setSelectedCategory(category);
            }
          }

          // Load accounts
          await loadAccounts(targetTransaction.account_id);
        }
      } catch (error) {
        console.error("Error loading transaction/transfer:", error);
        Alert.alert("Error", "Failed to load transaction/transfer");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const loadAccounts = async (currentAccountId?: string) => {
    setLoadingAccounts(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const accountsData = await fetchAccounts(user.id);

      setAccounts(accountsData);

      // Set selected account

      if (currentAccountId) {
        const account = accountsData.find((acc) => acc.id === currentAccountId);

        if (account) {
          setSelectedAccount(account);
        } else if (accountsData.length > 0) {
          setSelectedAccount(accountsData[0]);
        }
      } else if (accountsData.length > 0) {
        setSelectedAccount(accountsData[0]);
      }
    } catch (error) {
      console.error("Error loading accounts:", error);

      Alert.alert(t.error, t.failedToLoadAccounts);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleEntryTypeChange = (type: "Income" | "Expense" | "Transfer") => {
    setEntryType(type);

    setSelectedCategory(null);
  };

  const handleSave = async () => {
    // Basic validation for transfers
    if (entryType === "Transfer") {
      if (!fromAccount || !toAccount) {
        Alert.alert(t.selectAccounts, t.pleaseSelectBothAccountsForTransfer);
        return;
      }

      if (fromAccount.id === toAccount.id) {
        Alert.alert(t.invalidTransfer, t.fromAndToAccountsMustBeDifferent);
        return;
      }

      if (!transferAmount || Number.parseFloat(transferAmount) <= 0) {
        Alert.alert(t.missingInfo, t.pleaseEnterTransferAmount);
        return;
      }

      if (Number.parseFloat(transferAmount) > fromAccount.amount) {
        Alert.alert(t.insufficientFunds, t.amountExceedsAvailableBalance);
        return;
      }
    } else {
      // Basic validation for regular transactions
      if (!transaction) return;

      if (!amount || !description.trim()) {
        Alert.alert(t.missingInfo, t.pleaseFillRequiredFields);
        return;
      }

      if (!selectedAccount) {
        Alert.alert(t.selectAccount, t.pleaseSelectAccount);
        return;
      }

      // Type-specific validation
      if (
        entryType === "Income" &&
        (!selectedCategory || !selectedCategory.name)
      ) {
        Alert.alert(t.chooseCategory, t.pleaseSelectCategoryForIncome);
        return;
      }

      if (
        entryType === "Expense" &&
        (!selectedCategory || !selectedCategory.name)
      ) {
        Alert.alert(t.chooseCategory, t.pleaseSelectCategoryForExpense);
        return;
      }
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Please log in first");

      if (entryType === "Transfer") {
        // Handle transfer update
        const amountNum = Number.parseFloat(transferAmount);

        if (isEditingTransfer) {
          // Get the original transfer ID from the composite ID
          // The ID format is "uuid-from" or "uuid-to", so we need to get everything before the last dash
          const idString = id as string;
          const lastDashIndex = idString.lastIndexOf("-");
          const originalTransferId =
            lastDashIndex > 0 ? idString.substring(0, lastDashIndex) : idString;

          // Update existing transfer
          await updateTransfer(originalTransferId, {
            amount: amountNum,
            description: description.trim(),
            date: date.toISOString().split("T")[0],
            from_account_id: fromAccount!.id,
            to_account_id: toAccount!.id,
          });
        } else {
          // This shouldn't happen in edit mode, but handle it just in case
          Alert.alert("Error", "Transfer not found for editing");
          return;
        }

        // Update account balances for transfer
        if (fromAccount && toAccount) {
          const fromAccountNewBalance = fromAccount.amount - amountNum;
          await updateAccountBalance(fromAccount.id, fromAccountNewBalance);

          const toAccountNewBalance = toAccount.amount + amountNum;
          await updateAccountBalance(toAccount.id, toAccountNewBalance);
        }
      } else {
        // Handle regular transaction update
        if (!transaction) {
          Alert.alert("Error", "Transaction not found");
          return;
        }

        const amountNum = Number.parseFloat(amount);

        await updateTransaction(transaction.id, {
          amount: amountNum,
          description: description.trim(),
          date: date.toISOString().split("T")[0],
          category: selectedCategory?.name || "",
          is_recurring: isRecurring,
          recurrence_interval: isRecurring ? recurringFrequency : undefined,
          type: entryType === "Income" ? "income" : "expense",
          account_id: selectedAccount!.id,
        });

        // Update account balance for regular transactions
        if (selectedAccount!.id !== transaction.account_id) {
          // Revert old account balance
          const oldAccount = accounts.find(
            (acc) => acc.id === transaction.account_id
          );

          if (oldAccount) {
            const oldBalance =
              transaction.type === "income"
                ? oldAccount.amount - transaction.amount
                : oldAccount.amount + transaction.amount;

            await updateAccountBalance(transaction.account_id, oldBalance);
          }

          // Update new account balance
          const newBalance =
            entryType === "Expense"
              ? selectedAccount!.amount - amountNum
              : selectedAccount!.amount + amountNum;

          await updateAccountBalance(selectedAccount!.id, newBalance);
        } else {
          // Same account, just update the difference
          const balanceDiff = amountNum - transaction.amount;

          const newBalance =
            transaction.type === "income"
              ? selectedAccount!.amount + balanceDiff
              : selectedAccount!.amount - balanceDiff;

          await updateAccountBalance(selectedAccount!.id, newBalance);
        }
      }

      Alert.alert(
        "Success!",
        `Your ${entryType.toLowerCase()} has been updated!`,
        [{ text: "Ok", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error(error);
      Alert.alert(t.error, t.somethingWentWrongPleaseTryAgain);
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

  const isFormValid = useCallback(() => {
    if (!description.trim() || saving) {
      return false;
    }

    switch (entryType) {
      case "Income":
        return !!(amount && selectedAccount && selectedCategory);
      case "Expense":
        return !!(amount && selectedAccount && selectedCategory);
      case "Transfer":
        return !!(
          transferAmount &&
          fromAccount &&
          toAccount &&
          fromAccount.id !== toAccount.id
        );
      default:
        return false;
    }
  }, [
    amount,

    transferAmount,
    description,

    selectedAccount,

    saving,

    entryType,

    selectedCategory,

    fromAccount,

    toAccount,
  ]);

  const categories =
    entryType === "Expense"
      ? expenseCategories
      : entryType === "Income"
        ? incomeCategories
        : [];

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.primary} />

          <Text style={{ marginTop: 16, color: theme.text }}>
            Loading transaction...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
            {t.edit_transaction}
          </Text>

          {/* Hide save button for transfers - use Complete Transfer button instead */}
          {entryType !== "Transfer" && (
            <TouchableOpacity
              style={{
                paddingVertical: 8,

                paddingHorizontal: 16,

                borderRadius: 8,

                backgroundColor: isFormValid()
                  ? theme.primary
                  : theme.stepInactive,
              }}
              onPress={handleSave}
              disabled={!isFormValid()}
            >
              <Text
                style={{
                  fontWeight: "600",

                  color: isFormValid() ? theme.primaryText : theme.textMuted,
                }}
              >
                {saving ? t.saving : t.save}
              </Text>
            </TouchableOpacity>
          )}
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

                  opacity: entryType === tab.id ? 1 : 0.6,
                }}
                onPress={() =>
                  handleEntryTypeChange(
                    tab.id as "Income" | "Expense" | "Transfer"
                  )
                }
                disabled={entryType !== tab.id} // Disable switching tabs when editing
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

          {/* Amount Input - Hide for Transfer type */}
          {entryType !== "Transfer" && (
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
                />
              </View>
            </View>
          )}

          {/* Transfer UI - Only show for Transfer type */}

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

              {/* Transfer Amount Input Section */}

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

                      fontSize: 10,
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

          {/* Complete Transfer Button - Only for Transfer type */}
          {entryType === "Transfer" && (
            <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
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
                onPress={handleSave}
                disabled={
                  !fromAccount ||
                  !toAccount ||
                  !transferAmount ||
                  Number.parseFloat(transferAmount) <= 0 ||
                  Number.parseFloat(transferAmount) > fromAccount.amount ||
                  saving
                }
              >
                {saving ? (
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
                      {t.saving}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ArrowRight size={20} color="white" />
                    <Text
                      style={{
                        color: "white",
                        fontSize: 10,
                        fontWeight: "500",
                        marginLeft: 8,
                      }}
                    >
                      {t.completeTransfer}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Category Selection - For Income and Expenses only */}
          {(entryType === "Income" || entryType === "Expense") && (
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

          {/* Description Field - Hide for Transfer type */}
          {entryType !== "Transfer" && (
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
          )}

          {/* Account Selection - For Income and Expenses only */}
          {(entryType === "Income" || entryType === "Expense") && (
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
                    onPress={() => setShowRegularAccountModal(true)}
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
                            {selectedAccount.amount.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>

                    <ChevronDown size={16} color={theme.iconMuted} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Date Selection - Hide for Transfer type */}
          {entryType !== "Transfer" && (
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
          )}

          {/* Recurring Settings - For Income and Expenses only */}
          {(entryType === "Income" || entryType === "Expense") && (
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

          {/* Account Selection Modal */}

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
                    {t.selectAccount}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setShowAccountSelectionModal(false)}
                  >
                    <X size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView className="max-h-[400px]">
                  <View className="flex-row flex-wrap justify-between">
                    {accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        className={`w-1/2 p-4 items-center ${
                          accountSelectionType === "from"
                            ? selectedAccount?.id === account.id
                              ? "bg-blue-50 rounded-lg"
                              : ""
                            : accountSelectionType === "to"
                              ? toAccount?.id === account.id
                                ? "bg-green-50 rounded-lg"
                                : ""
                              : ""
                        }`}
                        onPress={() => {
                          if (accountSelectionType === "from") {
                            setFromAccount(account);
                          } else if (accountSelectionType === "to") {
                            setToAccount(account);
                          }

                          setShowAccountSelectionModal(false);
                        }}
                      >
                        <View
                          className="p-3 rounded-full mb-2"
                          style={{ backgroundColor: `${theme.primary}20` }}
                        >
                          <Wallet size={24} color={theme.primary} />
                        </View>

                        <Text className="text-xs text-gray-700 text-center">
                          {account.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Regular Account Selection Modal */}

          <Modal
            visible={showRegularAccountModal}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowRegularAccountModal(false)}
          >
            <View className="flex-1 justify-center items-center bg-black/50 p-4">
              <View className="bg-white rounded-2xl p-6 w-full max-w-md">
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="font-bold text-xl text-gray-900">
                    {t.selectAccount}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setShowRegularAccountModal(false)}
                  >
                    <X size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView className="max-h-[400px]">
                  <View className="flex-row flex-wrap justify-between">
                    {accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        className={`w-1/2 p-4 items-center ${
                          selectedAccount?.id === account.id
                            ? "bg-blue-50 rounded-lg"
                            : ""
                        }`}
                        onPress={() => {
                          setSelectedAccount(account);

                          setShowRegularAccountModal(false);
                        }}
                      >
                        <View
                          className="p-3 rounded-full mb-2"
                          style={{ backgroundColor: `${theme.primary}20` }}
                        >
                          <Wallet size={24} color={theme.primary} />
                        </View>

                        <Text className="text-xs text-gray-700 text-center">
                          {account.name}
                        </Text>
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
};

export default EditTransactionScreen;
