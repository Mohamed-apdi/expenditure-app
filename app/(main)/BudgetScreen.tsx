// screens/BudgetScreen.tsx
import { useRef, useState } from "react";
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
import { Plus, ChevronRight, X, Edit2, Trash2 } from "lucide-react-native";
import { CircularProgress } from "react-native-circular-progress";
import { SafeAreaView } from "react-native-safe-area-context";
import SubscriptionsScreen from "../components/SubscriptionsScreen";
import SavingsScreen from "../components/SavingsScreen";

export default function BudgetScreen() {
  const [activeTab, setActiveTab] = useState("Budget");
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

  // Budget tab data and functions
  const [budgets, setBudgets] = useState([
    { id: "1", category: "Food", allocated: 500, spent: 420, color: "#f59e0b" },
    {
      id: "2",
      category: "Transport",
      allocated: 200,
      spent: 150,
      color: "#3b82f6",
    },
    {
      id: "3",
      category: "Entertainment",
      allocated: 100,
      spent: 85,
      color: "#8b5cf6",
    },
    {
      id: "4",
      category: "Utilities",
      allocated: 300,
      spent: 280,
      color: "#10b981",
    },
  ]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentBudget, setCurrentBudget] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [newAllocated, setNewAllocated] = useState("");
  const [newSpent, setNewSpent] = useState("");

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

  const openAddModal = () => {
    setCurrentBudget(null);
    setNewCategory("");
    setNewAllocated("");
    setNewSpent("");
    setIsModalVisible(true);
  };

  const openEditModal = (budget) => {
    setCurrentBudget(budget);
    setNewCategory(budget.category);
    setNewAllocated(budget.allocated.toString());
    setNewSpent(budget.spent.toString());
    setIsModalVisible(true);
  };

  const handleSave = () => {
    if (!newCategory || !newAllocated) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const allocated = parseFloat(newAllocated) || 0;
    const spent = parseFloat(newSpent) || 0;

    if (currentBudget) {
      // Update existing budget
      setBudgets(
        budgets.map((b) =>
          b.id === currentBudget.id
            ? { ...b, category: newCategory, allocated, spent }
            : b
        )
      );
    } else {
      // Add new budget
      const colors = [
        "#f59e0b",
        "#3b82f6",
        "#8b5cf6",
        "#10b981",
        "#ec4899",
        "#14b8a6",
      ];
      const newBudget = {
        id: Date.now().toString(),
        category: newCategory,
        allocated,
        spent,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
      setBudgets([...budgets, newBudget]);
    }

    setIsModalVisible(false);
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Budget",
      "Are you sure you want to delete this budget?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => setBudgets(budgets.filter((b) => b.id !== id)),
        },
      ]
    );
  };

  const getProgressColor = (percentage) => {
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
                    className="bg-blue-500 p-3 rounded-full"
                    onPress={openAddModal}
                  >
                    <Plus size={20} color="white" />
                  </TouchableOpacity>
                </View>

                {budgets.length === 0 ? (
                  <View className="py-8 items-center">
                    <Text className="text-gray-500">No budgets set up yet</Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap justify-between">
                    {budgets.map((budget) => {
                      const percentage =
                        (budget.spent / budget.allocated) * 100;
                      const remaining = budget.allocated - budget.spent;

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
                                onPress={() => handleDelete(budget.id)}
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          </View>

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
                                ${budget.spent.toFixed(2)}
                              </Text>
                            </View>
                            <View className="flex-row justify-between">
                              <Text className="text-gray-500 text-xs">
                                Budget
                              </Text>
                              <Text className="text-xs font-medium">
                                ${budget.allocated.toFixed(2)}
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
                <Text className="text-gray-700 mb-1">Budget Amount ($)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={newAllocated}
                  onChangeText={setNewAllocated}
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 mb-1">Amount Spent ($)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3"
                  placeholder="Enter amount spent"
                  keyboardType="numeric"
                  value={newSpent}
                  onChangeText={setNewSpent}
                />
              </View>

              <TouchableOpacity
                className="bg-blue-500 py-3 rounded-lg items-center"
                onPress={handleSave}
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
