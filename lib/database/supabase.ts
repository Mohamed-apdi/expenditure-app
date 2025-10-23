import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto"; // Required for React Native
import { SUPABASE_URL, SUPABASE_KEY } from "@env";
import { getItemAsync } from "expo-secure-store";
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
