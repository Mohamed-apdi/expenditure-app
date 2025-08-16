import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Clock, CalendarDays, Wallet, Wallet2, CheckCircle, ArrowRight } from "lucide-react-native";
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "~/lib/theme";

export default function TransferDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();

  // Process transfer data with proper typing and fallbacks
  const transferData = {
    id: params.id?.toString() || "1",
    type: params.type?.toString() || "Transfer",
    account: {
      from: params.from?.toString() || "somnet",
      to: params.to?.toString() || "hormuud",
    },
    amount: {
      from: Number(params.amountFrom?.toString() || 50),
      to: Number(params.amountTo?.toString() || 50),
    },
    date: params.date?.toString() || new Date().toISOString().split("T")[0],
    time_added: params.time_added?.toString() || new Date().toISOString(),
    note: params.note?.toString() || "",
  };

  // Format date and time
  const formattedDate = new Date(transferData.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  const formattedTime = new Date(transferData.time_added).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Account icons mapping
  const accountIcons = {
    somnet: { icon: Wallet, color: "#3B82F6" },
    hormuud: { icon: Wallet2, color: "#10B981" },
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-5 py-4 border-b border-gray-200 bg-white">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="p-2 -ml-2"
            activeOpacity={0.8}
          >
            <ChevronLeft size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900 mx-auto">
            Transfer Details
          </Text>
          <View className="w-8" /> {/* Balance the header */}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Success Banner */}
          <View className="bg-white rounded-xl mx-5 mt-5 p-6 items-center shadow-sm">
            <View className="w-20 h-20 rounded-full bg-green-50 items-center justify-center mb-4">
              <CheckCircle size={36} color="#10B981" fill="#10B981" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-1">
              Transfer Successful
            </Text>
            <Text className="text-gray-500 text-center mb-4">
              Your money has been transferred successfully
            </Text>
            <Text className="text-3xl font-bold text-gray-900">
              ${transferData.amount.from.toFixed(2)}
            </Text>
          </View>

          {/* Transfer Summary */}
          <View className="bg-white rounded-xl mx-5 mt-4 p-5 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Transaction Summary
            </Text>

            {/* From/To Accounts */}
            <View className="flex-row justify-between mb-6">
              <View className="items-center">
                <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center mb-2">
                  {React.createElement(accountIcons[transferData.account.from as keyof typeof accountIcons].icon, {
                    size: 20,
                    color: accountIcons[transferData.account.from as keyof typeof accountIcons].color
                  })}
                </View>
                <Text className="text-sm text-gray-500">From</Text>
                <Text className="font-medium text-gray-900 capitalize">
                  {transferData.account.from}
                </Text>
              </View>

              <View className="justify-center px-2">
                <View className="bg-gray-100 p-2 rounded-full">
                  <ArrowRight size={16} color="#6B7280" />
                </View>
              </View>

              <View className="items-center">
                <View className="w-14 h-14 rounded-full bg-green-50 items-center justify-center mb-2">
                  {React.createElement(accountIcons[transferData.account.to as keyof typeof accountIcons].icon, {
                    size: 20,
                    color: accountIcons[transferData.account.to as keyof typeof accountIcons].color
                  })}
                </View>
                <Text className="text-sm text-gray-500">To</Text>
                <Text className="font-medium text-gray-900 capitalize">
                  {transferData.account.to}
                </Text>
              </View>
            </View>

            {/* Details Grid */}
            <View className="space-y-4">
              <View className="flex-row justify-between">
                <View className="flex-row items-center">
                  <CalendarDays size={16} color="#6B7280" className="mr-2" />
                  <Text className="text-gray-500">Date</Text>
                </View>
                <Text className="font-medium text-gray-900">
                  {formattedDate}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <View className="flex-row items-center">
                  <Clock size={16} color="#6B7280" className="mr-2" />
                  <Text className="text-gray-500">Time</Text>
                </View>
                <Text className="font-medium text-gray-900">
                  {formattedTime}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-500">Transaction ID</Text>
                <Text className="font-medium text-gray-900">
                  #{transferData.id}
                </Text>
              </View>

              {transferData.note && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-500">Note</Text>
                  <Text className="font-medium text-gray-900 text-right max-w-[60%]">
                    {transferData.note}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Receipt Actions */}
          <View className="mx-5 mt-4 space-y-3">
            <TouchableOpacity 
              className="bg-blue-600 rounded-lg py-4 items-center active:bg-blue-700"
              activeOpacity={0.9}
              onPress={() => router.back()}
            >
              <Text className="text-white font-semibold">Done</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="border border-blue-600 rounded-lg py-4 items-center active:bg-blue-50"
              activeOpacity={0.8}
            >
              <Text className="text-blue-600 font-semibold">Download Receipt</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}