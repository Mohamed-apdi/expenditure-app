import { supabase } from './supabase';
import type { Transfer, TransferWithAccounts } from './types';

export const fetchTransfers = async (userId: string): Promise<Transfer[]> => {
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transfers:', error);
    throw error;
  }

  return data || [];
};

export const fetchTransfersWithAccounts = async (userId: string): Promise<TransferWithAccounts[]> => {
  const { data, error } = await supabase
    .from('transfers')
    .select(`
      *,
      from_account:accounts!transfers_from_account_id_fkey(*),
      to_account:accounts!transfers_to_account_id_fkey(*)
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transfers with accounts:', error);
    throw error;
  }

  return data || [];
};

export const addTransfer = async (transfer: Omit<Transfer, 'id' | 'created_at' | 'updated_at'>): Promise<Transfer> => {
  const { data, error } = await supabase
    .from('transfers')
    .insert(transfer)
    .select()
    .single();

  if (error) {
    console.error('Error adding transfer:', error);
    throw error;
  }

  return data;
};

export const updateTransfer = async (
  transferId: string,
  updates: Partial<Omit<Transfer, 'id' | 'created_at' | 'updated_at'>>
): Promise<Transfer> => {
  const { data, error } = await supabase
    .from('transfers')
    .update(updates)
    .eq('id', transferId)
    .select()
    .single();

  if (error) {
    console.error('Error updating transfer:', error);
    throw error;
  }

  return data;
};

export const deleteTransfer = async (transferId: string): Promise<void> => {
  const { error } = await supabase
    .from('transfers')
    .delete()
    .eq('id', transferId);

  if (error) {
    console.error('Error deleting transfer:', error);
    throw error;
  }
};

export const getTransferById = async (transferId: string): Promise<Transfer | null> => {
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .eq('id', transferId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching transfer by ID:', error);
    throw error;
  }

  return data;
};

export const getTransfersByAccount = async (userId: string, accountId: string): Promise<Transfer[]> => {
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transfers by account:', error);
    throw error;
  }

  return data || [];
};

export const getTransfersByDateRange = async (userId: string, startDate: string, endDate: string): Promise<Transfer[]> => {
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transfers by date range:', error);
    throw error;
  }

  return data || [];
};

export const getTransfersFromAccount = async (userId: string, accountId: string): Promise<Transfer[]> => {
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .eq('user_id', userId)
    .eq('from_account_id', accountId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transfers from account:', error);
    throw error;
  }

  return data || [];
};

export const getTransfersToAccount = async (userId: string, accountId: string): Promise<Transfer[]> => {
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .eq('user_id', userId)
    .eq('to_account_id', accountId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transfers to account:', error);
    throw error;
  }

  return data || [];
};
