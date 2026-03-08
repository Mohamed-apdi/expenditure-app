import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { transactions$ } from "~/lib/stores/transactionsStore";

import {
  ArrowRightLeft,
  Award,
  Baby,
  Book,
  Briefcase,
  Bus,
  Clock,
  CreditCard,
  Dice5,
  DollarSign,
  Dumbbell,
  Film,
  Gift,
  GraduationCap,
  HandCoins,
  HandHeart,
  HeartPulse,
  Home,
  Inbox,
  Laptop,
  Luggage,
  MoreHorizontal,
  PawPrint,
  Percent,
  Receipt,
  RefreshCw,
  Repeat,
  Shield,
  ShoppingBag,
  Smartphone,
  Smile,
  Sofa,
  TrendingUp,
  User,
  Utensils,
  Wrench,
  Zap,
} from "lucide-react-native";

import DashboardHeader from "~/components/(Dashboard)/DashboardHeader";
import MemoizedTransactionItem from "~/components/(Dashboard)/MemoizedTransactionItem";
import MonthYearScroller from "~/components/(Dashboard)/MonthYearScroll";
import NotificationPermissionRequest from "~/components/NotificationPermissionRequest";
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
};

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

        const startDate = new Date(year, month, 1).toISOString().split("T")[0];
        const endDate = new Date(year, month + 1, 0)
          .toISOString()
          .split("T")[0];

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
            } as Transaction;
          },
        );

        const sortedTransactions = monthTransactionsList.sort(
          (a, b) => {
            const aTime = (a.updated_at || a.created_at) ?? "";
            const bTime = (b.updated_at || b.created_at) ?? "";
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          },
        );
        setFilteredTransactions(sortedTransactions);

        // Balance: when an account is selected, derive from ALL its transactions
        // so it stays correct after deletes (e.g. 0 when all transactions deleted)
        let balance: number;
        if (selectedAccount) {
          const allForAccount = selectTransactions(user.id).filter(
            (t) => t.account_id === selectedAccount.id,
          );
          const totalIncome = allForAccount
            .filter((t) => t.type === "income")
            .reduce((s, t) => s + (t.amount ?? 0), 0);
          const totalExpense = allForAccount
            .filter((t) => t.type === "expense")
            .reduce((s, t) => s + (t.amount ?? 0), 0);
          balance = totalIncome - totalExpense;
          // Reconcile stored account balance so context and Supabase stay in sync
          const currentStored = selectedAccount.amount ?? 0;
          if (currentStored !== balance) {
            updateAccountLocal(selectedAccount.id, { amount: balance });
            try {
              await updateAccountBalance(selectedAccount.id, balance);
            } catch (_) {}
            await refreshBalances();
          }
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
    [
      selectedAccount?.id,
      selectedAccount?.amount,
      refreshBalances,
    ],
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
    const icons: Record<string, React.ElementType> = {
      // Expense categories (matching AddExpense.tsx translated names)
      [t.foodAndDrinks]: Utensils,
      [t.homeAndRent]: Home,
      [t.travel]: Bus,
      [t.bills]: Zap,
      [t.fun]: Film,
      [t.health]: HeartPulse,
      [t.shopping]: ShoppingBag,
      [t.learning]: GraduationCap,
      [t.personalCare]: Smile,
      [t.insurance]: Shield,
      [t.loans]: CreditCard,
      [t.gifts]: Gift,
      [t.donations]: HandHeart,
      [t.vacation]: Luggage,
      [t.pets]: PawPrint,
      [t.children]: Baby,
      [t.subscriptions]: Repeat,
      [t.gymAndSports]: Dumbbell,
      [t.electronics]: Smartphone,
      [t.furniture]: Sofa,
      [t.repairs]: Wrench,
      [t.taxes]: Receipt,

      // Income categories (matching AddExpense.tsx translated names)
      [t.jobSalary]: DollarSign,
      [t.bonus]: Zap,
      [t.partTimeWork]: Clock,
      [t.business]: Briefcase,
      [t.investments]: TrendingUp,
      [t.bankInterest]: Percent,
      [t.rentIncome]: Home,
      [t.sales]: ShoppingBag,
      [t.gambling]: Dice5,
      [t.awards]: Award,
      [t.refunds]: RefreshCw,
      [t.freelance]: Laptop,
      [t.royalties]: Book,
      [t.grants]: HandCoins,
      [t.giftsReceived]: Gift,
      [t.pension]: User,

      // Special categories (hardcoded in Debt_Loan component)
      Loan: CreditCard,
      Transfer: ArrowRightLeft,
    };
    return icons[category] || MoreHorizontal;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      // Expense colors (matching AddExpense.tsx translated names and colors)
      [t.foodAndDrinks]: "#059669",
      [t.homeAndRent]: "#0891b2",
      [t.travel]: "#3b82f6",
      [t.bills]: "#f97316",
      [t.fun]: "#8b5cf6",
      [t.health]: "#dc2626",
      [t.shopping]: "#06b6d4",
      [t.learning]: "#84cc16",
      [t.personalCare]: "#ec4899",
      [t.insurance]: "#14b8a6",
      [t.loans]: "#f97316",
      [t.gifts]: "#8b5cf6",
      [t.donations]: "#ef4444",
      [t.vacation]: "#3b82f6",
      [t.pets]: "#f59e0b",
      [t.children]: "#ec4899",
      [t.subscriptions]: "#8b5cf6",
      [t.gymAndSports]: "#059669",
      [t.electronics]: "#64748b",
      [t.furniture]: "#f59e0b",
      [t.repairs]: "#3b82f6",
      [t.taxes]: "#ef4444",

      // Income colors (matching AddExpense.tsx translated names and colors)
      [t.jobSalary]: "#059669",
      [t.bonus]: "#3b82f6",
      [t.partTimeWork]: "#f97316",
      [t.business]: "#8b5cf6",
      [t.investments]: "#ef4444",
      [t.bankInterest]: "#06b6d4",
      [t.rentIncome]: "#84cc16",
      [t.sales]: "#64748b",
      [t.gambling]: "#f43f5e",
      [t.awards]: "#8b5cf6",
      [t.refunds]: "#3b82f6",
      [t.freelance]: "#f97316",
      [t.royalties]: "#84cc16",
      [t.grants]: "#059669",
      [t.giftsReceived]: "#8b5cf6",
      [t.pension]: "#64748b",

      // Special categories (hardcoded in Debt_Loan component)
      Loan: "#f97316",
      Transfer: "#3b82f6",
    };
    return colors[category] || "#64748b";
  };

  // Get translated category label - now categories are already translated
  const getCategoryLabel = (categoryKey: string) => {
    // Since categories are now stored with translated names, return as-is
    // Only handle special cases like Transfer and Loan
    if (categoryKey === "Transfer") {
      return t.transfer;
    }
    if (categoryKey === "Loan") {
      return t.loans;
    }
    return categoryKey;
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
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
        {/* Compact header bar - same background as screen */}
        <View
          style={{
            paddingTop: insets.top,
            paddingHorizontal: 16,
            paddingBottom: 12,
            backgroundColor: theme.background,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
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

        <NotificationPermissionRequest />

        {/* Recent Transactions */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, minHeight: 320 }}>
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 20,
                  fontWeight: "bold",
                }}
              >
                {t.recentTransactions || "Recent Transactions"}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: theme.cardBackground,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => router.push("/components/TransactionsScreen")}
            >
              <Text
                style={{
                  color: theme.primary,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {t.seeMore || "See All"}
              </Text>
            </TouchableOpacity>
          </View>

          {filteredTransactions.length > 0 ? (
            <View style={{ gap: 10 }}>
              {filteredTransactions.slice(0, 6).map((transaction) => (
                <MemoizedTransactionItem
                  key={transaction.id}
                  transaction={transaction}
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
                      (t) => t.id === transactionId,
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
                            // Reverse balance: expense added back, income taken back
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
