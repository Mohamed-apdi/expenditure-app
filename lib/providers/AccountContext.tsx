import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { supabase } from "../database/supabase";
import { fetchAccounts, updateAccount } from "../services/accounts";
import type { Account } from "../types/types";

interface AccountContextType {
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => Promise<void>;
  accounts: Account[];
  loading: boolean;
  refreshAccounts: () => Promise<void>;
  calculateAccountBalance: (accountId: string) => Promise<number>;
  refreshBalances: () => Promise<void>;
  initializeAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccountState] = useState<Account | null>(
    null
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUpdatingDefault, setIsUpdatingDefault] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Auto-load accounts when the provider mounts
  useEffect(() => {
    const autoLoadAccounts = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await loadAccounts();
        }
      } catch (error) {
        console.error("AccountContext - Error auto-loading accounts:", error);
        // Silently fail - accounts will be loaded when user explicitly requests them
      }
    };

    autoLoadAccounts();
  }, []); // Only run once when provider mounts

  // Function to calculate real-time account balance based on transactions
  const calculateAccountBalance = async (
    accountId: string
  ): Promise<number> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return 0;

      // Get the account directly from the database to avoid circular dependency
      const fetchedAccounts = await fetchAccounts(user.id);
      const account = fetchedAccounts.find((acc) => acc.id === accountId);
      if (!account) return 0;

      // Always return the current amount from the accounts table
      // Transfers now create expense/income transactions that properly update account balances
      const currentBalance = account.amount || 0;

      return currentBalance;
    } catch (error) {
      console.error(
        "Error calculating account balance for account:",
        accountId,
        error
      );
      return 0;
    }
  };

  // Function to update account balances with real-time calculations
  const updateAccountBalances = async () => {
    try {
      // Simply refresh accounts from database since balances are now stored directly
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fetchedAccounts = await fetchAccounts(user.id);
      setAccounts(fetchedAccounts);

      // Update selected account if it exists
      if (selectedAccount) {
        const updatedSelectedAccount = fetchedAccounts.find(
          (acc) => acc.id === selectedAccount.id
        );
        if (updatedSelectedAccount) {
          setSelectedAccountState(updatedSelectedAccount);
        }
      }
    } catch (error) {
      console.error("Error updating account balances:", error);
    }
  };

  // Function to handle account selection and update is_default
  const setSelectedAccount = async (account: Account | null) => {
    try {
      if (account && !isUpdatingDefault) {
        setIsUpdatingDefault(true);

        // First, set all accounts to is_default: false
        const updatePromises = accounts.map((acc) =>
          updateAccount(acc.id, { is_default: false })
        );

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        // Then set the selected account to is_default: true
        await updateAccount(account.id, { is_default: true });

        // Update local state
        setSelectedAccountState(account);

        // Update local accounts array to reflect the changes
        const updatedAccounts = accounts.map((acc) => ({
          ...acc,
          is_default: acc.id === account.id,
        }));
        setAccounts(updatedAccounts);
      } else if (!account) {
        setSelectedAccountState(null);
      }
    } catch (error) {
      console.error("Error updating account selection:", error);
      // Fallback: just update local state without database changes
      setSelectedAccountState(account);
    } finally {
      setIsUpdatingDefault(false);
    }
  };

  // Function to load accounts - only called when explicitly requested
  const loadAccounts = async () => {
    if (loading) return; // Only prevent multiple simultaneous calls

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const fetchedAccounts = await fetchAccounts(user.id);

      if (fetchedAccounts && fetchedAccounts.length > 0) {
        setAccounts(fetchedAccounts);

        // Only set default selected account if no account is currently selected
        if (!selectedAccount && !isUpdatingDefault) {
          const defaultAccount = fetchedAccounts.find(
            (acc) => acc.is_default === true
          );
          const accountToSelect = defaultAccount || fetchedAccounts[0];
          setSelectedAccountState(accountToSelect);
        }
      } else {
        setAccounts([]);
        setSelectedAccountState(null);
      }

      setHasInitialized(true);
    } catch (error) {
      console.error("Error loading accounts:", error);
      setAccounts([]);
      setSelectedAccountState(null);
    } finally {
      setLoading(false);
    }
  };

  // Function to manually trigger account loading (called from Dashboard)
  const initializeAccounts = useCallback(async () => {
    // Always try to load accounts when explicitly requested
    // This handles the case where accounts were created during signup
    await loadAccounts();
  }, []);

  // Function to refresh accounts (called when needed)
  const refreshAccounts = useCallback(async () => {
    try {
      setHasInitialized(false);
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const fetchedAccounts = await fetchAccounts(user.id);

      if (fetchedAccounts && fetchedAccounts.length > 0) {
        setAccounts(fetchedAccounts);

        // Only set default selected account if no account is currently selected
        if (!selectedAccount && !isUpdatingDefault) {
          const defaultAccount = fetchedAccounts.find(
            (acc) => acc.is_default === true
          );
          const accountToSelect = defaultAccount || fetchedAccounts[0];
          setSelectedAccountState(accountToSelect);
        }
      } else {
        setAccounts([]);
        setSelectedAccountState(null);
      }

      setHasInitialized(true);
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      setAccounts([]);
      setSelectedAccountState(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, isUpdatingDefault]);

  // Function to refresh balances after transaction changes
  const refreshBalances = async () => {
    if (!isUpdatingDefault) {
      await updateAccountBalances();
    }
  };

  const value = {
    selectedAccount,
    setSelectedAccount,
    accounts,
    loading,
    refreshAccounts,
    calculateAccountBalance,
    refreshBalances,
    initializeAccounts,
  };

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}
