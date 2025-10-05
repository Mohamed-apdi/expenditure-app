import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { supabase } from "../database/supabase";
import { fetchAccounts } from "../services/accounts";
import type { Account } from "../types/types";

interface AccountContextType {
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => void;
  accounts: Account[];
  loading: boolean;
  refreshAccounts: () => Promise<void>;
  calculateAccountBalance: (accountId: string) => Promise<number>;
  refreshBalances: () => Promise<void>;
  initializeAccounts: () => Promise<void>; // Add this missing function
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccountState] = useState<Account | null>(
    null
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false); // Start with false since we'll load on mount
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

      const currentBalance = account.amount || 0;
      return currentBalance;
    } catch (error) {
      console.error("Error calculating account balance:", error);
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

  const setSelectedAccount = (account: Account | null) => {
    setSelectedAccountState(account);
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

        if (!selectedAccount) {
          const accountToSelect = fetchedAccounts[0];
          if (accountToSelect) {
            setSelectedAccountState(accountToSelect);
          }
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

  const initializeAccounts = useCallback(async () => {
    await loadAccounts();
  }, []);

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

        if (!selectedAccount) {
          const accountToSelect = fetchedAccounts[0];
          if (accountToSelect) {
            setSelectedAccountState(accountToSelect);
          }
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
  }, [selectedAccount]);

  const refreshBalances = async () => {
    await updateAccountBalances();
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
