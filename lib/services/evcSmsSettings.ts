import AsyncStorage from "@react-native-async-storage/async-storage";

/** @deprecated Legacy global toggle; migrated once to per-user keys. */
const KEY_ENABLED_LEGACY = "@evc_sms_user_enabled_v1";
const KEY_ENABLED_PER_USER_PREFIX = "@evc_sms_user_enabled_per_user_v1:";
const KEY_ENABLED_LEGACY_MIGRATED = "@evc_sms_user_enabled_legacy_migrated_v1";

function keyUserEnabled(userId: string): string {
  return `${KEY_ENABLED_PER_USER_PREFIX}${userId}`;
}

/**
 * First logged-in user after upgrade keeps the old global ON/OFF value;
 * the legacy key is removed so other accounts on the device do not inherit it.
 */
async function migrateLegacyEvcEnabledOnce(currentUserId: string): Promise<void> {
  try {
    const migrated = await AsyncStorage.getItem(KEY_ENABLED_LEGACY_MIGRATED);
    if (migrated === "true") return;
    const legacy = await AsyncStorage.getItem(KEY_ENABLED_LEGACY);
    if (legacy !== null) {
      await AsyncStorage.setItem(keyUserEnabled(currentUserId), legacy);
      await AsyncStorage.removeItem(KEY_ENABLED_LEGACY);
    }
    await AsyncStorage.setItem(KEY_ENABLED_LEGACY_MIGRATED, "true");
  } catch {
    // ignore
  }
}
const KEY_CONSENT = "@evc_sms_consent_v1";
const KEY_IMPORT_ACCOUNT_PREFIX = "@evc_sms_import_account_v1:"; // + userId
const KEY_SIM_MAP_PREFIX = "@evc_sms_import_account_sim_map_v1:"; // + userId
const KEY_SLOT_SCHEME_PREFIX = "@evc_sms_slot_scheme_v1:"; // + userId
const KEY_DISCOVERY_DISMISSED_PREFIX = "@evc_sms_discovery_sheet_dismissed_v1:"; // + userId

function keyDiscoveryDismissed(userId: string): string {
  return `${KEY_DISCOVERY_DISMISSED_PREFIX}${userId}`;
}

/** User tapped "Don't show again" on the post-login EVC discovery sheet. */
export async function getEvcDiscoverySheetDismissedForever(
  userId: string,
): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(keyDiscoveryDismissed(userId));
    return v === "true";
  } catch {
    return false;
  }
}

export async function setEvcDiscoverySheetDismissedForever(
  userId: string,
): Promise<void> {
  await AsyncStorage.setItem(keyDiscoveryDismissed(userId), "true");
}

/** True when user has already enabled EVC or configured any import account mapping. */
export async function isEvcDiscoverySetupComplete(userId: string): Promise<boolean> {
  if (await getEvcSmsUserEnabled(userId)) return true;
  const fallback = await getEvcImportAccountId(userId);
  if (fallback) return true;
  const sim = await getEvcImportAccountBySim(userId);
  if (sim.sim1 || sim.sim2) return true;
  return false;
}

export async function getEvcSmsUserEnabled(userId: string): Promise<boolean> {
  await migrateLegacyEvcEnabledOnce(userId);
  try {
    const v = await AsyncStorage.getItem(keyUserEnabled(userId));
    return v === "true";
  } catch {
    return false;
  }
}

export async function setEvcSmsUserEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  await migrateLegacyEvcEnabledOnce(userId);
  await AsyncStorage.setItem(keyUserEnabled(userId), enabled ? "true" : "false");
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
