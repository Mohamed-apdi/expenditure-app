import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, X } from "lucide-react-native";
import React, { useCallback, useState, useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Account,
  createAccountLocal,
  createTransactionLocal,
  getCurrentUserOfflineFirst,
  selectAccounts,
  toAccount,
  formatCurrency,
  useAccount,
  useLanguage,
  useScreenStatusBar,
  useTheme,
  isOfflineGateLocked,
  triggerSync,
} from "~/lib";
import AddAccount from "../account-details/add-account";
import { useMainTabFabHandlers } from "~/components/MainTabFabContext";

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

const accountCardLayout = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    paddingRight: 40,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  balanceBlock: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  chevronSlot: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});

const Accounts = () => {
  const router = useRouter();
  const { accountsFabPress } = useMainTabFabHandlers();
  const { refreshAccounts: refreshContextAccounts } = useAccount();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const { t } = useLanguage();
  const tabBarHeight = useBottomTabBarHeight();

  accountsFabPress.current = () => setShowAddAccount(true);
  useEffect(() => {
    return () => {
      accountsFabPress.current = null;
    };
  }, []);

  const loadAccounts = async () => {
    try {
      setError(null);
      const user = await getCurrentUserOfflineFirst();
      if (!user) throw new Error("You must be logged in to view accounts");
      const data = selectAccounts(user.id).map(toAccount);
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts:", error);
      setError(error instanceof Error ? error.message : "Failed to load accounts");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, []),
  );

  useScreenStatusBar();

  // Calculate totals - now just sum all account amounts since we don't have type field
  const total = accounts.reduce((sum, a) => sum + (a.amount || 0), 0);

  const handleAddAccount = async (newAccount: {
    account_type: string;
    name: string;
    amount: number;
    description?: string;
  }) => {
    try {
      setError(null);

      const user = await getCurrentUserOfflineFirst();
      if (!user) {
        throw new Error("You must be logged in to add an account");
      }

      const accountWithUser = {
        ...newAccount,
        user_id: user.id,
        is_default: false, // Default to false for new accounts
        currency: "USD", // Default currency
      };

      const createdAccount = createAccountLocal(accountWithUser);
      setAccounts((prev) => [...prev, toAccount(createdAccount)]);

      if (newAccount.amount && newAccount.amount > 0) {
        try {
          createTransactionLocal({
            user_id: user.id,
            account_id: createdAccount.id,
            amount: newAccount.amount,
            description: `Initial balance for ${newAccount.name}`,
            date: new Date().toISOString().split("T")[0],
            category: "Initial Balance",
            type: "income",
            is_recurring: false,
          });
        } catch (transactionError) {
          console.error("Failed to create initial balance transaction:", transactionError);
        }
      }
      if (!(await isOfflineGateLocked())) void triggerSync();
      await refreshContextAccounts();

      setShowAddAccount(false);
    } catch (error) {
      console.error("Failed to add account:", error);
      setError(
        error instanceof Error ? error.message : "Failed to add account",
      );
    }
  };

  const handleAccountPress = (accountId: string) => {
    router.push({
      pathname: "/account-details/[id]",
      params: { id: accountId },
    });
  };

  const getGroupLabel = (groupName: string) => {
    switch (groupName) {
      case "Cash":
        return t.cash;
      case "SIM Card":
        return t.simCard;
      case "Debit Card":
        return t.debitCard;
      case "Savings":
        return t.savings;
      case "Top-Up/Prepaid":
        return t.topup;
      case "Investments":
        return t.investments;
      case "Overdrafts":
        return t.overdrafts;
      case "Loan":
        return t.loan;
      case "Insurance":
        return t.insurance;
      case "Card":
        return t.card;
      case "Others":
        return t.others;
      default:
        return groupName;
    }
  };

  const pageBackground = theme.isDark ? theme.background : "#F1F5F9";
  const accountCardBg = theme.isDark ? theme.cardBackground : "#FFFFFF";

  const cardShadow = Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.2 : 0.08,
      shadowRadius: 10,
    },
    android: { elevation: 3 },
    default: {},
  });

  const accountCardShadow = Platform.select({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.2 : 0.1,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {},
  });

  const groupedAccounts = accountGroups.filter((group) =>
    accounts.some((account) => account.account_type === group.name),
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: pageBackground }}
      edges={["left", "right", "top"]}
    >
      <View style={{ flex: 1, backgroundColor: pageBackground }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: pageBackground }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 8,
          flexGrow: groupedAccounts.length === 0 ? 1 : undefined,
          backgroundColor: pageBackground,
        }}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 16,
            backgroundColor: pageBackground,
          }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text
                style={{ color: theme.text, fontSize: 24, fontWeight: "bold" }}
              >
                {t.accounts}
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {accounts.length}{" "}
                {accounts.length === 1 ? "account" : "accounts"} •{" "}
                {formatCurrency(total)} total
              </Text>
            </View>
          </View>

          {/* Error Message */}
          {error && (
            <View
              style={{
                backgroundColor: "#fee2e2",
                padding: 12,
                borderRadius: 12,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: "#dc2626", flex: 1, fontSize: 14 }}>
                {error}
              </Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <X size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
          )}

          {/* Total Balance Card */}
          <View
            style={{
              borderRadius: 18,
              marginBottom: 28,
              overflow: "hidden",
              ...cardShadow,
            }}
          >
            <LinearGradient
              colors={
                theme.isDark
                  ? [theme.primary, "#0284C7", "#0369A1"]
                  : [theme.primary, "#38BDF8", "#0EA5E9"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 22, minHeight: 120 }}
            >
              <View
                style={{
                  position: "absolute",
                  top: -24,
                  right: -24,
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: "rgba(255,255,255,0.12)",
                }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: -32,
                  left: -16,
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              />
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: theme.primaryText,
                    fontSize: 12,
                    fontWeight: "600",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  {t.total || "Total Balance"}
                </Text>
              </View>
              <Text
                style={{
                  color: theme.primaryText,
                  fontSize: 38,
                  fontWeight: "800",
                  letterSpacing: -0.5,
                }}
              >
                {formatCurrency(total)}
              </Text>
            </LinearGradient>
          </View>

          {/* Accounts by Type */}
          {accounts.length === 0 ? (
            <View
              style={{
                paddingVertical: 48,
                alignItems: "center",
                backgroundColor: accountCardBg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.isDark ? theme.border : "rgba(226, 232, 240, 0.9)",
                ...accountCardShadow,
              }}
            >
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                No accounts yet
              </Text>
              <Text
                style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}
              >
                Create your first account
              </Text>
            </View>
          ) : (
            <View>
              {groupedAccounts.map((group, groupIndex) => (
                  <View
                    key={group.id}
                    style={{ marginTop: groupIndex === 0 ? 0 : 28 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 14,
                      }}
                    >
                      <View
                        style={{
                          width: 4,
                          height: 22,
                          borderRadius: 2,
                          backgroundColor: theme.primary,
                          marginRight: 10,
                        }}
                      />
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 18,
                          fontWeight: "700",
                          letterSpacing: -0.2,
                        }}
                      >
                        {getGroupLabel(group.name)}
                      </Text>
                    </View>
                    <View style={{ gap: 12 }}>
                      {accounts
                        .filter(
                          (account) => account.account_type === group.name,
                        )
                        .map((account) => (
                          <TouchableOpacity
                            key={account.id}
                            activeOpacity={0.85}
                            onPress={() => handleAccountPress(account.id)}
                          >
                            <View
                              style={[
                                accountCardLayout.card,
                                {
                                  backgroundColor: accountCardBg,
                                  borderColor: theme.isDark
                                    ? theme.border
                                    : "#E2E8F0",
                                },
                                accountCardShadow,
                              ]}
                            >
                              <View style={accountCardLayout.topRow}>
                                <View style={accountCardLayout.nameBlock}>
                                  <Text
                                    style={{
                                      color: theme.text,
                                      fontSize: 17,
                                      fontWeight: "700",
                                    }}
                                    numberOfLines={1}
                                  >
                                    {account.name}
                                  </Text>
                                  <View
                                    style={{
                                      backgroundColor:
                                        account.amount >= 0
                                          ? "#dcfce7"
                                          : "#fee2e2",
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 12,
                                      alignSelf: "flex-start",
                                      marginTop: 6,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color:
                                          account.amount >= 0
                                            ? "#16a34a"
                                            : "#dc2626",
                                        fontSize: 11,
                                        fontWeight: "600",
                                      }}
                                    >
                                      {getGroupLabel(group.name)}
                                    </Text>
                                  </View>
                                </View>
                                <View style={accountCardLayout.balanceBlock}>
                                  <Text
                                    style={{
                                      fontSize: 20,
                                      fontWeight: "700",
                                      color:
                                        account.amount >= 0
                                          ? "#10b981"
                                          : "#ef4444",
                                    }}
                                  >
                                    {formatCurrency(account.amount ?? 0)}
                                  </Text>
                                  {account.amount < 0 && (
                                    <Text
                                      style={{
                                        color: "#ef4444",
                                        fontSize: 11,
                                        marginTop: 2,
                                      }}
                                    >
                                      Overdraft
                                    </Text>
                                  )}
                                </View>
                              </View>
                              {account.description ? (
                                <View
                                  style={{
                                    marginTop: 10,
                                    paddingTop: 10,
                                    borderTopWidth: 1,
                                    borderTopColor: theme.border,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: theme.textMuted,
                                      fontSize: 12,
                                    }}
                                    numberOfLines={2}
                                  >
                                    {account.description}
                                  </Text>
                                </View>
                              ) : null}
                              <View style={accountCardLayout.chevronSlot}>
                                <ChevronRight
                                  size={20}
                                  color={theme.textMuted}
                                />
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                ))}
            </View>
          )}
        </View>
      </ScrollView>
      </View>

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
