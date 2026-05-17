/**
 * Constraint: This repo is the Expo RN app only.
 * Backend migrations and auth policies are tracked separately; do not modify
 * Supabase RLS or server auth here.
 *
 * Session helper for:
 * - Restoring Supabase session from SecureStore
 * - Detecting "session expired + offline"
 * - Applying the biometric / PIN gate for offline access (policy C)
 *
 * This file purposely exposes a small surface area so UI and routing
 * (e.g. AuthGateScreen) can make clear decisions about offline entry.
 */

import NetInfo from "@react-native-community/netinfo";
import * as LocalAuthentication from "expo-local-authentication";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../database/supabase";
import {
  persistAuthSession,
  restoreAuthSessionFromSecureStore,
} from "./sessionPersistence";

export type OfflineGateState =
  | "locked" // session expired + offline, biometric/PIN not yet passed
  | "unlocked" // biometric/PIN passed, offline cache accessible
  | "not_required"; // either session valid or online

export interface SessionStatus {
  session: Session | null;
  isOnline: boolean;
  isExpired: boolean;
  canEnterOfflineMode: boolean;
  offlineGateState: OfflineGateState;
}

/**
 * Restore Supabase session from SecureStore (if present) and set it on the client.
 * NOTE: The exact format of the stored session is determined by the auth flow;
 * this is a minimal placeholder that assumes a JSON-serialized Session.
 */
export async function restoreSessionFromSecureStore(): Promise<Session | null> {
  return restoreAuthSessionFromSecureStore();
}

/** @deprecated Use persistAuthSession from sessionPersistence */
export async function persistSession(session: Session | null): Promise<void> {
  await persistAuthSession(session);
}

export { clearPersistedAuthSession, persistAuthSession };

/**
 * Determine whether the session is "expired enough" that we should gate offline
 * access behind biometric / PIN. This is deliberately simplified; server-side
 * truth about expiry remains in Supabase.
 */
function isSessionExpired(session: Session | null): boolean {
  if (!session) return true;
  const expiresAt = session.expires_at;
  if (!expiresAt) return false;
  const now = Math.floor(Date.now() / 1000);
  // Add a small buffer so we don't skate too close to expiry.
  return now > expiresAt - 60;
}

/**
 * Evaluate current session + connectivity and decide whether we can
 * enter offline mode, and whether a biometric / PIN gate is required.
 */
export async function getSessionStatus(): Promise<SessionStatus> {
  const netState = await NetInfo.fetch();
  const isOnline = !!netState.isConnected && !!netState.isInternetReachable;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const expired = isSessionExpired(session);

  if (isOnline) {
    // Online: we can always rely on server-side auth / refresh.
    return {
      session,
      isOnline: true,
      isExpired: expired,
      canEnterOfflineMode: true,
      offlineGateState: "not_required",
    };
  }

  // Offline path
  if (!expired) {
    return {
      session,
      isOnline: false,
      isExpired: false,
      canEnterOfflineMode: true,
      offlineGateState: "not_required",
    };
  }

  // Session expired + offline => must go through biometric/PIN gate (policy C).
  return {
    session,
    isOnline: false,
    isExpired: true,
    canEnterOfflineMode: true,
    offlineGateState: "locked",
  };
}

/**
 * Run the biometric / PIN gate for offline access when offlineGateState === "locked".
 * On success, caller may treat the app as "unlocked" for offline usage (local reads/writes
 * that remain queued for sync).
 */
export async function runOfflineBiometricGate(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    // Fallback policy decision: for now, deny access; callers may show a message.
    // If you later choose to support PIN-only gates, wire it in here.
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock offline mode",
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });

  return result.success;
}
