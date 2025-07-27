import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Required for React Native
import { SUPABASE_URL, SUPABASE_KEY } from '@env';
import { getItemAsync } from "expo-secure-store";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function getSupabaseWithToken(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}




export async function fetchPredictions(userId: string) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function fetchExpenses(userId: string, month?: number, year?: number) {
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)

  if (month !== undefined && year !== undefined) {
    const startDate = new Date(year, month, 1).toISOString()
    const endDate = new Date(year, month + 1, 0).toISOString()
    query = query.gte('date', startDate).lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error("Supabase error:", error)
    throw error
  }
  
  return data
}