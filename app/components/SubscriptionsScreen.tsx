import { useState, useEffect } from 'react';
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
} from 'react-native';
import { Calendar, X, Trash2, DollarSign } from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { supabase } from '~/lib';
import {
  fetchSubscriptionsWithAccounts,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscriptionStatus,
  type Subscription,
} from '~/lib';
import { fetchAccounts, type Account } from '~/lib';
import { notificationService } from '~/lib';
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
}

export default function SubscriptionsScreen({
  accounts: propAccounts,
  userId: propUserId,
  onRefresh: propOnRefresh,
}: SubscriptionsScreenProps = {}) {
  const theme = useTheme();
  const { t } = useLanguage();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [accounts, setAccounts] = useState<Account[]>(propAccounts || []);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const insets = useSafeAreaInsets();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isIconModalVisible, setIsIconModalVisible] = useState(false);
  const [isColorModalVisible, setIsColorModalVisible] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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
  // Fetch subscriptions and accounts from database
  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      setUserId(user.id);

      // Fetch subscriptions with accounts and accounts in parallel
      const [subscriptionsData, accountsData] = await Promise.all([
        fetchSubscriptionsWithAccounts(user.id),
        fetchAccounts(user.id),
      ]);

      setSubscriptions(subscriptionsData);
      setAccounts(accountsData);

      // Set default selected account if available
      if (accountsData.length > 0) {
        setSelectedAccount(accountsData[0]);
      }

      // Schedule notifications for upcoming subscriptions and budget checks
      if (user && notificationService) {
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
        const { isExpoGo } = await import('~/lib');

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
      await toggleSubscriptionStatus(id, !currentStatus);
      // Refresh data to get updated status
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
      const subscriptionData = {
        user_id: userId,
        account_id: selectedAccount.id,
        name: formData.name,
        amount,
        category: formData.category || 'Subscriptions',
        billing_cycle: formData.billing_cycle,
        next_payment_date: formData.next_payment_date
          .toISOString()
          .split('T')[0],
        is_active: formData.is_active,
        icon: formData.icon,
        icon_color: formData.icon_color,
        description: formData.description,
      };

      if (isEditMode && currentSubscription) {
        await updateSubscription(currentSubscription.id, subscriptionData);
        Alert.alert(t.success, t.subscriptionUpdated);
      } else {
        await addSubscription(subscriptionData);
        Alert.alert(t.success, t.subscriptionAdded);
      }

      setIsModalVisible(false);
      // Refresh data to get updated subscriptions
      fetchData();

      // Reschedule notifications for all subscriptions
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
            await deleteSubscription(id);
            Alert.alert(t.success, t.subscriptionDeleted);
            // Refresh data to get updated subscriptions
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

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, next_payment_date: selectedDate });
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  // Get translated category label
  const getCategoryLabel = (categoryKey: string) => {
    const categoryObj = expenseCategories.find(
      (cat) => cat.key === categoryKey,
    );
    return categoryObj ? categoryObj.label : categoryKey;
  };

  // Calculate total monthly cost
  const totalMonthlyCost = subscriptions
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
                style={{ color: theme.text, fontSize: 24, fontWeight: 'bold' }}>
                {t.subscriptions}
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}>
                {subscriptions.filter((s) => s.is_active).length} active • $
                {totalMonthlyCost.toFixed(2)}/month
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {/* Add Subscription Button */}
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
                  {t.addSubscription}
                </Text>
              </TouchableOpacity>
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
              {subscriptions.filter((s) => s.is_active).length} active
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
            {subscriptions.filter((sub) => sub.is_active).length === 0 ? (
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
                {subscriptions
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
          {subscriptions.filter((sub) => !sub.is_active).length > 0 && (
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
                {subscriptions
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

              {/* Category - Chip Selection */}
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
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -4 }}>
                  <View className="flex-row gap-2 px-1">
                    {expenseCategories.slice(0, 10).map((category) => (
                      <TouchableOpacity
                        key={category.key}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 14,
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
                            fontSize: 12,
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

              {/* Account & Amount - Side by Side */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
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

                <View className="flex-1">
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
                  onPress={showDatePickerModal}>
                  <Text style={{ color: theme.text, fontSize: 15 }}>
                    {formData.next_payment_date.toLocaleDateString()}
                  </Text>
                  <Calendar size={16} color={theme.textMuted} />
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
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.next_payment_date}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

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
