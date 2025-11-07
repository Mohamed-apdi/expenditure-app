import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Required for React Native
import { getItemAsync } from 'expo-secure-store';

// Get environment variables using Expo's native system
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing Supabase environment variables. Please check your .env file or EAS secrets.',
  );
  throw new Error(
    'Missing required environment variables: SUPABASE_URL and SUPABASE_KEY must be set.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function getSupabaseWithToken(token: string) {
  return createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
