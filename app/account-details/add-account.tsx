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
import { X, ChevronDown, Check, DollarSign } from "lucide-react-native";

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
    <Modal visible={visible} animationType="fade">
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
          <Text className="text-gray-900 text-xl font-bold">Add Account</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-6">
          {/* Group Input */}
          <View className="mb-5">
            <Text className="text-gray-700 mb-2 font-medium">Group</Text>
            <TouchableOpacity
              className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex-row justify-between items-center"
              onPress={() => setShowGroupModal(true)}
            >
              <Text className={newAccount.group_name ? "text-gray-900" : "text-gray-400"}>
                {newAccount.group_name || "Select group"}
              </Text>
              <ChevronDown size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Type Input */}
          <View className="mb-5">
            <Text className="text-gray-700 mb-2 font-medium">Type</Text>
            <TouchableOpacity
              className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex-row justify-between items-center"
              onPress={() => setShowTypeModal(true)}
            >
              <Text className={newAccount.type ? "text-gray-900" : "text-gray-400"}>
                {newAccount.type
                  ? newAccount.type === "asset"
                    ? "Asset"
                    : "Liability"
                  : "Select type"}
              </Text>
              <ChevronDown size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View className="mb-5">
            <Text className="text-gray-700 mb-2 font-medium">Name</Text>
            <TextInput
              className="border border-gray-200 rounded-xl p-4 bg-gray-50"
              placeholder="Account name"
              placeholderTextColor="#9CA3AF"
              value={newAccount.name}
              onChangeText={(text) =>
                setNewAccount({ ...newAccount, name: text })
              }
            />
          </View>

          {/* Amount Input */}
          <View className="mb-5">
            <Text className="text-gray-700 mb-2 font-medium">Amount</Text>
            <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
              <View className="px-4">
                <DollarSign size={18} color="#6b7280" />
              </View>
              <TextInput
                className="flex-1 p-4"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
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
            <Text className="text-gray-700 mb-2 font-medium">Description</Text>
            <TextInput
              className="border border-gray-200 rounded-xl p-4 bg-gray-50"
              placeholder="Optional description"
              placeholderTextColor="#9CA3AF"
              value={newAccount.description}
              onChangeText={(text) =>
                setNewAccount({ ...newAccount, description: text })
              }
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            className="bg-blue-600 p-4 rounded-xl items-center mt-6 mb-8"
            onPress={handleAddAccount}
          >
            <Text className="text-white font-medium text-lg">Save Account</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Group Selection Modal */}
        <Modal
          visible={showGroupModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowGroupModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center p-4">
            <View className="bg-white rounded-2xl max-h-[80%]">
              <View className="p-6 border-b border-gray-100">
                <Text className="text-gray-900 font-bold text-lg">Select Group</Text>
              </View>
              <FlatList
                data={accountGroups}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`px-6 py-4 flex-row justify-between items-center ${
                      newAccount.group_name === item.name ? "bg-blue-50" : ""
                    }`}
                    onPress={() => {
                      setNewAccount({ ...newAccount, group_name: item.name });
                      setShowGroupModal(false);
                    }}
                  >
                    <Text className="text-gray-900">{item.name}</Text>
                    {newAccount.group_name === item.name && (
                      <Check size={20} color="#3b82f6" />
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
          <View className="flex-1 bg-black/50 justify-center p-4">
            <View className="bg-white rounded-2xl max-h-[80%]">
              <View className="p-6 border-b border-gray-100">
                <Text className="text-gray-900 font-bold text-lg">Select Type</Text>
              </View>
              <FlatList
                data={accountTypes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`px-6 py-4 flex-row justify-between items-center ${
                      newAccount.type === item.id ? "bg-blue-50" : ""
                    }`}
                    onPress={() => {
                      setNewAccount({
                        ...newAccount,
                        type: item.id as "asset" | "liability",
                      });
                      setShowTypeModal(false);
                    }}
                  >
                    <Text className="text-gray-900">{item.name}</Text>
                    {newAccount.type === item.id && (
                      <Check size={20} color="#3b82f6" />
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