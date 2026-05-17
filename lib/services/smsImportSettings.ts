import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  NativeSmsImportConfig,
  SmsProvider,
} from "~/lib/sms/providers/types";
import { DEFAULT_NATIVE_SMS_IMPORT_CONFIG } from "~/lib/sms/providers/types";
import {
  KEY_ENABLED_PER_USER_PREFIX,
  KEY_IMPORT_ACCOUNT_PREFIX,
  KEY_SIM_MAP_PREFIX,
  migrateLegacyEvcEnabledOnce,
  setEvcImportAccountForSim,
  setEvcImportAccountId,
} from "./evcSmsSettings";

const KEY_SMS_IMPORT_V2 = "@sms_import_settings_v2:";
const KEY_MIGRATED = "@sms_import_migrated_v1_v2:";

export type ProviderSmsSettings = {
  enabled: boolean;
  defaultAccountId: string | null;
  sim1AccountId: string | null;
  sim2AccountId: string | null;
};

export type SmsImportUserSettings = {
  globalEnabled: boolean;
  globalDefaultAccountId: string | null;
  /** When true (default), show a local notification after each SMS-imported ledger transaction. */
  importTransactionNotificationsEnabled: boolean;
  evc: ProviderSmsSettings;
  somnet_jeeb: ProviderSmsSettings;
  salaam_bank: ProviderSmsSettings;
  somtel_edahab: ProviderSmsSettings;
};

const defaultProvider = (enabled: boolean): ProviderSmsSettings => ({
  enabled,
  defaultAccountId: null,
  sim1AccountId: null,
  sim2AccountId: null,
});

export function defaultSmsImportSettings(): SmsImportUserSettings {
  return {
    globalEnabled: false,
    globalDefaultAccountId: null,
    importTransactionNotificationsEnabled: true,
    evc: defaultProvider(false),
    somnet_jeeb: defaultProvider(false),
    salaam_bank: defaultProvider(false),
    somtel_edahab: defaultProvider(false),
  };
}

/** Settings storage key for a parsed SMS provider id. */
export function smsProviderSettingsKey(
  provider: import("~/lib/sms/providers/types").SmsProvider,
): keyof SmsImportUserSettings {
  return provider;
}

function key(userId: string): string {
  return `${KEY_SMS_IMPORT_V2}${userId}`;
}

async function migratedFlag(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_MIGRATED)) === "true";
  } catch {
    return false;
  }
}

async function setMigratedFlag(): Promise<void> {
  await AsyncStorage.setItem(KEY_MIGRATED, "true");
}

async function migrateFromLegacyIfNeeded(userId: string): Promise<void> {
  if (await migratedFlag()) return;
  const existing = await AsyncStorage.getItem(key(userId));
  if (existing) {
    await setMigratedFlag();
    return;
  }
  await migrateLegacyEvcEnabledOnce(userId);
  const legacyEnabled =
    (await AsyncStorage.getItem(`${KEY_ENABLED_PER_USER_PREFIX}${userId}`)) ===
    "true";
  const legacyDefault = await AsyncStorage.getItem(
    `${KEY_IMPORT_ACCOUNT_PREFIX}${userId}`,
  );
  let legacySim: { sim1?: string; sim2?: string } = {};
  try {
    const raw = await AsyncStorage.getItem(`${KEY_SIM_MAP_PREFIX}${userId}`);
    if (raw) legacySim = JSON.parse(raw) as { sim1?: string; sim2?: string };
  } catch {
    legacySim = {};
  }
  const base = defaultSmsImportSettings();
  if (legacyEnabled) {
    base.globalEnabled = true;
    base.evc.enabled = true;
    base.evc.defaultAccountId = legacyDefault?.trim() || null;
    base.evc.sim1AccountId = legacySim.sim1 ?? null;
    base.evc.sim2AccountId = legacySim.sim2 ?? null;
    base.globalDefaultAccountId = legacyDefault?.trim() || null;
  }
  await AsyncStorage.setItem(key(userId), JSON.stringify(base));
  await setMigratedFlag();
}

export async function getSmsImportSettings(
  userId: string,
): Promise<SmsImportUserSettings> {
  await migrateFromLegacyIfNeeded(userId);
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return defaultSmsImportSettings();
    const p = JSON.parse(raw) as SmsImportUserSettings;
    if (!p || typeof p !== "object") return defaultSmsImportSettings();
    return {
      ...defaultSmsImportSettings(),
      ...p,
      importTransactionNotificationsEnabled:
        p.importTransactionNotificationsEnabled ?? true,
      evc: { ...defaultProvider(false), ...p.evc },
      somnet_jeeb: { ...defaultProvider(false), ...p.somnet_jeeb },
      salaam_bank: { ...defaultProvider(false), ...p.salaam_bank },
      somtel_edahab: {
        ...defaultProvider(false),
        ...p.somtel_edahab,
        ...(p as { somtel?: ProviderSmsSettings }).somtel,
      },
    };
  } catch {
    return defaultSmsImportSettings();
  }
}

export async function saveSmsImportSettings(
  userId: string,
  next: SmsImportUserSettings,
): Promise<void> {
  await AsyncStorage.setItem(key(userId), JSON.stringify(next));
  await syncNativeSmsImportConfig(next);
  await mirrorLegacyEvcKeys(userId, next);
  try {
    const { syncEvcSmsNativeListening } = await import("./evcSmsBridge");
    await syncEvcSmsNativeListening();
  } catch {
    // ignore
  }
}

async function mirrorLegacyEvcKeys(
  userId: string,
  s: SmsImportUserSettings,
): Promise<void> {
  const evcOn = s.globalEnabled && s.evc.enabled;
  await AsyncStorage.setItem(
    `${KEY_ENABLED_PER_USER_PREFIX}${userId}`,
    evcOn ? "true" : "false",
  );
  await setEvcImportAccountId(userId, s.evc.defaultAccountId);
  await setEvcImportAccountForSim(userId, "sim1", s.evc.sim1AccountId);
  await setEvcImportAccountForSim(userId, "sim2", s.evc.sim2AccountId);
}

export function settingsToNativeConfig(
  s: SmsImportUserSettings,
): NativeSmsImportConfig {
  if (!s.globalEnabled) {
    return { ...DEFAULT_NATIVE_SMS_IMPORT_CONFIG };
  }
  return {
    globalEnabled: true,
    providerEvc: s.evc.enabled,
    providerSomnetJeeb: s.somnet_jeeb.enabled,
    providerSalaamBank: s.salaam_bank.enabled,
    providerSomtel: s.somtel_edahab.enabled,
    importTransactionNotificationsEnabled:
      s.importTransactionNotificationsEnabled,
  };
}

export async function syncNativeSmsImportConfig(
  s: SmsImportUserSettings,
): Promise<void> {
  try {
    const { requireOptionalNativeModule } = await import("expo-modules-core");
    const mod = requireOptionalNativeModule<{
      setSmsImportConfig?: (c: Record<string, boolean>) => boolean;
    }>("ExpoEvcSms");
    const c = settingsToNativeConfig(s);
    mod?.setSmsImportConfig?.({
      globalEnabled: c.globalEnabled,
      providerEvc: c.providerEvc,
      providerSomnetJeeb: c.providerSomnetJeeb,
      providerSalaamBank: c.providerSalaamBank,
      providerSomtel: c.providerSomtel,
      importTransactionNotificationsEnabled:
        c.importTransactionNotificationsEnabled,
    });
  } catch {
    // ignore
  }
}

export async function isSmsImportGloballyEnabled(
  userId: string,
): Promise<boolean> {
  const s = await getSmsImportSettings(userId);
  return s.globalEnabled;
}

export async function isSmsProviderEnabled(
  userId: string,
  provider: SmsProvider,
): Promise<boolean> {
  const s = await getSmsImportSettings(userId);
  if (!s.globalEnabled) return false;
  return s[smsProviderSettingsKey(provider)].enabled;
}
