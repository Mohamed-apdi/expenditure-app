import { useState, useEffect } from "react";
import { TouchableOpacity, Text, View, Modal, ScrollView } from "react-native";
import { ChevronDown, X } from "lucide-react-native";
import { useTheme } from "~/lib";
import { useAccount } from "~/lib";

export function WalletDropdown() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { selectedAccount, setSelectedAccount, accounts, refreshAccounts } =
    useAccount();
  const theme = useTheme();

  useEffect(() => {
    if (accounts.length === 0) {
      refreshAccounts();
    }
  }, []);

  useEffect(() => {
    if (accounts.length === 0) {
      refreshAccounts();
      const timer = setTimeout(() => {
        if (accounts.length === 0) {
          refreshAccounts();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [accounts.length, refreshAccounts]);

  const handleAccountSelection = (account: any) => {
    setSelectedAccount(account);
    setIsDropdownOpen(false);
  };

  const displayAccount = selectedAccount || accounts[0];
  if (!displayAccount) {
    return (
      <View className="flex-row items-center mx-3">
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="relative">
      <View className="flex-row items-center mx-3">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          activeOpacity={0.7}
        >
          <Text className="text-xl font-bold text-white pr-2">
            {displayAccount?.name || "Select Account"}
          </Text>
          <ChevronDown size={16} color="#fff" className="ml-1" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isDropdownOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              width: "90%",
              maxHeight: "70%",
              backgroundColor: theme.cardBackground,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text
                style={{
                  color: theme.text,
                  fontWeight: "bold",
                  fontSize: 18,
                }}
              >
                Select Account
              </Text>
              <TouchableOpacity onPress={() => setIsDropdownOpen(false)}>
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
            >
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    backgroundColor:
                      selectedAccount?.id === account.id
                        ? `${theme.primary}20`
                        : "transparent",
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                  onPress={() => handleAccountSelection(account)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between w-full">
                    <View className="flex-1 mr-4">
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 16,
                          fontWeight: "500",
                          marginBottom: 4,
                        }}
                      >
                        {account.name}
                      </Text>
                      <Text
                        style={{
                          color: theme.textSecondary,
                          fontSize: 14,
                        }}
                      >
                        {account.account_type}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      ${account.amount?.toFixed(2) || "0.00"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
