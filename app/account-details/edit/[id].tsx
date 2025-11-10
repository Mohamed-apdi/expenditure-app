import React, { useState, useEffect } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { X, ChevronDown, Check, DollarSign } from "lucide-react-native";
import { supabase } from "~/lib";
import { updateAccount, fetchAccounts } from "~/lib";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

type AccountGroup = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  user_id: string;
  account_type: string;
  name: string;
  amount: number;
  description?: string;
  created_at: string;
  updated_at: string;
  group_id?: string;
  is_default: boolean;
  currency: string;
};

const accountGroups: AccountGroup[] = [
  { id: "1", name: "Cash" },
  { id: "2", name: "Accounts" },
  { id: "3", name: "SIM Card" },
  { id: "4", name: "Debit Card" },
  { id: "5", name: "Savings" },
  { id: "6", name: "Top-Up/Prepaid" },
  { id: "7", name: "Investments" },
  { id: "8", name: "Overdrafts" },
  { id: "9", name: "Loan" },
  { id: "10", name: "Insurance" },
  { id: "11", name: "Card" },
  { id: "12", name: "Others" },
];

export default function EditAccount() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    account_type: "",
    name: "",
    amount: 0,
    description: "",
  });

  useEffect(() => {
    loadAccount();
  }, [id]);

  const loadAccount = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Fetch account data
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (accountError) throw accountError;

      setAccount(accountData);
      setFormData({
        account_type: accountData.account_type || "",
        name: accountData.name || "",
        amount: accountData.amount || 0,
        description: accountData.description || "",
      });
    } catch (error) {
      console.error("Error loading account:", error);
      setError(t.failedToLoadAccount);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.account_type || !formData.name) {
      setError(t.pleaseFillRequiredFields);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (!account) return;

      const updatedAccount = await updateAccount(account.id, {
        account_type: formData.account_type,
        name: formData.name,
        amount: formData.amount,
        description: formData.description,
      });

      // Navigate back to account details
      router.back();
    } catch (error) {
      console.error("Error updating account:", error);
      setError(t.failedToUpdateAccount);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <Text style={{ color: theme.textSecondary }}>{t.loadingAccount}</Text>
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <Text style={{ color: theme.textSecondary }}>{t.accountNotFound}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 pt-safe"
      style={{ backgroundColor: theme.background }}
    >
      <View
        className="flex-row justify-between items-center p-6 border-b"
        style={{ borderColor: theme.border }}
      >
        <Text className="text-xl font-bold" style={{ color: theme.text }}>
          {t.editAccount}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {error && (
        <View
          className="border p-4 mx-6 mt-4 rounded-lg"
          style={{
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.text }}>{error}</Text>
        </View>
      )}

      <ScrollView className="flex-1 px-6 pt-6">
        {/* Group Input */}
        <View className="mb-5">
          <Text className="mb-2 font-medium" style={{ color: theme.text }}>
            {t.group}
          </Text>
          <TouchableOpacity
            className="border rounded-xl p-4 flex-row justify-between items-center"
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
            onPress={() => setShowGroupModal(true)}
          >
            <Text
              className={formData.account_type ? "" : ""}
              style={{
                color: formData.account_type ? theme.text : theme.textMuted,
              }}
            >
              {formData.account_type || t.selectGroup}
            </Text>
            <ChevronDown size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Name Input */}
        <View className="mb-5">
          <Text className="mb-2 font-medium" style={{ color: theme.text }}>
            {t.name}
          </Text>
          <TextInput
            className="border rounded-xl p-4"
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              color: theme.text,
            }}
            placeholder={t.accountName}
            placeholderTextColor={theme.placeholder}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        {/* Amount Input */}
        <View className="mb-5">
          <Text className="mb-2 font-medium" style={{ color: theme.text }}>
            {t.amount}
          </Text>
          <View
            className="flex-row items-center border rounded-xl"
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
          >
            <View className="px-4">
              <DollarSign size={18} color="#6b7280" />
            </View>
            <TextInput
              className="flex-1 p-4"
              style={{ color: theme.text }}
              placeholder="0.00"
              placeholderTextColor={theme.placeholder}
              keyboardType="numeric"
              value={formData.amount.toString()}
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
                setFormData({ ...formData, amount: numericValue });
              }}
            />
          </View>
        </View>

        {/* Description Input */}
        <View className="mb-5">
          <Text className="mb-2 font-medium" style={{ color: theme.text }}>
            {t.description}
          </Text>
          <TextInput
            className="border rounded-xl p-4"
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              color: theme.text,
            }}
            placeholder={t.optionalDescription}
            placeholderTextColor={theme.placeholder}
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className="bg-blue-600 p-4 rounded-xl items-center mt-6 mb-8"
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white font-medium text-lg">
            {saving ? t.updating : t.updateAccount}
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
          <View
            className="rounded-2xl max-h-[80%]"
            style={{ backgroundColor: theme.cardBackground }}
          >
            <View
              className="flex-row justify-between items-center p-6 border-b"
              style={{ borderColor: theme.border }}
            >
              <Text className="font-bold text-lg" style={{ color: theme.text }}>
                {t.selectGroup}
              </Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
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
                      formData.account_type === item.name
                        ? `${theme.primary}20`
                        : "transparent",
                  }}
                  onPress={() => {
                    setFormData({ ...formData, account_type: item.name });
                    setShowGroupModal(false);
                  }}
                >
                  <Text style={{ color: theme.text }}>
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
                  {formData.account_type === item.name && (
                    <Check size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
              className="max-h-96"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
