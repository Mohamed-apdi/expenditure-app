/**
 * Local database via PowerSync. Provides offline-first SQLite storage.
 * When PowerSync is configured, syncs with Supabase. Otherwise, local-only.
 * See specs/002-offline-online-support/plan.md
 *
 * To enable: set POWER_SYNC_URL in app.config.js extra and EAS secrets.
 * Then run: npx expo prebuild && npx expo run:android (or ios)
 */

import Constants from "expo-constants";

export type LocalDbExecuteResult = { rows?: { _array?: unknown[] } };

export interface LocalDb {
  execute(sql: string, params?: unknown[]): Promise<LocalDbExecuteResult>;
  close(): Promise<void>;
}

let db: LocalDb | null = null;

function getPowerSyncUrl(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.POWER_SYNC_URL as string | undefined) ||
    process.env.POWER_SYNC_URL
  );
}

/**
 * Initialize PowerSync database when POWER_SYNC_URL is set.
 * Requires: npm install @powersync/react-native @journeyapps/react-native-quick-sqlite
 * Returns true if PowerSync is available and initialized.
 */
export async function initLocalDb(): Promise<boolean> {
  const url = getPowerSyncUrl();
  if (!url) {
    return false;
  }

  try {
    const { PowerSyncDatabase } = await import("@powersync/react-native");
    const { SCHEMA } = await import("./schema");

    db = new PowerSyncDatabase({
      schema: { schema: SCHEMA },
      database: { dbFilename: "qoondeeye.db" },
    }) as unknown as LocalDb;

    await (db as unknown as { initialize: () => Promise<void> }).initialize?.();
    return true;
  } catch (e) {
    console.warn("[localDb] PowerSync init failed:", e);
    return false;
  }
}

export function getLocalDb(): LocalDb | null {
  return db;
}

export function isLocalDbAvailable(): boolean {
  return db != null;
}

export async function closeLocalDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
