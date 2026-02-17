import type {
  Change,
  Observable,
  ObservablePersistLocal,
  ObservablePersistenceConfigLocalGlobalOptions,
  PersistMetadata,
  PersistOptionsLocal,
} from "@legendapp/state";
import {
  configureObservablePersistence,
  persistObservable,
} from "@legendapp/state/persist";
import Storage from "expo-sqlite/kv-store";

/**
 * Lightweight SQLite-based persistence plugin backed by Expo's kv-store.
 *
 * This keeps large entity tables out of AsyncStorage and in a more robust
 * SQLite-backed store, while still using a simple key/value contract.
 */
class ObservablePersistSQLite implements ObservablePersistLocal {
  private data = new Map<string, any>();
  private metadata = new Map<string, PersistMetadata>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_config: ObservablePersistenceConfigLocalGlobalOptions): Promise<void> {
    // No global initialization required.
  }

  async loadTable(table: string): Promise<void> {
    try {
      const raw = await Storage.getItem(table);
      if (raw) {
        this.data.set(table, JSON.parse(raw));
      }
      const rawMeta = await Storage.getItem(`${table}__meta`);
      if (rawMeta) {
        this.metadata.set(table, JSON.parse(rawMeta));
      }
    } catch {
      // Ignore load errors; fall back to in-memory init.
    }
  }

  getTable(table: string, _config: PersistOptionsLocal, init: object): any {
    if (this.data.has(table)) {
      return this.data.get(table);
    }
    this.data.set(table, init);
    return init;
  }

  getMetadata(table: string, _config: PersistOptionsLocal): PersistMetadata {
    return this.metadata.get(table) ?? {};
  }

  async set(table: string, _changes: Change[], _config: PersistOptionsLocal): Promise<void> {
    const value = this.data.get(table);
    try {
      await Storage.setItem(table, JSON.stringify(value));
    } catch {
      // Swallow persist errors for now; callers still have in-memory state.
    }
  }

  async setMetadata(
    table: string,
    metadata: PersistMetadata,
    _config: PersistOptionsLocal
  ): Promise<void> {
    this.metadata.set(table, metadata);
    try {
      await Storage.setItem(`${table}__meta`, JSON.stringify(metadata));
    } catch {
      // Non-fatal if metadata fails to persist.
    }
  }

  async deleteTable(table: string, _config: PersistOptionsLocal): Promise<void> {
    this.data.delete(table);
    try {
      await Storage.removeItem(table);
    } catch {
      // Ignore delete failures.
    }
  }

  async deleteMetadata(table: string, _config: PersistOptionsLocal): Promise<void> {
    this.metadata.delete(table);
    try {
      await Storage.removeItem(`${table}__meta`);
    } catch {
      // Ignore delete failures.
    }
  }
}

/**
 * Global Legend-State persistence configuration.
 *
 * All persisted observables use the SQLite-backed kv-store so that large
 * finance datasets (transactions, expenses, etc.) stay performant and durable.
 */
configureObservablePersistence({
  pluginLocal: ObservablePersistSQLite,
});

/**
 * Persist a Legend-State observable using a stable local name.
 *
 * All entity stores should call this exactly once so we have a single
 * place to tweak persistence behavior in the future.
 */
export function legendPersist<T>(obs: Observable<T>, name: string): void {
  persistObservable(obs, { local: { name } });
}


