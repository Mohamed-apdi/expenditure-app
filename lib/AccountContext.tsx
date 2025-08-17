import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';
import { fetchAccounts, updateAccount, type Account } from './accounts';
import { fetchTransactions } from './transactions';

interface AccountContextType {
  selectedAccount: Account | null;
  setSelectedAccount: (account: Account | null) => Promise<void>;
  accounts: Account[];
  loading: boolean;
  refreshAccounts: () => Promise<void>;
  calculateAccountBalance: (accountId: string) => Promise<number>;
  refreshBalances: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccountState] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingDefault, setIsUpdatingDefault] = useState(false);

  // Function to calculate real-time account balance based on transactions
  const calculateAccountBalance = async (accountId: string): Promise<number> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return 0;

      // Get the account directly from the database to avoid circular dependency
      const fetchedAccounts = await fetchAccounts(user.id);
      const account = fetchedAccounts.find(acc => acc.id === accountId);
      if (!account) return 0;

      // Always return the current amount from the accounts table
      // Transfers now create expense/income transactions that properly update account balances
      const currentBalance = account.amount || 0;
      
      console.log(`Account ${account.name} balance from database:`, currentBalance);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fetchedAccounts = await fetchAccounts(user.id);
      setAccounts(fetchedAccounts);
      
      // Update selected account if it exists
      if (selectedAccount) {
        const updatedSelectedAccount = fetchedAccounts.find(acc => acc.id === selectedAccount.id);
        if (updatedSelectedAccount) {
          setSelectedAccountState(updatedSelectedAccount);
        }
      }
      
      console.log("Updated account balances from database");
    } catch (error) {
      console.error("Error updating account balances:", error);
    }
  };

  // Function to handle account selection and update is_default
  const setSelectedAccount = async (account: Account | null) => {
    try {
      if (account && !isUpdatingDefault) {
        setIsUpdatingDefault(true);
        console.log("Setting selected account to:", account.name);
        
        // First, set all accounts to is_default: false
        const updatePromises = accounts.map(acc => 
          updateAccount(acc.id, { is_default: false })
        );
        
        // Wait for all updates to complete
        await Promise.all(updatePromises);
        
        // Then set the selected account to is_default: true
        await updateAccount(account.id, { is_default: true });
        
        // Update local state
        setSelectedAccountState(account);
        
        // Update local accounts array to reflect the changes
        const updatedAccounts = accounts.map(acc => ({
          ...acc,
          is_default: acc.id === account.id
        }));
        setAccounts(updatedAccounts);
        
        console.log("Successfully updated is_default for account:", account.name);
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

  const loadAccounts = async () => {
    try {
      if (isUpdatingDefault) {
        console.log("Skipping loadAccounts - currently updating defaults");
        return;
      }
      
      setLoading(true);
      console.log("Starting to load accounts...");
      
      // Remove the artificial delay - load accounts immediately
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.log("Auth error (will retry):", authError.message);
        setLoading(false);
        return; // Don't throw error, just return
      }

      if (!user) {
        console.log("No user found (will retry)");
        setLoading(false);
        return; // Don't throw error, just return
      }

      console.log("User authenticated, fetching accounts for:", user.id);
      
      const fetchedAccounts = await fetchAccounts(user.id);
      console.log("Fetched accounts:", fetchedAccounts.length);
      
      if (fetchedAccounts && fetchedAccounts.length > 0) {
        // Use accounts directly from database (balances are stored directly)
        setAccounts(fetchedAccounts);
        
        // Only set default selected account if no account is currently selected
        // and we're not in the middle of updating defaults
        if (!selectedAccount && !isUpdatingDefault) {
          const defaultAccount = fetchedAccounts.find(acc => acc.is_default === true);
          const accountToSelect = defaultAccount || fetchedAccounts[0];
          console.log("Setting initial selected account to:", accountToSelect.name, "is_default:", accountToSelect.is_default, "balance:", accountToSelect.amount);
          setSelectedAccountState(accountToSelect);
        }
        
        console.log("Successfully loaded", fetchedAccounts.length, "accounts from database");
      } else {
        console.log("No accounts found in database");
        setAccounts([]);
        setSelectedAccountState(null);
      }
      
      console.log("Finished loading accounts");
    } catch (error) {
      console.log("Error loading accounts (will retry):", error);
      // Don't throw error, just log it
    } finally {
      setLoading(false);
    }
  };

  const refreshAccounts = async () => {
    if (!isUpdatingDefault) {
      await loadAccounts();
    }
  };

  // Function to refresh balances after transaction changes
  const refreshBalances = async () => {
    if (!isUpdatingDefault) {
      await updateAccountBalances();
    }
  };

  // Additional effect to handle immediate reloads when accounts are missing
  useEffect(() => {
    // If we have no accounts and we're not loading, try to load them immediately
    if (accounts.length === 0 && !loading && !isUpdatingDefault) {
      console.log("Accounts array is empty, triggering immediate reload...");
      loadAccounts();
    }
  }, [accounts.length, loading, isUpdatingDefault]);

  useEffect(() => {
    // Initial load
    loadAccounts();
    
    // Immediate retry if accounts are missing after initial load
    const immediateRetry = setTimeout(() => {
      if (accounts.length === 0 && !loading) {
        console.log("Immediate retry after initial load...");
        loadAccounts();
      }
    }, 50); // Very fast immediate retry
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        if (event === 'SIGNED_IN' && session?.user && !isUpdatingDefault) {
          // User just signed in, load accounts
          await loadAccounts();
        } else if (event === 'SIGNED_OUT') {
          // User signed out, clear accounts
          setAccounts([]);
          setSelectedAccountState(null);
        }
      }
    );

    // Retry loading accounts every 1 second if no accounts loaded (faster retry)
    const retryInterval = setInterval(() => {
      if (accounts.length === 0 && !loading && !isUpdatingDefault) {
        console.log("Retrying to load accounts... (attempting to recover from missing accounts)");
        loadAccounts();
      }
    }, 1000);

    // Also retry immediately if accounts are missing after initial load
    if (accounts.length === 0 && !loading) {
      console.log("Accounts missing after initial load, retrying immediately...");
      setTimeout(() => loadAccounts(), 100); // Faster immediate retry
    }

    // Additional safety check: if we have a user but no accounts after 1 second, retry (faster safety check)
    const safetyCheck = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && accounts.length === 0 && !loading) {
        console.log("Safety check: User authenticated but no accounts, retrying...");
        loadAccounts();
      }
    }, 1000); // Faster safety check

    return () => {
      subscription.unsubscribe();
      clearInterval(retryInterval);
      clearTimeout(safetyCheck);
      clearTimeout(immediateRetry);
    };
  }, []);

  const value = {
    selectedAccount,
    setSelectedAccount,
    accounts,
    loading,
    refreshAccounts,
    calculateAccountBalance,
    refreshBalances,
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
