/**
 * Sync Center screen (presentation only).
 *
 * Shows:
 * - Last sync time
 * - Number of pending operations
 * - Failed items with retry
 * - Count / link to conflicts (opens ConflictCenter)
 *
 * Routing (Expo Router) is configured in the app layer; this component is
 * pure UI + hooks.
 */

import React from "react";
import { View, Text, Button, ScrollView } from "react-native";
import { useSyncState } from "../../lib/providers/SyncContext";

export const SyncCenter: React.FC = () => {
  const s = useSyncState();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Sync Center</Text>

      <View>
        <Text>Network: {s.isOnline ? "Online" : "Offline"}</Text>
        <Text>Status: {s.isSyncing ? "Syncing" : "Idle"}</Text>
        <Text>
          Last sync:{" "}
          {s.lastSyncedAt
            ? new Date(s.lastSyncedAt).toLocaleString()
            : "Never"}
        </Text>
        {s.lastError ? (
          <Text style={{ color: "red" }}>{s.lastError}</Text>
        ) : null}
      </View>

      <View>
        <Text style={{ fontWeight: "bold" }}>Uploads</Text>
        <Text>Pending uploads: {s.pendingUploadsCount}</Text>
        <Button
          title="Retry uploads"
          onPress={() => void s.retryUploads()}
          disabled={!s.isOnline || s.gateState === "locked"}
        />
      </View>

      <View>
        <Text style={{ fontWeight: "bold" }}>Conflicts</Text>
        <Text>Conflicts: {s.conflictsCount}</Text>
        {/* Navigation into ConflictCenter is app/router-specific */}
      </View>

      <Button
        title="Sync now"
        onPress={() => s.triggerSync()}
        disabled={!s.isOnline || s.gateState === "locked"}
      />
    </ScrollView>
  );
};

export default SyncCenter;

