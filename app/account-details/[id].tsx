import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Pen, Trash2 } from "lucide-react-native";
import {
  supabase,
  selectAccountById,
  selectTransactions,
  selectBudgets,
  selectTransfers,
  deleteAccountLocal,
  deleteBudgetLocal,
  deleteTransactionLocal,
  deleteTransferLocal,
  isOfflineGateLocked,
  triggerSync,
} from "~/lib";
import { format } from "date-fns";
import { useTheme, useScreenStatusBar } from "~/lib";
import { useLanguage } from "~/lib";

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  date: string;
  created_at: string;
  type: "income" | "expense" | "transfer";
  account_id: string;
};

const AccountDetails = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [account, setAccount] = useState<{
    name: string;
    amount: number;
  } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const { t } = useLanguage();
  useScreenStatusBar();

  useEffect(() => {
    if (id) {
      loadAccountData();
    }
  }, [id]);

  const loadAccountData = async (isRefresh = false) => {
    const accountId = Array.isArray(id) ? id[0] : id;
    if (!accountId) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const acc = selectAccountById(user.id, accountId);
      if (acc) setAccount({ name: acc.name, amount: acc.amount });

      const allTx = selectTransactions(user.id);
      const accountTx = allTx
        .filter((t) => t.account_id === accountId)
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        .map((t) => ({
          id: t.id,
          amount: t.amount,
          category: t.category,
          description: t.description,
          date: t.date,
          created_at: t.created_at,
          type: t.type,
          account_id: t.account_id,
        }));
      setTransactions(accountTx);
    } catch (error) {
      console.error("Failed to load account data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteAccount = () => {
    const title = t.deleteAccount || "Delete Account";
    const message =
      (t.deleteAccountConfirm || "Are you sure you want to delete") +
      ` "${account?.name}"?\n\n` +
      (t.deleteAccountWarning ||
        "This action cannot be undone and will also delete all associated transactions, transfers, and budgets.");
    Alert.alert(title, message, [
      {
        text: t.cancel || "Cancel",
        style: "cancel",
      },
      {
        text: t.delete || "Delete",
        style: "destructive",
        onPress: async () => {
            const accountId = Array.isArray(id) ? id[0] : id;
            if (!accountId) return;

            try {
              setLoading(true);

              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              selectBudgets(user.id)
                .filter((b) => b.account_id === accountId)
                .forEach((b) => deleteBudgetLocal(b.id));

              selectTransfers(user.id)
                .filter(
                  (tr) =>
                    tr.from_account_id === accountId ||
                    tr.to_account_id === accountId
                )
                .forEach((tr) => deleteTransferLocal(tr.id));

              selectTransactions(user.id)
                .filter((t) => t.account_id === accountId)
                .forEach((t) => deleteTransactionLocal(t.id));

              deleteAccountLocal(accountId);

              if (!(await isOfflineGateLocked())) void triggerSync();

              Alert.alert(t.success, t.accountDeletedSuccessfully, [
                { text: t.ok, onPress: () => router.back() },
              ]);
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert(t.error, t.unexpectedError);
            } finally {
              setLoading(false);
            }
          }
        },
    ]);
  };

  if (loading || !account) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  // Calculate summary
  const summary = {
    income: transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0),
    expense: transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0),
    balance: account.amount,
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
      edges={["left", "right", "top", "bottom"]}
    >
      <View style={{ flex: 1 }}>
      {/* Header - reduced top padding for tighter top space */}
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: theme.border }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ChevronLeft size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold" style={{ color: theme.text }}>
          {account.name}
        </Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="bg-red-500 rounded-lg py-3 px-3 items-center"
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            <Trash2 size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Balance */}
      <View
        className="p-6 border-b"
        style={{
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        }}
      >
        <Text className="text-sm mb-1" style={{ color: theme.textSecondary }}>
          {t.currentBalance}
        </Text>
        <Text
          className={`text-2xl font-bold ${
            account.amount >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          ${account.amount.toFixed(2)}
        </Text>
      </View>

      {/* Summary Cards - Single Row */}
      <View
        className="p-6 border-b"
        style={{
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        }}
      >
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text
              className="text-sm mb-1"
              style={{ color: theme.textSecondary }}
            >
              {t.income}
            </Text>
            <Text className="text-green-600 font-bold">
              ${summary.income.toFixed(2)}
            </Text>
          </View>
          <View className="items-center">
            <Text
              className="text-sm mb-1"
              style={{ color: theme.textSecondary }}
            >
              {t.expense}
            </Text>
            <Text className="text-red-600 font-bold">
              ${summary.expense.toFixed(2)}
            </Text>
          </View>
          <View className="items-center">
            <Text
              className="text-sm mb-1"
              style={{ color: theme.textSecondary }}
            >
              {t.balance}
            </Text>
            <Text className="font-bold" style={{ color: theme.text }}>
              ${summary.balance.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions Header */}
      <View
        className="p-6 border-b"
        style={{
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        }}
      >
        <View className="flex-row justify-between items-center">
          <Text className="font-bold text-lg" style={{ color: theme.text }}>
            {t.recentTransactions}
          </Text>
          <TouchableOpacity
            onPress={() => loadAccountData(true)}
            className="bg-blue-100 px-3 py-1 rounded-lg"
            disabled={refreshing}
          >
            <Text
              className={`text-sm ${refreshing ? "text-blue-400" : "text-blue-600"}`}
            >
              {refreshing ? t.refreshing : t.refresh}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView className="flex-1 px-6">
        {refreshing && (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text
              className="text-sm mt-2"
              style={{ color: theme.textSecondary }}
            >
              {t.refreshingTransactions}
            </Text>
          </View>
        )}
        {transactions.length === 0 ? (
          <View className="py-8 items-center">
            <Text style={{ color: theme.textSecondary }}>
              {t.noTransactionsYet}
            </Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <TouchableOpacity
              key={transaction.id}
              className="flex-row justify-between items-center py-4 border-b"
              style={{ borderColor: theme.border }}
              onPress={() =>
                router.push(`/transaction-detail/${transaction.id}`)
              }
            >
              <View className="flex-1">
                <Text className="font-medium" style={{ color: theme.text }}>
                  {transaction.description ||
                    transaction.category ||
                    t.noDescription}
                </Text>
                <Text
                  className="text-sm mt-1"
                  style={{ color: theme.textSecondary }}
                >
                  {transaction.category && transaction.description
                    ? transaction.category
                    : ""}
                </Text>
                <Text
                  className="text-xs mt-1"
                  style={{ color: theme.textMuted }}
                >
                  {format(new Date(transaction.created_at), "MMM d, yyyy")}
                </Text>
              </View>
              <Text
                className={`font-bold ${
                  transaction.type === "income"
                    ? "text-green-600"
                    : transaction.type === "expense"
                      ? "text-red-600"
                      : "text-blue-600"
                }`}
              >
                {transaction.type === "income"
                  ? "+"
                  : transaction.type === "expense"
                    ? "-"
                    : ""}
                ${Math.abs(transaction.amount).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Edit Account FAB - bottom right (same position as other screens) */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 18,
          right: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 28,
          backgroundColor: theme.primary,
          gap: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 8,
        }}
        onPress={() => router.push(`/account-details/edit/${id}`)}
      >
        <Pen size={22} color={theme.primaryText} />
        <Text
          style={{
            color: theme.primaryText,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          {t.editAccount}
        </Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AccountDetails;
