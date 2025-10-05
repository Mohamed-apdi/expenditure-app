import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
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
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { t } = useLanguage();

  const loadAccounts = async () => {
    try {
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

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
    >
      <ScrollView className="flex-1">
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text style={{ color: theme.text, fontSize: 24, fontWeight: "bold" }}>
                {t.accounts}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4 }}>
                {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} • ${total.toFixed(2)} total
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => setShowAddAccount(true)}
            >
              <Text style={{ color: theme.primaryText, fontWeight: "600" }}>
                {t.addAccount}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error && (
            <View
              style={{
                backgroundColor: '#fee2e2',
                padding: 12,
                borderRadius: 12,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: '#dc2626', flex: 1, fontSize: 14 }}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <X size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
          )}

          {/* Total Balance Card */}
          <View
            style={{
              backgroundColor: theme.primary,
              padding: 20,
              borderRadius: 16,
              marginBottom: 24,
            }}
          >
            <Text style={{ color: theme.primaryText, fontSize: 14, fontWeight: "500", opacity: 0.9, marginBottom: 8 }}>
              {t.total || "Total Balance"}
            </Text>
            <Text style={{ color: theme.primaryText, fontSize: 36, fontWeight: "bold" }}>
              ${total.toFixed(2)}
            </Text>
          </View>

          {/* Accounts by Type */}
          {accounts.length === 0 ? (
            <View
              style={{
                paddingVertical: 48,
                alignItems: "center",
                backgroundColor: theme.cardBackground,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: "500" }}>
                No accounts yet
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}>
                Create your first account
              </Text>
            </View>
          ) : (
            <View style={{ gap: 20 }}>
              {accountGroups
                .filter((group) =>
                  accounts.some((account) => account.account_type === group.name)
                )
                .map((group) => (
                  <View key={group.id}>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 16,
                        fontWeight: "bold",
                        marginBottom: 12
                      }}
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
                    <View style={{ gap: 12 }}>
                      {accounts
                        .filter((account) => account.account_type === group.name)
                        .map((account) => (
                          <TouchableOpacity
                            key={account.id}
                            style={{
                              padding: 16,
                              backgroundColor: theme.cardBackground,
                              borderRadius: 16,
                            }}
                            onPress={() => handleAccountPress(account.id)}
                          >
                            <View className="flex-row justify-between items-start mb-2">
                              <View className="flex-1">
                                <Text
                                  style={{
                                    color: theme.text,
                                    fontSize: 18,
                                    fontWeight: "bold",
                                  }}
                                >
                                  {account.name}
                                </Text>
                                <View
                                  style={{
                                    backgroundColor: account.amount >= 0 ? '#dcfce7' : '#fee2e2',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                    alignSelf: 'flex-start',
                                    marginTop: 6,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: account.amount >= 0 ? '#16a34a' : '#dc2626',
                                      fontSize: 11,
                                      fontWeight: "600"
                                    }}
                                  >
                                    {group.name}
                                  </Text>
                                </View>
                              </View>
                              <View style={{ alignItems: "flex-end" }}>
                                <Text
                                  style={{
                                    fontSize: 24,
                                    fontWeight: "bold",
                                    color: account.amount >= 0 ? "#10b981" : "#ef4444",
                                  }}
                                >
                                  ${Math.abs(account.amount || 0).toFixed(2)}
                                </Text>
                                {account.amount < 0 && (
                                  <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 2 }}>
                                    Overdraft
                                  </Text>
                                )}
                              </View>
                            </View>
                            {account.description && (
                              <View className="pt-3 border-t" style={{ borderColor: theme.border }}>
                                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                                  {account.description}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                ))}
            </View>
          )}
        </View>
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
