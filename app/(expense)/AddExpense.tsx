"use client";

import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { toast } from "sonner-native";
import {
  addExpense,
  addSubscription,
  addTransaction,
  addTransfer,
  createExpenseLocal,
  createSubscriptionLocal,
  createTransactionLocal,
  createTransferLocal,
  fetchAccounts,
  getCurrentUserOfflineFirst,
  isOfflineGateLocked,
  notificationService,
  supabase,
  triggerSync,
  updateAccountBalance,
  updateAccountLocal,
  useAccount,
  useLanguage,
  useScreenStatusBar,
  useTheme,
} from "~/lib";
import type { Account } from "~/lib";
import { notificationService } from "~/lib";
import { useLanguage } from "~/lib";
import { useAccount, useScreenStatusBar } from "~/lib";
import {
  playTabClickSound,
  preloadTabClickSound,
} from "~/lib/utils/playTabSound";

// Import the separated form components
import {
  getExpenseCategories,
  getIncomeCategories,
  type Category,
  type Frequency,
} from "~/lib/utils/categories";
import ExpenseForm from "./components/ExpenseForm";
import IncomeForm from "./components/IncomeForm";
import TransferForm from "./components/TransferForm";

export default function AddExpenseScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  useScreenStatusBar();

  // States
  const [entryType, setEntryType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [date, setDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] =
    useState<Frequency>("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { accounts } = useAccount();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Transfer-specific state
  const [fromAccount, setFromAccount] = useState<Account | null>(null);
  const [toAccount, setToAccount] = useState<Account | null>(null);
  const [transferAmount, setTransferAmount] = useState("");

  // Get categories based on entry type
  const expenseCategories = getExpenseCategories(t);
  const incomeCategories = getIncomeCategories(t);

  // Create dynamic tabs with translations
  const ENTRY_TABS = [
    { id: "Income", label: t.income },
    { id: "Expense", label: t.expense },
    { id: "Transfer", label: t.transfer },
  ];

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      const defaultAcc = accounts.find((a) => a.is_default) ?? accounts[0];
      setSelectedAccount(defaultAcc);
    }
  }, [accounts, selectedAccount]);

  const handleEntryTypeChange = (type: string) => {
    setEntryType(type);
    setSelectedCategory(null);
  };

  const handleSaveExpense = async () => {
    // Basic validation (note/description is optional)
    if (!amount) {
      toast.error(t.missingInfo || "Missing Information", {
        description:
          t.pleaseFillRequiredFields || "Please fill all required fields",
      });
      return;
    }

    if (!selectedAccount) {
      toast.error(t.selectAccount || "Select Account", {
        description: t.pleaseSelectAccount || "Please select an account",
      });
      return;
    }

    // Type-specific validation
    if (
      entryType === "Income" &&
      (!selectedCategory || !selectedCategory.name)
    ) {
      toast.error(t.chooseCategory || "Choose Category", {
        description:
          t.pleaseSelectCategoryForIncome ||
          "Please select a category for income",
      });
      return;
    }

    if (entryType === "Expense") {
      if (!selectedCategory || !selectedCategory.name) {
        toast.error(t.chooseCategory || "Choose Category", {
          description:
            t.pleaseSelectCategoryForExpense ||
            "Please select a category for expense",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) throw new Error("Please log in first");

      const amountNum = Number.parseFloat(amount);
      const dateStr = date.toISOString().split("T")[0];

      // Create local expense row (offline-first; sync engine will push to Supabase)
      createExpenseLocal({
        user_id: user.id,
        entry_type: entryType as "Income" | "Expense",
        amount: amountNum,
        category: selectedCategory!.name,
        description: description.trim() || undefined,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurringFrequency : undefined,
        date: dateStr,
        account_id: selectedAccount.id,
        is_essential: true,
      });

      // Create transaction in local store so it shows on dashboard immediately (including recurring)
      createTransactionLocal({
        user_id: user.id,
        account_id: selectedAccount.id,
        amount: amountNum,
        description: description.trim() || "",
        date: dateStr,
        category: selectedCategory?.name || "",
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurringFrequency : undefined,
        type: entryType === "Income" ? "income" : "expense",
      });

      // Update account balance in local store for instant Dashboard update;
      // sync engine will persist this to Supabase when online.
      const newBalance =
        entryType === "Expense"
          ? selectedAccount.amount - amountNum
          : selectedAccount.amount + amountNum;
      updateAccountLocal(selectedAccount.id, { amount: newBalance });

      // Auto-create subscription if this is a recurring expense
      if (entryType === "Expense" && isRecurring && selectedCategory) {
        try {
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

          const billingCycle =
            recurringFrequency === "weekly"
              ? "weekly"
              : recurringFrequency === "yearly"
                ? "yearly"
                : "monthly";

          // Local recurring subscription; sync engine will push it.
          createSubscriptionLocal({
            user_id: user.id,
            account_id: selectedAccount.id,
            name: description.trim() || selectedCategory.name,
            amount: amountNum,
            category: selectedCategory.name,
            billing_cycle: billingCycle,
            next_payment_date: nextPaymentDate.toISOString().split("T")[0],
            is_active: true,
            icon: "subscriptions",
            icon_color: selectedCategory.color,
            description: `Auto-created from recurring ${entryType.toLowerCase()}`,
          });
        } catch (subscriptionError) {
          console.error("Error auto-creating subscription:", subscriptionError);
        }
      }

      // Kick sync if we're online so pending changes are pushed promptly.
      if (!(await isOfflineGateLocked())) {
        void triggerSync();
      }

      // Check budget thresholds only for the expense category (notify only if this category has a budget)
      if (entryType === "Expense" && selectedCategory?.name) {
        try {
          await notificationService.checkBudgetsAndNotify(
            selectedCategory.name,
          );
        } catch (error) {
          console.error("Error checking budget notifications:", error);
        }
      }

      toast.success("Success!", {
        description: `Your ${entryType.toLowerCase()} has been saved!`,
      });

      setTimeout(() => {
        router.push("/(main)/Dashboard");
      }, 500);
    } catch (error) {
      console.error(error);
      toast.error(t.error || "Error", {
        description:
          t.somethingWentWrongPleaseTryAgain ||
          "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || Number.parseFloat(transferAmount) <= 0) {
      toast.error(t.error || "Error", {
        description:
          t.pleaseEnterValidTransferAmount ||
          "Please enter a valid transfer amount",
      });
      return;
    }

    if (!fromAccount || !toAccount) {
      toast.error("Select Accounts", {
        description: "Please select both from and to accounts",
      });
      return;
    }

    if (fromAccount.id === toAccount.id) {
      toast.error("Error", {
        description: "Cannot transfer to the same account",
      });
      return;
    }

    const amountNum = Number.parseFloat(transferAmount);

    setIsSubmitting(true);

    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) throw new Error("Please log in first");

      const dateStr = date.toISOString().split("T")[0];

      // Create both transactions in local store first so they show on dashboard immediately
      createTransactionLocal({
        user_id: user.id,
        account_id: fromAccount.id,
        amount: amountNum,
        description: `Transfer to ${toAccount.name}`,
        date: dateStr,
        category: "Transfer",
        is_recurring: false,
        type: "expense",
      });
      createTransactionLocal({
        user_id: user.id,
        account_id: toAccount.id,
        amount: amountNum,
        description: `Transfer from ${fromAccount.name}`,
        date: dateStr,
        category: "Transfer",
        is_recurring: false,
        type: "income",
      });

      // Create transfer record locally; sync engine will push to Supabase.
      createTransferLocal({
        user_id: user.id,
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        amount: amountNum,
        description: `Transfer from ${fromAccount.name} to ${toAccount.name}`,
        date: dateStr,
      });

      // Update account balances in local store (instant); sync engine will persist remotely.
      const fromNew = fromAccount.amount - amountNum;
      const toNew = toAccount.amount + amountNum;
      updateAccountLocal(fromAccount.id, { amount: fromNew });
      updateAccountLocal(toAccount.id, { amount: toNew });

      if (!(await isOfflineGateLocked())) {
        void triggerSync();
      }

      toast.success("Transfer Successful!", {
        description: `$${amountNum.toFixed(2)} transferred from ${fromAccount.name} to ${toAccount.name}`,
      });

      setTimeout(() => {
        router.push("/(main)/Dashboard");
      }, 500);
    } catch (error) {
      console.error(error);
      toast.error("Error", {
        description: "Transfer failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = useCallback(() => {
    if (entryType === "Transfer") {
      return (
        !!transferAmount &&
        Number.parseFloat(transferAmount) > 0 &&
        !!fromAccount &&
        !!toAccount &&
        fromAccount.id !== toAccount.id &&
        !isSubmitting
      );
    }

    // For Income and Expense (note/description is optional)
    return !!amount && !!selectedAccount && !!selectedCategory && !isSubmitting;
  }, [
    amount,
    selectedAccount,
    selectedCategory,
    entryType,
    fromAccount,
    toAccount,
    transferAmount,
    isSubmitting,
  ]);

  const statusBarTop = statusBarTopInset(insets);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Opaque strip under clock/battery (edge-to-edge): blocks scroll overscroll bleed-through */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: statusBarTop,
          backgroundColor: theme.background,
          zIndex: 100,
        }}
      />
      <StatusBar
        backgroundColor={theme.background}
        barStyle={theme.isDarkColorScheme ? "light-content" : "dark-content"}
        translucent={Platform.OS === "android" ? false : undefined}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.background }}
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
              backgroundColor: theme.background,
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
            <Text
              style={{ color: theme.text, fontSize: 18, fontWeight: "bold" }}
            >
              {t.add_transaction || "Add Transaction"}
            </Text>
            <View style={{ width: 76 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, backgroundColor: theme.background }}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Type Tabs - Modern Pills */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                backgroundColor: theme.background,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  overflow: "hidden",
                }}
              >
                {ENTRY_TABS.map((tab, index) => {
                  const isActive = entryType === tab.id;
                  const activeBg = "#00BFFF";
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      activeOpacity={1}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        backgroundColor: isActive
                          ? activeBg
                          : theme.cardBackground,
                        borderRightWidth: index < ENTRY_TABS.length - 1 ? 1 : 0,
                        borderRightColor: theme.border,
                      }}
                      onPress={() => handleEntryTypeChange(tab.id)}
                    >
                      <Text
                        style={{
                          textAlign: "center",
                          fontWeight: isActive ? "600" : "400",
                          fontSize: 14,
                          color: isActive ? "#FFFFFF" : theme.text,
                        }}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Receipt scanning removed (manual entry only). */}

            {/* Render the appropriate form based on entry type */}
            {entryType === "Expense" && (
              <ExpenseForm
                amount={amount}
                setAmount={setAmount}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                description={description}
                setDescription={setDescription}
                selectedAccount={selectedAccount}
                setSelectedAccount={setSelectedAccount}
                date={date}
                setDate={setDate}
                isRecurring={isRecurring}
                setIsRecurring={setIsRecurring}
                recurringFrequency={recurringFrequency}
                setRecurringFrequency={setRecurringFrequency}
                categories={expenseCategories}
                accounts={accounts}
                theme={theme}
                t={t}
              />
            )}

            {entryType === "Income" && (
              <IncomeForm
                amount={amount}
                setAmount={setAmount}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                description={description}
                setDescription={setDescription}
                selectedAccount={selectedAccount}
                setSelectedAccount={setSelectedAccount}
                date={date}
                setDate={setDate}
                categories={incomeCategories}
                accounts={accounts}
                theme={theme}
                t={t}
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
                accounts={accounts}
                isSubmitting={isSubmitting}
                handleTransfer={handleTransfer}
                theme={theme}
                t={t}
              />
            )}
          </ScrollView>

          {/* Save button - Fixed at bottom with clear spacing */}
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
                backgroundColor: theme.primary,
                minWidth: 120,
                alignItems: "center",
                opacity: isFormValid() ? 1 : 0.7,
              }}
              onPress={
                entryType === "Transfer" ? handleTransfer : handleSaveExpense
              }
              disabled={!isFormValid()}
            >
              <Text
                style={{
                  fontWeight: "600",
                  fontSize: 16,
                  color: theme.primaryText,
                }}
              >
                {entryType === "Transfer"
                  ? isSubmitting
                    ? t.saving || "Saving..."
                    : t.completeTransfer || "Transfer"
                  : isSubmitting
                    ? t.saving || "Saving..."
                    : t.save || "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
