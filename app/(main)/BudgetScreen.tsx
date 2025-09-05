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
} from "react-native";
import {
  Plus,
  ChevronRight,
  X,
  Edit2,
  Trash2,
  ChevronDown,
} from "lucide-react-native";
import { CircularProgress } from "react-native-circular-progress";
import { SafeAreaView } from "react-native-safe-area-context";
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
    if (accounts.length === 0) {
      Alert.alert(t.noAccounts, t.createAccountFirst);
      return;
    }
    setCurrentBudget(null);
    setNewCategory("");
    setNewAllocated("");
    setSelectedAccount(accounts[0]); // Set default account
    setIsModalVisible(true);
  };

  const openEditModal = (budget: any) => {
    setCurrentBudget(budget);
    setNewCategory(budget.category);
    setNewAllocated(budget.amount.toString());

    // Find and set the account for this budget
    const budgetAccount =
      budget.account || accounts.find((acc) => acc.id === budget.account_id);
    setSelectedAccount(budgetAccount || null);

    setIsModalVisible(true);
  };

  const handleSaveBudget = async () => {
    if (!newCategory.trim() || !newAllocated.trim()) {
      Alert.alert(t.missingInfo, t.pleaseFillCategoryAndAmount);
      return;
    }

    if (!selectedAccount) {
      Alert.alert(t.selectAccount, t.selectAccountForBudget);
      return;
    }

    if (!userId) {
      Alert.alert(t.error, t.userNotAuthenticated);
      return;
    }

    try {
      if (currentBudget) {
        // Update existing budget
        const updatedBudget = await updateBudget(currentBudget.id, {
          category: newCategory,
          amount: parseFloat(newAllocated),
          account_id: selectedAccount.id,
        });
        setBudgets((prev) =>
          prev.map((b) => (b.id === currentBudget.id ? updatedBudget : b))
        );
        Alert.alert(t.success, t.budgetUpdated);
      } else {
        // Add new budget
        const newBudget = await addBudget({
          user_id: userId,
          account_id: selectedAccount.id,
          category: newCategory,
          amount: parseFloat(newAllocated),
          period: "monthly",
          start_date: new Date().toISOString().split("T")[0],
          is_active: true,
        });
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
                        {t.budgetAlertsEnabled}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {t.budgetAlertsDescription}
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
                        <View
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

                          {budget.account && (
                            <Text
                              style={{
                                color: theme.textSecondary,
                                fontSize: 12,
                                marginBottom: 8,
                              }}
                            >
                              {budget.account.name}
                            </Text>
                          )}

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
                        </View>
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
      </View>
    </SafeAreaView>
  );
}
