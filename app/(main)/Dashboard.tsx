import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '~/lib';
import { type FinancialSummary } from '~/lib';
import { fetchTransactions } from '~/lib';
import { fetchProfile } from '~/lib';
import { useAccount } from '~/lib';

import {
  TrendingUp,
  Zap,
  Film,
  ShoppingBag,
  Book,
  MoreHorizontal,
  Utensils,
  Home,
  Bus,
  HeartPulse,
  GraduationCap,
  Smile,
  Shield,
  CreditCard,
  Gift,
  HandHeart,
  Luggage,
  PawPrint,
  Baby,
  Repeat,
  Dumbbell,
  Smartphone,
  Sofa,
  Wrench,
  Receipt,
  Clock,
  Briefcase,
  Percent,
  Dice5,
  RefreshCw,
  Laptop,
  HandCoins,
  User,
  DollarSign,
  Award,
  ArrowRightLeft,
} from 'lucide-react-native';

import { useTheme } from '~/lib';
import { useLanguage } from '~/lib';
import DashboardHeader from '~/components/(Dashboard)/DashboardHeader';
import MonthYearScroller from '~/components/(Dashboard)/MonthYearScroll';
import NotificationPermissionRequest from '~/components/NotificationPermissionRequest';
import MemoizedTransactionItem from '~/components/(Dashboard)/MemoizedTransactionItem';

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  created_at: string;
  date: string;
  type: 'expense' | 'income' | 'transfer';
  account_id: string;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const { selectedAccount, refreshBalances, accounts } = useAccount();
  const [userProfile, setUserProfile] = useState({
    fullName: '',
    email: '',
    image_url: '',
  });
  const [financialSummary, setFinancialSummary] =
    useState<FinancialSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const theme = useTheme();

  const fetchUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      // Profile
      const profileData = await fetchProfile(user.id);
      setUserProfile({
        fullName: profileData?.full_name || '',
        email: user.email || '',
        image_url: profileData?.image_url || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Update the handleMonthChange function
  const handleMonthChange = React.useCallback(
    async (month: number, year: number) => {
      // The fetchMonthData will now update the filteredTransactions
    },
    [],
  );

  // Memoize fetchMonthData to prevent infinite loops
  const fetchMonthData = React.useCallback(
    async (month: number, year: number) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return { income: 0, expense: 0, balance: 0 };

        // Get first and last day of selected month
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0)
          .toISOString()
          .split('T')[0];

        // Fetch transactions for selected month
        let monthTransactions;
        if (selectedAccount) {
          // Filter by selected account
          monthTransactions = await fetchTransactions(user.id);
          monthTransactions = monthTransactions.filter(
            (t) =>
              t.account_id === selectedAccount.id &&
              t.date >= startDate &&
              t.date <= endDate,
          );
        } else {
          // Fetch all transactions
          monthTransactions = await fetchTransactions(user.id);
          monthTransactions = monthTransactions.filter(
            (t) => t.date >= startDate && t.date <= endDate,
          );
        }

        let monthIncome = 0;
        let monthExpense = 0;
        const monthTransactionsList: Transaction[] = [];

        monthTransactions?.forEach((t) => {
          const amount = t.amount || 0;
          if (t.type === 'income') {
            monthIncome += amount;
          } else if (t.type === 'expense') {
            monthExpense += amount;
          }
          monthTransactionsList.push(t as Transaction);
        });

        // Sort transactions by date (newest first) and update the filtered transactions for the selected month
        const sortedTransactions = monthTransactionsList.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setFilteredTransactions(sortedTransactions);

        // Calculate balance based on whether an account is selected
        let balance;
        if (selectedAccount) {
          // For selected account, show the actual account balance
          balance = selectedAccount.amount || 0;
        } else {
          // For all accounts, show the monthly transaction balance
          balance = monthIncome - monthExpense;
        }

        return {
          income: monthIncome,
          expense: monthExpense,
          balance: balance,
        };
      } catch (error) {
        console.error('Error fetching month data:', error);
        return { income: 0, expense: 0, balance: 0 };
      }
    },
    [selectedAccount?.id],
  );

  useEffect(() => {
    // Set blue StatusBar for Dashboard
    StatusBar.setBackgroundColor('#3b82f6', true);
    StatusBar.setBarStyle('light-content', true);

    // Initial load - fetch profile when component mounts
    const checkAuthAndFetch = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          fetchUserProfile();
        }
      } catch (error) {
        console.error('Error in initial auth check:', error);
      }
    };
    checkAuthAndFetch();

    // Cleanup function to reset StatusBar when component unmounts
    return () => {
      StatusBar.setBackgroundColor(theme.background, true);
      StatusBar.setBarStyle(
        theme.isDark ? 'light-content' : 'dark-content',
        true,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount

  // Refresh balance when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Ensure StatusBar is blue when Dashboard comes into focus
      StatusBar.setBackgroundColor('#3b82f6', true);
      StatusBar.setBarStyle('light-content', true);

      refreshBalances();

      // Trigger data refresh for MonthYearScroller
      setRefreshTrigger((prev) => prev + 1);
    }, [refreshBalances]),
  );

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
        console.error('Error during manual refresh:', error);
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
      [t.foodAndDrinks]: '#059669',
      [t.homeAndRent]: '#0891b2',
      [t.travel]: '#3b82f6',
      [t.bills]: '#f97316',
      [t.fun]: '#8b5cf6',
      [t.health]: '#dc2626',
      [t.shopping]: '#06b6d4',
      [t.learning]: '#84cc16',
      [t.personalCare]: '#ec4899',
      [t.insurance]: '#14b8a6',
      [t.loans]: '#f97316',
      [t.gifts]: '#8b5cf6',
      [t.donations]: '#ef4444',
      [t.vacation]: '#3b82f6',
      [t.pets]: '#f59e0b',
      [t.children]: '#ec4899',
      [t.subscriptions]: '#8b5cf6',
      [t.gymAndSports]: '#059669',
      [t.electronics]: '#64748b',
      [t.furniture]: '#f59e0b',
      [t.repairs]: '#3b82f6',
      [t.taxes]: '#ef4444',

      // Income colors (matching AddExpense.tsx translated names and colors)
      [t.jobSalary]: '#059669',
      [t.bonus]: '#3b82f6',
      [t.partTimeWork]: '#f97316',
      [t.business]: '#8b5cf6',
      [t.investments]: '#ef4444',
      [t.bankInterest]: '#06b6d4',
      [t.rentIncome]: '#84cc16',
      [t.sales]: '#64748b',
      [t.gambling]: '#f43f5e',
      [t.awards]: '#8b5cf6',
      [t.refunds]: '#3b82f6',
      [t.freelance]: '#f97316',
      [t.royalties]: '#84cc16',
      [t.grants]: '#059669',
      [t.giftsReceived]: '#8b5cf6',
      [t.pension]: '#64748b',

      // Special categories (hardcoded in Debt_Loan component)
      Loan: '#f97316',
      Transfer: '#3b82f6',
    };
    return colors[category] || '#64748b';
  };

  // Get translated category label - now categories are already translated
  const getCategoryLabel = (categoryKey: string) => {
    // Since categories are now stored with translated names, return as-is
    // Only handle special cases like Transfer and Loan
    if (categoryKey === 'Transfer') {
      return t.transfer;
    }
    if (categoryKey === 'Loan') {
      return t.loans;
    }
    return categoryKey;
  };

  return (
    <SafeAreaView className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
        showsVerticalScrollIndicator={false}>
        {/* Blue Header Section */}
        <View className="bg-[#3b82f6] pt-safe">
          <DashboardHeader
            userName={userProfile.fullName}
            userEmail={userProfile.email}
            userImageUrl={userProfile.image_url}
            onLogoutPress={() => {
              supabase.auth.signOut();
              router.replace('/login');
            }}
            onSettingsPress={() => router.push('/(main)/SettingScreen')}
            onNotificationPress={() => router.push('/(main)/notifications')}
          />

          <View className="px-4 pb-4">
            <MonthYearScroller
              onMonthChange={handleMonthChange}
              fetchMonthData={fetchMonthData}
              refreshTrigger={refreshTrigger}
            />
          </View>
        </View>

        <View className="flex-1" style={{ backgroundColor: theme.background }}>
          {/* Notification Permission Request */}
          <NotificationPermissionRequest />

          {/* Recent Transactions - Simplified */}
          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: theme.background, minHeight: 400 }}>
            <View className="px-4 pt-6 pb-4">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 20,
                      fontWeight: 'bold',
                    }}>
                    {t.recentTransactions || 'Recent Transactions'}
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
                  onPress={() => router.push('/components/TransactionsScreen')}>
                  <Text
                    style={{
                      color: theme.primary,
                      fontWeight: '600',
                      fontSize: 13,
                    }}>
                    {t.seeMore || 'See All'}
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
                    />
                  ))}
                </View>
              ) : (
                <View
                  style={{
                    paddingVertical: 48,
                    alignItems: 'center',
                    backgroundColor: theme.cardBackground,
                    borderRadius: 16,
                  }}>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 16,
                      fontWeight: '500',
                    }}>
                    {t.noTransactionsForMonth || 'No transactions yet'}
                  </Text>
                  <Text
                    style={{
                      color: theme.textMuted,
                      fontSize: 14,
                      marginTop: 8,
                    }}>
                    Add your first transaction
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
