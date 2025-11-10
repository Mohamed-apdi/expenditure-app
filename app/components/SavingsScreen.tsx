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
} from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { supabase } from '~/lib';
import {
  fetchGoalsWithAccounts,
  addGoal,
  updateGoal,
  deleteGoal,
  toggleGoalStatus,
  addAmountToGoal,
  withdrawAmountFromGoal,
  calculateGoalProgress,
  getTotalSavings,
  type Goal,
} from '~/lib';
import { fetchAccounts, type Account } from '~/lib';
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
}

export default function SavingsScreen({
  accounts: propAccounts,
  userId: propUserId,
  onRefresh: propOnRefresh,
}: SavingsScreenProps = {}) {
  const theme = useTheme();
  const { t } = useLanguage();
  const [goals, setGoals] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [accounts, setAccounts] = useState<Account[]>(propAccounts || []);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const insets = useSafeAreaInsets();
  const [totalSavings, setTotalSavings] = useState(0);

  const [isModalVisible, setIsModalVisible] = useState(false);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      setUserId(user.id);

      // Fetch goals with accounts, accounts, goal progress, and total savings in parallel
      const [goalsData, accountsData, progressData, totalData] =
        await Promise.all([
          fetchGoalsWithAccounts(user.id),
          fetchAccounts(user.id),
          calculateGoalProgress(user.id),
          getTotalSavings(user.id),
        ]);

      setGoals(goalsData);
      setAccounts(accountsData);
      setTotalSavings(totalData);

      // Set default selected account if available
      if (accountsData.length > 0) {
        setSelectedAccount(accountsData[0]);
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

  // Sync with parent props when they change
  useEffect(() => {
    if (propAccounts !== undefined) {
      setAccounts(propAccounts);
      // Set default selected account if not already set and accounts are available
      if (propAccounts.length > 0 && !selectedAccount) {
        setSelectedAccount(propAccounts[0]);
      }
    }
  }, [propAccounts]);

  useEffect(() => {
    if (propUserId !== undefined && propUserId !== null) {
      setUserId(propUserId);
    }
  }, [propUserId]);

  const handleToggleGoalStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleGoalStatus(id, !currentStatus);
      // Refresh data to get updated status
      fetchData();
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
        await updateGoal(currentGoal.id, goalData);
        Alert.alert(t.success, t.goalUpdated);
      } else {
        await addGoal(goalData);
        Alert.alert(t.success, t.goalAdded);
      }

      setIsModalVisible(false);
      // Refresh data to get updated goals
      fetchData();
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

      if (amountModalData.type === 'add') {
        await addAmountToGoal(currentGoal.id, amount);
        Alert.alert(t.success, t.amountAdded);
      } else {
        await withdrawAmountFromGoal(currentGoal.id, amount);
        Alert.alert(t.success, t.amountWithdrawn);
      }

      setIsAddAmountModalVisible(false);
      setIsWithdrawModalVisible(false);
      // Refresh data to get updated goals
      fetchData();
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
            await deleteGoal(id);
            Alert.alert(t.success, t.goalDeleted);
            // Refresh data to get updated goals
            fetchData();
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

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setFormData({
        ...formData,
        target_date: selectedDate.toISOString().split('T')[0],
      });
    }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
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
                {t.totalSavings || 'Savings Goals'}
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}>
                {goals.filter((g) => g.is_active).length} active •{' '}
                {goals.filter((g) => !g.is_active).length} inactive
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={openAddModal}>
              <Text style={{ color: theme.primaryText, fontWeight: '600' }}>
                {t.addGoal}
              </Text>
            </TouchableOpacity>
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
              ${totalSavings.toFixed(2)}
            </Text>
            <Text
              style={{ color: theme.primaryText, fontSize: 13, opacity: 0.8 }}>
              {t.acrossActiveGoals?.replace(
                '{count}',
                goals.filter((g) => g.is_active).length.toString(),
              ) ||
                `Across ${goals.filter((g) => g.is_active).length} active goals`}
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

            {goals.filter((goal) => goal.is_active).length === 0 ? (
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
                {goals
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
          {goals.filter((goal) => !goal.is_active).length > 0 && (
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
                {goals
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

              {/* Category - Simple Selection */}
              <View className="mb-4">
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: '500',
                    fontSize: 13,
                  }}>
                  {t.goalCategory || 'Category'} *
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -4 }}>
                  <View className="flex-row gap-2 px-1">
                    {goalCategories.map((category) => (
                      <TouchableOpacity
                        key={category.key}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor:
                            formData.category === category.key
                              ? theme.primary
                              : theme.border,
                          backgroundColor:
                            formData.category === category.key
                              ? `${theme.primary}20`
                              : theme.background,
                        }}
                        onPress={() => {
                          setFormData({ ...formData, category: category.key });
                        }}>
                        <Text
                          style={{
                            color:
                              formData.category === category.key
                                ? theme.primary
                                : theme.textSecondary,
                            fontSize: 13,
                            fontWeight:
                              formData.category === category.key
                                ? '600'
                                : '400',
                          }}>
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Account */}
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
                <RNPickerSelect
                  onValueChange={(value) => {
                    const account = accounts.find((acc) => acc.id === value);
                    setSelectedAccount(account || null);
                  }}
                  items={accounts.map((account) => ({
                    label: `${account.name}`,
                    value: account.id,
                  }))}
                  value={selectedAccount?.id}
                  placeholder={{
                    label: t.selectAccount || 'Select account',
                    value: null,
                  }}
                  style={{
                    inputIOS: {
                      fontSize: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: selectedAccount ? theme.text : theme.textMuted,
                      minHeight: 50,
                    },
                    inputAndroid: {
                      fontSize: 14,
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: selectedAccount ? theme.text : theme.textMuted,
                      minHeight: 50,
                    },
                    placeholder: {
                      color: theme.textMuted,
                    },
                    iconContainer: {
                      top: 18,
                      right: 12,
                    },
                  }}
                  Icon={() => {
                    return (
                      <View
                        style={{
                          backgroundColor: 'transparent',
                          borderTopWidth: 6,
                          borderTopColor: theme.textMuted,
                          borderRightWidth: 6,
                          borderRightColor: 'transparent',
                          borderLeftWidth: 6,
                          borderLeftColor: 'transparent',
                          width: 0,
                          height: 0,
                        }}
                      />
                    );
                  }}
                  useNativeAndroidPickerStyle={false}
                />
              </View>

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
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 14,
                      backgroundColor: theme.background,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onPress={() => setShowDatePicker(true)}>
                    <Text
                      style={{
                        color: formData.target_date
                          ? theme.text
                          : theme.textMuted,
                        fontSize: 14,
                      }}
                      numberOfLines={1}>
                      {formData.target_date
                        ? formatDate(formData.target_date).replace(',', '')
                        : 'Select'}
                    </Text>
                    <Calendar size={14} color={theme.textMuted} />
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
      </Modal>

      {/* Add Amount Modal */}
      <Modal
        visible={isAddAmountModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAddAmountModalVisible(false)}>
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
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 400,
            }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text
                style={{ color: theme.text, fontWeight: 'bold', fontSize: 20 }}>
                {t.addAmount}
              </Text>
              <TouchableOpacity
                onPress={() => setIsAddAmountModalVisible(false)}>
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View className="space-y-5">
              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: '500',
                  }}>
                  {t.amount}
                </Text>
                <View
                  className="flex items-center "
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    backgroundColor: theme.background,
                  }}>
                  <View style={{ paddingHorizontal: 16 }}>
                    <DollarSign size={18} color={theme.textMuted} />
                  </View>
                  <TextInput
                    style={{ flex: 1, padding: 16, color: theme.text }}
                    placeholder={t.enterAmount}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={amountModalData.amount}
                    onChangeText={(text) =>
                      setAmountModalData({ ...amountModalData, amount: text })
                    }
                  />
                </View>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: '#10b981',
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={handleAddAmount}>
                <Text
                  style={{ color: 'white', fontWeight: '500', fontSize: 18 }}>
                  {t.addAmount}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw Amount Modal */}
      <Modal
        visible={isWithdrawModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsWithdrawModalVisible(false)}>
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
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 400,
            }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text
                style={{ color: theme.text, fontWeight: 'bold', fontSize: 20 }}>
                {t.withdrawAmount}
              </Text>
              <TouchableOpacity
                onPress={() => setIsWithdrawModalVisible(false)}>
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View className="space-y-5">
              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: '500',
                  }}>
                  {t.amount}
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
                  <View style={{ paddingHorizontal: 16 }}>
                    <DollarSign size={18} color={theme.textMuted} />
                  </View>
                  <TextInput
                    style={{ flex: 1, padding: 16, color: theme.text }}
                    placeholder={t.enterAmount}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={amountModalData.amount}
                    onChangeText={(text) =>
                      setAmountModalData({ ...amountModalData, amount: text })
                    }
                  />
                </View>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: '#f59e0b',
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                onPress={handleAddAmount}>
                <Text
                  style={{ color: 'white', fontWeight: '500', fontSize: 18 }}>
                  {t.withdrawAmount}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Icon Selection Modal */}
      <Modal
        visible={isIconModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsIconModalVisible(false)}>
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
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 400,
            }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text
                style={{ color: theme.text, fontWeight: 'bold', fontSize: 12 }}>
                {t.selectGoalIcon}
              </Text>
              <TouchableOpacity onPress={() => setIsIconModalVisible(false)}>
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-3">
              {Object.keys(goalIcons).map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={{
                    width: '30%',
                    padding: 16,
                    alignItems: 'center',
                    backgroundColor:
                      formData.icon === icon
                        ? `${theme.primary}20`
                        : theme.background,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor:
                      formData.icon === icon ? theme.primary : theme.border,
                  }}
                  onPress={() => selectIcon(icon as GoalIcon)}>
                  <View
                    className="rounded-full mb-3"
                    style={{
                      backgroundColor:
                        formData.icon === icon
                          ? formData.icon_color
                          : `${theme.primary}20`,
                      borderWidth: 2,
                      borderColor:
                        formData.icon === icon
                          ? formData.icon_color
                          : theme.border,
                    }}>
                    {React.createElement(getGoalIcon(icon), {
                      size: 18,
                      color: formData.icon === icon ? 'white' : theme.primary,
                    })}
                  </View>
                  <Text
                    style={{
                      color:
                        formData.icon === icon ? theme.primary : theme.text,
                      fontSize: 12,
                      fontWeight: formData.icon === icon ? '600' : '400',
                      textTransform: 'capitalize',
                      textAlign: 'center',
                    }}>
                    {icon === 'goal' ? 'General' : icon}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Color Selection Modal */}
      <Modal
        visible={isColorModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsColorModalVisible(false)}>
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
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 400,
            }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text
                style={{ color: theme.text, fontWeight: 'bold', fontSize: 20 }}>
                {t.selectGoalColor}
              </Text>
              <TouchableOpacity onPress={() => setIsColorModalVisible(false)}>
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={{
                    width: '25%',
                    padding: 16,
                    alignItems: 'center',
                    backgroundColor:
                      formData.icon_color === color
                        ? `${theme.primary}20`
                        : 'transparent',
                    borderRadius: 8,
                  }}
                  onPress={() => selectColor(color)}>
                  <View
                    className="w-10 h-10 rounded-full mb-2"
                    style={{ backgroundColor: color }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}
