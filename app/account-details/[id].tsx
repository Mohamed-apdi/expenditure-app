import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Plus } from "lucide-react-native";
import { supabase } from "~/lib/supabase";
import { format } from "date-fns";

type Transaction = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_method: string;
  type: "income" | "expense" | "transfer";
  note?: string;
};

const AccountDetails = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [account, setAccount] = useState<{
    name: string;
    amount: number;
    type?: "asset" | "liability";
  } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAccountData();
    }
  }, [id]);

  const loadAccountData = async () => {
    try {
      setLoading(true);

      // Fetch account details
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("name, amount, type")
        .eq("id", id)
        .single();

      if (accountError) throw accountError;
      setAccount(accountData);
    } catch (error) {
      console.error("Failed to load account data:", error);
    } finally {
      setLoading(false);
    }
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
    deposit: transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0),
    withdrawal: transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0),
    total: transactions.reduce((sum, t) => {
      return t.type === "income" ? sum + t.amount : sum - t.amount;
    }, 0),
    balance: account.amount,
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between p-6 border-b border-gray-100">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="p-2"
        >
          <ChevronLeft size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-gray-900 text-2xl font-bold">
          {account.name}
        </Text>
        <TouchableOpacity className="p-2">
          <Plus size={24} color="#3b82f6" />
        </TouchableOpacity>
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
            <Text className="text-gray-600 text-sm mb-1">Deposit</Text>
            <Text className="text-green-600 font-bold">
              ${summary.deposit.toFixed(2)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-600 text-sm mb-1">Withdrawal</Text>
            <Text className="text-red-600 font-bold">
              ${summary.withdrawal.toFixed(2)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-600 text-sm mb-1">Total</Text>
            <Text className={`font-bold ${
              summary.total >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              ${summary.total.toFixed(2)}
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
        <Text className="text-gray-900 font-bold text-lg">Recent Transactions</Text>
      </View>

      {/* Transactions List */}
      <ScrollView className="flex-1 px-6">
        {transactions.length === 0 ? (
          <View className="py-8 items-center">
            <Text className="text-gray-500">No transactions yet</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <TouchableOpacity
              key={transaction.id}
              className="flex-row justify-between items-center py-4 border-b border-gray-100"
            >
              <View className="flex-1">
                <Text className="font-medium text-gray-900">
                  {transaction.description}
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  {format(new Date(transaction.date), "MMM d, yyyy")}
                </Text>
              </View>
              <Text
                className={`font-bold ${
                  transaction.type === "income" ? "text-green-600" : "text-red-600"
                }`}
              >
                {transaction.type === "income" ? "+" : "-"}${Math.abs(transaction.amount).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountDetails;