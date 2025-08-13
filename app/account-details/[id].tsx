import React from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

const AccountDetails = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Mock data - in a real app, you'd fetch this based on the id
  const accountData = {
    name: "Eve",
    statementPeriod: "8.1.25 ~ 8.31.25",
    summary: {
      deposit: 400.0,
      withdrawal: 960.0,
      total: -560.0,
      balance: 560.0,
    },
    transactions: [
      {
        date: "13",
        day: "Wed",
        monthYear: "08.2025",
        deposit: 0.0,
        withdrawal: 960.0,
        items: [
          {
            category: "Food",
            description: "Eve",
            amount: 560.0,
            balance: -560.0,
            type: "expense",
          },
          {
            category: "Food",
            description: "Eve",
            amount: 150.0,
            balance: 0.0,
            type: "expense",
          },
          {
            category: "Transfer",
            description: "Waafi",
            amount: 5.0,
            note: "Eve → Accounts",
            balance: 150.0,
            type: "transfer",
          },
          {
            category: "Education",
            description: "Collage",
            amount: 245.0,
            note: "Eve",
            balance: 155.0,
            type: "expense",
          },
        ],
      },
      {
        date: "04",
        day: "Mon",
        monthYear: "08.2025",
        deposit: 400.0,
        withdrawal: 0.0,
        items: [
          {
            category: "Salary",
            description: "Aug salary",
            amount: 400.0,
            note: "Eve",
            balance: 400.0,
            type: "income",
          },
        ],
      },
    ],
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-12 pb-5 border-b border-slate-700">
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold ml-4">
          {accountData.name}
        </Text>
      </View>

      {/* Statement Period */}
      <View className="px-6 py-4 border-b border-slate-700">
        <Text className="text-slate-400 text-sm">Statement</Text>
        <Text className="text-white text-lg">{accountData.statementPeriod}</Text>
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
            ${accountData.summary.deposit.toFixed(2)}
          </Text>
          <Text className="text-rose-500 flex-1">
            ${accountData.summary.withdrawal.toFixed(2)}
          </Text>
          <Text
            className={`flex-1 ${
              accountData.summary.total >= 0
                ? "text-emerald-500"
                : "text-rose-500"
            }`}
          >
            ${accountData.summary.total.toFixed(2)}
          </Text>
          <Text className="text-white flex-1">
            ${accountData.summary.balance.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Transactions */}
      <ScrollView className="flex-1 px-6 pb-20">
        {accountData.transactions.map((transaction, index) => (
          <View key={index} className="mb-6">
            {/* Transaction Header */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-lg mr-2">
                  {transaction.date}
                </Text>
                <View>
                  <Text className="text-slate-400 text-sm">
                    {transaction.day}
                  </Text>
                  <Text className="text-slate-400 text-sm">
                    {transaction.monthYear}
                  </Text>
                </View>
              </View>
              <View className="flex-row">
                <Text className="text-emerald-500 mr-4">
                  ${transaction.deposit.toFixed(2)}
                </Text>
                <Text className="text-rose-500">
                  ${transaction.withdrawal.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Transaction Items */}
            <View className="gap-2">
              {transaction.items.map((item, itemIndex) => (
                <View
                  key={itemIndex}
                  className="bg-slate-800 p-4 rounded-xl border border-slate-700"
                >
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className="text-white font-medium">
                      {item.category}
                    </Text>
                    <Text
                      className={`font-bold ${
                        item.type === "income"
                          ? "text-emerald-500"
                          : item.type === "expense"
                          ? "text-rose-500"
                          : "text-blue-500"
                      }`}
                    >
                      ${item.amount.toFixed(2)}
                    </Text>
                  </View>
                  <Text className="text-slate-500 text-sm mb-1">
                    {item.description}
                  </Text>
                  {item.note && (
                    <Text className="text-slate-500 text-xs mb-1">
                      {item.note}
                    </Text>
                  )}
                  <Text className="text-slate-500 text-xs">
                    (Balance {item.balance >= 0 ? "" : "-"}$
                    {Math.abs(item.balance).toFixed(2)})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountDetails;