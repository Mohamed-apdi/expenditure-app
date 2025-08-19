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

// Use the exact same expense categories as BudgetScreen and AddExpense
const expenseCategories = [
  "Food & Drinks",
  "Home & Rent",
  "Travel",
  "Bills",
  "Fun",
  "Health",
  "Shopping",
  "Learning",
  "Personal Care",
  "Insurance",
  "Loans",
  "Gifts",
  "Donations",
  "Vacation",
  "Pets",
  "Children",
  "Subscriptions",
  "Gym & Sports",
  "Electronics",
  "Furniture",
  "Repairs",
  "Taxes",
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

const getDefaultIcon = (serviceName: string): ServiceIcon => {
  const name = serviceName.toLowerCase();
  if (
    name.includes("netflix") ||
    name.includes("hulu") ||
    name.includes("disney")
  )
    return "streaming";
  if (name.includes("gym") || name.includes("fitness")) return "fitness";
  if (name.includes("spotify") || name.includes("apple music")) return "music";
  if (name.includes("adobe") || name.includes("microsoft")) return "software";
  if (name.includes("dropbox") || name.includes("google")) return "cloud";
  if (name.includes("subscription") || name.includes("recurring"))
    return "subscriptions";
  return "other";
};

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCheckingFees, setIsCheckingFees] = useState(false);
  const [showFeeSuccessMessage, setShowFeeSuccessMessage] = useState(false);

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

  const billingCycles = ["weekly", "monthly", "yearly"];

  // Function to automatically cut subscription fees
  const checkAndCutSubscriptionFees = async () => {
    try {
      if (!userId || isCheckingFees) return;

      setIsCheckingFees(true);

      const today = new Date();
      const todayString = today.toISOString().split("T")[0];

      // Get all active subscriptions
      const activeSubscriptions = subscriptions.filter((sub) => sub.is_active);

      for (const subscription of activeSubscriptions) {
        const nextPaymentDate = new Date(subscription.next_payment_date);
        const nextPaymentString = nextPaymentDate.toISOString().split("T")[0];

        // Check if payment is due today or overdue
        if (nextPaymentString <= todayString) {
          try {
            // Import transaction service
            const { addTransaction } = await import("~/lib/transactions");

            // Create expense transaction for subscription fee
            await addTransaction({
              user_id: userId,
              account_id: subscription.account_id,
              amount: subscription.amount,
              description: `Subscription fee for ${subscription.name}`,
              date: todayString,
              category: subscription.category || "Subscriptions",
              type: "expense",
              is_recurring: true,
              recurrence_interval: subscription.billing_cycle,
            });

            console.log(
              `Created subscription fee transaction for: ${subscription.name}`
            );

            // Calculate next payment date based on billing cycle
            let nextPayment: Date;
            switch (subscription.billing_cycle) {
              case "weekly":
                nextPayment = new Date(
                  nextPaymentDate.getTime() + 7 * 24 * 60 * 60 * 1000
                );
                break;
              case "monthly":
                nextPayment = new Date(
                  nextPaymentDate.getFullYear(),
                  nextPaymentDate.getMonth() + 1,
                  nextPaymentDate.getDate()
                );
                break;
              case "yearly":
                nextPayment = new Date(
                  nextPaymentDate.getFullYear() + 1,
                  nextPaymentDate.getMonth(),
                  nextPaymentDate.getDate()
                );
                break;
              default:
                nextPayment = new Date(
                  nextPaymentDate.getTime() + 30 * 24 * 60 * 60 * 1000
                ); // Default to monthly
            }

            // Update subscription with new next payment date
            await updateSubscription(subscription.id, {
              ...subscription,
              next_payment_date: nextPayment.toISOString().split("T")[0],
            });

            console.log(
              `Updated next payment date for: ${subscription.name} to ${nextPayment.toISOString().split("T")[0]}`
            );
          } catch (error) {
            console.error(
              `Error processing subscription fee for ${subscription.name}:`,
              error
            );
          }
        }
      }

      // Don't call fetchData() here to avoid infinite loop
      // Instead, just update the local state with new payment dates
      console.log("Subscription fees processed successfully");
    } catch (error) {
      console.error("Error checking subscription fees:", error);
    } finally {
      setIsCheckingFees(false);
    }
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

      // Don't call checkAndCutSubscriptionFees here to avoid infinite loop
      // It will be called separately when needed
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to fetch data");
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

  // Manual function to check subscription fees
  const manualCheckFees = async () => {
    if (!isCheckingFees) {
      await checkAndCutSubscriptionFees();
      // Refresh data after processing fees
      await fetchData();

      // Show success message
      setShowFeeSuccessMessage(true);
      setTimeout(() => setShowFeeSuccessMessage(false), 3000);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check subscription fees only when component mounts and user is available
  useEffect(() => {
    if (userId && subscriptions.length > 0) {
      // Add a small delay to avoid immediate execution
      const timer = setTimeout(() => {
        checkAndCutSubscriptionFees();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [userId]); // Only depend on userId, not subscriptions

  const toggleSubscription = async (id: string, currentStatus: boolean) => {
    try {
      await toggleSubscriptionStatus(id, !currentStatus);
      // Refresh data to get updated status
      fetchData();
    } catch (error) {
      console.error("Error toggling subscription:", error);
      Alert.alert("Error", "Failed to toggle subscription status");
    }
  };

  const openAddModal = () => {
    if (accounts.length === 0) {
      Alert.alert(
        "No Accounts",
        "Please create an account first before setting up subscriptions."
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
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!selectedAccount) {
      Alert.alert(
        "Select Account",
        "Please select an account for this subscription"
      );
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User not authenticated");
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
        Alert.alert("Success", "Subscription updated successfully");
      } else {
        await addSubscription(subscriptionData);
        Alert.alert("Success", "Subscription added successfully");
      }

      setIsModalVisible(false);
      // Refresh data to get updated subscriptions
      fetchData();
    } catch (error) {
      console.error("Error saving subscription:", error);
      Alert.alert("Error", "Failed to save subscription");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Subscription",
      "Are you sure you want to delete this subscription?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSubscription(id);
              Alert.alert("Success", "Subscription deleted successfully");
              // Refresh data to get updated subscriptions
              fetchData();
            } catch (error) {
              console.error("Error deleting subscription:", error);
              Alert.alert("Error", "Failed to delete subscription");
            }
          },
        },
      ]
    );
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
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Loading subscriptions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center p-6">
          <Text className="text-gray-900 text-2xl font-bold">
            Subscriptions
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="bg-green-500 rounded-lg py-3 px-3 items-center"
              onPress={manualCheckFees}
              disabled={isCheckingFees}
            >
              <Text className="text-white text-sm">
                {isCheckingFees ? "Checking..." : "Check Fees"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-blue-500 rounded-lg py-3 px-3 items-center"
              onPress={openAddModal}
            >
              <Text className="text-white">Add Subscription</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Success Message */}
        {showFeeSuccessMessage && (
          <View className="px-6 mb-4">
            <View className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <Text className="text-green-700 text-center">
                ✅ Subscription fees checked and processed successfully!
              </Text>
            </View>
          </View>
        )}

        {/* Summary Card */}
        <View className="px-6 mb-6">
          <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-600 text-sm mb-1">
                  Total Monthly Cost
                </Text>
                <Text className="text-blue-600 text-xl font-bold">
                  ${totalMonthlyCost.toFixed(2)}
                </Text>
              </View>
              {isCheckingFees && (
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 text-xs">
                    Checking Fees...
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Active Subscriptions */}
        <View className="px-6 mb-6">
          <Text className="font-bold text-lg text-gray-900 mb-3">
            Active Subscriptions
          </Text>
          {subscriptions.filter((sub) => sub.is_active).length === 0 ? (
            <View className="py-4 items-center">
              <Text className="text-gray-500 text-lg">
                No active subscriptions
              </Text>
            </View>
          ) : (
            subscriptions
              .filter((sub) => sub.is_active)
              .map((subscription) => (
                <Pressable
                  key={subscription.id}
                  className="mb-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
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
                        <Text className="font-semibold text-gray-900 text-lg">
                          {subscription.name}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <Clock size={14} color="#6b7280" />
                          <Text className="text-gray-500 text-sm ml-2">
                            {subscription.billing_cycle
                              .charAt(0)
                              .toUpperCase() +
                              subscription.billing_cycle.slice(1)}{" "}
                            • Next: {formatDate(subscription.next_payment_date)}
                          </Text>
                        </View>
                        {subscription.account && (
                          <Text className="text-gray-500 text-sm mt-1">
                            {subscription.account.name}
                          </Text>
                        )}
                        {subscription.category && (
                          <Text className="text-gray-500 text-sm mt-1">
                            {subscription.category}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-medium text-gray-900 mr-1">
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
                        trackColor={{ false: "#767577", true: "#3b82f6" }}
                        thumbColor="#f4f3f4"
                        className="mt-1"
                      />
                    </View>
                  </View>
                </Pressable>
              ))
          )}
        </View>

        {/* Inactive Subscriptions */}
        <View className="px-6 mb-6">
          <Text className="font-bold text-lg text-gray-900 mb-3">
            Inactive Subscriptions
          </Text>
          {subscriptions.filter((sub) => !sub.is_active).length === 0 ? (
            <View className="py-4 items-center">
              <Text className="text-gray-500 text-lg">
                No inactive subscriptions
              </Text>
            </View>
          ) : (
            subscriptions
              .filter((sub) => !sub.is_active)
              .map((subscription) => (
                <Pressable
                  key={subscription.id}
                  className="mb-4 p-2 bg-gray-50 rounded-xl border border-gray-100 opacity-80"
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
                        <Text className="font-semibold text-gray-900 text-lg">
                          {subscription.name}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <Clock size={14} color="#6b7280" />
                          <Text className="text-gray-500 text-sm ml-2">
                            {subscription.billing_cycle
                              .charAt(0)
                              .toUpperCase() +
                              subscription.billing_cycle.slice(1)}{" "}
                            • Paused
                          </Text>
                        </View>
                        {subscription.account && (
                          <Text className="text-gray-500 text-sm mt-1">
                            {subscription.account.name}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-medium text-gray-900 mr-1">
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
                        trackColor={{ false: "#767577", true: "#3b82f6" }}
                        thumbColor="#f4f3f4"
                        className="mt-1"
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
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-bold text-xl text-gray-900">
                {isEditMode ? "Edit Subscription" : "New Subscription"}
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
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="space-y-5">
              {/* Icon and Color Selection */}
              <View className="flex-row space-x-4 gap-2 items-center">
                <View className="flex-1">
                  <Text className="text-gray-700 mb-2 font-medium">Icon</Text>
                  <TouchableOpacity
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex-row items-center"
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
                    <Text className="text-gray-900">Change Icon</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 mb-2 font-medium">Color</Text>
                  <TouchableOpacity
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex-row items-center"
                    onPress={() => setIsColorModalVisible(true)}
                  >
                    <View
                      className="w-6 h-6 rounded-full mr-3"
                      style={{ backgroundColor: formData.icon_color }}
                    />
                    <Text className="text-gray-900">Change Color</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">
                  Service Name
                </Text>
                <TextInput
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                  placeholder="e.g., Netflix, Spotify"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Category</Text>
                <TouchableOpacity
                  className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center"
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <Text
                    className={
                      formData.category ? "text-gray-900" : "text-gray-500"
                    }
                  >
                    {formData.category || "Select a category"}
                  </Text>
                  <ChevronDown size={16} color="#6b7280" />
                </TouchableOpacity>

                {showCategoryDropdown && (
                  <View className="mt-2 border border-gray-300 rounded-lg bg-white max-h-40">
                    <ScrollView>
                      {expenseCategories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          className={`p-3 border-b border-gray-200 ${
                            formData.category === category ? "bg-blue-50" : ""
                          }`}
                          onPress={() => {
                            setFormData({ ...formData, category });
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <Text className="font-medium">{category}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Account</Text>
                <TouchableOpacity
                  className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center"
                  onPress={() => setShowAccountDropdown(!showAccountDropdown)}
                >
                  <Text
                    className={
                      selectedAccount ? "text-gray-900" : "text-gray-500"
                    }
                  >
                    {selectedAccount
                      ? selectedAccount.name
                      : "Select an account"}
                  </Text>
                  <ChevronDown size={16} color="#6b7280" />
                </TouchableOpacity>

                {showAccountDropdown && (
                  <View className="mt-2 border border-gray-300 rounded-lg bg-white max-h-40">
                    <ScrollView>
                      {accounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          className={`p-3 border-b border-gray-200 ${
                            selectedAccount?.id === account.id
                              ? "bg-blue-50"
                              : ""
                          }`}
                          onPress={() => {
                            setSelectedAccount(account);
                            setShowAccountDropdown(false);
                          }}
                        >
                          <Text className="font-medium">{account.name}</Text>
                          <Text className="text-sm text-gray-500">
                            {account.account_type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Amount</Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                  <View className="px-4">
                    <DollarSign size={18} color="#6b7280" />
                  </View>
                  <TextInput
                    className="flex-1 p-4"
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={formData.amount}
                    onChangeText={(text) =>
                      setFormData({ ...formData, amount: text })
                    }
                  />
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">
                  Billing Cycle
                </Text>
                <View className="flex-row gap-2 mb-1">
                  {billingCycles.map((cycle) => (
                    <TouchableOpacity
                      key={cycle}
                      className={`px-4 py-2 rounded-lg ${formData.billing_cycle === cycle ? "bg-blue-600" : "bg-gray-200"}`}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          billing_cycle: cycle as
                            | "weekly"
                            | "monthly"
                            | "yearly",
                        })
                      }
                    >
                      <Text
                        className={
                          formData.billing_cycle === cycle
                            ? "text-white font-medium"
                            : "text-gray-800"
                        }
                      >
                        {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">
                  Next Payment Date
                </Text>
                <TouchableOpacity
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex-row items-center justify-between"
                  onPress={showDatePickerModal}
                >
                  <Text className="text-gray-900">
                    {formData.next_payment_date.toLocaleDateString()}
                  </Text>
                  <Calendar size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">
                  Description
                </Text>
                <TextInput
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                  placeholder="Optional description"
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                />
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-gray-700 font-medium">Active</Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value })
                  }
                  trackColor={{ false: "#767577", true: "#3b82f6" }}
                  thumbColor="#f4f3f4"
                />
              </View>

              <TouchableOpacity
                className="bg-blue-600 p-4 rounded-xl items-center mt-2"
                onPress={handleSave}
              >
                <Text className="text-white font-medium text-lg">
                  {isEditMode ? "Update" : "Add Subscription"}
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
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-bold text-xl text-gray-900">
                Select Icon
              </Text>
              <TouchableOpacity onPress={() => setIsIconModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {Object.keys(serviceIcons).map((icon) => (
                <TouchableOpacity
                  key={icon}
                  className={`w-1/4 p-4 items-center ${formData.icon === icon ? "bg-blue-50 rounded-lg" : ""}`}
                  onPress={() => selectIcon(icon as ServiceIcon)}
                >
                  <View
                    className="p-3 rounded-full mb-2"
                    style={{ backgroundColor: formData.icon_color }}
                  >
                    <Image source={serviceIcons[icon]} className="w-8 h-8" />
                  </View>
                  <Text className="text-xs text-gray-700 capitalize">
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
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-bold text-xl text-gray-900">
                Select Color
              </Text>
              <TouchableOpacity onPress={() => setIsColorModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  className={`w-1/4 p-4 items-center ${formData.icon_color === color ? "bg-blue-50 rounded-lg" : ""}`}
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
