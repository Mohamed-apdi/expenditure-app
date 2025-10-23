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
  X,
  Edit2,
  Trash2,
  ChevronDown,
} from "lucide-react-native";
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

  // Fetch budgets and accounts from database
  const fetchData = async () => {
    try {
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
        {/* Improved Tabs - Scrollable Pills */}
        <View
          style={{
            backgroundColor: theme.background,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
          {...panResponder.panHandlers}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 8,
            }}
          >
            {[
              { key: "Budget", label: t.budget || "Budget" },
              { key: "Subscriptions", label: t.subscriptions || "Subscriptions" },
              { key: "Goals", label: t.goals || "Goals" },
              { key: "Investments", label: t.investments || "Investments" },
              { key: "Debt/Loan", label: t.debtLoan || "Debt/Loan" },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 20,
                    backgroundColor: isActive ? theme.primary : theme.cardBackground,
                    borderWidth: 1,
                    borderColor: isActive ? theme.primary : theme.border,
                    marginRight: 4,
                  }}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text
                    style={{
                      fontWeight: isActive ? "600" : "400",
                      fontSize: 14,
                      color: isActive ? theme.primaryText : theme.textSecondary,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === "Budget" && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <View>
                  <Text style={{ color: theme.text, fontWeight: "bold", fontSize: 24 }}>
                    {t.monthlyBudget || "Monthly Budget"}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4 }}>
                    {budgets.length} {budgets.length === 1 ? 'category' : 'categories'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                  onPress={openAddModal}
                >
                  <Text style={{ color: theme.primaryText, fontWeight: "600" }}>
                    {t.addBudgets || "Add Budget"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Budget Cards */}
              {budgets.length === 0 ? (
                <View
                  style={{
                    paddingVertical: 48,
                    alignItems: "center",
                    backgroundColor: theme.cardBackground,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: "500" }}>
                    {t.noBudgetsSetUp}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}>
                    Create your first budget
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {budgetsWithAccounts.map((budget) => {
                    // Get budget progress for this category
                    const progress = getCategoryProgress(budget.category);
                    const spent = progress.spent;
                    const percentage = progress.percentage;
                    const remaining = progress.remaining;
                    const isOverBudget = percentage > 100;

                    return (
                      <View
                        key={budget.id}
                        style={{
                          padding: 16,
                          backgroundColor: theme.cardBackground,
                          borderRadius: 16,
                        }}
                      >
                        {/* Header */}
                        <View className="flex-row justify-between items-start mb-3">
                          <View className="flex-1">
                            <Text
                              style={{
                                color: theme.text,
                                fontSize: 18,
                                fontWeight: "bold",
                              }}
                            >
                              {getCategoryLabel(budget.category)}
                            </Text>
                            <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
                              <View
                                style={{
                                  backgroundColor: percentage > 100 ? '#fee2e2' : percentage > 75 ? '#fef3c7' : '#dcfce7',
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 12,
                                }}
                              >
                                <Text
                                  style={{
                                    color: percentage > 100 ? '#dc2626' : percentage > 75 ? '#d97706' : '#16a34a',
                                    fontSize: 11,
                                    fontWeight: "600"
                                  }}
                                >
                                  {Math.round(percentage)}% {isOverBudget ? 'over' : 'used'}
                                </Text>
                              </View>
                              {budget.account && (
                                <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                                  {budget.account.name}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#e0e7ff',
                                padding: 8,
                                borderRadius: 8,
                              }}
                              onPress={() => openEditModal(budget)}
                            >
                              <Edit2 size={14} color="#4f46e5" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#fee2e2',
                                padding: 8,
                                borderRadius: 8,
                              }}
                              onPress={() => handleDeleteBudget(budget.id)}
                            >
                              <Trash2 size={14} color="#dc2626" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Amount Info */}
                        <View className="flex-row justify-between items-center mb-3">
                          <View>
                            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                              Spent / Budget
                            </Text>
                            <Text
                              style={{
                                color: getProgressColor(percentage),
                                fontWeight: "bold",
                                fontSize: 24,
                              }}
                            >
                              ${spent.toFixed(2)}
                            </Text>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                              {isOverBudget ? 'Over Budget' : 'Remaining'}
                            </Text>
                            <Text
                              style={{
                                fontWeight: "bold",
                                fontSize: 20,
                                color: remaining < 0 ? "#ef4444" : "#10b981",
                              }}
                            >
                              ${Math.abs(remaining).toFixed(2)}
                            </Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View>
                          <View
                            style={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: theme.border,
                              overflow: 'hidden',
                            }}
                          >
                            <View
                              style={{
                                height: '100%',
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: getProgressColor(percentage),
                                borderRadius: 4,
                              }}
                            />
                          </View>
                          <View className="flex-row justify-between mt-1">
                            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                              Budget: ${budget.amount.toFixed(2)}
                            </Text>
                            <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                              {Math.round(percentage)}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {activeTab === "Subscriptions" && <SubscriptionsTab />}
          {activeTab === "Goals" && <GoalsTab />}
          {activeTab === "Investments" && <InvestmentsTab />}
          {activeTab === "Debt/Loan" && <DebtLoanTab />}
        </ScrollView>

        {/* Add/Edit Budget Modal - Simplified */}
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
                width: "100%",
                maxWidth: 400,
                backgroundColor: theme.cardBackground,
                borderRadius: 20,
                padding: 20,
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row justify-between items-center mb-5">
                  <Text style={{ color: theme.text, fontWeight: "bold", fontSize: 22 }}>
                    {currentBudget ? t.editBudget : t.addNewBudget}
                  </Text>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={24} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Category - Chip Selection */}
                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 8, fontWeight: "500", fontSize: 13 }}>
                    {t.category || "Category"} *
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                    <View className="flex-row gap-2 px-1">
                      {expenseCategories.slice(0, 12).map((category) => (
                        <TouchableOpacity
                          key={category.key}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: newCategory === category.key ? theme.primary : theme.border,
                            backgroundColor: newCategory === category.key ? `${theme.primary}20` : theme.background,
                          }}
                          onPress={() => {
                            setNewCategory(category.key);
                          }}
                        >
                          <Text
                            style={{
                              color: newCategory === category.key ? theme.primary : theme.textSecondary,
                              fontSize: 13,
                              fontWeight: newCategory === category.key ? "600" : "400",
                            }}
                          >
                            {category.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Account & Budget Amount - Side by Side */}
                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <Text style={{ color: theme.text, marginBottom: 8, fontWeight: "500", fontSize: 13 }}>
                      {t.account || "Account"} *
                    </Text>
                    <TouchableOpacity
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 12,
                        padding: 14,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: theme.background,
                      }}
                      onPress={() => setShowAccountDropdown(!showAccountDropdown)}
                    >
                      <Text
                        style={{
                          color: selectedAccount ? theme.text : theme.textMuted,
                          fontSize: 14,
                        }}
                        numberOfLines={1}
                      >
                        {selectedAccount ? selectedAccount.name : "Select"}
                      </Text>
                      <ChevronDown size={14} color={theme.textMuted} />
                    </TouchableOpacity>
                    {showAccountDropdown && (
                      <View
                        style={{
                          marginTop: 4,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 12,
                          backgroundColor: theme.cardBackground,
                          maxHeight: 180,
                          position: 'absolute',
                          top: 68,
                          left: 0,
                          right: 0,
                          zIndex: 1000,
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
                              <Text style={{ color: theme.text, fontSize: 14 }}>
                                {account.name}
                              </Text>
                              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                                {account.account_type}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <View className="flex-1">
                    <Text style={{ color: theme.text, marginBottom: 8, fontWeight: "500", fontSize: 13 }}>
                      {t.budgetAmount || "Amount"} *
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 12,
                        padding: 14,
                        color: theme.text,
                        backgroundColor: theme.background,
                        fontSize: 15,
                      }}
                      placeholder="0.00"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="numeric"
                      value={newAllocated}
                      onChangeText={setNewAllocated}
                    />
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                  onPress={handleSaveBudget}
                >
                  <Text style={{ color: theme.primaryText, fontWeight: "600", fontSize: 16 }}>
                    {currentBudget ? t.updateBudget : t.addBudget}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
