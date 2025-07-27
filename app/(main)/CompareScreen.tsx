"use client"

import { useEffect, useState } from "react"
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/Feather"
import { PieChart } from "react-native-chart-kit"
import { Dimensions } from "react-native"
import { fetchPredictions, fetchExpenses, getSupabaseWithToken } from '../../lib/supabase'
import { getItemAsync } from 'expo-secure-store'
import { compareExpenses } from "~/lib/compare"
import { saveComparison } from "~/lib/comparison"
const { width } = Dimensions.get("window")

export default function CompareScreen({ navigation }) {
  const [comparisonMode, setComparisonMode] = useState("manual") // 'manual' or 'monthly'
  const [selectedPrediction, setSelectedPrediction] = useState(null)
  const [selectedExpenses, setSelectedExpenses] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showPredictionModal, setShowPredictionModal] = useState(false)
  const [showMonthModal, setShowMonthModal] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [comparisonResults, setComparisonResults] = useState(null)
  const [expenses, setExpenses] = useState<any[]>([])

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  // Add useEffect to fetch data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const userId = await getItemAsync('userId')
        if (!userId) throw new Error('User not authenticated')
        
        const token = await getItemAsync('token')
        await getSupabaseWithToken(token)
        
        // Fetch initial expenses (current month)
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const exps = await fetchExpenses(userId, currentMonth, currentYear)
        setExpenses(exps)
      } catch (error) {
        Alert.alert('Error', error.message)
      }
    }

    loadInitialData()
  }, [])

// Update the getExpensesForMonth function to use the existing expenses state
const getExpensesForMonth = async (month: number, year: number) => {
  try {
    const userId = await getItemAsync('userId')
    const monthExpenses = await fetchExpenses(userId, month, year)
    return monthExpenses
  } catch (error) {
    console.error("Error in getExpensesForMonth:", error)
    Alert.alert('Error', 'Failed to fetch monthly expenses')
    return []
  }
}

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return "#10b981"
    if (confidence >= 60) return "#f59e0b"
    return "#ef4444"
  }

  const getCategoryIcon = (category) => {
    const icons = {
      Food: "utensils",
      Transport: "truck",
      Utilities: "zap",
      Healthcare: "heart",
      Education: "book",
      Shopping: "shopping-bag",
      Other: "more-horizontal",
    }
    return icons[category] || "circle"
  }

  const getCategoryColor = (category) => {
    const colors = {
      Food: "#10b981",
      Transport: "#3b82f6",
      Utilities: "#f59e0b",
      Healthcare: "#ef4444",
      Education: "#8b5cf6",
      Shopping: "#06b6d4",
      Other: "#64748b",
    }
    return colors[category] || "#64748b"
  }

  const toggleExpenseSelection = (expenseId) => {
    if (selectedExpenses.includes(expenseId)) {
      setSelectedExpenses(selectedExpenses.filter((id) => id !== expenseId))
    } else {
      setSelectedExpenses([...selectedExpenses, expenseId])
    }
  }

  const runComparison = async () => {
  if (!selectedPrediction) {
    Alert.alert('Error', 'Please select a prediction to compare with')
    return
  }

  try {
    const token = await getItemAsync('token')
    const userId = await getItemAsync('userId')
    
    let expensesToCompare = []
    if (comparisonMode === 'manual') {
      if (selectedExpenses.length === 0) {
        Alert.alert('Error', 'Select at least 1 expense to compare')
        return
      }
      expensesToCompare = expenses.filter(expense => selectedExpenses.includes(expense.id))
    } else {
      expensesToCompare = await getExpensesForMonth(selectedMonth, selectedYear)
      if (expensesToCompare.length === 0) {
        Alert.alert('Error', 'No expenses found for the selected month')
        return
      }
    }

    // Prepare API request
    const comparisonData = {
      expenses: comparisonMode === 'manual' 
        ? { expense_ids: selectedExpenses }
        : { month: selectedMonth, year: selectedYear },
      prediction: {
        prediction_id: selectedPrediction.id
      }
    }
    console.log("selectedMonth: ", selectedMonth)
    console.log("comparisonData: ", comparisonData)
    const result = await compareExpenses(comparisonData, token)
    console.log("result: ", result)
   
    
    // Calculate additional data for UI
    const isUnderBudget = result.total_actual < result.total_predicted_monthly
    const period = comparisonMode === 'monthly' 
      ? `${months[selectedMonth]} ${selectedYear}` 
      : 'Selected expenses'

    setComparisonResults({
      ...result,
      isUnderBudget,
      expenseCount: expensesToCompare.length,
      period
    })
    setShowResults(true)

  } catch (error) {
    Alert.alert('Error', error.message)
  } finally {
    setIsLoading(false)
  }
}

  const PredictionModal = () => {
    const [loading, setLoading] = useState(true);
  const [localPredictions, setLocalPredictions] = useState<any[]>([]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const userId = await getItemAsync('userId');
      if (!userId) throw new Error('User not authenticated');
      
      const preds = await fetchPredictions(userId);
      setLocalPredictions(preds);
    } catch (error) {
      console.error("Prediction fetch error:", error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showPredictionModal) {
      loadPredictions();
    } else {
      // Reset when modal closes
      setLocalPredictions([]);
      setLoading(true);
    }
  }, [showPredictionModal]);

  return (
    <Modal 
      visible={showPredictionModal} 
      animationType="slide" 
      presentationStyle="pageSheet" 
      onRequestClose={() => setShowPredictionModal(false)}
    >
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
          <Text className="text-xl font-bold text-slate-50">Select Prediction</Text>
          <TouchableOpacity className="p-2" onPress={() => setShowPredictionModal(false)}>
            <Icon name="x" size={24} color="#f8fafc" />
          </TouchableOpacity>
        </View>
         {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
       ) : localPredictions.length > 0 ? (
        <ScrollView className="flex-1 px-6">
            <View className="py-5 gap-4">
              {localPredictions.map((prediction) => (
                <TouchableOpacity
                  key={prediction.id}
                  className={`bg-slate-800 p-5 rounded-2xl border ${
                    selectedPrediction?.id === prediction.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-700"
                  } relative`}
                  onPress={() => {
                    setSelectedPrediction(prediction)
                    setShowPredictionModal(false)
                  }}
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xl font-bold text-emerald-500">${prediction.predicted_exp.toFixed(2)}</Text>
                    <View className="bg-slate-700 px-2 py-1 rounded">
                      <Text
                        className="text-xs font-medium"
                        style={{ color: getConfidenceColor(prediction.confidence) }}
                      >
                        {prediction.confidence}%
                      </Text>
                    </View>
                  </View>

                  <Text className="text-xs text-slate-400 mb-2">
                    {new Date(prediction.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>

                  <View className="gap-1">
                    <Text className="text-xs text-slate-300">
                      {prediction.input_data.Number_of_Members} members • {prediction.input_data.Region}
                    </Text>
                    <Text className="text-xs text-slate-500">Model: {prediction.model_used}</Text>
                  </View>

                  {selectedPrediction?.id === prediction.id && (
                    <View className="absolute top-4 right-4">
                      <Icon name="check-circle" size={20} color="#10b981" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
        </ScrollView>
        ): (
          <View className="items-center py-16 px-10">
            <Icon name="trending-up" size={48} color="#64748b" />
            <Text className="text-xl font-bold text-slate-50 mt-4 mb-2">No predictions found</Text>
            <Text className="text-base text-slate-400 text-center leading-6 mb-6">Create one to start comparing</Text>
            <TouchableOpacity
              className="bg-emerald-500 py-3 px-6 rounded-lg"
               onPress={() => {
                setShowPredictionModal(false);
                // navigation.navigate("BasicInputs");
              }}
            >
              <Text className="text-white text-base font-semibold">Create Prediction</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )}

  const MonthModal = () => {
  const [monthExpenseCounts, setMonthExpenseCounts] = useState<{[key: string]: number}>({})
  const [loadingCounts, setLoadingCounts] = useState(false)
  
  const loadExpenseCounts = async (year: number) => {
    try {
      setLoadingCounts(true)
      const userId = await getItemAsync('userId')
      const counts: {[key: string]: number} = {}
      
      // Get counts for each month
      const monthPromises = months.map(async (_, monthIndex) => {
        const expenses = await fetchExpenses(userId, monthIndex, year)
        counts[monthIndex] = expenses.length
      })
      
      await Promise.all(monthPromises)
      setMonthExpenseCounts(counts)
    } catch (error) {
      console.error("Failed to load expense counts:", error)
      Alert.alert('Error', 'Failed to load expense counts')
    } finally {
      setLoadingCounts(false)
    }
  }

    useEffect(() => {
      if (showMonthModal) {
        loadExpenseCounts(selectedYear)
      }
    }, [showMonthModal, selectedYear])

    const handleYearChange = async (year: number) => {
      setSelectedYear(year)
      // No need to close modal here
    }

    const handleMonthSelect = (monthIndex: number) => {
      setSelectedMonth(monthIndex)
      setShowMonthModal(false) // Close modal only when month is selected
    }

  return (
    <Modal 
      visible={showMonthModal} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={() => setShowMonthModal(false)} // Add this
    >
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
          <Text className="text-xl font-bold text-slate-50">Select Month & Year</Text>
          <TouchableOpacity className="p-2" onPress={() => setShowMonthModal(false)}>
            <Icon name="x" size={24} color="#f8fafc" />
          </TouchableOpacity>
        </View>

        {loadingCounts ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
        <ScrollView className="flex-1 px-6">
          <View className="py-5">
            <Text className="text-lg font-bold text-slate-50 mb-4">Year</Text>
            <View className="flex-row gap-3">
              {[2023, 2024, 2025].map((year) => (
                <TouchableOpacity
                  key={year}
                  className={`flex-1 py-3 rounded-lg border items-center ${
                    selectedYear === year ? "bg-emerald-500 border-emerald-500" : "bg-slate-800 border-slate-700"
                  }`}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text
                    className={`text-base font-medium ${
                      selectedYear === year ? "text-white font-bold" : "text-slate-50"
                    }`}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="py-5">
            <Text className="text-lg font-bold text-slate-50 mb-4">Month</Text>
            <View className="flex-row flex-wrap gap-2">
              {months.map((month, index) => {
                const monthExpenses = getExpensesForMonth(index, selectedYear)
                return (
                  <TouchableOpacity
                    key={month}
                    className={`w-[30%] p-3 rounded-lg border items-center ${
                      selectedMonth === index ? "bg-emerald-500 border-emerald-500" : "bg-slate-800 border-slate-700"
                    }`}
                    onPress={() => setSelectedMonth(index)}
                  >
                    <Text
                      className={`text-sm font-medium mb-1 ${
                        selectedMonth === index ? "text-white font-bold" : "text-slate-50"
                      }`}
                    >
                      {month.slice(0, 3)}
                    </Text>
                    <Text className="text-xs text-slate-300">{monthExpenseCounts[index] || 0} expenses</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <TouchableOpacity
            className="bg-emerald-500 py-4 rounded-xl items-center my-5"
            onPress={() => setShowMonthModal(false)}
          >
            <Text className="text-white text-base font-bold">
              Select {months[selectedMonth]} {selectedYear}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  )}

  const ResultsModal = () => {
    if (!comparisonResults) return null

    // Create chart data from category breakdown
    const chartData = comparisonResults.category_breakdown.map((category) => ({
      name: category.category,
      population: category.actual,
      color: getCategoryColor(category.category),
      legendFontColor: "#f8fafc",
      legendFontSize: 12,
    }))

    const chartConfig = {
      backgroundColor: "#1e293b",
      backgroundGradientFrom: "#1e293b",
      backgroundGradientTo: "#1e293b",
      color: (opacity = 1) => `rgba(248, 250, 252, ${opacity})`,
    }

    return (
      <Modal visible={showResults} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView className="flex-1 bg-slate-900">
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
            <Text className="text-xl font-bold text-slate-50">Comparison Results</Text>
            <TouchableOpacity className="p-2" onPress={() => setShowResults(false)}>
              <Icon name="x" size={24} color="#f8fafc" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6">
            {/* Success/Warning Banner */}
            <View
              className={`flex-row items-center p-5 rounded-2xl my-5 ${
                comparisonResults.isUnderBudget ? "bg-emerald-500/20" : "bg-red-500/20"
              }`}
            >
              <Icon
                name={comparisonResults.isUnderBudget ? "trending-down" : "trending-up"}
                size={24}
                color={comparisonResults.isUnderBudget ? "#10b981" : "#ef4444"}
              />
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-slate-50 mb-1">
                  {comparisonResults.isUnderBudget ? "Great job! 🎉" : "Over budget ⚠️"}
                </Text>
                <Text className="text-sm text-slate-300">{comparisonResults.message}</Text>
              </View>
            </View>

            {/* Summary Cards */}
            <View className="flex-row gap-3 mb-5">
              <View className="flex-1 bg-slate-800 p-5 rounded-2xl border border-slate-700 items-center">
                <Text className="text-xs text-slate-400 mb-2">Actual Spending</Text>
                <Text className="text-2xl font-bold text-red-500 mb-1">
                  ${comparisonResults.total_actual.toFixed(2)}
                </Text>
                <Text className="text-xs text-slate-500">{comparisonResults.period}</Text>
              </View>

              <View className="flex-1 bg-slate-800 p-5 rounded-2xl border border-slate-700 items-center">
                <Text className="text-xs text-slate-400 mb-2">Predicted</Text>
                <Text className="text-2xl font-bold text-blue-500 mb-1">
                  ${comparisonResults.total_predicted_monthly.toFixed(2)}
                </Text>
                <Text className="text-xs text-slate-500">{comparisonResults.expenseCount} transactions</Text>
              </View>
            </View>

            {/* Variance Indicator */}
            <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-5">
              <Text className="text-base font-bold text-slate-50 mb-3">Variance Analysis</Text>
              <View className="h-2 bg-slate-700 rounded-full mb-2">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(comparisonResults.variance_percentage, 100)}%`,
                    backgroundColor: comparisonResults.isUnderBudget ? "#10b981" : "#ef4444",
                  }}
                />
              </View>
              <Text className="text-xs text-slate-400 text-center">
                {comparisonResults.variance_percentage.toFixed(1)}% variance • $
                {Math.abs(comparisonResults.total_actual - comparisonResults.total_predicted_monthly).toFixed(2)}{" "}
                difference
              </Text>
            </View>

            {/* Confidence Score */}
            <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-5">
              <Text className="text-base font-bold text-slate-50 mb-3">Prediction Confidence</Text>
              <View className="flex-row items-center gap-3">
                <View className="flex-1 h-2 bg-slate-700 rounded-full">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${comparisonResults.confidence_score}%`,
                      backgroundColor: getConfidenceColor(comparisonResults.confidence_score),
                    }}
                  />
                </View>
                <Text
                  className="text-base font-bold"
                  style={{ color: getConfidenceColor(comparisonResults.confidence_score) }}
                >
                  {comparisonResults.confidence_score.toFixed(0)}%
                </Text>
              </View>
              {comparisonResults.time_period_note && (
                <Text className="text-xs text-slate-400 mt-2 italic">{comparisonResults.time_period_note}</Text>
              )}
            </View>

            {/* Category Breakdown Chart */}
            <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-5">
              <Text className="text-base font-bold text-slate-50 mb-4 text-center">Actual Spending by Category</Text>
              {chartData.length > 0 && (
                <PieChart
                  data={chartData}
                  width={width - 48}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              )}
            </View>

            {/* Category Comparison Details */}
            <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-5">
              <Text className="text-base font-bold text-slate-50 mb-4">Category-by-Category Analysis</Text>
              {comparisonResults.category_breakdown.map((category) => {
                const isOverBudget = category.actual > category.predicted
                const percentageDiff = Math.abs(category.percentage_diff)

                return (
                  <View key={category.category} className="mb-5 pb-4 border-b border-slate-700">
                    <View className="flex-row justify-between items-center mb-3">
                      <View className="flex-row items-center flex-1">
                        <View
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: getCategoryColor(category.category) }}
                        />
                        <Text className="text-sm font-medium text-slate-50">{category.category}</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Icon
                          name={isOverBudget ? "trending-up" : "trending-down"}
                          size={16}
                          color={isOverBudget ? "#ef4444" : "#10b981"}
                        />
                        <Text className="text-xs font-bold" style={{ color: isOverBudget ? "#ef4444" : "#10b981" }}>
                          {percentageDiff.toFixed(0)}%
                        </Text>
                      </View>
                    </View>

                    <View className="gap-2 mb-2">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs text-slate-400 w-16">Actual</Text>
                        <View className="flex-1 h-1.5 bg-slate-700 rounded-full">
                          <View
                            className="h-full rounded-full bg-red-500"
                            style={{
                              width: `${(category.actual / Math.max(category.actual, category.predicted)) * 100}%`,
                            }}
                          />
                        </View>
                        <Text className="text-xs font-medium text-slate-50 w-16 text-right">
                          ${category.actual.toFixed(2)}
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs text-slate-400 w-16">Predicted</Text>
                        <View className="flex-1 h-1.5 bg-slate-700 rounded-full">
                          <View
                            className="h-full rounded-full bg-blue-500"
                            style={{
                              width: `${(category.predicted / Math.max(category.actual, category.predicted)) * 100}%`,
                            }}
                          />
                        </View>
                        <Text className="text-xs font-medium text-slate-50 w-16 text-right">
                          ${category.predicted.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-xs text-slate-500 text-center italic">
                      {category.difference > 0 ? "+" : ""}${category.difference.toFixed(2)} difference
                    </Text>
                  </View>
                )
              })}
            </View>

            {/* Smart Recommendations */}
            <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 mb-5">
              <Text className="text-base font-bold text-slate-50 mb-4">Smart Recommendations</Text>
              <View className="gap-3">
                {comparisonResults.isUnderBudget ? (
                  <>
                    <View className="flex-row items-start">
                      <Icon name="thumbs-up" size={16} color="#10b981" />
                      <Text className="text-sm text-slate-300 ml-3 flex-1 leading-5">
                        Excellent budget management! Consider saving the $
                        {Math.abs(comparisonResults.total_actual - comparisonResults.total_predicted_monthly).toFixed(
                          2,
                        )}{" "}
                        difference.
                      </Text>
                    </View>
                    <View className="flex-row items-start">
                      <Icon name="target" size={16} color="#3b82f6" />
                      <Text className="text-sm text-slate-300 ml-3 flex-1 leading-5">
                        Your predictions are {comparisonResults.confidence_score.toFixed(0)}% accurate. Keep tracking
                        expenses.
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Find highest overspend category */}
                    {(() => {
                      const highestOverspend = comparisonResults.category_breakdown
                        .filter((cat) => cat.difference > 0)
                        .sort((a, b) => b.difference - a.difference)[0]

                      return highestOverspend ? (
                        <View className="flex-row items-start">
                          <Icon name="alert-triangle" size={16} color="#f59e0b" />
                          <Text className="text-sm text-slate-300 ml-3 flex-1 leading-5">
                            Focus on {highestOverspend.category} spending - you're $
                            {highestOverspend.difference.toFixed(2)} over budget in this category.
                          </Text>
                        </View>
                      ) : null
                    })()}

                    <View className="flex-row items-start">
                      <Icon name="edit-3" size={16} color="#8b5cf6" />
                      <Text className="text-sm text-slate-300 ml-3 flex-1 leading-5">
                        Update your prediction model with recent spending patterns to improve accuracy.
                      </Text>
                    </View>

                    {comparisonResults.is_recurring_adjusted && (
                      <View className="flex-row items-start">
                        <Icon name="repeat" size={16} color="#06b6d4" />
                        <Text className="text-sm text-slate-300 ml-3 flex-1 leading-5">
                          Recurring expenses were adjusted in this comparison. Review your regular payments.
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3 mb-5">
              <TouchableOpacity
                className="flex-1 bg-slate-800 flex-row items-center justify-center py-3 rounded-lg border border-blue-500 gap-2"
                onPress={() => setShowResults(false)}
              >
                <Icon name="edit-3" size={16} color="#3b82f6" />
                <Text className="text-blue-500 text-sm font-medium">Adjust Inputs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-emerald-500 flex-row items-center justify-center py-3 rounded-lg gap-2"
                 onPress={async () => {
                  try {
                    setIsLoading(true);
                    await saveComparison(
                      selectedPrediction.id,
                      {
                        comparisonMode,
                        month: comparisonMode === 'monthly' ? selectedMonth : null,
                        year: comparisonMode === 'monthly' ? selectedYear : null,
                        expenseIds: comparisonMode === 'manual' ? selectedExpenses : null
                      },
                      comparisonResults
                    );
                    Alert.alert('Saved', 'Comparison results saved successfully');
                    setShowResults(false);
                    navigation.navigate("Dashboard");
                  } catch (error) {
                    Alert.alert('Error', error.message || 'Failed to save comparison');
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                <Icon name="save" size={16} color="#ffffff" />
                <Text className="text-white text-sm font-bold">Save Analysis</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900">
        <View className="flex-1 justify-center items-center px-10">
          <View className="flex-row gap-2 mb-6">
            <View className="w-3 h-3 rounded-full bg-emerald-500" />
            <View className="w-3 h-3 rounded-full bg-emerald-500" />
            <View className="w-3 h-3 rounded-full bg-emerald-500" />
          </View>
          <Text className="text-xl font-bold text-slate-50 text-center mb-2">Running comparison...</Text>
          <Text className="text-base text-slate-400 text-center">Analyzing your spending patterns</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <View className="px-6 py-5">
        <Text className="text-2xl font-bold text-slate-50 mb-2">Compare Expenses</Text>
        <Text className="text-base text-slate-400 leading-6">
          Understand your spending patterns by comparing predictions with actual expenses
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Comparison Method Selection */}
        <View className="px-6 mb-8">
          <Text className="text-lg font-bold text-slate-50 mb-4">🔍 Select Comparison Method:</Text>

          <TouchableOpacity
            className={`p-5 rounded-2xl border-2 mb-3 ${
              comparisonMode === "manual" ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-800"
            }`}
            onPress={() => setComparisonMode("manual")}
          >
            <View className="flex-row items-center mb-2">
              <View className="w-5 h-5 rounded-full border-2 border-slate-500 mr-3 justify-center items-center">
                {comparisonMode === "manual" && <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
              </View>
              <Text className="text-base font-bold text-slate-50">Manual Selection</Text>
            </View>
            <Text className="text-sm text-slate-300 mb-1 ml-8">Choose specific expenses to analyze</Text>
            <Text className="text-xs text-slate-400 ml-8">Perfect for targeted spending reviews</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`p-5 rounded-2xl border-2 ${
              comparisonMode === "monthly" ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 bg-slate-800"
            }`}
            onPress={() => setComparisonMode("monthly")}
          >
            <View className="flex-row items-center mb-2">
              <View className="w-5 h-5 rounded-full border-2 border-slate-500 mr-3 justify-center items-center">
                {comparisonMode === "monthly" && <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
              </View>
              <Text className="text-base font-bold text-slate-50">Monthly Overview</Text>
            </View>
            <Text className="text-sm text-slate-300 mb-1 ml-8">Compare all expenses for a selected month</Text>
            <Text className="text-xs text-slate-400 ml-8">Best for holistic budget analysis</Text>
          </TouchableOpacity>
        </View>

        {/* Prediction Selection */}
        <View className="px-6 mb-8">
          <Text className="text-lg font-bold text-slate-50 mb-4">Select Prediction Model</Text>
          <TouchableOpacity
            className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-row items-center justify-between"
            onPress={() => setShowPredictionModal(true)}
          >
            {selectedPrediction ? (
              <View className="flex-1">
                <Text className="text-lg font-bold text-emerald-500">
                  ${selectedPrediction.predicted_exp.toFixed(2)}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {new Date(selectedPrediction.created_at).toLocaleDateString()}
                </Text>
                <View className="mt-1">
                  <Text
                    className="text-xs font-medium"
                    style={{ color: getConfidenceColor(selectedPrediction.confidence) }}
                  >
                    {selectedPrediction.confidence}% confidence
                  </Text>
                </View>
              </View>
            ) : (
              <Text className="text-base text-slate-500">Choose a prediction to compare with</Text>
            )}
            <Icon name="chevron-down" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Expense Selection */}
        {comparisonMode === "manual" ? (
          <View className="px-6 mb-8">
            <Text className="text-lg font-bold text-slate-50 mb-4">Select Expenses</Text>
            {expenses.length === 0 ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-slate-400 mt-4">Loading expenses...</Text>
              </View>
            ) : (
            <View className="gap-2">
              {expenses.map((expense) => (
                <TouchableOpacity
                  key={expense.id}
                  className={`bg-slate-800 p-4 rounded-xl border flex-row items-center ${
                    selectedExpenses.includes(expense.id) ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700"
                  }`}
                  onPress={() => toggleExpenseSelection(expense.id)}
                >
                  <View className="w-5 h-5 rounded border-2 border-slate-500 mr-3 justify-center items-center bg-slate-700">
                    {selectedExpenses.includes(expense.id) && <Icon name="check" size={16} color="#ffffff" />}
                  </View>

                  <View
                    className="w-8 h-8 rounded-2xl justify-center items-center mr-3"
                    style={{ backgroundColor: getCategoryColor(expense.category) + "20" }}
                  >
                    <Icon
                      name={getCategoryIcon(expense.category)}
                      size={16}
                      color={getCategoryColor(expense.category)}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-sm font-medium text-slate-50 mb-1">{expense.description}</Text>
                    <View className="flex-row gap-2">
                      <Text className="text-xs text-slate-400">{expense.category}</Text>
                      <Text className="text-xs text-slate-500">{new Date(expense.date).toLocaleDateString()}</Text>
                    </View>
                  </View>

                  <Text className="text-sm font-bold text-slate-50">${expense.amount.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            )}
          </View>
        ) : (
          <View className="px-6 mb-8">
            <Text className="text-lg font-bold text-slate-50 mb-4">Select Month & Year</Text>
            <TouchableOpacity
              className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-row items-center justify-between"
              onPress={() => setShowMonthModal(true)}
            >
              <View>
                <Text className="text-base font-medium text-slate-50">
                  {months[selectedMonth]} {selectedYear}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {getExpensesForMonth(selectedMonth, selectedYear).length} expenses
                </Text>
              </View>
              <Icon name="calendar" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}

        {/* How it Works */}
        <View className="px-6 mb-8">
          <Text className="text-lg font-bold text-slate-50 mb-4">🎯 How it Works:</Text>
          <View className="gap-4 mb-4">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-emerald-500 justify-center items-center mr-3">
                <Text className="text-xs font-bold text-white">1</Text>
              </View>
              <Text className="text-sm text-slate-300 flex-1">Select a prediction from your saved models</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-emerald-500 justify-center items-center mr-3">
                <Text className="text-xs font-bold text-white">2</Text>
              </View>
              <Text className="text-sm text-slate-300 flex-1">Choose expenses (either manually or by month)</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full bg-emerald-500 justify-center items-center mr-3">
                <Text className="text-xs font-bold text-white">3</Text>
              </View>
              <Text className="text-sm text-slate-300 flex-1">Get insights with visual variance analysis</Text>
            </View>
          </View>
          <View className="flex-row items-center bg-amber-500/20 p-3 rounded-lg">
            <Icon name="bulb" size={16} color="#f59e0b" />
            <Text className="text-xs text-amber-500 ml-2 flex-1">
              Tip: Compare monthly to spot spending trends over time
            </Text>
          </View>
        </View>

        {/* Run Comparison Button */}
        <View className="px-6 pb-8">
          <TouchableOpacity
            className={`flex-row items-center justify-center py-4 rounded-xl gap-2 ${
              !selectedPrediction ||
              (comparisonMode === "manual" && selectedExpenses.length === 0) ||
              (comparisonMode === "monthly" && getExpensesForMonth(selectedMonth, selectedYear).length === 0)
                ? "bg-slate-700 opacity-50"
                : "bg-emerald-500"
            }`}
            onPress={runComparison}
            disabled={
              !selectedPrediction ||
              (comparisonMode === "manual" && selectedExpenses.length === 0) ||
              (comparisonMode === "monthly" && getExpensesForMonth(selectedMonth, selectedYear).length === 0)
            }
          >
            <Icon name="play" size={20} color="#ffffff" />
            <Text className="text-base font-bold text-white">Run Comparison</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PredictionModal />
      <MonthModal />
      <ResultsModal />
    </SafeAreaView>
  )
}
