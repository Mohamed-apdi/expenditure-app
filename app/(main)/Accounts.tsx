import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { MoreHorizontal } from "lucide-react-native";
import AddAccount from "../account-details/add-account";

type Account = {
  id: string;
  group: string;
  name: string;
  amount: number;
  description?: string;
  visible?: boolean;
};

type AccountGroup = {
  id: string;
  name: string;
};

const accountGroups: AccountGroup[] = [
  { id: "1", name: "Cash" },
  { id: "2", name: "Accounts" },
  { id: "3", name: "Card" },
  { id: "4", name: "Debit Card" },
  { id: "5", name: "Savings" },
  { id: "6", name: "Top-Up/Prepaid" },
  { id: "7", name: "Investments" },
  { id: "8", name: "Overdrafts" },
  { id: "9", name: "Loan" },
  { id: "10", name: "Insurance" },
  { id: "11", name: "Others" },
];

const Accounts = () => {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([
    { id: "1", group: "Cash", name: "Cash", amount: 560.0, visible: true },
    { id: "2", group: "Cash", name: "Evc", amount: 560.0, visible: true },
    { id: "3", group: "Accounts", name: "Accounts", amount: 5.0, visible: true },
    { id: "4", group: "Card", name: "Card", amount: 0.0, visible: true },
    { id: "5", group: "Investments", name: "Somnet", amount: 500.0, visible: true },
  ]);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Calculate totals for visible accounts only
  const assets = accounts
    .filter(a => ["Cash", "Accounts", "Investments"].includes(a.group) && a.visible)
    .reduce((sum, a) => sum + a.amount, 0);

  const liabilities = accounts
    .filter(a => ["Card", "Loan"].includes(a.group) && a.visible)
    .reduce((sum, a) => sum + a.amount, 0);

  const total = assets - liabilities;

  const handleAddAccount = (newAccount: Account) => {
    setAccounts([...accounts, { ...newAccount, visible: true }]);
    setShowAddAccount(false);
  };

  const handleAccountPress = (accountId: string) => {
    router.push({
      pathname: "/account-details/[id]",
      params: { id: accountId }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
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

          {/* Dropdown menu */}
          {showMenu && (
            <View className="absolute right-0 top-12 bg-slate-800 rounded-lg border border-slate-700 z-10 w-48">
              <TouchableOpacity
                className="flex-row items-center px-4 py-3"
                onPress={() => {
                  setShowMenu(false);
                  setShowAddAccount(true);
                }}
              >
                <Text className="text-white">Add Account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center px-4 py-3"
                onPress={() => {
                  setShowMenu(false);
                  router.push({
                    pathname: "/account-details/account-visibility",
                    params: { accounts: JSON.stringify(accounts) }
                  });
                }}
              >
                <Text className="text-white">Show/Hide Accounts</Text>
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
          .filter(group => accounts.some(account => 
            account.group === group.name && account.visible
          ))
          .map(group => (
            <View key={group.id} className="mb-6">
              <Text className="text-white font-bold mb-3">{group.name}</Text>
              <View className="gap-2">
                {accounts
                  .filter(account => account.group === group.name && account.visible)
                  .map(account => (
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
                        ${account.amount.toFixed(2)}
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