import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Pen, Trash2 } from "lucide-react-native";
import { supabase } from "~/lib/supabase";
import { format } from "date-fns";

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

  useEffect(() => {
    if (id) {
      loadAccountData();
    }
  }, [id]);

  const loadAccountData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch account details
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("name, amount")
        .eq("id", id)
        .single();

      if (accountError) throw accountError;
      setAccount(accountData);

      // Fetch transactions for this specific account
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("account_id", id)
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
    } catch (error) {
      console.error("Failed to load account data:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete "${account?.name}"? This action cannot be undone and will also delete all associated transactions, transfers, and budgets.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // First, delete all budgets associated with this account
              const { error: budgetsError } = await supabase
                .from("budgets")
                .delete()
                .eq("account_id", id);

              if (budgetsError) {
                console.error("Error deleting budgets:", budgetsError);
                Alert.alert("Error", "Failed to delete account budgets");
                return;
              }

              // Second, delete all transfers where this account is the from_account or to_account
              const { error: transfersFromError } = await supabase
                .from("transfers")
                .delete()
                .eq("from_account_id", id);

              if (transfersFromError) {
                console.error("Error deleting transfers from account:", transfersFromError);
                Alert.alert("Error", "Failed to delete transfers from account");
                return;
              }

              const { error: transfersToError } = await supabase
                .from("transfers")
                .delete()
                .eq("to_account_id", id);

              if (transfersToError) {
                console.error("Error deleting transfers to account:", transfersToError);
                Alert.alert("Error", "Failed to delete transfers to account");
                return;
              }

              // Third, delete all transactions associated with this account
              const { error: transactionsError } = await supabase
                .from("transactions")
                .delete()
                .eq("account_id", id);

              if (transactionsError) {
                console.error("Error deleting transactions:", transactionsError);
                Alert.alert("Error", "Failed to delete account transactions");
                return;
              }

              // Finally, delete the account
              const { error: accountError } = await supabase
                .from("accounts")
                .delete()
                .eq("id", id);

              if (accountError) {
                console.error("Error deleting account:", accountError);
                Alert.alert("Error", "Failed to delete account");
                return;
              }

              Alert.alert("Success", "Account deleted successfully", [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]);
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert("Error", "An unexpected error occurred");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !account) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
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
    <SafeAreaView className="flex-1 bg-gray-50 p-safe">
      {/* Header */}
      <View className="flex-row items-center justify-between p-6 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ChevronLeft size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-gray-900 text-2xl font-bold">{account.name}</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="bg-blue-500 rounded-lg py-3 px-3 items-center"
            onPress={() => router.push(`/account-details/edit/${id}`)}
          >
            <Text className="text-white">Edit Account</Text>
          </TouchableOpacity>
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
      <View className="bg-white p-6 border-b border-gray-100">
        <Text className="text-gray-600 text-sm mb-1">Current Balance</Text>
        <Text
          className={`text-2xl font-bold ${
            account.amount >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          ${account.amount.toFixed(2)}
        </Text>
      </View>

      {/* Summary Cards - Single Row */}
      <View className="p-6 bg-white border-b border-gray-100">
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-gray-600 text-sm mb-1">Income</Text>
            <Text className="text-green-600 font-bold">
              ${summary.income.toFixed(2)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-600 text-sm mb-1">Expense</Text>
            <Text className="text-red-600 font-bold">
              ${summary.expense.toFixed(2)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-600 text-sm mb-1">Balance</Text>
            <Text className="text-gray-900 font-bold">
              ${summary.balance.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions Header */}
      <View className="p-6 bg-white border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-900 font-bold text-lg">
            Recent Transactions
          </Text>
          <TouchableOpacity 
            onPress={() => loadAccountData(true)}
            className="bg-blue-100 px-3 py-1 rounded-lg"
            disabled={refreshing}
          >
            <Text className={`text-sm ${refreshing ? 'text-blue-400' : 'text-blue-600'}`}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView className="flex-1 px-6">
        {refreshing && (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text className="text-gray-500 text-sm mt-2">Refreshing transactions...</Text>
          </View>
        )}
        {transactions.length === 0 ? (
          <View className="py-8 items-center">
            <Text className="text-gray-500">No transactions yet</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <TouchableOpacity
              key={transaction.id}
              className="flex-row justify-between items-center py-4 border-b border-gray-100"
              onPress={() => router.push(`/transaction-detail/${transaction.id}`)}
            >
              <View className="flex-1">
                <Text className="font-medium text-gray-900">
                  {transaction.description || transaction.category || 'No description'}
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  {transaction.category && transaction.description ? transaction.category : ''}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
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
                {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}$
                {Math.abs(transaction.amount).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountDetails;
