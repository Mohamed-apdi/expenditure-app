import { supabase } from "../database/supabase";
import type { Transaction, TransactionWithAccounts } from "../types/types";

export const fetchTransactions = async (
  userId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }

  return data || [];
};

export const fetchTransactionsWithAccounts = async (
  userId: string
): Promise<TransactionWithAccounts[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      *,
      account:accounts(*),
      related_account:accounts!transactions_account_id_fkey(*)
    `
    )
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions with accounts:", error);
    throw error;
  }

  return data || [];
};

export const fetchAllTransactionsAndTransfers = async (
  userId: string
): Promise<
  Array<
    Transaction & {
      isTransfer?: boolean;
      transferId?: string;
      from_account_id?: string;
      to_account_id?: string;
      transferDirection?: "from" | "to";
    }
  >
> => {
  try {
    // Fetch regular transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
      throw transactionsError;
    }

    // Fetch transfers
    const { data: transfers, error: transfersError } = await supabase
      .from("transfers")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (transfersError) {
      console.error("Error fetching transfers:", transfersError);
      throw transfersError;
    }

    // Combine and mark transfers
    const allTransactions: Array<
      Transaction & {
        isTransfer?: boolean;
        transferId?: string;
        from_account_id?: string;
        to_account_id?: string;
        transferDirection?: "from" | "to";
      }
    > = [];

    // Add regular transactions
    if (transactions) {
      allTransactions.push(
        ...transactions.map((t) => ({ ...t, isTransfer: false }))
      );
    }

    // Add transfers as two separate entries (expense and income)
    if (transfers) {
      // Fetch account names for transfers
      const accountIds = new Set<string>();
      transfers.forEach((transfer) => {
        accountIds.add(transfer.from_account_id);
        accountIds.add(transfer.to_account_id);
      });

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("id, name")
        .in("id", Array.from(accountIds));

      const accountMap = new Map();
      if (accountsData) {
        accountsData.forEach((account) => {
          accountMap.set(account.id, account.name);
        });
      }

      const transferTransactions = transfers.flatMap((transfer) => {
        const fromAccountName =
          accountMap.get(transfer.from_account_id) || transfer.from_account_id;
        const toAccountName =
          accountMap.get(transfer.to_account_id) || transfer.to_account_id;

        return [
          // Expense entry (from_account)
          {
            id: `${transfer.id}-from`,
            user_id: transfer.user_id || userId,
            account_id: transfer.from_account_id,
            amount: transfer.amount,
            description: `Transfer to ${toAccountName}`,
            date: transfer.date,
            category: "Transfer",
            is_recurring: false,
            recurrence_interval: undefined,
            type: "expense" as const,
            created_at: transfer.created_at,
            updated_at: transfer.updated_at,
            isTransfer: true,
            transferId: transfer.id,
            from_account_id: transfer.from_account_id,
            to_account_id: transfer.to_account_id,
            transferDirection: "from" as const,
          },
          // Income entry (to_account)
          {
            id: `${transfer.id}-to`,
            user_id: transfer.user_id || userId,
            account_id: transfer.to_account_id,
            amount: transfer.amount,
            description: `Transfer from ${fromAccountName}`,
            date: transfer.date,
            category: "Transfer",
            is_recurring: false,
            recurrence_interval: undefined,
            type: "income" as const,
            created_at: transfer.created_at,
            updated_at: transfer.updated_at,
            isTransfer: true,
            transferId: transfer.id,
            from_account_id: transfer.from_account_id,
            to_account_id: transfer.to_account_id,
            transferDirection: "to" as const,
          },
        ];
      });
      allTransactions.push(...transferTransactions);
    }

    // Sort by date (newest first)
    return allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error("Error fetching all transactions and transfers:", error);
    throw error;
  }
};

export const addTransaction = async (
  transaction: Omit<Transaction, "id" | "created_at" | "updated_at">
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from("transactions")
    .insert(transaction)
    .select()
    .single();

  if (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }

  return data;
};

export const updateTransaction = async (
  transactionId: string,
  updates: Partial<Omit<Transaction, "id" | "created_at" | "updated_at">>
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transactionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }

  return data;
};

export const deleteTransaction = async (
  transactionId: string
): Promise<void> => {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

export const deleteTransactionWithBalanceUpdate = async (
  transactionId: string,
  isTransfer: boolean = false,
  transferId?: string
): Promise<void> => {
  try {
    if (isTransfer && transferId) {
      // Handle transfer deletion
      const { data: transfer, error: transferError } = await supabase
        .from("transfers")
        .select("*")
        .eq("id", transferId)
        .single();

      if (transferError) {
        console.error("Error fetching transfer for deletion:", transferError);
        throw transferError;
      }

      if (!transfer) {
        throw new Error("Transfer not found");
      }

      // Get current account balances
      const { data: fromAccount, error: fromAccountError } = await supabase
        .from("accounts")
        .select("amount")
        .eq("id", transfer.from_account_id)
        .single();

      const { data: toAccount, error: toAccountError } = await supabase
        .from("accounts")
        .select("amount")
        .eq("id", transfer.to_account_id)
        .single();

      if (fromAccountError || toAccountError) {
        console.error(
          "Error fetching account balances:",
          fromAccountError || toAccountError
        );
        throw fromAccountError || toAccountError;
      }

      // Calculate new balances (reverse the transfer)
      const fromAccountNewBalance = fromAccount.amount + transfer.amount;
      const toAccountNewBalance = toAccount.amount - transfer.amount;

      // Delete the transfer
      const { error: deleteError } = await supabase
        .from("transfers")
        .delete()
        .eq("id", transferId);

      if (deleteError) {
        console.error("Error deleting transfer:", deleteError);
        throw deleteError;
      }

      // Update account balances
      await Promise.all([
        supabase
          .from("accounts")
          .update({ amount: fromAccountNewBalance })
          .eq("id", transfer.from_account_id),
        supabase
          .from("accounts")
          .update({ amount: toAccountNewBalance })
          .eq("id", transfer.to_account_id),
      ]);
    } else {
      // Handle regular transaction deletion
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (transactionError) {
        console.error(
          "Error fetching transaction for deletion:",
          transactionError
        );
        throw transactionError;
      }

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // Get current account balance
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("amount")
        .eq("id", transaction.account_id)
        .single();

      if (accountError) {
        console.error("Error fetching account balance:", accountError);
        throw accountError;
      }

      // Calculate new balance (reverse the transaction)
      let newBalance: number;
      if (transaction.type === "expense") {
        // Add back the expense amount
        newBalance = account.amount + transaction.amount;
      } else if (transaction.type === "income") {
        // Subtract the income amount
        newBalance = account.amount - transaction.amount;
      } else {
        throw new Error("Invalid transaction type");
      }

      // Delete the transaction
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (deleteError) {
        console.error("Error deleting transaction:", deleteError);
        throw deleteError;
      }

      // Update account balance
      await supabase
        .from("accounts")
        .update({ amount: newBalance })
        .eq("id", transaction.account_id);
    }
  } catch (error) {
    console.error("Error in deleteTransactionWithBalanceUpdate:", error);
    throw error;
  }
};

export const getTransactionById = async (
  transactionId: string
): Promise<Transaction | null> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching transaction by ID:", error);
    throw error;
  }

  return data;
};

export const getTransactionsByAccount = async (
  userId: string,
  accountId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by account:", error);
    throw error;
  }

  return data || [];
};

export const getTransactionsByType = async (
  userId: string,
  type: "expense" | "income" | "transfer"
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by type:", error);
    throw error;
  }

  return data || [];
};

export const getTransactionsByCategory = async (
  userId: string,
  category: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by category:", error);
    throw error;
  }

  return data || [];
};

export const getTransactionsByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions by date range:", error);
    throw error;
  }

  return data || [];
};

export const getRecurringTransactions = async (
  userId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_recurring", true)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching recurring transactions:", error);
    throw error;
  }

  return data || [];
};
