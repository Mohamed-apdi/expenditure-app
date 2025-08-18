import { getItemAsync } from "expo-secure-store";

// Report API functions
export const REAL_API_URL = 'https://expenditure-api-ez17.onrender.com';

export interface TransactionReport {
  summary: {
    total_amount: number;
    total_transactions: number;
    average_transaction: number;
    period: string;
  };
  category_breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
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

export interface AccountReport {
  summary: {
    total_accounts: number;
    total_balance: number;
    account_types: number;
  };
  accounts: any[];
  by_type: Record<string, {
    count: number;
    total_balance: number;
    accounts: any[];
  }>;
}

export interface BudgetReport {
  summary: {
    total_budget: number;
    total_spent: number;
    total_remaining: number;
    overall_percentage_used: number;
  };
  budget_analysis: Array<{
    category: string;
    budget_amount: number;
    spent_amount: number;
    remaining: number;
    percentage_used: number;
  }>;
  budgets: any[];
}

export interface SubscriptionReport {
  summary: {
    total_subscriptions: number;
    total_monthly_cost: number;
    total_yearly_cost: number;
  };
  subscriptions: any[];
  by_category: Record<string, {
    count: number;
    total_monthly_cost: number;
    subscriptions: any[];
  }>;
}

export interface GoalReport {
  summary: {
    total_goals: number;
    active_goals: number;
    completed_goals: number;
    total_target: number;
    total_saved: number;
    total_progress: number;
  };
  goals: any[];
  active_goals: any[];
  completed_goals: any[];
}

// Get auth token from Supabase
const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

// Generic API call function
const apiCall = async (endpoint: string, params?: Record<string, any>) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  const url = new URL(`${REAL_API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

// Transaction Reports
export const getTransactionReports = async (startDate: string, endDate: string): Promise<TransactionReport> => {
  return apiCall('/reports/transactions', { start_date: startDate, end_date: endDate });
};

// Account Reports
export const getAccountReports = async (): Promise<AccountReport> => {
  return apiCall('/reports/accounts');
};

// Budget Reports
export const getBudgetReports = async (): Promise<BudgetReport> => {
  return apiCall('/reports/budget');
};

// Subscription Reports
export const getSubscriptionReports = async (): Promise<SubscriptionReport> => {
  return apiCall('/reports/subscriptions');
};

// Goal Reports
export const getGoalReports = async (): Promise<GoalReport> => {
  return apiCall('/reports/goals');
};

// Download Reports
export const downloadReport = async (
  reportType: string,
  format: 'csv' | 'pdf' = 'csv',
  startDate?: string,
  endDate?: string
) => {
  const params: Record<string, any> = { format };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const result = await apiCall(`/reports/download/${reportType}`, params);
  
  if (format === 'csv') {
    // Create and download CSV file
    const blob = new Blob([result.content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } else {
    // For PDF, return the data for client-side PDF generation
    return result;
  }
};

// Generate PDF Report locally
export const generateLocalPDFReport = async (
  reportType: string,
  data: any,
  dateRange?: { startDate: string; endDate: string }
) => {
  try {
    const { generatePDFReport, formatCurrencyForPDF, formatPercentageForPDF } = await import('./pdfGenerator');
    
    let pdfData: any = {
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
      summary: data.summary,
      charts: [],
      tables: [],
    };

    if (dateRange) {
      pdfData.dateRange = `${dateRange.startDate} to ${dateRange.endDate}`;
    }

    // Generate tables based on report type
    switch (reportType) {
      case 'transactions':
        pdfData.tables.push({
          title: 'Category Breakdown',
          headers: ['Category', 'Amount', 'Percentage'],
          rows: data.category_breakdown.map((item: any) => [
            item.category,
            formatCurrencyForPDF(item.amount),
            formatPercentageForPDF(item.percentage)
          ])
        });
        break;
      
      case 'accounts':
        pdfData.tables.push({
          title: 'Account Details',
          headers: ['Name', 'Type', 'Balance'],
          rows: data.accounts.map((account: any) => [
            account.name,
            account.type,
            formatCurrencyForPDF(account.balance)
          ])
        });
        break;
      
      case 'budget':
        pdfData.tables.push({
          title: 'Budget Analysis',
          headers: ['Category', 'Budget', 'Spent', 'Remaining', 'Percentage Used'],
          rows: data.budget_analysis.map((item: any) => [
            item.category,
            formatCurrencyForPDF(item.budget_amount),
            formatCurrencyForPDF(item.spent_amount),
            formatCurrencyForPDF(item.remaining),
            formatPercentageForPDF(item.percentage_used)
          ])
        });
        break;
      
      case 'subscriptions':
        pdfData.tables.push({
          title: 'Subscription Details',
          headers: ['Name', 'Category', 'Monthly Cost', 'Billing Cycle'],
          rows: data.subscriptions.map((sub: any) => [
            sub.name,
            sub.category,
            formatCurrencyForPDF(sub.monthly_cost),
            sub.billing_cycle
          ])
        });
        break;
      
      case 'goals':
        pdfData.tables.push({
          title: 'Goal Progress',
          headers: ['Name', 'Target', 'Current', 'Progress', 'Status'],
          rows: data.goals.map((goal: any) => {
            const progress = (goal.current_amount / goal.target_amount * 100);
            return [
              goal.name,
              formatCurrencyForPDF(goal.target_amount),
              formatCurrencyForPDF(goal.current_amount),
              formatPercentageForPDF(progress),
              goal.status
            ];
          })
        });
        break;
    }

    const filePath = await generatePDFReport(pdfData);
    return filePath;
  } catch (error) {
    console.error('Error generating local PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Helper function to format percentage
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Helper function to format date
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
