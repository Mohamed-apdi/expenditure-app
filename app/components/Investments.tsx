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
  ActivityIndicator,
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
  Wallet,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "~/lib";
import { fetchAccounts, type Account, updateAccountBalance } from "~/lib";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

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
  const { t } = useLanguage();
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
  const [showAccountSelectionModal, setShowAccountSelectionModal] =
    useState(false);

  // Form states
  const [newType, setNewType] = useState("");
  const [newName, setNewName] = useState("");
  const [newInvestedAmount, setNewInvestedAmount] = useState("");
  const [newCurrentValue, setNewCurrentValue] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  // Investment types
  const investmentTypes = [
    { key: "Stock", label: t.stock },
    { key: "Crypto", label: t.crypto },
    { key: "Real Estate", label: t.realEstate },
    { key: "Bonds", label: t.bonds },
    { key: "Mutual Funds", label: t.mutualFunds },
    { key: "ETF", label: t.etf },
    { key: "Commodities", label: t.commodities },
    { key: "Other", label: t.other },
  ];

  // Get translated investment type label
  const getInvestmentTypeLabel = (typeKey: string) => {
    const typeObj = investmentTypes.find((type) => type.key === typeKey);
    return typeObj ? typeObj.label : typeKey;
  };

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
      Alert.alert(t.error, t.failedToFetchData);
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
      Alert.alert(t.noAccountsForInvestment, t.createAccountFirstForInvestment);
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
      Alert.alert(t.missingInvestmentInfo, t.pleaseFillAllInvestmentFields);
      return;
    }

    if (!selectedAccount) {
      Alert.alert(t.selectAccount, t.selectAccountForInvestment);
      return;
    }

    if (!userId) {
      Alert.alert(t.error, t.userNotAuthenticatedForInvestment);
      return;
    }

    try {
      const investedAmount = parseFloat(newInvestedAmount);
      const currentValue = parseFloat(newCurrentValue);

      if (currentInvestment) {
        // Update existing investment
        const oldInvestedAmount = currentInvestment.invested_amount;
        const oldCurrentValue = currentInvestment.current_value;

        // Calculate the net effect of the old investment on account balance
        const oldNetEffect = oldCurrentValue - oldInvestedAmount;

        // Calculate the net effect of the new investment on account balance
        const newNetEffect = currentValue - investedAmount;

        // Calculate the difference in net effect
        const balanceChange = newNetEffect - oldNetEffect;

        const { data, error } = await supabase
          .from("investments")
          .update({
            type: newType,
            name: newName,
            invested_amount: investedAmount,
            current_value: currentValue,
            account_id: selectedAccount.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentInvestment.id)
          .select()
          .single();

        if (error) throw error;

        // Update account balance
        const newBalance = selectedAccount.amount + balanceChange;
        await updateAccountBalance(selectedAccount.id, newBalance);

        setInvestments((prev) =>
          prev.map((inv) => (inv.id === currentInvestment.id ? data : inv))
        );
        Alert.alert(t.success, t.investmentUpdated);
      } else {
        // Add new investment
        const { data, error } = await supabase
          .from("investments")
          .insert({
            user_id: userId,
            account_id: selectedAccount.id,
            type: newType,
            name: newName,
            invested_amount: investedAmount,
            current_value: currentValue,
          })
          .select()
          .single();

        if (error) throw error;

        // Update account balance: subtract invested amount, add current value
        const balanceChange = currentValue - investedAmount;
        const newBalance = selectedAccount.amount + balanceChange;
        await updateAccountBalance(selectedAccount.id, newBalance);

        setInvestments((prev) => [data, ...prev]);
        Alert.alert(t.success, t.investmentAdded);
      }
      setIsModalVisible(false);
      fetchData(); // Refresh to get updated data
    } catch (error) {
      console.error("Error saving investment:", error);
      Alert.alert(t.error, t.investmentSaveError);
    }
  };

  const handleDeleteInvestment = async (investmentId: string) => {
    Alert.alert(t.deleteInvestment, t.deleteInvestmentConfirmation, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: async () => {
          try {
            // Find the investment to get its details before deletion
            const investmentToDelete = investments.find(
              (inv) => inv.id === investmentId
            );
            if (!investmentToDelete) {
              Alert.alert(t.error, t.error);
              return;
            }

            const { error } = await supabase
              .from("investments")
              .delete()
              .eq("id", investmentId);

            if (error) throw error;

            // Update account balance: reverse the investment's effect
            // Subtract the current value and add back the invested amount
            const balanceChange =
              investmentToDelete.invested_amount -
              investmentToDelete.current_value;
            const accountToUpdate = accounts.find(
              (acc) => acc.id === investmentToDelete.account_id
            );

            if (accountToUpdate) {
              const newBalance = accountToUpdate.amount + balanceChange;
              await updateAccountBalance(
                investmentToDelete.account_id,
                newBalance
              );
            }

            setInvestments((prev) =>
              prev.filter((inv) => inv.id !== investmentId)
            );
            Alert.alert(t.success, t.investmentDeleted);
          } catch (error) {
            console.error("Error deleting investment:", error);
            Alert.alert(t.error, t.investmentDeleteError);
          }
        },
      },
    ]);
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <View
          className="flex-1justify-center items-center"
          style={{ backgroundColor: theme.background }}
        >
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600 dark:text-gray-300">
            Loading investments...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
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
              {t.investments}
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
                {t.addInvestment}
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
                  {t.totalInvested}
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
                  {t.totalCurrentValue}
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
                  {t.totalProfitLoss}
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
                {t.myInvestments}
              </Text>
            </View>

            {loading ? (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <Text style={{ color: theme.textSecondary }}>
                  {t.loadingInvestments}
                </Text>
              </View>
            ) : investments.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <Text style={{ color: theme.textSecondary }}>
                  {t.noInvestmentsYet}
                </Text>
                <Text
                  style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}
                >
                  {t.addFirstInvestment}
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
                          {getInvestmentTypeLabel(investment.type)}
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
                      <View className="flex-row space-x-2 gap-2">
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
                    {currentInvestment ? t.editInvestment : t.addInvestment}
                  </Text>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={24} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    {t.investmentType}
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
                      {newType
                        ? getInvestmentTypeLabel(newType)
                        : t.selectInvestmentType}
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
                            key={type.key}
                            style={{
                              padding: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: theme.border,
                              backgroundColor:
                                newType === type.key
                                  ? `${theme.primary}20`
                                  : "transparent",
                            }}
                            onPress={() => {
                              setNewType(type.key);
                              setShowTypeDropdown(false);
                            }}
                          >
                            <Text
                              style={{ color: theme.text, fontWeight: "500" }}
                            >
                              {type.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    {t.investmentName}
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
                    placeholder={t.enterInvestmentName}
                    placeholderTextColor={theme.textMuted}
                    value={newName}
                    onChangeText={setNewName}
                  />
                </View>

                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    {t.account}
                  </Text>
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.inputBackground,
                    }}
                    onPress={() => setShowAccountSelectionModal(true)}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: `${theme.primary}30`,
                          marginRight: 16,
                        }}
                      >
                        <Wallet size={20} color={theme.primary} />
                      </View>
                      <View>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.text,
                          }}
                        >
                          {selectedAccount?.name || t.selectAccount}
                        </Text>
                        {selectedAccount && (
                          <Text
                            style={{
                              fontSize: 14,
                              color: theme.textSecondary,
                            }}
                          >
                            {selectedAccount.account_type} $
                            {selectedAccount.amount.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <ChevronDown size={16} color={theme.iconMuted} />
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    {t.investedAmount}
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
                    value={newInvestedAmount}
                    onChangeText={setNewInvestedAmount}
                  />
                </View>

                <View className="mb-6">
                  <Text style={{ color: theme.text, marginBottom: 4 }}>
                    {t.currentValue}
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
                    {currentInvestment ? t.updateInvestment : t.addInvestment}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Account Selection Modal */}
        <Modal
          visible={showAccountSelectionModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowAccountSelectionModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50 p-4">
            <View className="bg-white rounded-2xl p-6 w-full max-w-md">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="font-bold text-xl text-gray-900">
                  {t.selectAccount}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAccountSelectionModal(false)}
                >
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <ScrollView className="max-h-[400px]">
                <View className="flex-row flex-wrap justify-between">
                  {accounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      className={`w-1/2 p-4 items-center ${
                        selectedAccount?.id === account.id
                          ? "bg-blue-50 rounded-lg"
                          : ""
                      }`}
                      onPress={() => {
                        setSelectedAccount(account);
                        setShowAccountSelectionModal(false);
                      }}
                    >
                      <View
                        className="p-3 rounded-full mb-2"
                        style={{ backgroundColor: `${theme.primary}20` }}
                      >
                        <Wallet size={24} color={theme.primary} />
                      </View>
                      <Text className="text-xs text-gray-700 text-center">
                        {account.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Investments;
