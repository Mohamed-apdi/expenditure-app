import { supabase } from './supabase';
import type { Account, Expense, Transaction, Budget } from './types';

export interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface CategorySummary {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface BudgetProgress {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export const getFinancialSummary = async (userId: string): Promise<FinancialSummary> => {
  try {
    // Get accounts summary
    const { data: accounts } = await supabase
      .from('accounts')
      .select('amount')
      .eq('user_id', userId);

    // Get transactions summary (using transactions table instead of expenses)
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId);

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalIncome = 0;
    let totalExpenses = 0;

    // Calculate account totals - since we removed asset/liability types, treat all as assets
    accounts?.forEach(account => {
      totalAssets += Number(account.amount);
    });

    // Calculate transaction totals (using transactions table)
    transactions?.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += Number(transaction.amount);
      } else if (transaction.type === 'expense') {
        totalExpenses += Number(transaction.amount);
      }
      // Note: transfers don't affect total income/expenses as they move money between accounts
    });

    const netWorth = totalAssets; // All accounts are now treated as assets
    const balance = totalIncome - totalExpenses;

    return {
      totalAssets,
      totalLiabilities: 0, // No more liabilities
      netWorth,
      totalIncome,
      totalExpenses,
      balance
    };
  } catch (error) {
    console.error('Error getting financial summary:', error);
    throw error;
  }
};

export const getExpensesByCategory = async (userId: string, startDate?: string, endDate?: string): Promise<CategorySummary[]> => {
  try {
    let query = supabase
      .from('transactions')
      .select('amount, category')
      .eq('user_id', userId)
      .eq('type', 'expense'); // Use transactions table with type = 'expense'

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data: transactions } = query;

    if (!transactions) return [];

    const categoryMap = new Map<string, { amount: number; count: number }>();

    transactions.forEach(transaction => {
      const current = categoryMap.get(transaction.category) || { amount: 0, count: 0 };
      categoryMap.set(transaction.category, {
        amount: current.amount + Number(transaction.amount),
        count: current.count + 1
      });
    });

    const totalAmount = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.amount, 0);

    return Array.from(categoryMap.entries()).map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  } catch (error) {
    console.error('Error getting expenses by category:', error);
    throw error;
  }
};

export const getMonthlySummary = async (userId: string, year: number): Promise<MonthlySummary[]> => {
  try {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type, date')
      .eq('user_id', userId)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);

    if (!transactions) return [];

    const monthlyMap = new Map<string, { income: number; expenses: number }>();

    // Initialize all months
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      monthlyMap.set(monthKey, { income: 0, expenses: 0 });
    }

    transactions.forEach(transaction => {
      const monthKey = transaction.date.substring(0, 7); // YYYY-MM format
      const current = monthlyMap.get(monthKey);
      
      if (current) {
        if (transaction.type === 'income') {
          current.income += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
          current.expenses += Number(transaction.amount);
        }
        // Note: transfers don't affect monthly income/expense totals
      }
    });

    return Array.from(monthlyMap.entries()).map(([month, { income, expenses }]) => ({
      month,
      income,
      expenses,
      balance: income - expenses
    }));
  } catch (error) {
    console.error('Error getting monthly summary:', error);
    throw error;
  }
};

export const getBudgetProgress = async (userId: string): Promise<BudgetProgress[]> => {
  try {
    const { data: budgets } = await supabase
      .from('budgets')
      .select('category, amount')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!budgets) return [];

    const budgetProgress: BudgetProgress[] = [];

    for (const budget of budgets) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('category', budget.category)
        .eq('type', 'expense'); // Use transactions table with type = 'expense'

      const spent = transactions?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;
      const budgeted = Number(budget.amount);
      const remaining = budgeted - spent;
      const percentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;

      budgetProgress.push({
        category: budget.category,
        budgeted,
        spent,
        remaining,
        percentage
      });
    }

    return budgetProgress.sort((a, b) => b.percentage - a.percentage);
  } catch (error) {
    console.error('Error getting budget progress:', error);
    throw error;
  }
};

export const getAccountBalances = async (userId: string): Promise<{ name: string; balance: number; account_type: string }[]> => {
  try {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('name, amount, account_type')
      .eq('user_id', userId)
      .order('amount', { ascending: false });

    if (!accounts) return [];

    return accounts.map(account => ({
      name: account.name,
      balance: Number(account.amount),
      account_type: account.account_type || 'Accounts'
    }));
  } catch (error) {
    console.error('Error getting account balances:', error);
    throw error;
  }
};

export const getRecentTransactions = async (userId: string, limit: number = 10): Promise<any[]> => {
  try {
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        *,
        account:accounts(name)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    return transactions || [];
  } catch (error) {
    console.error('Error getting recent transactions:', error);
    throw error;
  }
};
