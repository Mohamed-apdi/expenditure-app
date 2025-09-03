import { supabase } from "../database/supabase";
import type {
  Account,
  AccountGroup,
  AccountType,
  AccountWithGroup,
} from "../types/types";

export const fetchAccounts = async (userId: string): Promise<Account[]> => {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    throw error;
  }

  return data || [];
};

export const fetchAccountsWithGroups = async (
  userId: string
): Promise<AccountWithGroup[]> => {
  const { data, error } = await supabase
    .from("accounts")
    .select(
      `
      *,
      group:account_groups(*),
      type_info:account_types(*)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    throw error;
  }

  return data || [];
};

export const createAccount = async (accountData: {
  user_id: string;
  account_type: string;
  name: string;
  amount: number;
  description?: string;
}): Promise<Account> => {
  try {
    const { data, error } = await supabase
      .from("accounts")
      .insert([accountData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  }
};

export const updateAccount = async (
  accountId: string,
  updates: Partial<{
    account_type: string;
    name: string;
    amount: number;
    description: string;
  }>
): Promise<Account> => {
  try {
    const { data, error } = await supabase
      .from("accounts")
      .update(updates)
      .eq("id", accountId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating account:", error);
    throw error;
  }
};

export const deleteAccount = async (accountId: string): Promise<void> => {
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId);

  if (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
};

export const fetchAccountGroups = async (
  userId: string
): Promise<AccountGroup[]> => {
  const { data, error } = await supabase
    .from("account_groups")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching account groups:", error);
    throw error;
  }

  return data || [];
};

export const addAccountGroup = async (
  group: Omit<AccountGroup, "id" | "created_at" | "updated_at">
): Promise<AccountGroup> => {
  const { data, error } = await supabase
    .from("account_groups")
    .insert(group)
    .select()
    .single();

  if (error) {
    console.error("Error adding account group:", error);
    throw error;
  }

  return data;
};

export const updateAccountGroup = async (
  groupId: string,
  updates: Partial<Omit<AccountGroup, "id" | "created_at" | "updated_at">>
): Promise<AccountGroup> => {
  const { data, error } = await supabase
    .from("account_groups")
    .update(updates)
    .eq("id", groupId)
    .select()
    .single();

  if (error) {
    console.error("Error updating account group:", error);
    throw error;
  }

  return data;
};

export const deleteAccountGroup = async (groupId: string): Promise<void> => {
  const { error } = await supabase
    .from("account_groups")
    .delete()
    .eq("id", groupId);

  if (error) {
    console.error("Error deleting account group:", error);
    throw error;
  }
};

export const fetchAccountTypes = async (): Promise<AccountType[]> => {
  const { data, error } = await supabase
    .from("account_types")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching account types:", error);
    throw error;
  }

  return data || [];
};

export const updateAccountBalance = async (
  accountId: string,
  newBalance: number
): Promise<void> => {
  const { error } = await supabase
    .from("accounts")
    .update({ amount: newBalance })
    .eq("id", accountId);

  if (error) {
    console.error("Error updating account balance:", error);
    throw error;
  }
};

export const getDefaultAccount = async (
  userId: string
): Promise<Account | null> => {
  // Temporarily return the first account since is_default column doesn't exist
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "no rows returned"
    console.error("Error fetching default account:", error);
    throw error;
  }

  return data;
};
