"use client";

import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useTheme } from "~/lib/theme";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountSelectionScreen() {
  const router = useRouter();
  const { selectionType = "from", returnScreen } = useLocalSearchParams();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const theme = useTheme();
  const accounts = [
    {
      id: 1,
      name: "somnet",
      balance: 160,
      icon: "💳",
    },
    {
      id: 2,
      name: "hormuud",
      balance: 540,
      icon: "💰",
    },
    {
      id: 3,
      name: "Not associated with any account",
      balance: null,
      icon: "🆔",
    },
  ];

  const handleAccountSelect = (accountName: string) => {
    setSelectedAccount(accountName);
  };

  const handleConfirmSelection = () => {
    if (selectedAccount) {
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 bg-white">
        {/* Header */}

        <View
          className="flex-row justify-between items-center px-6 py-4 border-b"
          style={{ borderColor: theme.border }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-black">
            Select {selectionType === "from" ? "Source" : "Destination"} Account
          </Text>
          <View className="w-6" />
        </View>

        <ScrollView className="flex-1 p-5">
          <Text className="text-base font-semibold text-black mb-4">
            Choose an account
          </Text>

          {accounts.map((account, index) => (
            <TouchableOpacity
              key={index}
              className={`bg-blue-50 rounded-xl p-4 mb-3 flex-row items-center justify-between shadow-sm shadow-blue-500/10 border-2 ${
                selectedAccount === account.name
                  ? "border-blue-500 bg-blue-100"
                  : "border-transparent"
              }`}
              onPress={() => handleAccountSelect(account.name)}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center mr-4">
                  <Text className="text-xl">{account.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-black mb-1">
                    {account.name}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {account.balance !== null
                      ? `Balance: $${account.balance}`
                      : "No balance info"}
                  </Text>
                </View>
              </View>

              <View
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  selectedAccount === account.name
                    ? "bg-blue-500 border-blue-500"
                    : "border-blue-100"
                }`}
              >
                {selectedAccount === account.name && (
                  <Text className="text-white text-sm font-bold">✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedAccount && (
          <View className="p-5 bg-white">
            <TouchableOpacity
              className="bg-blue-500 rounded-lg py-4 items-center"
              onPress={handleConfirmSelection}
            >
              <Text className="text-white text-base font-semibold">
                Confirm Selection
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
