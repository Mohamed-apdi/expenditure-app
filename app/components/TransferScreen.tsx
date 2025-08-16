"use client";

import { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  FlatList,
} from "react-native";

// Main Transfer Screen Component
export default function TransferScreen() {
  const router = useRouter();
  const [fromAccount, setFromAccount] = useState("somnet");
  const [toAccount, setToAccount] = useState("hormuud");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);

  const keypadNumbers = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    [".", "0", "⌫"],
  ];

  const accounts = {
    somnet: { balance: 160, icon: "💳" },
    hormuud: { balance: 540, icon: "💰" },
  };

  const handleKeypadPress = (key: string) => {
    if (key === "⌫") {
      setAmount((prev) => prev.slice(0, -1));
    } else if (key === "." && amount.includes(".")) {
      return;
    } else {
      setAmount((prev) => prev + key);
    }
  };

  // In TransferScreen.tsx, modify the handleTransfer function:
  const handleTransfer = () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (
      Number.parseFloat(amount) >
      accounts[fromAccount as keyof typeof accounts].balance
    ) {
      Alert.alert("Error", "Insufficient balance");
      return;
    }

    const transferData = {
      id: "1", // Use a fixed ID that matches your mock data
      type: "Transfer",
      account: {
        from: fromAccount,
        to: toAccount,
      },
      amount: {
        from: Number.parseFloat(amount),
        to: Number.parseFloat(amount), // Adjust if there are fees
      },
      date: new Date().toISOString().split("T")[0],
      time_added: new Date().toISOString(),
      note: note,
    };

    Alert.alert(
      "Confirm Transfer",
      `Transfer $${amount} from ${fromAccount} to ${toAccount}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            router.push({
              pathname: "/(transfer)/TransferDetailsScreen",
              params: transferData, // Pass all data as params
            });
          },
        },
      ]
    );
  };

  const selectAccount = (type: "from" | "to") => {
    router.push({
      pathname: "/(transfer)/AccountSelectionScreen",
      params: {
        selectionType: type,
        returnScreen: "/(main)/TransferScreen",
      },
    });
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 p-5">
        {/* From Account Card */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-gray-500 mb-2">From</Text>
          <TouchableOpacity
            className="bg-blue-50 rounded-xl p-4 flex-row items-center justify-between shadow-sm shadow-blue-500/10"
            onPress={() => selectAccount("from")}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center mr-4">
                <Text className="text-xl">
                  {accounts[fromAccount as keyof typeof accounts]?.icon || "💳"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-black mb-1">
                  {fromAccount}
                </Text>
                <Text className="text-sm text-gray-500">
                  Balance: $
                  {accounts[fromAccount as keyof typeof accounts]?.balance || 0}
                </Text>
              </View>
            </View>
            <Text className="text-blue-500 text-xs font-semibold">Select</Text>
          </TouchableOpacity>
        </View>

        {/* To Account Card */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-gray-500 mb-2">To</Text>
          <TouchableOpacity
            className="bg-blue-50 rounded-xl p-4 flex-row items-center justify-between shadow-sm shadow-blue-500/10"
            onPress={() => selectAccount("to")}
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center mr-4">
                <Text className="text-xl">
                  {accounts[toAccount as keyof typeof accounts]?.icon || "💰"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-black mb-1">
                  {toAccount}
                </Text>
                <Text className="text-sm text-gray-500">
                  Balance: $
                  {accounts[toAccount as keyof typeof accounts]?.balance || 0}
                </Text>
              </View>
            </View>
            <Text className="text-blue-500 text-xs font-semibold">Select</Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-gray-500 mb-2">
            Amount
          </Text>
          <TouchableOpacity
            className="bg-blue-50 rounded-xl p-6 flex-row items-center justify-center shadow-sm shadow-blue-500/10"
            onPress={() => setShowKeypad(!showKeypad)}
          >
            <Text className="text-2xl font-semibold text-blue-500 mr-2">$</Text>
            <Text className="text-3xl font-bold text-black">
              {amount || "0"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Numeric Keypad */}
        {showKeypad && (
          <View className="bg-blue-50 rounded-xl p-4 mb-5">
            {keypadNumbers.map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row justify-between mb-3">
                {row.map((key, keyIndex) => (
                  <TouchableOpacity
                    key={keyIndex}
                    className="w-20 h-12 rounded-lg bg-white items-center justify-center shadow-sm shadow-blue-500/10"
                    onPress={() => handleKeypadPress(key)}
                  >
                    <Text className="text-xl font-semibold text-blue-500">
                      {key}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Note Input */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-gray-500 mb-2">
            Note (Optional)
          </Text>
          <TextInput
            className="bg-blue-50 rounded-lg p-4 text-base text-black h-20 text-align-top"
            placeholder="Enter a note..."
            placeholderTextColor="#555555"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* Date Button */}
        <View className="mb-5">
          <Text className="text-sm font-semibold text-gray-500 mb-2">Date</Text>
          <TouchableOpacity className="bg-blue-50 rounded-lg p-4 items-center">
            <Text className="text-base font-semibold text-blue-500">Today</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Transfer Button */}
      <View className="p-5 bg-white">
        <TouchableOpacity
          className={`rounded-lg py-4 items-center ${amount ? "bg-blue-500" : "bg-blue-200"}`}
          onPress={handleTransfer}
          disabled={!amount}
        >
          <Text className="text-white text-base font-semibold">Send Money</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Transfer History Screen Component
export function TransferHistoryScreen() {
  const router = useRouter();

  const transferHistory = [
    {
      id: "1",
      type: "Transfer",
      from: "somnet",
      to: "hormuud",
      amount: 50,
      date: "2025-08-15",
      time: "19:22",
      status: "completed",
      note: "Rent",
    },
    {
      id: "2",
      type: "Transfer",
      from: "hormuud",
      to: "somnet",
      amount: 25,
      date: "2025-08-14",
      time: "14:30",
      status: "completed",
      note: "Lunch money",
    },
    {
      id: "3",
      type: "Transfer",
      from: "somnet",
      to: "hormuud",
      amount: 100,
      date: "2025-08-13",
      time: "09:15",
      status: "pending",
      note: "Utilities",
    },
  ];

  const renderTransferItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-blue-50 rounded-xl p-4 mb-3 flex-row items-center shadow-sm shadow-blue-500/10"
      onPress={() => router.push(`/(transfer)/TransferDetailsScreen${item.id}`)}
    >
      <View className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center mr-4">
        <Text className="text-xl">💸</Text>
      </View>

      <View className="flex-1">
        <Text className="text-base font-semibold text-black mb-1">
          {item.from} → {item.to}
        </Text>
        <Text className="text-sm text-gray-500">
          {item.date} • {item.time}
        </Text>
        {item.note && (
          <Text className="text-xs text-gray-500 italic">{item.note}</Text>
        )}
      </View>

      <View className="items-end">
        <Text className="text-base font-bold text-blue-500 mb-1">
          ${item.amount}
        </Text>
        <View
          className={`px-2 py-1 rounded-full ${
            item.status === "completed" ? "bg-blue-50" : "bg-yellow-100"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              item.status === "completed" ? "text-blue-500" : "text-yellow-800"
            }`}
          >
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-5 py-4 bg-blue-50">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-2xl text-blue-500 font-semibold">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-black">
          Transfer History
        </Text>
        <View className="w-6" />
      </View>

      <View className="flex-1 p-5">
        <Text className="text-base font-semibold text-black mb-4">
          Recent Transfers
        </Text>

        <FlatList
          data={transferHistory}
          renderItem={renderTransferItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </View>
  );
}
