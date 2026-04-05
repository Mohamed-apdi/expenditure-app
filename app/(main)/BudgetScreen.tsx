// screens/BudgetScreen.tsx
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  PanResponder,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { X, Edit2, Trash2, Wallet, ChevronDown } from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import SubscriptionsScreen from '../components/SubscriptionsScreen';
import SavingsScreen from '../components/SavingsScreen';
import {
  getCurrentUserOfflineFirst,
  selectBudgets,
  createBudgetLocal,
  updateBudgetLocal,
  deleteBudgetLocal,
  getBudgetProgressFromLocal,
  isOfflineGateLocked,
  triggerSync,
  type Budget,
} from '~/lib';
import { type Account } from '~/lib';
import { getExpensesByCategory, type BudgetProgress } from '~/lib';
import { useTheme, useScreenStatusBar, useAccount } from '~/lib';
import { useLanguage } from '~/lib';

import Investments from '../components/Investments';
import Debt_Loan from '../components/Debt_Loan';
import { ExpandableTabFab } from '~/components/ExpandableTabFab';
import { playTabClickSound, preloadTabClickSound } from '~/lib/utils/playTabSound';

// Use the exact same expense categories as AddExpense

export default function BudgetScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const { accounts, selectedAccount: selectedAccountInApp } = useAccount(); // Same selected account as Dashboard
  const [activeTab, setActiveTab] = useState('Budget');
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const tabsScrollRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});
  const tabsScrollWidthRef = useRef(0);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetsWithAccounts, setBudgetsWithAccounts] = useState<any[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null); // For add/edit modal picker
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Preload tab click feedback (same as Add Expense)
  useEffect(() => {
    void preloadTabClickSound();
  }, []);

  const TAB_KEYS = ['Budget', 'Subscriptions', 'Goals', 'Investments', 'Loan'];

  // When active tab changes (tap or swipe), scroll tab bar so active tab is visible
  const scrollTabBarToActive = useCallback(() => {
    const scrollView = tabsScrollRef.current;
    if (!scrollView) return;
    const w = tabsScrollWidthRef.current;
    const layout = tabLayoutsRef.current[activeTab];
    if (layout && w > 0) {
      const targetX = Math.max(0, layout.x - w / 2 + layout.width / 2);
      scrollView.scrollTo({ x: targetX, animated: true });
      return;
    }
    // Fallback: scroll by tab index when layout not yet available (e.g. first paint)
    const index = TAB_KEYS.indexOf(activeTab);
    if (index >= 0) {
      const padding = 16;
      const gap = 8;
      const marginRight = 4;
      const approxTabWidth = 100;
      const targetX = Math.max(0, padding + index * (approxTabWidth + gap + marginRight) - w / 2 + approxTabWidth / 2);
      scrollView.scrollTo({ x: targetX, animated: true });
    }
  }, [activeTab]);

  useEffect(() => {
    // Defer so tab bar layout (and tab onLayouts) have run
    const t = setTimeout(scrollTabBarToActive, 50);
    return () => clearTimeout(t);
  }, [activeTab, scrollTabBarToActive]);

  // Show only budgets for the selected account (same as Dashboard)
  const budgetsForSelectedAccount = selectedAccountInApp
    ? budgetsWithAccounts.filter((b) => b.account_id === selectedAccountInApp.id)
    : budgetsWithAccounts;
  const budgetCount = budgetsForSelectedAccount.length;

  const expenseCategories = [
    { key: 'Food & Drinks', label: t.foodAndDrinks },
    { key: 'Home & Rent', label: t.homeAndRent },
    { key: 'Travel', label: t.travel },
    { key: 'Bills', label: t.bills },
    { key: 'Fun', label: t.fun },
    { key: 'Health', label: t.health },
    { key: 'Shopping', label: t.shopping },
    { key: 'Learning', label: t.learning },
    { key: 'Personal Care', label: t.personalCare },
    { key: 'Insurance', label: t.insurance },
    { key: 'Loans', label: t.loans },
    { key: 'Gifts', label: t.gifts },
    { key: 'Donations', label: t.donations },
    { key: 'Vacation', label: t.vacation },
    { key: 'Pets', label: t.pets },
    { key: 'Children', label: t.children },
    { key: 'Subscriptions', label: t.subscriptions },
    { key: 'Gym & Sports', label: t.gymAndSports },
    { key: 'Electronics', label: t.electronics },
    { key: 'Furniture', label: t.furniture },
    { key: 'Repairs', label: t.repairs },
    { key: 'Taxes', label: t.taxes },
  ];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        // Capture horizontal swipes so they work on every tab (not stolen by child ScrollViews)
        return (
          Math.abs(gestureState.dx) > 15 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderRelease: (evt, gestureState) => {
        const current = activeTabRef.current;
        if (
          Math.abs(gestureState.dx) > 50 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        ) {
          if (gestureState.dx > 0) {
            // Swipe right - previous tab
            switch (current) {
              case 'Subscriptions':
                setActiveTab('Budget');
                break;
              case 'Goals':
                setActiveTab('Subscriptions');
                break;
              case 'Investments':
                setActiveTab('Goals');
                break;
              case 'Loan':
                setActiveTab('Investments');
                break;
            }
          } else {
            // Swipe left - next tab
            switch (current) {
              case 'Budget':
                setActiveTab('Subscriptions');
                break;
              case 'Subscriptions':
                setActiveTab('Goals');
                break;
              case 'Goals':
                setActiveTab('Investments');
                break;
              case 'Investments':
                setActiveTab('Loan');
                break;
            }
          }
        }
      },
      onPanResponderTerminate: () => {
        // Handle termination if needed
      },
    }),
  ).current;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newAllocated, setNewAllocated] = useState('');

  // FAB animation state (same pattern as Accounts)
  const [fabExpanded, setFabExpanded] = useState(false);
  const fabAnimation = useRef(new Animated.Value(0)).current;

  const expandFab = () => {
    fabAnimation.setValue(1);
    setFabExpanded(true);
  };

  const collapseFab = () => {
    fabAnimation.setValue(0);
    setFabExpanded(false);
  };

  const handleFabPress = () => {
    if (fabExpanded) {
      openAddModal();
      collapseFab();
    } else {
      expandFab();
    }
  };

  const fetchData = async () => {
    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      setUserId(user.id);

      const localBudgets = selectBudgets(user.id);
      const withAccounts = localBudgets.map((b) => ({
        ...b,
        account: accounts.find((a) => a.id === b.account_id),
      }));

      setBudgets(withAccounts as Budget[]);
      setBudgetsWithAccounts(withAccounts);
      setBudgetProgress(getBudgetProgressFromLocal(user.id));
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert(t.error, t.failedToFetchData);
    }
  };

  // Refresh data with pull-to-refresh (local only - no loading delay)
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [accounts.length]);

  // Keep modal account in sync with full account list; default to app selected account when opening add
  useEffect(() => {
    if (accounts.length === 0) return;
    const currentInList = selectedAccount && accounts.some((a) => a.id === selectedAccount.id);
    if (!currentInList) {
      setSelectedAccount(selectedAccountInApp ?? accounts[0]);
    }
  }, [accounts, selectedAccountInApp]);

  useScreenStatusBar();

  const openAddModal = () => {
    if (accounts.length === 0) {
      Alert.alert(t.noAccounts, t.createAccountFirst);
      return;
    }
    setCurrentBudget(null);
    setNewCategory('');
    setNewAllocated('');
    setSelectedAccount(selectedAccountInApp ?? accounts[0]); // Default to same account as Dashboard
    setIsModalVisible(true);
  };

  const openEditModal = (budget: any) => {
    setCurrentBudget(budget);
    setNewCategory(budget.category);
    setNewAllocated(budget.amount.toString());

    // Find and set the account for this budget
    const budgetAccount =
      budget.account || accounts.find((acc) => acc.id === budget.account_id);
    setSelectedAccount(budgetAccount || null);

    setIsModalVisible(true);
  };

  const handleSaveBudget = async () => {
    if (!newCategory.trim() || !newAllocated.trim()) {
      Alert.alert(t.missingInfo, t.pleaseFillCategoryAndAmount);
      return;
    }

    if (!selectedAccount) {
      Alert.alert(t.selectAccount, t.selectAccountForBudget);
      return;
    }

    if (!userId) {
      Alert.alert(t.error, t.userNotAuthenticated);
      return;
    }

    try {
      if (currentBudget) {
        updateBudgetLocal(currentBudget.id, {
          category: newCategory,
          amount: parseFloat(newAllocated),
          account_id: selectedAccount.id,
        });
        Alert.alert(t.success, t.budgetUpdated);
      } else {
        createBudgetLocal({
          user_id: userId,
          account_id: selectedAccount.id,
          category: newCategory,
          amount: parseFloat(newAllocated),
          period: 'monthly',
          start_date: new Date().toISOString().split('T')[0],
          is_active: true,
        });
        Alert.alert(t.success, t.budgetAdded);
      }
      setIsModalVisible(false);
      if (!(await isOfflineGateLocked())) void triggerSync();
      fetchData();
    } catch (error) {
      console.error('Error saving budget:', error);
      Alert.alert(t.error, t.budgetSaveError);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    Alert.alert(t.deleteBudget, t.deleteBudgetConfirmation, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            deleteBudgetLocal(budgetId);
            setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
            Alert.alert(t.success, t.budgetDeleted);
            if (!(await isOfflineGateLocked())) void triggerSync();
            fetchData();
          } catch (error) {
            console.error('Error deleting budget:', error);
            Alert.alert(t.error, t.budgetSaveError);
          }
        },
      },
    ]);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return '#ef4444';
    if (percentage > 75) return '#f59e0b';
    return '#10b981';
  };

  // Get budget progress for a specific budget (category + account)
  const getBudgetProgressFor = (category: string, accountId: string) => {
    return (
      budgetProgress.find(
        (p) => p.category === category && p.account_id === accountId
      ) || {
        category,
        account_id: accountId,
        budgeted: 0,
        spent: 0,
        remaining: 0,
        percentage: 0,
      }
    );
  };

  // Get translated category label
  const getCategoryLabel = (categoryKey: string) => {
    const categoryObj = expenseCategories.find(
      (cat) => cat.key === categoryKey,
    );
    return categoryObj ? categoryObj.label : categoryKey;
  };

  // Subscriptions tab content (filter by same account as Dashboard)
  const SubscriptionsTab = () => (
    <SubscriptionsScreen
      accounts={accounts}
      userId={userId}
      onRefresh={fetchData}
      selectedAccountId={selectedAccountInApp?.id}
    />
  );

  // Goals tab content (filter by same account as Dashboard)
  const GoalsTab = () => (
    <SavingsScreen
      accounts={accounts}
      userId={userId}
      onRefresh={fetchData}
      selectedAccountId={selectedAccountInApp?.id}
    />
  );

  // Investments tab content (filter by same account as Dashboard)
  const InvestmentsTab = () => (
    <Investments
      accounts={accounts}
      userId={userId}
      onRefresh={fetchData}
      selectedAccountId={selectedAccountInApp?.id}
    />
  );

  // Loan tab content (filter by same account as Dashboard)
  const LoanTab = () => (
    <Debt_Loan
      accounts={accounts}
      userId={userId}
      onRefresh={fetchData}
      selectedAccountId={selectedAccountInApp?.id}
    />
  );

  return (
    <SafeAreaView
      style={{ flex: 1, paddingTop: 0, backgroundColor: theme.background }}
      edges={['top', 'left', 'right']}>
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Improved Tabs - Scrollable Pills */}
        <View
          style={{
            backgroundColor: theme.background,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <ScrollView
            ref={tabsScrollRef}
            onLayout={(e) => {
              tabsScrollWidthRef.current = e.nativeEvent.layout.width;
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 8,
            }}>
            {[
              { key: 'Budget', label: t.budget || 'Budget' },
              {
                key: 'Subscriptions',
                label: t.subscriptions || 'Subscriptions',
              },
              { key: 'Goals', label: t.goals || 'Goals' },
              { key: 'Investments', label: t.investments || 'Investments' },
              { key: 'Loan', label: t.loan || 'Loan' },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.8}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    tabLayoutsRef.current[tab.key] = { x, width };
                    // Scroll to this tab if it's the active one (handles late layout)
                    if (activeTab === tab.key && tabsScrollRef.current && tabsScrollWidthRef.current > 0) {
                      const w = tabsScrollWidthRef.current;
                      const targetX = Math.max(0, x - w / 2 + width / 2);
                      tabsScrollRef.current.scrollTo({ x: targetX, animated: true });
                    }
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 20,
                    backgroundColor: isActive ? '#00BFFF' : theme.cardBackground,
                    borderWidth: 1,
                    borderColor: isActive ? '#00BFFF' : theme.border,
                    marginRight: 4,
                  }}
                  onPress={() => {
                    void playTabClickSound();
                    setActiveTab(tab.key);
                  }}>
                  <Text
                    style={{
                      fontWeight: isActive ? '600' : '400',
                      fontSize: 14,
                      color: isActive ? '#FFFFFF' : theme.textSecondary,
                    }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content - swipe left/right on this area to change tab */}
        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
          {activeTab === 'Budget' && (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }>
              <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <View>
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: 'bold',
                      fontSize: 24,
                    }}>
                    {t.monthlyBudget || 'Monthly Budget'}
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 14,
                      marginTop: 4,
                    }}>
                    {budgetCount}{' '}
                    {budgetCount === 1 ? 'category' : 'categories'}
                    {selectedAccountInApp ? ` · ${selectedAccountInApp.name}` : ''}
                  </Text>
                </View>
              </View>

              {/* Budget Cards */}
              {budgetCount === 0 ? (
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
                    {selectedAccountInApp
                      ? t.noBudgetsSetUp
                      : (t.selectAccount || 'Select an account') + ' to view budgets'}
                  </Text>
                  <Text
                    style={{
                      color: theme.textMuted,
                      fontSize: 14,
                      marginTop: 8,
                    }}>
                    {selectedAccountInApp ? 'Create your first budget' : 'Use the account selector on Home'}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {budgetsForSelectedAccount.map((budget) => {
                    // Get budget progress for this category
                    const progress = getBudgetProgressFor(
                      budget.category,
                      budget.account_id
                    );
                    const spent = progress.spent;
                    const percentage = progress.percentage;
                    const remaining = progress.remaining;
                    const isOverBudget = percentage > 100;

                    return (
                      <View
                        key={budget.id}
                        style={{
                          padding: 16,
                          backgroundColor: theme.cardBackground,
                          borderRadius: 16,
                        }}>
                        {/* Header */}
                        <View className="flex-row justify-between items-start mb-3">
                          <View className="flex-1">
                            <Text
                              style={{
                                color: theme.text,
                                fontSize: 18,
                                fontWeight: 'bold',
                              }}>
                              {getCategoryLabel(budget.category)}
                            </Text>
                            <View
                              className="flex-row items-center mt-1"
                              style={{ gap: 6 }}>
                              <View
                                style={{
                                  backgroundColor:
                                    percentage > 100
                                      ? '#fee2e2'
                                      : percentage > 75
                                        ? '#fef3c7'
                                        : '#dcfce7',
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 12,
                                }}>
                                <Text
                                  style={{
                                    color:
                                      percentage > 100
                                        ? '#dc2626'
                                        : percentage > 75
                                          ? '#d97706'
                                          : '#16a34a',
                                    fontSize: 11,
                                    fontWeight: '600',
                                  }}>
                                  {Math.round(percentage)}%{' '}
                                  {isOverBudget ? 'over' : 'used'}
                                </Text>
                              </View>
                              {budget.account && (
                                <Text
                                  style={{
                                    color: theme.textMuted,
                                    fontSize: 11,
                                  }}>
                                  {budget.account.name}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#e0e7ff',
                                padding: 8,
                                borderRadius: 8,
                              }}
                              onPress={() => openEditModal(budget)}>
                              <Edit2 size={14} color="#4f46e5" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#fee2e2',
                                padding: 8,
                                borderRadius: 8,
                              }}
                              onPress={() => handleDeleteBudget(budget.id)}>
                              <Trash2 size={14} color="#dc2626" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Amount Info */}
                        <View className="flex-row justify-between items-center mb-3">
                          <View>
                            <Text
                              style={{
                                color: theme.textSecondary,
                                fontSize: 12,
                                marginBottom: 4,
                              }}>
                              Spent / Budget
                            </Text>
                            <Text
                              style={{
                                color: getProgressColor(percentage),
                                fontWeight: 'bold',
                                fontSize: 24,
                              }}>
                              ${spent.toFixed(2)}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text
                              style={{
                                color: theme.textSecondary,
                                fontSize: 12,
                                marginBottom: 4,
                              }}>
                              {isOverBudget ? 'Over Budget' : 'Remaining'}
                            </Text>
                            <Text
                              style={{
                                fontWeight: 'bold',
                                fontSize: 20,
                                color: remaining < 0 ? '#ef4444' : '#10b981',
                              }}>
                              ${Math.abs(remaining).toFixed(2)}
                            </Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View>
                          <View
                            style={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: theme.border,
                              overflow: 'hidden',
                            }}>
                            <View
                              style={{
                                height: '100%',
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: getProgressColor(percentage),
                                borderRadius: 4,
                              }}
                            />
                          </View>
                          <View className="flex-row justify-between mt-1">
                            <Text
                              style={{ color: theme.textMuted, fontSize: 11 }}>
                              Budget: ${budget.amount.toFixed(2)}
                            </Text>
                            <Text
                              style={{ color: theme.textMuted, fontSize: 11 }}>
                              {Math.round(percentage)}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
              </View>
            </ScrollView>
          )}

          {activeTab === 'Subscriptions' && (
            <View style={{ flex: 1 }}>
              <SubscriptionsTab />
            </View>
          )}
          {activeTab === 'Goals' && (
            <View style={{ flex: 1 }}>
              <GoalsTab />
            </View>
          )}
          {activeTab === 'Investments' && (
            <View style={{ flex: 1 }}>
              <InvestmentsTab />
            </View>
          )}
          {activeTab === 'Loan' && (
            <View style={{ flex: 1 }}>
              <LoanTab />
            </View>
          )}
        </View>

        {/* Close area when FAB expanded - must be before FAB */}
        {activeTab === 'Budget' && fabExpanded && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            activeOpacity={1}
            onPress={collapseFab}
          />
        )}

        {activeTab === 'Budget' && (
          <ExpandableTabFab
            bottom={tabBarHeight + 20}
            fabAnimation={fabAnimation}
            fabExpanded={fabExpanded}
            expandedWidth={175}
            onPress={handleFabPress}
            label={t.addBudgets || 'Add Budget'}
            surfaceKey={theme.background}
            backgroundColor={theme.primary}
          />
        )}

        {/* Add/Edit Budget Modal - Simplified */}
        <Modal
          visible={isModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: 16,
            }}>
            <View
              style={{
                width: '100%',
                maxWidth: 400,
                backgroundColor: theme.cardBackground,
                borderRadius: 20,
                padding: 20,
              }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row justify-between items-center mb-5">
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: 'bold',
                      fontSize: 22,
                    }}>
                    {currentBudget ? t.editBudget : t.addNewBudget}
                  </Text>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={24} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Category - Card opens bottom sheet */}
                <View className="mb-4">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: '500',
                      fontSize: 13,
                    }}>
                    {t.category || 'Category'} *
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setCategorySheetOpen(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: newCategory ? theme.primary : theme.border,
                      backgroundColor: theme.background,
                      minHeight: 50,
                    }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: newCategory ? theme.text : theme.textMuted,
                      }}
                      numberOfLines={1}>
                      {newCategory ? getCategoryLabel(newCategory) : (t.selectCategory || 'Select category')}
                    </Text>
                    <ChevronDown size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Category bottom sheet */}
                <Modal
                  visible={categorySheetOpen}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setCategorySheetOpen(false)}>
                  <Pressable
                    style={{
                      flex: 1,
                      justifyContent: 'flex-end',
                      backgroundColor: 'rgba(0,0,0,0.4)',
                    }}
                    onPress={() => setCategorySheetOpen(false)}>
                    <Pressable
                      style={{
                        maxHeight: '75%',
                        backgroundColor: theme.cardBackground,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        overflow: 'hidden',
                      }}
                      onPress={(e) => e.stopPropagation()}>
                      <View
                        style={{
                          paddingTop: 12,
                          paddingBottom: 8,
                          alignItems: 'center',
                        }}>
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
                            fontWeight: '700',
                            color: theme.text,
                            marginBottom: 16,
                          }}>
                          {t.selectCategory || 'Select category'}
                        </Text>
                        <ScrollView
                          style={{ maxHeight: 320 }}
                          contentContainerStyle={{ paddingBottom: 16 }}
                          showsVerticalScrollIndicator={false}>
                          {expenseCategories.map((category) => (
                            <TouchableOpacity
                              key={category.key}
                              activeOpacity={0.7}
                              onPress={() => {
                                setNewCategory(category.key);
                                setCategorySheetOpen(false);
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 14,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                                backgroundColor: theme.background,
                                marginBottom: 8,
                                borderWidth: 1,
                                borderColor: theme.border,
                              }}>
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: '600',
                                  color: theme.text,
                                  flex: 1,
                                }}>
                                {category.label}
                              </Text>
                              <ChevronDown
                                size={18}
                                color={theme.textMuted}
                                style={{ transform: [{ rotate: '-90deg' }] }}
                              />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </Pressable>
                  </Pressable>
                </Modal>

                {/* Account - Card opens bottom sheet */}
                <View className="mb-4">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: '500',
                      fontSize: 13,
                    }}>
                    {t.account || 'Account'} *
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setAccountSheetOpen(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selectedAccount ? theme.primary : theme.border,
                      backgroundColor: theme.background,
                      minHeight: 50,
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: selectedAccount ? `${theme.primary}18` : `${theme.border}40`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}>
                        <Wallet size={20} color={selectedAccount ? theme.primary : theme.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '600',
                            color: selectedAccount ? theme.text : theme.textMuted,
                          }}
                          numberOfLines={1}>
                          {selectedAccount?.name ?? (t.selectAccount || 'Select account')}
                        </Text>
                        {selectedAccount && (
                          <Text
                            style={{
                              fontSize: 13,
                              color: theme.textSecondary,
                              marginTop: 2,
                            }}>
                            {t.balance || 'Balance'}: ${selectedAccount.amount.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <ChevronDown size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Account bottom sheet */}
                <Modal
                  visible={accountSheetOpen}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setAccountSheetOpen(false)}>
                  <Pressable
                    style={{
                      flex: 1,
                      justifyContent: 'flex-end',
                      backgroundColor: 'rgba(0,0,0,0.4)',
                    }}
                    onPress={() => setAccountSheetOpen(false)}>
                    <Pressable
                      style={{
                        maxHeight: '75%',
                        backgroundColor: theme.cardBackground,
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        overflow: 'hidden',
                      }}
                      onPress={(e) => e.stopPropagation()}>
                      <View
                        style={{
                          paddingTop: 12,
                          paddingBottom: 8,
                          alignItems: 'center',
                        }}>
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
                            fontWeight: '700',
                            color: theme.text,
                            marginBottom: 16,
                          }}>
                          {t.selectAccount || 'Select account'}
                        </Text>
                        <ScrollView
                          style={{ maxHeight: 320 }}
                          contentContainerStyle={{ paddingBottom: 16 }}
                          showsVerticalScrollIndicator={false}>
                          {accounts.length === 0 ? (
                            <Text
                              style={{
                                fontSize: 15,
                                color: theme.textSecondary,
                                textAlign: 'center',
                                paddingVertical: 24,
                              }}>
                              {t.noAccountsAvailable || 'No accounts available'}
                            </Text>
                          ) : (
                            accounts.map((account) => (
                              <TouchableOpacity
                                key={account.id}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setSelectedAccount(account);
                                  setAccountSheetOpen(false);
                                }}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  paddingVertical: 14,
                                  paddingHorizontal: 12,
                                  borderRadius: 12,
                                  backgroundColor: theme.background,
                                  marginBottom: 8,
                                  borderWidth: 1,
                                  borderColor: theme.border,
                                }}>
                                <View
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    backgroundColor: `${theme.primary}18`,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12,
                                  }}>
                                  <Wallet size={20} color={theme.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text
                                    style={{
                                      fontSize: 16,
                                      fontWeight: '600',
                                      color: theme.text,
                                    }}>
                                    {account.name}
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      color: theme.textSecondary,
                                      marginTop: 2,
                                    }}>
                                    {t.balance || 'Balance'}: ${account.amount.toFixed(2)}
                                  </Text>
                                </View>
                                <ChevronDown size={18} color={theme.textMuted} style={{ transform: [{ rotate: '-90deg' }] }} />
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    </Pressable>
                  </Pressable>
                </Modal>

                {/* Budget Amount */}
                <View className="mb-4">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: '500',
                      fontSize: 13,
                    }}>
                    {t.budgetAmount || 'Amount'} *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 14,
                      color: theme.text,
                      backgroundColor: theme.background,
                      fontSize: 15,
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={newAllocated}
                    onChangeText={setNewAllocated}
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                  onPress={handleSaveBudget}>
                  <Text
                    style={{
                      color: theme.primaryText,
                      fontWeight: '600',
                      fontSize: 16,
                    }}>
                    {currentBudget ? t.updateBudget : t.addBudget}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
