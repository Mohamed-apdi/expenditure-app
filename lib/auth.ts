/**
 * Offline-first auth helpers. Use getSession() (cached, no network) first so the app
 * works when there is no internet; only call getUser() when online and session is missing.
 */

import NetInfo from "@react-native-community/netinfo";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./database/supabase";

async function isOnline(): Promise<boolean> {
  const net = await NetInfo.fetch();
  const connected = net.isConnected ?? false;
  const internetReachable =
    net.isInternetReachable === null ? true : (net.isInternetReachable ?? false);
  return connected && internetReachable;
}

/**
 * Returns the current user from cached session when possible (works offline).
 * Only calls the server (getUser) when online and no session is in cache.
 * Use this for local-first flows: adding expenses, loading accounts, etc.
 */
export async function getCurrentUserOfflineFirst(): Promise<User | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) return sessionData.session.user;
  } catch {
    // getSession can fail when storage is busy or unavailable
  }

  const online = await isOnline();
  if (!online) {
    // Offline and no session in cache: retry once after a short delay in case
    // storage hadn't finished hydrating (e.g. app just opened offline).
    await new Promise((r) => setTimeout(r, 100));
    try {
      const { data: retryData } = await supabase.auth.getSession();
      if (retryData?.session?.user) return retryData.session.user;
    } catch {
      // ignore
    }
    return null;
  }

  try {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData?.user) return null;
    return userData.user;
  } catch {
    return null;
  }
}
