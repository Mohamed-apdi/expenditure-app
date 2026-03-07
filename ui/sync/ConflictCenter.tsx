/**
 * Conflict Center screen (presentation only).
 *
 * Lists conflicts and lets the user resolve each with:
 * - "Keep my version" (local)
 * - "Use cloud version" (remote)
 */

import React, { useEffect, useState } from "react";
import { View, Text, Button, ScrollView } from "react-native";
import { getPendingConflicts, resolveConflict } from "../../lib/conflicts/conflictResolver";
import type { ConflictRecord } from "../../lib/db/schema";
import { useSyncState } from "../../lib/providers/SyncContext";

export const ConflictCenter: React.FC = () => {
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const s = useSyncState();

  async function load() {
    const list = await getPendingConflicts();
    setConflicts(list as ConflictRecord[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleResolve(id: string, choice: "keep_local" | "keep_remote") {
    await resolveConflict(id, choice);
    await load();
    await s.refreshCounts();
  }

  if (!s.isOnline && s.gateState === "locked") {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
          Locked
        </Text>
        <Text style={{ marginBottom: 12 }}>
          Unlock to view and resolve conflicts.
        </Text>
        <Button title="Unlock" onPress={() => void s.unlockOffline()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Conflict Center</Text>
      {conflicts.length === 0 ? (
        <Text>No conflicts</Text>
      ) : (
        conflicts.map((c) => (
          <View
            key={c.id}
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Text>Entity: {c.entity}</Text>
            <Text>Entity ID: {c.entity_id}</Text>
            <Text>Type: {c.conflict_type}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Button
                title="Keep my version"
                onPress={() => void handleResolve(c.id, "keep_local")}
              />
              <Button
                title="Use cloud version"
                onPress={() => void handleResolve(c.id, "keep_remote")}
              />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default ConflictCenter;

