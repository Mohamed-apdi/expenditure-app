/**
 * Sync status indicator: offline, syncing, up-to-date, conflict, error.
 * Shows pending count when there are unsynced changes.
 * See specs/002-offline-online-support/contracts/sync-status-contract.md
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSyncStatus } from "~/lib/providers/SyncContext";
import type { SyncStatus } from "~/lib/sync/types";

const LABELS: Record<SyncStatus, string> = {
  offline: "Offline",
  syncing: "Syncing...",
  "up-to-date": "Synced",
  conflict: "Synced",
  error: "Sync error",
};

export function SyncStatusIndicator(): React.ReactElement {
  const state = useSyncStatus();
  const hasPending = state.pendingCount > 0;

  const getLabel = () => {
    if (state.status === "offline" && hasPending) {
      return `Offline (${state.pendingCount} pending)`;
    }
    if (state.status === "syncing" && hasPending) {
      return `Syncing ${state.pendingCount}...`;
    }
    if (state.status === "error" && hasPending) {
      return `Sync error (${state.pendingCount} pending)`;
    }
    return LABELS[state.status];
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dot,
          state.status === "offline" && styles.dotOffline,
          state.status === "syncing" && styles.dotSyncing,
          state.status === "up-to-date" && !hasPending && styles.dotUpToDate,
          state.status === "up-to-date" && hasPending && styles.dotPending,
          state.status === "conflict" && styles.dotUpToDate,
          state.status === "error" && styles.dotError,
        ]}
      />
      <Text style={styles.label}>{getLabel()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#94a3b8",
  },
  dotOffline: { backgroundColor: "#94a3b8" },
  dotSyncing: { backgroundColor: "#f59e0b" },
  dotUpToDate: { backgroundColor: "#22c55e" },
  dotPending: { backgroundColor: "#f59e0b" },
  dotConflict: { backgroundColor: "#ef4444" },
  dotError: { backgroundColor: "#ef4444" },
  label: {
    fontSize: 12,
    color: "#64748b",
  },
});
