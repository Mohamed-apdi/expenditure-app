// Database services
export * from "./services/accounts";
export {
  getAccountBalances,
  getBudgetProgress,
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

// Providers
export * from "./providers/AccountContext";
export * from "./providers/LanguageProvider";
export * from "./providers/SyncContext";

// Sync (Legend-State)
export { createAccountLocal, updateAccountLocal } from "./stores/accountsStore";
export { selectConflicts } from "./stores/conflictsStore";
export { createExpenseLocal } from "./stores/expensesStore";
export { selectProfile } from "./stores/profileStore";
export {
  createTransactionLocal,
  selectTransactions,
  selectTransactionsByDateRange,
} from "./stores/transactionsStore";
export { createTransferLocal } from "./stores/transfersStore";
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

// Hooks
export * from "./hooks/useDashboardData";
export * from "./hooks/useNotifications";
export * from "./hooks/useScreenStatusBar";
