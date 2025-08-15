import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
  FlatList,
} from "react-native";
import { X, ChevronDown, Check } from "lucide-react-native";

type AccountGroup = {
  id: string;
  name: string;
};

type AddAccountProps = {
  visible: boolean;
  onClose: () => void;
  onAddAccount: (account: {
    group_name: string;
    name: string;
    amount: number;
    description?: string;
    type?: "asset" | "liability";
  }) => void;
  accountGroups: AccountGroup[];
};

const AddAccount = ({
  visible,
  onClose,
  onAddAccount,
  accountGroups,
}: AddAccountProps) => {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    group_name: "",
    name: "",
    amount: 0,
    description: "",
    type: undefined as "asset" | "liability" | undefined,
  });

  const accountTypes = [
    { id: "asset", name: "Asset" },
    { id: "liability", name: "Liability" },
  ];

  const handleAddAccount = () => {
    if (!newAccount.group_name || !newAccount.name) {
      // Add validation/error handling
      return;
    }

    onAddAccount({
      group_name: newAccount.group_name,
      name: newAccount.name,
      amount: newAccount.amount || 0,
      description: newAccount.description,
      type: newAccount.type,
    });

    setNewAccount({
      group_name: "",
      name: "",
      amount: 0,
      description: "",
      type: undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
          <Text className="text-white text-xl font-bold">Add Account</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-6">
          {/* Group Input */}
          <View className="mb-5">
            <Text className="text-slate-400 text-sm font-semibold mb-2">
              Group
            </Text>
            <TouchableOpacity
              className="flex-row justify-between items-center bg-slate-800 rounded-xl border border-slate-700 px-4 py-4"
              onPress={() => setShowGroupModal(true)}
            >
              <Text
                className={`${
                  newAccount.group_name ? "text-white" : "text-slate-500"
                }`}
              >
                {newAccount.group_name || "Select group"}
              </Text>
              <ChevronDown size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Type Input */}
          <View className="mb-5">
            <Text className="text-slate-400 text-sm font-semibold mb-2">
              Type
            </Text>
            <TouchableOpacity
              className="flex-row justify-between items-center bg-slate-800 rounded-xl border border-slate-700 px-4 py-4"
              onPress={() => setShowTypeModal(true)}
            >
              <Text
                className={`${
                  newAccount.type ? "text-white" : "text-slate-500"
                }`}
              >
                {newAccount.type
                  ? newAccount.type === "asset"
                    ? "Asset"
                    : "Liability"
                  : "Select type"}
              </Text>
              <ChevronDown size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View className="mb-5">
            <Text className="text-slate-400 text-sm font-semibold mb-2">
              Name
            </Text>
            <TextInput
              className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-4 text-white"
              placeholder="Account name"
              placeholderTextColor="#64748b"
              value={newAccount.name}
              onChangeText={(text) =>
                setNewAccount({ ...newAccount, name: text })
              }
            />
          </View>

          {/* Amount Input */}
          <View className="mb-5">
            <Text className="text-slate-400 text-sm font-semibold mb-2">
              Amount
            </Text>
            <View className="flex-row items-center bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <Text className="text-white pl-4">$</Text>
              <TextInput
                className="flex-1 py-4 px-4 text-white"
                placeholder="0.00"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={
                  newAccount.amount !== undefined && !isNaN(newAccount.amount)
                    ? newAccount.amount.toString()
                    : ""
                }
                onChangeText={(text) => {
                  const cleanedText = text.replace(/[^0-9.]/g, "");
                  const decimalParts = cleanedText.split(".");
                  let formattedValue = decimalParts[0];

                  if (decimalParts.length > 1) {
                    formattedValue +=
                      "." + decimalParts.slice(1).join("").substring(0, 2);
                  }

                  const numericValue = formattedValue
                    ? parseFloat(formattedValue)
                    : 0;

                  setNewAccount({
                    ...newAccount,
                    amount: numericValue,
                  });
                }}
              />
            </View>
          </View>

          {/* Description Input */}
          <View className="mb-5">
            <Text className="text-slate-400 text-sm font-semibold mb-2">
              Description
            </Text>
            <TextInput
              className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-4 text-white"
              placeholder="Optional description"
              placeholderTextColor="#64748b"
              value={newAccount.description}
              onChangeText={(text) =>
                setNewAccount({ ...newAccount, description: text })
              }
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            className="bg-emerald-500 py-4 rounded-xl items-center mt-6 mb-8"
            onPress={handleAddAccount}
          >
            <Text className="text-white font-bold">Save</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Group Selection Modal */}
        <Modal
          visible={showGroupModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowGroupModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center px-6">
            <View className="bg-slate-800 rounded-xl border border-slate-700 max-h-[80%]">
              <View className="p-4 border-b border-slate-700">
                <Text className="text-white font-bold">Select Group</Text>
              </View>
              <FlatList
                data={accountGroups}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`px-4 py-3 flex-row justify-between items-center ${
                      newAccount.group_name === item.name ? "bg-slate-700" : ""
                    }`}
                    onPress={() => {
                      setNewAccount({ ...newAccount, group_name: item.name });
                      setShowGroupModal(false);
                    }}
                  >
                    <Text className="text-white">{item.name}</Text>
                    {newAccount.group_name === item.name && (
                      <Check size={20} color="#10b981" />
                    )}
                  </TouchableOpacity>
                )}
                className="max-h-96"
              />
            </View>
          </View>
        </Modal>

        {/* Type Selection Modal */}
        <Modal
          visible={showTypeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTypeModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center px-6">
            <View className="bg-slate-800 rounded-xl border border-slate-700 max-h-[80%]">
              <View className="p-4 border-b border-slate-700">
                <Text className="text-white font-bold">Select Type</Text>
              </View>
              <FlatList
                data={accountTypes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`px-4 py-3 flex-row justify-between items-center ${
                      newAccount.type === item.id ? "bg-slate-700" : ""
                    }`}
                    onPress={() => {
                      setNewAccount({
                        ...newAccount,
                        type: item.id as "asset" | "liability",
                      });
                      setShowTypeModal(false);
                    }}
                  >
                    <Text className="text-white">{item.name}</Text>
                    {newAccount.type === item.id && (
                      <Check size={20} color="#10b981" />
                    )}
                  </TouchableOpacity>
                )}
                className="max-h-96"
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

export default AddAccount;
