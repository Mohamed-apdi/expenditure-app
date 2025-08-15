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
import { ChevronLeft } from "lucide-react-native";
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
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
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
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-12 pb-5 border-b border-slate-700">
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold ml-4">
          {account.name}
        </Text>
      </View>

      {/* Statement Period */}
      <View className="px-6 py-4 border-b border-slate-700">
        <Text className="text-slate-400 text-sm">Current Balance</Text>
        <Text
          className={`text-xl font-bold ${
            account.amount >= 0 ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          ${account.amount.toFixed(2)}
        </Text>
      </View>

      {/* Summary Table */}
      <View className="px-6 py-4 border-b border-slate-700">
        <View className="flex-row justify-between mb-2">
          <Text className="text-slate-400 flex-1">Deposit</Text>
          <Text className="text-slate-400 flex-1">Withdrawal</Text>
          <Text className="text-slate-400 flex-1">Total</Text>
          <Text className="text-slate-400 flex-1">Balance</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-emerald-500 flex-1">
            ${summary.deposit.toFixed(2)}
          </Text>
          <Text className="text-rose-500 flex-1">
            ${summary.withdrawal.toFixed(2)}
          </Text>
          <Text
            className={`flex-1 ${
              summary.total >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            ${summary.total.toFixed(2)}
          </Text>
          <Text className="text-white flex-1">
            ${summary.balance.toFixed(2)}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AccountDetails;
