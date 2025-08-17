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
import { supabase } from "~/lib/supabase";
import { updateAccount, fetchAccounts } from "~/lib/accounts";

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
      const { data: { user } } = await supabase.auth.getUser();
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
      setError("Failed to load account data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.account_type || !formData.name) {
      setError("Please fill in all required fields");
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
      setError("Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-600">Loading account...</Text>
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-600">Account not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row justify-between items-center p-6 border-b border-gray-100">
        <Text className="text-gray-900 text-xl font-bold">Edit Account</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {error && (
        <View className="bg-red-50 border border-red-200 p-4 mx-6 mt-4 rounded-lg">
          <Text className="text-red-600">{error}</Text>
        </View>
      )}

      <ScrollView className="flex-1 px-6 pt-6">
        {/* Group Input */}
        <View className="mb-5">
          <Text className="text-gray-700 mb-2 font-medium">Group</Text>
          <TouchableOpacity
            className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex-row justify-between items-center"
            onPress={() => setShowGroupModal(true)}
          >
            <Text className={formData.account_type ? "text-gray-900" : "text-gray-400"}>
              {formData.account_type || "Select group"}
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
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
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
              value={formData.amount.toString()}
              onChangeText={(text) => {
                const cleanedText = text.replace(/[^0-9.]/g, "");
                const decimalParts = cleanedText.split(".");
                let formattedValue = decimalParts[0];

                if (decimalParts.length > 1) {
                  formattedValue += "." + decimalParts.slice(1).join("").substring(0, 2);
                }

                const numericValue = formattedValue ? parseFloat(formattedValue) : 0;
                setFormData({ ...formData, amount: numericValue });
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
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className="bg-blue-600 p-4 rounded-xl items-center mt-6 mb-8"
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white font-medium text-lg">
            {saving ? "Updating..." : "Update Account"}
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
              <Text className="text-gray-900 font-bold text-lg">Select Group</Text>
            </View>
            <FlatList
              data={accountGroups}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`px-6 py-4 flex-row justify-between items-center ${
                    formData.account_type === item.name ? "bg-blue-50" : ""
                  }`}
                  onPress={() => {
                    setFormData({ ...formData, account_type: item.name });
                    setShowGroupModal(false);
                  }}
                >
                  <Text className="text-gray-900">{item.name}</Text>
                  {formData.account_type === item.name && (
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
  );
}