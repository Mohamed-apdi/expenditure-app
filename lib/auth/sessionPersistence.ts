/**
 * SecureStore backup for Supabase auth — survives AsyncStorage clears and supports
 * offline restore when the in-memory client has not hydrated yet.
 */
import * as SecureStore from "expo-secure-store";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../database/supabase";

export const SUPABASE_SESSION_KEY = "supabase_session";
export const USER_ID_KEY = "userId";
export const TOKEN_KEY = "token";

export async function persistAuthSession(session: Session | null): Promise<void> {
  if (!session?.user) {
    await clearPersistedAuthSession();
    return;
  }
  await SecureStore.setItemAsync(SUPABASE_SESSION_KEY, JSON.stringify(session));
  await SecureStore.setItemAsync(USER_ID_KEY, session.user.id);
  await SecureStore.setItemAsync(TOKEN_KEY, session.access_token);
}

export async function clearPersistedAuthSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SUPABASE_SESSION_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(USER_ID_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync("refresh_token").catch(() => {}),
  ]);
}

/**
 * Restore session from SecureStore into the Supabase client.
 * When offline, setSession may fail to refresh — we still keep the stored session
 * so callers can read user.id for local SQLite access.
 */
export async function restoreAuthSessionFromSecureStore(): Promise<Session | null> {
  try {
    const raw = await SecureStore.getItemAsync(SUPABASE_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.access_token) return null;

    const { data, error } = await supabase.auth.setSession({
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token ?? "",
    });

    if (!error && data.session) return data.session;

    // Offline or refresh failed: use cached client session if present, else stored copy.
    const { data: cached } = await supabase.auth.getSession();
    if (cached.session?.user) return cached.session;

    return parsed.user ? parsed : null;
  } catch (e) {
    console.warn("[auth] Failed to restore session from SecureStore", e);
    return null;
  }
}

export async function getPersistedUserId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(USER_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth changes and keep SecureStore in sync.
 * Call once from the root layout on app start.
 */
export function initAuthSessionPersistence(): () => void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await persistAuthSession(data.session);
        return;
      }
      await restoreAuthSessionFromSecureStore();
    } catch {
      // ignore — screens will retry via getCurrentUserOfflineFirst
    }
  })();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      await clearPersistedAuthSession();
      return;
    }
    if (session) {
      await persistAuthSession(session);
    }
  });

  return () => subscription.unsubscribe();
}
