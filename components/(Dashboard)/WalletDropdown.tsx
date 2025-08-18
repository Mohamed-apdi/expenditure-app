import { useState, useEffect } from "react";
import { TouchableOpacity, Text, View, FlatList } from "react-native";
import { ChevronDown, Loader } from "lucide-react-native";
import { useTheme } from "~/lib/theme";

export function WalletDropdown() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const {
    selectedAccount,
    setSelectedAccount,
    accounts,
    loading,
    refreshAccounts,
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

  // Auto-refresh accounts when component mounts or when accounts are empty
  useEffect(() => {
    // Always try to refresh accounts when component mounts
    if (accounts.length === 0) {
      console.log("WalletDropdown - Component mounted, refreshing accounts");
      refreshAccounts();
    }
  }, []); // Only run once when component mounts

  // Auto-refresh accounts when accounts array is empty and not loading
  useEffect(() => {
    if (accounts.length === 0 && !loading) {
      console.log("WalletDropdown - Auto-refreshing accounts");
      refreshAccounts();

      // Set up a timer to keep trying if accounts are still empty
      const timer = setTimeout(() => {
        if (accounts.length === 0 && !loading) {
          console.log("WalletDropdown - Retrying account refresh after delay");
          refreshAccounts();
        }
      }, 2000); // Wait 2 seconds before retrying

      return () => clearTimeout(timer);
    }
  }, [accounts.length, loading, refreshAccounts]);

  // Remove the immediate refresh logic that was causing issues
  // Accounts are now auto-loaded by AccountContext

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

  // Show loading state while accounts are being fetched
  if (loading) {
    return (
      <View className="flex-row items-center mx-3">
        <Loader size={20} color="white" className="animate-spin" />
      </View>
    );
  }

  // If we have accounts but no selected account, show the first account
  const displayAccount = selectedAccount || accounts[0];
  if (!displayAccount) {
    return (
      <View className="flex-row items-center mx-3">
        <Loader size={20} color="white" className="animate-spin" />
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
            {isSelecting ? (
              <Loader size={20} color="white" className="animate-spin" />
            ) : (
              displayAccount?.name || "Select Account"
            )}
          </Text>
          <ChevronDown size={16} color={theme.icon} className="ml-1" />
        </TouchableOpacity>
      </View>

      {/* Dropdown list */}
      {isDropdownOpen && (
        <View className="absolute top-10 left-3 right-3 bg-white rounded-lg shadow-lg z-50 max-h-60">
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="px-4 py-3 border-b border-gray-100"
                onPress={() => {
                  setSelectedAccount(item);
                  setIsDropdownOpen(false);
                }}
                activeOpacity={0.7}
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
