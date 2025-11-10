import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Required for React Native
import { getItemAsync } from 'expo-secure-store';
import Constants from 'expo-constants';

// Debug function to log what's available
function logEnvironmentDebug() {
  console.log('=== SUPABASE ENV DEBUG ===');
  console.log('process.env.SUPABASE_URL:', process.env.SUPABASE_URL ? 'EXISTS' : 'MISSING');
  console.log('process.env.SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'EXISTS' : 'MISSING');
  console.log('Constants.expoConfig exists:', !!Constants.expoConfig);
  console.log('Constants.expoConfig?.extra?.SUPABASE_URL:', Constants.expoConfig?.extra?.SUPABASE_URL ? 'EXISTS' : 'MISSING');
  console.log('Constants.expoConfig?.extra?.SUPABASE_KEY:', Constants.expoConfig?.extra?.SUPABASE_KEY ? 'EXISTS' : 'MISSING');
  console.log('Constants.expoConfig?.extra keys:', Constants.expoConfig?.extra ? Object.keys(Constants.expoConfig.extra) : 'N/A');
  console.log('All SUPABASE env keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  console.log('========================');
}

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

// Log debug info first
logEnvironmentDebug();

// Try to get environment variables using SUPABASE_URL and SUPABASE_KEY (no EXPO_PUBLIC_ prefix)
SUPABASE_URL = getEnvVar('SUPABASE_URL');
SUPABASE_KEY = getEnvVar('SUPABASE_KEY');

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Log detailed debug info
  console.error('❌ SUPABASE ENVIRONMENT VARIABLES MISSING');
  logEnvironmentDebug();

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

// Create Supabase client - this will throw if URL or KEY are invalid
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
