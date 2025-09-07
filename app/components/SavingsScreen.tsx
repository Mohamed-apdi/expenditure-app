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
  Home,
  Car,
  Plane,
  GraduationCap,
  Heart,
  Briefcase,
  Shield,
  User,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "~/lib";
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
} from "~/lib";
import { fetchAccounts, type Account } from "~/lib";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

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
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
];

export default function SavingsScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
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
  const goalCategories = [
    { key: "House", label: t.house },
    { key: "Car", label: t.car },
    { key: "Vacation", label: t.vacation },
    { key: "Education", label: t.education },
    { key: "Wedding", label: t.wedding },
    { key: "Business", label: t.business },
    { key: "Emergency Fund", label: t.emergencyFund },
    { key: "Retirement", label: t.retirement },
    { key: "Other", label: t.other },
  ];

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

  const handleToggleGoalStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleGoalStatus(id, !currentStatus);
      // Refresh data to get updated status
      fetchData();
    } catch (error) {
      console.error("Error toggling goal status:", error);
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
      console.error("Error saving goal:", error);
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

      if (amountModalData.type === "add") {
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
      console.error("Error updating goal amount:", error);
      Alert.alert(t.error, t.amountSaveError);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(t.deleteGoal, t.deleteGoalConfirmation, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGoal(id);
            Alert.alert(t.success, t.goalDeleted);
            // Refresh data to get updated goals
            fetchData();
          } catch (error) {
            console.error("Error deleting goal:", error);
            Alert.alert(t.error, t.goalDeleteError);
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
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
        target_date: selectedDate.toISOString().split("T")[0],
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
            {t.totalSavings}
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
            {t.acrossActiveGoals.replace(
              "{count}",
              goals.filter((g) => g.is_active).length.toString()
            )}
          </Text>
        </View>

        {/* Active Goals */}
        <View style={{ marginBottom: 24 }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text
              style={{ color: theme.text, fontWeight: "bold", fontSize: 20 }}
            >
              {t.activeGoals}
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
              <Text style={{ color: theme.primaryText }}>{t.addGoal}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontSize: 18 }}>
                {t.loadingGoals}
              </Text>
            </View>
          ) : goals.filter((goal) => goal.is_active).length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontSize: 18 }}>
                {t.noActiveSavingsGoals}
              </Text>
              <Text
                style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}
              >
                {t.createFirstGoal}
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
                          className="rounded-full mr-3 p-2"
                          style={{
                            backgroundColor: goal.icon_color,
                            borderWidth: 2,
                            borderColor: goal.icon_color,
                          }}
                        >
                          {React.createElement(getGoalIcon(goal.icon), {
                            size: 18,
                            color: "white",
                          })}
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
                            {getGoalCategoryLabel(goal.category)}
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
                          {t.target}: {formatDate(goal.target_date)}
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
                          {daysLeft > 0
                            ? `${daysLeft} ${t.daysLeft}`
                            : "Overdue"}
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
                        {t.account}: {goal.account.name}
                      </Text>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row space-x-2 gap-2">
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
                          {t.addAmount}
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
                          {t.withdrawAmount}
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
            {t.inactiveGoals}
          </Text>
          {goals.filter((goal) => !goal.is_active).length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontSize: 18 }}>
                {t.no} {t.inactiveGoals}
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
                        className=" rounded-full mr-3"
                        style={{
                          backgroundColor: goal.icon_color,
                          borderWidth: 2,
                          borderColor: goal.icon_color,
                        }}
                      >
                        {React.createElement(getGoalIcon(goal.icon), {
                          size: 18,
                          color: "white",
                        })}
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
                          {getGoalCategoryLabel(goal.category)} • Paused
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
                  {isEditMode ? t.editGoal : t.addGoal}
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
                      {t.goalIcon}
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
                        className="rounded-full mr-2"
                        style={{
                          backgroundColor: formData.icon_color,
                          borderWidth: 2,
                          borderColor: formData.icon_color,
                        }}
                      >
                        {React.createElement(getGoalIcon(formData.icon), {
                          size: 18,
                          color: "white",
                        })}
                      </View>
                      <Text style={{ color: theme.text }}>
                        {t.selectGoalIcon}
                      </Text>
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
                      {t.goalColor}
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
                        className="w-6 h-6 rounded-full mr-3 "
                        style={{ backgroundColor: formData.icon_color }}
                      />
                      <Text style={{ color: theme.text }}>
                        {t.selectGoalColor}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mt-2">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    {t.goalName}
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
                    placeholder={t.enterGoalName}
                    placeholderTextColor={theme.textMuted}
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                  />
                </View>

                <View className="mt-2">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    {t.goalCategory}
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
                      {formData.category
                        ? getGoalCategoryLabel(formData.category)
                        : t.selectGoalCategory}
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

                <View className="mt-2">
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

                <View className="mt-2">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    {t.targetAmount}
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
                      {t.currentAmount}
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
                        value={formData.current_amount}
                        onChangeText={(text) =>
                          setFormData({ ...formData, current_amount: text })
                        }
                      />
                    </View>
                  </View>
                )}

                <View className="mt-2">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    {t.targetDate}
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
                        : t.selectTargetDate}
                    </Text>
                    <Calendar size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                <View className="mt-2">
                  <Text
                    style={{
                      color: theme.text,
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    {t.goalDescription}
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
                    placeholder={t.enterGoalDescription}
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
                    {isEditMode ? t.updateGoal : t.saveGoal}
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
                {t.addAmount}
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
                  {t.amount}
                </Text>
                <View
                  className="flex items-center "
                  style={{
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
                {t.withdrawAmount}
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
                style={{ color: theme.text, fontWeight: "bold", fontSize: 12 }}
              >
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
                    width: "30%",
                    padding: 16,
                    alignItems: "center",
                    backgroundColor:
                      formData.icon === icon
                        ? `${theme.primary}20`
                        : theme.background,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor:
                      formData.icon === icon ? theme.primary : theme.border,
                  }}
                  onPress={() => selectIcon(icon as GoalIcon)}
                >
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
                    }}
                  >
                    {React.createElement(getGoalIcon(icon), {
                      size: 18,
                      color: formData.icon === icon ? "white" : theme.primary,
                    })}
                  </View>
                  <Text
                    style={{
                      color:
                        formData.icon === icon ? theme.primary : theme.text,
                      fontSize: 12,
                      fontWeight: formData.icon === icon ? "600" : "400",
                      textTransform: "capitalize",
                      textAlign: "center",
                    }}
                  >
                    {icon === "goal" ? "General" : icon}
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
