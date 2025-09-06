import { generateCSVReport } from "../generators/csvGenerator";
import { generatePDFReport } from "../generators/pdfGenerator";

// Transaction Report Type
export interface TransactionReport {
  summary: {
    total_amount: number;
    total_income: number;
    total_expenses: number;
    total_transactions: number;
    average_transaction: number;
    period: string;
  };
  category_breakdown: {
    [category: string]: {
      amount: number;
      percentage: number;
      count: number;
      transactionIds?: string[];
    };
  };
  daily_trends: Array<{
    date: string;
    amount: number;
  }>;
  monthly_trends: Array<{
    month: string;
    amount: number;
  }>;
  transactions: any[];
}

// Utility functions
export const formatCurrency = (
  amount: number,
  currency: string = "USD"
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Local CSV Report Generator
export const generateLocalCSVReport = async (
  reportType: string,
  data: any,
  dateRange?: { startDate: string; endDate: string }
): Promise<string> => {
  // Create CSV data structure
  const csvData = {
    title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
    dateRange: dateRange
      ? `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`
      : "",
    summary: [] as Array<{ label: string; value: string }>,
    tables: [] as Array<{ title: string; headers: string[]; rows: string[][] }>,
  };

  // Add summary data
  if (data.summary) {
    Object.entries(data.summary).forEach(([key, value]: [string, any]) => {
      if (typeof value === "number") {
        csvData.summary.push({
          label: key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          value:
            key.includes("amount") ||
            key.includes("balance") ||
            key.includes("cost") ||
            key.includes("saved") ||
            key.includes("target")
              ? formatCurrency(value)
              : key.includes("percentage") || key.includes("progress")
                ? formatPercentage(value)
                : value.toString(),
        });
      } else {
        csvData.summary.push({
          label: key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          value: value.toString(),
        });
      }
    });
  }

  // Generate tables based on report type
  if (reportType === "transactions") {
    csvData.tables.push({
      title: "Category Breakdown",
      headers: ["Category", "Amount", "Percentage", "Count"],
      rows: Object.entries(data.category_breakdown).map(
        ([category, categoryData]: [string, any]) => [
          category,
          Math.abs(categoryData.amount).toString(),
          categoryData.percentage.toString(),
          categoryData.count.toString(),
        ]
      ),
    });

    // Add daily trends table if available
    if (data.daily_trends && data.daily_trends.length > 0) {
      csvData.tables.push({
        title: "Daily Spending Trends",
        headers: ["Date", "Amount"],
        rows: data.daily_trends.map((trend: any) => [
          trend.date,
          Math.abs(trend.amount).toString(),
        ]),
      });
    }
  }

  // Generate the CSV and return the file URI
  const fileUri = await generateCSVReport(csvData);
  return fileUri;
};

// Local PDF Report Generator
export const generateLocalPDFReport = async (
  reportType: string,
  data: any,
  dateRange?: { startDate: string; endDate: string }
): Promise<string> => {
  // Create PDF data structure
  const pdfData = {
    title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
    subtitle: dateRange
      ? `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`
      : "",
    dateRange: dateRange
      ? `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`
      : "",
    summary: [] as Array<{ label: string; value: string }>,
    charts: [] as any[],
    tables: [] as Array<{ title: string; headers: string[]; rows: string[][] }>,
  };

  // Add summary data
  if (data.summary) {
    Object.entries(data.summary).forEach(([key, value]: [string, any]) => {
      if (typeof value === "number") {
        pdfData.summary.push({
          label: key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          value:
            key.includes("amount") ||
            key.includes("balance") ||
            key.includes("cost") ||
            key.includes("saved") ||
            key.includes("target")
              ? formatCurrency(value)
              : key.includes("percentage") || key.includes("progress")
                ? formatPercentage(value)
                : value.toString(),
        });
      } else {
        pdfData.summary.push({
          label: key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          value: value.toString(),
        });
      }
    });
  }

  // Generate tables based on report type
  if (reportType === "transactions") {
    pdfData.tables.push({
      title: "Category Breakdown",
      headers: ["Category", "Amount", "Percentage", "Count"],
      rows: Object.entries(data.category_breakdown).map(
        ([category, categoryData]: [string, any]) => [
          category,
          formatCurrency(Math.abs(categoryData.amount)),
          formatPercentage(categoryData.percentage),
          categoryData.count.toString(),
        ]
      ),
    });

    // Add daily trends table if available
    if (data.daily_trends && data.daily_trends.length > 0) {
      pdfData.tables.push({
        title: "Daily Spending Trends",
        headers: ["Date", "Amount"],
        rows: data.daily_trends
          .slice(-15)
          .map((trend: any) => [
            formatDate(trend.date),
            formatCurrency(Math.abs(trend.amount)),
          ]),
      });
    }
  }

  // Generate the PDF and return the file URI
  const fileUri = await generatePDFReport(pdfData);
  return fileUri;
};
