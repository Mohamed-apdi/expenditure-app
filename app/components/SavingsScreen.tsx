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
import { useTheme } from "~/lib/theme";

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
  const theme = useTheme();
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
    if (progress >= 100) return theme.success; // Green when completed
    if (progress >= 75) return theme.primary; // Blue when close
    if (progress >= 50) return "#f59e0b"; // Yellow when halfway
    return theme.danger; // Red when far from goal
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
        <View
          style={{
            backgroundColor: theme.primary,
            padding: 24,
            borderRadius: 16,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              color: theme.primaryText,
              fontSize: 18,
              fontWeight: "500",
            }}
          >
            Total Savings
          </Text>
          <Text
            style={{
              color: theme.primaryText,
              fontSize: 30,
              fontWeight: "bold",
            }}
          >
            ${totalSavings.toFixed(2)}
          </Text>
          <Text style={{ color: `${theme.primaryText}80`, fontSize: 14 }}>
            Across {goals.filter((g) => g.is_active).length} active goals
          </Text>
        </View>

        {/* Active Goals */}
        <View style={{ marginBottom: 24 }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text
              style={{ color: theme.text, fontWeight: "bold", fontSize: 20 }}
            >
              Active Goals
            </Text>
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
              <Text style={{ color: theme.primaryText }}>Add Goal</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontSize: 18 }}>
                Loading goals...
              </Text>
            </View>
          ) : goals.filter((goal) => goal.is_active).length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontSize: 18 }}>
                No active savings goals
              </Text>
              <Text
                style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}
              >
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
                          <Text
                            style={{
                              color: theme.text,
                              fontWeight: "600",
                              fontSize: 18,
                            }}
                          >
                            {goal.name}
                          </Text>
                          <Text
                            style={{ color: theme.textSecondary, fontSize: 14 }}
                          >
                            {goal.category}
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={goal.is_active}
                        onValueChange={() =>
                          handleToggleGoalStatus(goal.id, goal.is_active)
                        }
                        trackColor={{ false: "#767577", true: theme.primary }}
                        thumbColor="#f4f3f4"
                      />
                    </View>

                    {/* Progress Bar */}
                    <View style={{ marginBottom: 12 }}>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text
                          style={{ color: theme.textSecondary, fontSize: 14 }}
                        >
                          ${goal.current_amount.toFixed(2)} of $
                          {goal.target_amount.toFixed(2)}
                        </Text>
                        <Text
                          style={{
                            color: theme.textSecondary,
                            fontSize: 14,
                            fontWeight: "500",
                          }}
                        >
                          {Math.round(progress)}%
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 8,
                          backgroundColor: theme.border,
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: 8,
                            borderRadius: 4,
                            width: `${progress}%`,
                            backgroundColor: getProgressColor(progress),
                          }}
                        />
                      </View>
                    </View>

                    {/* Goal Details */}
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row items-center">
                        <Calendar size={14} color={theme.textMuted} />
                        <Text
                          style={{
                            color: theme.textSecondary,
                            fontSize: 14,
                            marginLeft: 8,
                          }}
                        >
                          Target: {formatDate(goal.target_date)}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Clock size={14} color={theme.textMuted} />
                        <Text
                          style={{
                            color: theme.textSecondary,
                            fontSize: 14,
                            marginLeft: 8,
                          }}
                        >
                          {daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}
                        </Text>
                      </View>
                    </View>

                    {goal.account && (
                      <Text
                        style={{
                          color: theme.textSecondary,
                          fontSize: 14,
                          marginBottom: 12,
                        }}
                      >
                        Account: {goal.account.name}
                      </Text>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: "#10b981",
                          paddingVertical: 8,
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                        onPress={() => openAddAmountModal(goal, "add")}
                      >
                        <Text style={{ color: "white", fontWeight: "500" }}>
                          Add Money
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: "#f59e0b",
                          paddingVertical: 8,
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                        onPress={() => openAddAmountModal(goal, "withdraw")}
                      >
                        <Text style={{ color: "white", fontWeight: "500" }}>
                          Withdraw
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Pressable>
                );
              })
          )}
        </View>

        {/* Inactive Goals */}
        <View
          style={{
            backgroundColor: theme.cardBackground,
            padding: 24,
            borderRadius: 16,
            shadowColor: theme.border,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontWeight: "bold",
              fontSize: 20,
              marginBottom: 24,
            }}
          >
            Inactive Goals
          </Text>
          {goals.filter((goal) => !goal.is_active).length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontSize: 18 }}>
                No inactive goals
              </Text>
            </View>
          ) : (
            goals
              .filter((goal) => !goal.is_active)
              .map((goal) => (
                <Pressable
                  key={goal.id}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    backgroundColor: theme.background,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    opacity: 0.8,
                  }}
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
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "600",
                            fontSize: 18,
                          }}
                        >
                          {goal.name}
                        </Text>
                        <Text
                          style={{ color: theme.textSecondary, fontSize: 14 }}
                        >
                          {goal.category} • Paused
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={goal.is_active}
                      onValueChange={() =>
                        handleToggleGoalStatus(goal.id, goal.is_active)
                      }
                      trackColor={{ false: "#767577", true: theme.primary }}
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
              maxHeight: "90%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-6">
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "bold",
                    fontSize: 20,
                  }}
                >
                  {isEditMode ? "Edit Goal" : "New Savings Goal"}
                </Text>
                <View className="flex-row justify-center items-center gap-2">
                  {isEditMode && currentGoal ? (
                    <TouchableOpacity
                      className="p-2"
                      onPress={() => handleDelete(currentGoal.id)}
                    >
                      <Trash2 size={18} color={theme.danger} />
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
                      Icon
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
                        {React.createElement(goalIcons[formData.icon], {
                          size: 24,
                          color: formData.icon_color,
                        })}
                      </View>
                      <Text style={{ color: theme.text }}>Change Icon</Text>
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
                      Color
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
                      <Text style={{ color: theme.text }}>Change Color</Text>
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
                    Goal Name
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
                    placeholder="e.g., New Car, Vacation"
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
                    Category
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
                    onPress={() =>
                      setShowCategoryDropdown(!showCategoryDropdown)
                    }
                  >
                    <Text
                      style={{
                        color: formData.category ? theme.text : theme.textMuted,
                      }}
                    >
                      {formData.category || "Select a category"}
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
                        {goalCategories.map((category) => (
                          <TouchableOpacity
                            key={category}
                            style={{
                              padding: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: theme.border,
                              backgroundColor:
                                formData.category === category
                                  ? `${theme.primary}20`
                                  : "transparent",
                            }}
                            onPress={() => {
                              setFormData({ ...formData, category });
                              setShowCategoryDropdown(false);
                            }}
                          >
                            <Text
                              style={{ color: theme.text, fontWeight: "500" }}
                            >
                              {category}
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
                    Account
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
                      {selectedAccount
                        ? selectedAccount.name
                        : "Select an account"}
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
                              style={{
                                color: theme.textSecondary,
                                fontSize: 14,
                              }}
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
                    Target Amount ($)
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

                {isEditMode && (
                  <View>
                    <Text
                      style={{
                        color: theme.text,
                        marginBottom: 8,
                        fontWeight: "500",
                      }}
                    >
                      Current Amount ($)
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

                <View>
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    Target Date
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
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text
                      style={{
                        color: formData.target_date
                          ? theme.text
                          : theme.textMuted,
                      }}
                    >
                      {formData.target_date
                        ? formatDate(formData.target_date)
                        : "Select target date"}
                    </Text>
                    <Calendar size={20} color={theme.textMuted} />
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
                    Description
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
                    placeholder="Optional description"
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
                    Active
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
                Add Money to Goal
              </Text>
              <TouchableOpacity
                onPress={() => setIsAddAmountModalVisible(false)}
              >
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View className="space-y-5">
              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  Amount ($)
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
                    placeholder="0.00"
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
                  backgroundColor: "#10b981",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={handleAddAmount}
              >
                <Text
                  style={{ color: "white", fontWeight: "500", fontSize: 18 }}
                >
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
                Withdraw from Goal
              </Text>
              <TouchableOpacity
                onPress={() => setIsWithdrawModalVisible(false)}
              >
                <X size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View className="space-y-5">
              <View>
                <Text
                  style={{
                    color: theme.text,
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  Amount ($)
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
                    placeholder="0.00"
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
                  backgroundColor: "#f59e0b",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={handleAddAmount}
              >
                <Text
                  style={{ color: "white", fontWeight: "500", fontSize: 18 }}
                >
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
              {Object.keys(goalIcons).map((icon) => (
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
