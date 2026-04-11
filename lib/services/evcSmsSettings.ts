import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_ENABLED = "@evc_sms_user_enabled_v1";
const KEY_CONSENT = "@evc_sms_consent_v1";

export async function getEvcSmsUserEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY_ENABLED);
    return v === "true";
  } catch {
    return false;
  }
}

export async function setEvcSmsUserEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_ENABLED, enabled ? "true" : "false");
}

// Native mirror so the manifest receiver can respect the toggle when JS isn't running.
export async function syncEvcSmsNativeEnabledFlag(enabled: boolean): Promise<void> {
  try {
    const { requireOptionalNativeModule } = await import("expo-modules-core");
    const mod = requireOptionalNativeModule<any>("ExpoEvcSms");
    mod?.setNativeEnabled?.(enabled);
  } catch {
    // ignore
  }
}

export async function getEvcSmsConsentSeen(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY_CONSENT);
    return v === "true";
  } catch {
    return false;
  }
}

export async function setEvcSmsConsentSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY_CONSENT, "true");
}
