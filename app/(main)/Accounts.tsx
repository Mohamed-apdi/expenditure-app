import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MoreHorizontal, X, Plus } from "lucide-react-native";
import { fetchAccounts, createAccount, Account } from "~/lib";
import { supabase } from "~/lib";
import AddAccount from "../account-details/add-account";
import { useAccount } from "~/lib";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

interface AccountGroup {
  id: string;
  name: string;
}

const accountGroups: AccountGroup[] = [
  { id: "1", name: "Cash" },
  { id: "2", name: "Accounts" },
  { id: "3", name: "SIM Card" },
  { id: "4", name: "Debit Card" },
  { id: "5", name: "Savings" },
  { id: "6", name: "Top-Up/Prepaid" },
  { id: "7", name: "Investments" },
  { id: "8", name: "Overdrafts" },
  { id: "9", name: "Loan" },
  { id: "10", name: "Insurance" },
  { id: "11", name: "Card" },
  { id: "12", name: "Others" },
];

const Accounts = () => {
  const router = useRouter();
  const { refreshAccounts: refreshContextAccounts } = useAccount();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { t } = useLanguage();

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the current user first
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to view accounts");
      }

      const data = await fetchAccounts(user.id);
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load accounts"
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [])
  );

  // Calculate totals - now just sum all account amounts since we don't have type field
  const total = accounts.reduce((sum, a) => sum + (a.amount || 0), 0);

  const handleAddAccount = async (newAccount: {
    account_type: string;
    name: string;
    amount: number;
    description?: string;
  }) => {
    try {
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to add an account");
      }

      const accountWithUser = {
        ...newAccount,
        user_id: user.id,
        is_default: false, // Default to false for new accounts
        currency: "USD", // Default currency
      };

      const createdAccount = await createAccount(accountWithUser);
      setAccounts((prev) => [...prev, createdAccount]);

      // If account has an initial amount, create a transaction as income
      if (newAccount.amount && newAccount.amount > 0) {
        try {
          const { addTransaction } = await import("~/lib");

          await addTransaction({
            user_id: user.id,
            account_id: createdAccount.id,
            amount: newAccount.amount,
            description: `Initial balance for ${newAccount.name}`,
            date: new Date().toISOString().split("T")[0],
            category: "Initial Balance", // Use existing income category
            type: "income",
            is_recurring: false,
          });

          console.log(
            "Created initial balance transaction for account:",
            createdAccount.name
          );
        } catch (transactionError) {
          console.error(
            "Failed to create initial balance transaction:",
            transactionError
          );
          // Don't fail the account creation if transaction creation fails
        }
      }

      // Refresh accounts in context to update MonthYearScroller
      await refreshContextAccounts();

      setShowAddAccount(false);
    } catch (error) {
      console.error("Failed to add account:", error);
      setError(
        error instanceof Error ? error.message : "Failed to add account"
      );
    }
  };

  const handleAccountPress = (accountId: string) => {
    router.push({
      pathname: "/account-details/[id]",
      params: { id: accountId },
    });
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 py-safe"
      style={{ backgroundColor: theme.background }}
    >
      {error && (
        <View
          className="border p-4 rounded-lg mx-6 mt-4"
          style={{
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.text }}>{error}</Text>
          <TouchableOpacity
            onPress={() => setError(null)}
            className="absolute top-3 right-3"
          >
            <X size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View className="flex-row justify-between items-center p-6">
        <Text className="text-2xl font-bold" style={{ color: theme.text }}>
          {t.accounts}
        </Text>
        <TouchableOpacity
          className="bg-blue-500 rounded-lg py-3 px-3 items-center"
          onPress={() => setShowAddAccount(true)}
        >
          <Text className="text-white">{t.addAccount}</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View className="flex-row px-6 mb-6 gap-4">
        <View
          className="flex-1 p-4 rounded-xl border shadow-sm"
          style={{
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          }}
        >
          <Text className="text-sm mb-1" style={{ color: theme.textSecondary }}>
            {t.total}
          </Text>
          <Text className="text-green-600 text-xl font-bold">
            ${total.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Accounts List */}
      <ScrollView className="flex-1 px-6 pb-6">
        {accountGroups
          .filter(
            (group) =>
              accounts.some((account) => account.account_type === group.name) // Changed from group_name to account_type
          )
          .map((group) => (
            <View key={group.id} className="mb-6">
              <Text
                className="font-bold text-lg mb-3"
                style={{ color: theme.text }}
              >
                {group.name === "Cash"
                  ? t.cash
                  : group.name === "SIM Card"
                    ? t.simCard
                    : group.name === "Debit Card"
                      ? t.debitCard
                      : group.name === "Savings"
                        ? t.savings
                        : group.name === "Top-Up/Prepaid"
                          ? t.topup
                          : group.name === "Investments"
                            ? t.investments
                            : group.name === "Overdrafts"
                              ? t.overdrafts
                              : group.name === "Loan"
                                ? t.loan
                                : group.name === "Insurance"
                                  ? t.insurance
                                  : group.name === "Card"
                                    ? t.card
                                    : group.name === "Others"
                                      ? t.others
                                      : group.name}
              </Text>
              <View className="gap-3">
                {accounts
                  .filter((account) => account.account_type === group.name) // Changed from group_name to account_type
                  .map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      className="flex-row justify-between p-5 rounded-xl border shadow-sm"
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderColor: theme.border,
                      }}
                      onPress={() => handleAccountPress(account.id)}
                    >
                      <View className="flex-1">
                        <Text
                          className="font-semibold text-lg"
                          style={{ color: theme.text }}
                        >
                          {account.name}
                        </Text>
                        {account.description && (
                          <Text
                            className="text-sm mt-1"
                            style={{ color: theme.textSecondary }}
                          >
                            {account.description}
                          </Text>
                        )}
                      </View>
                      <Text
                        className={`font-bold text-lg ${
                          account.amount >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        ${account.amount?.toFixed(2) || "0.00"}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          ))}
      </ScrollView>

      {/* Add Account Modal */}
      <AddAccount
        visible={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        onAddAccount={handleAddAccount}
        accountGroups={accountGroups}
      />
    </SafeAreaView>
  );
};

export default Accounts;
