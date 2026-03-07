import React from "react";
import { View, Text, Button } from "react-native";
import { useSyncState } from "../../lib/providers/SyncContext";

export const SyncBanner: React.FC = () => {
  const s = useSyncState();

  const model = getBannerModel(s);
  if (!model) return null;

  return (
    <View
      style={{
        padding: 8,
        backgroundColor:
          model.kind === "error"
            ? "#fee2e2"
            : model.kind === "locked"
            ? "#fef3c7"
            : model.kind === "offline"
            ? "#e0f2fe"
            : "#e5f9e7",
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{model.title}</Text>
      <Text>{model.message}</Text>
      {model.actionLabel && model.onAction ? (
        <Button title={model.actionLabel} onPress={() => void model.onAction()} />
      ) : null}
    </View>
  );
};

type BannerKind = "locked" | "offline" | "syncing" | "error" | "ok";

interface BannerModel {
  kind: BannerKind;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => Promise<void> | void;
}

function getBannerModel(s: ReturnType<typeof useSyncState>): BannerModel | null {
  if (!s.isOnline && s.gateState === "locked") {
    return {
      kind: "locked",
      title: "Locked",
      message: "Unlock to access offline data",
      actionLabel: "Unlock",
      onAction: s.unlockOffline,
    };
  }

  if (!s.isOnline) {
    const extra =
      s.pendingUploadsCount || s.conflictsCount
        ? ` • ${s.pendingUploadsCount} uploads • ${s.conflictsCount} conflicts`
        : "";
    return {
      kind: "offline",
      title: "Offline mode",
      message: `Changes will sync when online${extra}`,
    };
  }

  if (s.isSyncing) {
    return {
      kind: "syncing",
      title: "Syncing…",
      message: "Updating your data",
    };
  }

  if (s.lastError) {
    return {
      kind: "error",
      title: "Sync error",
      message: "Tap to retry",
      actionLabel: "Retry",
      onAction: async () => {
        s.triggerSync();
        await s.retryUploads();
      },
    };
  }

  const last = s.lastSyncedAt
    ? new Date(s.lastSyncedAt).toLocaleString()
    : "Never";
  return {
    kind: "ok",
    title: "Up to date",
    message: `Last synced: ${last}`,
  };
}

export default SyncBanner;

