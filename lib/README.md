# Database Services Documentation

This directory contains comprehensive database services for your expenditure app, built with Supabase. All services are fully typed and provide CRUD operations for all database tables.

## 📁 File Structure

```
lib/
├── types.ts              # All database types and interfaces
├── supabase.ts           # Supabase client configuration
├── accounts.ts           # Account and account group services
├── expenses.ts           # Expense services
├── budgets.ts            # Budget services
├── transactions.ts       # Transaction services
├── transfers.ts          # Transfer services
├── profiles.ts           # User profile services
├── analytics.ts          # Financial analytics and insights
├── index.ts              # Main export file
└── README.md             # This documentation
```

## 🚀 Quick Start

Import all services from the main index file:

```typescript
import {
  fetchAccounts,
  addExpense,
  getFinancialSummary,
  type Account,
  type Expense
} from '~/lib';
```

## 📊 Database Tables & Services

### 1. Accounts (`accounts.ts`)

**Types:**
- `Account` - Basic account information
- `AccountGroup` - Account grouping
- `AccountType` - Asset/Liability classification
- `AccountWithGroup` - Account with related group data

**Services:**
```typescript
// Basic CRUD
fetchAccounts(userId: string): Promise<Account[]>
addAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account>
updateAccount(accountId: string, updates: Partial<Account>): Promise<Account>
deleteAccount(accountId: string): Promise<void>

// With relationships
fetchAccountsWithGroups(userId: string): Promise<AccountWithGroup[]>

// Account groups
fetchAccountGroups(userId: string): Promise<AccountGroup[]>
addAccountGroup(group: Omit<AccountGroup, 'id' | 'created_at' | 'updated_at'>): Promise<AccountGroup>
updateAccountGroup(groupId: string, updates: Partial<AccountGroup>): Promise<AccountGroup>
deleteAccountGroup(groupId: string): Promise<void>

// Account types
fetchAccountTypes(): Promise<AccountType[]>

// Utilities
updateAccountBalance(accountId: string, newBalance: number): Promise<void>
getDefaultAccount(userId: string): Promise<Account | null>
```

### 2. Expenses (`expenses.ts`)

**Types:**
- `Expense` - Basic expense information
- `ExpenseWithAccount` - Expense with related account data

**Services:**
```typescript
// Basic CRUD
fetchExpenses(userId: string, filters?: any): Promise<Expense[]>
addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense>
updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense>
deleteExpense(expenseId: string): Promise<void>

// With relationships
fetchExpensesWithAccounts(userId: string, filters?: any): Promise<ExpenseWithAccount[]>

// Filtering
getExpenseById(expenseId: string): Promise<Expense | null>
getExpensesByCategory(userId: string, category: string): Promise<Expense[]>
getExpensesByDateRange(userId: string, startDate: string, endDate: string): Promise<Expense[]>
```

### 3. Budgets (`budgets.ts`)

**Types:**
- `Budget` - Basic budget information
- `BudgetWithAccount` - Budget with related account data

**Services:**
```typescript
// Basic CRUD
fetchBudgets(userId: string): Promise<Budget[]>
addBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): Promise<Budget>
updateBudget(budgetId: string, updates: Partial<Budget>): Promise<Budget>
deleteBudget(budgetId: string): Promise<void>

// With relationships
fetchBudgetsWithAccounts(userId: string): Promise<BudgetWithAccount[]>

// Filtering
getBudgetById(budgetId: string): Promise<Budget | null>
getBudgetsByAccount(userId: string, accountId: string): Promise<Budget[]>
getBudgetsByCategory(userId: string, category: string): Promise<Budget[]>
getBudgetsByPeriod(userId: string, period: 'weekly' | 'monthly' | 'yearly'): Promise<Budget[]>

// Utilities
deactivateBudget(budgetId: string): Promise<void>
getActiveBudgets(userId: string): Promise<Budget[]>
```

### 4. Transactions (`transactions.ts`)

**Types:**
- `Transaction` - Basic transaction information
- `TransactionWithAccounts` - Transaction with related account data

**Services:**
```typescript
// Basic CRUD
fetchTransactions(userId: string): Promise<Transaction[]>
addTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction>
updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<Transaction>
deleteTransaction(transactionId: string): Promise<void>

// With relationships
fetchTransactionsWithAccounts(userId: string): Promise<TransactionWithAccounts[]>

// Filtering
getTransactionById(transactionId: string): Promise<Transaction | null>
getTransactionsByAccount(userId: string, accountId: string): Promise<Transaction[]>
getTransactionsByType(userId: string, type: 'expense' | 'income' | 'transfer'): Promise<Transaction[]>
getTransactionsByCategory(userId: string, category: string): Promise<Transaction[]>
getTransactionsByDateRange(userId: string, startDate: string, endDate: string): Promise<Transaction[]>
getRecurringTransactions(userId: string): Promise<Transaction[]>
```

### 5. Transfers (`transfers.ts`)

**Types:**
- `Transfer` - Basic transfer information
- `TransferWithAccounts` - Transfer with related account data

**Services:**
```typescript
// Basic CRUD
fetchTransfers(userId: string): Promise<Transfer[]>
addTransfer(transfer: Omit<Transfer, 'id' | 'created_at' | 'updated_at'>): Promise<Transfer>
updateTransfer(transferId: string, updates: Partial<Transfer>): Promise<Transfer>
deleteTransfer(transferId: string): Promise<void>

// With relationships
fetchTransfersWithAccounts(userId: string): Promise<TransferWithAccounts[]>

// Filtering
getTransferById(transferId: string): Promise<Transfer | null>
getTransfersByAccount(userId: string, accountId: string): Promise<Transfer[]>
getTransfersByDateRange(userId: string, startDate: string, endDate: string): Promise<Transfer[]>
getTransfersFromAccount(userId: string, accountId: string): Promise<Transfer[]>
getTransfersToAccount(userId: string, accountId: string): Promise<Transfer[]>
```

### 6. Profiles (`profiles.ts`)

**Types:**
- `Profile` - User profile information

**Services:**
```typescript
// Basic CRUD
fetchProfile(userId: string): Promise<Profile | null>
createProfile(profile: Omit<Profile, 'created_at'>): Promise<Profile>
updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile>

// Specific updates
updateProfileImage(userId: string, imageUrl: string): Promise<Profile>
updateProfileEmail(userId: string, email: string): Promise<Profile>
updateProfilePhone(userId: string, phone: string): Promise<Profile>
updateProfileName(userId: string, fullName: string): Promise<Profile>
updateUserType(userId: string, userType: string): Promise<Profile>
```

### 7. Analytics (`analytics.ts`)

**Types:**
- `FinancialSummary` - Overall financial overview
- `CategorySummary` - Category-based expense analysis
- `MonthlySummary` - Monthly income/expense summary
- `BudgetProgress` - Budget vs. actual spending

**Services:**
```typescript
// Financial overview
getFinancialSummary(userId: string): Promise<FinancialSummary>

// Category analysis
getExpensesByCategory(userId: string, startDate?: string, endDate?: string): Promise<CategorySummary[]>

// Monthly analysis
getMonthlySummary(userId: string, year: number): Promise<MonthlySummary[]>

// Budget tracking
getBudgetProgress(userId: string): Promise<BudgetProgress[]>

// Account overview
getAccountBalances(userId: string): Promise<{ name: string; balance: number; type: string }[]>

// Recent activity
getRecentTransactions(userId: string, limit?: number): Promise<any[]>
```

## 💡 Usage Examples

### Basic Expense Management

```typescript
import { addExpense, fetchExpenses, getExpensesByCategory } from '~/lib';

// Add a new expense
const newExpense = await addExpense({
  user_id: 'user-123',
  amount: 25.50,
  category: 'Food',
  description: 'Lunch',
  date: '2024-01-15',
  payment_method: 'Credit Card',
  is_recurring: false,
  is_essential: true,
  entry_type: 'Expense',
});

// Fetch all expenses
const expenses = await fetchExpenses('user-123');

// Get expenses by category
const foodExpenses = await getExpensesByCategory('user-123', 'Food');
```

### Account Management with Groups

```typescript
import { fetchAccountsWithGroups, addAccountGroup } from '~/lib';

// Create an account group
const group = await addAccountGroup({
  user_id: 'user-123',
  name: 'Daily Expenses',
  description: 'Accounts for daily spending',
});

// Fetch accounts with their groups
const accounts = await fetchAccountsWithGroups('user-123');
```

### Financial Analytics

```typescript
import { getFinancialSummary, getBudgetProgress } from '~/lib';

// Get overall financial summary
const summary = await getFinancialSummary('user-123');
console.log(`Net Worth: $${summary.netWorth}`);
console.log(`Monthly Balance: $${summary.balance}`);

// Get budget progress
const progress = await getBudgetProgress('user-123');
progress.forEach(budget => {
  console.log(`${budget.category}: ${budget.percentage.toFixed(1)}% used`);
});
```

### Transaction Management

```typescript
import { addTransaction, fetchTransactionsWithAccounts } from '~/lib';

// Add a new transaction
const transaction = await addTransaction({
  user_id: 'user-123',
  account_id: 'account-456',
  amount: 100.00,
  description: 'Salary deposit',
  date: '2024-01-15',
  category: 'Income',
  type: 'income',
  is_recurring: false,
});

// Fetch transactions with account details
const transactions = await fetchTransactionsWithAccounts('user-123');
```

## 🔧 Error Handling

All services include proper error handling and will throw errors that you can catch:

```typescript
try {
  const accounts = await fetchAccounts(userId);
  // Handle success
} catch (error) {
  console.error('Failed to fetch accounts:', error);
  // Handle error (show alert, retry, etc.)
}
```

## 📱 Integration with React Native

These services work seamlessly with React Native hooks:

```typescript
import { useState, useEffect } from 'react';
import { fetchAccounts, fetchExpenses } from '~/lib';

export function useUserData(userId: string) {
  const [accounts, setAccounts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [accountsData, expensesData] = await Promise.all([
          fetchAccounts(userId),
          fetchExpenses(userId)
        ]);
        
        setAccounts(accountsData);
        setExpenses(expensesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  return { accounts, expenses, loading };
}
```

## 🚨 Important Notes

1. **User ID Required**: Most services require a `userId` parameter for data isolation
2. **Type Safety**: All services are fully typed with TypeScript
3. **Error Handling**: Always wrap service calls in try-catch blocks
4. **Relationships**: Use the "With" services when you need related data
5. **Filtering**: Many services support optional filters for better performance

## 🔄 Updating Existing Screens

To update your existing screens, replace direct Supabase calls with these services:

**Before:**
```typescript
const { data, error } = await supabase
  .from('expenses')
  .select('*')
  .eq('user_id', userId);
```

**After:**
```typescript
import { fetchExpenses } from '~/lib';

const expenses = await fetchExpenses(userId);
```

This approach provides better error handling, type safety, and maintainability.
