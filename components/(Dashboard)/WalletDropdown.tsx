/**
 * Account selector dropdown used in the dashboard header
 */
import { useCallback, useState, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { ChevronDown, Loader, Wallet } from "lucide-react-native";
import { useTheme } from "~/lib";
import { useAccount } from "~/lib";

type WalletDropdownProps = { variant?: "light" | "dark" };

export function WalletDropdown({ variant = "dark" }: WalletDropdownProps) {
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
  const isLight = variant === "light";
  const buttonColor = isLight ? theme.text : "#fff";

  // Debug logging
  // console.log(
  //   "WalletDropdown - loading:",
  //   loading,
  //   "accounts:",
  //   accounts.length,
  //   "selectedAccount:",
  //   selectedAccount?.name
  // );

  // Auto-refresh accounts when component mounts or when accounts are empty
  useEffect(() => {
    // Always try to refresh accounts when component mounts
    if (accounts.length === 0) {
      refreshAccounts();
    }
  }, []); // Only run once when component mounts

  // Auto-refresh accounts when accounts array is empty and not loading
  useEffect(() => {
    if (accounts.length === 0 && !loading) {
      refreshAccounts();

      // Set up a timer to keep trying if accounts are still empty
      const timer = setTimeout(() => {
        if (accounts.length === 0 && !loading) {
          refreshAccounts();
        }
      }, 2000); // Wait 2 seconds before retrying

      return () => clearTimeout(timer);
    }
  }, [accounts.length, loading, refreshAccounts]);

  // Remove the immediate refresh logic that was causing issues
  // Accounts are now auto-loaded by AccountContext

  const closeSheet = useCallback(() => setIsDropdownOpen(false), []);

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
        <Loader size={20} color={buttonColor} className="animate-spin" />
      </View>
    );
  }

  const displayAccount = selectedAccount || accounts[0];
  if (!displayAccount) {
    // Not loading but no accounts (e.g. server fetch failed or new user) — show label instead of spinner
    return (
      <View className="flex-row items-center mx-3">
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: buttonColor,
          }}
          numberOfLines={1}
        >
          Select Account
        </Text>
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
          disabled={isSelecting}
        >
          {isSelecting ? (
            <Loader size={20} color={buttonColor} />
          ) : (
            <>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: buttonColor,
                  marginRight: 8,
                }}
                numberOfLines={1}
              >
                {displayAccount?.name || "Select Account"}
              </Text>
              <ChevronDown size={16} color={buttonColor} style={{ marginLeft: 4 }} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Account selection - bottom sheet */}
      <Modal
        visible={isDropdownOpen}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <Pressable
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
          onPress={closeSheet}
        >
          <Pressable
            style={{
              maxHeight: "75%",
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: "hidden",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                paddingTop: 12,
                paddingBottom: 8,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.border,
                }}
              />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: theme.text,
                  marginBottom: 16,
                }}
              >
                Select Account
              </Text>
              <ScrollView
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    activeOpacity={0.7}
                    onPress={() => handleAccountSelection(account)}
                    disabled={isSelecting}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: theme.background,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: `${theme.primary}18`,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Wallet size={20} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                        }}
                      >
                        {account.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        Balance: ${account.amount?.toFixed(2) || "0.00"}
                      </Text>
                    </View>
                    <View style={{ transform: [{ rotate: "-90deg" }] }}>
                      <ChevronDown size={18} color={theme.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
