import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Required for React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get environment variables using multiple methods for compatibility
// Priority: 1) Constants.expoConfig.extra (from app.config.js), 2) process.env (from EAS build)
const getEnvVar = (key: string): string | undefined => {
  // Try Constants.expoConfig.extra first (most reliable in EAS builds)
  // Then try process.env as fallback
  return (
    Constants.expoConfig?.extra?.[key] ||
    process.env[key]
  );
};

// Initialize variables - will be validated before creating client
let SUPABASE_URL: string | undefined;
let SUPABASE_KEY: string | undefined;

// Try to get environment variables using SUPABASE_URL and SUPABASE_KEY (no EXPO_PUBLIC_ prefix)
SUPABASE_URL = getEnvVar('SUPABASE_URL');
SUPABASE_KEY = getEnvVar('SUPABASE_KEY');

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_KEY) {
  const errorMessage = `Missing Supabase configuration. SUPABASE_URL and SUPABASE_KEY must be set via EAS secrets and the app must be rebuilt.`;

  console.error(errorMessage);
  console.error('Check: 1) EAS secrets are set, 2) eas.json maps them correctly, 3) App was rebuilt after adding secrets');

  // Throw error - this will crash the app but with a clear message
  throw new Error(errorMessage);
}

// Validate that the values are not empty strings
if (SUPABASE_URL.trim() === '' || SUPABASE_KEY.trim() === '') {
  console.error('❌ SUPABASE ENVIRONMENT VARIABLES ARE EMPTY STRINGS');
  throw new Error('Supabase environment variables are set but empty. Please check your EAS secrets.');
}

// Persist auth in AsyncStorage so cold starts (process killed / cleared from recents)
// still see a session via getSession() without hitting the network — required for offline-first.
// See: https://supabase.com/docs/reference/javascript/initializing?example=react-native-options-async-storage
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function getSupabaseWithToken(token: string) {
  return createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
