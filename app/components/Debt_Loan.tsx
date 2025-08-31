import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Modal,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PersonalLoan, LoanRepayment, Account } from "~/lib";
import {
  getUserLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  getLoanRepayments,
  createRepayment,
  deleteRepayment,
} from "~/lib";
import { fetchAccounts } from "~/lib";
import { supabase } from "~/lib";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAccount } from "~/lib";
import { ChevronDown } from "lucide-react-native";
import { useTheme } from "~/lib";
import { useLanguage } from "~/lib";

const Debt_Loan = () => {
  const { refreshAccounts } = useAccount();
  const { t } = useLanguage();
  const [loans, setLoans] = useState<PersonalLoan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<PersonalLoan | null>(null);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const theme = useTheme();

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showRepaymentDatePicker, setShowRepaymentDatePicker] = useState(false);
  const [selectedRepaymentDate, setSelectedRepaymentDate] = useState(
    new Date()
  );

  // Form states
  const [formData, setFormData] = useState({
    type: "loan_taken" as "loan_given" | "loan_taken",
    party_name: "",
    principal_amount: "",
    interest_rate: "",
    due_date: "",
    account_id: "",
  });

  const [repaymentData, setRepaymentData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
  });

  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const loadData = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const [loansData, accountsData] = await Promise.all([
        getUserLoans(currentUser),
        fetchAccounts(currentUser),
      ]);

      // Ensure remaining amounts are accurate by recalculating from repayments
      const updatedLoans = await Promise.all(
        loansData.map(async (loan) => {
          try {
            const repayments = await getLoanRepayments(loan.id);
            const totalRepaid = repayments.reduce(
              (sum, r) => sum + r.amount,
              0
            );
            const calculatedRemaining = Math.max(
              0,
              loan.principal_amount - totalRepaid
            );

            // Update loan if remaining amount is different
            if (Math.abs(calculatedRemaining - loan.remaining_amount) > 0.01) {
              const newStatus =
                calculatedRemaining <= 0
                  ? "settled"
                  : calculatedRemaining < loan.principal_amount
                    ? "partial"
                    : "active";

              const updatedLoan = await updateLoan(loan.id, {
                remaining_amount: calculatedRemaining,
                status: newStatus,
              });
              return updatedLoan;
            }
            return loan;
          } catch (error) {
            console.error(`Error syncing loan ${loan.id}:`, error);
            return loan;
          }
        })
      );

      setLoans(updatedLoans);
      setAccounts(accountsData);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert(t.error, t.failedToLoadData);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then(() => {
        loadData();
      });
    }, [currentUser])
  );

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setFormData({
        ...formData,
        due_date: date.toISOString().split("T")[0],
      });
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const handleRepaymentDateChange = (event: any, date?: Date) => {
    setShowRepaymentDatePicker(false);
    if (date) {
      setSelectedRepaymentDate(date);
      setRepaymentData({
        ...repaymentData,
        payment_date: date.toISOString().split("T")[0],
      });
    }
  };

  const showRepaymentDatepicker = () => {
    setShowRepaymentDatePicker(true);
  };

  const handleAddLoan = async () => {
    if (
      !currentUser ||
      !formData.party_name ||
      !formData.principal_amount ||
      !formData.account_id
    ) {
      Alert.alert(t.error, t.pleaseFillAllLoanFields);
      return;
    }

    // Check balance for loan_given type
    if (formData.type === "loan_given") {
      const selectedAccount = accounts.find(
        (acc) => acc.id === formData.account_id
      );
      const loanAmount = parseFloat(formData.principal_amount);

      if (!selectedAccount) {
        Alert.alert(t.error, t.selectedAccountNotFound);
        return;
      }

      if (selectedAccount.amount < loanAmount) {
        Alert.alert(t.insufficientBalance, t.insufficientBalanceMessage);
        return;
      }
    }

    try {
      const newLoan = await createLoan({
        user_id: currentUser,
        type: formData.type,
        party_name: formData.party_name,
        principal_amount: parseFloat(formData.principal_amount),
        remaining_amount: parseFloat(formData.principal_amount),
        interest_rate: formData.interest_rate
          ? parseFloat(formData.interest_rate)
          : undefined,
        due_date: formData.due_date || undefined,
        account_id: formData.account_id,
        status: "active",
      });

      setLoans([newLoan, ...loans]);
      setShowAddModal(false);
      resetForm();

      // Refresh data to show updated account balances
      await loadData();
      refreshAccounts();

      Alert.alert(t.success, t.loanAdded);
    } catch (error) {
      console.error("Error creating loan:", error);
      Alert.alert(t.error, t.loanSaveError);
    }
  };

  const handleEditLoan = async () => {
    if (
      !selectedLoan ||
      !formData.party_name ||
      !formData.principal_amount ||
      !formData.account_id
    ) {
      Alert.alert(t.error, t.pleaseFillAllLoanFields);
      return;
    }

    // Check balance for loan_given type
    if (formData.type === "loan_given") {
      const selectedAccount = accounts.find(
        (acc) => acc.id === formData.account_id
      );
      const loanAmount = parseFloat(formData.principal_amount);

      if (!selectedAccount) {
        Alert.alert(t.error, t.selectedAccountNotFound);
        return;
      }

      // For editing, we need to consider the current loan amount that will be refunded
      // when the loan is updated, so we add back the current principal amount
      const currentLoanAmount = selectedLoan.principal_amount;
      const effectiveBalance = selectedAccount.amount + currentLoanAmount;

      if (effectiveBalance < loanAmount) {
        Alert.alert(
          "Insufficient Balance",
          `You don't have enough money in this account to update this loan.\n\nEffective Balance: $${effectiveBalance.toFixed(2)}\n(Current balance + current loan amount being refunded)\nNew Loan Amount: $${loanAmount.toFixed(2)}\nShortfall: $${(loanAmount - effectiveBalance).toFixed(2)}\n\nPlease either:\n- Reduce the loan amount\n- Transfer money to this account\n- Choose a different account with sufficient balance`
        );
        return;
      }
    }

    try {
      const updatedLoan = await updateLoan(selectedLoan.id, {
        type: formData.type,
        party_name: formData.party_name,
        principal_amount: parseFloat(formData.principal_amount),
        interest_rate: formData.interest_rate
          ? parseFloat(formData.interest_rate)
          : undefined,
        due_date: formData.due_date || undefined,
        account_id: formData.account_id,
      });

      setLoans(
        loans.map((loan) => (loan.id === updatedLoan.id ? updatedLoan : loan))
      );
      setShowEditModal(false);
      setSelectedLoan(null);
      resetForm();

      // Refresh data to show updated account balances
      await loadData();
      refreshAccounts();

      Alert.alert(t.success, t.loanUpdated);
    } catch (error) {
      console.error("Error updating loan:", error);
      Alert.alert(t.error, t.loanSaveError);
    }
  };

  const handleDeleteLoan = (loan: PersonalLoan) => {
    Alert.alert(
      "Delete Loan",
      `Are you sure you want to delete the loan with ${loan.party_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLoan(loan.id);
              setLoans(loans.filter((l) => l.id !== loan.id));

              // Refresh data to show updated account balances
              await loadData();
              refreshAccounts();

              Alert.alert(t.success, t.loanDeleted);
            } catch (error) {
              console.error("Error deleting loan:", error);
              Alert.alert(t.error, t.loanDeleteError);
            }
          },
        },
      ]
    );
  };

  const handleAddRepayment = async () => {
    if (!selectedLoan || !repaymentData.amount) {
      Alert.alert(t.error, t.pleaseEnterRepaymentAmount);
      return;
    }

    // Check if loan is already fully repaid
    if (selectedLoan.remaining_amount <= 0) {
      Alert.alert(t.error, t.loanAlreadyFullyRepaid);
      return;
    }

    // Check if repayment amount exceeds remaining amount
    if (parseFloat(repaymentData.amount) > selectedLoan.remaining_amount) {
      Alert.alert(
        "Error",
        `Repayment amount cannot exceed remaining amount ($${selectedLoan.remaining_amount.toFixed(2)})`
      );
      return;
    }

    try {
      const newRepayment = await createRepayment({
        loan_id: selectedLoan.id,
        amount: parseFloat(repaymentData.amount),
        payment_date: repaymentData.payment_date,
      });

      setRepayments([newRepayment, ...repayments]);

      // Reset repayment form
      setRepaymentData({
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
      });

      // Refresh data to get updated remaining amount and account balances
      await loadData();
      refreshAccounts();
      Alert.alert(t.success, t.repaymentAdded);
    } catch (error: any) {
      console.error("Error adding repayment:", error);
      Alert.alert(t.error, error.message || t.repaymentSaveError);
    }
  };

  const handleViewRepayments = async (loan: PersonalLoan) => {
    setSelectedLoan(loan);
    setSelectedRepaymentDate(new Date());
    try {
      const repaymentsData = await getLoanRepayments(loan.id);
      setRepayments(repaymentsData);
      setShowRepaymentModal(true);
    } catch (error) {
      console.error("Error loading repayments:", error);
      Alert.alert(t.error, t.failedToLoadRepayments);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "loan_taken",
      party_name: "",
      principal_amount: "",
      interest_rate: "",
      due_date: "",
      account_id: "",
    });
    setSelectedDate(new Date());
  };

  const openEditModal = (loan: PersonalLoan) => {
    setSelectedLoan(loan);
    setFormData({
      type: loan.type,
      party_name: loan.party_name,
      principal_amount: loan.principal_amount.toString(),
      interest_rate: loan.interest_rate?.toString() || "",
      due_date: loan.due_date || "",
      account_id: loan.account_id || "",
    });
    setSelectedDate(loan.due_date ? new Date(loan.due_date) : new Date());
    setShowEditModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#10b981"; // Green
      case "partial":
        return "#f59e0b"; // Yellow
      case "settled":
        return "#3b82f6"; // Blue
      default:
        return "#6b7280"; // Gray
    }
  };

  const getTypeColor = (type: string) => {
    return type === "loan_given" ? "#3b82f6" : "#ef4444"; // Blue for given, Red for taken
  };

  const formatCurrencyText = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Helper functions for balance checking
  const getSelectedAccount = () => {
    return accounts.find((acc) => acc.id === formData.account_id);
  };

  const checkInsufficientBalance = () => {
    if (
      formData.type !== "loan_given" ||
      !formData.account_id ||
      !formData.principal_amount
    ) {
      return false;
    }

    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) return false;

    const loanAmount = parseFloat(formData.principal_amount);
    if (isNaN(loanAmount) || loanAmount <= 0) return false;

    return selectedAccount.amount < loanAmount;
  };

  const checkInsufficientBalanceForEdit = () => {
    if (
      formData.type !== "loan_given" ||
      !formData.account_id ||
      !formData.principal_amount ||
      !selectedLoan
    ) {
      return false;
    }

    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) return false;

    const loanAmount = parseFloat(formData.principal_amount);
    if (isNaN(loanAmount) || loanAmount <= 0) return false;

    // For editing, consider the current loan amount that will be refunded
    const currentLoanAmount = selectedLoan.principal_amount;
    const effectiveBalance = selectedAccount.amount + currentLoanAmount;

    return effectiveBalance < loanAmount;
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
      >
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg" style={{ color: theme.textSecondary }}>
            {t.loadingLoans}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Loans & Debt */}
        <View className="px-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text
              className="font-bold text-xl mb-4"
              style={{ color: theme.text }}
            >
              {t.debtLoan}
            </Text>
            <TouchableOpacity
              className="bg-blue-500 rounded-lg py-3 px-4 items-center flex-row"
              onPress={() => {
                if (accounts.length === 0) {
                  Alert.alert(t.noAccountsForLoan, t.createAccountFirstForLoan);
                  return;
                }
                setShowAddModal(true);
              }}
            >
              <Text className="text-white font-medium">{t.addLoan}</Text>
            </TouchableOpacity>
          </View>

          {/* Summary Cards */}
          <View
            className="mb-6 rounded-xl p-4"
            style={{ backgroundColor: theme.cardBackground }}
          >
            <View className="flex-row justify-between">
              <View className="flex-1 items-center">
                <Text
                  className="text-sm"
                  style={{ color: theme.textSecondary }}
                >
                  {t.totalLoans}
                </Text>
                <Text className="font-bold text-lg text-blue-600">
                  {formatCurrencyText(
                    loans
                      .filter((loan) => loan.type === "loan_given")
                      .reduce((sum, loan) => sum + loan.remaining_amount, 0)
                  )}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text
                  className="text-sm"
                  style={{ color: theme.textSecondary }}
                >
                  {t.totalDebts}
                </Text>
                <Text className="font-bold text-lg text-red-600">
                  {formatCurrencyText(
                    loans
                      .filter((loan) => loan.type === "loan_taken")
                      .reduce((sum, loan) => sum + loan.remaining_amount, 0)
                  )}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text
                  className="text-sm"
                  style={{ color: theme.textSecondary }}
                >
                  {t.availableAccounts}
                </Text>
                <Text className="font-bold text-lg text-green-600">
                  {accounts.length}
                </Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>
                  {accounts.length === 0
                    ? t.createAccountsFirst
                    : t.readyForLoans}
                </Text>
              </View>
            </View>

            {/* Account Balance Impact Summary */}
            {accounts.length > 0 && (
              <View
                className="mt-4 pt-4 border-t"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-sm font-medium mb-2 text-center"
                  style={{ color: theme.textSecondary }}
                >
                  {t.accountBalanceImpact}
                </Text>
                <View className="flex-row justify-between">
                  <View className="flex-1 items-center">
                    <Text
                      className="text-xs"
                      style={{ color: theme.textSecondary }}
                    >
                      {t.moneyInAccounts}
                    </Text>
                    <Text className="font-bold text-sm text-green-600">
                      {formatCurrencyText(
                        accounts.reduce(
                          (sum, acc) => sum + (acc.amount || 0),
                          0
                        )
                      )}
                    </Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text
                      className="text-xs"
                      style={{ color: theme.textSecondary }}
                    >
                      {t.netLoanImpact}
                    </Text>
                    <Text
                      className={`font-bold text-sm ${
                        loans.reduce((sum, loan) => {
                          if (loan.type === "loan_taken") {
                            return sum + loan.remaining_amount; // Money in from debt
                          } else {
                            return sum - loan.remaining_amount; // Money out from given loans
                          }
                        }, 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrencyText(
                        loans.reduce((sum, loan) => {
                          if (loan.type === "loan_taken") {
                            return sum + loan.remaining_amount; // Money in from debt
                          } else {
                            return sum - loan.remaining_amount; // Money out from given loans
                          }
                        }, 0)
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* My Loans */}
          <View
            className="mb-6 rounded-xl p-4"
            style={{ backgroundColor: theme.cardBackground }}
          >
            <View className="flex-row justify-between items-center">
              <Text className="font-bold text-xl" style={{ color: theme.text }}>
                {t.myLoans}
              </Text>
            </View>

            {loans.length === 0 ? (
              <View className="py-8 items-center">
                <Text style={{ color: theme.textSecondary }}>
                  {t.noLoansYet}
                </Text>
                <Text
                  className="text-sm mt-2"
                  style={{ color: theme.textMuted }}
                >
                  {t.addFirstLoan}
                </Text>
              </View>
            ) : (
              <View className="mt-4">
                {loans.map((loan) => (
                  <View
                    key={loan.id}
                    className="mb-4 p-4 rounded-xl border"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    }}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text
                          className="font-bold text-sm"
                          style={{ color: theme.text }}
                        >
                          {loan.party_name}
                        </Text>
                        <View className="flex-row items-center space-x-2 mt-1">
                          <Text
                            className="text-xs font-medium"
                            style={{ color: getTypeColor(loan.type) }}
                          >
                            {loan.type === "loan_given"
                              ? t.loanGiven
                              : t.loanTaken}
                          </Text>
                          <Text style={{ color: theme.textMuted }}>•</Text>
                          <Text
                            className="text-xs font-medium"
                            style={{ color: getStatusColor(loan.status) }}
                          >
                            {t[loan.status] ||
                              loan.status.charAt(0).toUpperCase() +
                                loan.status.slice(1)}
                          </Text>
                        </View>
                        {loan.account_id && (
                          <View className="mt-2">
                            <Text
                              className="text-xs"
                              style={{ color: theme.textMuted }}
                            >
                              Account:{" "}
                              {accounts.find(
                                (acc) => acc.id === loan.account_id
                              )?.name || "Unknown Account"}
                            </Text>
                            <Text
                              className="text-xs"
                              style={{ color: theme.textMuted }}
                            >
                              Balance:{" "}
                              {formatCurrencyText(
                                accounts.find(
                                  (acc) => acc.id === loan.account_id
                                )?.amount || 0
                              )}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-row space-x-2">
                        <TouchableOpacity
                          onPress={() => handleViewRepayments(loan)}
                          className="p-2 bg-blue-100 rounded-lg mr-2"
                        >
                          <Text className="text-blue-600 font-medium text-xs">
                            {t.repayments}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openEditModal(loan)}
                          className="p-2 bg-blue-100 rounded-lg mr-2"
                        >
                          <Text className="text-blue-600 font-medium text-xs">
                            {t.Edit}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteLoan(loan)}
                          className="p-2 bg-red-100 rounded-lg mr-2"
                        >
                          <Text className="text-red-600 font-medium text-xs">
                            {t.delete}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <View className="flex-row justify-between mb-1">
                          <Text
                            className="text-sm"
                            style={{ color: theme.textSecondary }}
                          >
                            {t.Principal}
                          </Text>
                          <Text
                            className="font-medium"
                            style={{ color: theme.text }}
                          >
                            {formatCurrencyText(loan.principal_amount)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                          <Text
                            className="text-sm"
                            style={{ color: theme.textSecondary }}
                          >
                            {t.remaining}
                          </Text>
                          <Text
                            className="font-medium"
                            style={{ color: theme.text }}
                          >
                            {formatCurrencyText(loan.remaining_amount)}
                          </Text>
                        </View>
                        {loan.interest_rate && (
                          <View className="flex-row justify-between mb-1">
                            <Text
                              className="text-sm"
                              style={{ color: theme.textSecondary }}
                            >
                              {t.interest}
                            </Text>
                            <Text
                              className="font-medium"
                              style={{ color: theme.text }}
                            >
                              {loan.interest_rate}%
                            </Text>
                          </View>
                        )}
                        {loan.due_date && (
                          <View className="flex-row justify-between mb-1">
                            <Text
                              className="text-sm"
                              style={{ color: theme.textSecondary }}
                            >
                              {t.dueDate}
                            </Text>
                            <Text
                              className="font-medium"
                              style={{ color: theme.text }}
                            >
                              {formatDate(loan.due_date)}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="items-end ml-2">
                        <View className="flex-row items-center mb-1">
                          <Text
                            className="font-bold text-lg ml-1"
                            style={{ color: getTypeColor(loan.type) }}
                          >
                            {formatCurrencyText(loan.remaining_amount)}
                          </Text>
                        </View>
                        <Text
                          className="text-sm"
                          style={{ color: getTypeColor(loan.type) }}
                        >
                          {loan.principal_amount > 0
                            ? (
                                (loan.remaining_amount /
                                  loan.principal_amount) *
                                100
                              ).toFixed(1)
                            : "0.0"}
                          % {t.remaining}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Add Loan Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View
              className="w-11/12 rounded-xl p-6 max-h-[90%]"
              style={{ backgroundColor: theme.cardBackground }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-4">
                  <Text
                    className="font-bold text-lg"
                    style={{ color: theme.text }}
                  >
                    {t.addLoan}
                  </Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Text
                      className="text-xl"
                      style={{ color: theme.textSecondary }}
                    >
                      X
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.loanType}
                  </Text>
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      className={`flex-1 p-3 rounded-lg border ${
                        formData.type === "loan_taken"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300"
                      }`}
                      onPress={() =>
                        setFormData({ ...formData, type: "loan_taken" })
                      }
                    >
                      <Text
                        className="text-center"
                        style={{
                          color:
                            formData.type === "loan_taken"
                              ? "#1d4ed8"
                              : theme.textSecondary,
                        }}
                      >
                        {t.loanTaken}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-1 p-3 rounded-lg border ${
                        formData.type === "loan_given"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300"
                      }`}
                      onPress={() =>
                        setFormData({ ...formData, type: "loan_given" })
                      }
                    >
                      <Text
                        className="text-center"
                        style={{
                          color:
                            formData.type === "loan_given"
                              ? "#1d4ed8"
                              : theme.textSecondary,
                        }}
                      >
                        {t.loanGiven}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.partyName} *
                  </Text>
                  <TextInput
                    className="border rounded-lg p-3"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                    placeholder={t.enterPartyName}
                    placeholderTextColor={theme.placeholder}
                    value={formData.party_name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, party_name: text })
                    }
                  />
                </View>

                <View className="mb-4">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.principalAmount} *
                  </Text>
                  <TextInput
                    className="border rounded-lg p-3"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                    placeholder={t.enterAmount}
                    placeholderTextColor={theme.placeholder}
                    value={formData.principal_amount}
                    onChangeText={(text) =>
                      setFormData({ ...formData, principal_amount: text })
                    }
                    keyboardType="numeric"
                  />

                  {/* Balance warning for loan_given */}
                  {showEditModal
                    ? checkInsufficientBalanceForEdit() && (
                        <View className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <Text className="text-red-800 font-medium text-sm">
                            {t.insufficientBalanceForEdit}:
                          </Text>
                          <Text className="text-red-600 text-sm mt-1">
                            {t.effectiveBalance}:{" "}
                            {formatCurrencyText(
                              (getSelectedAccount()?.amount || 0) +
                                (selectedLoan?.principal_amount || 0)
                            )}
                          </Text>
                          <Text className="text-red-600 text-sm">
                            {t.newLoanAmount}:{" "}
                            {formatCurrencyText(
                              parseFloat(formData.principal_amount) || 0
                            )}
                          </Text>
                          <Text className="text-red-600 text-sm">
                            {t.shortfall}:{" "}
                            {formatCurrencyText(
                              (parseFloat(formData.principal_amount) || 0) -
                                (getSelectedAccount()?.amount || 0)
                            )}
                          </Text>
                        </View>
                      )
                    : checkInsufficientBalance() && (
                        <View className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <Text className="text-red-800 font-medium text-sm">
                            {t.insufficientBalance}
                          </Text>
                          <Text className="text-red-600 text-sm mt-1">
                            {Text.AccountBalance}:{" "}
                            {formatCurrencyText(
                              getSelectedAccount()?.amount || 0
                            )}
                          </Text>
                          <Text className="text-red-600 text-sm">
                            {t.LoanAmount}:{" "}
                            {formatCurrencyText(
                              parseFloat(formData.principal_amount) || 0
                            )}
                          </Text>
                          <Text className="text-red-600 text-sm">
                            {t.shortfall}:{" "}
                            {formatCurrencyText(
                              (parseFloat(formData.principal_amount) || 0) -
                                (getSelectedAccount()?.amount || 0)
                            )}
                          </Text>
                        </View>
                      )}
                </View>

                <View className="mb-4">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.interestRate} (%)
                  </Text>
                  <TextInput
                    className="border rounded-lg p-3"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                    placeholder={t.enterInterestRate}
                    placeholderTextColor={theme.placeholder}
                    value={formData.interest_rate}
                    onChangeText={(text) =>
                      setFormData({ ...formData, interest_rate: text })
                    }
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-4">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.dueDate}
                  </Text>
                  <TouchableOpacity
                    className="border rounded-lg p-3"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    }}
                    onPress={showDatepicker}
                  >
                    <Text style={{ color: theme.text }}>
                      {formData.due_date
                        ? new Date(formData.due_date).toLocaleString()
                        : "Select date "}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                </View>

                <View className="mb-6">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.account} *
                  </Text>
                  <TouchableOpacity
                    className={`border rounded-lg p-3 flex-row justify-between items-center ${
                      formData.account_id ? "border-gray-300" : "border-red-300"
                    }`}
                    style={{
                      backgroundColor: theme.background,
                      borderColor: formData.account_id
                        ? theme.border
                        : "#ef4444",
                    }}
                    onPress={() => {
                      if (accounts.length === 0) {
                        Alert.alert(
                          "No Accounts",
                          "Please create an account first before adding loans."
                        );
                        return;
                      }
                      // Show account selection dropdown
                      setShowAccountDropdown(!showAccountDropdown);
                    }}
                  >
                    <Text
                      style={{
                        color: formData.account_id
                          ? theme.text
                          : theme.textSecondary,
                      }}
                    >
                      {formData.account_id
                        ? accounts.find((acc) => acc.id === formData.account_id)
                            ?.name
                        : `${t.selectAccount} *`}
                    </Text>
                    <Text style={{ color: theme.textMuted }}>V</Text>
                  </TouchableOpacity>

                  {!formData.account_id && (
                    <Text
                      className="text-sm mt-1"
                      style={{ color: theme.textSecondary }}
                    >
                      {t.selectAccount} {t.isRequired}
                    </Text>
                  )}

                  {showAccountDropdown && (
                    <View
                      className="mt-2 border rounded-lg max-h-40"
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderColor: theme.border,
                      }}
                    >
                      <ScrollView>
                        {accounts.map((account) => (
                          <TouchableOpacity
                            key={account.id}
                            className={`p-3 border-b ${
                              formData.account_id === account.id
                                ? "bg-blue-50"
                                : ""
                            }`}
                            style={{ borderColor: theme.border }}
                            onPress={() => {
                              setFormData({
                                ...formData,
                                account_id: account.id,
                              });
                              setShowAccountDropdown(false);
                            }}
                          >
                            <Text
                              className="font-medium"
                              style={{ color: theme.text }}
                            >
                              {account.name}
                            </Text>
                            <Text
                              className="text-sm"
                              style={{ color: theme.textSecondary }}
                            >
                              {account.account_type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  className={`py-3 rounded-lg items-center ${
                    checkInsufficientBalance() ? "bg-gray-300" : "bg-blue-500"
                  }`}
                  onPress={handleAddLoan}
                  disabled={checkInsufficientBalance()}
                >
                  <Text
                    className={`font-medium ${
                      checkInsufficientBalance()
                        ? "text-gray-500"
                        : "text-white"
                    }`}
                  >
                    {checkInsufficientBalance()
                      ? t.insufficientBalance
                      : t.addLoan}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Edit Loan Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowEditModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View
              className="w-11/12 rounded-xl p-6 max-h-[90%]"
              style={{ backgroundColor: theme.cardBackground }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-4">
                  <Text
                    className="font-bold text-lg"
                    style={{ color: theme.text }}
                  >
                    {t.editLoan}
                  </Text>
                  <TouchableOpacity onPress={() => setShowEditModal(false)}>
                    <Text
                      className="text-xl"
                      style={{ color: theme.textSecondary }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.loanType}
                  </Text>
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      className={`flex-1 p-3 rounded-lg border ${
                        formData.type === "loan_taken"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300"
                      }`}
                      onPress={() =>
                        setFormData({ ...formData, type: "loan_taken" })
                      }
                    >
                      <Text
                        className="text-center"
                        style={{
                          color:
                            formData.type === "loan_taken"
                              ? "#1d4ed8"
                              : theme.textSecondary,
                        }}
                      >
                        {t.loanTaken}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-1 p-3 rounded-lg border ${
                        formData.type === "loan_given"
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300"
                      }`}
                      onPress={() =>
                        setFormData({ ...formData, type: "loan_given" })
                      }
                    >
                      <Text
                        className="text-center"
                        style={{
                          color:
                            formData.type === "loan_given"
                              ? "#1d4ed8"
                              : theme.textSecondary,
                        }}
                      >
                        {t.loanGiven}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.partyName} *
                  </Text>
                  <TextInput
                    className="border rounded-lg p-3"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                    placeholder={t.enterPartyName}
                    placeholderTextColor={theme.placeholder}
                    value={formData.party_name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, party_name: text })
                    }
                  />
                </View>

                <View className="mb-4">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    Principal Amount ($) *
                  </Text>
                  <TextInput
                    className="border rounded-lg p-3"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.placeholder}
                    value={formData.principal_amount}
                    onChangeText={(text) =>
                      setFormData({ ...formData, principal_amount: text })
                    }
                    keyboardType="numeric"
                  />

                  {/* Balance warning for loan_given */}
                  {showEditModal
                    ? checkInsufficientBalanceForEdit() && (
                        <View className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <Text className="text-red-800 font-medium text-sm">
                            Insufficient Balance for Edit
                          </Text>
                          <Text className="text-red-600 text-sm mt-1">
                            Effective Balance:{" "}
                            {formatCurrencyText(
                              (getSelectedAccount()?.amount || 0) +
                                (selectedLoan?.principal_amount || 0)
                            )}
                          </Text>
                          <Text className="text-gray-500 text-xs">
                            (Current balance + current loan amount being
                            refunded)
                          </Text>
                          <Text className="text-red-600 text-sm">
                            New Loan Amount:{" "}
                            {formatCurrencyText(
                              parseFloat(formData.principal_amount) || 0
                            )}
                          </Text>
                          <Text className="text-red-600 text-sm">
                            Shortfall:{" "}
                            {formatCurrencyText(
                              (parseFloat(formData.principal_amount) || 0) -
                                ((getSelectedAccount()?.amount || 0) +
                                  (selectedLoan?.principal_amount || 0))
                            )}
                          </Text>
                        </View>
                      )
                    : checkInsufficientBalance() && (
                        <View className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <Text className="text-red-800 font-medium text-sm">
                            Insufficient Balance
                          </Text>
                          <Text className="text-red-600 text-sm mt-1">
                            Account Balance:{" "}
                            {formatCurrencyText(
                              getSelectedAccount()?.amount || 0
                            )}
                          </Text>
                          <Text className="text-red-600 text-sm">
                            Loan Amount:{" "}
                            {formatCurrencyText(
                              parseFloat(formData.principal_amount) || 0
                            )}
                          </Text>
                          <Text className="text-red-600 text-sm">
                            Shortfall:{" "}
                            {formatCurrencyText(
                              (parseFloat(formData.principal_amount) || 0) -
                                (getSelectedAccount()?.amount || 0)
                            )}
                          </Text>
                        </View>
                      )}
                </View>

                <View className="mb-4">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.interestRate} (%)
                  </Text>
                  <TextInput
                    className="border rounded-lg p-3"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.placeholder}
                    value={formData.interest_rate}
                    onChangeText={(text) =>
                      setFormData({ ...formData, interest_rate: text })
                    }
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-4">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.dueDate}
                  </Text>
                  <TouchableOpacity
                    className="border rounded-lg p-3"
                    style={{
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    }}
                    onPress={showDatepicker}
                  >
                    <Text style={{ color: theme.text }}>
                      {formData.due_date
                        ? new Date(formData.due_date).toLocaleString()
                        : "Select date "}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                </View>

                <View className="mb-6">
                  <Text className="mb-1" style={{ color: theme.text }}>
                    {t.account}
                  </Text>
                  <TouchableOpacity
                    className={`border rounded-lg p-3 flex-row justify-between items-center ${
                      formData.account_id ? "border-gray-300" : "border-red-300"
                    }`}
                    style={{
                      backgroundColor: theme.background,
                      borderColor: formData.account_id
                        ? theme.border
                        : "#ef4444",
                    }}
                    onPress={() => {
                      if (accounts.length === 0) {
                        Alert.alert(
                          "No Accounts",
                          "Please create an account first before adding loans."
                        );
                        return;
                      }
                      // Show account selection dropdown
                      setShowAccountDropdown(!showAccountDropdown);
                    }}
                  >
                    <Text
                      style={{
                        color: formData.account_id
                          ? theme.text
                          : theme.textSecondary,
                      }}
                    >
                      {formData.account_id
                        ? accounts.find((acc) => acc.id === formData.account_id)
                            ?.name
                        : "Select an account *"}
                    </Text>
                    <ChevronDown size={20} color="gray" />
                  </TouchableOpacity>

                  {!formData.account_id && (
                    <Text
                      className="text-sm mt-1"
                      style={{ color: theme.textSecondary }}
                    >
                      Account selection is required
                    </Text>
                  )}

                  {showAccountDropdown && (
                    <View
                      className="mt-2 border rounded-lg max-h-40"
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderColor: theme.border,
                      }}
                    >
                      <ScrollView>
                        {accounts.map((account) => (
                          <TouchableOpacity
                            key={account.id}
                            className={`p-3 border-b ${
                              formData.account_id === account.id
                                ? "bg-blue-50"
                                : ""
                            }`}
                            style={{ borderColor: theme.border }}
                            onPress={() => {
                              setFormData({
                                ...formData,
                                account_id: account.id,
                              });
                              setShowAccountDropdown(false);
                            }}
                          >
                            <Text
                              className="font-medium"
                              style={{ color: theme.text }}
                            >
                              {account.name}
                            </Text>
                            <Text
                              className="text-sm"
                              style={{ color: theme.textSecondary }}
                            >
                              {account.account_type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  className={`py-3 rounded-lg items-center ${
                    checkInsufficientBalanceForEdit()
                      ? "bg-gray-300"
                      : "bg-blue-500"
                  }`}
                  onPress={handleEditLoan}
                  disabled={checkInsufficientBalanceForEdit()}
                >
                  <Text
                    className={`font-medium ${
                      checkInsufficientBalanceForEdit()
                        ? "text-gray-500"
                        : "text-white"
                    }`}
                  >
                    {checkInsufficientBalanceForEdit()
                      ? t.insufficientBalance
                      : t.updateLoan}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Repayments Modal */}
        <Modal
          visible={showRepaymentModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRepaymentModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View
              className="w-11/12 rounded-xl p-6 max-h-[90%]"
              style={{ backgroundColor: theme.cardBackground }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className="font-bold text-lg"
                  style={{ color: theme.text }}
                >
                  {t.repayments} - {selectedLoan?.party_name}
                </Text>
                <TouchableOpacity onPress={() => setShowRepaymentModal(false)}>
                  <Text
                    className="text-xl"
                    style={{ color: theme.textSecondary }}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Add Repayment Form */}
                <View
                  className="mb-6 rounded-xl p-4"
                  style={{ backgroundColor: theme.background }}
                >
                  <Text
                    className="font-bold text-lg mb-4"
                    style={{ color: theme.text }}
                  >
                    {t.addRepayment}
                  </Text>

                  {/* Show remaining amount and status */}
                  <View
                    className="mb-4 p-3 rounded-lg border"
                    style={{
                      backgroundColor: theme.cardBackground,
                      borderColor: theme.border,
                    }}
                  >
                    <View className="flex-row justify-between items-center mb-2">
                      <Text
                        className="text-gray-600"
                        style={{ color: theme.textSecondary }}
                      >
                        {t.remainingAmount}:
                      </Text>
                      <Text className="font-bold text-lg">
                        {formatCurrencyText(
                          selectedLoan?.remaining_amount || 0
                        )}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text
                        className="text-gray-600"
                        style={{ color: theme.textSecondary }}
                      >
                        {t.status}:
                      </Text>
                      <Text
                        className="font-medium"
                        style={{
                          color: getStatusColor(
                            selectedLoan?.status || "active"
                          ),
                        }}
                      >
                        {selectedLoan?.status === "active"
                          ? t.active
                          : selectedLoan?.status === "partial"
                            ? t.partial
                            : selectedLoan?.status === "settled"
                              ? t.settled
                              : t.active}
                      </Text>
                    </View>
                  </View>

                  {selectedLoan && selectedLoan.remaining_amount <= 0 ? (
                    <View className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Text className="text-green-800 text-center font-medium">
                        {t.loanAlreadyFullyRepaid}
                      </Text>
                    </View>
                  ) : (
                    <View className="space-y-4">
                      <View>
                        <Text className="mb-1" style={{ color: theme.text }}>
                          {t.repaymentAmount} ($)
                        </Text>
                        <TextInput
                          className="border rounded-lg p-3"
                          style={{
                            backgroundColor: theme.cardBackground,
                            borderColor: theme.border,
                            color: theme.text,
                          }}
                          placeholder={`Max: ${formatCurrencyText(selectedLoan?.remaining_amount || 0)}`}
                          placeholderTextColor={theme.placeholder}
                          value={repaymentData.amount}
                          onChangeText={(text) =>
                            setRepaymentData({ ...repaymentData, amount: text })
                          }
                          keyboardType="numeric"
                        />
                        {repaymentData.amount &&
                          parseFloat(repaymentData.amount) >
                            (selectedLoan?.remaining_amount || 0) && (
                            <Text
                              className="text-sm mt-1"
                              style={{ color: theme.textSecondary }}
                            >
                              Amount cannot exceed remaining balance
                            </Text>
                          )}
                      </View>
                      <View>
                        <Text className="mb-1" style={{ color: theme.text }}>
                          {t.paymentDate}
                        </Text>
                        <TouchableOpacity
                          className="border rounded-lg p-3"
                          style={{
                            backgroundColor: theme.cardBackground,
                            borderColor: theme.border,
                          }}
                          onPress={showRepaymentDatepicker}
                        >
                          <Text style={{ color: theme.text }}>
                            {repaymentData.payment_date || t.selectPaymentDate}
                          </Text>
                        </TouchableOpacity>
                        {showRepaymentDatePicker && (
                          <DateTimePicker
                            value={selectedRepaymentDate}
                            mode="date"
                            display="default"
                            onChange={handleRepaymentDateChange}
                          />
                        )}
                      </View>
                      <TouchableOpacity
                        className={`py-3 rounded-lg items-center ${
                          !repaymentData.amount ||
                          parseFloat(repaymentData.amount) <= 0 ||
                          parseFloat(repaymentData.amount) >
                            (selectedLoan?.remaining_amount || 0)
                            ? "bg-gray-300"
                            : "bg-blue-500"
                        }`}
                        onPress={handleAddRepayment}
                        disabled={
                          !repaymentData.amount ||
                          parseFloat(repaymentData.amount) <= 0 ||
                          parseFloat(repaymentData.amount) >
                            (selectedLoan?.remaining_amount || 0)
                        }
                      >
                        <Text
                          className={`font-medium ${
                            !repaymentData.amount ||
                            parseFloat(repaymentData.amount) <= 0 ||
                            parseFloat(repaymentData.amount) >
                              (selectedLoan?.remaining_amount || 0)
                              ? "text-gray-500"
                              : "text-white"
                          }`}
                        >
                          {t.addRepayment}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Repayments List */}
                <View
                  className="rounded-xl p-4"
                  style={{ backgroundColor: theme.background }}
                >
                  <Text
                    className="font-bold text-lg mb-4"
                    style={{ color: theme.text }}
                  >
                    {t.paymentHistory}
                  </Text>

                  {/* Summary of repayments */}
                  {selectedLoan && (
                    <View
                      className="mb-4 p-3 rounded-lg border"
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderColor: theme.border,
                      }}
                    >
                      <View className="flex-row justify-between items-center mb-2">
                        <Text
                          className="text-gray-600"
                          style={{ color: theme.textSecondary }}
                        >
                          {t.totalRepaid}:
                        </Text>
                        <Text className="font-bold text-lg text-green-600">
                          {formatCurrencyText(
                            selectedLoan.principal_amount -
                              selectedLoan.remaining_amount
                          )}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text
                          className="text-gray-600"
                          style={{ color: theme.textSecondary }}
                        >
                          {t.principalAmount}:
                        </Text>
                        <Text
                          className="font-medium"
                          style={{ color: theme.text }}
                        >
                          {formatCurrencyText(selectedLoan.principal_amount)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text
                          className="text-gray-600"
                          style={{ color: theme.textSecondary }}
                        >
                          {t.remainingAmount}:
                        </Text>
                        <Text
                          className={`font-bold ${
                            selectedLoan.remaining_amount <= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrencyText(selectedLoan.remaining_amount)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {repayments.length === 0 ? (
                    <Text
                      className="text-center py-4"
                      style={{ color: theme.textSecondary }}
                    >
                      {t.noRepaymentsYet}
                    </Text>
                  ) : (
                    repayments.map((repayment) => (
                      <View
                        key={repayment.id}
                        className="flex-row justify-between items-center py-3 border-b"
                        style={{ borderColor: theme.border }}
                      >
                        <View>
                          <Text
                            className="font-medium"
                            style={{ color: theme.text }}
                          >
                            {formatCurrencyText(repayment.amount)}
                          </Text>
                          <Text
                            className="text-sm"
                            style={{ color: theme.textSecondary }}
                          >
                            {formatDate(repayment.payment_date)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          className="p-2 bg-red-100 rounded-lg"
                          onPress={async () => {
                            try {
                              await deleteRepayment(repayment.id);
                              setRepayments(
                                repayments.filter((r) => r.id !== repayment.id)
                              );
                              await loadData(); // Refresh loans

                              // Refresh AccountContext to update all components using account balances
                              await refreshAccounts();

                              Alert.alert(
                                "Success",
                                "Repayment deleted successfully"
                              );
                            } catch (error) {
                              console.error("Error deleting repayment:", error);
                              Alert.alert(
                                "Error",
                                "Failed to delete repayment"
                              );
                            }
                          }}
                        >
                          <Text className="text-red-600 font-medium text-xs">
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Debt_Loan;
