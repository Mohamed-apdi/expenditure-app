"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Camera, Image as ImageIcon, Scan } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { supabase } from "~/lib";
import { useTheme } from "~/lib";
import { fetchAccounts, updateAccountBalance } from "~/lib";
import { addExpense } from "~/lib";
import { addTransaction } from "~/lib";
import { addTransfer } from "~/lib";
import { addSubscription } from "~/lib";
import type { Account } from "~/lib";
import { notificationService } from "~/lib";
import { useLanguage } from "~/lib";
import * as ImagePicker from "expo-image-picker";
import { scanReceiptWithOCR } from "~/lib/services/ocr";

// Import the separated form components
import ExpenseForm from "./components/ExpenseForm";
import IncomeForm from "./components/IncomeForm";
import TransferForm from "./components/TransferForm";
import { getExpenseCategories, getIncomeCategories, type Category, type Frequency } from "./utils/categories";

export default function AddExpenseScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();

  // States
  const [entryType, setEntryType] = useState("Expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<Frequency>("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // OCR states
  const [inputMode, setInputMode] = useState<"normal" | "ocr">("normal");
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

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
    const loadAccounts = async () => {
      try {
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
        Toast.show({
          type: "error",
          text1: t.error || "Error",
          text2: t.failedToLoadAccounts || "Failed to load accounts",
        });
      }
    };

    loadAccounts();
  }, []);

  const handleEntryTypeChange = (type: string) => {
    setEntryType(type);
    setSelectedCategory(null);
    // Reset to normal mode when changing entry type
    if (inputMode === "ocr") {
      setInputMode("normal");
    }
  };

  // Map OCR category to app category
  const mapOCRCategoryToAppCategory = (ocrCategory: string): Category | null => {
    const categories = entryType === "Expense" ? expenseCategories : incomeCategories;
    const categoryLower = ocrCategory.toLowerCase();

    // Direct mapping
    const categoryMap: Record<string, string> = {
      food: "food",
      groceries: "food",
      restaurant: "food",
      cafe: "food",
      transport: "transport",
      gas: "transport",
      taxi: "transport",
      uber: "transport",
      shopping: "shopping",
      walmart: "shopping",
      target: "shopping",
      amazon: "shopping",
    };

    // Find matching category
    for (const [key, categoryId] of Object.entries(categoryMap)) {
      if (categoryLower.includes(key)) {
        const found = categories.find((cat) => cat.id === categoryId);
        if (found) return found;
      }
    }

    // Default to first category if no match
    return categories.length > 0 ? categories[0] : null;
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: t.error || "Error",
          text2: t.permissionToAccessCamera || "Permission to access camera roll is required",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await processReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Toast.show({
        type: "error",
        text1: t.error || "Error",
        text2: t.failedToPickImage || "Failed to pick image",
      });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: t.error || "Error",
          text2: "Camera permission is required",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        await processReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Toast.show({
        type: "error",
        text1: t.error || "Error",
        text2: "Failed to take photo",
      });
    }
  };

  const processReceiptImage = async (imageUri: string) => {
    setIsProcessingOCR(true);
    try {
      const ocrResult = await scanReceiptWithOCR(imageUri);

      // Populate form fields with OCR results
      if (ocrResult.amount) {
        setAmount(ocrResult.amount.toString());
      }

      if (ocrResult.merchant) {
        setDescription(ocrResult.merchant);
      }

      if (ocrResult.date) {
        setDate(new Date(ocrResult.date));
      }

      // Map category
      if (ocrResult.category) {
        const mappedCategory = mapOCRCategoryToAppCategory(ocrResult.category);
        if (mappedCategory) {
          setSelectedCategory(mappedCategory);
        }
      }

      // Switch to normal mode after OCR processing
      setInputMode("normal");

      Toast.show({
        type: "success",
        text1: "Receipt scanned!",
        text2: "Please review and edit the details before saving.",
      });
    } catch (error) {
      console.error("OCR processing error:", error);
      Toast.show({
        type: "error",
        text1: "OCR Failed",
        text2: error instanceof Error ? error.message : "Failed to process receipt image",
      });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleSaveExpense = async () => {
    // Basic validation
    if (!amount || !description.trim()) {
      Toast.show({
        type: "error",
        text1: t.missingInfo || "Missing Information",
        text2: t.pleaseFillRequiredFields || "Please fill all required fields",
      });
      return;
    }

    if (!selectedAccount) {
      Toast.show({
        type: "error",
        text1: t.selectAccount || "Select Account",
        text2: t.pleaseSelectAccount || "Please select an account",
      });
      return;
    }

    // Type-specific validation
    if (entryType === "Income" && (!selectedCategory || !selectedCategory.name)) {
      Toast.show({
        type: "error",
        text1: t.chooseCategory || "Choose Category",
        text2: t.pleaseSelectCategoryForIncome || "Please select a category for income",
      });
      return;
    }

    if (entryType === "Expense") {
      if (!selectedCategory || !selectedCategory.name) {
        Toast.show({
          type: "error",
          text1: t.chooseCategory || "Choose Category",
          text2: t.pleaseSelectCategoryForExpense || "Please select a category for expense",
        });
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
          Toast.show({
            type: "error",
            text1: t.insufficientFunds || "Insufficient Funds",
            text2: `${t.yourAccountDoesntHaveEnoughBalance || "Your account doesn't have enough balance"} ${selectedAccount.name} ${t.forThisExpense || "for this expense"}.`,
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Add expense using the service
      await addExpense({
        user_id: user.id,
        entry_type: entryType as "Income" | "Expense",
        amount: amountNum,
        category: selectedCategory!.name,
        description: description.trim(),
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

      // Update account balance
      const newBalance =
        entryType === "Expense"
          ? selectedAccount.amount - amountNum
          : selectedAccount.amount + amountNum;

      await updateAccountBalance(selectedAccount.id, newBalance);

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

          await addSubscription({
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

      // Check budget thresholds
      if (entryType === "Expense" && selectedCategory?.name) {
        try {
          await notificationService.checkBudgetsAndNotify();
        } catch (error) {
          console.error("Error checking budget notifications:", error);
        }
      }

      Toast.show({
        type: "success",
        text1: "Success!",
        text2: `Your ${entryType.toLowerCase()} has been saved!`,
      });

      setTimeout(() => {
        router.push("/(main)/Dashboard");
      }, 500);
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: t.error || "Error",
        text2: t.somethingWentWrongPleaseTryAgain || "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || Number.parseFloat(transferAmount) <= 0) {
      Toast.show({
        type: "error",
        text1: t.error || "Error",
        text2: t.pleaseEnterValidTransferAmount || "Please enter a valid transfer amount",
      });
      return;
    }

    if (!fromAccount || !toAccount) {
      Toast.show({
        type: "error",
        text1: "Select Accounts",
        text2: "Please select both from and to accounts",
      });
      return;
    }

    if (fromAccount.id === toAccount.id) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Cannot transfer to the same account",
      });
      return;
    }

    const amountNum = Number.parseFloat(transferAmount);
    if (amountNum > fromAccount.amount) {
      Toast.show({
        type: "error",
        text1: "Insufficient Funds",
        text2: "Insufficient balance in the from account",
      });
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

      // Add EXPENSE transaction for FROM account
      await addTransaction({
        user_id: user.id,
        account_id: fromAccount.id,
        amount: amountNum,
        description: `Transfer to ${toAccount.name}`,
        date: date.toISOString().split("T")[0],
        category: "Transfer",
        is_recurring: false,
        type: "expense",
      });

      // Add INCOME transaction for TO account
      await addTransaction({
        user_id: user.id,
        account_id: toAccount.id,
        amount: amountNum,
        description: `Transfer from ${fromAccount.name}`,
        date: date.toISOString().split("T")[0],
        category: "Transfer",
        is_recurring: false,
        type: "income",
      });

      // Update account balances
      await Promise.all([
        updateAccountBalance(fromAccount.id, fromAccount.amount - amountNum),
        updateAccountBalance(toAccount.id, toAccount.amount + amountNum),
      ]);

      Toast.show({
        type: "success",
        text1: "Transfer Successful!",
        text2: `$${amountNum.toFixed(2)} transferred from ${fromAccount.name} to ${toAccount.name}`,
      });

      setTimeout(() => {
        router.push("/(main)/Dashboard");
      }, 500);
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Transfer failed. Please try again.",
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

    // For Income and Expense
    return (
      !!amount &&
      !!description.trim() &&
      !!selectedAccount &&
      !!selectedCategory &&
      !isSubmitting
    );
  }, [
    amount,
    description,
    selectedAccount,
    selectedCategory,
    entryType,
    fromAccount,
    toAccount,
    transferAmount,
    isSubmitting,
  ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
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
            {t.add_transaction || "Add Transaction"}
          </Text>
          <TouchableOpacity
            style={{
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 12,
              backgroundColor: isFormValid() ? theme.primary : theme.cardBackground,
            }}
            onPress={entryType === "Transfer" ? handleTransfer : handleSaveExpense}
            disabled={!isFormValid()}
          >
            <Text
              style={{
                fontWeight: "600",
                fontSize: 14,
                color: isFormValid() ? theme.primaryText : theme.textMuted,
              }}
            >
              {isSubmitting ? t.saving || "Saving..." : t.save || "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {/* Type Tabs - Modern Pills */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, backgroundColor: theme.background }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {ENTRY_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 20,
                    backgroundColor: entryType === tab.id ? theme.primary : theme.cardBackground,
                    borderWidth: 1,
                    borderColor: entryType === tab.id ? theme.primary : theme.border,
                  }}
                  onPress={() => handleEntryTypeChange(tab.id)}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontWeight: entryType === tab.id ? "600" : "400",
                      fontSize: 14,
                      color: entryType === tab.id ? theme.primaryText : theme.textSecondary,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Input Mode Selector - Only show for Expense */}
          {entryType === "Expense" && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, backgroundColor: theme.background }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: inputMode === "normal" ? theme.primary : theme.cardBackground,
                    borderWidth: 1,
                    borderColor: inputMode === "normal" ? theme.primary : theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onPress={() => setInputMode("normal")}
                >
                  <Text
                    style={{
                      fontWeight: inputMode === "normal" ? "600" : "400",
                      fontSize: 14,
                      color: inputMode === "normal" ? theme.primaryText : theme.textSecondary,
                    }}
                  >
                    Manual Entry
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: inputMode === "ocr" ? theme.primary : theme.cardBackground,
                    borderWidth: 1,
                    borderColor: inputMode === "ocr" ? theme.primary : theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onPress={() => setInputMode("ocr")}
                >
                  <Scan size={16} color={inputMode === "ocr" ? theme.primaryText : theme.textSecondary} />
                  <Text
                    style={{
                      fontWeight: inputMode === "ocr" ? "600" : "400",
                      fontSize: 14,
                      color: inputMode === "ocr" ? theme.primaryText : theme.textSecondary,
                    }}
                  >
                    Scan Receipt
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* OCR Mode UI */}
          {entryType === "Expense" && inputMode === "ocr" && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {isProcessingOCR ? (
                <View
                  style={{
                    padding: 32,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.cardBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text
                    style={{
                      marginTop: 16,
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: "500",
                    }}
                  >
                    Processing receipt...
                  </Text>
                  <Text
                    style={{
                      marginTop: 8,
                      color: theme.textSecondary,
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    Please wait while we extract information from your receipt
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    padding: 24,
                    backgroundColor: theme.cardBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <View style={{ alignItems: "center", marginBottom: 24 }}>
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: `${theme.primary}20`,
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <Scan size={32} color={theme.primary} />
                    </View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: theme.text,
                        marginBottom: 8,
                      }}
                    >
                      Scan Receipt
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.textSecondary,
                        textAlign: "center",
                      }}
                    >
                      Take a photo or choose from gallery to automatically extract expense details
                    </Text>
                  </View>
                  <View style={{ gap: 12 }}>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 16,
                        borderRadius: 12,
                        backgroundColor: theme.primary,
                        gap: 8,
                      }}
                      onPress={handleTakePhoto}
                    >
                      <Camera size={20} color={theme.primaryText} />
                      <Text
                        style={{
                          color: theme.primaryText,
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        Take Photo
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 16,
                        borderRadius: 12,
                        backgroundColor: theme.cardBackground,
                        borderWidth: 1,
                        borderColor: theme.border,
                        gap: 8,
                      }}
                      onPress={handlePickImage}
                    >
                      <ImageIcon size={20} color={theme.text} />
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        Choose from Gallery
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Render the appropriate form based on entry type */}
          {entryType === "Expense" && inputMode === "normal" && (
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
