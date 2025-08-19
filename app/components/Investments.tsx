import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
} from "react-native";
import {
  Plus,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "~/lib/supabase";
import { fetchAccounts, type Account } from "~/lib/accounts";

// Investment types
const investmentTypes = [
  "Stock",
  "Crypto",
  "Real Estate",
  "Bonds",
  "Mutual Funds",
  "ETF",
  "Commodities",
  "Other",
];

// Investment interface based on your Supabase table
interface Investment {
  id: string;
  user_id: string;
  account_id: string;
  type: string;
  name: string;
  invested_amount: number;
  current_value: number;
  profit_loss: number;
  created_at: string;
  updated_at: string;
  account?: Account;
}

const Investments = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentInvestment, setCurrentInvestment] = useState<Investment | null>(
    null
  );
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Form states
  const [newType, setNewType] = useState("");
  const [newName, setNewName] = useState("");
  const [newInvestedAmount, setNewInvestedAmount] = useState("");
  const [newCurrentValue, setNewCurrentValue] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Fetch investments and accounts
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

      // Fetch investments with accounts and accounts in parallel
      const [investmentsData, accountsData] = await Promise.all([
        fetchInvestmentsWithAccounts(user.id),
        fetchAccounts(user.id),
      ]);

      setInvestments(investmentsData);
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

  // Fetch investments with account details
  const fetchInvestmentsWithAccounts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("investments")
        .select(
          `
          *,
          account:accounts(*)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching investments:", error);
      return [];
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
      Alert.alert(
        "No Accounts",
        "Please create an account first before adding investments."
      );
      return;
    }
    setCurrentInvestment(null);
    setNewType("");
    setNewName("");
    setNewInvestedAmount("");
    setNewCurrentValue("");
    setSelectedAccount(accounts[0]);
    setIsModalVisible(true);
  };

  const openEditModal = (investment: Investment) => {
    setCurrentInvestment(investment);
    setNewType(investment.type);
    setNewName(investment.name);
    setNewInvestedAmount(investment.invested_amount.toString());
    setNewCurrentValue(investment.current_value.toString());

    const investmentAccount =
      investment.account ||
      accounts.find((acc) => acc.id === investment.account_id);
    setSelectedAccount(investmentAccount || null);

    setIsModalVisible(true);
  };

  const handleSaveInvestment = async () => {
    if (
      !newType.trim() ||
      !newName.trim() ||
      !newInvestedAmount.trim() ||
      !newCurrentValue.trim()
    ) {
      Alert.alert("Missing Info", "Please fill in all fields");
      return;
    }

    if (!selectedAccount) {
      Alert.alert(
        "Select Account",
        "Please select an account for this investment"
      );
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      if (currentInvestment) {
        // Update existing investment
        const { data, error } = await supabase
          .from("investments")
          .update({
            type: newType,
            name: newName,
            invested_amount: parseFloat(newInvestedAmount),
            current_value: parseFloat(newCurrentValue),
            account_id: selectedAccount.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentInvestment.id)
          .select()
          .single();

        if (error) throw error;

        setInvestments((prev) =>
          prev.map((inv) => (inv.id === currentInvestment.id ? data : inv))
        );
        Alert.alert("Success", "Investment updated successfully");
      } else {
        // Add new investment
        const { data, error } = await supabase
          .from("investments")
          .insert({
            user_id: userId,
            account_id: selectedAccount.id,
            type: newType,
            name: newName,
            invested_amount: parseFloat(newInvestedAmount),
            current_value: parseFloat(newCurrentValue),
          })
          .select()
          .single();

        if (error) throw error;

        setInvestments((prev) => [data, ...prev]);
        Alert.alert("Success", "Investment added successfully");
      }
      setIsModalVisible(false);
      fetchData(); // Refresh to get updated data
    } catch (error) {
      console.error("Error saving investment:", error);
      Alert.alert("Error", "Failed to save investment");
    }
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    Alert.alert(
      "Delete Investment",
      "Are you sure you want to delete this investment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("investments")
                .delete()
                .eq("id", investmentId);

              if (error) throw error;

              setInvestments((prev) =>
                prev.filter((inv) => inv.id !== investmentId)
              );
              Alert.alert("Success", "Investment deleted successfully");
            } catch (error) {
              console.error("Error deleting investment:", error);
              Alert.alert("Error", "Failed to delete investment");
            }
          },
        },
      ]
    );
  };

  const getProfitLossColor = (profitLoss: number) => {
    if (profitLoss > 0) return "#10b981"; // Green
    if (profitLoss < 0) return "#ef4444"; // Red
    return "#6b7280"; // Gray
  };

  const getProfitLossIcon = (profitLoss: number) => {
    if (profitLoss > 0) return <TrendingUp size={16} color="#10b981" />;
    if (profitLoss < 0) return <TrendingDown size={16} color="#ef4444" />;
    return <BarChart3 size={16} color="#6b7280" />;
  };

  // Calculate total portfolio value
  const totalInvested = investments.reduce(
    (sum, inv) => sum + inv.invested_amount,
    0
  );
  const totalCurrentValue = investments.reduce(
    (sum, inv) => sum + inv.current_value,
    0
  );
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalReturnPercentage =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  return (
    <SafeAreaView className="flex-1">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Investments */}
        <View className="px-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-xl mb-4">Investments</Text>
            <TouchableOpacity
              className="bg-blue-500 rounded-lg py-3 px-4 items-center flex-row"
              onPress={openAddModal}
            >
              <Plus size={20} color="white" />
              <Text className="text-white font-medium ml-2">
                Add Investment
              </Text>
            </TouchableOpacity>
          </View>
          <View className="mb-6 bg-white rounded-xl ">
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 items-center">
                <Text className="text-gray-500 text-sm">Total Invested</Text>
                <Text className="font-bold text-lg">
                  ${totalInvested.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-gray-500 text-sm">Current Value</Text>
                <Text className="font-bold text-lg">
                  ${totalCurrentValue.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-gray-500 text-sm">Total P&L</Text>
                <Text
                  className={`font-bold text-lg ${getProfitLossColor(totalProfitLoss)}`}
                >
                  ${totalProfitLoss.toFixed(2)}
                </Text>
                <Text
                  className={`text-sm ${getProfitLossColor(totalProfitLoss)}`}
                >
                  {totalReturnPercentage.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>

          {/* My Investments */}
          <View className="mb-6 bg-white rounded-xl p-4">
            <View className="flex-row justify-between items-center">
              <Text className="font-bold text-xl">My Investments</Text>
            </View>

            {loading ? (
              <View className="py-8 items-center">
                <Text className="text-gray-500">Loading investments...</Text>
              </View>
            ) : investments.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-gray-500">No investments yet</Text>
                <Text className="text-gray-400 text-sm mt-2">
                  Add your first investment to get started
                </Text>
              </View>
            ) : (
              <View className="mt-4">
                {investments.map((investment) => (
                  <View
                    key={investment.id}
                    className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text className="font-bold text-lg">
                          {investment.name}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          {investment.type}
                        </Text>
                        {investment.account && (
                          <Text className="text-gray-400 text-xs mt-1">
                            {investment.account.name}
                          </Text>
                        )}
                      </View>
                      <View className="flex-row space-x-2">
                        <TouchableOpacity
                          onPress={() => openEditModal(investment)}
                          className="p-2 bg-blue-100 rounded-lg"
                        >
                          <Edit2 size={16} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteInvestment(investment.id)}
                          className="p-2 bg-red-100 rounded-lg"
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <View className="flex-row justify-between mb-1">
                          <Text className="text-gray-500 text-sm">
                            Invested
                          </Text>
                          <Text className="font-medium">
                            ${investment.invested_amount.toFixed(2)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                          <Text className="text-gray-500 text-sm">Current</Text>
                          <Text className="font-medium">
                            ${investment.current_value.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <View className="flex-row items-center mb-1">
                          {getProfitLossIcon(investment.profit_loss)}
                          <Text
                            className={`font-bold text-lg ml-1 ${getProfitLossColor(investment.profit_loss)}`}
                          >
                            ${investment.profit_loss.toFixed(2)}
                          </Text>
                        </View>
                        <Text
                          className={`text-sm ${getProfitLossColor(investment.profit_loss)}`}
                        >
                          {investment.invested_amount > 0
                            ? (
                                (investment.profit_loss /
                                  investment.invested_amount) *
                                100
                              ).toFixed(2)
                            : "0.00"}
                          %
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Add/Edit Investment Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="w-11/12 bg-white rounded-xl p-6 max-h-[90%]">
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="font-bold text-lg">
                    {currentInvestment
                      ? "Edit Investment"
                      : "Add New Investment"}
                  </Text>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Investment Type</Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center"
                    onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                  >
                    <Text
                      className={newType ? "text-gray-900" : "text-gray-500"}
                    >
                      {newType || "Select investment type"}
                    </Text>
                    <ChevronDown size={16} color="#6b7280" />
                  </TouchableOpacity>

                  {showTypeDropdown && (
                    <View className="mt-2 border border-gray-300 rounded-lg bg-white max-h-40">
                      <ScrollView>
                        {investmentTypes.map((type) => (
                          <TouchableOpacity
                            key={type}
                            className={`p-3 border-b border-gray-200 ${
                              newType === type ? "bg-blue-50" : ""
                            }`}
                            onPress={() => {
                              setNewType(type);
                              setShowTypeDropdown(false);
                            }}
                          >
                            <Text className="font-medium">{type}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Investment Name</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="e.g., Apple Inc., Bitcoin, Rental House"
                    value={newName}
                    onChangeText={setNewName}
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Account</Text>
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

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">
                    Amount Invested ($)
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="Enter amount invested"
                    keyboardType="numeric"
                    value={newInvestedAmount}
                    onChangeText={setNewInvestedAmount}
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-gray-700 mb-1">Current Value ($)</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="Enter current value"
                    keyboardType="numeric"
                    value={newCurrentValue}
                    onChangeText={setNewCurrentValue}
                  />
                </View>

                <TouchableOpacity
                  className="bg-blue-500 py-3 rounded-lg items-center"
                  onPress={handleSaveInvestment}
                >
                  <Text className="text-white font-medium">
                    {currentInvestment ? "Update Investment" : "Add Investment"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Investments;
