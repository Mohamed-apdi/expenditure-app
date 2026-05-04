/**
 * Local notifications after SMS auto-import successfully writes to the ledger.
 * No raw SMS body — only parsed fields + mapped account metadata.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { LANGUAGES } from "~/lib/config/language/languages";
import { getItem } from "~/lib/config/storage/secureStore";
import { getSmsImportSettings } from "~/lib/services/smsImportSettings";
import { categoryLabelFromStored } from "~/lib/utils/categories";
import { isExpoGo } from "~/lib/utils/expoGoUtils";
import {
  buildSmsImportNotificationCopy,
  type SmsImportNotificationInput,
} from "./smsImportRecordedNotificationCopy";

export {
  buildSmsImportNotificationCopy,
  counterpartyDisplay,
  shortProviderLabel,
  smsImportTailLabel,
  type SmsImportNotificationInput,
} from "./smsImportRecordedNotificationCopy";

export const SMS_IMPORT_NOTIFICATION_CHANNEL_ID = "sms-imports";

let androidChannelEnsured = false;

async function translationsForNotify(): Promise<(typeof LANGUAGES)["en" | "so"]> {
  try {
    const raw = await getItem("app_language");
    if (raw === "en" || raw === "so") return LANGUAGES[raw];
  } catch {
    /* ignore */
  }
  return LANGUAGES.so;
}

async function ensureAndroidSmsImportChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  if (androidChannelEnsured) return;
  await Notifications.setNotificationChannelAsync(SMS_IMPORT_NOTIFICATION_CHANNEL_ID, {
    name: "SMS imports",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    sound: "default",
  });
  androidChannelEnsured = true;
}

/**
 * Fire-and-forget from ledger apply: respects user setting, OS permission, Expo Go.
 */
export async function notifySmsImportRecordedIfEligible(
  userId: string,
  input: SmsImportNotificationInput,
): Promise<void> {
  if (isExpoGo) return;
  try {
    const settings = await getSmsImportSettings(userId);
    if (!settings.importTransactionNotificationsEnabled) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    await ensureAndroidSmsImportChannel();
    const t = await translationsForNotify();
    const rawCat = input.ledgerCategory;
    const resolvedCategory =
      rawCat != null && String(rawCat).trim().length > 0
        ? categoryLabelFromStored(t, rawCat)
        : "";
    const descTrim = (input.ledgerDescription ?? "").trim();
    const { title, body } = buildSmsImportNotificationCopy({
      ...input,
      resolvedCategoryLabel: resolvedCategory,
      ledgerDescriptionTrimmed: descTrim,
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === "android"
          ? {
              android: {
                channelId: SMS_IMPORT_NOTIFICATION_CHANNEL_ID,
              },
            }
          : {}),
      },
      trigger: null,
    });
  } catch (e) {
    console.warn("[SMS import] local notification failed", e);
  }
}
