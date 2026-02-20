/**
 * Conflict resolution screen: list sync conflicts and resolve with "Keep mine" or "Use server".
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, AlertCircle } from "lucide-react-native";
import { useTheme, useScreenStatusBar } from "~/lib";
import { useLanguage } from "~/lib";
import {
  selectConflicts,
  triggerSync,
  resolveConflictKeepLocal,
  resolveConflictUseRemote,
} from "~/lib";
import { conflicts$ } from "~/lib/stores/conflictsStore";
import type { ConflictRecord } from "~/lib/stores/conflictsStore";

export default function ConflictsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLanguage();
  useScreenStatusBar();
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const refresh = () => setConflicts(selectConflicts());

  useEffect(() => {
    refresh();
    const unsub = conflicts$.onChange(refresh);
    return unsub;
  }, []);

  const handleKeepMine = (conflictId: string) => {
    setResolvingId(conflictId);
    resolveConflictKeepLocal(conflictId);
    setResolvingId(null);
  };

  const handleUseServer = (conflictId: string) => {
    setResolvingId(conflictId);
    resolveConflictUseRemote(conflictId);
    setResolvingId(null);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ marginRight: 12 }}
        >
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>
          {t.conflicts ?? "Sync conflicts"}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {conflicts.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 48,
            }}
          >
            <AlertCircle size={48} color={theme.textMuted} />
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 16,
                marginTop: 16,
                textAlign: "center",
              }}
            >
              {t.noConflicts ?? "No conflicts. Your data is in sync."}
            </Text>
            <TouchableOpacity
              onPress={() => triggerSync()}
              style={{
                marginTop: 20,
                paddingVertical: 10,
                paddingHorizontal: 20,
                backgroundColor: theme.primary + "20",
                borderRadius: 12,
              }}
            >
              <Text style={{ color: theme.primary, fontWeight: "600" }}>
                {t.syncNow ?? "Sync now"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              {conflicts.length}{" "}
              {conflicts.length === 1
                ? t.conflict ?? "conflict"
                : t.conflicts ?? "conflicts"}{" "}
              {t.resolveConflictsHint ?? "Choose which version to keep."}
            </Text>
            {conflicts.map((c) => (
              <View
                key={c.id}
                style={{
                  backgroundColor: theme.cardBackground,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontWeight: "600",
                    fontSize: 15,
                    textTransform: "capitalize",
                  }}
                >
                  {c.entityType.replace("_", " ")} • {c.entityId.slice(0, 8)}…
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {c.conflictType === "modify_vs_modify"
                    ? t.modifyVsModify ?? "Both changed"
                    : t.deleteVsModify ?? "Deleted vs changed"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 12,
                    gap: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleKeepMine(c.id)}
                    disabled={resolvingId === c.id}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: theme.primary + "20",
                      alignItems: "center",
                    }}
                  >
                    {resolvingId === c.id ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Text
                        style={{ color: theme.primary, fontWeight: "600" }}
                      >
                        {t.keepMine ?? "Keep mine"}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleUseServer(c.id)}
                    disabled={resolvingId === c.id}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: theme.textMuted + "30",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text,
                        fontWeight: "600",
                      }}
                    >
                      {t.useServer ?? "Use server"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
