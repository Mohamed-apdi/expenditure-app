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
} from "react-native";
import { Plus, ChevronRight, X, Edit2, Trash2, ChevronDown } from "lucide-react-native";
import { CircularProgress } from "react-native-circular-progress";
import { SafeAreaView } from "react-native-safe-area-context";
import SubscriptionsScreen from "../components/SubscriptionsScreen";
import SavingsScreen from "../components/SavingsScreen";
import { supabase } from "~/lib/supabase";
import { 
  fetchBudgets, 
  fetchBudgetsWithAccounts,
  addBudget, 
  updateBudget, 
  deleteBudget,
  getBudgetProgress,
  type Budget 
} from "~/lib/budgets";
import { fetchAccounts, type Account } from "~/lib/accounts";
import { getExpensesByCategory } from "~/lib/analytics";

export default function BudgetScreen() {
  const [activeTab, setActiveTab] = useState("Budget");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetsWithAccounts, setBudgetsWithAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        // Check if the swipe is horizontal and significant enough
        if (Math.abs(gestureState.dx) > 50) {
          if (gestureState.dx > 0) {
            // Swipe right - go to previous tab
            switch (activeTab) {
              case "Subscriptions":
                setActiveTab("Budget");
                break;
              case "Goals":
                setActiveTab("Subscriptions");
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
            }
          }
        }
      },
    })
  ).current;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newAllocated, setNewAllocated] = useState("");

  const categories = [
    "Food",
    "Transport",
    "Housing",
    "Utilities",
    "Entertainment",
    "Health",
    "Shopping",
    "Other",
  ];

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
      
      // Fetch budgets with accounts and expenses in parallel
      const [budgetsData, accountsData, expensesData] = await Promise.all([
        fetchBudgetsWithAccounts(user.id),
        fetchAccounts(user.id),
        getExpensesByCategory(user.id)
      ]);
      
      setBudgets(budgetsData.map(b => b as Budget));
      setBudgetsWithAccounts(budgetsData);
      setAccounts(accountsData);
      
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

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    if (accounts.length === 0) {
      Alert.alert("No Accounts", "Please create an account first before setting up budgets.");
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
    const budgetAccount = budget.account || accounts.find(acc => acc.id === budget.account_id);
    setSelectedAccount(budgetAccount || null);
    
    setIsModalVisible(true);
  };

  const handleSaveBudget = async () => {
    if (!newCategory.trim() || !newAllocated.trim()) {
      Alert.alert("Missing Info", "Please fill in category and allocated amount");
      return;
    }

    if (!selectedAccount) {
      Alert.alert("Select Account", "Please select an account for this budget");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User not authenticated");
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
        setBudgets(prev => prev.map(b => b.id === currentBudget.id ? updatedBudget : b));
        Alert.alert("Success", "Budget updated successfully");
      } else {
        // Add new budget
        const newBudget = await addBudget({
          user_id: userId,
          account_id: selectedAccount.id,
          category: newCategory,
          amount: parseFloat(newAllocated),
          period: "monthly",
          start_date: new Date().toISOString().split('T')[0],
          is_active: true,
        });
        setBudgets(prev => [...prev, newBudget]);
        Alert.alert("Success", "Budget added successfully");
      }
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error saving budget:", error);
      Alert.alert("Error", "Failed to save budget");
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    Alert.alert(
      "Delete Budget",
      "Are you sure you want to delete this budget?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBudget(budgetId);
              setBudgets(prev => prev.filter(b => b.id !== budgetId));
              Alert.alert("Success", "Budget deleted successfully");
            } catch (error) {
              console.error("Error deleting budget:", error);
              Alert.alert("Error", "Failed to delete budget");
            }
          },
        },
      ]
    );
  };

  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return "#ef4444";
    if (percentage > 75) return "#f59e0b";
    return "#10b981";
  };

  // Subscriptions tab content
  const SubscriptionsTab = () => <SubscriptionsScreen />;

  // Goals tab content
  const GoalsTab = () => <SavingsScreen />;

  return (
    <SafeAreaView className="flex-1 py-safe">
      <View className="flex-1" {...panResponder.panHandlers}>
        {/* Tabs */}
        <View className="flex-row border-b border-gray-200 bg-white">
          <TouchableOpacity
            className={`flex-1 py-4 items-center ${activeTab === "Budget" ? "border-b-2 border-blue-500" : ""}`}
            onPress={() => setActiveTab("Budget")}
          >
            <Text
              className={`font-medium ${activeTab === "Budget" ? "text-blue-500" : "text-gray-500"}`}
            >
              Budget
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-4 items-center ${activeTab === "Subscriptions" ? "border-b-2 border-blue-500" : ""}`}
            onPress={() => setActiveTab("Subscriptions")}
          >
            <Text
              className={`font-medium ${activeTab === "Subscriptions" ? "text-blue-500" : "text-gray-500"}`}
            >
              Subscriptions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-4 items-center ${activeTab === "Goals" ? "border-b-2 border-blue-500" : ""}`}
            onPress={() => setActiveTab("Goals")}
          >
            <Text
              className={`font-medium ${activeTab === "Goals" ? "text-blue-500" : "text-gray-500"}`}
            >
              Goals
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <ScrollView className="flex-1">
          {activeTab === "Budget" && (
            <View className="p-4">
              <View className="mb-6 bg-white  rounded-xl">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="font-bold text-xl">Monthly Budget</Text>
                  <TouchableOpacity
                    className="bg-blue-500 rounded-lg py-3 px-3 items-center"
                    onPress={openAddModal}
                  >
                    <Text className="text-white">Add Budgets</Text>
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <View className="py-8 items-center">
                    <Text className="text-gray-500">Loading budgets...</Text>
                  </View>
                ) : budgets.length === 0 ? (
                  <View className="py-8 items-center">
                    <Text className="text-gray-500">No budgets set up yet</Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap justify-between">
                    {budgetsWithAccounts.map((budget) => {
                      // Calculate spent amount from expenses for this category and account
                      const spent = 0; // TODO: Calculate from expenses data
                      const percentage = spent > 0 ? (spent / budget.amount) * 100 : 0;
                      const remaining = budget.amount - spent;

                      return (
                        <View
                          key={budget.id}
                          className="w-[48%] mb-4 p-3 bg-white rounded-xl border border-gray-100"
                        >
                          <View className="flex-row justify-between items-center mb-2">
                            <Text className="font-medium">
                              {budget.category}
                            </Text>
                            <View className="flex-row space-x-2">
                              <TouchableOpacity
                                onPress={() => openEditModal(budget)}
                              >
                                <Edit2 size={16} color="#6b7280" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDeleteBudget(budget.id)}
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {budget.account && (
                            <Text className="text-xs text-gray-500 mb-2">
                              {budget.account.name}
                            </Text>
                          )}

                          <View className="items-center my-2">
                            <CircularProgress
                              size={80}
                              width={8}
                              fill={Math.min(percentage, 100)}
                              tintColor={getProgressColor(percentage)}
                              backgroundColor="#e5e7eb"
                              rotation={0}
                              lineCap="round"
                            >
                              {(fill) => (
                                <Text className="font-bold text-lg">
                                  {Math.round(fill)}%
                                </Text>
                              )}
                            </CircularProgress>
                          </View>

                          <View className="mt-2">
                            <View className="flex-row justify-between">
                              <Text className="text-gray-500 text-xs">
                                Spent
                              </Text>
                              <Text className="text-xs font-medium">
                                ${spent.toFixed(2)}
                              </Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text className="text-gray-500 text-xs">
                                Budget
                              </Text>
                              <Text className="text-xs font-medium">
                                ${budget.amount.toFixed(2)}
                              </Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text className="text-gray-500 text-xs">
                                Remaining
                              </Text>
                              <Text
                                className={`text-xs font-medium ${
                                  remaining < 0
                                    ? "text-red-500"
                                    : "text-green-500"
                                }`}
                              >
                                ${Math.abs(remaining).toFixed(2)}{" "}
                                {remaining < 0 ? "Over" : "Left"}
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
        </ScrollView>

        {/* Add/Edit Budget Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="w-11/12 bg-white rounded-xl p-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="font-bold text-lg">
                  {currentBudget ? "Edit Budget" : "Add New Budget"}
                </Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-1">Category</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="Enter category"
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-1">Account</Text>
                <TouchableOpacity
                  className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center"
                  onPress={() => setShowAccountDropdown(!showAccountDropdown)}
                >
                  <Text className={selectedAccount ? "text-gray-900" : "text-gray-500"}>
                    {selectedAccount ? selectedAccount.name : "Select an account"}
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
                            selectedAccount?.id === account.id ? "bg-blue-50" : ""
                          }`}
                          onPress={() => {
                            setSelectedAccount(account);
                            setShowAccountDropdown(false);
                          }}
                        >
                          <Text className="font-medium">{account.name}</Text>
                          <Text className="text-sm text-gray-500">{account.group_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-1">Budget Amount ($)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={newAllocated}
                  onChangeText={setNewAllocated}
                />
              </View>

              <TouchableOpacity
                className="bg-blue-500 py-3 rounded-lg items-center"
                onPress={handleSaveBudget}
              >
                <Text className="text-white font-medium">
                  {currentBudget ? "Update Budget" : "Add Budget"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
