import { supabase } from './supabase';
import type { Goal } from './types';

export const fetchGoals = async (userId: string): Promise<Goal[]> => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goals:', error);
    throw error;
  }

  return data || [];
};

export const fetchGoalsWithAccounts = async (userId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('goals')
    .select(`
      *,
      account:accounts(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goals with accounts:', error);
    throw error;
  }

  return data || [];
};

export const addGoal = async (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>): Promise<Goal> => {
  const { data, error } = await supabase
    .from('goals')
    .insert(goal)
    .select()
    .single();

  if (error) {
    console.error('Error adding goal:', error);
    throw error;
  }

  return data;
};

export const updateGoal = async (
  goalId: string,
  updates: Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at'>>
): Promise<Goal> => {
  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();

  if (error) {
    console.error('Error updating goal:', error);
    throw error;
  }

  return data;
};

export const deleteGoal = async (goalId: string): Promise<void> => {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId);

  if (error) {
    console.error('Error deleting goal:', error);
    throw error;
  }
};

export const toggleGoalStatus = async (goalId: string, isActive: boolean): Promise<void> => {
  const { error } = await supabase
    .from('goals')
    .update({ is_active: isActive })
    .eq('id', goalId);

  if (error) {
    console.error('Error toggling goal status:', error);
    throw error;
  }
};

export const addAmountToGoal = async (goalId: string, amount: number): Promise<Goal> => {
  // First get the current goal to calculate new amount
  const { data: currentGoal, error: fetchError } = await supabase
    .from('goals')
    .select('current_amount')
    .eq('id', goalId)
    .single();

  if (fetchError) {
    console.error('Error fetching current goal:', fetchError);
    throw fetchError;
  }

  const newAmount = (currentGoal.current_amount || 0) + amount;

  // Update the goal with new amount
  const { data, error } = await supabase
    .from('goals')
    .update({ current_amount: newAmount })
    .eq('id', goalId)
    .select()
    .single();

  if (error) {
    console.error('Error adding amount to goal:', error);
    throw error;
  }

  return data;
};

export const withdrawAmountFromGoal = async (goalId: string, amount: number): Promise<Goal> => {
  // First get the current goal to calculate new amount
  const { data: currentGoal, error: fetchError } = await supabase
    .from('goals')
    .select('current_amount')
    .eq('id', goalId)
    .single();

  if (fetchError) {
    console.error('Error fetching current goal:', fetchError);
    throw fetchError;
  }

  const newAmount = Math.max(0, (currentGoal.current_amount || 0) - amount);

  // Update the goal with new amount
  const { data, error } = await supabase
    .from('goals')
    .update({ current_amount: newAmount })
    .eq('id', goalId)
    .select()
    .single();

  if (error) {
    console.error('Error withdrawing amount from goal:', error);
    throw error;
  }

  return data;
};

export const getGoalById = async (goalId: string): Promise<Goal | null> => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching goal by ID:', error);
    throw error;
  }

  return data;
};

export const getActiveGoals = async (userId: string): Promise<Goal[]> => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('target_date', { ascending: true });

  if (error) {
    console.error('Error fetching active goals:', error);
    throw error;
  }

  return data || [];
};

export const getGoalsByAccount = async (userId: string, accountId: string): Promise<Goal[]> => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goals by account:', error);
    throw error;
  }

  return data || [];
};

export const getGoalsByCategory = async (userId: string, category: string): Promise<Goal[]> => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goals by category:', error);
    throw error;
  }

  return data || [];
};

export const getUpcomingGoals = async (userId: string, days: number = 30): Promise<Goal[]> => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gte('target_date', new Date().toISOString().split('T')[0])
    .lte('target_date', futureDate.toISOString().split('T')[0])
    .order('target_date', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming goals:', error);
    throw error;
  }

  return data || [];
};

export const calculateGoalProgress = async (userId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('goals')
    .select('id, name, target_amount, current_amount, target_date, category')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error calculating goal progress:', error);
    throw error;
  }

  if (!data) return [];

  return data.map(goal => {
    const progress = (goal.current_amount / goal.target_amount) * 100;
    const daysLeft = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const remaining = goal.target_amount - goal.current_amount;
    
    return {
      ...goal,
      progress: Math.min(progress, 100),
      daysLeft: Math.max(daysLeft, 0),
      remaining: Math.max(remaining, 0)
    };
  });
};

export const getTotalSavings = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('goals')
    .select('current_amount')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error calculating total savings:', error);
    throw error;
  }

  if (!data) return 0;

  return data.reduce((total, goal) => total + (goal.current_amount || 0), 0);
};
