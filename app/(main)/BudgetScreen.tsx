// screens/BudgetScreen.tsx
import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  PanResponder,
  RefreshControl,
  Platform,
} from "react-native";
import {
  Plus,
  ChevronRight,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  Calendar,
} from "lucide-react-native";
import { CircularProgress } from "react-native-circular-progress";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import SubscriptionsScreen from "../components/SubscriptionsScreen";
import SavingsScreen from "../components/SavingsScreen";
import { supabase } from "~/lib";
import {
  fetchBudgets,
  fetchBudgetsWithAccounts,
  addBudget,
  updateBudget,
  deleteBudget,
  type Budget,
} from "~/lib";
import { fetchAccounts, type Account } from "~/lib";
import {
  getExpensesByCategory,
  getBudgetProgress,
  type BudgetProgress,
} from "~/lib";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";
import { formatDate } from "~/lib";

import Investments from "../components/Investments";
import Debt_Loan from "../components/Debt_Loan";

// Use the exact same expense categories as AddExpense

export default function BudgetScreen() {
  const theme = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("Budget");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetsWithAccounts, setBudgetsWithAccounts] = useState<any[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal gestures on the tab area
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10
        );
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal gestures
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10
        );
      },
      onPanResponderGrant: () => {
        // Reset any gesture state if needed
      },
      onPanResponderMove: () => {
        // Allow the gesture to continue
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Check if the swipe is horizontal and significant enough
        if (
          Math.abs(gestureState.dx) > 50 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        ) {
          if (gestureState.dx > 0) {
            // Swipe right - go to previous tab
            switch (activeTab) {
              case "Subscriptions":
                setActiveTab("Budget");
                break;
              case "Goals":
                setActiveTab("Subscriptions");
                break;
              case "Investments":
                setActiveTab("Goals");
                break;
              case "Debt/Loan":
                setActiveTab("Investments");
                break;
            }
          } else {
            // Swipe left - go to next tab
            switch (activeTab) {
              case "Budget":
                setActiveTab("Subscriptions");
                break;
              case "Subscriptions":
                setActiveTab("Goals");
                break;
              case "Goals":
                setActiveTab("Investments");
                break;
              case "Investments":
                setActiveTab("Debt/Loan");
                break;
            }
          }
        }
      },
      onPanResponderTerminate: () => {
        // Handle termination if needed
      },
    })
  ).current;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newAllocated, setNewAllocated] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [budgetPeriod, setBudgetPeriod] = useState("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isGlobalBudget, setIsGlobalBudget] = useState(false);
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(true);
  const [isInsightsModalVisible, setIsInsightsModalVisible] = useState(false);
  const [selectedBudgetForInsights, setSelectedBudgetForInsights] =
    useState<any>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">(
    "start"
  );

  // Fetch budgets and accounts from database
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

      // Fetch budgets with accounts and budget progress in parallel
      const [budgetsData, accountsData, progressData] = await Promise.all([
        fetchBudgetsWithAccounts(user.id),
        fetchAccounts(user.id),
        getBudgetProgress(user.id),
      ]);

      setBudgets(budgetsData.map((b) => b as Budget));
      setBudgetsWithAccounts(budgetsData);
      setBudgetProgress(progressData);
      setAccounts(accountsData);

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

  const openAddModal = () => {
    if (accounts.length === 0 && !isGlobalBudget) {
      Alert.alert(t.noAccounts, t.createAccountFirst);
      return;
    }
    setCurrentBudget(null);
    setNewCategory("");
    setNewAllocated("");
    setBudgetPeriod("this_month");
    setCustomStartDate("");
    setCustomEndDate("");
    setIsGlobalBudget(false);
    setSelectedAccount(accounts.length > 0 ? accounts[0] : null); // Set default account
    setIsModalVisible(true);
  };

  const openEditModal = (budget: any) => {
    setCurrentBudget(budget);
    setNewCategory(budget.category);
    setNewAllocated(budget.amount.toString());
    setBudgetPeriod(budget.period || "this_month");
    setIsGlobalBudget(budget.account_id === null);

    // Find and set the account for this budget
    const budgetAccount =
      budget.account || accounts.find((acc) => acc.id === budget.account_id);
    setSelectedAccount(budgetAccount || null);

    setIsModalVisible(true);
  };

  const openInsightsModal = (budget: any) => {
    setSelectedBudgetForInsights(budget);
    setIsInsightsModalVisible(true);
  };

  // Date picker functions
  const openDatePicker = (mode: "start" | "end") => {
    setDatePickerMode(mode);
    setDatePickerVisible(true);
  };

  const onDismiss = () => setDatePickerVisible(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setDatePickerVisible(false);
    }

    if (selectedDate) {
      if (datePickerMode === "start") {
        setCustomStartDate(selectedDate.toISOString().split("T")[0]);
      } else {
        setCustomEndDate(selectedDate.toISOString().split("T")[0]);
      }
    }
  };

  const confirmIOSDate = () => {
    setDatePickerVisible(false);
  };

  const handleSaveBudget = async () => {
    if (!newCategory.trim() || !newAllocated.trim()) {
      Alert.alert(t.missingInfo, t.pleaseFillCategoryAndAmount);
      return;
    }

    if (!isGlobalBudget && !selectedAccount) {
      Alert.alert(t.selectAccount, t.selectAccountForBudget);
      return;
    }

    if (!userId) {
      Alert.alert(t.error, t.userNotAuthenticated);
      return;
    }

    // Validate custom date range if selected
    if (budgetPeriod === "custom") {
      if (!customStartDate || !customEndDate) {
        Alert.alert(t.missingInfo, t.pleaseSelectDateRange);
        return;
      }
      if (new Date(customStartDate) >= new Date(customEndDate)) {
        Alert.alert(t.error, t.endDateMustBeAfterStartDate);
        return;
      }
    }

    try {
      const budgetData = {
        category: newCategory,
        amount: parseFloat(newAllocated),
        period: budgetPeriod as
          | "this_week"
          | "this_month"
          | "next_month"
          | "this_year"
          | "custom",
        account_id: isGlobalBudget ? undefined : selectedAccount?.id,
        start_date:
          budgetPeriod === "custom"
            ? customStartDate
            : new Date().toISOString().split("T")[0],
        end_date: budgetPeriod === "custom" ? customEndDate : undefined,
        is_active: true,
      };

      if (currentBudget) {
        // Update existing budget
        const updatedBudget = await updateBudget(currentBudget.id, budgetData);
        setBudgets((prev) =>
          prev.map((b) => (b.id === currentBudget.id ? updatedBudget : b))
        );
        Alert.alert(t.success, t.budgetUpdated);
      } else {
        // Add new budget
        const newBudgetData = {
          user_id: userId,
          ...budgetData,
          account_id: isGlobalBudget ? undefined : selectedAccount?.id || "",
        };
        const newBudget = await addBudget(newBudgetData as any);
        setBudgets((prev) => [...prev, newBudget]);
        Alert.alert(t.success, t.budgetAdded);
      }
      setIsModalVisible(false);
      // Refresh data to get updated budget progress
      fetchData();
    } catch (error) {
      console.error("Error saving budget:", error);
      Alert.alert(t.error, t.budgetSaveError);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    Alert.alert(t.deleteBudget, t.deleteBudgetConfirmation, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBudget(budgetId);
            setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
            Alert.alert(t.success, t.budgetDeleted);
            // Refresh data to get updated budget progress
            fetchData();
          } catch (error) {
            console.error("Error deleting budget:", error);
            Alert.alert(t.error, t.budgetSaveError);
          }
        },
      },
    ]);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return "#ef4444";
    if (percentage > 75) return "#f59e0b";
    return "#10b981";
  };

  // Get budget progress for a specific category
  const getCategoryProgress = (category: string) => {
    return (
      budgetProgress.find((progress) => progress.category === category) || {
        category,
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
      (cat) => cat.key === categoryKey
    );
    return categoryObj ? categoryObj.label : categoryKey;
  };

  // Subscriptions tab content
  const SubscriptionsTab = () => <SubscriptionsScreen />;

  // Goals tab content
  const GoalsTab = () => <SavingsScreen />;

  // Investments tab content
  const InvestmentsTab = () => <Investments />;

  // Debt/Loan tab content
  const DebtLoanTab = () => <Debt_Loan />;

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: 0 }}>
      <View className="flex-1">
        {/* Tabs with PanResponder */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          }}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={{
              paddingVertical: 16,
              alignItems: "center",
              borderBottomWidth: activeTab === "Budget" ? 2 : 0,
              borderBottomColor:
                activeTab === "Budget" ? theme.primary : "transparent",
            }}
            onPress={() => setActiveTab("Budget")}
          >
            <Text
              style={{
                fontWeight: "500",
                color: activeTab === "Budget" ? theme.primary : theme.textMuted,
              }}
            >
              {t.budget}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingVertical: 16,
              alignItems: "center",
              borderBottomWidth: activeTab === "Subscriptions" ? 2 : 0,
              borderBottomColor:
                activeTab === "Subscriptions" ? theme.primary : "transparent",
            }}
            onPress={() => setActiveTab("Subscriptions")}
          >
            <Text
              style={{
                fontWeight: "500",
                color:
                  activeTab === "Subscriptions"
                    ? theme.primary
                    : theme.textMuted,
              }}
            >
              {t.subscriptions}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingVertical: 16,
              alignItems: "center",
              borderBottomWidth: activeTab === "Goals" ? 2 : 0,
              borderBottomColor:
                activeTab === "Goals" ? theme.primary : "transparent",
            }}
            onPress={() => setActiveTab("Goals")}
          >
            <Text
              style={{
                fontWeight: "500",
                color: activeTab === "Goals" ? theme.primary : theme.textMuted,
              }}
            >
              {t.goals}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingVertical: 16,
              alignItems: "center",
              borderBottomWidth: activeTab === "Investments" ? 2 : 0,
              borderBottomColor:
                activeTab === "Investments" ? theme.primary : "transparent",
            }}
            onPress={() => setActiveTab("Investments")}
          >
            <Text
              style={{
                fontWeight: "500",
                color:
                  activeTab === "Investments" ? theme.primary : theme.textMuted,
              }}
            >
              {t.investments}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingVertical: 16,
              alignItems: "center",
              borderBottomWidth: activeTab === "Debt/Loan" ? 2 : 0,
              borderBottomColor:
                activeTab === "Debt/Loan" ? theme.primary : "transparent",
            }}
            onPress={() => setActiveTab("Debt/Loan")}
          >
            <Text
              style={{
                fontWeight: "500",
                color:
                  activeTab === "Debt/Loan" ? theme.primary : theme.textMuted,
              }}
            >
              {t.debtLoan}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === "Budget" && (
            <View>
              <View
                className="px-2"
                style={{
                  marginBottom: 24,
                  backgroundColor: theme.background,
                  paddingTop: 16,
                }}
              >
                <View className="flex-row justify-between items-center mb-4">
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: "bold",
                      fontSize: 20,
                    }}
                  >
                    {t.monthlyBudget}
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
                    <Text style={{ color: theme.primaryText }}>
                      {t.addBudgets}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Budget Notifications Control */}
                <View
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    backgroundColor: theme.background,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                      <Text style={{ color: theme.text, fontSize: 14 }}>
                        Budget Alerts
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{
                        width: 50,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: budgetAlertsEnabled
                          ? theme.primary
                          : theme.border,
                        alignItems: budgetAlertsEnabled
                          ? "flex-end"
                          : "flex-start",
                        justifyContent: "center",
                        paddingHorizontal: 2,
                      }}
                      onPress={() =>
                        setBudgetAlertsEnabled(!budgetAlertsEnabled)
                      }
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: theme.primaryText,
                        }}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    Get notified when you're close to or over your budget limits
                  </Text>
                </View>

                {loading ? (
                  <View style={{ paddingVertical: 32, alignItems: "center" }}>
                    <Text style={{ color: theme.textSecondary }}>
                      {t.loadingBudgets}
                    </Text>
                  </View>
                ) : budgets.length === 0 ? (
                  <View style={{ paddingVertical: 32, alignItems: "center" }}>
                    <Text style={{ color: theme.textSecondary }}>
                      {t.noBudgetsSetUp}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap justify-between">
                    {budgetsWithAccounts.map((budget) => {
                      // Get budget progress for this category
                      const progress = getCategoryProgress(budget.category);
                      const spent = progress.spent;
                      const percentage = progress.percentage;
                      const remaining = progress.remaining;

                      return (
                        <TouchableOpacity
                          key={budget.id}
                          style={{
                            width: "47%",
                            marginBottom: 16,
                            padding: 10,
                            backgroundColor: theme.cardBackground,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                          onPress={() => openInsightsModal(budget)}
                        >
                          <View className="flex-row justify-between gap-2 items-center mb-2">
                            <Text
                              style={{
                                color: theme.text,
                                fontSize: 12,
                                fontWeight: "400",
                              }}
                            >
                              {getCategoryLabel(budget.category)}
                            </Text>
                            <View className="flex-row space-x-2">
                              <TouchableOpacity
                                onPress={() => openEditModal(budget)}
                              >
                                <Edit2 size={16} color={theme.icon} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDeleteBudget(budget.id)}
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          <View style={{ marginBottom: 8 }}>
                            {budget.account ? (
                              <Text
                                style={{
                                  color: theme.textSecondary,
                                  fontSize: 12,
                                }}
                              >
                                {budget.account.name}
                              </Text>
                            ) : (
                              <Text
                                style={{
                                  color: theme.primary,
                                  fontSize: 12,
                                  fontWeight: "500",
                                }}
                              >
                                🌐 Global Budget
                              </Text>
                            )}
                            {budget.period &&
                              budget.period !== "this_month" && (
                                <Text
                                  style={{
                                    color: theme.textSecondary,
                                    fontSize: 10,
                                    marginTop: 2,
                                  }}
                                >
                                  {budget.period === "this_week"
                                    ? "This Week"
                                    : budget.period === "next_month"
                                      ? "Next Month"
                                      : budget.period === "this_year"
                                        ? "This Year"
                                        : budget.period === "custom"
                                          ? "Custom Period"
                                          : budget.period}
                                </Text>
                              )}
                          </View>

                          <View
                            style={{ alignItems: "center", marginVertical: 8 }}
                          >
                            <CircularProgress
                              size={80}
                              width={8}
                              fill={Math.min(percentage, 100)}
                              tintColor={getProgressColor(percentage)}
                              backgroundColor="#e5e7eb"
                              rotation={0}
                              lineCap="round"
                            >
                              {(fill: number) => (
                                <Text
                                  style={{
                                    color: theme.text,
                                    fontWeight: "bold",
                                    fontSize: 18,
                                  }}
                                >
                                  {Math.round(fill)}%
                                </Text>
                              )}
                            </CircularProgress>
                          </View>

                          <View style={{ marginTop: 8 }}>
                            <View className="flex-row justify-between">
                              <Text
                                style={{
                                  color: theme.textSecondary,
                                  fontSize: 12,
                                }}
                              >
                                {t.spent}
                              </Text>
                              <Text
                                style={{
                                  color: theme.text,
                                  fontSize: 12,
                                  fontWeight: "500",
                                }}
                              >
                                ${spent.toFixed(2)}
                              </Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text
                                style={{
                                  color: theme.textSecondary,
                                  fontSize: 12,
                                }}
                              >
                                {t.budget}
                              </Text>
                              <Text
                                style={{
                                  color: theme.text,
                                  fontSize: 12,
                                  fontWeight: "500",
                                }}
                              >
                                ${budget.amount.toFixed(2)}
                              </Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text
                                style={{
                                  color: theme.textSecondary,
                                  fontSize: 12,
                                }}
                              >
                                {t.remaining}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "500",
                                  color: remaining < 0 ? "#ef4444" : "#10b981",
                                }}
                              >
                                ${Math.abs(remaining).toFixed(2)}{" "}
                                {remaining < 0 ? t.over : t.left}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}

          {activeTab === "Subscriptions" && <SubscriptionsTab />}
          {activeTab === "Goals" && <GoalsTab />}
          {activeTab === "Investments" && <InvestmentsTab />}
          {activeTab === "Debt/Loan" && <DebtLoanTab />}
        </ScrollView>

        {/* Add/Edit Budget Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <View
              style={{
                width: "92%",
                backgroundColor: theme.cardBackground,
                borderRadius: 12,
                padding: 24,
              }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "bold",
                    fontSize: 18,
                  }}
                >
                  {currentBudget ? t.editBudget : t.addNewBudget}
                </Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <X size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text style={{ color: theme.text, marginBottom: 4 }}>
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
                      color: newCategory ? theme.text : theme.textMuted,
                    }}
                  >
                    {newCategory
                      ? getCategoryLabel(newCategory)
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
                              newCategory === category.key
                                ? `${theme.primary}20`
                                : "transparent",
                          }}
                          onPress={() => {
                            setNewCategory(category.key);
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

              {/* Global Budget Toggle */}
              <View className="mb-4">
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    backgroundColor: isGlobalBudget
                      ? `${theme.primary}20`
                      : theme.background,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isGlobalBudget ? theme.primary : theme.border,
                  }}
                  onPress={() => {
                    setIsGlobalBudget(!isGlobalBudget);
                    if (!isGlobalBudget) {
                      setSelectedAccount(null);
                    } else if (accounts.length > 0) {
                      setSelectedAccount(accounts[0]);
                    }
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: isGlobalBudget
                        ? theme.primary
                        : theme.border,
                      backgroundColor: isGlobalBudget
                        ? theme.primary
                        : "transparent",
                      marginRight: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isGlobalBudget && (
                      <Text style={{ color: theme.primaryText, fontSize: 12 }}>
                        ✓
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: "500" }}>
                      🌐 Global Budget
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                      Track spending across all accounts
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Account Selection - Only show if not global budget */}
              {!isGlobalBudget && (
                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
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
              )}

              {/* Budget Period Selection */}
              <View className="mb-4">
                <Text style={{ color: theme.text, marginBottom: 4 }}>
                  Budget Period
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {[
                    { key: "this_week", label: "This Week" },
                    { key: "this_month", label: "This Month" },
                    { key: "next_month", label: "Next Month" },
                    { key: "this_year", label: "This Year" },
                    { key: "custom", label: "Custom Range" },
                  ].map((period) => (
                    <TouchableOpacity
                      key={period.key}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor:
                          budgetPeriod === period.key
                            ? theme.primary
                            : theme.background,
                        borderWidth: 1,
                        borderColor:
                          budgetPeriod === period.key
                            ? theme.primary
                            : theme.border,
                      }}
                      onPress={() => setBudgetPeriod(period.key)}
                    >
                      <Text
                        style={{
                          color:
                            budgetPeriod === period.key
                              ? theme.primaryText
                              : theme.text,
                          fontWeight: "500",
                        }}
                      >
                        {period.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Date Range - Only show if custom period is selected */}
              {budgetPeriod === "custom" && (
                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 8 }}>
                    Custom Date Range
                  </Text>
                  <View className="flex-row justify-between items-center gap-2">
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: theme.background,
                        padding: 12,
                        borderRadius: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => openDatePicker("start")}
                    >
                      <Calendar size={14} color="#3b82f6" />
                      <Text
                        style={{
                          marginLeft: 8,
                          color: "#1d4ed8",
                          fontSize: 12,
                          fontWeight: "500",
                        }}
                        numberOfLines={1}
                        minimumFontScale={0.5}
                        adjustsFontSizeToFit={true}
                      >
                        From:{" "}
                        {customStartDate
                          ? formatDate(new Date(customStartDate).toISOString())
                          : "Select Start Date"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: theme.background,
                        padding: 12,
                        borderRadius: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                      onPress={() => openDatePicker("end")}
                    >
                      <Calendar size={14} color="#8b5cf6" />
                      <Text
                        style={{
                          marginLeft: 8,
                          color: "#7c3aed",
                          fontSize: 12,
                          fontWeight: "500",
                        }}
                        numberOfLines={1}
                        minimumFontScale={0.5}
                        adjustsFontSizeToFit={true}
                      >
                        To:{" "}
                        {customEndDate
                          ? formatDate(new Date(customEndDate).toISOString())
                          : "Select End Date"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View className="mb-4">
                <Text style={{ color: theme.text, marginBottom: 4 }}>
                  {t.budgetAmount}
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 8,
                    padding: 12,
                    color: theme.text,
                    backgroundColor: theme.background,
                  }}
                  placeholder={t.enterAmount}
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={newAllocated}
                  onChangeText={setNewAllocated}
                />
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
                onPress={handleSaveBudget}
              >
                <Text style={{ color: theme.primaryText, fontWeight: "500" }}>
                  {currentBudget ? t.updateBudget : t.addBudget}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Budget Insights Modal */}
        <Modal
          visible={isInsightsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsInsightsModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <View
              style={{
                width: "92%",
                maxHeight: "80%",
                backgroundColor: theme.cardBackground,
                borderRadius: 12,
                padding: 24,
              }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "bold",
                    fontSize: 18,
                  }}
                >
                  📊 Budget Insights
                </Text>
                <TouchableOpacity
                  onPress={() => setIsInsightsModalVisible(false)}
                >
                  <X size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {selectedBudgetForInsights && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Budget Details */}
                  <View
                    style={{
                      padding: 16,
                      backgroundColor: theme.background,
                      borderRadius: 8,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text,
                        fontWeight: "bold",
                        fontSize: 16,
                        marginBottom: 8,
                      }}
                    >
                      {getCategoryLabel(selectedBudgetForInsights.category)}
                    </Text>

                    <View className="flex-row justify-between items-center mb-2">
                      <Text
                        style={{ color: theme.textSecondary, fontSize: 14 }}
                      >
                        Budget Amount
                      </Text>
                      <Text style={{ color: theme.text, fontWeight: "500" }}>
                        ${selectedBudgetForInsights.amount.toFixed(2)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-center mb-2">
                      <Text
                        style={{ color: theme.textSecondary, fontSize: 14 }}
                      >
                        Period
                      </Text>
                      <Text style={{ color: theme.text, fontWeight: "500" }}>
                        {selectedBudgetForInsights.period === "this_week"
                          ? "This Week"
                          : selectedBudgetForInsights.period === "this_month"
                            ? "This Month"
                            : selectedBudgetForInsights.period === "next_month"
                              ? "Next Month"
                              : selectedBudgetForInsights.period === "this_year"
                                ? "This Year"
                                : selectedBudgetForInsights.period === "custom"
                                  ? "Custom Period"
                                  : selectedBudgetForInsights.period}
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <Text
                        style={{ color: theme.textSecondary, fontSize: 14 }}
                      >
                        Account
                      </Text>
                      <Text style={{ color: theme.text, fontWeight: "500" }}>
                        {selectedBudgetForInsights.account
                          ? selectedBudgetForInsights.account.name
                          : "🌐 Global Budget"}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Details */}
                  {(() => {
                    const progress = getCategoryProgress(
                      selectedBudgetForInsights.category
                    );
                    return (
                      <View
                        style={{
                          padding: 16,
                          backgroundColor: theme.background,
                          borderRadius: 8,
                          marginBottom: 16,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "bold",
                            fontSize: 16,
                            marginBottom: 12,
                          }}
                        >
                          Spending Progress
                        </Text>

                        <View
                          style={{ alignItems: "center", marginBottom: 16 }}
                        >
                          <CircularProgress
                            size={120}
                            width={12}
                            fill={Math.min(progress.percentage, 100)}
                            tintColor={getProgressColor(progress.percentage)}
                            backgroundColor="#e5e7eb"
                            rotation={0}
                            lineCap="round"
                          >
                            {(fill: number) => (
                              <Text
                                style={{
                                  color: theme.text,
                                  fontWeight: "bold",
                                  fontSize: 24,
                                }}
                              >
                                {Math.round(fill)}%
                              </Text>
                            )}
                          </CircularProgress>
                        </View>

                        <View className="flex-row justify-between items-center mb-2">
                          <Text
                            style={{ color: theme.textSecondary, fontSize: 14 }}
                          >
                            Spent
                          </Text>
                          <Text
                            style={{ color: theme.text, fontWeight: "500" }}
                          >
                            ${progress.spent.toFixed(2)}
                          </Text>
                        </View>

                        <View className="flex-row justify-between items-center mb-2">
                          <Text
                            style={{ color: theme.textSecondary, fontSize: 14 }}
                          >
                            Budget
                          </Text>
                          <Text
                            style={{ color: theme.text, fontWeight: "500" }}
                          >
                            ${selectedBudgetForInsights.amount.toFixed(2)}
                          </Text>
                        </View>

                        <View className="flex-row justify-between items-center">
                          <Text
                            style={{ color: theme.textSecondary, fontSize: 14 }}
                          >
                            Remaining
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color:
                                progress.remaining < 0 ? "#ef4444" : "#10b981",
                            }}
                          >
                            ${Math.abs(progress.remaining).toFixed(2)}{" "}
                            {progress.remaining < 0 ? "Over" : "Left"}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Budget Health */}
                  <View
                    style={{
                      padding: 16,
                      backgroundColor: theme.background,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text,
                        fontWeight: "bold",
                        fontSize: 16,
                        marginBottom: 12,
                      }}
                    >
                      Budget Health
                    </Text>

                    {(() => {
                      const progress = getCategoryProgress(
                        selectedBudgetForInsights.category
                      );
                      const isHealthy = progress.percentage <= 100;
                      const isWarning =
                        progress.percentage > 75 && progress.percentage <= 100;
                      const isOverBudget = progress.percentage > 100;

                      return (
                        <View>
                          <View className="flex-row justify-between items-center mb-4">
                            <Text
                              style={{
                                color: theme.textSecondary,
                                fontSize: 14,
                              }}
                            >
                              Status
                            </Text>
                            <Text
                              style={{
                                color: isHealthy ? "#10b981" : "#ef4444",
                                fontSize: 14,
                                fontWeight: "500",
                              }}
                            >
                              {isOverBudget
                                ? "⚠️ Over Budget"
                                : isWarning
                                  ? "⚠️ Close to Limit"
                                  : "✅ Healthy"}
                            </Text>
                          </View>

                          <Text
                            style={{ color: theme.textSecondary, fontSize: 12 }}
                          >
                            {isOverBudget
                              ? `You've exceeded your budget by $${Math.abs(progress.remaining).toFixed(2)}`
                              : isWarning
                                ? `You've used ${Math.round(progress.percentage)}% of your budget`
                                : `You have $${progress.remaining.toFixed(2)} remaining in your budget`}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Date Picker */}
        {datePickerVisible && (
          <>
            {Platform.OS === "ios" ? (
              <Modal
                transparent={true}
                animationType="slide"
                visible={datePickerVisible}
                onRequestClose={onDismiss}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                  }}
                >
                  <View
                    style={{
                      width: "90%",
                      backgroundColor: theme.cardBackground,
                      borderRadius: 12,
                      padding: 20,
                    }}
                  >
                    <View className="flex-row justify-between items-center mb-4">
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: "bold",
                          fontSize: 18,
                        }}
                      >
                        Select {datePickerMode === "start" ? "Start" : "End"}{" "}
                        Date
                      </Text>
                      <TouchableOpacity onPress={onDismiss}>
                        <X size={24} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <DateTimePicker
                      value={
                        datePickerMode === "start"
                          ? customStartDate
                            ? new Date(customStartDate)
                            : new Date()
                          : customEndDate
                            ? new Date(customEndDate)
                            : new Date()
                      }
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      style={{ backgroundColor: theme.background }}
                    />

                    <View className="flex-row gap-2 mt-4">
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: theme.border,
                          padding: 12,
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                        onPress={onDismiss}
                      >
                        <Text style={{ color: theme.text, fontWeight: "500" }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: theme.primary,
                          padding: 12,
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                        onPress={confirmIOSDate}
                      >
                        <Text
                          style={{
                            color: theme.primaryText,
                            fontWeight: "500",
                          }}
                        >
                          Confirm
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={
                  datePickerMode === "start"
                    ? customStartDate
                      ? new Date(customStartDate)
                      : new Date()
                    : customEndDate
                      ? new Date(customEndDate)
                      : new Date()
                }
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
