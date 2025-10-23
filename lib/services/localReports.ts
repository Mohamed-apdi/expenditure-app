import { supabase } from "../database/supabase";
import type { Transaction } from "../types/types";

// Local transaction report interface (matching API structure)
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
  transactions: Transaction[];
}

export interface AccountReport {
  summary: {
    total_balance: number;
    total_accounts: number;
    total_transactions: number;
  };
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
    transaction_count: number;
    created_at: string;
  }>;
}

export interface BudgetReport {
  summary: {
    period: string;
    total_budget: number;
    total_spent: number;
    total_remaining: number;
    overall_percentage: number;
  };
  budget_comparison: Array<{
    category: string;
    budget: number;
    spent: number;
    remaining: number;
    percentage: number;
    status: string;
  }>;
  unbudgeted_spending: Record<string, number>;
}

export interface GoalReport {
  summary: {
    total_goals: number;
    total_target: number;
    total_saved: number;
    total_remaining: number;
    overall_percentage: number;
    completed_goals: number;
  };
  goals: Array<{
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    remaining: number;
    percentage: number;
    target_date: string;
    days_remaining: number;
    status: string;
    category: string;
    description?: string;
  }>;
}

export interface SubscriptionReport {
  summary: {
    total_subscriptions: number;
    monthly_cost: number;
    yearly_cost: number;
    active_subscriptions: number;
  };
  subscriptions: Array<{
    id: string;
    name: string;
    cost: number;
    billing_cycle: string;
    monthly_equivalent: number;
    yearly_equivalent: number;
    next_billing: string;
    status: string;
    category: string;
  }>;
  category_breakdown: Record<string, number>;
}

// Get transaction reports locally
export const getLocalTransactionReports = async (
  userId: string,
  accountId?: string,
  startDate?: string,
  endDate?: string
): Promise<TransactionReport> => {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId);

  // Apply filters
  if (accountId) {
    query = query.eq("account_id", accountId);
  }
  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data: transactions, error } = await query.order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions for report:", error);
    throw error;
  }

  const transactionList = transactions || [];

  // Calculate summary
  const totalIncome = transactionList
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactionList
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalAmount = totalIncome - totalExpenses;
  const averageTransaction = transactionList.length > 0
    ? transactionList.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactionList.length
    : 0;

  // Calculate category breakdown
  const categoryBreakdown: Record<string, { amount: number; percentage: number; count: number }> = {};

  transactionList.forEach(t => {
    if (t.category) {
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = { amount: 0, percentage: 0, count: 0 };
      }
      categoryBreakdown[t.category].amount += Math.abs(t.amount);
      categoryBreakdown[t.category].count += 1;
    }
  });

  // Calculate percentages
  Object.keys(categoryBreakdown).forEach(category => {
    const amount = categoryBreakdown[category].amount;
    categoryBreakdown[category].percentage = totalExpenses > 0
      ? (amount / totalExpenses) * 100
      : 0;
  });

  // Calculate daily trends
  const dailyTrends: Array<{ date: string; amount: number }> = [];
  const dailyMap = new Map<string, number>();

  transactionList.forEach(t => {
    const date = t.date;
    const amount = dailyMap.get(date) || 0;
    dailyMap.set(date, amount + (t.type === "expense" ? -Math.abs(t.amount) : t.amount));
  });

  dailyMap.forEach((amount, date) => {
    dailyTrends.push({ date, amount });
  });

  // Sort daily trends by date
  dailyTrends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate monthly trends
  const monthlyTrends: Array<{ month: string; amount: number }> = [];
  const monthlyMap = new Map<string, number>();

  transactionList.forEach(t => {
    const month = t.date.substring(0, 7); // YYYY-MM format
    const amount = monthlyMap.get(month) || 0;
    monthlyMap.set(month, amount + (t.type === "expense" ? -Math.abs(t.amount) : t.amount));
  });

  monthlyMap.forEach((amount, month) => {
    monthlyTrends.push({ month, amount });
  });

  // Sort monthly trends by month
  monthlyTrends.sort((a, b) => a.month.localeCompare(b.month));

  return {
    summary: {
      total_amount: totalAmount,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      total_transactions: transactionList.length,
      average_transaction: averageTransaction,
      period: startDate && endDate ? `${startDate} to ${endDate}` : "All time",
    },
    category_breakdown: categoryBreakdown,
    daily_trends: dailyTrends,
    monthly_trends: monthlyTrends,
    transactions: transactionList,
  };
};

// Get account reports locally
export const getLocalAccountReports = async (
  userId: string,
  accountId?: string
): Promise<AccountReport> => {
  // For account reports, always show ALL accounts regardless of selected account
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId);

  if (accountsError) {
    console.error("Error fetching accounts for report:", accountsError);
    throw accountsError;
  }

  const accountList = accounts || [];

  // Get transaction counts for each account
  const accountsWithCounts = await Promise.all(
    accountList.map(async (account) => {
      const { count } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("account_id", account.id);

      return {
        id: account.id,
        name: account.name,
        type: account.account_type,
        balance: account.amount,
        currency: account.currency || "USD",
        transaction_count: count || 0,
        created_at: account.created_at,
      };
    })
  );

  const totalBalance = accountList.reduce((sum, account) => sum + account.amount, 0);
  const totalTransactions = accountsWithCounts.reduce((sum, account) => sum + account.transaction_count, 0);

  return {
    summary: {
      total_balance: totalBalance,
      total_accounts: accountList.length,
      total_transactions: totalTransactions,
    },
    accounts: accountsWithCounts,
  };
};

// Get budget reports locally
export const getLocalBudgetReports = async (
  userId: string,
  startDate?: string,
  endDate?: string,
  accountId?: string
): Promise<BudgetReport> => {
  // Fetch budgets
  let budgetQuery = supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (accountId) {
    budgetQuery = budgetQuery.eq("account_id", accountId);
  }

  const { data: budgets, error: budgetError } = await budgetQuery.order("created_at", { ascending: false });

  if (budgetError) {
    console.error("Error fetching budgets for report:", budgetError);
    throw budgetError;
  }

  const budgetList = budgets || [];

  if (budgetList.length === 0) {
    return {
      summary: {
        period: startDate && endDate ? `${startDate} to ${endDate}` : "All time",
        total_budget: 0,
        total_spent: 0,
        total_remaining: 0,
        overall_percentage: 0,
      },
      budget_comparison: [],
      unbudgeted_spending: {},
    };
  }

  // Calculate date range for spending analysis
  const analysisStartDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const analysisEndDate = endDate || new Date().toISOString().split('T')[0];

  // Fetch transactions for spending analysis
  let transactionQuery = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", analysisStartDate)
    .lte("date", analysisEndDate);

  if (accountId) {
    transactionQuery = transactionQuery.eq("account_id", accountId);
  }

  const { data: transactions, error: transactionError } = await transactionQuery;

  if (transactionError) {
    console.error("Error fetching transactions for budget analysis:", transactionError);
    throw transactionError;
  }

  const transactionList = transactions || [];

  // Calculate spending by category
  const spendingByCategory: Record<string, number> = {};
  transactionList.forEach(transaction => {
    const category = transaction.category;
    if (!spendingByCategory[category]) {
      spendingByCategory[category] = 0;
    }
    spendingByCategory[category] += Math.abs(transaction.amount);
  });

  // Calculate budget comparison
  const budgetComparison = budgetList.map(budget => {
    const spent = spendingByCategory[budget.category] || 0;
    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    let status: "under" | "near" | "over" = "under";
    if (percentage >= 100) {
      status = "over";
    } else if (percentage >= 80) {
      status = "near";
    }

    return {
      category: budget.category,
      budget: budget.amount,
      spent: spent,
      remaining: budget.amount - spent,
      percentage: percentage,
      status: status,
      period: budget.period,
    };
  });

  // Calculate summary
  const totalBudget = budgetList.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgetComparison.reduce((sum, item) => sum + item.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Calculate unbudgeted spending
  const unbudgetedSpending: Record<string, number> = {};
  const budgetedCategories = new Set(budgetList.map(budget => budget.category));

  Object.entries(spendingByCategory).forEach(([category, amount]) => {
    if (!budgetedCategories.has(category)) {
      unbudgetedSpending[category] = amount;
    }
  });

  return {
    summary: {
      period: startDate && endDate ? `${startDate} to ${endDate}` : "All time",
      total_budget: totalBudget,
      total_spent: totalSpent,
      total_remaining: totalRemaining,
      overall_percentage: overallPercentage,
    },
    budget_comparison: budgetComparison,
    unbudgeted_spending: unbudgetedSpending,
  };
};

// Get goal reports locally
export const getLocalGoalReports = async (userId: string): Promise<GoalReport> => {
  // Fetch goals
  const { data: goals, error: goalError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (goalError) {
    console.error("Error fetching goals for report:", goalError);
    throw goalError;
  }

  const goalList = goals || [];

  if (goalList.length === 0) {
    return {
      summary: {
        total_goals: 0,
        total_target: 0,
        total_saved: 0,
        total_remaining: 0,
        overall_percentage: 0,
        completed_goals: 0,
      },
      goals: [],
    };
  }

  // Calculate goal progress and status
  const goalsWithProgress = goalList.map(goal => {
    const percentage = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
    const remaining = goal.target_amount - goal.current_amount;

    // Calculate days remaining
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Determine status
    let status: "completed" | "on_track" | "behind" = "on_track";
    if (percentage >= 100) {
      status = "completed";
    } else if (daysRemaining < 0 && percentage < 100) {
      status = "behind";
    } else if (daysRemaining > 0) {
      // Calculate if on track based on time vs progress
      const totalDays = Math.ceil((targetDate.getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const expectedProgress = totalDays > 0 ? ((totalDays - daysRemaining) / totalDays) * 100 : 0;
      if (percentage < expectedProgress * 0.8) { // 80% of expected progress
        status = "behind";
      }
    }

    return {
      id: goal.id,
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      percentage: Math.min(percentage, 100),
      remaining: Math.max(remaining, 0),
      status: status,
      target_date: goal.target_date,
      days_remaining: Math.max(daysRemaining, 0),
      category: goal.category,
      description: goal.description,
    };
  });

  // Calculate summary
  const totalGoals = goalList.length;
  const totalTarget = goalList.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalSaved = goalList.reduce((sum, goal) => sum + goal.current_amount, 0);
  const totalRemaining = totalTarget - totalSaved;
  const overallPercentage = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const completedGoals = goalsWithProgress.filter(goal => goal.status === "completed").length;

  return {
    summary: {
      total_goals: totalGoals,
      total_target: totalTarget,
      total_saved: totalSaved,
      total_remaining: totalRemaining,
      overall_percentage: overallPercentage,
      completed_goals: completedGoals,
    },
    goals: goalsWithProgress,
  };
};

// Get subscription reports locally
export const getLocalSubscriptionReports = async (
  userId: string,
  accountId?: string
): Promise<SubscriptionReport> => {
  let query = supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data: subscriptions, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching subscriptions for report:", error);
    throw error;
  }

  const subscriptionList = subscriptions || [];

  // Calculate summary
  const totalSubscriptions = subscriptionList.length;
  const activeSubscriptions = subscriptionList.filter(sub => sub.is_active).length;

  // Calculate monthly and yearly costs
  let monthlyCost = 0;
  let yearlyCost = 0;

  subscriptionList.forEach(sub => {
    const amount = sub.amount;
    switch (sub.billing_cycle) {
      case "weekly":
        monthlyCost += amount * 4.33; // Approximate weeks per month
        yearlyCost += amount * 52;
        break;
      case "monthly":
        monthlyCost += amount;
        yearlyCost += amount * 12;
        break;
      case "yearly":
        monthlyCost += amount / 12;
        yearlyCost += amount;
        break;
    }
  });

  // Calculate category breakdown
  const categoryBreakdown: Record<string, number> = {};
  subscriptionList.forEach(sub => {
    if (!categoryBreakdown[sub.category]) {
      categoryBreakdown[sub.category] = 0;
    }
    // Convert to monthly equivalent for comparison
    let monthlyEquivalent = sub.amount;
    switch (sub.billing_cycle) {
      case "weekly":
        monthlyEquivalent = sub.amount * 4.33;
        break;
      case "yearly":
        monthlyEquivalent = sub.amount / 12;
        break;
    }
    categoryBreakdown[sub.category] += monthlyEquivalent;
  });

  // Format subscriptions for report
  const formattedSubscriptions = subscriptionList.map(sub => {
    let monthlyEquivalent = sub.amount;
    let yearlyEquivalent = sub.amount;

    switch (sub.billing_cycle) {
      case "weekly":
        monthlyEquivalent = sub.amount * 4.33;
        yearlyEquivalent = sub.amount * 52;
        break;
      case "yearly":
        monthlyEquivalent = sub.amount / 12;
        yearlyEquivalent = sub.amount;
        break;
    }

    return {
      id: sub.id,
      name: sub.name,
      cost: sub.amount,
      billing_cycle: sub.billing_cycle,
      monthly_equivalent: monthlyEquivalent,
      yearly_equivalent: yearlyEquivalent,
      next_billing: sub.next_payment_date,
      status: sub.is_active ? "active" : "inactive",
      category: sub.category,
    };
  });

  return {
    summary: {
      total_subscriptions: totalSubscriptions,
      monthly_cost: monthlyCost,
      yearly_cost: yearlyCost,
      active_subscriptions: activeSubscriptions,
    },
    subscriptions: formattedSubscriptions,
    category_breakdown: categoryBreakdown,
  };
};

// Utility functions for formatting
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
