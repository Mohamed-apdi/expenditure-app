import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRouter } from "expo-router";
import { format } from "date-fns";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { statusBarTopInset } from "~/lib/utils/statusBarInset";
import {
  deleteTransactionLocal,
  deleteTransaction,
  fetchProfile,
  getCurrentUserOfflineFirst,
  selectProfile,
  selectTransactions,
  selectTransactionsByDateRange,
  updateAccountLocal,
  updateAccountBalance,
  isOfflineGateLocked,
  triggerSync,
  useAccount,
  supabase,
  type FinancialSummary,
} from "~/lib";
import { cacheImage } from "~/lib/utils/imageCache";
import { monthRangeLocalYmd } from "~/lib/utils/localDate";
import { transactions$ } from "~/lib/stores/transactionsStore";
import {
  categoryColorFromStored,
  categoryIconFromStored,
  categoryLabelFromStored,
} from "~/lib/utils/categories";

import { ArrowRightLeft, CreditCard, Inbox, Scale } from "lucide-react-native";

import DashboardHeader from "~/components/(Dashboard)/DashboardHeader";
import MemoizedTransactionItem from "~/components/(Dashboard)/MemoizedTransactionItem";
import MonthYearScroller from "~/components/(Dashboard)/MonthYearScroll";
import { useLanguage, useTheme } from "~/lib";

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  date: string;
  type: "expense" | "income" | "transfer";
  account_id: string;
  evc_kind?: "merchant" | "transfer" | null;
  evc_counterparty_phone?: string | null;
  source?: "evc";
};

type DayTransactionGroup = {
  dateKey: string;
  label: string;
  expenseTotal: number;
  incomeTotal: number;
  items: Transaction[];
};

function groupTransactionsByDay(transactions: Transaction[]): DayTransactionGroup[] {
  const byDay = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = (t.date && t.date.length >= 10 ? t.date.slice(0, 10) : null) ?? t.created_at?.slice(0, 10);
    if (!key) continue;
    const arr = byDay.get(key);
    if (arr) arr.push(t);
    else byDay.set(key, [t]);
  }
  const sortedKeys = [...byDay.keys()].sort((a, b) => b.localeCompare(a));
  return sortedKeys.map((dateKey) => {
    const items = [...(byDay.get(dateKey) ?? [])];
    items.sort((a, b) => {
      const aTime = a.created_at ?? "";
      const bTime = b.created_at ?? "";
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    let expenseTotal = 0;
    let incomeTotal = 0;
    for (const tx of items) {
      if (tx.type === "expense") expenseTotal += tx.amount || 0;
      else if (tx.type === "income") incomeTotal += tx.amount || 0;
    }
    const [y, m, d] = dateKey.split("-").map(Number);
    const localDay = new Date(y, m - 1, d);
    // Compact header: "Sun, 5 Apr" — avoids oversized full weekday lines
    const label = format(localDay, "EEE, d MMM");
    return { dateKey, label, expenseTotal, incomeTotal, items };
  });
}

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const { selectedAccount, refreshBalances, accounts } = useAccount();
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState({
    fullName: "",
    email: "",
    image_url: "",
  });
  const [financialSummary, setFinancialSummary] =
    useState<FinancialSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const theme = useTheme();
  const openRowRef = useRef<(() => void) | null>(null);

  const closeOpenRow = useCallback(() => {
    try {
      openRowRef.current?.();
    } catch {
      // Guard against stale refs
    }
    openRowRef.current = null;
  }, []);

  const clearOpenRow = useCallback(() => {
    openRowRef.current = null;
  }, []);

  const handleRowOpen = useCallback((close: () => void) => {
    openRowRef.current?.();
    openRowRef.current = close;
  }, []);

  const fetchUserProfile = async () => {
    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      setUserId(user.id);

      // Offline-first: show local profile immediately; refresh from server when online
      const localProfile = selectProfile(user.id);
      if (localProfile?.full_name != null || localProfile?.image_url != null) {
        setUserProfile({
          fullName: localProfile.full_name || "",
          email: user.email || localProfile.email || "",
          image_url: localProfile.image_url || "",
        });
        
        // Cache local profile image if it exists
        if (localProfile.image_url) {
          cacheImage(localProfile.image_url).catch(() => {});
        }
      }
      try {
        const profileData = await fetchProfile(user.id);
        if (profileData) {
          setUserProfile({
            fullName: profileData.full_name || "",
            email: user.email || "",
            image_url: profileData.image_url || "",
          });
          
          // Cache profile image for offline use
          if (profileData.image_url) {
            cacheImage(profileData.image_url).catch(() => {});
          }
        }
      } catch {
        // Offline or fetch failed; keep local profile if already set
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  // Update the handleMonthChange function
  const handleMonthChange = React.useCallback(
    async (month: number, year: number) => {
      // The fetchMonthData will now update the filteredTransactions
    },
    [],
  );

  // Month data from local store (offline-first, instant)
  const fetchMonthData = React.useCallback(
    async (month: number, year: number) => {
      try {
        const user = await getCurrentUserOfflineFirst();
        if (!user) return { income: 0, expense: 0, balance: 0 };

        const { startDate, endDate } = monthRangeLocalYmd(year, month);

        // Read from Legend-State store only (no Supabase)
        let monthTransactions = selectTransactionsByDateRange(
          user.id,
          startDate,
          endDate,
        );
        if (selectedAccount) {
          monthTransactions = monthTransactions.filter(
            (t) => t.account_id === selectedAccount.id,
          );
        }

        let monthIncome = 0;
        let monthExpense = 0;
        const monthTransactionsList: Transaction[] = monthTransactions.map(
          (t) => {
            const amount = t.amount || 0;
            if (t.type === "income") monthIncome += amount;
            else if (t.type === "expense") monthExpense += amount;
            return {
              id: t.id,
              amount: t.amount,
              category: t.category,
              description: t.description,
              created_at: t.created_at,
              updated_at: t.updated_at,
              date: t.date,
              type: t.type,
              account_id: t.account_id,
              evc_kind: t.evc_kind,
              evc_counterparty_phone: t.evc_counterparty_phone,
              source: t.source,
            } as Transaction;
          },
        );

        const sortedTransactions = monthTransactionsList.sort((a, b) => {
          const ad =
            a.date && a.date.length >= 10 ? a.date.slice(0, 10) : "";
          const bd =
            b.date && b.date.length >= 10 ? b.date.slice(0, 10) : "";
          if (ad && bd && ad !== bd) return bd.localeCompare(ad);
          const aTime = a.created_at ?? "";
          const bTime = b.created_at ?? "";
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
        setFilteredTransactions(sortedTransactions);

        // Balance: use the stored account amount (editable on account details). Do not
        // overwrite it from transaction sums — that would undo manual balance edits.
        let balance: number;
        if (selectedAccount) {
          balance = selectedAccount.amount ?? 0;
        } else {
          balance = monthIncome - monthExpense;
        }

        return {
          income: monthIncome,
          expense: monthExpense,
          balance,
        };
      } catch (error) {
        console.error("Error fetching month data:", error);
        return { income: 0, expense: 0, balance: 0 };
      }
    },
    [selectedAccount?.id, selectedAccount?.amount],
  );

  useEffect(() => {
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(theme.background, true);
    }
    StatusBar.setBarStyle(
      theme.isDark ? "light-content" : "dark-content",
      true,
    );

    const checkAuthAndFetch = async () => {
      try {
        const user = await getCurrentUserOfflineFirst();
        if (user) fetchUserProfile();
      } catch (error) {
        console.error("Error in initial auth check:", error);
      }
    };
    checkAuthAndFetch();

    return () => {
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor(theme.background, true);
      }
      StatusBar.setBarStyle(
        theme.isDark ? "light-content" : "dark-content",
        true,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor(theme.background, true);
      }
      StatusBar.setBarStyle(
        theme.isDark ? "light-content" : "dark-content",
        true,
      );
      refreshBalances();
      setRefreshTrigger((prev) => prev + 1);
      // Ensure we have userId when returning to dashboard (e.g. after login); use cached session for offline
      getCurrentUserOfflineFirst().then((user) => {
        if (user) setUserId(user.id);
      });
      return () => closeOpenRow();
    }, [refreshBalances, closeOpenRow]),
  );

  // When transactions store updates (e.g. after sync), refresh month view
  useEffect(() => {
    const unsub = transactions$.onChange(() => {
      setRefreshTrigger((prev) => prev + 1);
    });
    return unsub;
  }, []);

  const onRefresh = React.useCallback(async () => {
    if (!refreshing) {
      setRefreshing(true);
      try {
        // Refresh user profile
        await fetchUserProfile();

        // Refresh account balances
        await refreshBalances();

        // Trigger MonthYearScroller to refetch current month
        setRefreshTrigger((prev) => prev + 1);
      } catch (error) {
        console.error("Error during manual refresh:", error);
      } finally {
        setRefreshing(false);
      }
    }
  }, [refreshing, refreshBalances]);

  const getCategoryIcon = (category: string) => {
    if (category === "Loan") return CreditCard;
    if (category === "Transfer") return ArrowRightLeft;
    if (category === "Balance Adjustment") return Scale;
    return categoryIconFromStored(t, category);
  };

  const getCategoryColor = (category: string) => {
    if (category === "Loan") return "#f97316";
    if (category === "Transfer") return "#3b82f6";
    if (category === "Balance Adjustment") return "#6366f1";
    return categoryColorFromStored(t, category);
  };

  const getCategoryLabel = (categoryKey: string) => {
    if (categoryKey === "Transfer") return t.transfer;
    if (categoryKey === "Loan") return t.loans;
    if (categoryKey === "Balance Adjustment") return t.BalanceAdjustment;
    return categoryLabelFromStored(t, categoryKey);
  };

  const insets = useSafeAreaInsets();
  const topPad = statusBarTopInset(insets);
  const tabBarHeight = useBottomTabBarHeight();

  const transactionsByDay = useMemo(
    () => groupTransactionsByDay(filteredTransactions),
    [filteredTransactions],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: topPad,
          backgroundColor: theme.background,
          zIndex: 100,
        }}
      />
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
        translucent={Platform.OS === "android" ? false : undefined}
      />
      {/* Fixed header — does not scroll with month/transactions */}
      <View
        style={{
          paddingTop: topPad,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: theme.background,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: theme.isDark ? 0.2 : 0.06,
              shadowRadius: 3,
            },
            android: { elevation: 2 },
            default: {},
          }),
        }}
      >
        <DashboardHeader
          variant="light"
          userName={userProfile.fullName}
          userEmail={userProfile.email}
          userImageUrl={userProfile.image_url}
          onLogoutPress={() => {
            supabase.auth.signOut();
            router.replace("/login");
          }}
          onSettingsPress={() => router.push("/(main)/SettingScreen")}
          onNotificationPress={() => router.push("/(main)/notifications")}
        />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeOpenRow}
      >
        {/* Content: month selector + balance card + transactions in one flow */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <MonthYearScroller
            variant="light"
            onMonthChange={handleMonthChange}
            fetchMonthData={fetchMonthData}
            refreshTrigger={refreshTrigger}
            userId={userId}
          />
        </View>

        {/* Recent Transactions */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, minHeight: 320 }}>
          <View className="flex-row justify-between items-center mb-5">
            <View>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 18,
                  fontWeight: "600",
                  letterSpacing: -0.3,
                }}
              >
                {t.recentTransactions || "Recent Transactions"}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: theme.cardBackground,
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: 20,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border,
              }}
              onPress={() => router.push("/components/TransactionsScreen")}
            >
              <Text
                style={{
                  color: theme.primary,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {t.seeMore || "See All"}
              </Text>
            </TouchableOpacity>
          </View>

          {filteredTransactions.length > 0 ? (
            <View style={{ gap: 16 }}>
              {transactionsByDay.map((group) => (
                <View key={group.dateKey}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                      paddingHorizontal: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 13,
                        fontWeight: "600",
                        letterSpacing: 0.2,
                      }}
                    >
                      {group.label}
                    </Text>
                    <Text
                      style={{
                        color: theme.textMuted,
                        fontSize: 11,
                        fontWeight: "500",
                        letterSpacing: 0.15,
                        flexShrink: 1,
                        textAlign: "right",
                        marginLeft: 12,
                      }}
                      numberOfLines={1}
                    >
                      {t.expenses} {group.expenseTotal.toFixed(2)}
                      <Text style={{ color: theme.textMuted }}> · </Text>
                      {t.income} {group.incomeTotal.toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 14,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: theme.border,
                      backgroundColor: theme.cardBackground,
                      overflow: "hidden",
                      ...Platform.select({
                        ios: {
                          shadowColor: theme.isDark ? "#000" : "#0f172a",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: theme.isDark ? 0.25 : 0.05,
                          shadowRadius: 10,
                        },
                        android: { elevation: 2 },
                        default: {},
                      }),
                    }}
                  >
                    {group.items.map((transaction, idx) => (
                      <View key={transaction.id}>
                        {idx > 0 ? (
                          <View
                            style={{
                              height: 1,
                              backgroundColor: theme.border,
                              marginLeft: 16,
                            }}
                          />
                        ) : null}
                        <MemoizedTransactionItem
                          transaction={transaction}
                          userId={userId}
                          getCategoryIcon={getCategoryIcon}
                          getCategoryColor={getCategoryColor}
                          getCategoryLabel={getCategoryLabel}
                          onPress={() =>
                            router.push(
                              `/(transactions)/transaction-detail/${transaction.id}`,
                            )
                          }
                          onSwipeOpen={handleRowOpen}
                          onSwipeStart={closeOpenRow}
                          onSwipeClose={clearOpenRow}
                          onEdit={(transactionId, type) => {
                            closeOpenRow();
                            if (type === "expense") {
                              router.push(`/(expense)/edit-expense/${transactionId}` as any);
                            } else {
                              router.push(`/(transactions)/transaction-detail/${transactionId}` as any);
                            }
                          }}
                          onDelete={(transactionId) => {
                            closeOpenRow();
                            const tx = filteredTransactions.find(
                              (x) => x.id === transactionId,
                            );
                            if (!tx) return;
                            Alert.alert(
                              t.deleteTransaction || "Delete transaction",
                              t.deleteTransactionConfirmation ||
                                "Are you sure you want to delete this transaction?",
                              [
                                { text: t.cancel || "Cancel", style: "cancel" },
                                {
                                  text: t.delete || "Delete",
                                  style: "destructive",
                                  onPress: async () => {
                                    const acc = accounts.find(
                                      (a) => a.id === tx.account_id,
                                    );
                                    if (acc) {
                                      const delta =
                                        tx.type === "expense"
                                          ? tx.amount
                                          : tx.type === "income"
                                            ? -tx.amount
                                            : 0;
                                      if (delta !== 0) {
                                        const newBalance = acc.amount + delta;
                                        updateAccountLocal(tx.account_id, {
                                          amount: newBalance,
                                        });
                                        try {
                                          await updateAccountBalance(
                                            tx.account_id,
                                            newBalance,
                                          );
                                        } catch (_) {}
                                      }
                                    }
                                    deleteTransactionLocal(tx.id);
                                    try {
                                      await deleteTransaction(tx.id);
                                    } catch (_) {}
                                    if (!(await isOfflineGateLocked()))
                                      void triggerSync();
                                    setRefreshTrigger((prev) => prev + 1);
                                  },
                                },
                              ],
                            );
                          }}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                paddingVertical: 48,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: theme.cardBackground,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Inbox size={40} color={theme.textMuted} strokeWidth={1.5} />
              </View>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                {t.noTransactionsForMonth || "No transactions yet"}
              </Text>
              <Text
                style={{
                  color: theme.textMuted,
                  fontSize: 14,
                  marginTop: 8,
                }}
              >
                Add your first transaction
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
