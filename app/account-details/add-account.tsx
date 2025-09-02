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
import { useTheme } from "~/lib";

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
  const theme = useTheme();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.cardBackground }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 24,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            {t.addAccount}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
          {/* Group Input */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: theme.text,
                marginBottom: 8,
                fontWeight: "500",
              }}
            >
              {t.accountType}
            </Text>
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 16,
                backgroundColor: theme.inputBackground,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onPress={() => setShowGroupModal(true)}
            >
              <Text
                style={{
                  color: newAccount.account_type ? theme.text : theme.textMuted,
                }}
              >
                {newAccount.account_type || t.selectGroup}
              </Text>
              <ChevronDown size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: theme.text,
                marginBottom: 8,
                fontWeight: "500",
              }}
            >
              {t.name}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 16,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              }}
              placeholder={t.accountName}
              placeholderTextColor={theme.placeholder}
              value={newAccount.name}
              onChangeText={(text) =>
                setNewAccount({ ...newAccount, name: text })
              }
            />
          </View>

          {/* Amount Input */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: theme.text,
                marginBottom: 8,
                fontWeight: "500",
              }}
            >
              {t.amount}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.inputBackground,
              }}
            >
              <View style={{ paddingHorizontal: 16 }}>
                <DollarSign size={18} color={theme.textMuted} />
              </View>
              <TextInput
                style={{
                  flex: 1,
                  padding: 16,
                  color: theme.text,
                }}
                placeholder="0.00"
                placeholderTextColor={theme.placeholder}
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
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: theme.text,
                marginBottom: 8,
                fontWeight: "500",
              }}
            >
              {t.description}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 16,
                backgroundColor: theme.inputBackground,
                color: theme.text,
              }}
              placeholder={t.optionalDescription}
              placeholderTextColor={theme.placeholder}
              value={newAccount.description}
              onChangeText={(text) =>
                setNewAccount({ ...newAccount, description: text })
              }
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 24,
              marginBottom: 32,
            }}
            onPress={handleAddAccount}
          >
            <Text
              style={{
                color: theme.primaryText,
                fontWeight: "500",
                fontSize: 18,
              }}
            >
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
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 16,
                maxHeight: "80%",
              }}
            >
              <View
                style={{
                  padding: 24,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "bold",
                    fontSize: 18,
                  }}
                >
                  {t.selectGroup}
                </Text>
              </View>
              <FlatList
                data={accountGroups}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 16,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor:
                        newAccount.account_type === item.name
                          ? `${theme.primary}20`
                          : "transparent",
                    }}
                    onPress={() => {
                      setNewAccount({ ...newAccount, account_type: item.name });
                      setShowGroupModal(false);
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text,
                      }}
                    >
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
                      <Check size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 384 }}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

export default AddAccount;
