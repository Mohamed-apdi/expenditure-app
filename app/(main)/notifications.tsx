import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  Info,
  TrendingUp,
  CreditCard,
  Wallet,
  Settings,
  Zap,
  WifiOff,
  ChevronDown,
  Filter,
} from "lucide-react-native";
import { format, formatDistanceToNow } from "date-fns";
import { getCurrentUserOfflineFirst } from "~/lib";
import { useTheme, useScreenStatusBar, useAccount } from "~/lib";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  type Notification,
  type NotificationType,
  type NotificationPriority,
} from "~/lib/services/notifications";
import {
  selectNotifications,
  selectNotificationsByAccount,
  selectUnreadCount,
  selectUnreadCountByAccount,
  markNotificationAsReadLocal,
  markAllNotificationsAsReadLocal,
  deleteNotificationLocal,
  syncNotificationsFromServer,
  type LocalNotification,
} from "~/lib/stores/notificationsStore";
import { isOfflineGateLocked, triggerSync } from "~/lib/sync/legendSync";

import { toast } from "sonner-native";

type FilterMode = "all" | "selected";

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  useScreenStatusBar();
  const { selectedAccount, accounts } = useAccount();
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(main)/Dashboard");
    }
  }, [router]);

  // Get filtered notifications based on filter mode
  const getFilteredNotifications = useCallback(
    (userId: string): LocalNotification[] => {
      if (filterMode === "selected" && selectedAccount) {
        return selectNotificationsByAccount(userId, selectedAccount.id);
      }
      return selectNotifications(userId);
    },
    [filterMode, selectedAccount]
  );

  // Get filtered unread count based on filter mode
  const getFilteredUnreadCount = useCallback(
    (userId: string): number => {
      if (filterMode === "selected" && selectedAccount) {
        return selectUnreadCountByAccount(userId, selectedAccount.id);
      }
      return selectUnreadCount(userId);
    },
    [filterMode, selectedAccount]
  );

  // Fetch notifications with offline support
  const fetchNotifications = useCallback(async () => {
    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) return;
      
      setCurrentUserId(user.id);
      const offline = await isOfflineGateLocked();
      setIsOffline(offline);

      // Always load from local store first (immediate display)
      const localNotifications = getFilteredNotifications(user.id);
      const localUnreadCount = getFilteredUnreadCount(user.id);
      
      setNotifications(localNotifications);
      setUnreadCount(localUnreadCount);

      // If online, fetch from server and sync to local store
      if (!offline) {
        try {
          const [serverNotifications, serverUnreadCount] = await Promise.all([
            getUserNotifications(user.id),
            getUnreadNotificationCount(user.id),
          ]);

          // Sync server data to local store
          syncNotificationsFromServer(serverNotifications, user.id);
          
          // Refresh from local store after sync (with filtering)
          const updatedNotifications = getFilteredNotifications(user.id);
          const updatedUnreadCount = getFilteredUnreadCount(user.id);
          
          setNotifications(updatedNotifications);
          setUnreadCount(updatedUnreadCount);
        } catch (serverError) {
          console.error("Error fetching from server, using local data:", serverError);
          // Local data is already set, no action needed
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Error", { description: "Failed to load notifications" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getFilteredNotifications, getFilteredUnreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refetch when filter mode or selected account changes
  useEffect(() => {
    if (currentUserId) {
      const updatedNotifications = getFilteredNotifications(currentUserId);
      const updatedUnreadCount = getFilteredUnreadCount(currentUserId);
      setNotifications(updatedNotifications);
      setUnreadCount(updatedUnreadCount);
    }
  }, [filterMode, selectedAccount?.id, currentUserId, getFilteredNotifications, getFilteredUnreadCount]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle notification press
  const handleNotificationPress = async (notification: LocalNotification) => {
    try {
      // Mark as read if not already read
      if (!notification.is_read) {
        // Update local store first (offline-first)
        markNotificationAsReadLocal(notification.id);
        
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Sync to server if online
        if (!isOffline) {
          try {
            await markNotificationAsRead(notification.id);
          } catch (serverError) {
            console.error("Failed to sync read status to server:", serverError);
          }
        }

        toast.info("Marked as Read", {
          description: "Notification marked as read",
          duration: 2000,
        });
      }

      // Navigate to action URL if available
      if (notification.action_url) {
        setTimeout(() => {
          router.push(notification.action_url as any);
        }, 100);
      } else {
        toast.info(notification.title, {
          description: "Notification details viewed",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error handling notification press:", error);
      toast.error("Error", {
        description: "Failed to mark notification as read",
      });
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      if (!currentUserId) return;

      // Update local store first (offline-first)
      markAllNotificationsAsReadLocal(currentUserId);
      
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);

      // Sync to server if online
      if (!isOffline) {
        try {
          await markAllNotificationsAsRead(currentUserId);
        } catch (serverError) {
          console.error("Failed to sync mark all read to server:", serverError);
        }
      }

      toast.success("Success", {
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Error", {
        description: "Failed to mark notifications as read",
      });
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      // Delete from local store first (offline-first)
      deleteNotificationLocal(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      // Sync to server if online
      if (!isOffline) {
        try {
          await deleteNotification(notificationId);
        } catch (serverError) {
          console.error("Failed to sync delete to server:", serverError);
        }
      }

      toast.success("Deleted", {
        description: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Error", {
        description: "Failed to delete notification",
      });
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
  };

  // Toggle notification selection
  const toggleNotificationSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Delete selected notifications
  const deleteSelectedNotifications = () => {
    Alert.alert(
      "Delete Notifications",
      `Are you sure you want to delete ${selectedIds.size} notification(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete from local store first (offline-first)
              Array.from(selectedIds).forEach((id) => deleteNotificationLocal(id));
              
              setNotifications((prev) =>
                prev.filter((n) => !selectedIds.has(n.id))
              );
              setSelectedIds(new Set());
              setIsSelectionMode(false);

              // Sync to server if online
              if (!isOffline) {
                try {
                  await Promise.all(
                    Array.from(selectedIds).map((id) => deleteNotification(id))
                  );
                } catch (serverError) {
                  console.error("Failed to sync deletes to server:", serverError);
                }
              }

              toast.success("Deleted", {
                description: `${selectedIds.size} notification(s) deleted`,
              });
            } catch (error) {
              console.error("Error deleting notifications:", error);
              toast.error("Error", {
                description: "Failed to delete notifications",
              });
            }
          },
        },
      ]
    );
  };

  // Get notification icon
  const getNotificationIcon = useCallback((
    type: NotificationType,
    priority: NotificationPriority
  ) => {
    const iconProps = { size: 20 };

    switch (type) {
      case "budget":
        return <Wallet {...iconProps} color="#f59e0b" />;
      case "subscription":
        return <CreditCard {...iconProps} color="#8b5cf6" />;
      case "expense":
        return <TrendingUp {...iconProps} color="#ef4444" />;
      case "income":
        return <TrendingUp {...iconProps} color="#10b981" />;
      case "transfer":
        return <Wallet {...iconProps} color="#3b82f6" />;
      case "account":
        return <Settings {...iconProps} color="#64748b" />;
      case "system":
        return priority === "urgent" ? (
          <AlertCircle {...iconProps} color="#ef4444" />
        ) : (
          <Info {...iconProps} color="#3b82f6" />
        );
      default:
        return <Bell {...iconProps} color={theme.textSecondary} />;
    }
  }, [theme.textSecondary]);

  // Render notification item
  const renderNotificationItem = ({ item }: { item: LocalNotification }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={{
          backgroundColor: item.is_read ? theme.cardBackground : theme.inputBackground,
          borderRadius: 12,
          padding: 12,
          marginHorizontal: 16,
          marginVertical: 4,
          borderWidth: 1,
          borderColor: isSelected ? "#00BFFF" : theme.border,
        }}
        onPress={() =>
          isSelectionMode
            ? toggleNotificationSelection(item.id)
            : handleNotificationPress(item)
        }
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
            toggleNotificationSelection(item.id);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {/* Selection checkbox or notification icon */}
          {isSelectionMode ? (
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: isSelected ? "#00BFFF" : theme.border,
                backgroundColor: isSelected ? "#00BFFF" : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                marginTop: 2,
              }}
            >
              {isSelected && <Check size={12} color="white" />}
            </View>
          ) : (
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: theme.cardBackground,
                marginRight: 12,
              }}
            >
              {getNotificationIcon(item.type, item.priority)}
            </View>
          )}

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 15,
                  fontWeight: item.is_read ? "500" : "600",
                  flex: 1,
                  lineHeight: 20,
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {/* Unread indicator */}
              {!item.is_read && (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.primary,
                    marginLeft: 8,
                    marginTop: 7,
                  }}
                />
              )}
            </View>

            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 14,
                lineHeight: 18,
                marginBottom: 6,
              }}
              numberOfLines={2}
            >
              {item.message}
            </Text>

            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 12,
              }}
            >
              {formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
              })}
            </Text>
          </View>

          {/* Delete action */}
          {!isSelectionMode && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteNotification(item.id);
              }}
              style={{ padding: 4, marginLeft: 8 }}
            >
              <Trash2 size={18} color={theme.danger} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
            Loading notifications...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={handleGoBack}>
            <ChevronLeft size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text
            style={{
              color: theme.text,
              fontSize: 20,
              fontWeight: "600",
              marginLeft: 12,
            }}
          >
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: theme.primary,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                paddingHorizontal: 6,
                justifyContent: "center",
                alignItems: "center",
                marginLeft: 8,
              }}
            >
              <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {isSelectionMode ? (
            <>
              {selectedIds.size > 0 && (
                <TouchableOpacity onPress={deleteSelectedNotifications}>
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={toggleSelectionMode}>
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setShowFilterSheet(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: filterMode === "selected" ? `${theme.primary}15` : "transparent",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: filterMode === "selected" ? theme.primary : theme.border,
                }}
              >
                <Filter size={16} color={filterMode === "selected" ? theme.primary : theme.textSecondary} />
                <Text
                  style={{
                    color: filterMode === "selected" ? theme.primary : theme.textSecondary,
                    fontSize: 13,
                    fontWeight: "500",
                    marginLeft: 4,
                  }}
                  numberOfLines={1}
                >
                  {filterMode === "all" ? "All" : selectedAccount?.name ?? "Selected"}
                </Text>
                <ChevronDown size={14} color={filterMode === "selected" ? theme.primary : theme.textSecondary} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllAsRead}>
                  <CheckCheck size={20} color={theme.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.warning + "20",
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <WifiOff size={16} color={theme.warning} />
          <Text style={{ color: theme.warning, fontSize: 13, flex: 1 }}>
            You're offline. Showing cached notifications.
          </Text>
        </View>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <BellOff size={48} color={theme.textSecondary} />
          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: "500",
              marginTop: 16,
            }}
          >
            No Notifications
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginTop: 4,
              fontSize: 14,
            }}
          >
            You're all caught up!
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Sheet Modal */}
      <Modal
        visible={showFilterSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <Pressable
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
          onPress={() => setShowFilterSheet(false)}
        >
          <Pressable
            style={{
              maxHeight: "60%",
              backgroundColor: theme.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: "hidden",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                paddingTop: 12,
                paddingBottom: 8,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.border,
                }}
              />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: theme.text,
                  marginBottom: 16,
                }}
              >
                Filter Notifications
              </Text>

              {/* All Accounts Option */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setFilterMode("all");
                  setShowFilterSheet(false);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: filterMode === "all" ? `${theme.primary}15` : theme.background,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: filterMode === "all" ? theme.primary : theme.border,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}18`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Bell size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: theme.text,
                    }}
                  >
                    All Accounts
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    Show notifications from all accounts
                  </Text>
                </View>
                {filterMode === "all" && (
                  <Check size={20} color={theme.primary} />
                )}
              </TouchableOpacity>

              {/* Selected Account Option */}
              {selectedAccount && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setFilterMode("selected");
                    setShowFilterSheet(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: filterMode === "selected" ? `${theme.primary}15` : theme.background,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: filterMode === "selected" ? theme.primary : theme.border,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: `${theme.primary}18`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Wallet size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: theme.text,
                      }}
                    >
                      {selectedAccount.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      Current selected account
                    </Text>
                  </View>
                  {filterMode === "selected" && (
                    <Check size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}

              {/* Info text */}
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textSecondary,
                  textAlign: "center",
                  marginTop: 12,
                  paddingHorizontal: 16,
                }}
              >
                {filterMode === "selected"
                  ? `Showing notifications for "${selectedAccount?.name}"`
                  : "Showing notifications from all accounts"}
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
