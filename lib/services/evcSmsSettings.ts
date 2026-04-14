import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_ENABLED = "@evc_sms_user_enabled_v1";
const KEY_CONSENT = "@evc_sms_consent_v1";
const KEY_IMPORT_ACCOUNT_PREFIX = "@evc_sms_import_account_v1:"; // + userId
const KEY_SIM_MAP_PREFIX = "@evc_sms_import_account_sim_map_v1:"; // + userId
const KEY_SLOT_SCHEME_PREFIX = "@evc_sms_slot_scheme_v1:"; // + userId

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

type SimAccountMap = Partial<Record<"sim1" | "sim2", string>>;

function keyImportAccount(userId: string): string {
  return `${KEY_IMPORT_ACCOUNT_PREFIX}${userId}`;
}

function keySimMap(userId: string): string {
  return `${KEY_SIM_MAP_PREFIX}${userId}`;
}

function keySlotScheme(userId: string): string {
  return `${KEY_SLOT_SCHEME_PREFIX}${userId}`;
}

export type EvcSimSlotScheme = "zero_based" | "one_based";

export async function getEvcSimSlotScheme(
  userId: string,
): Promise<EvcSimSlotScheme | null> {
  try {
    const v = await AsyncStorage.getItem(keySlotScheme(userId));
    return v === "zero_based" || v === "one_based" ? v : null;
  } catch {
    return null;
  }
}

export async function setEvcSimSlotScheme(
  userId: string,
  scheme: EvcSimSlotScheme,
): Promise<void> {
  await AsyncStorage.setItem(keySlotScheme(userId), scheme);
}

export async function getEvcImportAccountId(userId: string): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(keyImportAccount(userId));
    return v && v.trim().length > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function setEvcImportAccountId(
  userId: string,
  accountId: string | null,
): Promise<void> {
  const k = keyImportAccount(userId);
  if (!accountId) {
    await AsyncStorage.removeItem(k);
    return;
  }
  await AsyncStorage.setItem(k, accountId);
}

export async function getEvcImportAccountBySim(userId: string): Promise<SimAccountMap> {
  try {
    const raw = await AsyncStorage.getItem(keySimMap(userId));
    if (!raw) return {};
    const obj = JSON.parse(raw) as SimAccountMap;
    if (!obj || typeof obj !== "object") return {};
    return obj;
  } catch {
    return {};
  }
}

export async function setEvcImportAccountForSim(
  userId: string,
  sim: "sim1" | "sim2",
  accountId: string | null,
): Promise<void> {
  const cur = await getEvcImportAccountBySim(userId);
  const next: SimAccountMap = { ...cur };
  if (!accountId) {
    delete next[sim];
  } else {
    next[sim] = accountId;
  }
  await AsyncStorage.setItem(keySimMap(userId), JSON.stringify(next));
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
