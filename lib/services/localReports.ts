/**
 * Local reports service for generating transaction and financial reports
 * Builds report data from local Legend-State stores (offline-first)
 */
import { selectAccounts } from "../stores/accountsStore";
import { selectBudgets } from "../stores/budgetsStore";
import { selectGoals } from "../stores/goalsStore";
import { selectSubscriptions } from "../stores/subscriptionsStore";
import { selectTransactionsByDateRange, selectTransactions } from "../stores/transactionsStore";
import { selectInvestments } from "../stores/investmentsStore";
import { selectPersonalLoans } from "../stores/personalLoansStore";
import { selectLoanRepayments } from "../stores/loanRepaymentsStore";
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
    uncategorized_count: number;
    uncategorized_expense_total: number;
    uncategorized_income_total: number;
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

export interface InvestmentReport {
  summary: {
    total_investments: number;
    total_invested: number;
    total_current_value: number;
    total_gain_loss: number;
    gain_loss_percentage: number;
  };
  investments: Array<{
    id: string;
    name: string;
    type: string;
    invested_amount: number;
    current_value: number;
    gain_loss: number;
    gain_loss_percentage: number;
    created_at: string;
  }>;
  type_breakdown: Record<string, { invested: number; current: number }>;
}

export interface LoanReport {
  summary: {
    total_loans: number;
    loans_given: number;
    loans_taken: number;
    total_given_amount: number;
    total_taken_amount: number;
    total_outstanding_given: number;
    total_outstanding_taken: number;
    net_position: number;
  };
  loans: Array<{
    id: string;
    party_name: string;
    type: "loan_given" | "loan_taken";
    principal_amount: number;
    remaining_amount: number;
    paid_amount: number;
    interest_rate?: number;
    due_date?: string;
    status: string;
    is_overdue: boolean;
    days_until_due?: number;
  }>;
  repayment_history: Array<{
    loan_id: string;
    party_name: string;
    amount: number;
    payment_date: string;
  }>;
}

// Get transaction reports locally from Legend-State store
export const getLocalTransactionReports = async (
  userId: string,
  accountId?: string,
  startDate?: string,
  endDate?: string
): Promise<TransactionReport> => {
  // Fetch from local store (works offline)
  let transactionList: Transaction[];

  if (startDate && endDate) {
    transactionList = selectTransactionsByDateRange(userId, startDate, endDate) as Transaction[];
  } else {
    transactionList = selectTransactions(userId) as Transaction[];
  }

  // Apply account filter if specified
  if (accountId) {
    transactionList = transactionList.filter(t => t.account_id === accountId);
  }

  // Sort by date descending
  transactionList = [...transactionList].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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

  const hasCategory = (t: Transaction) => !!String(t.category ?? "").trim();

  let uncategorizedCount = 0;
  let uncategorizedExpenseTotal = 0;
  let uncategorizedIncomeTotal = 0;
  transactionList.forEach((t) => {
    if (hasCategory(t)) return;
    uncategorizedCount += 1;
    if (t.type === "expense") {
      uncategorizedExpenseTotal += Math.abs(t.amount);
    } else if (t.type === "income") {
      uncategorizedIncomeTotal += Math.abs(t.amount);
    }
  });

  // Spending by category: only categorized expenses (excludes uncategorized EVC P2P, etc.)
  const categoryBreakdown: Record<
    string,
    { amount: number; percentage: number; count: number }
  > = {};

  transactionList.forEach((t) => {
    if (t.type !== "expense" || !hasCategory(t)) return;
    const cat = t.category as string;
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { amount: 0, percentage: 0, count: 0 };
    }
    categoryBreakdown[cat].amount += Math.abs(t.amount);
    categoryBreakdown[cat].count += 1;
  });

  const categorizedExpenseTotal = Object.values(categoryBreakdown).reduce(
    (s, v) => s + v.amount,
    0,
  );

  Object.keys(categoryBreakdown).forEach((category) => {
    const amount = categoryBreakdown[category].amount;
    categoryBreakdown[category].percentage =
      categorizedExpenseTotal > 0 ? (amount / categorizedExpenseTotal) * 100 : 0;
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
      uncategorized_count: uncategorizedCount,
      uncategorized_expense_total: uncategorizedExpenseTotal,
      uncategorized_income_total: uncategorizedIncomeTotal,
    },
    category_breakdown: categoryBreakdown,
    daily_trends: dailyTrends,
    monthly_trends: monthlyTrends,
    transactions: transactionList,
  };
};

// Get account reports locally from Legend-State store
export const getLocalAccountReports = async (
  userId: string,
  accountId?: string
): Promise<AccountReport> => {
  // Fetch from local store (works offline)
  const accountList = selectAccounts(userId);
  const allTransactions = selectTransactions(userId);

  // Get transaction counts for each account
  const accountsWithCounts = accountList.map((account) => {
    const transactionCount = allTransactions.filter(t => t.account_id === account.id).length;

    return {
      id: account.id,
      name: account.name,
      type: account.account_type,
      balance: account.amount,
      currency: account.currency || "USD",
      transaction_count: transactionCount,
      created_at: account.created_at,
    };
  });

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

// Get budget reports locally from Legend-State store
export const getLocalBudgetReports = async (
  userId: string,
  startDate?: string,
  endDate?: string,
  accountId?: string
): Promise<BudgetReport> => {
  // Fetch from local store (works offline)
  let budgetList = selectBudgets(userId).filter(b => b.is_active);

  if (accountId) {
    budgetList = budgetList.filter(b => b.account_id === accountId);
  }

  // Sort by created_at descending
  budgetList = [...budgetList].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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

  // Fetch transactions for spending analysis from local store
  let transactionList = selectTransactionsByDateRange(userId, analysisStartDate, analysisEndDate)
    .filter(t => t.type === "expense");

  if (accountId) {
    transactionList = transactionList.filter(t => t.account_id === accountId);
  }

  // Calculate spending by category
  const spendingByCategory: Record<string, number> = {};
  transactionList.forEach(transaction => {
    const category = transaction.category;
    if (category) {
      if (!spendingByCategory[category]) {
        spendingByCategory[category] = 0;
      }
      spendingByCategory[category] += Math.abs(transaction.amount);
    }
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

// Get goal reports locally from Legend-State store
export const getLocalGoalReports = async (userId: string): Promise<GoalReport> => {
  // Fetch from local store (works offline)
  let goalList = selectGoals(userId).filter(g => g.is_active);

  // Sort by created_at descending
  goalList = [...goalList].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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

// Get subscription reports locally from Legend-State store
export const getLocalSubscriptionReports = async (
  userId: string,
  accountId?: string
): Promise<SubscriptionReport> => {
  // Fetch from local store (works offline)
  let subscriptionList = selectSubscriptions(userId).filter(s => s.is_active);

  if (accountId) {
    subscriptionList = subscriptionList.filter(s => s.account_id === accountId);
  }

  // Sort by created_at descending
  subscriptionList = [...subscriptionList].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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
    if (sub.category) {
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
    }
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

// Get investment reports locally from Legend-State store
export const getLocalInvestmentReports = async (
  userId: string,
  accountId?: string
): Promise<InvestmentReport> => {
  let investmentList = selectInvestments(userId);

  if (accountId) {
    investmentList = investmentList.filter(i => i.account_id === accountId);
  }

  // Sort by created_at descending
  investmentList = [...investmentList].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Calculate summary
  const totalInvestments = investmentList.length;
  const totalInvested = investmentList.reduce((sum, inv) => sum + inv.invested_amount, 0);
  const totalCurrentValue = investmentList.reduce((sum, inv) => sum + inv.current_value, 0);
  const totalGainLoss = totalCurrentValue - totalInvested;
  const gainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  // Calculate type breakdown
  const typeBreakdown: Record<string, { invested: number; current: number }> = {};
  investmentList.forEach(inv => {
    const type = inv.type || "Other";
    if (!typeBreakdown[type]) {
      typeBreakdown[type] = { invested: 0, current: 0 };
    }
    typeBreakdown[type].invested += inv.invested_amount;
    typeBreakdown[type].current += inv.current_value;
  });

  // Format investments for report
  const formattedInvestments = investmentList.map(inv => {
    const gainLoss = inv.current_value - inv.invested_amount;
    const gainLossPct = inv.invested_amount > 0 ? (gainLoss / inv.invested_amount) * 100 : 0;

    return {
      id: inv.id,
      name: inv.name,
      type: inv.type || "Other",
      invested_amount: inv.invested_amount,
      current_value: inv.current_value,
      gain_loss: gainLoss,
      gain_loss_percentage: gainLossPct,
      created_at: inv.created_at,
    };
  });

  return {
    summary: {
      total_investments: totalInvestments,
      total_invested: totalInvested,
      total_current_value: totalCurrentValue,
      total_gain_loss: totalGainLoss,
      gain_loss_percentage: gainLossPercentage,
    },
    investments: formattedInvestments,
    type_breakdown: typeBreakdown,
  };
};

// Get loan reports locally from Legend-State store
export const getLocalLoanReports = async (
  userId: string,
  accountId?: string
): Promise<LoanReport> => {
  let loanList = selectPersonalLoans(userId);

  if (accountId) {
    loanList = loanList.filter(l => l.account_id === accountId);
  }

  // Sort by created_at descending
  loanList = [...loanList].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate summary
  const loansGiven = loanList.filter(l => l.type === "loan_given");
  const loansTaken = loanList.filter(l => l.type === "loan_taken");

  const totalGivenAmount = loansGiven.reduce((sum, l) => sum + l.principal_amount, 0);
  const totalTakenAmount = loansTaken.reduce((sum, l) => sum + l.principal_amount, 0);
  const totalOutstandingGiven = loansGiven
    .filter(l => l.status !== "settled")
    .reduce((sum, l) => sum + l.remaining_amount, 0);
  const totalOutstandingTaken = loansTaken
    .filter(l => l.status !== "settled")
    .reduce((sum, l) => sum + l.remaining_amount, 0);

  // Net position: positive means others owe you more than you owe
  const netPosition = totalOutstandingGiven - totalOutstandingTaken;

  // Format loans for report
  const formattedLoans = loanList.map(loan => {
    const paidAmount = loan.principal_amount - loan.remaining_amount;
    let isOverdue = false;
    let daysUntilDue: number | undefined;

    if (loan.due_date && loan.status !== "settled") {
      const dueDate = new Date(loan.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = dueDate.getTime() - today.getTime();
      daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isOverdue = daysUntilDue < 0;
    }

    return {
      id: loan.id,
      party_name: loan.party_name,
      type: loan.type,
      principal_amount: loan.principal_amount,
      remaining_amount: loan.remaining_amount,
      paid_amount: paidAmount,
      interest_rate: loan.interest_rate,
      due_date: loan.due_date,
      status: loan.status,
      is_overdue: isOverdue,
      days_until_due: daysUntilDue,
    };
  });

  // Get all repayment history
  const repaymentHistory: LoanReport["repayment_history"] = [];
  for (const loan of loanList) {
    const repayments = selectLoanRepayments(loan.id);
    for (const repayment of repayments) {
      repaymentHistory.push({
        loan_id: loan.id,
        party_name: loan.party_name,
        amount: repayment.amount,
        payment_date: repayment.payment_date,
      });
    }
  }

  // Sort repayments by date descending
  repaymentHistory.sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  return {
    summary: {
      total_loans: loanList.length,
      loans_given: loansGiven.length,
      loans_taken: loansTaken.length,
      total_given_amount: totalGivenAmount,
      total_taken_amount: totalTakenAmount,
      total_outstanding_given: totalOutstandingGiven,
      total_outstanding_taken: totalOutstandingTaken,
      net_position: netPosition,
    },
    loans: formattedLoans,
    repayment_history: repaymentHistory.slice(0, 20), // Limit to recent 20
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
