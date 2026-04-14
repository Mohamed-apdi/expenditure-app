import { Platform, PermissionsAndroid } from "react-native";
import { EventEmitter, requireOptionalNativeModule } from "expo-modules-core";
import { getCurrentUserOfflineFirst } from "../auth";
import { isExpoGo } from "../utils/expoGoUtils";
import { getEvcSmsUserEnabled } from "./evcSmsSettings";

export type NativeEvcPendingRowNative = {
  id: number;
  sender: string;
  kind: string;
  amount?: number | null;
  dateIso?: string | null;
  tarRaw?: string | null;
  phone?: string | null;
  name?: string | null;
  merchantName?: string | null;
  noticeSummary?: string | null;
  subId?: number | null;
  slot?: number | null;
  createdAt: number;
};

type EvcNative = {
  setListeningEnabled: (enabled: boolean) => Promise<void>;
  emitTestEvent?: (sender: string, body: string) => boolean;
  getDebugState?: () => {
    hasReactContext?: boolean;
    receiverRegistered?: boolean;
    hasReceiveSms?: boolean;
    enabledPref?: boolean;
  };
  setNativeEnabled?: (enabled: boolean) => boolean;
  peekPendingRows?: (limit: number) => NativeEvcPendingRowNative[];
  deletePendingRowsByIds?: (ids: number[]) => boolean;
};

const NativeMod = requireOptionalNativeModule<EvcNative>("ExpoEvcSms");
// expo-modules-core EventEmitter typings require event-name generics; keep this module permissive.
const emitter: any = NativeMod ? new EventEmitter(NativeMod as any) : null;

export function isEvcSmsNativeAvailable(): boolean {
  return Platform.OS === "android" && !isExpoGo && NativeMod != null;
}

export async function requestSmsPermissionsForEvc(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  ]);
  return (
    results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] ===
    PermissionsAndroid.RESULTS.GRANTED
  );
}

async function hasSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  return await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  );
}

/** Keeps the native BroadcastReceiver aligned with user toggle + permissions. */
export async function syncEvcSmsNativeListening(): Promise<void> {
  if (!isEvcSmsNativeAvailable() || !NativeMod) return;
  const user = await getCurrentUserOfflineFirst();
  const want = user ? await getEvcSmsUserEnabled(user.id) : false;
  try {
    NativeMod.setNativeEnabled?.(want);
  } catch {
    // ignore
  }
  if (!want) {
    await NativeMod.setListeningEnabled(false);
    return;
  }
  const ok = await hasSmsPermissions();
  await NativeMod.setListeningEnabled(ok);
}

/** Pending rows captured while JS was not running (peek only; delete after apply). */
export function peekNativeEvcPendingRows(
  limit: number = 50,
): NativeEvcPendingRowNative[] {
  try {
    const rows = NativeMod?.peekPendingRows?.(limit);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export function deleteNativeEvcPendingRowsByIds(ids: number[]): void {
  if (ids.length === 0) return;
  try {
    NativeMod?.deletePendingRowsByIds?.(ids);
  } catch {
    // ignore
  }
}

export function subscribeEvcSms(
  onSms: (payload: {
    sender: string;
    body: string;
    subId?: number | null;
    slot?: number | null;
  }) => void,
): { remove: () => void } | null {
  if (!emitter) return null;
  return (emitter as { addListener: (e: string, cb: typeof onSms) => { remove: () => void } }).addListener(
    "onEvcSms",
    onSms,
  );
}

export function subscribeSmsDebug(
  onDebug: (payload: {
    sender: string;
    bodyLen: number;
    forwarded: boolean;
    subId?: number | null;
    slot?: number | null;
  }) => void,
): { remove: () => void } | null {
  if (!emitter) return null;
  return (emitter as { addListener: (e: string, cb: typeof onDebug) => { remove: () => void } }).addListener(
    "onSmsDebug",
    onDebug,
  );
}

/** Debug helper: prove JS<->native event wiring works without real SMS. */
export function emitEvcSmsTestEvent(): boolean {
  try {
    return (
      NativeMod?.emitTestEvent?.(
        "192",
        "[-EVCPLUS-] $1 ayaad uwareejisay TEST(617703215), Tar: 21/03/26 12:22:27, Haraagaagu waa $130.5.",
      ) ?? false
    );
  } catch {
    return false;
  }
}

export function getEvcSmsDebugState() {
  try {
    return NativeMod?.getDebugState?.() ?? null;
  } catch {
    return null;
  }
}
