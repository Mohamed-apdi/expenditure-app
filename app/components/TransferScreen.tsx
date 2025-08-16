"use client";

import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, ChevronDown, Wallet, ArrowRight, Wallet2 } from "lucide-react-native";

export default function TransferScreen() {
  const router = useRouter();
  const [fromAccount, setFromAccount] = useState("somnet");
  const [toAccount, setToAccount] = useState("hormuud");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const accounts = {
    somnet: { balance: 160, icon: Wallet, color: "#3B82F6" },
    hormuud: { balance: 540, icon: Wallet2, color: "#10B981" },
  };

  const handleTransfer = () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (Number.parseFloat(amount) > accounts[fromAccount as keyof typeof accounts].balance) {
      Alert.alert("Error", "Insufficient balance");
      return;
    }

    const transferData = {
      id: "1",
      type: "Transfer",
      account: {
        from: fromAccount,
        to: toAccount,
      },
      amount: {
        from: Number.parseFloat(amount),
        to: Number.parseFloat(amount),
      },
      date: date.toISOString().split("T")[0],
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
              params: transferData,
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        className="flex-1 p-4" 
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Transfer Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900">Transfer Money</Text>
          <Text className="text-gray-500 mt-1">Move money between your accounts</Text>
        </View>

        {/* From Account Card */}
        <View className="mb-3">
          <Text className="text-sm font-medium text-gray-500 mb-2">From</Text>
          <TouchableOpacity
            className="bg-white rounded-xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100 active:bg-gray-50"
            onPress={() => selectAccount("from")}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center">
              <View 
                className="w-12 h-12 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${accounts[fromAccount as keyof typeof accounts]?.color}20` }}
              >
                {React.createElement(accounts[fromAccount as keyof typeof accounts].icon, {
                  size: 20,
                  color: accounts[fromAccount as keyof typeof accounts].color
                })}
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-900 capitalize">
                  {fromAccount}
                </Text>
                <Text className="text-sm text-gray-500">
                  Balance: ${accounts[fromAccount as keyof typeof accounts]?.balance.toFixed(2)}
                </Text>
              </View>
            </View>
            <ChevronDown size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Transfer Arrow */}
        <View className="items-center py-1">
          <View className="bg-blue-50 p-2 rounded-full border border-blue-100">
            <ArrowRight size={20} color="#3B82F6" />
          </View>
        </View>

        {/* To Account Card */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-2">To</Text>
          <TouchableOpacity
            className="bg-white rounded-xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100 active:bg-gray-50"
            onPress={() => selectAccount("to")}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center">
              <View 
                className="w-12 h-12 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${accounts[toAccount as keyof typeof accounts]?.color}20` }}
              >
                {React.createElement(accounts[toAccount as keyof typeof accounts].icon, {
                  size: 20,
                  color: accounts[toAccount as keyof typeof accounts].color
                })}
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-900 capitalize">
                  {toAccount}
                </Text>
                <Text className="text-sm text-gray-500">
                  Balance: ${accounts[toAccount as keyof typeof accounts]?.balance.toFixed(2)}
                </Text>
              </View>
            </View>
            <ChevronDown size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-2">Amount</Text>
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <View className="flex-row items-center">
              <Text className="text-lg font-semibold text-blue-500 mr-2">$</Text>
              <TextInput
                className="flex-1 text-2xl font-bold text-gray-900"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                autoFocus
                returnKeyType="done"
              />
            </View>
            {amount && (
              <Text className="text-xs text-gray-400 mt-1">
                Available: ${accounts[fromAccount as keyof typeof accounts]?.balance.toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        {/* Date Picker */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-2">Transfer Date</Text>
          <TouchableOpacity
            className="bg-white rounded-xl p-4 flex-row items-center justify-between shadow-sm border border-gray-100 active:bg-gray-50"
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-lg bg-blue-50 items-center justify-center mr-3">
                <Calendar size={18} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-base text-gray-900 font-medium">
                  {formatDate(date)}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  {date.toLocaleDateString('en-US', { weekday: 'long' })}
                </Text>
              </View>
            </View>
            <ChevronDown size={18} color="#6b7280" />
          </TouchableOpacity>

          {showDatePicker && (
            <Modal
              transparent={true}
              animationType="slide"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View className="flex-1 justify-end bg-black/30">
                <View className="bg-white rounded-t-3xl p-5 pt-3 pb-6">
                  {/* Date Picker */}
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "calendar"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(2020, 0, 1)}
                    themeVariant="light"
                    accentColor="#3B82F6"
                    textColor="#000000"
                    style={{
                      backgroundColor: "white",
                      ...(Platform.OS === "android" && { 
                        width: '100%',
                        height: 180 
                      })
                    }}
                  />
                </View>
              </View>
            </Modal>
          )}
        </View>

        {/* Note Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-2">
            Note (Optional)
          </Text>
          <TextInput
            className="bg-white rounded-xl p-4 text-base text-gray-900 h-24 text-align-top shadow-sm border border-gray-100"
            placeholder="Add a note..."
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            multiline
            blurOnSubmit
            returnKeyType="done"
          />
        </View>
      </ScrollView>

      {/* Transfer Button */}
      <View className="p-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          className={`rounded-xl py-4 items-center justify-center ${amount ? "bg-blue-600" : "bg-gray-300"}`}
          onPress={handleTransfer}
          disabled={!amount}
          activeOpacity={0.9}
        >
          <Text className="text-white text-lg font-semibold">Transfer Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}