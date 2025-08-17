import { useState, useEffect } from "react";
import { TouchableOpacity, Text, View, FlatList } from "react-native";
import { ChevronDown, RefreshCw, DollarSign } from "lucide-react-native";
import { useTheme } from "~/lib/theme";
import { useAccount } from "~/lib/AccountContext";

export function WalletDropdown() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const {
    selectedAccount,
    setSelectedAccount,
    accounts,
    loading,
    refreshAccounts,
    refreshBalances,
  } = useAccount();
  const theme = useTheme();

  // Debug logging
  console.log(
    "WalletDropdown - loading:",
    loading,
    "accounts:",
    accounts.length,
    "selectedAccount:",
    selectedAccount?.name
  );

  // Immediate refresh if accounts are missing
  useEffect(() => {
    if (accounts.length === 0 && !loading) {
      console.log(
        "WalletDropdown - No accounts detected, triggering immediate refresh"
      );
      refreshAccounts();
    }
  }, [accounts.length, loading, refreshAccounts]);

  const handleAccountSelection = async (account: any) => {
    try {
      setIsSelecting(true);
      await setSelectedAccount(account);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Error selecting account:", error);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleRefreshBalances = async () => {
    try {
      setIsRefreshingBalances(true);
      await refreshBalances();
    } catch (error) {
      console.error("Error refreshing balances:", error);
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  // Show loading state while accounts are being fetched
  if (loading) {
    return (
      <View className="flex-row items-center mx-3">
        <RefreshCw size={20} color="white" className="animate-spin mr-2" />
        <Text className="text-xl font-bold text-white pr-2">Loading...</Text>
      </View>
    );
  }

  // Show "No Accounts" only when we're sure there are no accounts
  // and we're not in a loading state
  if (accounts.length === 0 && !loading) {
    console.log(
      "WalletDropdown - No accounts found, showing 'No Accounts' message"
    );
    return (
      <TouchableOpacity
        className="flex-row items-center mx-3"
        onPress={refreshAccounts}
        activeOpacity={0.7}
      >
        <RefreshCw size={20} color="white" className="mr-2" />
        <Text className="text-xl font-bold text-white pr-2">No Accounts</Text>
        <Text className="text-sm text-white opacity-70">(Tap to refresh)</Text>
      </TouchableOpacity>
    );
  }

  // If we have accounts but no selected account, show the first account
  const displayAccount = selectedAccount || accounts[0];
  if (!displayAccount) {
    return (
      <View className="flex-row items-center mx-3">
        <RefreshCw size={20} color="white" className="animate-spin mr-2" />
        <Text className="text-xl font-bold text-white pr-2">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="relative">
      {/* Wallet dropdown button with balance refresh */}
      <View className="flex-row items-center mx-3">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          activeOpacity={0.7}
          disabled={isSelecting}
        >
          <Text className="text-xl font-bold text-white pr-2">
            {isSelecting
              ? "Updating..."
              : displayAccount?.name || "Select Account"}
          </Text>
          <ChevronDown size={16} color={theme.icon} className="ml-1" />
        </TouchableOpacity>

        {/* Balance refresh button */}
        <TouchableOpacity
          className="ml-3 p-1"
          onPress={handleRefreshBalances}
          disabled={isRefreshingBalances}
          activeOpacity={0.7}
        >
          <RefreshCw
            size={16}
            color="white"
            className={isRefreshingBalances ? "animate-spin" : ""}
          />
        </TouchableOpacity>
      </View>

      {/* Dropdown list */}
      {isDropdownOpen && (
        <View className="absolute top-10 left-3 right-3 bg-white rounded-lg shadow-lg z-50 max-h-60 w-32">
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="px-4 py-3 "
                onPress={() => handleAccountSelection(item)}
                activeOpacity={0.7}
                disabled={isSelecting}
              >
                <View className="flex justify-between items-center">
                  <View className="flex-row items-center justify-between w-full">
                    <Text className="text-base font-medium text-gray-800">
                      {item.name}
                    </Text>
                    {item.is_default && (
                      <View className="w-2 h-2 bg-blue-500 rounded-full ml-2" />
                    )}
                  </View>
                  <View className="flex-col items-end">
                    <Text className="text-base font-semibold text-gray-900">
                      ${item.amount?.toFixed(2) || "0.00"}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {item.account_type}{" "}
                      {/* Changed from group_name to account_type */}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => (
              <View className="border-b border-gray-100" />
            )}
          />
        </View>
      )}
    </View>
  );
}
