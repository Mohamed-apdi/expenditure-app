import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import {
  X,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "~/lib";
import { fetchAccounts, type Account } from "~/lib";
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
            invested_amount: parseFloat(newInvestedAmount),
            current_value: parseFloat(newCurrentValue),
          })
          .select()
          .single();

        if (error) throw error;

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
            const { error } = await supabase
              .from("investments")
              .delete()
              .eq("id", investmentId);

            if (error) throw error;

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: "bold",
                  fontSize: 24,
                }}
              >
                {t.investments}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4 }}>
                {investments.length} {investments.length === 1 ? 'investment' : 'investments'}
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
              <Text
                style={{
                  color: theme.primaryText,
                  fontWeight: "600",
                }}
              >
                {t.addInvestment}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Portfolio Summary - Simplified */}
          <View style={{ marginBottom: 24, gap: 12 }}>
            <View
              style={{
                backgroundColor: theme.cardBackground,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <View className="flex-row items-center mb-2">
                <View style={{ backgroundColor: '#dbeafe', borderRadius: 20, padding: 8, marginRight: 8 }}>
                  <DollarSign size={16} color="#3b82f6" />
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "500" }}>
                  {t.totalInvested}
                </Text>
              </View>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: "bold",
                  fontSize: 28,
                }}
              >
                ${totalInvested.toFixed(2)}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.cardBackground,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <View style={{ backgroundColor: totalCurrentValue >= totalInvested ? '#dcfce7' : '#fee2e2', borderRadius: 20, padding: 6, marginRight: 6 }}>
                    {totalCurrentValue >= totalInvested ? (
                      <TrendingUp size={14} color="#10b981" />
                    ) : (
                      <TrendingDown size={14} color="#ef4444" />
                    )}
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: "500" }}>
                    {t.totalCurrentValue}
                  </Text>
                </View>
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

              <View
                style={{
                  flex: 1,
                  backgroundColor: theme.cardBackground,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <View style={{ backgroundColor: totalProfitLoss >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 20, padding: 6, marginRight: 6 }}>
                    <BarChart3 size={14} color={totalProfitLoss >= 0 ? '#10b981' : '#ef4444'} />
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: "500" }}>
                    {t.totalProfitLoss}
                  </Text>
                </View>
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
                    fontSize: 12,
                    color: getProfitLossColor(totalProfitLoss),
                    marginTop: 2,
                  }}
                >
                  {totalReturnPercentage.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>

          {/* My Investments - Simplified */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: theme.text, fontWeight: "bold", fontSize: 18, marginBottom: 12 }}>
              {t.myInvestments}
            </Text>

            {investments.length === 0 ? (
              <View
                style={{
                  paddingVertical: 48,
                  alignItems: "center",
                  backgroundColor: theme.cardBackground,
                  borderRadius: 16,
                }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: "500" }}>
                  {t.noInvestmentsYet}
                </Text>
                <Text
                  style={{ color: theme.textMuted, fontSize: 14, marginTop: 8 }}
                >
                  {t.addFirstInvestment}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {investments.map((investment) => {
                  const profitLossPercentage = investment.invested_amount > 0
                    ? (investment.profit_loss / investment.invested_amount) * 100
                    : 0;
                  const isProfit = investment.profit_loss >= 0;

                  return (
                    <View
                      key={investment.id}
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
                              fontWeight: "bold",
                              fontSize: 18,
                            }}
                          >
                            {investment.name}
                          </Text>
                          <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
                            <View
                              style={{
                                backgroundColor: '#e0e7ff',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}
                            >
                              <Text
                                style={{ color: '#4f46e5', fontSize: 11, fontWeight: "600" }}
                              >
                                {getInvestmentTypeLabel(investment.type)}
                              </Text>
                            </View>
                            <View
                              style={{
                                backgroundColor: isProfit ? '#dcfce7' : '#fee2e2',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}
                            >
                              <Text
                                style={{
                                  color: isProfit ? '#16a34a' : '#dc2626',
                                  fontSize: 11,
                                  fontWeight: "600"
                                }}
                              >
                                {isProfit ? '+' : ''}{profitLossPercentage.toFixed(2)}%
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Amount Info */}
                      <View className="flex-row justify-between items-center mb-3">
                        <View>
                          <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                            Current Value
                          </Text>
                          <Text
                            style={{
                              color: theme.text,
                              fontWeight: "bold",
                              fontSize: 24,
                            }}
                          >
                            ${investment.current_value.toFixed(2)}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                            Profit/Loss
                          </Text>
                          <View className="flex-row items-center">
                            {getProfitLossIcon(investment.profit_loss)}
                            <Text
                              style={{
                                fontWeight: "bold",
                                fontSize: 20,
                                marginLeft: 4,
                                color: getProfitLossColor(investment.profit_loss),
                              }}
                            >
                              ${Math.abs(investment.profit_loss).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View className="mb-3">
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
                              width: `${Math.min(100, (investment.current_value / Math.max(investment.invested_amount, investment.current_value)) * 100)}%`,
                              backgroundColor: isProfit ? '#10b981' : '#ef4444',
                              borderRadius: 4,
                            }}
                          />
                        </View>
                        <View className="flex-row justify-between mt-1">
                          <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                            Invested: ${investment.invested_amount.toFixed(2)}
                          </Text>
                          <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                            {investment.account?.name || 'N/A'}
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View className="flex-row gap-2 pt-3 border-t" style={{ borderColor: theme.border }}>
                        <TouchableOpacity
                          onPress={() => openEditModal(investment)}
                          className="flex-1 py-2 rounded-lg"
                          style={{ backgroundColor: '#e0e7ff' }}
                        >
                          <Text style={{ color: '#4f46e5', fontWeight: "600", fontSize: 13, textAlign: 'center' }}>
                            Edit
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteInvestment(investment.id)}
                          className="flex-1 py-2 rounded-lg"
                          style={{ backgroundColor: '#fee2e2' }}
                        >
                          <Text style={{ color: '#dc2626', fontWeight: "600", fontSize: 13, textAlign: 'center' }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default Investments;
