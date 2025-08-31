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
import { useLanguage } from "~/lib";

type AccountGroup = {
  id: string;
  name: string;
};

type AddAccountProps = {
  visible: boolean;
  onClose: () => void;
  onAddAccount: (account: {
    account_type: string; // Changed from group_name
    name: string;
    amount: number;
    description?: string;
  }) => void;
  accountGroups: AccountGroup[];
};

const AddAccount = ({
  visible,
  onClose,
  onAddAccount,
  accountGroups,
}: AddAccountProps) => {
  const { t } = useLanguage();
  const [showGroupModal, setShowGroupModal] = useState(false);
  // Removed showTypeModal state
  const [newAccount, setNewAccount] = useState({
    account_type: "", // Changed from group_name
    name: "",
    amount: 0,
    description: "",
  });

  // Removed accountTypes array

  const handleAddAccount = () => {
    if (!newAccount.account_type || !newAccount.name) {
      // Changed from group_name
      // Add validation/error handling
      return;
    }

    onAddAccount({
      account_type: newAccount.account_type, // Changed from group_name
      name: newAccount.name,
      amount: newAccount.amount || 0,
      description: newAccount.description,
      // Removed type field
    });

    setNewAccount({
      account_type: "", // Changed from group_name
      name: "",
      amount: 0,
      description: "",
      // Removed type field
    });
  };

  return (
    <Modal visible={visible} animationType="fade">
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
          <Text className="text-gray-900 text-xl font-bold">
            {t.addAccount}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-6">
          {/* Group Input */}
          <View className="mb-5">
            <Text className="text-gray-700 mb-2 font-medium">
              {t.accountType}
            </Text>
            <TouchableOpacity
              className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex-row justify-between items-center"
              onPress={() => setShowGroupModal(true)}
            >
              <Text
                className={
                  newAccount.account_type ? "text-gray-900" : "text-gray-400"
                }
              >
                {newAccount.account_type || t.selectGroup}
              </Text>
              <ChevronDown size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View className="mb-5">
            <Text className="text-gray-700 mb-2 font-medium">{t.name}</Text>
            <TextInput
              className="border border-gray-200 rounded-xl p-4 bg-gray-50"
              placeholder={t.accountName}
              placeholderTextColor="#9CA3AF"
              value={newAccount.name}
              onChangeText={(text) =>
                setNewAccount({ ...newAccount, name: text })
              }
            />
          </View>

          {/* Amount Input */}
          <View className="mb-5">
            <Text className="text-gray-700 mb-2 font-medium">{t.amount}</Text>
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
            <Text className="text-gray-700 mb-2 font-medium">
              {t.description}
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl p-4 bg-gray-50"
              placeholder={t.optionalDescription}
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
            <Text className="text-white font-medium text-lg">
              {t.saveAccount}
            </Text>
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
                <Text className="text-gray-900 font-bold text-lg">
                  {t.selectGroup}
                </Text>
              </View>
              <FlatList
                data={accountGroups}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`px-6 py-4 flex-row justify-between items-center ${
                      newAccount.account_type === item.name ? "bg-blue-50" : ""
                    }`}
                    onPress={() => {
                      setNewAccount({ ...newAccount, account_type: item.name });
                      setShowGroupModal(false);
                    }}
                  >
                    <Text className="text-gray-900">
                      {item.name === "Cash"
                        ? t.cash
                        : item.name === "SIM Card"
                          ? t.simCard
                          : item.name === "Debit Card"
                            ? t.debitCard
                            : item.name === "Savings"
                              ? t.savings
                              : item.name === "Top-Up/Prepaid"
                                ? t.topup
                                : item.name === "Investments"
                                  ? t.investments
                                  : item.name === "Overdrafts"
                                    ? t.overdrafts
                                    : item.name === "Loan"
                                      ? t.loan
                                      : item.name === "Insurance"
                                        ? t.insurance
                                        : item.name === "Card"
                                          ? t.card
                                          : item.name === "Others"
                                            ? t.others
                                            : item.name}
                    </Text>
                    {newAccount.account_type === item.name && (
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
