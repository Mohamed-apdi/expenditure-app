import { useState, useEffect } from "react";
import { TouchableOpacity, Text, View, FlatList } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { fetchAccounts, type Account } from "~/lib/accounts";
import { useTheme } from "~/lib/theme";

export function WalletDropdown() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const fetchedAccounts = await fetchAccounts();
        setAccounts(fetchedAccounts);
        if (fetchedAccounts.length > 0) {
          setSelectedAccount(fetchedAccounts[0]);
        }
      } catch (error) {
        console.error("Failed to load accounts:", error);
      }
    };

    loadAccounts();
  }, []);

  return (
    <View className="relative">
      {/* Wallet dropdown button */}
      <TouchableOpacity
        className="flex-row items-center mx-3"
        onPress={() => setIsDropdownOpen(!isDropdownOpen)}
        activeOpacity={0.7}
      >
        <Text className="text-xl font-bold text-white pr-2">
          {selectedAccount?.name || "Hormuud"}
        </Text>
        <ChevronDown size={16} color="#fff" className="ml-1" />
      </TouchableOpacity>

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
                <Text className="text-base font-medium text-gray-800">
                  {item.name}
                </Text>
                <Text className="text-sm text-gray-500">
                  {item.amount.toFixed(2)} {item.type}
                </Text>
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
