import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { X, Wallet } from "lucide-react-native";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import type { Account } from "~/lib";

interface AccountSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: Account[];
  selectedAccount: Account | null;
  onSelectAccount: (account: Account) => void;
  title: string;
  selectionType: "from" | "to";
}

export default function AccountSelectionModal({
  visible,
  onClose,
  accounts,
  selectedAccount,
  onSelectAccount,
  title,
  selectionType,
}: AccountSelectionModalProps) {
  const theme = useTheme();
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="bg-white rounded-2xl p-6 w-full max-w-md">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="font-bold text-xl text-gray-900">{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-[400px]">
            <View className="flex-row flex-wrap justify-between">
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  className={`w-1/2 p-4 items-center ${
                    selectedAccount?.id === account.id
                      ? selectionType === "from"
                        ? "bg-blue-50 rounded-lg"
                        : "bg-green-50 rounded-lg"
                      : ""
                  }`}
                  onPress={() => {
                    onSelectAccount(account);
                    onClose();
                  }}
                >
                  <View
                    className="p-3 rounded-full mb-2"
                    style={{ backgroundColor: `${theme.primary}20` }}
                  >
                    <Wallet size={24} color={theme.primary} />
                  </View>
                  <Text className="text-xs text-gray-700 text-center">
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
