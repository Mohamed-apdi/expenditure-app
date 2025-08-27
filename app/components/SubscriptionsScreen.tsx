import { useState, useEffect } from "react";
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
} from "react-native";
import {
  Calendar,
  Clock,
  Plus,
  X,
  Trash2,
  DollarSign,
  ChevronDown,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import { supabase } from "~/lib/supabase";
import {
  fetchSubscriptionsWithAccounts,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscriptionStatus,
  type Subscription,
} from "~/lib/subscriptions";
import { fetchAccounts, type Account } from "~/lib/accounts";
import notificationService from "~/lib/notificationService";
import ExpoGoWarning from "~/components/ExpoGoWarning";
import { useTheme } from "~/lib/theme";
import { useLanguage } from "~/lib/LanguageProvider";

// Mock the icons - replace with your actual assets
const serviceIcons = {
  streaming: require("../../assets/subscription_icons/YouTube.png"),
  fitness: require("../../assets/subscription_icons/Muscle.png"),
  music: require("../../assets/subscription_icons/Spotify.png"),
  software: require("../../assets/subscription_icons/Code.png"),
  cloud: require("../../assets/subscription_icons/Cloud Database.png"),
  education: require("../../assets/subscription_icons/Graduation Cap.png"),
  gaming: require("../../assets/subscription_icons/Game Controller.png"),
  subscriptions: require("../../assets/subscription_icons/View More.png"),
  other: require("../../assets/subscription_icons/View More.png"),
};

const colors = [
  "#FFCCCB",
  "#ADD8E6",
  "#FFD580",
  "#90EE90",
  "#E6E6FA",
  "#FFB6C1",
  "#FFFF99",
  "#B0E0E6",
];

export default function SubscriptionsScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isIconModalVisible, setIsIconModalVisible] = useState(false);
  const [isColorModalVisible, setIsColorModalVisible] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    billing_cycle: "monthly" as "weekly" | "monthly" | "yearly",
    next_payment_date: new Date(),
    is_active: true,
    icon: "other" as ServiceIcon,
    icon_color: colors[0],
    category: "",
    description: "",
  });

  const billingCycles = [
    { key: "weekly", label: t.weekly },
    { key: "monthly", label: t.monthly },
    { key: "yearly", label: t.yearly },
  ];
  // Use the exact same expense categories as BudgetScreen and AddExpense

  const expenseCategories = [
    { key: "Food & Drinks", label: t.foodAndDrinks },
    { key: "Home & Rent", label: t.homeAndRent },
    { key: "Travel", label: t.travel },
    { key: "Bills", label: t.bills },
    { key: "Fun", label: t.fun },
    { key: "Health", label: t.health },
    { key: "Shopping", label: t.shopping },
    { key: "Learning", label: t.learning },
    { key: "Personal Care", label: t.personalCare },
    { key: "Insurance", label: t.insurance },
    { key: "Loans", label: t.loans },
    { key: "Gifts", label: t.gifts },
    { key: "Donations", label: t.donations },
    { key: "Vacation", label: t.vacation },
    { key: "Pets", label: t.pets },
    { key: "Children", label: t.children },
    { key: "Subscriptions", label: t.subscriptions },
    { key: "Gym & Sports", label: t.gymAndSports },
    { key: "Electronics", label: t.electronics },
    { key: "Furniture", label: t.furniture },
    { key: "Repairs", label: t.repairs },
    { key: "Taxes", label: t.taxes },
  ];

  // Define service icons
  type ServiceIcon =
    | "streaming"
    | "fitness"
    | "music"
    | "software"
    | "cloud"
    | "education"
    | "gaming"
    | "subscriptions"
    | "other";
  const getDefaultIcon = (serviceName: string): ServiceIcon => {
    const name = serviceName.toLowerCase();
    if (
      name.includes("netflix") ||
      name.includes("hulu") ||
      name.includes("disney")
    )
      return "streaming";
    if (name.includes("gym") || name.includes("fitness")) return "fitness";
    if (name.includes("spotify") || name.includes("apple music"))
      return "music";
    if (name.includes("adobe") || name.includes("microsoft")) return "software";
    if (name.includes("dropbox") || name.includes("google")) return "cloud";
    if (name.includes("subscription") || name.includes("recurring"))
      return "subscriptions";
    return "other";
  };
  // Fetch subscriptions and accounts from database
  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
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
      if (user) {
        await notificationService.scheduleAllUpcomingNotifications();
        await notificationService.scheduleBudgetCheckNotifications();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert(t.error, t.failedToFetchData);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data with pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Initialize notifications when component mounts
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Register background tasks and setup notifications
        await notificationService.registerBackgroundTask();
      } catch (error) {
        console.error("Failed to initialize notifications:", error);
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
        const { isExpoGo } = await import("~/lib/expoGoUtils");

        if (isExpoGo) {
          console.warn(
            "Push notifications are limited in Expo Go with SDK 53. Use development build for full functionality."
          );
          return;
        }

        const subscription =
          Notifications.addNotificationResponseReceivedListener(
            notificationService.handleNotificationResponse
          );

        return () => subscription.remove();
      } catch (error) {
        console.error("Failed to setup notification listener:", error);
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
      await notificationService.scheduleAllUpcomingNotifications();
    } catch (error) {
      console.error("Error toggling subscription:", error);
      Alert.alert(t.error, t.subscriptionToggleError);
    }
  };

  const openAddModal = () => {
    if (accounts.length === 0) {
      Alert.alert(
        t.noAccountsForSubscription,
        t.createAccountFirstForSubscription
      );
      return;
    }
    setCurrentSubscription(null);
    setFormData({
      name: "",
      amount: "",
      billing_cycle: "monthly",
      next_payment_date: new Date(),
      is_active: true,
      icon: "other",
      icon_color: colors[0],
      category: "",
      description: "",
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
      description: subscription.description || "",
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
        category: formData.category || "Subscriptions",
        billing_cycle: formData.billing_cycle,
        next_payment_date: formData.next_payment_date
          .toISOString()
          .split("T")[0],
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
      await notificationService.scheduleAllUpcomingNotifications();
    } catch (error) {
      console.error("Error saving subscription:", error);
      Alert.alert(t.error, t.subscriptionSaveError);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(t.deleteSubscription, t.deleteSubscriptionConfirmation, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSubscription(id);
            Alert.alert(t.success, t.subscriptionDeleted);
            // Refresh data to get updated subscriptions
            fetchData();

            // Reschedule notifications for remaining subscriptions
            await notificationService.scheduleAllUpcomingNotifications();
          } catch (error) {
            console.error("Error deleting subscription:", error);
            Alert.alert(t.error, t.subscriptionDeleteError);
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
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
      (cat) => cat.key === categoryKey
    );
    return categoryObj ? categoryObj.label : categoryKey;
  };

  // Calculate total monthly cost
  const totalMonthlyCost = subscriptions
    .filter((sub) => sub.is_active)
    .reduce((total, sub) => {
      let monthlyAmount = sub.amount;
      if (sub.billing_cycle === "weekly") {
        monthlyAmount = sub.amount * 4.33; // Average weeks per month
      } else if (sub.billing_cycle === "yearly") {
        monthlyAmount = sub.amount / 12;
      }
      return total + monthlyAmount;
    }, 0);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.textSecondary }}>
          {t.loadingSubscriptions}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 24,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 24, fontWeight: "bold" }}>
            {t.subscriptions}
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 12,
                alignItems: "center",
              }}
              onPress={openAddModal}
            >
              <Text style={{ color: theme.primaryText }}>
                {t.addSubscription}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Expo Go Warning */}
        {/*<ExpoGoWarning />*/}

        {/* Summary Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: theme.cardBackground,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              shadowColor: theme.border,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  {t.totalMonthlyCost}
                </Text>
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 20,
                    fontWeight: "bold",
                  }}
                >
                  ${totalMonthlyCost.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Active Subscriptions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text
            style={{
              color: theme.text,
              fontWeight: "bold",
              fontSize: 18,
              marginBottom: 12,
            }}
          >
            {t.activeSubscriptions}
          </Text>
          {subscriptions.filter((sub) => sub.is_active).length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontSize: 18 }}>
                {t.noActiveSubscriptions}
              </Text>
            </View>
          ) : (
            subscriptions
              .filter((sub) => sub.is_active)
              .map((subscription) => (
                <Pressable
                  key={subscription.id}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    backgroundColor: theme.cardBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    shadowColor: theme.border,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                  onPress={() => openEditModal(subscription)}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="p-2 rounded-full mr-3"
                        style={{ backgroundColor: subscription.icon_color }}
                      >
                        <Image
                          source={
                            serviceIcons[subscription.icon] ||
                            serviceIcons.other
                          }
                          className="w-6 h-6"
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "600",
                            fontSize: 18,
                          }}
                        >
                          {subscription.name}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <Clock size={14} color={theme.textMuted} />
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 14,
                              marginLeft: 8,
                            }}
                          >
                            {subscription.billing_cycle
                              .charAt(0)
                              .toUpperCase() +
                              subscription.billing_cycle.slice(1)}{" "}
                            • Next: {formatDate(subscription.next_payment_date)}
                          </Text>
                        </View>
                        {subscription.account && (
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 14,
                              marginTop: 4,
                            }}
                          >
                            {subscription.account.name}
                          </Text>
                        )}
                        {subscription.category && (
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 14,
                              marginTop: 4,
                            }}
                          >
                            {subscription.category}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: "500",
                          marginRight: 4,
                        }}
                      >
                        ${subscription.amount.toFixed(2)}
                      </Text>
                      <Switch
                        value={subscription.is_active}
                        onValueChange={() =>
                          toggleSubscription(
                            subscription.id,
                            subscription.is_active
                          )
                        }
                        trackColor={{ false: "#767577", true: theme.primary }}
                        thumbColor="#f4f3f4"
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </View>
                </Pressable>
              ))
          )}
        </View>

        {/* Inactive Subscriptions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <Text
            style={{
              color: theme.text,
              fontWeight: "bold",
              fontSize: 18,
              marginBottom: 12,
            }}
          >
            {t.InactiveSubscriptions}
          </Text>
          {subscriptions.filter((sub) => !sub.is_active).length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontSize: 18 }}>
                {t.no} {t.InactiveSubscriptions}
              </Text>
            </View>
          ) : (
            subscriptions
              .filter((sub) => !sub.is_active)
              .map((subscription) => (
                <Pressable
                  key={subscription.id}
                  style={{
                    marginBottom: 16,
                    padding: 8,
                    backgroundColor: theme.background,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    opacity: 0.8,
                  }}
                  onPress={() => openEditModal(subscription)}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="p-2 rounded-full mr-3"
                        style={{ backgroundColor: subscription.icon_color }}
                      >
                        <Image
                          source={
                            serviceIcons[subscription.icon] ||
                            serviceIcons.other
                          }
                          className="w-6 h-6"
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "600",
                            fontSize: 18,
                          }}
                        >
                          {subscription.name}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <Clock size={14} color={theme.textMuted} />
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 14,
                              marginLeft: 8,
                            }}
                          >
                            {subscription.billing_cycle
                              .charAt(0)
                              .toUpperCase() +
                              subscription.billing_cycle.slice(1)}{" "}
                            • Paused
                          </Text>
                        </View>
                        {subscription.account && (
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontSize: 14,
                              marginTop: 4,
                            }}
                          >
                            {subscription.account.name}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: "500",
                          marginRight: 4,
                        }}
                      >
                        ${subscription.amount.toFixed(2)}
                      </Text>
                      <Switch
                        value={subscription.is_active}
                        onValueChange={() =>
                          toggleSubscription(
                            subscription.id,
                            subscription.is_active
                          )
                        }
                        trackColor={{ false: "#767577", true: theme.primary }}
                        thumbColor="#f4f3f4"
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </View>
                </Pressable>
              ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Subscription Modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text
                style={{ color: theme.text, fontWeight: "bold", fontSize: 20 }}
              >
                {isEditMode ? t.editSubscription : t.addSubscription}
              </Text>
              <View className="flex-row justify-center items-center gap-2">
                {isEditMode && currentSubscription ? (
                  <TouchableOpacity
                    className="p-2"
                    onPress={() => handleDelete(currentSubscription.id)}
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <X size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View className="space-y-5">
              {/* Icon and Color Selection */}
              <View className="flex-row space-x-4 gap-2 items-center">
                <View className="flex-1">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    {t.icon}
                  </Text>
                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 16,
                      backgroundColor: theme.background,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                    onPress={() => setIsIconModalVisible(true)}
                  >
                    <View
                      className="rounded-full mr-3"
                      style={{ backgroundColor: formData.icon_color }}
                    >
                      <Image
                        source={serviceIcons[formData.icon]}
                        className="w-6 h-6"
                      />
                    </View>
                    <Text style={{ color: theme.text }}>{t.selectIcon}</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-1">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    {t.color}
                  </Text>
                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      padding: 16,
                      backgroundColor: theme.background,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                    onPress={() => setIsColorModalVisible(true)}
                  >
                    <View
                      className="w-6 h-6 rounded-full mr-3"
                      style={{ backgroundColor: formData.icon_color }}
                    />
                    <Text style={{ color: theme.text }}>{t.selectColor}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  {t.subscriptionName}
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    padding: 16,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                  placeholder={t.enterSubscriptionName}
                  placeholderTextColor={theme.textMuted}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />
              </View>

              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  {t.category}
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <Text
                    style={{
                      color: formData.category ? theme.text : theme.textMuted,
                    }}
                  >
                    {formData.category
                      ? getCategoryLabel(formData.category)
                      : t.selectCategory}
                  </Text>
                  <ChevronDown size={16} color={theme.textMuted} />
                </TouchableOpacity>

                {showCategoryDropdown && (
                  <View
                    style={{
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 8,
                      backgroundColor: theme.cardBackground,
                      maxHeight: 160,
                    }}
                  >
                    <ScrollView>
                      {expenseCategories.map((category) => (
                        <TouchableOpacity
                          key={category.key}
                          style={{
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.border,
                            backgroundColor:
                              formData.category === category.key
                                ? `${theme.primary}20`
                                : "transparent",
                          }}
                          onPress={() => {
                            setFormData({
                              ...formData,
                              category: category.key,
                            });
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <Text
                            style={{ color: theme.text, fontWeight: "500" }}
                          >
                            {category.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  {t.account}
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  onPress={() => setShowAccountDropdown(!showAccountDropdown)}
                >
                  <Text
                    style={{
                      color: selectedAccount ? theme.text : theme.textMuted,
                    }}
                  >
                    {selectedAccount ? selectedAccount.name : t.selectAccount}
                  </Text>
                  <ChevronDown size={16} color={theme.textMuted} />
                </TouchableOpacity>

                {showAccountDropdown && (
                  <View
                    style={{
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 8,
                      backgroundColor: theme.cardBackground,
                      maxHeight: 160,
                    }}
                  >
                    <ScrollView>
                      {accounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={{
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.border,
                            backgroundColor:
                              selectedAccount?.id === account.id
                                ? `${theme.primary}20`
                                : "transparent",
                          }}
                          onPress={() => {
                            setSelectedAccount(account);
                            setShowAccountDropdown(false);
                          }}
                        >
                          <Text
                            style={{ color: theme.text, fontWeight: "500" }}
                          >
                            {account.name}
                          </Text>
                          <Text
                            style={{ color: theme.textSecondary, fontSize: 14 }}
                          >
                            {account.account_type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  {t.amount}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    backgroundColor: theme.background,
                  }}
                >
                  <View style={{ paddingHorizontal: 16 }}>
                    <DollarSign size={18} color={theme.textMuted} />
                  </View>
                  <TextInput
                    style={{ flex: 1, padding: 16, color: theme.text }}
                    placeholder={t.enterAmount}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={formData.amount}
                    onChangeText={(text) =>
                      setFormData({ ...formData, amount: text })
                    }
                  />
                </View>
              </View>

              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  {t.billingCycle}
                </Text>
                <View className="flex-row gap-2 mb-1">
                  {billingCycles.map((cycle) => (
                    <TouchableOpacity
                      key={cycle.key}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor:
                          formData.billing_cycle === cycle.key
                            ? theme.primary
                            : theme.background,
                      }}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          billing_cycle: cycle.key as
                            | "weekly"
                            | "monthly"
                            | "yearly",
                        })
                      }
                    >
                      <Text
                        style={{
                          color:
                            formData.billing_cycle === cycle.key
                              ? theme.primaryText
                              : theme.text,
                          fontWeight:
                            formData.billing_cycle === cycle.key
                              ? "500"
                              : "normal",
                        }}
                      >
                        {cycle.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  {t.nextPaymentDate}
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    padding: 16,
                    backgroundColor: theme.background,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onPress={showDatePickerModal}
                >
                  <Text style={{ color: theme.text }}>
                    {formData.next_payment_date.toLocaleDateString()}
                  </Text>
                  <Calendar size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  {t.description}
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    padding: 16,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                  placeholder={t.enterDescription}
                  placeholderTextColor={theme.textMuted}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                />
              </View>

              <View className="flex-row justify-between items-center">
                <Text style={{ color: theme.text, fontWeight: "500" }}>
                  {t.active}
                </Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value })
                  }
                  trackColor={{ false: "#767577", true: theme.primary }}
                  thumbColor="#f4f3f4"
                />
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  marginTop: 8,
                }}
                onPress={handleSave}
              >
                <Text
                  style={{
                    color: theme.primaryText,
                    fontWeight: "500",
                    fontSize: 18,
                  }}
                >
                  {isEditMode ? t.updateSubscription : t.addSubscription}
                </Text>
              </TouchableOpacity>
            </View>
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

      {/* Icon Selection Modal */}
      <Modal
        visible={isIconModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsIconModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text
                style={{ color: theme.text, fontWeight: "bold", fontSize: 20 }}
              >
                Select Icon
              </Text>
              <TouchableOpacity onPress={() => setIsIconModalVisible(false)}>
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {Object.keys(serviceIcons).map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={{
                    width: "25%",
                    padding: 16,
                    alignItems: "center",
                    backgroundColor:
                      formData.icon === icon
                        ? `${theme.primary}20`
                        : "transparent",
                    borderRadius: 8,
                  }}
                  onPress={() => selectIcon(icon as ServiceIcon)}
                >
                  <View
                    className="p-3 rounded-full mb-2"
                    style={{ backgroundColor: formData.icon_color }}
                  >
                    <Image source={serviceIcons[icon]} className="w-8 h-8" />
                  </View>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  >
                    {icon}
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
        onRequestClose={() => setIsColorModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: theme.cardBackground,
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
            }}
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text
                style={{ color: theme.text, fontWeight: "bold", fontSize: 20 }}
              >
                Select Color
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
                    width: "25%",
                    padding: 16,
                    alignItems: "center",
                    backgroundColor:
                      formData.icon_color === color
                        ? `${theme.primary}20`
                        : "transparent",
                    borderRadius: 8,
                  }}
                  onPress={() => selectColor(color)}
                >
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
    </View>
  );
}
