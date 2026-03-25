import { Platform, PermissionsAndroid } from "react-native";
import { EventEmitter, requireOptionalNativeModule } from "expo-modules-core";
import { isExpoGo } from "../utils/expoGoUtils";
import { getEvcSmsUserEnabled } from "./evcSmsSettings";

type EvcNative = {
  setListeningEnabled: (enabled: boolean) => Promise<void>;
  emitTestEvent?: (sender: string, body: string) => boolean;
  getDebugState?: () => {
    hasReactContext?: boolean;
    receiverRegistered?: boolean;
    hasReceiveSms?: boolean;
    hasReadSms?: boolean;
    enabledPref?: boolean;
  };
  setNativeEnabled?: (enabled: boolean) => boolean;
  fetchAndClearPending?: (limit: number) => Array<{
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
    createdAt: number;
  }>;
};

const NativeMod = requireOptionalNativeModule<EvcNative>("ExpoEvcSms");
const emitter = NativeMod ? new EventEmitter(NativeMod as any) : null;

export function isEvcSmsNativeAvailable(): boolean {
  return Platform.OS === "android" && !isExpoGo && NativeMod != null;
}

export async function requestSmsPermissionsForEvc(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    PermissionsAndroid.PERMISSIONS.READ_SMS,
  ]);
  return (
    results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] ===
      PermissionsAndroid.RESULTS.GRANTED &&
    results[PermissionsAndroid.PERMISSIONS.READ_SMS] ===
      PermissionsAndroid.RESULTS.GRANTED
  );
}

async function hasSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const r = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  );
  const s = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
  );
  return r && s;
}

/** Keeps the native BroadcastReceiver aligned with user toggle + permissions. */
export async function syncEvcSmsNativeListening(): Promise<void> {
  if (!isEvcSmsNativeAvailable() || !NativeMod) return;
  const want = await getEvcSmsUserEnabled();
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

export function subscribeEvcSms(
  onSms: (payload: { sender: string; body: string }) => void,
): { remove: () => void } | null {
  if (!emitter) return null;
  return emitter.addListener("onEvcSms", onSms as any);
}

export function subscribeSmsDebug(
  onDebug: (payload: { sender: string; bodyLen: number; forwarded: boolean }) => void,
): { remove: () => void } | null {
  if (!emitter) return null;
  return emitter.addListener("onSmsDebug", onDebug as any);
}

/** Debug helper: prove JS<->native event wiring works without real SMS. */
export function emitEvcSmsTestEvent(): boolean {
  try {
    return NativeMod?.emitTestEvent?.("192", "[-EVCPLUS-] $1 ayaad uwareejisay TEST(617703215), Tar: 21/03/26 12:22:27, Haraagaagu waa $130.5.") ?? false;
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
