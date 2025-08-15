import { supabase } from "./supabase";

export type Account = {
  id: string;
  user_id: string;
  group_name: string;
  name: string;
  amount: number;
  description?: string;
  type?: "asset" | "liability";
  created_at: string;
  updated_at: string;
};

export const fetchAccounts = async (): Promise<Account[]> => {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    throw error;
  }

  return data || [];
};

export const addAccount = async (
  account: Omit<Account, "id" | "created_at" | "updated_at">
): Promise<Account> => {
  const { data, error } = await supabase
    .from("accounts")
    .insert(account)
    .select()
    .single();

  if (error) {
    console.error("Error adding account:", error);
    throw error;
  }

  return data;
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
