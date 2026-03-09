import { useState, useEffect, useRef } from 'react';
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
  Image,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { Calendar, X, Trash2, DollarSign, Plus, Wallet, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import DateTimePicker, {
  useDefaultStyles,
  type CalendarComponents,
} from 'react-native-ui-datepicker';
import * as Notifications from 'expo-notifications';
import { getCurrentUserOfflineFirst } from '~/lib';
import {
  selectSubscriptions,
  createSubscriptionLocal,
  updateSubscriptionLocal,
  deleteSubscriptionLocal,
  isOfflineGateLocked,
  triggerSync,
  createTransactionLocal,
  updateAccountLocal,
  type Subscription,
} from '~/lib';
import { useAccount, type Account } from '~/lib';
import { notificationService, isExpoGo } from '~/lib';
import ExpoGoWarning from '~/components/ExpoGoWarning';
import { useTheme } from '~/lib';
import { useLanguage } from '~/lib';

// Mock the icons - replace with your actual assets
const serviceIcons = {
  streaming: require('../../assets/subscription_icons/YouTube.png'),
  fitness: require('../../assets/subscription_icons/Muscle.png'),
  music: require('../../assets/subscription_icons/Spotify.png'),
  software: require('../../assets/subscription_icons/Code.png'),
  cloud: require('../../assets/subscription_icons/Cloud Database.png'),
  education: require('../../assets/subscription_icons/Graduation Cap.png'),
  gaming: require('../../assets/subscription_icons/Game Controller.png'),
  subscriptions: require('../../assets/subscription_icons/View More.png'),
  other: require('../../assets/subscription_icons/View More.png'),
};

const colors = [
  '#ef4444', // Red
  '#f59e0b', // Orange
  '#10b981', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

interface SubscriptionsScreenProps {
  accounts?: Account[];
  userId?: string | null;
  onRefresh?: () => Promise<void>;
  /** When set (e.g. from Budget screen), show only subscriptions for this account (same as Dashboard). */
  selectedAccountId?: string | null;
}

export default function SubscriptionsScreen({
  accounts: propAccounts,
  userId: propUserId,
  onRefresh: propOnRefresh,
  selectedAccountId: propSelectedAccountId,
}: SubscriptionsScreenProps = {}) {
  const theme = useTheme();
  const { t } = useLanguage();
  const { accounts: contextAccounts } = useAccount();
  const defaultDatePickerStyles = useDefaultStyles(
    theme.isDarkColorScheme ? 'dark' : 'light',
  );
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [accounts, setAccounts] = useState<Account[]>(propAccounts ?? contextAccounts);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const insets = useSafeAreaInsets();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [isIconModalVisible, setIsIconModalVisible] = useState(false);
  const [isColorModalVisible, setIsColorModalVisible] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    billing_cycle: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    next_payment_date: new Date(),
    is_active: true,
    icon: 'other' as ServiceIcon,
    icon_color: colors[0],
    category: '',
    description: '',
  });

  const billingCycles = [
    { key: 'weekly', label: t.weekly },
    { key: 'monthly', label: t.monthly },
    { key: 'yearly', label: t.yearly },
  ];
  // Use the exact same expense categories as BudgetScreen and AddExpense

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

  // Define service icons
  type ServiceIcon =
    | 'streaming'
    | 'fitness'
    | 'music'
    | 'software'
    | 'cloud'
    | 'education'
    | 'gaming'
    | 'subscriptions'
    | 'other';
  const getDefaultIcon = (serviceName: string): ServiceIcon => {
    const name = serviceName.toLowerCase();
    if (
      name.includes('netflix') ||
      name.includes('hulu') ||
      name.includes('disney')
    )
      return 'streaming';
    if (name.includes('gym') || name.includes('fitness')) return 'fitness';
    if (name.includes('spotify') || name.includes('apple music'))
      return 'music';
    if (name.includes('adobe') || name.includes('microsoft')) return 'software';
    if (name.includes('dropbox') || name.includes('google')) return 'cloud';
    if (name.includes('subscription') || name.includes('recurring'))
      return 'subscriptions';
    return 'other';
  };
  const fetchData = async () => {
    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) return;

      setUserId(user.id);

      const accountList = propAccounts ?? contextAccounts;
      const subscriptionsData = selectSubscriptions(user.id).map((s) => ({
        ...s,
        account: accountList.find((a) => a.id === s.account_id),
      }));

      setSubscriptions(subscriptionsData);
      setAccounts(accountList);
      if (accountList.length > 0 && !selectedAccount) {
        setSelectedAccount(accountList[0]);
      }

      if (notificationService) {
        try {
          if (notificationService.scheduleAllUpcomingNotifications) {
            await notificationService.scheduleAllUpcomingNotifications();
          }
          if (notificationService.scheduleBudgetCheckNotifications) {
            await notificationService.scheduleBudgetCheckNotifications();
          }
        } catch (error) {
          console.error('Error scheduling notifications:', error);
        }
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

  // When used inside Budget screen: show local data immediately (no loading)
  useEffect(() => {
    if (propUserId == null) return;
    const list = propAccounts ?? contextAccounts ?? [];
    if (list.length === 0) return;
    setAccounts(list);
    const data = selectSubscriptions(propUserId).map((s) => ({
      ...s,
      account: list.find((a) => a.id === s.account_id),
    }));
    setSubscriptions(data);
    setSelectedAccount((prev) => prev ?? list[0]);
  }, [propUserId, propAccounts, contextAccounts]);

  // Initialize notifications when component mounts
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Check if notification service is available
        if (notificationService && notificationService.registerBackgroundTask) {
          await notificationService.registerBackgroundTask();
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    if (userId) {
      initializeNotifications();
    }
  }, [userId]);

  // Set up notification response listener
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Check if we're in Expo Go (where notifications are limited)
        if (isExpoGo) {
          console.warn(
            'Push notifications are limited in Expo Go with SDK 53. Use development build for full functionality.',
          );
          return;
        }

        // Check if notification service and handler are available
        if (
          notificationService &&
          notificationService.handleNotificationResponse
        ) {
          const subscription =
            Notifications.addNotificationResponseReceivedListener(
              notificationService.handleNotificationResponse,
            );

          return () => subscription.remove();
        }
      } catch (error) {
        console.error('Failed to setup notification listener:', error);
      }
    };

    setupNotifications();
  }, []);

  const toggleSubscription = async (id: string, currentStatus: boolean) => {
    try {
      updateSubscriptionLocal(id, { is_active: !currentStatus });
      if (!(await isOfflineGateLocked())) void triggerSync();
      fetchData();

      // Reschedule notifications based on new status
      try {
        if (
          notificationService &&
          notificationService.scheduleAllUpcomingNotifications
        ) {
          await notificationService.scheduleAllUpcomingNotifications();
        }
      } catch (error) {
        console.error('Error rescheduling notifications:', error);
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      Alert.alert(t.error, t.subscriptionToggleError);
    }
  };

  const openAddModal = () => {
    if (accounts.length === 0) {
      Alert.alert(
        t.noAccountsForSubscription,
        t.createAccountFirstForSubscription,
      );
      return;
    }
    setCurrentSubscription(null);
    setFormData({
      name: '',
      amount: '',
      billing_cycle: 'monthly',
      next_payment_date: new Date(),
      is_active: true,
      icon: 'other',
      icon_color: colors[0],
      category: '',
      description: '',
    });
    setSelectedAccount(accounts[0]); // Set default account
    setIsEditMode(false);
    setIsModalVisible(true);
  };

  const openEditModal = (subscription: any) => {
    setCurrentSubscription(subscription);
    setFormData({
      name: subscription.name,
      amount: subscription.amount.toString(),
      billing_cycle: subscription.billing_cycle,
      next_payment_date: new Date(subscription.next_payment_date),
      is_active: subscription.is_active,
      icon: subscription.icon,
      icon_color: subscription.icon_color,
      category: subscription.category,
      description: subscription.description || '',
    });

    // Find and set the account for this subscription
    const subscriptionAccount =
      subscription.account ||
      accounts.find((acc) => acc.id === subscription.account_id);
    setSelectedAccount(subscriptionAccount || null);

    setIsEditMode(true);
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.amount) {
      Alert.alert(t.error, t.pleaseFillSubscriptionNameAndAmount);
      return;
    }

    if (!selectedAccount) {
      Alert.alert(t.selectAccount, t.selectAccountForSubscription);
      return;
    }

    if (!userId) {
      Alert.alert(t.error, t.userNotAuthenticatedForSubscription);
      return;
    }

    try {
      const amount = parseFloat(formData.amount) || 0;
      const category = formData.category || 'Subscriptions';
      const nextPaymentDateStr = formData.next_payment_date.toISOString().split('T')[0];
      
      const subscriptionData = {
        user_id: userId,
        account_id: selectedAccount.id,
        name: formData.name,
        amount,
        category,
        billing_cycle: formData.billing_cycle,
        next_payment_date: nextPaymentDateStr,
        is_active: formData.is_active,
        icon: formData.icon,
        icon_color: formData.icon_color,
        description: formData.description,
      };

      if (isEditMode && currentSubscription) {
        updateSubscriptionLocal(currentSubscription.id, {
          ...subscriptionData,
          account_id: selectedAccount?.id ?? currentSubscription.account_id,
        });
        Alert.alert(t.success, t.subscriptionUpdated);
      } else {
        if (!selectedAccount || !userId) {
          Alert.alert(t.error, t.selectAccount);
          return;
        }
        createSubscriptionLocal({
          ...subscriptionData,
          user_id: userId,
          account_id: selectedAccount.id,
        });

        const today = new Date().toISOString().split('T')[0];
        const isPaymentDueToday = nextPaymentDateStr === today;
        
        if (isPaymentDueToday && formData.is_active) {
          createTransactionLocal({
            user_id: userId,
            account_id: selectedAccount.id,
            amount: amount,
            description: `${formData.name} - ${t.subscriptionPayment || 'Subscription payment'}`,
            date: today,
            category,
            type: 'expense',
            is_recurring: true,
            recurrence_interval: formData.billing_cycle,
          });

          const newBalance = selectedAccount.amount - amount;
          updateAccountLocal(selectedAccount.id, { amount: newBalance });
        }

        Alert.alert(t.success, t.subscriptionAdded);
      }

      setIsModalVisible(false);
      if (!(await isOfflineGateLocked())) void triggerSync();
      fetchData();

      try {
        if (
          notificationService &&
          notificationService.scheduleAllUpcomingNotifications
        ) {
          await notificationService.scheduleAllUpcomingNotifications();
        }
      } catch (error) {
        console.error('Error rescheduling notifications:', error);
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      Alert.alert(t.error, t.subscriptionSaveError);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(t.deleteSubscription, t.deleteSubscriptionConfirmation, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            deleteSubscriptionLocal(id);
            Alert.alert(t.success, t.subscriptionDeleted);
            if (!(await isOfflineGateLocked())) void triggerSync();
            fetchData();

            // Reschedule notifications for remaining subscriptions
            try {
              if (
                notificationService &&
                notificationService.scheduleAllUpcomingNotifications
              ) {
                await notificationService.scheduleAllUpcomingNotifications();
              }
            } catch (error) {
              console.error('Error rescheduling notifications:', error);
            }
          } catch (error) {
            console.error('Error deleting subscription:', error);
            Alert.alert(t.error, t.subscriptionDeleteError);
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

  const selectIcon = (icon: ServiceIcon) => {
    setFormData({ ...formData, icon });
    setIsIconModalVisible(false);
  };

  const selectColor = (color: string) => {
    setFormData({ ...formData, icon_color: color });
    setIsColorModalVisible(false);
  };

  const showDatePickerModal = () => {
    setSelectedDate(formData.next_payment_date || new Date());
    setShowDatePicker(true);
  };

  // Get translated category label
  const getCategoryLabel = (categoryKey: string) => {
    const categoryObj = expenseCategories.find(
      (cat) => cat.key === categoryKey,
    );
    return categoryObj ? categoryObj.label : categoryKey;
  };

  // Filter by selected account when provided (same as Dashboard)
  const subscriptionsForAccount = propSelectedAccountId
    ? subscriptions.filter((s) => s.account_id === propSelectedAccountId)
    : subscriptions;

  // Calculate total monthly cost (for displayed account only when filtered)
  const totalMonthlyCost = subscriptionsForAccount
    .filter((sub) => sub.is_active)
    .reduce((total, sub) => {
      let monthlyAmount = sub.amount;
      if (sub.billing_cycle === 'weekly') {
        monthlyAmount = sub.amount * 4.33; // Average weeks per month
      } else if (sub.billing_cycle === 'yearly') {
        monthlyAmount = sub.amount / 12;
      }
      return total + monthlyAmount;
    }, 0);

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
                style={{ color: theme.text, fontSize: 24, fontWeight: 'bold' }}>
                {t.subscriptions}
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}>
                {subscriptionsForAccount.filter((s) => s.is_active).length} active • $
                {totalMonthlyCost.toFixed(2)}/month
              </Text>
            </View>
          </View>

          {/* Summary Card - Simplified */}
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
                <DollarSign size={20} color={theme.primaryText} />
              </View>
              <Text
                style={{
                  color: theme.primaryText,
                  fontSize: 14,
                  fontWeight: '500',
                  opacity: 0.9,
                }}>
                {t.totalMonthlyCost || 'Monthly Cost'}
              </Text>
            </View>
            <Text
              style={{
                color: theme.primaryText,
                fontSize: 32,
                fontWeight: 'bold',
                marginBottom: 4,
              }}>
              ${totalMonthlyCost.toFixed(2)}
            </Text>
            <Text
              style={{ color: theme.primaryText, fontSize: 13, opacity: 0.8 }}>
              {subscriptionsForAccount.filter((s) => s.is_active).length} active
              subscriptions
            </Text>
          </View>

          {/* Active Subscriptions - Simplified */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: theme.text,
                fontWeight: 'bold',
                fontSize: 18,
                marginBottom: 12,
              }}>
              {t.activeSubscriptions}
            </Text>
            {subscriptionsForAccount.filter((sub) => sub.is_active).length === 0 ? (
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
                  {t.noActiveSubscriptions}
                </Text>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 14,
                    marginTop: 8,
                  }}>
                  Add your first subscription
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {subscriptionsForAccount
                  .filter((sub) => sub.is_active)
                  .map((subscription) => {
                    const daysUntilPayment = Math.ceil(
                      (new Date(subscription.next_payment_date).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24),
                    );

                    return (
                      <Pressable
                        key={subscription.id}
                        style={{
                          padding: 16,
                          backgroundColor: theme.cardBackground,
                          borderRadius: 16,
                        }}
                        onPress={() => openEditModal(subscription)}>
                        {/* Header */}
                        <View className="flex-row justify-between items-start mb-3">
                          <View className="flex-row items-center flex-1">
                            <View
                              style={{
                                backgroundColor: subscription.icon_color,
                                borderRadius: 24,
                                padding: 10,
                                marginRight: 12,
                              }}>
                              <Image
                                source={
                                  serviceIcons[
                                    subscription.icon as keyof typeof serviceIcons
                                  ] || serviceIcons.other
                                }
                                style={{ width: 20, height: 20 }}
                              />
                            </View>
                            <View className="flex-1">
                              <Text
                                style={{
                                  color: theme.text,
                                  fontWeight: 'bold',
                                  fontSize: 18,
                                }}>
                                {subscription.name}
                              </Text>
                              <View
                                className="flex-row items-center mt-1"
                                style={{ gap: 6 }}>
                                <View
                                  style={{
                                    backgroundColor: '#e0e7ff',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                  }}>
                                  <Text
                                    style={{
                                      color: '#4f46e5',
                                      fontSize: 11,
                                      fontWeight: '600',
                                    }}>
                                    {subscription.billing_cycle
                                      .charAt(0)
                                      .toUpperCase() +
                                      subscription.billing_cycle.slice(1)}
                                  </Text>
                                </View>
                                {subscription.category && (
                                  <View
                                    style={{
                                      backgroundColor: `${subscription.icon_color}20`,
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 12,
                                    }}>
                                    <Text
                                      style={{
                                        color: subscription.icon_color,
                                        fontSize: 11,
                                        fontWeight: '600',
                                      }}>
                                      {getCategoryLabel(subscription.category)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                          <Switch
                            value={subscription.is_active}
                            onValueChange={() =>
                              toggleSubscription(
                                subscription.id,
                                subscription.is_active,
                              )
                            }
                            trackColor={{
                              false: '#767577',
                              true: theme.primary,
                            }}
                            thumbColor="#f4f3f4"
                          />
                        </View>

                        {/* Amount & Next Payment */}
                        <View className="flex-row justify-between items-center mb-2">
                          <View>
                            <Text
                              style={{
                                color: theme.textSecondary,
                                fontSize: 12,
                                marginBottom: 4,
                              }}>
                              Amount
                            </Text>
                            <Text
                              style={{
                                color: theme.text,
                                fontWeight: 'bold',
                                fontSize: 24,
                              }}>
                              ${subscription.amount.toFixed(2)}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text
                              style={{
                                color: theme.textSecondary,
                                fontSize: 12,
                                marginBottom: 4,
                              }}>
                              Next Payment
                            </Text>
                            <Text
                              style={{
                                color: theme.text,
                                fontWeight: '500',
                                fontSize: 14,
                              }}>
                              {formatDate(subscription.next_payment_date)}
                            </Text>
                            <Text
                              style={{
                                color: theme.textMuted,
                                fontSize: 11,
                                marginTop: 2,
                              }}>
                              {daysUntilPayment > 0
                                ? `in ${daysUntilPayment} days`
                                : daysUntilPayment === 0
                                  ? 'Today'
                                  : 'Overdue'}
                            </Text>
                          </View>
                        </View>

                        {/* Account Info */}
                        {subscription.account && (
                          <View
                            className="pt-3 border-t"
                            style={{ borderColor: theme.border }}>
                            <Text
                              style={{ color: theme.textMuted, fontSize: 11 }}>
                              Account: {subscription.account.name}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
              </View>
            )}
          </View>

          {/* Inactive Subscriptions - Simplified */}
          {subscriptionsForAccount.filter((sub) => !sub.is_active).length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: 'bold',
                  fontSize: 18,
                  marginBottom: 12,
                }}>
                {t.InactiveSubscriptions || 'Inactive Subscriptions'}
              </Text>
              <View style={{ gap: 12 }}>
                {subscriptionsForAccount
                  .filter((sub) => !sub.is_active)
                  .map((subscription) => (
                    <Pressable
                      key={subscription.id}
                      style={{
                        padding: 16,
                        backgroundColor: theme.cardBackground,
                        borderRadius: 16,
                        opacity: 0.7,
                      }}
                      onPress={() => openEditModal(subscription)}>
                      <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center flex-1">
                          <View
                            style={{
                              backgroundColor: subscription.icon_color,
                              borderRadius: 24,
                              padding: 10,
                              marginRight: 12,
                              opacity: 0.6,
                            }}>
                            <Image
                              source={
                                serviceIcons[
                                  subscription.icon as keyof typeof serviceIcons
                                ] || serviceIcons.other
                              }
                              style={{ width: 20, height: 20 }}
                            />
                          </View>
                          <View className="flex-1">
                            <Text
                              style={{
                                color: theme.text,
                                fontWeight: '600',
                                fontSize: 16,
                              }}>
                              {subscription.name}
                            </Text>
                            <View
                              className="flex-row items-center mt-1"
                              style={{ gap: 6 }}>
                              <Text
                                style={{
                                  color: theme.textSecondary,
                                  fontSize: 12,
                                }}>
                                {subscription.billing_cycle
                                  .charAt(0)
                                  .toUpperCase() +
                                  subscription.billing_cycle.slice(1)}
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
                                ${subscription.amount.toFixed(2)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Switch
                          value={subscription.is_active}
                          onValueChange={() =>
                            toggleSubscription(
                              subscription.id,
                              subscription.is_active,
                            )
                          }
                          trackColor={{ false: '#767577', true: theme.primary }}
                          thumbColor="#f4f3f4"
                        />
                      </View>
                    </Pressable>
                  ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Close area when FAB expanded */}
      {fabExpanded && (
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

      {/* Expandable FAB - same pattern as Accounts */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 20,
          right: -10,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.primary,
          borderRadius: 12,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
          height: 50,
          width: fabAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 200],
          }),
        }}
      >
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            height: '100%',
            width: '100%',
            paddingLeft: 12,
            paddingRight: 20,
          }}
          onPress={handleFabPress}
          activeOpacity={0.8}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2} />
          {fabExpanded && (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: '600',
                marginLeft: 10,
                textTransform: 'uppercase',
              }}
            >
              {t.addSubscription}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Add/Edit Subscription Modal - Simplified */}
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
                  {isEditMode ? t.editSubscription : t.addSubscription}
                </Text>
                <View className="flex-row items-center gap-2">
                  {isEditMode && currentSubscription && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#fee2e2',
                        padding: 8,
                        borderRadius: 8,
                      }}
                      onPress={() => handleDelete(currentSubscription.id)}>
                      <Trash2 size={16} color="#dc2626" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={24} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Icon & Color - Visual Preview */}
              <View className="mb-4">
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: '500',
                    fontSize: 13,
                  }}>
                  Appearance
                </Text>
                <View className="flex-row gap-3">
                  {/* Icon Selector with Preview */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor: theme.background,
                    }}
                    onPress={() => setIsIconModalVisible(true)}>
                    <View
                      style={{
                        backgroundColor: formData.icon_color,
                        borderRadius: 24,
                        padding: 10,
                        marginRight: 10,
                      }}>
                      <Image
                        source={serviceIcons[formData.icon]}
                        style={{ width: 20, height: 20 }}
                      />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                        Icon
                      </Text>
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 13,
                          fontWeight: '500',
                          textTransform: 'capitalize',
                        }}>
                        {formData.icon}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Color Selector with Preview */}
                  <TouchableOpacity
                    style={{
                      borderWidth: 2,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor: theme.background,
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: 90,
                    }}
                    onPress={() => setIsColorModalVisible(true)}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: formData.icon_color,
                        borderWidth: 3,
                        borderColor: '#fff',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 3,
                        elevation: 3,
                      }}
                    />
                    <Text
                      style={{
                        color: theme.textMuted,
                        fontSize: 10,
                        marginTop: 4,
                      }}>
                      Color
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Subscription Name */}
              <View className="mb-4">
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: '500',
                    fontSize: 13,
                  }}>
                  {t.subscriptionName || 'Name'} *
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
                  placeholder={t.enterSubscriptionName || 'e.g., Netflix'}
                  placeholderTextColor={theme.textMuted}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />
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
                  {t.category || 'Category'}
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
                    borderColor: formData.category ? theme.primary : theme.border,
                    backgroundColor: theme.background,
                    minHeight: 50,
                  }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: formData.category ? theme.text : theme.textMuted,
                    }}
                    numberOfLines={1}>
                    {formData.category ? getCategoryLabel(formData.category) : (t.selectCategory || 'Select category')}
                  </Text>
                  <ChevronDown size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Category bottom sheet */}
              <Modal visible={categorySheetOpen} transparent animationType="slide" onRequestClose={() => setCategorySheetOpen(false)}>
                <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setCategorySheetOpen(false)}>
                  <Pressable style={{ maxHeight: '75%', backgroundColor: theme.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }} onPress={(e) => e.stopPropagation()}>
                    <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: 'center' }}>
                      <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
                    </View>
                    <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 16 }}>{t.selectCategory || 'Select category'}</Text>
                      <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                        {expenseCategories.map((category) => (
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
                      {selectedAccount && (
                        <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{t.balance || 'Balance'}: ${selectedAccount.amount.toFixed(2)}</Text>
                      )}
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

              {/* Amount */}
              <View className="mb-4">
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: '500',
                    fontSize: 13,
                  }}>
                  {t.amount || 'Amount'} *
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
                    value={formData.amount}
                    onChangeText={(text) =>
                      setFormData({ ...formData, amount: text })
                    }
                  />
                </View>
              </View>

              {/* Billing Cycle - Chips */}
              <View className="mb-4">
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: '500',
                    fontSize: 13,
                  }}>
                  {t.billingCycle || 'Billing Cycle'} *
                </Text>
                <View className="flex-row gap-2">
                  {billingCycles.map((cycle) => (
                    <TouchableOpacity
                      key={cycle.key}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor:
                          formData.billing_cycle === cycle.key
                            ? theme.primary
                            : theme.border,
                        backgroundColor:
                          formData.billing_cycle === cycle.key
                            ? `${theme.primary}20`
                            : theme.background,
                      }}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          billing_cycle: cycle.key as
                            | 'weekly'
                            | 'monthly'
                            | 'yearly',
                        })
                      }>
                      <Text
                        style={{
                          color:
                            formData.billing_cycle === cycle.key
                              ? theme.primary
                              : theme.textSecondary,
                          fontWeight:
                            formData.billing_cycle === cycle.key
                              ? '600'
                              : '400',
                          textAlign: 'center',
                          fontSize: 14,
                        }}>
                        {cycle.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Next Payment Date */}
              <View className="mb-4">
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: '500',
                    fontSize: 13,
                  }}>
                  {t.nextPaymentDate || 'Next Payment'} *
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={{
                    borderWidth: 1,
                    borderColor: formData.next_payment_date ? theme.primary : theme.border,
                    borderRadius: 12,
                    padding: 14,
                    backgroundColor: theme.background,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onPress={showDatePickerModal}>
                  <Text style={{ color: theme.text, fontSize: 15, fontWeight: '500' }}>
                    {formData.next_payment_date ? formData.next_payment_date.toLocaleDateString() : (t.selectDate || 'Select next payment date')}
                  </Text>
                  <Calendar size={20} color={formData.next_payment_date ? theme.primary : theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Active Toggle */}
              <View
                className="flex-row items-center justify-between py-3 px-2 mb-4"
                style={{ backgroundColor: theme.background, borderRadius: 12 }}>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: '500',
                    fontSize: 14,
                  }}>
                  {t.active || 'Active Subscription'}
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

              {/* Save Button */}
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
                    ? t.updateSubscription || 'Update'
                    : t.addSubscription || 'Add Subscription'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {/* Next Payment Date - Calendar bottom sheet (inside modal so it shows on top) */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}>
          <Pressable
            style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
                    {t.nextPaymentDate || 'Select next payment date'}
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
                      setFormData((prev) => ({ ...prev, next_payment_date: d }));
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

      {/* Icon Selection Modal - Improved */}
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
              borderRadius: 20,
              padding: 20,
              width: '100%',
              maxWidth: 380,
            }}>
            <View className="flex-row justify-between items-center mb-5">
              <Text
                style={{ color: theme.text, fontWeight: 'bold', fontSize: 18 }}>
                Choose Icon
              </Text>
              <TouchableOpacity onPress={() => setIsIconModalVisible(false)}>
                <X size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {Object.keys(serviceIcons).map((icon) => {
                const isSelected = formData.icon === icon;
                return (
                  <TouchableOpacity
                    key={icon}
                    style={{
                      width: '30%',
                      padding: 12,
                      alignItems: 'center',
                      backgroundColor: isSelected
                        ? `${formData.icon_color}15`
                        : theme.background,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected
                        ? formData.icon_color
                        : theme.border,
                    }}
                    onPress={() => selectIcon(icon as ServiceIcon)}>
                    <View
                      style={{
                        backgroundColor: formData.icon_color,
                        borderRadius: 28,
                        padding: 12,
                        marginBottom: 8,
                      }}>
                      <Image
                        source={serviceIcons[icon as keyof typeof serviceIcons]}
                        style={{ width: 24, height: 24 }}
                      />
                    </View>
                    <Text
                      style={{
                        color: isSelected ? theme.text : theme.textSecondary,
                        fontSize: 11,
                        fontWeight: isSelected ? '600' : '400',
                        textTransform: 'capitalize',
                        textAlign: 'center',
                      }}>
                      {icon}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Color Selection Modal - Improved */}
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
              borderRadius: 20,
              padding: 20,
              width: '100%',
              maxWidth: 340,
            }}>
            <View className="flex-row justify-between items-center mb-5">
              <Text
                style={{ color: theme.text, fontWeight: 'bold', fontSize: 18 }}>
                Choose Color
              </Text>
              <TouchableOpacity onPress={() => setIsColorModalVisible(false)}>
                <X size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View
              className="flex-row flex-wrap justify-center"
              style={{ gap: 12 }}>
              {colors.map((color) => {
                const isSelected = formData.icon_color === color;
                return (
                  <TouchableOpacity
                    key={color}
                    style={{
                      padding: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected
                        ? `${color}20`
                        : 'transparent',
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: isSelected ? color : 'transparent',
                    }}
                    onPress={() => selectColor(color)}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: color,
                        borderWidth: 3,
                        borderColor: isSelected ? '#fff' : 'transparent',
                      }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
