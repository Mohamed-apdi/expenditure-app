/**
 * Main library barrel file: re-exports services, hooks, and utilities for the app.
 */
// Database services
export * from "./services/accounts";
export {
  getAccountBalances,
  getBudgetProgress,
  getBudgetProgressFromLocal,
  getFinancialSummary,
  getMonthlySummary,
  getRecentTransactions,
  type BudgetProgress,
  type CategorySummary,
  type FinancialSummary,
  type MonthlySummary,
} from "./services/analytics";
export * from "./services/budgets";
export * from "./services/expenses";
export * from "./services/goals";
export * from "./services/loans";
export * from "./services/profiles";
export * from "./services/subscriptions";
export * from "./services/transactions";
export * from "./services/transfers";

// Local reports services
export * from "./services/localReports";

// Generators
export * from "./generators/csvGenerator";
export * from "./generators/pdfGenerator";

// Notification service (default export)
export { default as notificationService } from "./services/notificationService";

// Notification functions
export { requestNotificationPermissions } from "./services/notificationService";
export * from "./services/notifications";

// Types
export * from "./types/types";

// Supabase client
export { getSupabaseWithToken, supabase } from "./database/supabase";

// Offline-first auth (use cached session when offline)
export { getCurrentUserOfflineFirst } from "./auth";

// Providers
export * from "./providers/AccountContext";
export * from "./providers/LanguageProvider";
export * from "./providers/SyncContext";

// Sync (Legend-State) - local-first entity stores and sync helpers
export {
  createAccountLocal,
  updateAccountLocal,
  deleteAccountLocal,
  selectAccounts,
  selectAccountById,
  toAccount,
} from "./stores/accountsStore";
export { selectConflicts, clearAllConflicts } from "./stores/conflictsStore";
export {
  createExpenseLocal,
  updateExpenseLocal,
  deleteExpenseLocal,
  selectExpenseById,
} from "./stores/expensesStore";
export { selectProfile, updateProfileLocal } from "./stores/profileStore";
export {
  selectNotifications,
  selectNotificationsByAccount,
  selectUnreadCount,
  selectUnreadCountByAccount,
  createNotificationLocal,
  markNotificationAsReadLocal,
  markAllNotificationsAsReadLocal,
  deleteNotificationLocal,
  syncNotificationsFromServer,
} from "./stores/notificationsStore";
export {
  createTransactionLocal,
  updateTransactionLocal,
  deleteTransactionLocal,
  selectTransactions,
  selectTransactionsByDateRange,
  selectTransactionById,
} from "./stores/transactionsStore";
export {
  createTransferLocal,
  deleteTransferLocal,
  selectTransfers,
} from "./stores/transfersStore";
export {
  createBudgetLocal,
  updateBudgetLocal,
  deleteBudgetLocal,
  selectBudgets,
} from "./stores/budgetsStore";
export {
  createGoalLocal,
  updateGoalLocal,
  deleteGoalLocal,
  selectGoals,
  selectGoalById,
} from "./stores/goalsStore";
export {
  createSubscriptionLocal,
  updateSubscriptionLocal,
  deleteSubscriptionLocal,
  selectSubscriptions,
} from "./stores/subscriptionsStore";
export {
  createPersonalLoanLocal,
  updatePersonalLoanLocal,
  deletePersonalLoanLocal,
  selectPersonalLoans,
} from "./stores/personalLoansStore";
export {
  createLoanRepaymentLocal,
  deleteLoanRepaymentLocal,
  selectLoanRepayments,
} from "./stores/loanRepaymentsStore";
export {
  createInvestmentLocal,
  updateInvestmentLocal,
  deleteInvestmentLocal,
  selectInvestments,
} from "./stores/investmentsStore";
export {
  isOfflineGateLocked,
  resolveConflictKeepLocal,
  resolveConflictUseRemote,
  startSync,
  triggerSync,
} from "./sync/legendSync";

// Icons
export * from "./icons/Check";
export * from "./icons/ChevronDown";
export * from "./icons/ChevronUp";
export * from "./icons/Info";
export * from "./icons/MoonStar";
export * from "./icons/Sun";

// Constants and utilities
export * from "./config/storage/secureStore";
export * from "./config/theme/constants";
export * from "./config/theme/theme";
export * from "./config/theme/useColorScheme";
export * from "./utils/android-navigation-bar";
export * from "./utils/chartColors";
export * from "./utils/expoGoUtils";
export * from "./utils/utils";
export * from "./utils/imageCache";

// Hooks
export * from "./hooks/useDashboardData";
export * from "./hooks/useNotifications";
export * from "./hooks/useScreenStatusBar";
