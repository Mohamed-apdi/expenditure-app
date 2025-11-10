import Constants from 'expo-constants';

/**
 * Debug utility to check what environment variables are available
 * This helps diagnose EAS build issues
 */
export function debugEnvironmentVariables() {
  const debug = {
    processEnv: {
      EXPO_PUBLIC_SUPABASE_URL: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_KEY: !!process.env.EXPO_PUBLIC_SUPABASE_KEY,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_KEY: !!process.env.SUPABASE_KEY,
      allKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('EXPO')),
    },
    constants: {
      hasExpoConfig: !!Constants.expoConfig,
      extraKeys: Object.keys(Constants.expoConfig?.extra || {}),
      supabaseUrl: !!Constants.expoConfig?.extra?.SUPABASE_URL,
      supabaseKey: !!Constants.expoConfig?.extra?.SUPABASE_KEY,
    },
  };

  console.log('🔍 Environment Variables Debug:', JSON.stringify(debug, null, 2));
  return debug;
}


