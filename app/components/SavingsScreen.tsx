import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Alert,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Calendar,
  X,
  Trash2,
  DollarSign,
  Target,
  TrendingUp,
  PiggyBank,
  Home,
  Car,
  Plane,
  GraduationCap,
  Heart,
  Briefcase,
  Shield,
  User,
  Plus,
  Wallet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import DateTimePicker, {
  useDefaultStyles,
  type CalendarComponents,
} from 'react-native-ui-datepicker';
import { getCurrentUserOfflineFirst } from '~/lib';
import {
  selectGoals,
  selectGoalById,
  createGoalLocal,
  updateGoalLocal,
  deleteGoalLocal,
  isOfflineGateLocked,
  triggerSync,
  type Goal,
} from '~/lib';
import { useAccount, type Account } from '~/lib';
import { useTheme } from '~/lib';
import { useLanguage } from '~/lib';

// Define goal icons
type GoalIcon =
  | 'goal'
  | 'house'
  | 'car'
  | 'vacation'
  | 'education'
  | 'wedding'
  | 'business'
  | 'emergency'
  | 'other';

// Use Lucide icons instead of image assets
const goalIcons = {
  goal: Target,
  house: Home,
  car: Car,
  vacation: Plane,
  education: GraduationCap,
  wedding: Heart,
  business: Briefcase,
  emergency: Shield,
  other: User,
};

// Helper function to get icon with fallback
const getGoalIcon = (iconType: string) => {
  return goalIcons[iconType as GoalIcon] || goalIcons.other;
};

const colors = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#84cc16',
  '#ec4899',
];

interface SavingsScreenProps {
  accounts?: Account[];
  userId?: string | null;
  onRefresh?: () => Promise<void>;
  /** When set (e.g. from Budget screen), show only goals for this account (same as Dashboard). */
  selectedAccountId?: string | null;
}

export default function SavingsScreen({
  accounts: propAccounts,
  userId: propUserId,
  onRefresh: propOnRefresh,
  selectedAccountId: propSelectedAccountId,
}: SavingsScreenProps = {}) {
  const theme = useTheme();
  const { t } = useLanguage();
  const { accounts: contextAccounts } = useAccount();
  const defaultDatePickerStyles = useDefaultStyles(
    theme.isDarkColorScheme ? 'dark' : 'light',
  );
  const [goals, setGoals] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [accounts, setAccounts] = useState<Account[]>(propAccounts ?? contextAccounts);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const insets = useSafeAreaInsets();
  const [totalSavings, setTotalSavings] = useState(0);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [isIconModalVisible, setIsIconModalVisible] = useState(false);
  const [isColorModalVisible, setIsColorModalVisible] = useState(false);
  const [isAddAmountModalVisible, setIsAddAmountModalVisible] = useState(false);
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '0',
    category: '',
    target_date: '',
    is_active: true,
    icon: 'goal' as GoalIcon,
    icon_color: colors[0],
    description: '',
  });
  const goalCategories = [
    { key: 'House', label: t.house },
    { key: 'Car', label: t.car },
    { key: 'Vacation', label: t.vacation },
    { key: 'Education', label: t.education },
    { key: 'Wedding', label: t.wedding },
    { key: 'Business', label: t.business },
    { key: 'Emergency Fund', label: t.emergencyFund },
    { key: 'Retirement', label: t.retirement },
    { key: 'Other', label: t.other },
  ];

  // Amount modal state
  const [amountModalData, setAmountModalData] = useState({
    amount: '',
    type: 'add' as 'add' | 'withdraw',
  });

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch goals and accounts from database
  const fetchData = async () => {
    try {
      // Use already-known userId if available (from props or previous fetch)
      let currentUserId = userId || propUserId;
      
      // If no userId yet, try to get it from auth
      if (!currentUserId) {
        const user = await getCurrentUserOfflineFirst();
        if (!user) return;
        currentUserId = user.id;
        setUserId(currentUserId);
      }

      const accountList = propAccounts ?? contextAccounts;
      const goalsData = selectGoals(currentUserId).map((g) => ({
        ...g,
        account: accountList.find((a) => a.id === g.account_id),
      }));
      const total = goalsData.reduce((s, g) => s + Number(g.current_amount ?? 0), 0);

      setGoals(goalsData);
      setAccounts(accountList);
      setTotalSavings(total);
      if (accountList.length > 0 && !selectedAccount) {
        setSelectedAccount(accountList[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert(t.error, t.failedToFetchData);
    }
  };

  // Refresh data with pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    // Only fetch data if not provided by parent
    if (!propAccounts && !propUserId) {
      fetchData();
    }
  }, []);

  useEffect(() => {
    const list = propAccounts ?? contextAccounts;
    setAccounts(list);
    if (list.length > 0) {
      if (propSelectedAccountId) {
        const match = list.find((a) => a.id === propSelectedAccountId);
        setSelectedAccount(match ?? list[0]);
      } else if (!selectedAccount) setSelectedAccount(list[0]);
    }
  }, [propAccounts, contextAccounts, propSelectedAccountId]);

  useEffect(() => {
    if (propUserId !== undefined && propUserId !== null) {
      setUserId(propUserId);
    }
  }, [propUserId]);

  // When used inside Budget screen: show local goals immediately (no loading)
  useEffect(() => {
    if (propUserId == null) return;
    const list = propAccounts ?? contextAccounts ?? [];
    setAccounts(list);
    const goalsData = selectGoals(propUserId).map((g) => ({
      ...g,
      account: list.find((a) => a.id === g.account_id),
    }));
    setGoals(goalsData);
    setTotalSavings(goalsData.reduce((s, g) => s + Number(g.current_amount ?? 0), 0));
    if (list.length > 0 && !selectedAccount) setSelectedAccount(list[0]);
  }, [propUserId, propAccounts, contextAccounts]);

  const handleToggleGoalStatus = async (id: string, currentStatus: boolean) => {
    try {
      updateGoalLocal(id, { is_active: !currentStatus });
      
      // Refresh data immediately after state update
      await fetchData();
      
      // Only trigger sync if online
      if (!(await isOfflineGateLocked())) void triggerSync();
    } catch (error) {
      console.error('Error toggling goal status:', error);
      Alert.alert(t.error, t.goalToggleError);
    }
  };

  const openAddModal = () => {
    if (accounts.length === 0) {
      Alert.alert(t.noAccountsForGoal, t.createAccountFirstForGoal);
      return;
    }
    setCurrentGoal(null);
    setFormData({
      name: '',
      target_amount: '',
      current_amount: '0',
      category: '',
      target_date: '',
      is_active: true,
      icon: 'goal',
      icon_color: colors[0],
      description: '',
    });
    setSelectedAccount(accounts[0]); // Set default account
    setIsEditMode(false);
    setIsModalVisible(true);
  };

  const openEditModal = (goal: any) => {
    setCurrentGoal(goal);
    setFormData({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      category: goal.category,
      target_date: goal.target_date,
      is_active: goal.is_active,
      icon: goal.icon,
      icon_color: goal.icon_color,
      description: goal.description || '',
    });

    // Find and set the account for this goal
    const goalAccount =
      goal.account || accounts.find((acc) => acc.id === goal.account_id);
    setSelectedAccount(goalAccount || null);

    setIsEditMode(true);
    setIsModalVisible(true);
  };

  const openAddAmountModal = (goal: any, type: 'add' | 'withdraw') => {
    setCurrentGoal(goal);
    setAmountModalData({
      amount: '',
      type,
    });
    if (type === 'add') {
      setIsAddAmountModalVisible(true);
    } else {
      setIsWithdrawModalVisible(true);
    }
  };

  const handleSave = async () => {
    if (
      !formData.name ||
      !formData.target_amount ||
      !formData.target_date ||
      !formData.category
    ) {
      Alert.alert(t.error, t.pleaseFillGoalNameAndTargetAmount);
      return;
    }

    if (!selectedAccount) {
      Alert.alert(t.selectAccount, t.selectAccountForGoal);
      return;
    }

    if (!userId) {
      Alert.alert(t.error, t.userNotAuthenticatedForGoal);
      return;
    }

    try {
      const targetAmount = parseFloat(formData.target_amount) || 0;
      const currentAmount = parseFloat(formData.current_amount) || 0;

      const goalData = {
        user_id: userId,
        account_id: selectedAccount.id,
        name: formData.name,
        target_amount: targetAmount,
        current_amount: currentAmount,
        category: formData.category,
        target_date: formData.target_date,
        is_active: formData.is_active,
        icon: formData.icon,
        icon_color: formData.icon_color,
        description: formData.description,
      };

      if (isEditMode && currentGoal) {
        updateGoalLocal(currentGoal.id, goalData);
      } else {
        if (!selectedAccount || !userId) {
          Alert.alert(t.error, t.selectAccount);
          return;
        }
        createGoalLocal({ ...goalData, user_id: userId, account_id: selectedAccount.id });
      }

      setIsModalVisible(false);
      
      // Refresh data immediately after state update
      await fetchData();
      
      // Show success alert after data is refreshed
      Alert.alert(t.success, isEditMode ? t.goalUpdated : t.goalAdded);
      
      // Only trigger sync if online
      if (!(await isOfflineGateLocked())) void triggerSync();
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert(t.error, t.goalSaveError);
    }
  };

  const handleAddAmount = async () => {
    if (!amountModalData.amount || parseFloat(amountModalData.amount) <= 0) {
      Alert.alert(t.error, t.enterAmount);
      return;
    }

    try {
      const amount = parseFloat(amountModalData.amount);
      if (!userId) return;
      const existing = selectGoalById(userId, currentGoal.id);
      const current = Number(existing?.current_amount ?? 0);
      const isAdding = amountModalData.type === 'add';

      if (isAdding) {
        updateGoalLocal(currentGoal.id, { current_amount: current + amount });
      } else {
        updateGoalLocal(currentGoal.id, { current_amount: Math.max(0, current - amount) });
      }

      setIsAddAmountModalVisible(false);
      setIsWithdrawModalVisible(false);
      
      // Refresh data immediately after state update
      await fetchData();
      
      // Show success alert after data is refreshed
      Alert.alert(t.success, isAdding ? t.amountAdded : t.amountWithdrawn);
      
      // Only trigger sync if online
      if (!(await isOfflineGateLocked())) void triggerSync();
    } catch (error) {
      console.error('Error updating goal amount:', error);
      Alert.alert(t.error, t.amountSaveError);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(t.deleteGoal, t.deleteGoalConfirmation, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            deleteGoalLocal(id);
            setIsModalVisible(false);
            
            // Refresh data immediately after state update
            await fetchData();
            
            // Show success alert after data is refreshed
            Alert.alert(t.success, t.goalDeleted);
            
            // Only trigger sync if online
            if (!(await isOfflineGateLocked())) void triggerSync();
          } catch (error) {
            console.error('Error deleting goal:', error);
            Alert.alert(t.error, t.goalDeleteError);
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const selectIcon = (icon: GoalIcon) => {
    setFormData({ ...formData, icon });
    setIsIconModalVisible(false);
  };

  const selectColor = (color: string) => {
    setFormData({ ...formData, icon_color: color });
    setIsColorModalVisible(false);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  // Get translated goal category label
  const getGoalCategoryLabel = (categoryKey: string) => {
    const categoryObj = goalCategories.find((cat) => cat.key === categoryKey);
    return categoryObj ? categoryObj.label : categoryKey;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return theme.success; // Green when completed
    if (progress >= 75) return theme.primary; // Blue when close
    if (progress >= 50) return '#f59e0b'; // Yellow when halfway
    return theme.danger; // Red when far from goal
  };

  // Filter by selected account when provided (same as Dashboard)
  const goalsForAccount = propSelectedAccountId
    ? goals.filter((g) => g.account_id === propSelectedAccountId)
    : goals;
  const displayTotalSavings = propSelectedAccountId
    ? goalsForAccount.filter((g) => g.is_active).reduce((sum, g) => sum + (g.current_amount || 0), 0)
    : totalSavings;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: 'bold',
                  fontSize: 24,
                }}>
                {t.totalSavings || 'Savings Goals'}
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}>
                {goalsForAccount.filter((g) => g.is_active).length} active •{' '}
                {goalsForAccount.filter((g) => !g.is_active).length} inactive
              </Text>
            </View>
          </View>

          {/* Total Savings Card - Simplified */}
          <View
            style={{
              backgroundColor: theme.primary,
              padding: 20,
              borderRadius: 16,
              marginBottom: 24,
            }}>
            <View className="flex-row items-center mb-2">
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 20,
                  padding: 8,
                  marginRight: 8,
                }}>
                <PiggyBank size={20} color={theme.primaryText} />
              </View>
              <Text
                style={{
                  color: theme.primaryText,
                  fontSize: 14,
                  fontWeight: '500',
                  opacity: 0.9,
                }}>
                {t.totalSavings || 'Total Savings'}
              </Text>
            </View>
            <Text
              style={{
                color: theme.primaryText,
                fontSize: 32,
                fontWeight: 'bold',
                marginBottom: 4,
              }}>
              ${displayTotalSavings.toFixed(2)}
            </Text>
            <Text
              style={{ color: theme.primaryText, fontSize: 13, opacity: 0.8 }}>
              {t.acrossActiveGoals?.replace(
                '{count}',
                goalsForAccount.filter((g) => g.is_active).length.toString(),
              ) ||
                `Across ${goalsForAccount.filter((g) => g.is_active).length} active goals`}
            </Text>
          </View>

          {/* Active Goals - Simplified */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: theme.text,
                fontWeight: 'bold',
                fontSize: 18,
                marginBottom: 12,
              }}>
              {t.activeGoals || 'Active Goals'}
            </Text>

            {goalsForAccount.filter((goal) => goal.is_active).length === 0 ? (
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
                  {t.noActiveSavingsGoals}
                </Text>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 14,
                    marginTop: 8,
                  }}>
                  {t.createFirstGoal}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {goalsForAccount
                  .filter((goal) => goal.is_active)
                  .map((goal) => {
                    const progress = calculateProgress(
                      goal.current_amount,
                      goal.target_amount,
                    );
                    const daysLeft = Math.ceil(
                      (new Date(goal.target_date).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24),
                    );
                    const isOverdue = daysLeft < 0;

                    return (
                      <Pressable
                        key={goal.id}
                        style={{
                          padding: 16,
                          backgroundColor: theme.cardBackground,
                          borderRadius: 16,
                        }}
                        onPress={() => openEditModal(goal)}>
                        {/* Header */}
                        <View className="flex-row justify-between items-start mb-3">
                          <View className="flex-row items-center flex-1">
                            <View
                              style={{
                                backgroundColor: goal.icon_color,
                                borderRadius: 24,
                                padding: 10,
                                marginRight: 12,
                              }}>
                              {React.createElement(getGoalIcon(goal.icon), {
                                size: 20,
                                color: 'white',
                              })}
                            </View>
                            <View className="flex-1">
                              <Text
                                style={{
                                  color: theme.text,
                                  fontWeight: 'bold',
                                  fontSize: 18,
                                }}>
                                {goal.name}
                              </Text>
                              <View
                                className="flex-row items-center mt-1"
                                style={{ gap: 6 }}>
                                <View
                                  style={{
                                    backgroundColor: `${goal.icon_color}20`,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                  }}>
                                  <Text
                                    style={{
                                      color: goal.icon_color,
                                      fontSize: 11,
                                      fontWeight: '600',
                                    }}>
                                    {getGoalCategoryLabel(goal.category)}
                                  </Text>
                                </View>
                                <View
                                  style={{
                                    backgroundColor:
                                      progress >= 100
                                        ? '#dcfce7'
                                        : progress >= 75
                                          ? '#e0e7ff'
                                          : '#fef3c7',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                  }}>
                                  <Text
                                    style={{
                                      color:
                                        progress >= 100
                                          ? '#16a34a'
                                          : progress >= 75
                                            ? '#4f46e5'
                                            : '#d97706',
                                      fontSize: 11,
                                      fontWeight: '600',
                                    }}>
                                    {Math.round(progress)}%
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                          <Switch
                            value={goal.is_active}
                            onValueChange={() =>
                              handleToggleGoalStatus(goal.id, goal.is_active)
                            }
                            trackColor={{
                              false: '#767577',
                              true: theme.primary,
                            }}
                            thumbColor="#f4f3f4"
                          />
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
                              Current / Target
                            </Text>
                            <Text
                              style={{
                                color: theme.text,
                                fontWeight: 'bold',
                                fontSize: 20,
                              }}>
                              ${goal.current_amount.toFixed(2)}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text
                              style={{
                                color: theme.textSecondary,
                                fontSize: 12,
                                marginBottom: 4,
                              }}>
                              Remaining
                            </Text>
                            <Text
                              style={{
                                fontWeight: 'bold',
                                fontSize: 20,
                                color: getProgressColor(progress),
                              }}>
                              $
                              {(
                                goal.target_amount - goal.current_amount
                              ).toFixed(2)}
                            </Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View className="mb-3">
                          <View
                            style={{
                              height: 8,
                              backgroundColor: theme.border,
                              borderRadius: 4,
                              overflow: 'hidden',
                            }}>
                            <View
                              style={{
                                height: 8,
                                borderRadius: 4,
                                width: `${Math.min(progress, 100)}%`,
                                backgroundColor: getProgressColor(progress),
                              }}
                            />
                          </View>
                          <View className="flex-row justify-between mt-1">
                            <Text
                              style={{ color: theme.textMuted, fontSize: 11 }}>
                              Target: ${goal.target_amount.toFixed(2)}
                            </Text>
                            <Text
                              style={{ color: theme.textMuted, fontSize: 11 }}>
                              {isOverdue
                                ? '⚠️ Overdue'
                                : `${daysLeft} days left`}
                            </Text>
                          </View>
                        </View>

                        {/* Action Buttons */}
                        <View
                          className="flex-row gap-2 pt-3 border-t"
                          style={{ borderColor: theme.border }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#dcfce7',
                              paddingVertical: 10,
                              borderRadius: 8,
                              alignItems: 'center',
                            }}
                            onPress={() => openAddAmountModal(goal, 'add')}>
                            <Text
                              style={{
                                color: '#16a34a',
                                fontWeight: '600',
                                fontSize: 13,
                              }}>
                              {t.addAmount}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#fef3c7',
                              paddingVertical: 10,
                              borderRadius: 8,
                              alignItems: 'center',
                            }}
                            onPress={() =>
                              openAddAmountModal(goal, 'withdraw')
                            }>
                            <Text
                              style={{
                                color: '#d97706',
                                fontWeight: '600',
                                fontSize: 13,
                              }}>
                              {t.withdrawAmount}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </Pressable>
                    );
                  })}
              </View>
            )}
          </View>

          {/* Inactive Goals - Simplified */}
          {goalsForAccount.filter((goal) => !goal.is_active).length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: 'bold',
                  fontSize: 18,
                  marginBottom: 12,
                }}>
                {t.inactiveGoals || 'Inactive Goals'}
              </Text>
              <View style={{ gap: 12 }}>
                {goalsForAccount
                  .filter((goal) => !goal.is_active)
                  .map((goal) => {
                    const progress = calculateProgress(
                      goal.current_amount,
                      goal.target_amount,
                    );

                    return (
                      <Pressable
                        key={goal.id}
                        style={{
                          padding: 16,
                          backgroundColor: theme.cardBackground,
                          borderRadius: 16,
                          opacity: 0.7,
                        }}
                        onPress={() => openEditModal(goal)}>
                        <View className="flex-row justify-between items-center">
                          <View className="flex-row items-center flex-1">
                            <View
                              style={{
                                backgroundColor: goal.icon_color,
                                borderRadius: 24,
                                padding: 10,
                                marginRight: 12,
                                opacity: 0.6,
                              }}>
                              {React.createElement(getGoalIcon(goal.icon), {
                                size: 20,
                                color: 'white',
                              })}
                            </View>
                            <View className="flex-1">
                              <Text
                                style={{
                                  color: theme.text,
                                  fontWeight: '600',
                                  fontSize: 16,
                                }}>
                                {goal.name}
                              </Text>
                              <View
                                className="flex-row items-center mt-1"
                                style={{ gap: 6 }}>
                                <Text
                                  style={{
                                    color: theme.textSecondary,
                                    fontSize: 12,
                                  }}>
                                  {getGoalCategoryLabel(goal.category)}
                                </Text>
                                <Text
                                  style={{
                                    color: theme.textMuted,
                                    fontSize: 12,
                                  }}>
                                  •
                                </Text>
                                <Text
                                  style={{
                                    color: theme.textMuted,
                                    fontSize: 12,
                                  }}>
                                  {Math.round(progress)}% complete
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Switch
                            value={goal.is_active}
                            onValueChange={() =>
                              handleToggleGoalStatus(goal.id, goal.is_active)
                            }
                            trackColor={{
                              false: '#767577',
                              true: theme.primary,
                            }}
                            thumbColor="#f4f3f4"
                          />
                        </View>
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Goal FAB - bottom right (same position as Budget/Subscriptions) */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 18,
          right: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 28,
          backgroundColor: theme.primary,
          gap: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 8,
        }}
        onPress={openAddModal}
      >
        <Plus size={22} color={theme.primaryText} />
        <Text
          style={{
            color: theme.primaryText,
            fontSize: 15,
            fontWeight: '600',
          }}
        >
          {t.addGoal}
        </Text>
      </TouchableOpacity>

      {/* Add/Edit Goal Modal - Simplified */}
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
              backgroundColor: theme.cardBackground,
              borderRadius: 20,
              padding: 20,
              width: '100%',
              maxWidth: 400,
              maxHeight: '90%',
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
                  {isEditMode ? t.editGoal : t.addGoal}
                </Text>
                <View className="flex-row items-center gap-2">
                  {isEditMode && currentGoal && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#fee2e2',
                        padding: 8,
                        borderRadius: 8,
                      }}
                      onPress={() => handleDelete(currentGoal.id)}>
                      <Trash2 size={16} color="#dc2626" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={24} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Icon & Color - Inline Selector */}
              <View className="mb-4">
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: '500',
                    fontSize: 13,
                  }}>
                  {t.goalIcon || 'Icon & Color'}
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor: theme.background,
                      flex: 1,
                    }}
                    onPress={() => setIsIconModalVisible(true)}>
                    <View
                      style={{
                        backgroundColor: formData.icon_color,
                        borderRadius: 20,
                        padding: 8,
                        marginRight: 8,
                      }}>
                      {React.createElement(getGoalIcon(formData.icon), {
                        size: 16,
                        color: 'white',
                      })}
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                      Change
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor: theme.background,
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: 60,
                    }}
                    onPress={() => setIsColorModalVisible(true)}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: formData.icon_color,
                        borderWidth: 2,
                        borderColor: theme.border,
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Goal Name */}
              <View className="mb-4">
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: '500',
                    fontSize: 13,
                  }}>
                  {t.goalName || 'Goal Name'} *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    padding: 14,
                    backgroundColor: theme.background,
                    color: theme.text,
                    fontSize: 15,
                  }}
                  placeholder={t.enterGoalName || 'e.g., New Car'}
                  placeholderTextColor={theme.textMuted}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />
              </View>

              {/* Category - Card opens bottom sheet */}
              <View className="mb-4">
                <Text style={{ color: theme.text, marginBottom: 8, fontWeight: '500', fontSize: 13 }}>{t.goalCategory || 'Category'} *</Text>
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
                    borderColor: formData.category ? theme.primary : theme.border,
                    backgroundColor: theme.background,
                    minHeight: 50,
                  }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: formData.category ? theme.text : theme.textMuted }} numberOfLines={1}>
                    {formData.category ? getGoalCategoryLabel(formData.category) : (t.selectCategory || 'Select category')}
                  </Text>
                  <ChevronDown size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Category bottom sheet */}
              <Modal visible={categorySheetOpen} transparent animationType="slide" onRequestClose={() => setCategorySheetOpen(false)}>
                <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setCategorySheetOpen(false)}>
                  <Pressable style={{ maxHeight: '75%', backgroundColor: theme.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }} onPress={(e) => e.stopPropagation()}>
                    <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} /></View>
                    <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16 }}>{t.selectCategory || 'Select category'}</Text>
                      <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                        {goalCategories.map((category) => (
                          <TouchableOpacity
                            key={category.key}
                            activeOpacity={0.7}
                            onPress={() => { setFormData({ ...formData, category: category.key }); setCategorySheetOpen(false); }}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.background, marginBottom: 8, borderWidth: 1, borderColor: theme.border }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, flex: 1 }}>{category.label}</Text>
                            <ChevronDown size={18} color={theme.textMuted} style={{ transform: [{ rotate: '-90deg' }] }} />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </Pressable>
                </Pressable>
              </Modal>

              {/* Account - Card opens bottom sheet */}
              <View className="mb-4">
                <Text style={{ color: theme.text, marginBottom: 8, fontWeight: '500', fontSize: 13 }}>{t.account || 'Account'} *</Text>
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
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: selectedAccount ? `${theme.primary}18` : `${theme.border}40`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Wallet size={20} color={selectedAccount ? theme.primary : theme.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: selectedAccount ? theme.text : theme.textMuted }} numberOfLines={1}>
                        {selectedAccount?.name ?? (t.selectAccount || 'Select account')}
                      </Text>
                      {selectedAccount && <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{t.balance || 'Balance'}: ${selectedAccount.amount.toFixed(2)}</Text>}
                    </View>
                  </View>
                  <ChevronDown size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Account bottom sheet */}
              <Modal visible={accountSheetOpen} transparent animationType="slide" onRequestClose={() => setAccountSheetOpen(false)}>
                <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setAccountSheetOpen(false)}>
                  <Pressable style={{ maxHeight: '75%', backgroundColor: theme.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }} onPress={(e) => e.stopPropagation()}>
                    <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} /></View>
                    <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16 }}>{t.selectAccount || 'Select account'}</Text>
                      <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                        {accounts.length === 0 ? (
                          <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: 'center', paddingVertical: 24 }}>{t.noAccountsAvailable || 'No accounts available'}</Text>
                        ) : (
                          accounts.map((account) => (
                            <TouchableOpacity
                              key={account.id}
                              activeOpacity={0.7}
                              onPress={() => { setSelectedAccount(account); setAccountSheetOpen(false); }}
                              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.background, marginBottom: 8, borderWidth: 1, borderColor: theme.border }}>
                              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${theme.primary}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Wallet size={20} color={theme.primary} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{account.name}</Text>
                                <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{t.balance || 'Balance'}: ${account.amount.toFixed(2)}</Text>
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

              {/* Target Amount & Date - Side by Side */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: '500',
                      fontSize: 13,
                    }}>
                    {t.targetAmount || 'Target Amount'} *
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      backgroundColor: theme.background,
                    }}>
                    <View style={{ paddingLeft: 12 }}>
                      <DollarSign size={16} color={theme.textMuted} />
                    </View>
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 14,
                        color: theme.text,
                        fontSize: 15,
                      }}
                      placeholder="0.00"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="numeric"
                      value={formData.target_amount}
                      onChangeText={(text) =>
                        setFormData({ ...formData, target_amount: text })
                      }
                    />
                  </View>
                </View>

                <View className="flex-1">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: '500',
                      fontSize: 13,
                    }}>
                    {t.targetDate || 'Target Date'} *
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={{
                      borderWidth: 1,
                      borderColor: formData.target_date ? theme.primary : theme.border,
                      borderRadius: 12,
                      padding: 14,
                      backgroundColor: theme.background,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onPress={() => {
                      setSelectedDate(formData.target_date ? new Date(formData.target_date + 'T12:00:00') : new Date());
                      setShowDatePicker(true);
                    }}>
                    <Text
                      style={{
                        color: formData.target_date
                          ? theme.text
                          : theme.textMuted,
                        fontSize: 15,
                        fontWeight: '500',
                      }}
                      numberOfLines={1}>
                      {formData.target_date
                        ? formatDate(formData.target_date).replace(',', '')
                        : (t.selectDate || 'Select target date')}
                    </Text>
                    <Calendar size={20} color={formData.target_date ? theme.primary : theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Current Amount (Edit Mode Only) */}
              {isEditMode && (
                <View className="mb-4">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: '500',
                      fontSize: 13,
                    }}>
                    {t.currentAmount || 'Current Amount'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      backgroundColor: theme.background,
                    }}>
                    <View style={{ paddingLeft: 12 }}>
                      <DollarSign size={16} color={theme.textMuted} />
                    </View>
                    <TextInput
                      style={{
                        flex: 1,
                        padding: 14,
                        color: theme.text,
                        fontSize: 15,
                      }}
                      placeholder="0.00"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="numeric"
                      value={formData.current_amount}
                      onChangeText={(text) =>
                        setFormData({ ...formData, current_amount: text })
                      }
                    />
                  </View>
                </View>
              )}

              {/* Active Toggle & Save Button */}
              <View
                className="flex-row items-center justify-between py-3 px-2 mb-4"
                style={{ backgroundColor: theme.background, borderRadius: 12 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: '500',
                    fontSize: 14,
                  }}>
                  {t.active || 'Active Goal'}
                </Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value })
                  }
                  trackColor={{ false: '#767577', true: theme.primary }}
                  thumbColor="#f4f3f4"
                />
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={handleSave}>
                <Text
                  style={{
                    color: theme.primaryText,
                    fontWeight: '600',
                    fontSize: 16,
                  }}>
                  {isEditMode
                    ? t.updateGoal || 'Update Goal'
                    : t.saveGoal || 'Save Goal'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {/* Target Date Picker - inside Goal modal so it shows on top */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}>
          <Pressable
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
            onPress={() => setShowDatePicker(false)}>
            <Pressable
              style={{
                maxHeight: '85%',
                backgroundColor: theme.cardBackground,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                overflow: 'hidden',
              }}
              onPress={(e) => e.stopPropagation()}>
              <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
              </View>
              <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 18,
                      fontWeight: '700',
                    }}>
                    {t.selectTargetDate || 'Select target date'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <X size={24} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode="single"
                  date={selectedDate}
                  onChange={({ date }) => {
                    if (date) {
                      const d = new Date(date as string | number | Date);
                      setFormData((prev) => ({
                        ...prev,
                        target_date: d.toISOString().split('T')[0],
                      }));
                      setSelectedDate(d);
                      setShowDatePicker(false);
                    }
                  }}
                  minDate={new Date()}
                  showOutsideDays
                  containerHeight={280}
                  components={{
                    IconPrev: <ChevronLeft size={20} color={theme.text} />,
                    IconNext: <ChevronRight size={20} color={theme.text} />,
                  } as CalendarComponents}
                  styles={defaultDatePickerStyles}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </Modal>

      {/* Add Amount Modal - Improved UI */}
      <Modal
        visible={isAddAmountModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddAmountModalVisible(false)}>
        <Pressable
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          onPress={() => setIsAddAmountModalVisible(false)}>
          <Pressable
            style={{
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom + 20,
            }}
            onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
            </View>

            <View style={{ paddingHorizontal: 24 }}>
              {/* Header with goal info */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 22 }}>
                    {t.addAmount || 'Add Savings'}
                  </Text>
                  {currentGoal && (
                    <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4 }}>
                      {currentGoal.name}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={{ padding: 8, backgroundColor: theme.background, borderRadius: 20 }}
                  onPress={() => setIsAddAmountModalVisible(false)}>
                  <X size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Goal progress summary */}
              {currentGoal && (
                <View style={{
                  backgroundColor: '#dcfce7',
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 20,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: '#16a34a', fontSize: 13, fontWeight: '500' }}>
                      {t.currentAmount || 'Current'}
                    </Text>
                    <Text style={{ color: '#16a34a', fontSize: 13, fontWeight: '500' }}>
                      {t.targetAmount || 'Target'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#15803d', fontSize: 20, fontWeight: 'bold' }}>
                      ${currentGoal.current_amount?.toFixed(2) || '0.00'}
                    </Text>
                    <Text style={{ color: '#15803d', fontSize: 20, fontWeight: 'bold' }}>
                      ${currentGoal.target_amount?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#bbf7d0', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
                    <View style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#16a34a',
                      width: `${Math.min(calculateProgress(currentGoal.current_amount, currentGoal.target_amount), 100)}%`,
                    }} />
                  </View>
                </View>
              )}

              {/* Amount Input - Large centered */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 12, fontWeight: '500' }}>
                  {t.enterAmount || 'Enter amount to add'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#16a34a', fontSize: 32, fontWeight: '600', marginRight: 4 }}>$</Text>
                  <TextInput
                    style={{
                      color: theme.text,
                      fontSize: 32,
                      fontWeight: '600',
                      minWidth: 120,
                      textAlign: 'center',
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
                    value={amountModalData.amount}
                    onChangeText={(text) =>
                      setAmountModalData({ ...amountModalData, amount: text.replace(/[^0-9.]/g, '') })
                    }
                    autoFocus
                  />
                </View>
              </View>

              {/* Quick amount buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
                {[25, 50, 100, 200].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 18,
                      borderRadius: 20,
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                    onPress={() => setAmountModalData({ ...amountModalData, amount: amt.toString() })}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
                      +${amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Add Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#16a34a',
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onPress={handleAddAmount}>
                <Plus size={20} color="white" />
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 17 }}>
                  {t.addAmount || 'Add to Savings'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Withdraw Amount Modal - Improved UI */}
      <Modal
        visible={isWithdrawModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsWithdrawModalVisible(false)}>
        <Pressable
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          onPress={() => setIsWithdrawModalVisible(false)}>
          <Pressable
            style={{
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom + 20,
            }}
            onPress={(e) => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
            </View>

            <View style={{ paddingHorizontal: 24 }}>
              {/* Header with goal info */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 22 }}>
                    {t.withdrawAmount || 'Withdraw Savings'}
                  </Text>
                  {currentGoal && (
                    <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4 }}>
                      {currentGoal.name}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={{ padding: 8, backgroundColor: theme.background, borderRadius: 20 }}
                  onPress={() => setIsWithdrawModalVisible(false)}>
                  <X size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Available balance */}
              {currentGoal && (
                <View style={{
                  backgroundColor: '#fef3c7',
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 20,
                }}>
                  <Text style={{ color: '#92400e', fontSize: 13, fontWeight: '500', marginBottom: 4 }}>
                    {t.availableToWithdraw || 'Available to withdraw'}
                  </Text>
                  <Text style={{ color: '#78350f', fontSize: 28, fontWeight: 'bold' }}>
                    ${currentGoal.current_amount?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              )}

              {/* Amount Input - Large centered */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 12, fontWeight: '500' }}>
                  {t.enterWithdrawAmount || 'Enter amount to withdraw'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#d97706', fontSize: 32, fontWeight: '600', marginRight: 4 }}>$</Text>
                  <TextInput
                    style={{
                      color: theme.text,
                      fontSize: 32,
                      fontWeight: '600',
                      minWidth: 120,
                      textAlign: 'center',
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
                    value={amountModalData.amount}
                    onChangeText={(text) =>
                      setAmountModalData({ ...amountModalData, amount: text.replace(/[^0-9.]/g, '') })
                    }
                    autoFocus
                  />
                </View>
              </View>

              {/* Quick amount buttons */}
              {currentGoal && currentGoal.current_amount > 0 && (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {[25, 50, 100].filter(amt => amt <= currentGoal.current_amount).map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 18,
                        borderRadius: 20,
                        backgroundColor: theme.background,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => setAmountModalData({ ...amountModalData, amount: amt.toString() })}>
                      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
                        ${amt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 18,
                      borderRadius: 20,
                      backgroundColor: '#fef3c7',
                      borderWidth: 1,
                      borderColor: '#fbbf24',
                    }}
                    onPress={() => setAmountModalData({ ...amountModalData, amount: currentGoal.current_amount.toString() })}>
                    <Text style={{ color: '#92400e', fontSize: 14, fontWeight: '600' }}>
                      {t.all || 'All'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Withdraw Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#d97706',
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onPress={handleAddAmount}>
                <TrendingUp size={20} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 17 }}>
                  {t.withdrawAmount || 'Withdraw'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Icon Selection - Bottom Sheet */}
      <Modal
        visible={isIconModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsIconModalVisible(false)}>
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setIsIconModalVisible(false)}>
          <Pressable
            style={{
              maxHeight: '70%',
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
            }}
            onPress={(e) => e.stopPropagation()}>
            <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16 }}>
                {t.selectGoalIcon || 'Select icon'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {Object.keys(goalIcons).map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    activeOpacity={0.7}
                    style={{
                      width: '30%',
                      padding: 14,
                      alignItems: 'center',
                      backgroundColor: formData.icon === icon ? `${theme.primary}18` : theme.background,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: formData.icon === icon ? theme.primary : theme.border,
                    }}
                    onPress={() => selectIcon(icon as GoalIcon)}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: formData.icon === icon ? formData.icon_color : `${theme.border}40`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 6,
                      }}>
                      {React.createElement(getGoalIcon(icon), {
                        size: 22,
                        color: formData.icon === icon ? 'white' : theme.textMuted,
                      })}
                    </View>
                    <Text
                      style={{
                        color: formData.icon === icon ? theme.primary : theme.textSecondary,
                        fontSize: 12,
                        fontWeight: formData.icon === icon ? '600' : '400',
                        textTransform: 'capitalize',
                      }}
                      numberOfLines={1}>
                      {icon === 'goal' ? 'General' : icon}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Color Selection - Bottom Sheet */}
      <Modal
        visible={isColorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsColorModalVisible(false)}>
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setIsColorModalVisible(false)}>
          <Pressable
            style={{
              maxHeight: '50%',
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
            }}
            onPress={(e) => e.stopPropagation()}>
            <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16 }}>
                {t.selectGoalColor || 'Select color'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    activeOpacity={0.7}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: color,
                      borderWidth: 3,
                      borderColor: formData.icon_color === color ? theme.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => selectColor(color)}
                  />
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
