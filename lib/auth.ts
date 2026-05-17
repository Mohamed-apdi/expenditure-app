/**
 * Offline-first auth helpers. Use getSession() (cached, no network) first so the app
 * works when there is no internet; fall back to SecureStore backup when hydration
 * is slow or AsyncStorage was cleared.
 */

import NetInfo from "@react-native-community/netinfo";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./database/supabase";
import {
  getPersistedUserId,
  restoreAuthSessionFromSecureStore,
} from "./auth/sessionPersistence";

async function isOnline(): Promise<boolean> {
  const net = await NetInfo.fetch();
  const connected = net.isConnected ?? false;
  const internetReachable =
    net.isInternetReachable === null ? true : (net.isInternetReachable ?? false);
  return connected && internetReachable;
}

async function readCachedSession(
  attempts = 5,
  delayMs = 80,
): Promise<Session | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) return data.session;
    } catch {
      // storage may not be ready yet
    }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}

function offlineUserFromId(userId: string): User {
  return { id: userId } as User;
}

/**
 * Returns the current user from cached session when possible (works offline).
 * Only calls the server (getUser) when online and no session is in cache.
 * Use this for local-first flows: adding expenses, loading accounts, etc.
 */
export async function getCurrentUserOfflineFirst(): Promise<User | null> {
  let session = await readCachedSession();
  if (session?.user) return session.user;

  const restored = await restoreAuthSessionFromSecureStore();
  if (restored?.user) return restored.user;

  session = await readCachedSession(3, 50);
  if (session?.user) return session.user;

  const persistedUserId = await getPersistedUserId();
  if (persistedUserId) {
    return offlineUserFromId(persistedUserId);
  }

  const online = await isOnline();
  if (!online) return null;

  try {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData?.user) return null;
    return userData.user;
  } catch {
    return null;
  }
}

/**
 * Ensures a session is loaded before routing (e.g. app index). Returns true if a
 * user can enter the main app (valid or offline-restored session).
 */
export async function ensureAuthSessionForRouting(): Promise<boolean> {
  const session = await readCachedSession();
  if (session?.user) return true;

  const restored = await restoreAuthSessionFromSecureStore();
  if (restored?.user) return true;

  const userId = await getPersistedUserId();
  return !!userId;
}
