import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MoreHorizontal, X } from "lucide-react-native";
import AddAccount from "../account-details/add-account";
import { fetchAccounts, addAccount, Account } from "~/lib/accounts";
import { supabase } from "~/lib/supabase";

interface AccountGroup {
  id: string;
  name: string;
}

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

const Accounts = () => {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load accounts"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // Calculate totals
  const assets = accounts
    .filter((a) => a.type === "asset")
    .reduce((sum, a) => sum + (a.amount || 0), 0);

  const liabilities = accounts
    .filter((a) => a.type === "liability")
    .reduce((sum, a) => sum + (a.amount || 0), 0);

  const total = assets - liabilities;

  const handleAddAccount = async (
    newAccount: Omit<Account, "id" | "user_id" | "created_at" | "updated_at">
  ) => {
    try {
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to add an account");
      }

      const accountWithUser = {
        ...newAccount,
        user_id: user.id,
      };

      const createdAccount = await addAccount(accountWithUser);
      setAccounts((prev) => [...prev, createdAccount]);
      setShowAddAccount(false);
    } catch (error) {
      console.error("Failed to add account:", error);
      setError(
        error instanceof Error ? error.message : "Failed to add account"
      );
    }
  };

  const handleAccountPress = (accountId: string) => {
    router.push({
      pathname: "/account-details/[id]",
      params: { id: accountId },
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {error && (
        <View className="bg-red-500/20 border border-red-500 p-3 rounded-lg mx-6 mt-4">
          <Text className="text-red-500">{error}</Text>
          <TouchableOpacity
            onPress={() => setError(null)}
            className="absolute top-2 right-2"
          >
            <X size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-12 pb-5">
        <Text className="text-white text-2xl font-bold">Accounts</Text>
        <View className="relative">
          <TouchableOpacity
            className="bg-slate-800 w-10 h-10 rounded-full justify-center items-center"
            onPress={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal size={20} color="#ffffff" />
          </TouchableOpacity>

          {showMenu && (
            <View className="absolute right-0 top-12 bg-slate-800 rounded-lg border border-slate-700 z-10 w-48 shadow-lg">
              <TouchableOpacity
                className="px-4 py-3 border-b border-slate-700"
                onPress={() => {
                  setShowMenu(false);
                  setShowAddAccount(true);
                }}
              >
                <Text className="text-white">Add Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Summary Cards */}
      <View className="flex-row px-6 mb-5 gap-3">
        <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
          <Text className="text-slate-400 text-sm mb-1">Assets</Text>
          <Text className="text-emerald-500 text-xl font-bold">
            ${assets.toFixed(2)}
          </Text>
        </View>
        <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
          <Text className="text-slate-400 text-sm mb-1">Liabilities</Text>
          <Text className="text-rose-500 text-xl font-bold">
            ${liabilities.toFixed(2)}
          </Text>
        </View>
        <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
          <Text className="text-slate-400 text-sm mb-1">Total</Text>
          <Text
            className={`text-xl font-bold ${
              total >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            ${total.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Accounts List */}
      <ScrollView className="flex-1 px-6 pb-20">
        {accountGroups
          .filter((group) =>
            accounts.some((account) => account.group_name === group.name)
          )
          .map((group) => (
            <View key={group.id} className="mb-6">
              <Text className="text-white font-bold mb-3">{group.name}</Text>
              <View className="gap-2">
                {accounts
                  .filter((account) => account.group_name === group.name)
                  .map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      className="flex-row bg-slate-800 p-4 rounded-xl border border-slate-700 items-center"
                      onPress={() => handleAccountPress(account.id)}
                    >
                      <View className="flex-1">
                        <Text className="text-white font-medium">
                          {account.name}
                        </Text>
                        {account.description && (
                          <Text className="text-slate-500 text-xs mt-1">
                            {account.description}
                          </Text>
                        )}
                      </View>
                      <Text
                        className={`font-bold ${
                          account.amount >= 0
                            ? "text-emerald-500"
                            : "text-rose-500"
                        }`}
                      >
                        ${account.amount?.toFixed(2) || "0.00"}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          ))}
      </ScrollView>

      {/* Add Account Modal */}
      <AddAccount
        visible={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        onAddAccount={handleAddAccount}
        accountGroups={accountGroups}
      />
    </SafeAreaView>
  );
};

export default Accounts;
