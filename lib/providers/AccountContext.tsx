/**
 * Account context: selected account, list of accounts, balance/refresh helpers.
 * Offline-first: accounts from Legend-State store (SQLite); no Supabase fetch for list.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { getCurrentUserOfflineFirst } from "../auth";
import { supabase } from "../database/supabase";
import {
  accounts$,
  selectAccounts,
  selectAccountById,
  setAccountsFromServer,
  updateAccountLocal,
  toAccount,
} from "../stores/accountsStore";
import { fetchAccounts } from "../services/accounts";
import type { Account } from "../types/types";

/** Clear account state so we never show a previous user's data (spec 005). */
function clearUserScopedState(
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>,
  setSelectedAccountState: React.Dispatch<React.SetStateAction<Account | null>>,
  setHasInitialized: React.Dispatch<React.SetStateAction<boolean>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  setAccounts([]);
  setSelectedAccountState(null);
  setHasInitialized(false);
  setLoading(false);
}

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

  // Track current user id so we clear state when user changes (spec 005: fix new user seeing other user data)
  const currentUserIdRef = useRef<string | null>(null);

  // Clear state when authenticated user changes so we never show another user's data
  useEffect(() => {
    const handleAuthChange = async (
      _event: string,
      session: { user?: { id: string } } | null
    ) => {
      const userId = session?.user?.id ?? null;

      if (userId === null) {
        clearUserScopedState(
          setAccounts,
          setSelectedAccountState,
          setHasInitialized,
          setLoading
        );
        currentUserIdRef.current = null;
        return;
      }

      if (userId !== currentUserIdRef.current) {
        clearUserScopedState(
          setAccounts,
          setSelectedAccountState,
          setHasInitialized,
          setLoading
        );
        currentUserIdRef.current = userId;
        await loadAccounts();
      }
    };

    // Sync with current session on mount (works offline from cached session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange("INITIAL_SESSION", session);
    }).catch(() => {
      handleAuthChange("INITIAL_SESSION", null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthChange(event, session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // loadAccounts is stable enough for initial mount + auth listener

  const applyAccountsFromStore = useCallback((userId: string) => {
    const list = selectAccounts(userId).map(toAccount);
    setAccounts(list);
    setSelectedAccountState((prev) => {
      if (!prev || list.length === 0) return prev;
      const updated = list.find((acc) => acc.id === prev.id);
      return updated ?? prev;
    });
  }, []);

  useEffect(() => {
    const unsub = accounts$.onChange(() => {
      const userId = currentUserIdRef.current;
      if (userId) applyAccountsFromStore(userId);
    });
    return unsub;
  }, [applyAccountsFromStore]);

  const calculateAccountBalance = useCallback(
    async (accountId: string): Promise<number> => {
      try {
        const user = await getCurrentUserOfflineFirst();
        if (!user) return 0;
        const account = selectAccountById(user.id, accountId);
        return account?.amount ?? 0;
      } catch (error) {
        console.error("Error calculating account balance:", accountId, error);
        return 0;
      }
    },
    []
  );

  const updateAccountBalances = async () => {
    try {
      const userId = currentUserIdRef.current;
      if (userId) applyAccountsFromStore(userId);
    } catch (error) {
      console.error("Error updating account balances:", error);
    }
  };

  const setSelectedAccount = useCallback(
    async (account: Account | null) => {
      try {
        if (account && !isUpdatingDefault) {
          setIsUpdatingDefault(true);
          accounts.forEach((acc) => {
            updateAccountLocal(acc.id, { is_default: acc.id === account.id });
          });
          setSelectedAccountState(account);
          setAccounts((prev) =>
            prev.map((acc) => ({
              ...acc,
              is_default: acc.id === account.id,
            }))
          );
        } else if (!account) {
          setSelectedAccountState(null);
        }
      } catch (error) {
        console.error("Error updating account selection:", error);
        setSelectedAccountState(account);
      } finally {
        setIsUpdatingDefault(false);
      }
    },
    [accounts, isUpdatingDefault]
  );

  const loadAccounts = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const user = await getCurrentUserOfflineFirst();
      if (!user) {
        setLoading(false);
        return;
      }
      let list = selectAccounts(user.id).map(toAccount);
      // When local store is empty (e.g. after login before sync, or sync error), seed from server
      // so dashboard and WalletDropdown show accounts instead of loading/empty.
      if (list.length === 0) {
        try {
          const serverAccounts = await fetchAccounts(user.id);
          if (serverAccounts?.length > 0) {
            setAccountsFromServer(user.id, serverAccounts as Array<Record<string, unknown>>);
            list = selectAccounts(user.id).map(toAccount);
          }
        } catch (seedError) {
          console.error("Error seeding accounts from server:", seedError);
        }
      }
      if (list.length > 0) {
        setAccounts(list);
        if (!selectedAccount && !isUpdatingDefault) {
          const defaultAccount = list.find((acc) => acc.is_default === true);
          setSelectedAccountState(defaultAccount ?? list[0]);
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
      const user = await getCurrentUserOfflineFirst();
      if (!user) {
        setLoading(false);
        return;
      }
      let list = selectAccounts(user.id).map(toAccount);
      if (list.length === 0) {
        try {
          const serverAccounts = await fetchAccounts(user.id);
          if (serverAccounts?.length > 0) {
            setAccountsFromServer(user.id, serverAccounts as Array<Record<string, unknown>>);
            list = selectAccounts(user.id).map(toAccount);
          }
        } catch (seedError) {
          console.error("Error seeding accounts from server:", seedError);
        }
      }
      if (list.length > 0) {
        setAccounts(list);
        if (!selectedAccount && !isUpdatingDefault) {
          const defaultAccount = list.find((acc) => acc.is_default === true);
          setSelectedAccountState(defaultAccount ?? list[0]);
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
  }, [selectedAccount?.id, isUpdatingDefault]);

  // Function to refresh balances after transaction changes (stable ref to avoid consumer effect loops)
  const refreshBalances = useCallback(async () => {
    if (!isUpdatingDefault) {
      await updateAccountBalances();
    }
  }, [isUpdatingDefault]);

  const value = useMemo(
    () => ({
      selectedAccount,
      setSelectedAccount,
      accounts,
      loading,
      refreshAccounts,
      calculateAccountBalance,
      refreshBalances,
      initializeAccounts,
    }),
    [
      selectedAccount,
      setSelectedAccount,
      accounts,
      loading,
      refreshAccounts,
      calculateAccountBalance,
      refreshBalances,
      initializeAccounts,
    ]
  );

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
