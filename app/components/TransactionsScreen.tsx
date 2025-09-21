// screens/TransactionsScreen.tsx
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SectionList,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  Filter,
  Search,
  Plus,
  ArrowLeft,
  ArrowRightLeft,
  X,
  Check,
  Calendar,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "~/lib";
import { fetchAllTransactionsAndTransfers } from "~/lib";
import { useAccount } from "~/lib";
import { formatDistanceToNow } from "date-fns";
import { useTheme } from "~/lib";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";

type Transaction = {
  id: string;
  amount: number;
  category?: string;
  description?: string;
  created_at: string;
  date: string;
  type: "expense" | "income" | "transfer";
  account_id: string;
  // Transfer-specific properties
  isTransfer?: boolean;
  transferId?: string;
  from_account_id?: string;
  to_account_id?: string;
  transferDirection?: "from" | "to";
};

type TransactionSection = {
  title: string;
  data: Transaction[];
};

export default function TransactionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { selectedAccount } = useAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [transactions, setTransactions] = useState<TransactionSection[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Date range filter states
  const getDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      startDate: thirtyDaysAgo,
      endDate: today,
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [pendingDateRange, setPendingDateRange] = useState(
    getDefaultDateRange()
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">(
    "start"
  );

  // Filter modal states
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Applied filter states (what's currently active)
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Pending filter states (what user is selecting in modal)
  const [pendingMinAmount, setPendingMinAmount] = useState("");
  const [pendingMaxAmount, setPendingMaxAmount] = useState("");
  const [pendingSelectedCategories, setPendingSelectedCategories] = useState<
    string[]
  >([]);

  // Available categories
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  // Fetch transactions from database
  const fetchUserTransactions = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("User not authenticated");
        return;
      }

      // Fetch all transactions and transfers for the user
      let fetchedTransactions = await fetchAllTransactionsAndTransfers(user.id);

      // Filter by selected account if one is selected
      if (selectedAccount) {
        fetchedTransactions = fetchedTransactions.filter(
          (t) => t.account_id === selectedAccount.id
        );
      }

      // Store all transactions for filtering
      setAllTransactions(fetchedTransactions);

      // Extract unique categories for filter options
      const categories = [
        ...new Set(fetchedTransactions.map((t) => t.category).filter(Boolean)),
      ] as string[];
      setAvailableCategories(categories);

      // Apply current filters to the fetched data
      applyFiltersToTransactions(fetchedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Group transactions by date for section list
  const groupTransactionsByDate = (
    transactions: Transaction[]
  ): TransactionSection[] => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const todayStr = today.toISOString().split("T")[0];
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const lastWeekStr = lastWeek.toISOString().split("T")[0];

    const todayTransactions = transactions.filter((t) => t.date === todayStr);
    const yesterdayTransactions = transactions.filter(
      (t) => t.date === yesterdayStr
    );
    const lastWeekTransactions = transactions.filter(
      (t) => t.date < yesterdayStr && t.date >= lastWeekStr
    );
    const olderTransactions = transactions.filter((t) => t.date < lastWeekStr);

    // Sort each group by created_at timestamp in descending order (newest first)
    const sortByCreatedAt = (a: Transaction, b: Transaction) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    const sections: TransactionSection[] = [];

    if (todayTransactions.length > 0) {
      sections.push({
        title: "Today",
        data: todayTransactions.sort(sortByCreatedAt),
      });
    }
    if (yesterdayTransactions.length > 0) {
      sections.push({
        title: "Yesterday",
        data: yesterdayTransactions.sort(sortByCreatedAt),
      });
    }
    if (lastWeekTransactions.length > 0) {
      sections.push({
        title: "Last Week",
        data: lastWeekTransactions.sort(sortByCreatedAt),
      });
    }
    if (olderTransactions.length > 0) {
      sections.push({
        title: "Older",
        data: olderTransactions.sort(sortByCreatedAt),
      });
    }

    return sections;
  };

  // Load transactions on component mount
  useEffect(() => {
    fetchUserTransactions();
  }, [selectedAccount?.id, dateRange]);

  // Apply filters when applied filter states change
  useEffect(() => {
    if (allTransactions.length > 0) {
      applyFiltersToTransactions(allTransactions);
    }
  }, [minAmount, maxAmount, selectedCategories]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserTransactions();
  };

  // Date picker callbacks
  const onDismiss = () => setDatePickerVisible(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setDatePickerVisible(false);
    }

    if (selectedDate) {
      if (datePickerMode === "start") {
        setPendingDateRange((prev) => ({ ...prev, startDate: selectedDate }));
      } else {
        setPendingDateRange((prev) => ({ ...prev, endDate: selectedDate }));
      }
    }
  };

  const confirmIOSDate = () => {
    setDatePickerVisible(false);
  };

  // Function to apply pending date changes and refresh data
  const handleSubmitDateRange = () => {
    setDateRange(pendingDateRange);
    // Apply filters after date range change
    if (allTransactions.length > 0) {
      applyFiltersToTransactions(allTransactions);
    }
  };

  const openDatePicker = (mode: "start" | "end") => {
    setDatePickerMode(mode);
    setDatePickerVisible(true);
  };

  // Reset all filters to default state
  const resetFilters = () => {
    setSearchQuery("");
    setActiveFilter("all");
    setDateRange(getDefaultDateRange());
    setPendingDateRange(getDefaultDateRange());
    setMinAmount("");
    setMaxAmount("");
    setSelectedCategories([]);
    setPendingMinAmount("");
    setPendingMaxAmount("");
    setPendingSelectedCategories([]);
    // Apply filters after reset
    if (allTransactions.length > 0) {
      applyFiltersToTransactions(allTransactions);
    }
  };

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Apply filters to transactions without refetching
  const applyFiltersToTransactions = (transactionsToFilter: Transaction[]) => {
    let filteredTransactions = [...transactionsToFilter];

    // Filter by date range
    const startDateStr = dateRange.startDate.toISOString().split("T")[0];
    const endDateStr = dateRange.endDate.toISOString().split("T")[0];

    filteredTransactions = filteredTransactions.filter((t) => {
      const transactionDate = t.date;
      return transactionDate >= startDateStr && transactionDate <= endDateStr;
    });

    // Filter by amount range
    if (minAmount || maxAmount) {
      filteredTransactions = filteredTransactions.filter((t) => {
        const amount = Math.abs(t.amount);
        const min = minAmount ? parseFloat(minAmount) : 0;
        const max = maxAmount ? parseFloat(maxAmount) : Infinity;
        return amount >= min && amount <= max;
      });
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filteredTransactions = filteredTransactions.filter(
        (t) => t.category && selectedCategories.includes(t.category)
      );
    }

    // Group transactions by date
    const groupedTransactions = groupTransactionsByDate(filteredTransactions);
    setTransactions(groupedTransactions);
  };

  // Category management functions
  const toggleCategory = (category: string) => {
    setPendingSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const openFilterModal = () => {
    // Initialize pending filters with current applied filters
    setPendingMinAmount(minAmount);
    setPendingMaxAmount(maxAmount);
    setPendingSelectedCategories(selectedCategories);
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    // Apply pending filters to actual filter states
    setMinAmount(pendingMinAmount);
    setMaxAmount(pendingMaxAmount);
    setSelectedCategories(pendingSelectedCategories);
    setShowFilterModal(false);
  };

  const cancelFilters = () => {
    // Reset pending filters to current applied filters
    setPendingMinAmount(minAmount);
    setPendingMaxAmount(maxAmount);
    setPendingSelectedCategories(selectedCategories);
    setShowFilterModal(false);
  };

  // Filter transactions based on search and filter
  const filteredTransactions = transactions
    .map((section) => ({
      ...section,
      data: section.data.filter((item) => {
        const matchesSearch =
          item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          false;

        // Handle transfer filtering
        let matchesFilter = true;
        if (activeFilter === "transfer") {
          matchesFilter = item.isTransfer === true;
        } else if (activeFilter !== "all") {
          matchesFilter = item.type === activeFilter && !item.isTransfer;
        }

        return matchesSearch && matchesFilter;
      }),
    }))
    .filter((section) => section.data.length > 0);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 py-safe">
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600 dark:text-gray-300">
            Loading transactions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <View className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center mb-3">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color={theme.icon} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Transactions
            </Text>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center gap-2 mb-3">
            <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              <Search size={18} color={theme.textMuted} />
              <TextInput
                className="flex-1 ml-2 text-gray-900 dark:text-white"
                placeholder="Search transactions..."
                placeholderTextColor={theme.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {/* Add Transaction and Filter Buttons */}
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                className="bg-blue-500 dark:bg-blue-600 w-12 h-12 rounded-xl  justify-center items-center "
                onPress={openFilterModal}
              >
                <Filter size={20} color="#f8fafc" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-500 dark:bg-blue-600 w-12 h-12 rounded-xl  justify-center items-center "
                onPress={() => router.push("/(expense)/AddExpense")}
              >
                <Plus size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Buttons */}
          <View className="flex-row space-x-2 ">
            {["all", "income", "expense", "transfer"].map((filter) => (
              <TouchableOpacity
                key={filter}
                className={`px-3 mr-2 py-1 rounded-full ${activeFilter === filter ? "bg-blue-500 dark:bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  className={`${activeFilter === filter ? "text-white" : "text-gray-800 dark:text-gray-200"}`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Range Picker */}
          <View className="gap-2 my-4">
            <View className="flex-row justify-between items-center gap-2">
              <TouchableOpacity
                className="flex-1 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex-row items-center mr-2"
                onPress={() => openDatePicker("start")}
                disabled={loading}
              >
                <Calendar size={14} color="#3b82f6" />
                <Text className="ml-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
                  From: {formatDate(pendingDateRange.startDate.toISOString())}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex-row items-center"
                onPress={() => openDatePicker("end")}
                disabled={loading}
              >
                <Calendar size={14} color="#8b5cf6" />
                <Text className="ml-2 text-purple-600 dark:text-purple-400 text-sm font-medium">
                  To: {formatDate(pendingDateRange.endDate.toISOString())}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit and Reset Buttons */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                className=" flex-1 bg-blue-500 dark:bg-blue-600 py-3 rounded-lg flex-row items-center justify-center"
                onPress={handleSubmitDateRange}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Filter size={16} color="white" />
                )}
                <Text
                  className="ml-2 text-white font-semibold"
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.5}
                >
                  {loading ? "Loading..." : "Apply"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-red-500 dark:bg-red-600 p-3 rounded-lg flex-row items-center justify-center"
                onPress={resetFilters}
                disabled={loading}
              >
                <X size={16} color="white" />
                <Text
                  className="ml-2 text-white font-semibold"
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.5}
                >
                  Reset
                </Text>
              </TouchableOpacity>
            </View>

            {/* Current active date range indicator */}
            <View className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-2">
              <Text
                className="text-gray-600 dark:text-gray-300 text-xs text-center"
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.5}
              >
                Showing data from{" "}
                {formatDate(dateRange.startDate.toISOString())} -{" "}
                {formatDate(dateRange.endDate.toISOString())}
              </Text>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <SectionList
          className="flex-1"
          sections={filteredTransactions}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white dark:bg-gray-800 p-4 border-b border-gray-100 dark:border-gray-700"
              onPress={() => router.push(`/transaction-detail/${item.id}`)}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text
                    className="font-medium text-gray-900 dark:text-white"
                    numberOfLines={1}
                  >
                    {item.description || item.category || "No description"}
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">
                    {item.category}
                  </Text>
                  <Text className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                    })}
                  </Text>
                </View>
                <View className="items-end ">
                  <Text
                    className={`font-bold text-lg  ${
                      item.isTransfer
                        ? "text-blue-500 dark:text-blue-400"
                        : item.type === "expense"
                          ? "text-red-500 dark:text-red-400"
                          : "text-green-500 dark:text-green-400"
                    }`}
                  >
                    <View className="flex-row items-center">
                      {item.isTransfer ? (
                        <ArrowRightLeft size={16} color="#3b82f6" />
                      ) : item.type === "expense" ? (
                        <Text className="font-bold text-lg text-red-500 dark:text-red-400">
                          -
                        </Text>
                      ) : (
                        <Text className="font-bold text-lg text-green-500 dark:text-green-400">
                          +
                        </Text>
                      )}
                      <Text
                        className={`font-bold text-lg ${
                          item.isTransfer
                            ? "text-blue-500 dark:text-blue-400"
                            : item.type === "expense"
                              ? "text-red-500 dark:text-red-400"
                              : "text-green-500 dark:text-green-400"
                        }`}
                      >
                        ${Math.abs(item.amount).toFixed(2)}
                      </Text>
                    </View>
                  </Text>
                  <Text className="text-gray-400 dark:text-gray-500 text-xs capitalize">
                    {item.isTransfer ? "transfer" : item.type}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View className="bg-gray-50 dark:bg-gray-800 px-4 py-2">
              <Text className="font-bold text-gray-500 dark:text-gray-300">
                {title}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center p-8">
              <Text className="text-gray-500 dark:text-gray-400 text-center">
                {searchQuery || activeFilter !== "all"
                  ? `No transactions found${searchQuery ? ` for "${searchQuery}"` : ""}${activeFilter !== "all" ? ` in ${activeFilter}` : ""}`
                  : "No transactions yet"}
              </Text>
              {!searchQuery && activeFilter === "all" && (
                <Text className="text-gray-400 dark:text-gray-500 text-center mt-2">
                  Start by adding your first transaction
                </Text>
              )}
            </View>
          }
        />

        {/* Date Picker */}
        {datePickerVisible && (
          <>
            {Platform.OS === "ios" ? (
              <Modal
                transparent={true}
                animationType="slide"
                visible={datePickerVisible}
                onRequestClose={onDismiss}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: theme.cardBackground,
                      borderTopLeftRadius: 24,
                      borderTopRightRadius: 24,
                      padding: 20,
                    }}
                  >
                    <View className="flex-row justify-between items-center mb-4">
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: 18,
                          fontWeight: "bold",
                        }}
                      >
                        {datePickerMode === "start"
                          ? "Select Start Date"
                          : "Select End Date"}
                      </Text>
                      <TouchableOpacity onPress={onDismiss}>
                        <X size={24} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <DateTimePicker
                      value={
                        datePickerMode === "start"
                          ? pendingDateRange.startDate
                          : pendingDateRange.endDate
                      }
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      maximumDate={
                        datePickerMode === "start"
                          ? pendingDateRange.endDate
                          : new Date()
                      }
                      minimumDate={
                        datePickerMode === "end"
                          ? pendingDateRange.startDate
                          : new Date(2020, 0, 1)
                      }
                    />

                    <TouchableOpacity
                      style={{
                        backgroundColor: theme.primary,
                        padding: 16,
                        borderRadius: 12,
                        marginTop: 16,
                      }}
                      onPress={confirmIOSDate}
                    >
                      <Text
                        style={{
                          color: theme.primaryText,
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        Confirm
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={
                  datePickerMode === "start"
                    ? pendingDateRange.startDate
                    : pendingDateRange.endDate
                }
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={
                  datePickerMode === "start"
                    ? pendingDateRange.endDate
                    : new Date()
                }
                minimumDate={
                  datePickerMode === "end"
                    ? pendingDateRange.startDate
                    : new Date(2020, 0, 1)
                }
              />
            )}
          </>
        )}

        {/* Professional Filter Modal */}
        <Modal
          visible={showFilterModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white dark:bg-gray-800 rounded-2xl mx-6 w-full max-w-md shadow-2xl">
              {/* Header */}
              <View className="flex-row justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  Filter Transactions
                </Text>
              </View>
              <ScrollView className="max-h-96">
                {/* Amount Range Filter */}
                <View className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Amount Range
                  </Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Minimum Amount
                      </Text>
                      <TextInput
                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                        placeholder="0"
                        placeholderTextColor={theme.placeholder}
                        value={pendingMinAmount}
                        onChangeText={setPendingMinAmount}
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Maximum Amount
                      </Text>
                      <TextInput
                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                        placeholder="∞"
                        placeholderTextColor={theme.placeholder}
                        value={pendingMaxAmount}
                        onChangeText={setPendingMaxAmount}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                {/* Category Filter */}
                <View className="p-6">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Categories
                  </Text>
                  {availableCategories.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {availableCategories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          onPress={() => toggleCategory(category)}
                          className={`px-4 py-2 rounded-full border ${
                            pendingSelectedCategories.includes(category)
                              ? "bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600"
                              : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              pendingSelectedCategories.includes(category)
                                ? "text-white"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No categories available
                    </Text>
                  )}
                </View>
              </ScrollView>

              {/* Footer Actions */}
              <View className="flex-row gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <TouchableOpacity
                  className="flex-1 bg-gray-100 dark:bg-gray-700 py-3 rounded-lg"
                  onPress={cancelFilters}
                >
                  <Text className="text-center font-semibold text-gray-700 dark:text-gray-300">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-blue-500 dark:bg-blue-600 py-3 rounded-lg"
                  onPress={applyFilters}
                >
                  <Text className="text-center font-semibold text-white">
                    Apply Filters
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
