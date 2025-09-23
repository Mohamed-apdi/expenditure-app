import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  X,
  Utensils,
  Home,
  Bus,
  Zap,
  Film,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Smile,
  CreditCard,
  Gift,
  HandHeart,
  Luggage,
  Baby,
  Dumbbell,
  Smartphone,
  Sofa,
  Wrench,
  Receipt,
  DollarSign,
  Clock,
  Briefcase,
  Award,
  Laptop,
  User,
} from "lucide-react-native";
import { supabase } from "~/lib";
import { useTheme } from "~/lib";
import { updateAccountBalance, fetchAccounts, useAccount } from "~/lib";
import { addExpense } from "~/lib";
import { addTransaction } from "~/lib";
import { addTransfer } from "~/lib";
import { addSubscription } from "~/lib";
import type { Account } from "~/lib";
import { useLanguage } from "~/lib";
import { useQueryClient } from "@tanstack/react-query";
import ExpenseForm from "./components/ExpenseForm";
import IncomeForm from "./components/IncomeForm";
import TransferForm from "./components/TransferForm";
import CategoryModal from "./components/CategoryModal";
import AccountSelectionModal from "./components/AccountSelectionModal";

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

export default function AddExpenseScreen() {
  const router = useRouter();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { refreshBalances } = useAccount();

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  // States
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

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

  // Get user ID and accounts
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Create dynamic tabs with translations
  const ENTRY_TABS = [
    { id: "Income", label: t.income },
    { id: "Expense", label: t.expense },
    { id: "Transfer", label: t.transfer },
  ];
  type Frequency = "daily" | "weekly" | "monthly" | "yearly";

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
    { id: "debt", name: t.loans, icon: CreditCard, color: "#f97316" },
    { id: "gifts", name: t.gifts, icon: Gift, color: "#8b5cf6" },
    { id: "charity", name: t.donations, icon: HandHeart, color: "#ef4444" },
    { id: "travel", name: t.vacation, icon: Luggage, color: "#3b82f6" },
    { id: "kids", name: t.children, icon: Baby, color: "#ec4899" },
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

  // Somalia-Relevant Income Categories
  const incomeCategories: Category[] = [
    { id: "salary", name: t.jobSalary, icon: DollarSign, color: "#059669" },
    { id: "bonus", name: t.bonus, icon: Zap, color: "#3b82f6" },
    { id: "part_time", name: t.partTimeWork, icon: Clock, color: "#f97316" },
    { id: "business", name: t.business, icon: Briefcase, color: "#8b5cf6" },
    { id: "rental", name: t.rentIncome, icon: Home, color: "#84cc16" },
    { id: "sales", name: t.sales, icon: ShoppingBag, color: "#64748b" },
    { id: "awards", name: t.awards, icon: Award, color: "#8b5cf6" },
    { id: "freelance", name: t.freelance, icon: Laptop, color: "#f97316" },
    { id: "gifts", name: t.giftsReceived, icon: Gift, color: "#8b5cf6" },
    { id: "pension", name: t.pension, icon: User, color: "#64748b" },
  ];

  // Get user ID and load accounts
  useEffect(() => {
    const loadData = async () => {
      setLoadingAccounts(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          const accountsData = await fetchAccounts(user.id);
          setAccounts(accountsData);
          if (accountsData.length > 0) {
            setSelectedAccount(accountsData[0]);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        Alert.alert(t.error, t.failedToLoadAccounts);
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadData();
  }, []);

  const handleEntryTypeChange = (type: "Income" | "Expense" | "Transfer") => {
    setEntryType(type);
    setSelectedCategory(null);
  };

  const handleSaveExpense = async () => {
    // Basic validation
    if (!amount) {
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

    if (entryType === "Expense") {
      if (!selectedCategory || !selectedCategory.name) {
        Alert.alert(t.chooseCategory, t.pleaseSelectCategoryForExpense);
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
        category: selectedCategory!.name, // We know this exists due to validation above
        description: description.trim() || "", // Make description optional
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
        description: description.trim() || "", // Make description optional
        date: date.toISOString().split("T")[0],
        category: selectedCategory?.name || "", // Transaction category is optional
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

      // Invalidate and refetch dashboard data to update UI
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });

      // Refresh account balances in the context
      await refreshBalances();

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

      // Budget notifications are handled by the background task system
      // No need to check immediately to avoid excessive notifications

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

      // Add transfer record only - no duplicate transactions
      await addTransfer({
        user_id: user.id,
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        amount: amountNum,
        description: `Transfer from ${fromAccount.name} to ${toAccount.name}`,
        date: date.toISOString().split("T")[0],
      });

      // Update account balances using the service
      const fromAccountNewBalance = fromAccount.amount - amountNum;
      const toAccountNewBalance = toAccount.amount + amountNum;

      await Promise.all([
        updateAccountBalance(fromAccount.id, fromAccountNewBalance),
        updateAccountBalance(toAccount.id, toAccountNewBalance),
      ]);

      // Invalidate and refetch dashboard data to update UI
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });

      // Refresh account balances in the context
      await refreshBalances();

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
    if (!amount || !selectedAccount || isSubmitting) {
      return false;
    }

    // Different validation based on transaction type
    switch (entryType) {
      case "Income":
        // Income needs: amount, category, account
        return !!selectedCategory;

      case "Expense":
        // Expense needs: amount, category, account
        return !!selectedCategory;

      case "Transfer":
        // Transfer needs: amount, from account, to account
        return !!fromAccount && !!toAccount && fromAccount.id !== toAccount.id;

      default:
        return false;
    }
  }, [
    amount,
    selectedAccount,
    isSubmitting,
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
        : []; // Transfers don't need categories

  const handleAccountSelection = (account: Account) => {
    if (accountSelectionType === "from") {
      setFromAccount(account);
    } else if (accountSelectionType === "to") {
      setToAccount(account);
    }
  };

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
            onPress={
              entryType === "Transfer" ? handleTransfer : handleSaveExpense
            }
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
                onPress={() =>
                  handleEntryTypeChange(
                    tab.id as "Income" | "Expense" | "Transfer"
                  )
                }
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
            <ExpenseForm
              amount={amount}
              setAmount={setAmount}
              description={description}
              setDescription={setDescription}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              date={date}
              setDate={setDate}
              showDatePicker={showDatePicker}
              setShowDatePicker={setShowDatePicker}
              isRecurring={isRecurring}
              setIsRecurring={setIsRecurring}
              recurringFrequency={recurringFrequency}
              setRecurringFrequency={setRecurringFrequency}
              selectedAccount={selectedAccount}
              setSelectedAccount={setSelectedAccount}
              accounts={accounts}
              loadingAccounts={loadingAccounts}
              showAccountDropdown={showAccountDropdown}
              setShowAccountDropdown={setShowAccountDropdown}
              showCategoryDropdown={showCategoryDropdown}
              setShowCategoryDropdown={setShowCategoryDropdown}
              onDateChange={onDateChange}
              formatDate={formatDate}
            />
          )}

          {entryType === "Income" && (
            <IncomeForm
              amount={amount}
              setAmount={setAmount}
              description={description}
              setDescription={setDescription}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              date={date}
              setDate={setDate}
              showDatePicker={showDatePicker}
              setShowDatePicker={setShowDatePicker}
              selectedAccount={selectedAccount}
              setSelectedAccount={setSelectedAccount}
              accounts={accounts}
              loadingAccounts={loadingAccounts}
              showAccountDropdown={showAccountDropdown}
              setShowAccountDropdown={setShowAccountDropdown}
              showCategoryDropdown={showCategoryDropdown}
              setShowCategoryDropdown={setShowCategoryDropdown}
              onDateChange={onDateChange}
              formatDate={formatDate}
            />
          )}

          {entryType === "Transfer" && (
            <TransferForm
              transferAmount={transferAmount}
              setTransferAmount={setTransferAmount}
              fromAccount={fromAccount}
              setFromAccount={setFromAccount}
              toAccount={toAccount}
              setToAccount={setToAccount}
              showAccountSelectionModal={showAccountSelectionModal}
              setShowAccountSelectionModal={setShowAccountSelectionModal}
              accountSelectionType={accountSelectionType}
              setAccountSelectionType={setAccountSelectionType}
              accounts={accounts}
              isSubmitting={isSubmitting}
              onTransfer={handleTransfer}
            />
          )}

          {/* Modals */}
          <CategoryModal
            visible={showCategoryDropdown}
            onClose={() => setShowCategoryDropdown(false)}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            title={t.selectCategory}
          />

          <AccountSelectionModal
            visible={showAccountSelectionModal}
            onClose={() => setShowAccountSelectionModal(false)}
            accounts={accounts}
            selectedAccount={
              accountSelectionType === "from" ? fromAccount : toAccount
            }
            onSelectAccount={handleAccountSelection}
            title={t.selectAccount}
            selectionType={accountSelectionType}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
