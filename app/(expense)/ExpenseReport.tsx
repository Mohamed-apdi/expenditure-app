import type React from "react";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Download,
  FileText,
  Filter,
  Calendar,
  ChevronDown,
  ShoppingCart,
  Truck,
  Zap,
  Film,
  Heart,
  ShoppingBag,
  Book,
  MoreHorizontal,
  TrendingDown,
  Share,
  X,
  Check,
} from "lucide-react-native";
import { supabase } from "~/lib/supabase";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
} from "date-fns";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import * as MediaLibrary from "expo-media-library";
import { useTheme } from "~/lib/theme";

type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_method: string;
  created_at: string;
};

type DateRange = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

type Category = {
  key: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
};

export default function ExpenseReportScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("today");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const theme = useTheme();
  const dateRanges: DateRange[] = [
    {
      key: "today",
      label: "Today",
      start: new Date(new Date().setHours(0, 0, 0, 0)),
      end: new Date(new Date().setHours(23, 59, 59, 999)),
    },
    {
      key: "this_month",
      label: "This Month",
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    },
    {
      key: "last_month",
      label: "Last Month",
      start: startOfMonth(subMonths(new Date(), 1)),
      end: endOfMonth(subMonths(new Date(), 1)),
    },
    {
      key: "this_year",
      label: "This Year",
      start: startOfYear(new Date()),
      end: endOfYear(new Date()),
    },
    {
      key: "last_3_months",
      label: "Last 3 Months",
      start: startOfMonth(subMonths(new Date(), 2)),
      end: endOfMonth(new Date()),
    },
  ];

  const categories: Category[] = [
    {
      key: "all",
      label: "All Categories",
      icon: MoreHorizontal,
      color: "#64748b",
    },
    { key: "Food", label: "Food", icon: ShoppingCart, color: "#10b981" },
    { key: "Transport", label: "Transport", icon: Truck, color: "#3b82f6" },
    { key: "Utilities", label: "Utilities", icon: Zap, color: "#f59e0b" },
    {
      key: "Entertainment",
      label: "Entertainment",
      icon: Film,
      color: "#8b5cf6",
    },
    { key: "Healthcare", label: "Healthcare", icon: Heart, color: "#ef4444" },
    { key: "Shopping", label: "Shopping", icon: ShoppingBag, color: "#06b6d4" },
    { key: "Education", label: "Education", icon: Book, color: "#84cc16" },
    { key: "Other", label: "Other", icon: MoreHorizontal, color: "#64748b" },
  ];

  useEffect(() => {
    fetchExpenses();
  }, [selectedDateRange, selectedCategory]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const selectedRange = dateRanges.find(
        (range) => range.key === selectedDateRange
      );
      if (!selectedRange) return;

      let query = supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", selectedRange.start.toISOString().split("T")[0])
        .lte("date", selectedRange.end.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      Alert.alert("Error", "Failed to load expense data");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find((cat) => cat.key === category);
    return categoryData?.icon || MoreHorizontal;
  };

  const getCategoryColor = (category: string) => {
    const categoryData = categories.find((cat) => cat.key === category);
    return categoryData?.color || "#64748b";
  };

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      // 1. Generate HTML content
      let htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f2f2f2; text-align: left; padding: 8px; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Expense Report</h1>
        <p class="total">Total: $${totalAmount.toFixed(2)}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Payment Method</th>
            </tr>
          </thead>
          <tbody>
            ${expenses
              .map(
                (e) => `
                <tr>
                  <td>${format(new Date(e.date), "MMM d, yyyy")}</td>
                  <td>${e.description}</td>
                  <td>${e.category}</td>
                  <td>$${e.amount.toFixed(2)}</td>
                  <td>${e.payment_method}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
    `;

      // 1️⃣ generate PDF into your app’s cache
      const { uri: cacheUri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 612,
        height: 792,
      });

      // only Android needs SAF
      if (Platform.OS === "android") {
        // 2️⃣ ask the user to pick a directory
        const { granted, directoryUri } =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        console.log("SAF granted?", granted, "directoryUri:", directoryUri);
        if (!granted || !directoryUri) {
          setExporting(null);
          Alert.alert(
            "Permission required",
            "You must pick a folder before saving."
          );
          return;
        }

        // 3️⃣ create the file inside that folder
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `ExpenseReport_${dateStr}.pdf`;
        const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
          directoryUri,
          fileName,
          "application/pdf"
        );
        console.log("Created SAF file:", safUri);

        // 4️⃣ copy the bytes from cache → SAF file
        const base64 = await FileSystem.readAsStringAsync(cacheUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.writeAsStringAsync(safUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setExporting(null);
        // 5️⃣ success!
        Alert.alert("Saved", `PDF saved as ${fileName}`, [{ text: "OK" }]);
      } else {
        // iOS or Web: just share the cached file
        await Sharing.shareAsync(cacheUri);
      }
    } catch (err) {
      console.error("PDF save failed:", err);
      setExporting(null);
      Alert.alert("Error", "Failed to save PDF. Please try again.");
    }
  };
  async function handleExportCSV() {
    setExporting("csv"); // start the spinner

    try {
      // 1. Build your CSV string
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `expense-report-${dateStr}.csv`;
      let csvContent = "Date,Description,Category,Amount,Payment Method\n";
      expenses.forEach(
        ({ date, description, category, amount, payment_method }) => {
          const safeDesc = description.replace(/"/g, '""');
          csvContent += `"${date}","${safeDesc}","${category}",${amount},"${payment_method}"\n`;
        }
      );

      if (Platform.OS === "android") {
        // 2. Ask the user to pick a folder
        const { granted, directoryUri } =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!granted || !directoryUri) {
          Alert.alert("Permission required", "You must pick a folder first.");
          return;
        }

        // 3. Create the file there
        const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
          directoryUri,
          fileName,
          "text/csv"
        );

        // 4. Write your CSV text directly (UTF-8)
        await FileSystem.writeAsStringAsync(safUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // 5. Let the user know
        Alert.alert("Saved", `CSV saved as ${fileName}`, [{ text: "OK" }]);
      } else {
        // iOS/Web: just share the CSV directly from app cache
        const cacheUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(cacheUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await Sharing.shareAsync(cacheUri, {
          mimeType: "text/csv",
          dialogTitle: "Share Expense Report",
        });
      }
    } catch (err) {
      console.error("CSV save failed:", err);
      Alert.alert("Error", "Failed to save CSV. Please try again.");
    } finally {
      setExporting(null); // stop the spinner
    }
  }
  const getSelectedDateLabel = () => {
    const range = dateRanges.find((r) => r.key === selectedDateRange);
    return range?.label || "Select Date Range";
  };

  const getSelectedCategoryLabel = () => {
    const category = categories.find((c) => c.key === selectedCategory);
    return category?.label || "All Categories";
  };

  const groupExpensesByDate = (expenses: Expense[]) => {
    const groups: Record<string, Expense[]> = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      const dateKey = format(date, "MMMM d, yyyy");

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(expense);
    });

    return groups;
  };

  const groupedExpenses = groupExpensesByDate(expenses);

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
    >
      {/* Header */}
      <View
        className="flex-row justify-start gap-6 items-center px-6 py-4 border-b border-slate-700"
        style={{ borderColor: theme.border }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text
          className="text-white text-xl font-bold"
          style={{ color: theme.text }}
        >
          Expense Report
        </Text>
      </View>

      {/* Total Amount Display */}
      <View
        className="px-6 py-8 items-center bg-slate-800/50"
        style={{ backgroundColor: `${theme.cardBackground}` }}
      >
        <Text
          className="text-slate-400 text-lg mb-2"
          style={{ color: theme.textSecondary }}
        >
          Total Spent
        </Text>
        <Text className="text-rose-500 text-4xl font-bold mb-1">
          ${totalAmount.toFixed(2)}
        </Text>
        <View className="flex-row items-center">
          <TrendingDown size={16} color="#ef4444" />
          <Text
            className="text-slate-400 ml-1"
            style={{ color: theme.textSecondary }}
          >
            {expenses.length} transactions
          </Text>
        </View>
      </View>

      {/* Filter Section */}
      <View
        className="px-6 py-4 border-b border-slate-700"
        style={{ borderColor: theme.border }}
      >
        <Text
          className="text-white text-lg font-bold mb-4"
          style={{ color: theme.text }}
        >
          Filters
        </Text>
        <View className="flex-row gap-3">
          {/* Date Range Filter */}
          <TouchableOpacity
            className="flex-1 flex-row items-center bg-slate-800 p-3 rounded-lg border border-slate-700"
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
            onPress={() => setShowDateFilter(true)}
          >
            <Calendar size={18} color="#10b981" />
            <Text
              className="text-white ml-2 flex-1"
              numberOfLines={1}
              style={{ color: theme.text }}
            >
              {getSelectedDateLabel()}
            </Text>
            <ChevronDown size={16} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* Category Filter */}
          <TouchableOpacity
            className="flex-1 flex-row items-center bg-slate-800 p-3 rounded-lg border border-slate-700"
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            }}
            onPress={() => setShowCategoryFilter(true)}
          >
            <Filter size={18} color="#3b82f6" />
            <Text
              className=" ml-2 flex-1"
              numberOfLines={1}
              style={{ color: theme.text }}
            >
              {getSelectedCategoryLabel()}
            </Text>
            <ChevronDown size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Export Buttons */}
      <View
        className="px-6 py-4 border-b border-slate-700"
        style={{ borderColor: theme.border }}
      >
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-rose-500 p-3 rounded-lg"
            onPress={handleExportPDF}
            disabled={exporting === "pdf"}
          >
            {exporting === "pdf" ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <FileText size={18} color="#ffffff" />
                <Text className="text-white font-semibold ml-2">
                  Download PDF
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-emerald-500 p-3 rounded-lg"
            onPress={handleExportCSV}
            disabled={exporting === "csv"}
          >
            {exporting === "csv" ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Download size={18} color="#ffffff" />
                <Text className="text-white font-semibold ml-2">
                  Download CSV
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Expense List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text
            className="text-slate-400 mt-3"
            style={{ color: theme.textSecondary }}
          >
            Loading expenses...
          </Text>
        </View>
      ) : expenses.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <FileText size={48} color={theme.primary} />
          <Text
            className="text-white text-xl font-bold mt-4 mb-2"
            style={{ color: theme.text }}
          >
            No Expenses Found
          </Text>
          <Text
            className="text-slate-400 text-center"
            style={{ color: theme.textSecondary }}
          >
            No expenses found for the selected filters. Try adjusting your date
            range or category.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {Object.entries(groupedExpenses).map(([dateKey, dayExpenses]) => (
            <View key={dateKey} className="mb-6">
              <View className="px-6 py-2">
                <Text
                  className=" font-bold text-lg"
                  style={{ color: theme.text }}
                >
                  {dateKey}
                </Text>
                <Text
                  className="text-slate-400 text-sm"
                  style={{ color: theme.textSecondary }}
                >
                  {dayExpenses.length} transaction
                  {dayExpenses.length !== 1 ? "s" : ""} • $
                  {dayExpenses
                    .reduce((sum, exp) => sum + exp.amount, 0)
                    .toFixed(2)}
                </Text>
              </View>

              <View className="px-6 gap-2">
                {dayExpenses.map((expense) => {
                  const IconComponent = getCategoryIcon(expense.category);
                  const categoryColor = getCategoryColor(expense.category);

                  return (
                    <View
                      key={expense.id}
                      className="flex-row items-center  p-4 rounded-xl border "
                      style={{
                        backgroundColor: theme.cardBackground,
                        borderColor: theme.border,
                      }}
                    >
                      <View
                        className="w-10 h-10 rounded-full justify-center items-center mr-3"
                        style={{ backgroundColor: `${categoryColor}20` }}
                      >
                        <IconComponent size={20} color={categoryColor} />
                      </View>

                      <View className="flex-1">
                        <Text
                          className=" font-semibold mb-1"
                          style={{ color: theme.text }}
                        >
                          {expense.description}
                        </Text>
                        <View className="flex-row items-center">
                          <Text
                            className=" text-sm"
                            style={{ color: theme.textSecondary }}
                          >
                            {expense.category}
                          </Text>
                          <Text className="text-slate-600 mx-2">•</Text>
                          <Text
                            className=" text-sm capitalize"
                            style={{ color: theme.textSecondary }}
                          >
                            {expense.payment_method.replace("_", " ")}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-rose-500 font-bold text-lg">
                          -${expense.amount.toFixed(2)}
                        </Text>
                        <Text
                          className=" text-xs"
                          style={{ color: theme.textSecondary }}
                        >
                          {format(new Date(expense.date), "MMM d")}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Bottom Padding */}
          <View className="h-8" />
        </ScrollView>
      )}

      {/* Date Range Filter Modal */}
      {showDateFilter && (
        <View
          className="absolute inset-0 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <View
            className="rounded-t-3xl border-t p-6"
            style={{
              backgroundColor: theme.cardBackground,
              borderTopColor: theme.border,
            }}
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold" style={{ color: theme.text }}>
                Select Date Range
              </Text>
              <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Date Range Options */}
            <View className="gap-2">
              {dateRanges.map((range) => {
                const isSelected = selectedDateRange === range.key;
                return (
                  <TouchableOpacity
                    key={range.key}
                    className="flex-row justify-between items-center p-4 rounded-xl border"
                    style={{
                      backgroundColor: isSelected
                        ? theme.primary
                        : theme.cardBackground,
                      borderColor: isSelected ? theme.primary : theme.border,
                    }}
                    onPress={() => {
                      setSelectedDateRange(range.key);
                      setShowDateFilter(false);
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? "#fff" : theme.text,
                        fontWeight: isSelected ? "400" : "normal",
                      }}
                    >
                      {range.label}
                    </Text>
                    {isSelected && <Check size={16} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Category Filter Modal */}
      {showCategoryFilter && (
        <View
          className="absolute inset-0 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <View
            className="rounded-t-3xl border-t p-6"
            style={{
              backgroundColor: theme.cardBackground,
              borderTopColor: theme.border,
            }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold" style={{ color: theme.text }}>
                Select Category
              </Text>
              <TouchableOpacity onPress={() => setShowCategoryFilter(false)}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Category List */}
            <ScrollView className="max-h-80">
              <View className="gap-2">
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  const isSelected = selectedCategory === category.key;

                  return (
                    <TouchableOpacity
                      key={category.key}
                      className="flex-row items-center justify-between p-4 rounded-xl border"
                      style={{
                        backgroundColor: isSelected
                          ? theme.primary
                          : theme.cardBackground,
                        borderColor: isSelected ? theme.primary : theme.border,
                      }}
                      onPress={() => {
                        setSelectedCategory(category.key);
                        setShowCategoryFilter(false);
                      }}
                    >
                      <View className="flex-row items-center">
                        <View
                          className="w-8 h-8 rounded-full justify-center items-center mr-3"
                          style={{
                            backgroundColor: isSelected
                              ? "#ffffff20"
                              : `${category.color}20`,
                          }}
                        >
                          <IconComponent
                            size={16}
                            color={isSelected ? "#ffffff" : category.color}
                          />
                        </View>
                        <Text
                          style={{
                            color: isSelected ? "#ffffff" : theme.text,
                            fontWeight: isSelected ? "600" : "normal",
                          }}
                        >
                          {category.label}
                        </Text>
                      </View>
                      {isSelected && <Check size={16} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
