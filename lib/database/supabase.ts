import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Required for React Native
import { SUPABASE_URL, SUPABASE_KEY } from '@env';
import { getItemAsync } from 'expo-secure-store';

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
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
