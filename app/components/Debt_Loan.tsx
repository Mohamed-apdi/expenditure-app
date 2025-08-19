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
import { PersonalLoan, LoanRepayment, Account } from "~/lib/types";
import {
  getUserLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  getLoanRepayments,
  createRepayment,
  deleteRepayment,
} from "~/lib/loans";
import { fetchAccounts } from "~/lib/accounts";
import { supabase } from "~/lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAccount } from "~/lib/AccountContext";

const Debt_Loan = () => {
  const { refreshAccounts } = useAccount();
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
      Alert.alert("Error", "Failed to load data");
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
      Alert.alert(
        "Error",
        "Please fill in all required fields including account selection"
      );
      return;
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

      Alert.alert("Success", "Loan created successfully");
    } catch (error) {
      console.error("Error creating loan:", error);
      Alert.alert("Error", "Failed to create loan");
    }
  };

  const handleEditLoan = async () => {
    if (
      !selectedLoan ||
      !formData.party_name ||
      !formData.principal_amount ||
      !formData.account_id
    ) {
      Alert.alert(
        "Error",
        "Please fill in all required fields including account selection"
      );
      return;
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

      Alert.alert("Success", "Loan updated successfully");
    } catch (error) {
      console.error("Error updating loan:", error);
      Alert.alert("Error", "Failed to update loan");
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

              Alert.alert("Success", "Loan deleted successfully");
            } catch (error) {
              console.error("Error deleting loan:", error);
              Alert.alert("Error", "Failed to delete loan");
            }
          },
        },
      ]
    );
  };

  const handleAddRepayment = async () => {
    if (!selectedLoan || !repaymentData.amount) {
      Alert.alert("Error", "Please enter repayment amount");
      return;
    }

    // Check if loan is already fully repaid
    if (selectedLoan.remaining_amount <= 0) {
      Alert.alert("Error", "This loan is already fully repaid");
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
      Alert.alert("Success", "Repayment added successfully");
    } catch (error: any) {
      console.error("Error adding repayment:", error);
      Alert.alert("Error", error.message || "Failed to add repayment");
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
      Alert.alert("Error", "Failed to load repayments");
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

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500 text-lg">Loading loans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Loans & Debt */}
        <View className="px-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-xl mb-4">Loans & Debt</Text>
            <TouchableOpacity
              className="bg-blue-500 rounded-lg py-3 px-4 items-center flex-row"
              onPress={() => {
                if (accounts.length === 0) {
                  Alert.alert(
                    "No Accounts",
                    "Please create an account first before adding loans. You can create accounts in the Accounts section."
                  );
                  return;
                }
                setShowAddModal(true);
              }}
            >
              <Text className="text-white font-medium">Add Loan</Text>
            </TouchableOpacity>
          </View>

          {/* Summary Cards */}
          <View className="mb-6 bg-white rounded-xl p-4">
            <View className="flex-row justify-between">
              <View className="flex-1 items-center">
                <Text className="text-gray-500 text-sm">Total Loans Given</Text>
                <Text className="font-bold text-lg text-blue-600">
                  {formatCurrency(
                    loans
                      .filter((loan) => loan.type === "loan_given")
                      .reduce((sum, loan) => sum + loan.remaining_amount, 0)
                  )}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-gray-500 text-sm">Total Debt</Text>
                <Text className="font-bold text-lg text-red-600">
                  {formatCurrency(
                    loans
                      .filter((loan) => loan.type === "loan_taken")
                      .reduce((sum, loan) => sum + loan.remaining_amount, 0)
                  )}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-gray-500 text-sm">
                  Available Accounts
                </Text>
                <Text className="font-bold text-lg text-green-600">
                  {accounts.length}
                </Text>
                <Text className="text-xs text-gray-400">
                  {accounts.length === 0
                    ? "Create accounts first"
                    : "Ready for loans"}
                </Text>
              </View>
            </View>

            {/* Account Balance Impact Summary */}
            {accounts.length > 0 && (
              <View className="mt-4 pt-4 border-t border-gray-200">
                <Text className="text-gray-600 text-sm font-medium mb-2 text-center">
                  Account Balance Impact
                </Text>
                <View className="flex-row justify-between">
                  <View className="flex-1 items-center">
                    <Text className="text-gray-500 text-xs">
                      Money In Accounts
                    </Text>
                    <Text className="font-bold text-sm text-green-600">
                      {formatCurrency(
                        accounts.reduce(
                          (sum, acc) => sum + (acc.amount || 0),
                          0
                        )
                      )}
                    </Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-gray-500 text-xs">
                      Net Loan Impact
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
                      {formatCurrency(
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

          <View className="mb-6 bg-white rounded-xl p-4">
            <View className="flex-row justify-between items-center">
              <Text className="font-bold text-xl">My Loans</Text>
            </View>

            {loans.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-gray-500">No loans yet</Text>
                <Text className="text-gray-400 text-sm mt-2">
                  Add your first loan to get started
                </Text>
              </View>
            ) : (
              <View className="mt-4">
                {loans.map((loan) => (
                  <View
                    key={loan.id}
                    className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text className="font-bold text-lg">
                          {loan.party_name}
                        </Text>
                        <View className="flex-row items-center space-x-2 mt-1">
                          <Text
                            className="text-sm font-medium"
                            style={{ color: getTypeColor(loan.type) }}
                          >
                            {loan.type === "loan_given"
                              ? "Loan Given"
                              : "Loan Taken"}
                          </Text>
                          <Text className="text-gray-400">•</Text>
                          <Text
                            className="text-sm font-medium"
                            style={{ color: getStatusColor(loan.status) }}
                          >
                            {loan.status.charAt(0).toUpperCase() +
                              loan.status.slice(1)}
                          </Text>
                        </View>
                        {loan.account_id && (
                          <View className="mt-2">
                            <Text className="text-gray-400 text-xs">
                              Account:{" "}
                              {accounts.find(
                                (acc) => acc.id === loan.account_id
                              )?.name || "Unknown Account"}
                            </Text>
                            <Text className="text-gray-400 text-xs">
                              Balance:{" "}
                              {formatCurrency(
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
                          className="p-2 bg-blue-100 rounded-lg"
                        >
                          <Text className="text-blue-600 font-medium text-xs">
                            Repayments
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openEditModal(loan)}
                          className="p-2 bg-blue-100 rounded-lg"
                        >
                          <Text className="text-blue-600 font-medium text-xs">
                            Edit
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteLoan(loan)}
                          className="p-2 bg-red-100 rounded-lg"
                        >
                          <Text className="text-red-600 font-medium text-xs">
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <View className="flex-row justify-between mb-1">
                          <Text className="text-gray-500 text-sm">
                            Principal
                          </Text>
                          <Text className="font-medium">
                            {formatCurrency(loan.principal_amount)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                          <Text className="text-gray-500 text-sm">
                            Remaining
                          </Text>
                          <Text className="font-medium">
                            {formatCurrency(loan.remaining_amount)}
                          </Text>
                        </View>
                        {loan.interest_rate && (
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-gray-500 text-sm">
                              Interest
                            </Text>
                            <Text className="font-medium">
                              {loan.interest_rate}%
                            </Text>
                          </View>
                        )}
                        {loan.due_date && (
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-gray-500 text-sm">
                              Due Date
                            </Text>
                            <Text className="font-medium">
                              {formatDate(loan.due_date)}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="items-end">
                        <View className="flex-row items-center mb-1">
                          <Text
                            className="font-bold text-lg ml-1"
                            style={{ color: getTypeColor(loan.type) }}
                          >
                            {formatCurrency(loan.remaining_amount)}
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
                          % remaining
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
            <View className="w-11/12 bg-white rounded-xl p-6 max-h-[90%]">
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="font-bold text-lg">Add New Loan</Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Text className="text-gray-500 text-xl">✕</Text>
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Loan Type</Text>
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
                        className={`text-center ${formData.type === "loan_taken" ? "text-blue-700" : "text-gray-600"}`}
                      >
                        Loan Taken (Debt)
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
                        className={`text-center ${formData.type === "loan_given" ? "text-blue-700" : "text-gray-600"}`}
                      >
                        Loan Given
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Party Name *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="Person or institution name"
                    value={formData.party_name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, party_name: text })
                    }
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">
                    Principal Amount ($) *
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="0.00"
                    value={formData.principal_amount}
                    onChangeText={(text) =>
                      setFormData({ ...formData, principal_amount: text })
                    }
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Interest Rate (%)</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="0.00"
                    value={formData.interest_rate}
                    onChangeText={(text) =>
                      setFormData({ ...formData, interest_rate: text })
                    }
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Due Date</Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg p-3"
                    onPress={showDatepicker}
                  >
                    <Text className="text-gray-900">
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
                  <Text className="text-gray-700 mb-1">Account *</Text>
                  <TouchableOpacity
                    className={`border rounded-lg p-3 flex-row justify-between items-center ${
                      formData.account_id ? "border-gray-300" : "border-red-300"
                    }`}
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
                      className={
                        formData.account_id ? "text-gray-900" : "text-gray-600"
                      }
                    >
                      {formData.account_id
                        ? accounts.find((acc) => acc.id === formData.account_id)
                            ?.name
                        : "Select an account *"}
                    </Text>
                    <Text className="text-gray-400">▼</Text>
                  </TouchableOpacity>

                  {!formData.account_id && (
                    <Text className="text-gray-600 text-sm mt-1">
                      Account selection is required
                    </Text>
                  )}

                  {showAccountDropdown && (
                    <View className="mt-2 border border-gray-300 rounded-lg bg-white max-h-40">
                      <ScrollView>
                        {accounts.map((account) => (
                          <TouchableOpacity
                            key={account.id}
                            className={`p-3 border-b border-gray-200 ${
                              formData.account_id === account.id
                                ? "bg-blue-50"
                                : ""
                            }`}
                            onPress={() => {
                              setFormData({
                                ...formData,
                                account_id: account.id,
                              });
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

                <TouchableOpacity
                  className="bg-blue-500 py-3 rounded-lg items-center"
                  onPress={handleAddLoan}
                >
                  <Text className="text-white font-medium">Create Loan</Text>
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
            <View className="w-11/12 bg-white rounded-xl p-6 max-h-[90%]">
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="font-bold text-lg">Edit Loan</Text>
                  <TouchableOpacity onPress={() => setShowEditModal(false)}>
                    <Text className="text-gray-500 text-xl">✕</Text>
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Loan Type</Text>
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
                        className={`text-center ${formData.type === "loan_taken" ? "text-blue-700" : "text-gray-600"}`}
                      >
                        Loan Taken (Debt)
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
                        className={`text-center ${formData.type === "loan_given" ? "text-blue-700" : "text-gray-600"}`}
                      >
                        Loan Given
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Party Name *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="Person or institution name"
                    value={formData.party_name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, party_name: text })
                    }
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">
                    Principal Amount ($) *
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="0.00"
                    value={formData.principal_amount}
                    onChangeText={(text) =>
                      setFormData({ ...formData, principal_amount: text })
                    }
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Interest Rate (%)</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3"
                    placeholder="0.00"
                    value={formData.interest_rate}
                    onChangeText={(text) =>
                      setFormData({ ...formData, interest_rate: text })
                    }
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-1">Due Date</Text>
                  <TouchableOpacity
                    className="border border-gray-300 rounded-lg p-3"
                    onPress={showDatepicker}
                  >
                    <Text className="text-gray-900">
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
                  <Text className="text-gray-700 mb-1">Account *</Text>
                  <TouchableOpacity
                    className={`border rounded-lg p-3 flex-row justify-between items-center ${
                      formData.account_id ? "border-gray-300" : "border-red-300"
                    }`}
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
                      className={
                        formData.account_id ? "text-gray-900" : "text-gray-600"
                      }
                    >
                      {formData.account_id
                        ? accounts.find((acc) => acc.id === formData.account_id)
                            ?.name
                        : "Select an account *"}
                    </Text>
                    <Text className="text-gray-400">▼</Text>
                  </TouchableOpacity>

                  {!formData.account_id && (
                    <Text className="text-gray-600 text-sm mt-1">
                      Account selection is required
                    </Text>
                  )}

                  {showAccountDropdown && (
                    <View className="mt-2 border border-gray-300 rounded-lg bg-white max-h-40">
                      <ScrollView>
                        {accounts.map((account) => (
                          <TouchableOpacity
                            key={account.id}
                            className={`p-3 border-b border-gray-200 ${
                              formData.account_id === account.id
                                ? "bg-blue-50"
                                : ""
                            }`}
                            onPress={() => {
                              setFormData({
                                ...formData,
                                account_id: account.id,
                              });
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

                <TouchableOpacity
                  className="bg-blue-500 py-3 rounded-lg items-center"
                  onPress={handleEditLoan}
                >
                  <Text className="text-white font-medium">Update Loan</Text>
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
            <View className="w-11/12 bg-white rounded-xl p-6 max-h-[90%]">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="font-bold text-lg">
                  Repayments - {selectedLoan?.party_name}
                </Text>
                <TouchableOpacity onPress={() => setShowRepaymentModal(false)}>
                  <Text className="text-gray-500 text-xl">✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Add Repayment Form */}
                <View className="mb-6 bg-gray-50 rounded-xl p-4">
                  <Text className="font-bold text-lg mb-4">Add Repayment</Text>

                  {/* Show remaining amount and status */}
                  <View className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-gray-600">Remaining Amount:</Text>
                      <Text className="font-bold text-lg">
                        {formatCurrency(selectedLoan?.remaining_amount || 0)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-gray-600">Status:</Text>
                      <Text
                        className="font-medium"
                        style={{
                          color: getStatusColor(
                            selectedLoan?.status || "active"
                          ),
                        }}
                      >
                        {selectedLoan?.status?.charAt(0).toUpperCase() +
                          selectedLoan?.status?.slice(1) || "Active"}
                      </Text>
                    </View>
                  </View>

                  {selectedLoan && selectedLoan.remaining_amount <= 0 ? (
                    <View className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Text className="text-green-800 text-center font-medium">
                        ✅ This loan is fully repaid!
                      </Text>
                    </View>
                  ) : (
                    <View className="space-y-4">
                      <View>
                        <Text className="text-gray-700 mb-1">Amount ($)</Text>
                        <TextInput
                          className="border border-gray-300 rounded-lg p-3"
                          placeholder={`Max: ${formatCurrency(selectedLoan?.remaining_amount || 0)}`}
                          value={repaymentData.amount}
                          onChangeText={(text) =>
                            setRepaymentData({ ...repaymentData, amount: text })
                          }
                          keyboardType="numeric"
                        />
                        {repaymentData.amount &&
                          parseFloat(repaymentData.amount) >
                            (selectedLoan?.remaining_amount || 0) && (
                            <Text className="text-gray-600 text-sm mt-1">
                              Amount cannot exceed remaining balance
                            </Text>
                          )}
                      </View>
                      <View>
                        <Text className="text-gray-700 mb-1">Payment Date</Text>
                        <TouchableOpacity
                          className="border border-gray-300 rounded-lg p-3"
                          onPress={showRepaymentDatepicker}
                        >
                          <Text className="text-gray-900">
                            {repaymentData.payment_date || "Select date"}
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
                          Add Repayment
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Repayments List */}
                <View className="bg-gray-50 rounded-xl p-4">
                  <Text className="font-bold text-lg mb-4">
                    Payment History
                  </Text>

                  {/* Summary of repayments */}
                  {selectedLoan && (
                    <View className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-gray-600">Total Repaid:</Text>
                        <Text className="font-bold text-lg text-green-600">
                          {formatCurrency(
                            selectedLoan.principal_amount -
                              selectedLoan.remaining_amount
                          )}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-gray-600">Principal Amount:</Text>
                        <Text className="font-medium">
                          {formatCurrency(selectedLoan.principal_amount)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-gray-600">
                          Remaining Balance:
                        </Text>
                        <Text
                          className={`font-bold ${
                            selectedLoan.remaining_amount <= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(selectedLoan.remaining_amount)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {repayments.length === 0 ? (
                    <Text className="text-gray-500 text-center py-4">
                      No repayments yet
                    </Text>
                  ) : (
                    repayments.map((repayment) => (
                      <View
                        key={repayment.id}
                        className="flex-row justify-between items-center py-3 border-b border-gray-200"
                      >
                        <View>
                          <Text className="font-medium">
                            {formatCurrency(repayment.amount)}
                          </Text>
                          <Text className="text-sm text-gray-500">
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
