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
import { useTheme } from "~/lib/theme";

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
  const theme = useTheme();
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
    if (profitLoss > 0) return theme.success; // Green
    if (profitLoss < 0) return theme.danger; // Red
    return theme.textSecondary; // Gray
  };

  const getProfitLossIcon = (profitLoss: number) => {
    if (profitLoss > 0) return <TrendingUp size={16} color={theme.success} />;
    if (profitLoss < 0) return <TrendingDown size={16} color={theme.danger} />;
    return <BarChart3 size={16} color={theme.textSecondary} />;
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
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Investments */}
        <View style={{ paddingHorizontal: 16 }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text
              style={{
                color: theme.text,
                fontWeight: "bold",
                fontSize: 20,
                marginBottom: 16,
              }}
            >
              Investments
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 16,
                alignItems: "center",
                flexDirection: "row",
              }}
              onPress={openAddModal}
            >
              <Plus size={20} color={theme.primaryText} />
              <Text
                style={{
                  color: theme.primaryText,
                  fontWeight: "500",
                  marginLeft: 8,
                }}
              >
                Add Investment
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={{
              marginBottom: 24,
              backgroundColor: theme.cardBackground,
              borderRadius: 12,
            }}
          >
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 items-center">
                <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                  Total Invested
                </Text>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "bold",
                    fontSize: 18,
                  }}
                >
                  ${totalInvested.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                  Current Value
                </Text>
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "bold",
                    fontSize: 18,
                  }}
                >
                  ${totalCurrentValue.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
                  Total P&L
                </Text>
                <Text
                  style={{
                    fontWeight: "bold",
                    fontSize: 18,
                    color: getProfitLossColor(totalProfitLoss),
                  }}
                >
                  ${totalProfitLoss.toFixed(2)}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: getProfitLossColor(totalProfitLoss),
                  }}
                >
                  {totalReturnPercentage.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>

          {/* My Investments */}
          <View
            style={{
              marginBottom: 24,
              backgroundColor: theme.cardBackground,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View className="flex-row justify-between items-center">
              <Text
                style={{ color: theme.text, fontWeight: "bold", fontSize: 20 }}
              >
                My Investments
              </Text>
            </View>

            {loading ? (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <Text style={{ color: theme.textSecondary }}>
                  Loading investments...
                </Text>
              </View>
            ) : investments.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <Text style={{ color: theme.textSecondary }}>
                  No investments yet
                </Text>
                <Text
                  style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}
                >
                  Add your first investment to get started
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 16 }}>
                {investments.map((investment) => (
                  <View
                    key={investment.id}
                    style={{
                      marginBottom: 16,
                      padding: 16,
                      backgroundColor: theme.background,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "bold",
                            fontSize: 18,
                          }}
                        >
                          {investment.name}
                        </Text>
                        <Text
                          style={{ color: theme.textSecondary, fontSize: 14 }}
                        >
                          {investment.type}
                        </Text>
                        {investment.account && (
                          <Text
                            style={{
                              color: theme.textMuted,
                              fontSize: 12,
                              marginTop: 4,
                            }}
                          >
                            {investment.account.name}
                          </Text>
                        )}
                      </View>
                      <View className="flex-row space-x-2">
                        <TouchableOpacity
                          onPress={() => openEditModal(investment)}
                          style={{
                            padding: 8,
                            backgroundColor: `${theme.primary}20`,
                            borderRadius: 8,
                          }}
                        >
                          <Edit2 size={16} color={theme.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteInvestment(investment.id)}
                          style={{
                            padding: 8,
                            backgroundColor: "#fef2f2",
                            borderRadius: 8,
                          }}
                        >
                          <Trash2 size={16} color={theme.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <View className="flex-row justify-between mb-1">
                          <Text
                            style={{ color: theme.textSecondary, fontSize: 14 }}
                          >
                            Invested
                          </Text>
                          <Text
                            style={{ color: theme.text, fontWeight: "500" }}
                          >
                            ${investment.invested_amount.toFixed(2)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                          <Text
                            style={{ color: theme.textSecondary, fontSize: 14 }}
                          >
                            Current
                          </Text>
                          <Text
                            style={{ color: theme.text, fontWeight: "500" }}
                          >
                            ${investment.current_value.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <View className="flex-row items-center mb-1">
                          {getProfitLossIcon(investment.profit_loss)}
                          <Text
                            style={{
                              fontWeight: "bold",
                              fontSize: 18,
                              marginLeft: 4,
                              color: getProfitLossColor(investment.profit_loss),
                            }}
                          >
                            ${investment.profit_loss.toFixed(2)}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 14,
                            color: getProfitLossColor(investment.profit_loss),
                          }}
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
                maxHeight: "90%",
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-4">
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: "bold",
                      fontSize: 18,
                    }}
                  >
                    {currentInvestment
                      ? "Edit Investment"
                      : "Add New Investment"}
                  </Text>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={24} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    Investment Type
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
                    onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                  >
                    <Text
                      style={{ color: newType ? theme.text : theme.textMuted }}
                    >
                      {newType || "Select investment type"}
                    </Text>
                    <ChevronDown size={16} color={theme.textMuted} />
                  </TouchableOpacity>

                  {showTypeDropdown && (
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
                        {investmentTypes.map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={{
                              padding: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: theme.border,
                              backgroundColor:
                                newType === type
                                  ? `${theme.primary}20`
                                  : "transparent",
                            }}
                            onPress={() => {
                              setNewType(type);
                              setShowTypeDropdown(false);
                            }}
                          >
                            <Text
                              style={{ color: theme.text, fontWeight: "500" }}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    Investment Name
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
                    placeholder="e.g., Apple Inc., Bitcoin, Rental House"
                    placeholderTextColor={theme.textMuted}
                    value={newName}
                    onChangeText={setNewName}
                  />
                </View>

                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
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

                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    Amount Invested ($)
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
                    placeholder="Enter amount invested"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={newInvestedAmount}
                    onChangeText={setNewInvestedAmount}
                  />
                </View>

                <View className="mb-6">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    Current Value ($)
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
                    placeholder="Enter current value"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={newCurrentValue}
                    onChangeText={setNewCurrentValue}
                  />
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                  onPress={handleSaveInvestment}
                >
                  <Text style={{ color: theme.primaryText, fontWeight: "500" }}>
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
