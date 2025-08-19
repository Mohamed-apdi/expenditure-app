import React, { useState, useEffect } from "react";
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
} from "react-native";
import {
  Calendar,
  Clock,
  Plus,
  X,
  Trash2,
  DollarSign,
  ChevronDown,
  Target,
  TrendingUp,
  PiggyBank,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "~/lib/supabase";
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
} from "~/lib/goals";
import { fetchAccounts, type Account } from "~/lib/accounts";

// Define goal icons
type GoalIcon =
  | "goal"
  | "house"
  | "car"
  | "vacation"
  | "education"
  | "wedding"
  | "business"
  | "emergency"
  | "other";

// Use Lucide icons instead of image assets
const goalIcons = {
  goal: Target,
  house: TrendingUp,
  car: TrendingUp,
  vacation: TrendingUp,
  education: TrendingUp,
  wedding: TrendingUp,
  business: TrendingUp,
  emergency: TrendingUp,
  other: TrendingUp,
};

const colors = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
];

const goalCategories = [
  "House",
  "Car",
  "Vacation",
  "Education",
  "Wedding",
  "Business",
  "Emergency Fund",
  "Retirement",
  "Other",
];

export default function SavingsScreen() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
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
    name: "",
    target_amount: "",
    current_amount: "0",
    category: "",
    target_date: "",
    is_active: true,
    icon: "goal" as GoalIcon,
    icon_color: colors[0],
    description: "",
  });

  // Amount modal state
  const [amountModalData, setAmountModalData] = useState({
    amount: "",
    type: "add" as "add" | "withdraw",
  });

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch goals and accounts from database
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

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleGoalStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleGoalStatus(id, !currentStatus);
      // Refresh data to get updated status
      fetchData();
    } catch (error) {
      console.error("Error toggling goal status:", error);
      Alert.alert("Error", "Failed to toggle goal status");
    }
  };

  const openAddModal = () => {
    if (accounts.length === 0) {
      Alert.alert(
        "No Accounts",
        "Please create an account first before setting up savings goals."
      );
      return;
    }
    setCurrentGoal(null);
    setFormData({
      name: "",
      target_amount: "",
      current_amount: "0",
      category: "",
      target_date: "",
      is_active: true,
      icon: "goal",
      icon_color: colors[0],
      description: "",
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
      description: goal.description || "",
    });

    // Find and set the account for this goal
    const goalAccount =
      goal.account || accounts.find((acc) => acc.id === goal.account_id);
    setSelectedAccount(goalAccount || null);

    setIsEditMode(true);
    setIsModalVisible(true);
  };

  const openAddAmountModal = (goal: any, type: "add" | "withdraw") => {
    setCurrentGoal(goal);
    setAmountModalData({
      amount: "",
      type,
    });
    if (type === "add") {
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
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!selectedAccount) {
      Alert.alert("Select Account", "Please select an account for this goal");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User not authenticated");
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
        Alert.alert("Success", "Goal updated successfully");
      } else {
        await addGoal(goalData);
        Alert.alert("Success", "Goal added successfully");
      }

      setIsModalVisible(false);
      // Refresh data to get updated goals
      fetchData();
    } catch (error) {
      console.error("Error saving goal:", error);
      Alert.alert("Error", "Failed to save goal");
    }
  };

  const handleAddAmount = async () => {
    if (!amountModalData.amount || parseFloat(amountModalData.amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    try {
      const amount = parseFloat(amountModalData.amount);

      if (amountModalData.type === "add") {
        await addAmountToGoal(currentGoal.id, amount);
        Alert.alert(
          "Success",
          `$${amount.toFixed(2)} added to goal successfully`
        );
      } else {
        await withdrawAmountFromGoal(currentGoal.id, amount);
        Alert.alert(
          "Success",
          `$${amount.toFixed(2)} withdrawn from goal successfully`
        );
      }

      setIsAddAmountModalVisible(false);
      setIsWithdrawModalVisible(false);
      // Refresh data to get updated goals
      fetchData();
    } catch (error) {
      console.error("Error updating goal amount:", error);
      Alert.alert("Error", "Failed to update goal amount");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Goal", "Are you sure you want to delete this goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGoal(id);
            Alert.alert("Success", "Goal deleted successfully");
            // Refresh data to get updated goals
            fetchData();
          } catch (error) {
            console.error("Error deleting goal:", error);
            Alert.alert("Error", "Failed to delete goal");
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
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
        target_date: selectedDate.toISOString().split("T")[0],
      });
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "#10b981"; // Green when completed
    if (progress >= 75) return "#3b82f6"; // Blue when close
    if (progress >= 50) return "#f59e0b"; // Yellow when halfway
    return "#ef4444"; // Red when far from goal
  };

  return (
    <View>
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Total Savings Summary */}
        <View className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-2xl mb-6">
          <Text className="text-black text-lg font-medium">Total Savings</Text>
          <Text className="text-black text-3xl font-bold">
            ${totalSavings.toFixed(2)}
          </Text>
          <Text className="text-blue-400 text-sm">
            Across {goals.filter((g) => g.is_active).length} active goals
          </Text>
        </View>

        {/* Active Goals */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-xl text-gray-900">
              Active Goals
            </Text>
            <TouchableOpacity
              className="bg-blue-500 rounded-lg py-3 px-3 items-center"
              onPress={openAddModal}
            >
              <Text className="text-white">Add Goal</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="py-8 items-center">
              <Text className="text-gray-500 text-lg">Loading goals...</Text>
            </View>
          ) : goals.filter((goal) => goal.is_active).length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-gray-500 text-lg">
                No active savings goals
              </Text>
              <Text className="text-gray-400 text-sm mt-2">
                Create your first goal to start saving!
              </Text>
            </View>
          ) : (
            goals
              .filter((goal) => goal.is_active)
              .map((goal) => {
                const progress = calculateProgress(
                  goal.current_amount,
                  goal.target_amount
                );
                const daysLeft = Math.ceil(
                  (new Date(goal.target_date).getTime() -
                    new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                return (
                  <Pressable
                    key={goal.id}
                    className="mb-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
                    onPress={() => openEditModal(goal)}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-row items-center flex-1">
                        <View
                          className="p-2 rounded-full mr-3"
                          style={{ backgroundColor: goal.icon_color }}
                        >
                          {React.createElement(
                            goalIcons[goal.icon] || goalIcons.other,
                            { size: 24, color: goal.icon_color }
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold text-gray-900 text-lg">
                            {goal.name}
                          </Text>
                          <Text className="text-gray-500 text-sm">
                            {goal.category}
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={goal.is_active}
                        onValueChange={() =>
                          handleToggleGoalStatus(goal.id, goal.is_active)
                        }
                        trackColor={{ false: "#767577", true: "#3b82f6" }}
                        thumbColor="#f4f3f4"
                      />
                    </View>

                    {/* Progress Bar */}
                    <View className="mb-3">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-gray-600 text-sm">
                          ${goal.current_amount.toFixed(2)} of $
                          {goal.target_amount.toFixed(2)}
                        </Text>
                        <Text className="text-gray-600 text-sm font-medium">
                          {Math.round(progress)}%
                        </Text>
                      </View>
                      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-2 rounded-full"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: getProgressColor(progress),
                          }}
                        />
                      </View>
                    </View>

                    {/* Goal Details */}
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row items-center">
                        <Calendar size={14} color="#6b7280" />
                        <Text className="text-gray-500 text-sm ml-2">
                          Target: {formatDate(goal.target_date)}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Clock size={14} color="#6b7280" />
                        <Text className="text-gray-500 text-sm ml-2">
                          {daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}
                        </Text>
                      </View>
                    </View>

                    {goal.account && (
                      <Text className="text-gray-500 text-sm mb-3">
                        Account: {goal.account.name}
                      </Text>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        className="flex-1 bg-green-500 py-2 rounded-lg items-center"
                        onPress={() => openAddAmountModal(goal, "add")}
                      >
                        <Text className="text-white font-medium">
                          Add Money
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-orange-500 py-2 rounded-lg items-center"
                        onPress={() => openAddAmountModal(goal, "withdraw")}
                      >
                        <Text className="text-white font-medium">Withdraw</Text>
                      </TouchableOpacity>
                    </View>
                  </Pressable>
                );
              })
          )}
        </View>

        {/* Inactive Goals */}
        <View className="bg-white p-6 rounded-2xl shadow-sm">
          <Text className="font-bold text-xl text-gray-900 mb-6">
            Inactive Goals
          </Text>
          {goals.filter((goal) => !goal.is_active).length === 0 ? (
            <View className="py-4 items-center">
              <Text className="text-gray-500 text-lg">No inactive goals</Text>
            </View>
          ) : (
            goals
              .filter((goal) => !goal.is_active)
              .map((goal) => (
                <Pressable
                  key={goal.id}
                  className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 opacity-80"
                  onPress={() => openEditModal(goal)}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="p-2 rounded-full mr-3"
                        style={{ backgroundColor: goal.icon_color }}
                      >
                        {React.createElement(
                          goalIcons[goal.icon] || goalIcons.other,
                          { size: 24, color: goal.icon_color }
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900 text-lg">
                          {goal.name}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          {goal.category} • Paused
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={goal.is_active}
                      onValueChange={() =>
                        handleToggleGoalStatus(goal.id, goal.is_active)
                      }
                      trackColor={{ false: "#767577", true: "#3b82f6" }}
                      thumbColor="#f4f3f4"
                    />
                  </View>
                </Pressable>
              ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Goal Modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="font-bold text-xl text-gray-900">
                  {isEditMode ? "Edit Goal" : "New Savings Goal"}
                </Text>
                <View className="flex-row justify-center items-center gap-2">
                  {isEditMode && currentGoal ? (
                    <TouchableOpacity
                      className="p-2"
                      onPress={() => handleDelete(currentGoal.id)}
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
                        {React.createElement(goalIcons[formData.icon], {
                          size: 24,
                          color: formData.icon_color,
                        })}
                      </View>
                      <Text className="text-gray-900">Change Icon</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-700 mb-2 font-medium">
                      Color
                    </Text>
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
                    Goal Name
                  </Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                    placeholder="e.g., New Car, Vacation"
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                  />
                </View>

                <View>
                  <Text className="text-gray-700 mb-2 font-medium">
                    Category
                  </Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center"
                    onPress={() =>
                      setShowCategoryDropdown(!showCategoryDropdown)
                    }
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
                        {goalCategories.map((category) => (
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
                  <Text className="text-gray-700 mb-2 font-medium">
                    Account
                  </Text>
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
                  <Text className="text-gray-700 mb-2 font-medium">
                    Target Amount ($)
                  </Text>
                  <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                    <View className="px-4">
                      <DollarSign size={18} color="#6b7280" />
                    </View>
                    <TextInput
                      className="flex-1 p-4"
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={formData.target_amount}
                      onChangeText={(text) =>
                        setFormData({ ...formData, target_amount: text })
                      }
                    />
                  </View>
                </View>

                {isEditMode && (
                  <View>
                    <Text className="text-gray-700 mb-2 font-medium">
                      Current Amount ($)
                    </Text>
                    <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                      <View className="px-4">
                        <DollarSign size={18} color="#6b7280" />
                      </View>
                      <TextInput
                        className="flex-1 p-4"
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={formData.current_amount}
                        onChangeText={(text) =>
                          setFormData({ ...formData, current_amount: text })
                        }
                      />
                    </View>
                  </View>
                )}

                <View>
                  <Text className="text-gray-700 mb-2 font-medium">
                    Target Date
                  </Text>
                  <TouchableOpacity
                    className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex-row items-center justify-between"
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text
                      className={
                        formData.target_date ? "text-gray-900" : "text-gray-500"
                      }
                    >
                      {formData.target_date
                        ? formatDate(formData.target_date)
                        : "Select target date"}
                    </Text>
                    <Calendar size={20} color="#6b7280" />
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
                    {isEditMode ? "Update Goal" : "Create Goal"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Amount Modal */}
      <Modal
        visible={isAddAmountModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAddAmountModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-bold text-xl text-gray-900">
                Add Money to Goal
              </Text>
              <TouchableOpacity
                onPress={() => setIsAddAmountModalVisible(false)}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-5">
              <View>
                <Text className="text-gray-700 mb-2 font-medium">
                  Amount ($)
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                  <View className="px-4">
                    <DollarSign size={18} color="#6b7280" />
                  </View>
                  <TextInput
                    className="flex-1 p-4"
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={amountModalData.amount}
                    onChangeText={(text) =>
                      setAmountModalData({ ...amountModalData, amount: text })
                    }
                  />
                </View>
              </View>

              <TouchableOpacity
                className="bg-green-500 p-4 rounded-xl items-center"
                onPress={handleAddAmount}
              >
                <Text className="text-white font-medium text-lg">
                  Add Money
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
        onRequestClose={() => setIsWithdrawModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-bold text-xl text-gray-900">
                Withdraw from Goal
              </Text>
              <TouchableOpacity
                onPress={() => setIsWithdrawModalVisible(false)}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-5">
              <View>
                <Text className="text-gray-700 mb-2 font-medium">
                  Amount ($)
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                  <View className="px-4">
                    <DollarSign size={18} color="#6b7280" />
                  </View>
                  <TextInput
                    className="flex-1 p-4"
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={amountModalData.amount}
                    onChangeText={(text) =>
                      setAmountModalData({ ...amountModalData, amount: text })
                    }
                  />
                </View>
              </View>

              <TouchableOpacity
                className="bg-orange-500 p-4 rounded-xl items-center"
                onPress={handleAddAmount}
              >
                <Text className="text-white font-medium text-lg">
                  Withdraw Money
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
              {Object.keys(goalIcons).map((icon) => (
                <TouchableOpacity
                  key={icon}
                  className={`w-1/4 p-4 items-center ${formData.icon === icon ? "bg-blue-50 rounded-lg" : ""}`}
                  onPress={() => selectIcon(icon as GoalIcon)}
                >
                  <View
                    className="p-3 rounded-full mb-2"
                    style={{ backgroundColor: formData.icon_color }}
                  >
                    {React.createElement(goalIcons[icon], {
                      size: 32,
                      color: formData.icon_color,
                    })}
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
    </View>
  );
}
