import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Eye, EyeOff } from "lucide-react-native";

type Account = {
  id: string;
  group: string;
  name: string;
  amount: number;
  visible: boolean;
};

const AccountVisibility = () => {
  const router = useRouter();
  const { accounts: accountsParam } = useLocalSearchParams();
  
  // Initialize with passed accounts or empty array
  const [accounts, setAccounts] = useState<Account[]>(
    accountsParam ? JSON.parse(accountsParam as string) : []
  );

  const toggleVisibility = (accountId: string) => {
    const updatedAccounts = accounts.map(account => 
      account.id === accountId 
        ? { ...account, visible: !account.visible } 
        : account
    );
    setAccounts(updatedAccounts);
  };

  const saveAndGoBack = () => {
    router.push({
      pathname: "/accounts",
      params: { updatedAccounts: JSON.stringify(accounts) }
    });
  };

  // Group accounts by their group
  const groupedAccounts = accounts.reduce((groups, account) => {
    if (!groups[account.group]) {
      groups[account.group] = [];
    }
    groups[account.group].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-12 pb-4 border-b border-slate-700">
        <TouchableOpacity onPress={saveAndGoBack}>
          <ChevronLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-4">Show/Hide Setting</Text>
      </View>

      {/* Accounts List */}
      <ScrollView className="flex-1 px-6">
        {Object.entries(groupedAccounts).map(([groupName, groupAccounts]) => (
          <View key={groupName} className="mb-4">
            <Text className="text-white font-bold text-lg mb-2">{groupName}</Text>
            <View className="bg-slate-800 rounded-lg border border-slate-700">
              {groupAccounts.map(account => (
                <View 
                  key={account.id} 
                  className="flex-row justify-between items-center px-4 py-3 border-b border-slate-700 last:border-b-0"
                >
                  <View className="flex-1">
                    <Text className="text-white">{account.name}</Text>
                    <Text className={`text-sm ${
                      account.amount >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}>
                      ${account.amount.toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => toggleVisibility(account.id)}
                    className="p-2"
                  >
                    {account.visible ? (
                      <Eye size={20} color="#ffffff" />
                    ) : (
                      <EyeOff size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountVisibility;