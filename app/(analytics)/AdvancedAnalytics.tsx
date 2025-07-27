"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/Feather"
import { LineChart, PieChart } from "react-native-chart-kit"

const { width } = Dimensions.get("window")

export default function AdvancedAnalyticsScreen({ navigation }) {
  const [selectedDataType, setSelectedDataType] = useState("expenses") // "expenses" or "predictions"
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedTab, setSelectedTab] = useState("overview")

  // Mock data - replace with actual API calls
  const expensesData = [
    {
      id: "e4cb6ccb-6993-4181-a6b7-5485f4a61c99",
      user_id: "d02a410c-85b9-4b14-b9d1-1cc24b40dff3",
      amount: 78.25,
      category: "Shopping",
      description: "Xayaat Supermarket",
      date: "2025-07-10",
      payment_method: "credit_card",
      is_recurring: true,
      recurrence_interval: "monthly",
      is_essential: false,
      tags: null,
      created_at: "2025-07-10T17:51:46.859373+00:00",
      updated_at: "2025-07-10T18:51:11.884236+00:00",
      receipt_url: null,
    },
    {
      id: "a5863bb5-a961-4a53-b4ba-108dc08eca56",
      user_id: "d02a410c-85b9-4b14-b9d1-1cc24b40dff3",
      amount: 120.0,
      category: "Education",
      description: "College",
      date: "2025-07-08",
      payment_method: "digital_wallet",
      is_recurring: true,
      recurrence_interval: "monthly",
      is_essential: true,
      tags: null,
      created_at: "2025-07-10T18:31:08.575787+00:00",
      updated_at: "2025-07-10T18:56:27.79942+00:00",
      receipt_url: null,
    },
    {
      id: "4ad4853c-ff0a-45a2-8d76-300fe389cbb1",
      user_id: "d02a410c-85b9-4b14-b9d1-1cc24b40dff3",
      amount: 25.0,
      category: "Utilities",
      description: "Water 💧",
      date: "2025-07-11",
      payment_method: "cash",
      is_recurring: true,
      recurrence_interval: "monthly",
      is_essential: true,
      tags: [],
      created_at: "2025-07-11T07:42:01.716648+00:00",
      updated_at: "2025-07-11T07:42:01.716648+00:00",
      receipt_url: null,
    },
    {
      id: "e6094e52-e9a7-45a8-96b0-0865304c4162",
      user_id: "d02a410c-85b9-4b14-b9d1-1cc24b40dff3",
      amount: 85.0,
      category: "Utilities",
      description: "Electricity",
      date: "2025-07-11",
      payment_method: "digital_wallet",
      is_recurring: true,
      recurrence_interval: "monthly",
      is_essential: true,
      tags: [],
      created_at: "2025-07-11T07:44:09.046425+00:00",
      updated_at: "2025-07-11T07:44:09.046425+00:00",
      receipt_url: null,
    },
    {
      id: "61485603-4c97-4f5f-9f0b-1cc8a3993554",
      user_id: "d02a410c-85b9-4b14-b9d1-1cc24b40dff3",
      amount: 185.0,
      category: "Other",
      description: "SAN FRANCISCO, CA 94105 Purchase",
      date: "2025-07-11",
      payment_method: "credit_card",
      is_recurring: true,
      recurrence_interval: "weekly",
      is_essential: true,
      tags: [],
      created_at: "2025-07-11T14:53:15.882277+00:00",
      updated_at: "2025-07-11T14:53:15.882277+00:00",
      receipt_url: "https://gfbgdcznzcegvutlncuv.supabase.co/storage/v1/object/public/receipts/1752245419953.jpeg",
    },
    {
      id: "2439ce79-8bcc-4172-8eb9-0a0f94cd71eb",
      user_id: "d02a410c-85b9-4b14-b9d1-1cc24b40dff3",
      amount: 55.76,
      category: "Other",
      description: "APPLEBEE'S GRILL + BAR Purchase",
      date: "2025-07-11",
      payment_method: "cash",
      is_recurring: false,
      recurrence_interval: null,
      is_essential: false,
      tags: [],
      created_at: "2025-07-11T15:10:47.415302+00:00",
      updated_at: "2025-07-11T15:10:47.415302+00:00",
      receipt_url: "https://gfbgdcznzcegvutlncuv.supabase.co/storage/v1/object/public/receipts/1752246627892.png",
    },
    {
      id: "15dffe10-771a-40c2-956c-5e0f042ca704",
      user_id: "77c89a32-cbe0-4278-9e7f-86bac34a1e76",
      amount: 200.0,
      category: "Transport",
      description: "Bajaaj",
      date: "2025-07-16",
      payment_method: "cash",
      is_recurring: true,
      recurrence_interval: "monthly",
      is_essential: true,
      tags: null,
      created_at: "2025-07-16T04:58:07.447044+00:00",
      updated_at: "2025-07-27T05:26:26.866985+00:00",
      receipt_url: null,
    },
    {
      id: "a2e82247-e0f7-4ba1-bdce-493d93ce2647",
      user_id: "77c89a32-cbe0-4278-9e7f-86bac34a1e76",
      amount: 277.02,
      category: "Other",
      description: "EPIC STEAKHOUSE Purchase",
      date: "2025-07-11",
      payment_method: "cash",
      is_recurring: false,
      recurrence_interval: null,
      is_essential: false,
      tags: [],
      created_at: "2025-07-11T15:13:24.375047+00:00",
      updated_at: "2025-07-27T05:26:37.695826+00:00",
      receipt_url: "https://gfbgdcznzcegvutlncuv.supabase.co/storage/v1/object/public/receipts/1752246787705.jpeg",
    },
    {
      id: "7ce10328-8242-4ea8-aa25-04197204f71f",
      user_id: "77c89a32-cbe0-4278-9e7f-86bac34a1e76",
      amount: 10.0,
      category: "Healthcare",
      description: "Hospital shiine",
      date: "2025-07-13",
      payment_method: "cash",
      is_recurring: false,
      recurrence_interval: null,
      is_essential: true,
      tags: [],
      created_at: "2025-07-13T16:18:12.781382+00:00",
      updated_at: "2025-07-27T05:26:43.867059+00:00",
      receipt_url: null,
    },
    {
      id: "0f408d0d-e3ef-4a27-ba10-befa7e86d180",
      user_id: "77c89a32-cbe0-4278-9e7f-86bac34a1e76",
      amount: 100.0,
      category: "Food",
      description: "Bariis",
      date: "2025-07-16",
      payment_method: "digital_wallet",
      is_recurring: false,
      recurrence_interval: null,
      is_essential: true,
      tags: null,
      created_at: "2025-07-16T04:55:11.422318+00:00",
      updated_at: "2025-07-27T05:26:54.854599+00:00",
      receipt_url: null,
    },
  ]

  const predictionsData = [
    {
      id: "03ab50ad-beb2-4bb8-8b39-c2783ec3f11a",
      user_id: "77c89a32-cbe0-4278-9e7f-86bac34a1e76",
      input_data: {
        Region: "Banadir",
        Residence_Type: "Urban",
        Business_Revenue: 0.0,
        Food_Expenditure: 11337.02,
        Number_of_Members: 0,
        Housing_Expenditure: 4200.0,
        NonFood_Expenditure: 17336.29,
        Transport_Expenditure: 2097.88,
        Utilities_Expenditure: 1446.44,
        Livestock_Byproducts_Value: 210.0,
        General_NonFood_Expenditure: 0.0,
        Spent_on_Food_Drink_Outside: 0.0,
      },
      predicted_exp: 32806.75,
      model_used: "RF",
      created_at: "2025-07-26T14:00:49.074181+00:00",
    },
    {
      id: "d372562e-0ded-422c-ac1d-1a47dd8b0cf9",
      user_id: "77c89a32-cbe0-4278-9e7f-86bac34a1e76",
      input_data: {
        Region: "Banadir",
        Residence_Type: "Urban",
        Business_Revenue: 0.0,
        Food_Expenditure: 3000.0,
        Number_of_Members: 8,
        Housing_Expenditure: 600.0,
        NonFood_Expenditure: 2000.0,
        Transport_Expenditure: 800.0,
        Utilities_Expenditure: 50.0,
        Livestock_Byproducts_Value: 210.0,
        General_NonFood_Expenditure: 0.0,
        Spent_on_Food_Drink_Outside: 0.0,
      },
      predicted_exp: 5648.44,
      model_used: "RF",
      created_at: "2025-07-27T05:32:54.5513+00:00",
    },
  ]

  const periods = [
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "quarter", label: "Quarter" },
    { key: "year", label: "Year" },
  ]

  const tabs = [
    { key: "overview", label: "Overview", icon: "bar-chart-2" },
    { key: "categories", label: "Categories", icon: "pie-chart" },
    { key: "trends", label: "Trends", icon: "trending-up" },
    { key: "insights", label: "Insights", icon: "lightbulb" },
  ]

  const chartConfig = {
    backgroundColor: "#1e293b",
    backgroundGradientFrom: "#1e293b",
    backgroundGradientTo: "#1e293b",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(248, 250, 252, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#10b981",
    },
  }

  // Process expense data
  const processExpenseData = () => {
    const categoryTotals = {}
    const paymentMethodTotals = {}
    const recurringVsOneTime = { recurring: 0, oneTime: 0 }
    const essentialVsNonEssential = { essential: 0, nonEssential: 0 }

    let totalAmount = 0

    expensesData.forEach((expense) => {
      totalAmount += expense.amount

      // Category breakdown
      if (categoryTotals[expense.category]) {
        categoryTotals[expense.category] += expense.amount
      } else {
        categoryTotals[expense.category] = expense.amount
      }

      // Payment method breakdown
      if (paymentMethodTotals[expense.payment_method]) {
        paymentMethodTotals[expense.payment_method] += expense.amount
      } else {
        paymentMethodTotals[expense.payment_method] = expense.payment_method
      }

      // Recurring vs One-time
      if (expense.is_recurring) {
        recurringVsOneTime.recurring += expense.amount
      } else {
        recurringVsOneTime.oneTime += expense.amount
      }

      // Essential vs Non-essential
      if (expense.is_essential) {
        essentialVsNonEssential.essential += expense.amount
      } else {
        essentialVsNonEssential.nonEssential += expense.amount
      }
    })

    return {
      totalAmount,
      categoryTotals,
      paymentMethodTotals,
      recurringVsOneTime,
      essentialVsNonEssential,
      transactionCount: expensesData.length,
    }
  }

  // Process prediction data
  const processPredictionData = () => {
    const predictions = predictionsData.map((pred) => ({
      ...pred,
      monthlyPrediction: pred.predicted_exp / 12,
    }))

    const avgPrediction = predictions.reduce((sum, pred) => sum + pred.predicted_exp, 0) / predictions.length
    const avgMonthlyPrediction = avgPrediction / 12

    // Extract input data categories
    const inputCategories = {}
    predictions.forEach((pred) => {
      Object.keys(pred.input_data).forEach((key) => {
        if (key.includes("Expenditure")) {
          const categoryName = key.replace("_Expenditure", "").replace("_", " ")
          if (inputCategories[categoryName]) {
            inputCategories[categoryName] += pred.input_data[key]
          } else {
            inputCategories[categoryName] = pred.input_data[key]
          }
        }
      })
    })

    return {
      predictions,
      avgPrediction,
      avgMonthlyPrediction,
      inputCategories,
      predictionCount: predictions.length,
    }
  }

  const expenseAnalysis = processExpenseData()
  const predictionAnalysis = processPredictionData()

  // Create chart data based on selected data type
  const createCategoryChartData = () => {
    const data = selectedDataType === "expenses" ? expenseAnalysis.categoryTotals : predictionAnalysis.inputCategories
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b", "#06b6d4", "#84cc16"]

    return Object.entries(data).map(([category, amount], index) => ({
      name: category,
      population: amount,
      color: colors[index % colors.length],
      legendFontColor: "#f8fafc",
      legendFontSize: 12,
    }))
  }

  const createTrendData = () => {
    if (selectedDataType === "expenses") {
      // Group expenses by date for trend analysis
      const dateGroups = {}
      expensesData.forEach((expense) => {
        const date = expense.date
        if (dateGroups[date]) {
          dateGroups[date] += expense.amount
        } else {
          dateGroups[date] = expense.amount
        }
      })

      const sortedDates = Object.keys(dateGroups).sort()
      const last7Days = sortedDates.slice(-7)

      return {
        labels: last7Days.map((date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
        datasets: [
          {
            data: last7Days.map((date) => dateGroups[date] || 0),
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      }
    } else {
      // Prediction trend over time
      const sortedPredictions = predictionsData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

      return {
        labels: sortedPredictions.map((_, index) => `P${index + 1}`),
        datasets: [
          {
            data: sortedPredictions.map((pred) => pred.predicted_exp / 12), // Monthly equivalent
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      }
    }
  }

  const renderOverviewTab = () => (
    <View className="gap-5">
      {/* Summary Cards */}
      <View className="flex-row gap-3">
        <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
          <Text className="text-slate-400 text-sm mb-1">
            {selectedDataType === "expenses" ? "Total Spent" : "Avg Prediction"}
          </Text>
          <Text className="text-white text-2xl font-bold">
            $
            {selectedDataType === "expenses"
              ? expenseAnalysis.totalAmount.toFixed(2)
              : predictionAnalysis.avgMonthlyPrediction.toFixed(2)}
          </Text>
          <Text className="text-slate-400 text-xs mt-1">
            {selectedDataType === "expenses"
              ? `${expenseAnalysis.transactionCount} transactions`
              : "Monthly equivalent"}
          </Text>
        </View>

        <View className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
          <Text className="text-slate-400 text-sm mb-1">
            {selectedDataType === "expenses" ? "Categories" : "Predictions Made"}
          </Text>
          <Text className="text-white text-2xl font-bold">
            {selectedDataType === "expenses"
              ? Object.keys(expenseAnalysis.categoryTotals).length
              : predictionAnalysis.predictionCount}
          </Text>
          <Text className="text-slate-400 text-xs mt-1">
            {selectedDataType === "expenses" ? "Active categories" : "Total predictions"}
          </Text>
        </View>
      </View>

      {/* Main Chart */}
      <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <Text className="text-white text-lg font-bold mb-4">
          {selectedDataType === "expenses" ? "Spending Trend" : "Prediction Trend"}
        </Text>
        <LineChart
          data={createTrendData()}
          width={width - 68}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: 16 }}
        />
      </View>

      {/* Quick Stats */}
      {selectedDataType === "expenses" && (
        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Expense Breakdown</Text>

          <View className="gap-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-300">Recurring Expenses</Text>
              <Text className="text-emerald-400 font-bold">
                ${expenseAnalysis.recurringVsOneTime.recurring.toFixed(2)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-300">One-time Expenses</Text>
              <Text className="text-blue-400 font-bold">${expenseAnalysis.recurringVsOneTime.oneTime.toFixed(2)}</Text>
            </View>

            <View className="h-px bg-slate-700 my-2" />

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-300">Essential</Text>
              <Text className="text-emerald-400 font-bold">
                ${expenseAnalysis.essentialVsNonEssential.essential.toFixed(2)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-300">Non-Essential</Text>
              <Text className="text-amber-400 font-bold">
                ${expenseAnalysis.essentialVsNonEssential.nonEssential.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {selectedDataType === "predictions" && (
        <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <Text className="text-white text-lg font-bold mb-4">Prediction Details</Text>

          <View className="gap-4">
            {predictionAnalysis.predictions.map((pred, index) => (
              <View key={pred.id} className="bg-slate-700 p-4 rounded-lg">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-white font-semibold">Prediction #{index + 1}</Text>
                  <Text className="text-emerald-400 font-bold">${pred.predicted_exp.toFixed(2)}</Text>
                </View>
                <Text className="text-slate-400 text-sm">
                  Monthly: ${pred.monthlyPrediction.toFixed(2)} | Model: {pred.model_used}
                </Text>
                <Text className="text-slate-400 text-xs mt-1">
                  {pred.input_data.Region} • {pred.input_data.Residence_Type} • {pred.input_data.Number_of_Members}{" "}
                  members
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )

  const renderCategoriesTab = () => (
    <View className="gap-5">
      {/* Category Pie Chart */}
      <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <Text className="text-white text-lg font-bold mb-4">
          {selectedDataType === "expenses" ? "Spending by Category" : "Input Categories"}
        </Text>
        <PieChart
          data={createCategoryChartData()}
          width={width - 68}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Category Details */}
      <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <Text className="text-white text-lg font-bold mb-4">Category Breakdown</Text>

        <View className="gap-3">
          {Object.entries(
            selectedDataType === "expenses" ? expenseAnalysis.categoryTotals : predictionAnalysis.inputCategories,
          )
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount], index) => {
              const total =
                selectedDataType === "expenses"
                  ? expenseAnalysis.totalAmount
                  : Object.values(predictionAnalysis.inputCategories).reduce((a, b) => a + b, 0)
              const percentage = ((amount / total) * 100).toFixed(1)
              const colors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"]

              return (
                <View key={category} className="gap-2">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <View
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      />
                      <Text className="text-slate-300 font-medium">{category}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-white font-bold">${amount.toFixed(2)}</Text>
                      <Text className="text-slate-400 text-xs">{percentage}%</Text>
                    </View>
                  </View>

                  <View className="h-2 bg-slate-700 rounded-full">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: colors[index % colors.length],
                      }}
                    />
                  </View>
                </View>
              )
            })}
        </View>
      </View>
    </View>
  )

  const renderTrendsTab = () => (
    <View className="gap-5">
      {/* Trend Chart */}
      <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <Text className="text-white text-lg font-bold mb-4">
          {selectedDataType === "expenses" ? "Daily Spending Trend" : "Prediction Evolution"}
        </Text>
        <LineChart
          data={createTrendData()}
          width={width - 68}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: 16 }}
        />
      </View>

      {selectedDataType === "expenses" && (
        <>
          {/* Payment Method Analysis */}
          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <Text className="text-white text-lg font-bold mb-4">Payment Methods</Text>

            <View className="gap-3">
              {Object.entries(expenseAnalysis.paymentMethodTotals).map(([method, count]) => {
                const methodCounts = {}
                expensesData.forEach((expense) => {
                  if (methodCounts[expense.payment_method]) {
                    methodCounts[expense.payment_method]++
                  } else {
                    methodCounts[expense.payment_method] = 1
                  }
                })

                const percentage = ((methodCounts[method] / expensesData.length) * 100).toFixed(1)

                return (
                  <View key={method} className="flex-row justify-between items-center">
                    <Text className="text-slate-300 capitalize">{method.replace("_", " ")}</Text>
                    <View className="items-end">
                      <Text className="text-white font-bold">{methodCounts[method]} transactions</Text>
                      <Text className="text-slate-400 text-xs">{percentage}%</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Recurrence Analysis */}
          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <Text className="text-white text-lg font-bold mb-4">Recurrence Patterns</Text>

            <View className="gap-4">
              {["monthly", "weekly", "yearly"].map((interval) => {
                const intervalExpenses = expensesData.filter((exp) => exp.recurrence_interval === interval)
                const totalAmount = intervalExpenses.reduce((sum, exp) => sum + exp.amount, 0)

                if (intervalExpenses.length === 0) return null

                return (
                  <View key={interval} className="bg-slate-700 p-4 rounded-lg">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-white font-semibold capitalize">{interval} Expenses</Text>
                      <Text className="text-emerald-400 font-bold">${totalAmount.toFixed(2)}</Text>
                    </View>
                    <Text className="text-slate-400 text-sm">
                      {intervalExpenses.length} recurring {interval} expenses
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        </>
      )}
    </View>
  )

  const renderInsightsTab = () => (
    <View className="gap-5">
      {/* Key Insights */}
      <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <Text className="text-white text-lg font-bold mb-4">Key Insights</Text>

        <View className="gap-4">
          {selectedDataType === "expenses" ? (
            <>
              <View className="flex-row items-start gap-3 bg-slate-700 p-4 rounded-lg">
                <Icon name="trending-up" size={20} color="#10b981" />
                <View className="flex-1">
                  <Text className="text-white font-semibold mb-1">Top Spending Category</Text>
                  <Text className="text-slate-300 text-sm">
                    {Object.entries(expenseAnalysis.categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0]} accounts for
                    the highest spending
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start gap-3 bg-slate-700 p-4 rounded-lg">
                <Icon name="repeat" size={20} color="#3b82f6" />
                <View className="flex-1">
                  <Text className="text-white font-semibold mb-1">Recurring vs One-time</Text>
                  <Text className="text-slate-300 text-sm">
                    {((expenseAnalysis.recurringVsOneTime.recurring / expenseAnalysis.totalAmount) * 100).toFixed(1)}%
                    of your spending is from recurring expenses
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start gap-3 bg-slate-700 p-4 rounded-lg">
                <Icon name="shield" size={20} color="#f59e0b" />
                <View className="flex-1">
                  <Text className="text-white font-semibold mb-1">Essential Spending</Text>
                  <Text className="text-slate-300 text-sm">
                    {((expenseAnalysis.essentialVsNonEssential.essential / expenseAnalysis.totalAmount) * 100).toFixed(
                      1,
                    )}
                    % of expenses are marked as essential
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View className="flex-row items-start gap-3 bg-slate-700 p-4 rounded-lg">
                <Icon name="target" size={20} color="#10b981" />
                <View className="flex-1">
                  <Text className="text-white font-semibold mb-1">Prediction Range</Text>
                  <Text className="text-slate-300 text-sm">
                    Your predictions range from $
                    {Math.min(...predictionAnalysis.predictions.map((p) => p.predicted_exp)).toFixed(2)}
                    to ${Math.max(...predictionAnalysis.predictions.map((p) => p.predicted_exp)).toFixed(2)}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start gap-3 bg-slate-700 p-4 rounded-lg">
                <Icon name="users" size={20} color="#3b82f6" />
                <View className="flex-1">
                  <Text className="text-white font-semibold mb-1">Household Size Impact</Text>
                  <Text className="text-slate-300 text-sm">
                    Predictions vary based on household size from{" "}
                    {Math.min(...predictionAnalysis.predictions.map((p) => p.input_data.Number_of_Members))}
                    to {Math.max(...predictionAnalysis.predictions.map((p) => p.input_data.Number_of_Members))} members
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start gap-3 bg-slate-700 p-4 rounded-lg">
                <Icon name="map-pin" size={20} color="#8b5cf6" />
                <View className="flex-1">
                  <Text className="text-white font-semibold mb-1">Regional Analysis</Text>
                  <Text className="text-slate-300 text-sm">
                    All predictions are for {predictionAnalysis.predictions[0]?.input_data.Region} region with{" "}
                    {predictionAnalysis.predictions[0]?.input_data.Residence_Type.toLowerCase()} residence type
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Recommendations */}
      <View className="bg-slate-800 p-5 rounded-xl border border-slate-700">
        <Text className="text-white text-lg font-bold mb-4">Recommendations</Text>

        <View className="gap-3">
          {selectedDataType === "expenses" ? (
            <>
              <View className="flex-row items-start gap-3">
                <Icon name="check-circle" size={16} color="#10b981" />
                <Text className="text-slate-300 text-sm flex-1">
                  Track more non-essential expenses to get better spending insights
                </Text>
              </View>

              <View className="flex-row items-start gap-3">
                <Icon name="check-circle" size={16} color="#10b981" />
                <Text className="text-slate-300 text-sm flex-1">
                  Consider setting up budgets for your top spending categories
                </Text>
              </View>

              <View className="flex-row items-start gap-3">
                <Icon name="check-circle" size={16} color="#10b981" />
                <Text className="text-slate-300 text-sm flex-1">
                  Review recurring expenses monthly to identify potential savings
                </Text>
              </View>
            </>
          ) : (
            <>
              <View className="flex-row items-start gap-3">
                <Icon name="check-circle" size={16} color="#10b981" />
                <Text className="text-slate-300 text-sm flex-1">
                  Make more predictions with different scenarios to improve accuracy
                </Text>
              </View>

              <View className="flex-row items-start gap-3">
                <Icon name="check-circle" size={16} color="#10b981" />
                <Text className="text-slate-300 text-sm flex-1">
                  Compare predictions with actual expenses to validate model performance
                </Text>
              </View>

              <View className="flex-row items-start gap-3">
                <Icon name="check-circle" size={16} color="#10b981" />
                <Text className="text-slate-300 text-sm flex-1">
                  Update input parameters regularly for more accurate predictions
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  )

  const renderTabContent = () => {
    switch (selectedTab) {
      case "overview":
        return renderOverviewTab()
      case "categories":
        return renderCategoriesTab()
      case "trends":
        return renderTrendsTab()
      case "insights":
        return renderInsightsTab()
      default:
        return renderOverviewTab()
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-700">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Advanced Analytics</Text>
        <TouchableOpacity>
          <Icon name="settings" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Data Type Selector */}
      <View className="flex-row px-6 py-4 gap-2">
        <TouchableOpacity
          className={`flex-1 py-3 px-4 rounded-xl border ${
            selectedDataType === "expenses" ? "bg-emerald-500 border-emerald-500" : "bg-slate-800 border-slate-700"
          }`}
          onPress={() => setSelectedDataType("expenses")}
        >
          <Text
            className={`text-center font-semibold ${selectedDataType === "expenses" ? "text-white" : "text-slate-300"}`}
          >
            Expenses Analysis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-3 px-4 rounded-xl border ${
            selectedDataType === "predictions" ? "bg-blue-500 border-blue-500" : "bg-slate-800 border-slate-700"
          }`}
          onPress={() => setSelectedDataType("predictions")}
        >
          <Text
            className={`text-center font-semibold ${
              selectedDataType === "predictions" ? "text-white" : "text-slate-300"
            }`}
          >
            Predictions Analysis
          </Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View className="flex-row px-6 py-2 gap-2">
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            className={`flex-1 py-2 px-3 rounded-lg border ${
              selectedPeriod === period.key ? "bg-emerald-500 border-emerald-500" : "bg-slate-800 border-slate-700"
            }`}
            onPress={() => setSelectedPeriod(period.key)}
          >
            <Text
              className={`text-center text-sm font-medium ${
                selectedPeriod === period.key ? "text-white" : "text-slate-400"
              }`}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Navigation */}
      <View className="border-b border-slate-700">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: 8 }}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              className={`flex-row items-center py-2 px-4 rounded-full border ${
                selectedTab === tab.key ? "bg-emerald-500 border-emerald-500" : "bg-slate-800 border-slate-700"
              }`}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Icon name={tab.icon} size={16} color={selectedTab === tab.key ? "#ffffff" : "#94a3b8"} />
              <Text className={`ml-2 text-sm font-medium ${selectedTab === tab.key ? "text-white" : "text-slate-400"}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-5">{renderTabContent()}</View>
      </ScrollView>
    </SafeAreaView>
  )
}
