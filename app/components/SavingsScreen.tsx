import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
  Image,
} from "react-native";
import {
  Plus,
  ChevronRight,
  Trash2,
  Calendar,
  DollarSign,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Define the icon types
type GoalIcon =
  | "averagePrice"
  | "bookmark"
  | "briefcase"
  | "car"
  | "dollarBag"
  | "favorite"
  | "happy"
  | "home"
  | "idea"
  | "keySecurity"
  | "key"
  | "lock"
  | "wallet"
  | "traveler"
  | "airport"
  | "gift"
  | "goal";

type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  icon: GoalIcon;
  iconColor: string; // Add icon color property
};

// Mock the icons
const goalIcons = {
  averagePrice: require("../../assets/goal_icons/Average Price.png"),
  bookmark: require("../../assets/goal_icons/Bookmark.png"),
  briefcase: require("../../assets/goal_icons/Briefcase.png"),
  car: require("../../assets/goal_icons/Car.png"),
  dollarBag: require("../../assets/goal_icons/Dollar Bag.png"),
  favorite: require("../../assets/goal_icons/Favorite.png"),
  happy: require("../../assets/goal_icons/Happy.png"),
  home: require("../../assets/goal_icons/Home.png"),
  idea: require("../../assets/goal_icons/Idea.png"),
  keySecurity: require("../../assets/goal_icons/Key Security.png"),
  key: require("../../assets/goal_icons/Key.png"),
  lock: require("../../assets/goal_icons/Lock.png"),
  wallet: require("../../assets/goal_icons/Wallet.png"),
  traveler: require("../../assets/goal_icons/Traveler.png"),
  airport: require("../../assets/goal_icons/Airport.png"),
  gift: require("../../assets/goal_icons/Gift.png"),
  goal: require("../../assets/goal_icons/Goal.png"),
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
  "#FFA07A",
  "#98FB98",
];

export default function SavingsScreen() {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      name: "Emergency Fund",
      target: 5000,
      saved: 3200,
      deadline: "2023-12-31",
      icon: "dollarBag",
      iconColor: "#90EE90",
    },
    {
      id: "2",
      name: "New Laptop",
      target: 1200,
      saved: 450,
      deadline: "2023-08-15",
      icon: "goal",
      iconColor: "#ADD8E6",
    },
    {
      id: "3",
      name: "Vacation",
      target: 3000,
      saved: 1200,
      deadline: "2024-03-01",
      icon: "traveler",
      iconColor: "#B0E0E6",
    },
  ]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isIconModalVisible, setIsIconModalVisible] = useState(false);
  const [isColorModalVisible, setIsColorModalVisible] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    target: "",
    saved: "",
    deadline: "",
    icon: "goal" as GoalIcon,
    iconColor: colors[0], // Default to first color
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      target: "",
      saved: "",
      deadline: "",
      icon: "goal",
      iconColor: colors[0],
    });
    setCurrentGoal(null);
    setIsEditMode(false);
  };

  const handleAddGoal = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const handleGoalPress = (goal: Goal) => {
    setCurrentGoal(goal);
    setFormData({
      name: goal.name,
      target: goal.target.toString(),
      saved: goal.saved.toString(),
      deadline: goal.deadline,
      icon: goal.icon,
      iconColor: goal.iconColor,
    });
    setIsEditMode(true);
    setIsModalVisible(true);
  };

  const handleDeleteGoal = (id: string) => {
    Alert.alert(
      "Delete Goal",
      "Are you sure you want to delete this goal?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setGoals(goals.filter((goal) => goal.id !== id));
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.target || !formData.deadline) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const newGoal: Goal = {
      id: isEditMode && currentGoal ? currentGoal.id : Math.random().toString(),
      name: formData.name,
      target: parseFloat(formData.target),
      saved: formData.saved ? parseFloat(formData.saved) : 0,
      deadline: formData.deadline,
      icon: formData.icon,
      iconColor: formData.iconColor,
    };

    if (isEditMode) {
      setGoals(goals.map((goal) => (goal.id === newGoal.id ? newGoal : goal)));
    } else {
      setGoals([...goals, newGoal]);
    }

    setIsModalVisible(false);
    resetForm();
  };

  const calculateProgress = (saved: number, target: number) => {
    return (saved / target) * 100;
  };

  const calculateDaysLeft = (deadline: string) => {
    const daysLeft = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return daysLeft > 0 ? `${daysLeft} days left` : "Past deadline";
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
    setFormData({
      ...formData,
      icon,
    });
    setIsIconModalVisible(false);
  };

  const selectColor = (color: string) => {
    setFormData({
      ...formData,
      iconColor: color,
    });
    setIsColorModalVisible(false);
  };

  return (
    <View>
      <ScrollView className="flex-1 p-4">
        <View>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="font-bold text-xl text-gray-900">
              Savings Goals
            </Text>
            <TouchableOpacity
              className="bg-blue-500 rounded-lg py-3 px-3 items-center"
              onPress={handleAddGoal}
            >
              <Text className="text-white">Add Goals</Text>
            </TouchableOpacity>
          </View>

          {goals.length === 0 ? (
            <View className="py-8 items-center">
              <View className="bg-blue-100 p-4 rounded-full mb-4">
                <Image source={goalIcons.goal} className="w-12 h-12" />
              </View>
              <Text className="text-gray-500 text-lg text-center">
                No savings goals yet
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Tap the + button to add your first goal
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {goals.map((goal) => {
                const percentage = calculateProgress(goal.saved, goal.target);
                const daysLeft = calculateDaysLeft(goal.deadline);

                return (
                  <Pressable
                    key={goal.id}
                    className="p-5 bg-gray-50 rounded-xl border border-gray-100 my-2"
                    onPress={() => handleGoalPress(goal)}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-row items-center">
                        <View
                          className="p-2 rounded-full mr-3"
                          style={{ backgroundColor: goal.iconColor }}
                        >
                          <Image
                            source={goalIcons[goal.icon]}
                            className="w-6 h-6"
                          />
                        </View>
                        <View>
                          <Text className="font-semibold text-gray-900 text-lg">
                            {goal.name}
                          </Text>
                          <Text className="text-gray-500 text-sm">
                            {formatDate(goal.deadline)} • {daysLeft}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                      <View
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </View>

                    <View>
                      <Text className="text-blue-600 text-sm font-medium">
                        {percentage.toFixed(0)}% completed
                      </Text>
                    </View>

                    <View className="flex-row justify-end mt-2">
                      <Text className="font-medium text-gray-900">
                        ${goal.saved.toFixed(2)}
                        <Text className="text-gray-400">
                          {" "}
                          / ${goal.target.toFixed(2)}
                        </Text>
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Goal Modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setIsModalVisible(false);
          resetForm();
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="font-bold text-xl text-gray-900">
                {isEditMode ? "Edit Goal" : "New Goal"}
              </Text>

              <View className="flex-row justify-center items-center gap-2">
                {isEditMode ? (
                  <TouchableOpacity
                    className="p-2"
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteGoal(goal.id);
                    }}
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                ) : (
                  ""
                )}

                <TouchableOpacity
                  onPress={() => {
                    setIsModalVisible(false);
                    resetForm();
                  }}
                >
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
                      style={{ backgroundColor: formData.iconColor }}
                    >
                      <Image
                        source={goalIcons[formData.icon]}
                        className="w-10 h-10"
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
                      className="w-10 h-10 rounded-full mr-3"
                      style={{ backgroundColor: formData.iconColor }}
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
                  placeholder="e.g. New Car, Vacation"
                  placeholderTextColor="#9CA3AF"
                  value={formData.name}
                  onChangeText={(text) => handleInputChange("name", text)}
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">
                  Target Amount
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                  <View className="px-4">
                    <DollarSign size={18} color="#6b7280" />
                  </View>
                  <TextInput
                    className="flex-1 p-4"
                    placeholder="5000"
                    keyboardType="numeric"
                    value={formData.target}
                    onChangeText={(text) =>
                      handleInputChange("target", text.replace(/[^0-9.]/g, ""))
                    }
                  />
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">
                  Amount Saved
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                  <View className="px-4">
                    <DollarSign size={18} color="#6b7280" />
                  </View>
                  <TextInput
                    className="flex-1 p-4"
                    placeholder="1000"
                    keyboardType="numeric"
                    value={formData.saved}
                    onChangeText={(text) =>
                      handleInputChange("saved", text.replace(/[^0-9.]/g, ""))
                    }
                  />
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">
                  Target Date
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                  <View className="px-4">
                    <Calendar size={18} color="#6b7280" />
                  </View>
                  <TextInput
                    className="flex-1 p-4"
                    placeholder="YYYY-MM-DD"
                    value={formData.deadline}
                    onChangeText={(text) => handleInputChange("deadline", text)}
                  />
                </View>
              </View>

              <TouchableOpacity
                className="bg-blue-600 p-4 rounded-xl items-center mt-2"
                onPress={handleSubmit}
              >
                <Text className="text-white font-medium text-lg">
                  {isEditMode ? "Update Goal" : "Add Goal"}
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
                    style={{ backgroundColor: formData.iconColor }}
                  >
                    <Image
                      source={goalIcons[icon as GoalIcon]}
                      className="w-8 h-8"
                    />
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
                  className={`w-1/5 p-4 items-center ${formData.iconColor === color ? "bg-blue-50 rounded-lg" : ""}`}
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
