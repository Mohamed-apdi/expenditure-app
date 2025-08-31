import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
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
} from "lucide-react-native";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "~/lib";
import { useTheme } from "~/lib";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  type Notification,
  type NotificationType,
  type NotificationPriority,
} from "~/lib";

import Toast from "react-native-toast-message";

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [notificationsData, unreadCountData] = await Promise.all([
        getUserNotifications(user.id),
        getUnreadNotificationCount(user.id),
      ]);

      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load notifications",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle notification press
  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read if not already read
      if (!notification.is_read) {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Show feedback for marking as read
        Toast.show({
          type: "info",
          text1: "Marked as Read",
          text2: "Notification marked as read",
          visibilityTime: 2000,
        });
      }

      // Navigate to action URL if available
      if (notification.action_url) {
        // Small delay to allow the read state to update visually
        setTimeout(() => {
          router.push(notification.action_url as any);
        }, 100);
      } else {
        // If no action URL, show a message
        Toast.show({
          type: "info",
          text1: notification.title,
          text2: "Notification details viewed",
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error handling notification press:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to mark notification as read",
      });
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await markAllNotificationsAsRead(user.id);
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to mark notifications as read",
      });
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      Toast.show({
        type: "success",
        text1: "Deleted",
        text2: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to delete notification",
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
              await Promise.all(
                Array.from(selectedIds).map((id) => deleteNotification(id))
              );
              setNotifications((prev) =>
                prev.filter((n) => !selectedIds.has(n.id))
              );
              setSelectedIds(new Set());
              setIsSelectionMode(false);

              Toast.show({
                type: "success",
                text1: "Deleted",
                text2: `${selectedIds.size} notification(s) deleted`,
              });
            } catch (error) {
              console.error("Error deleting notifications:", error);
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to delete notifications",
              });
            }
          },
        },
      ]
    );
  };

  // Get notification icon
  const getNotificationIcon = (
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
  };

  // Get notification priority color
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case "urgent":
        return "#ef4444";
      case "high":
        return "#f59e0b";
      case "medium":
        return "#3b82f6";
      case "low":
        return "#64748b";
      default:
        return theme.textSecondary;
    }
  };

  // Render notification item
  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isSelected = selectedIds.has(item.id);
    const priorityColor = getPriorityColor(item.priority);

    return (
      <TouchableOpacity
        style={{
          backgroundColor: isSelected
            ? theme.primary + "20"
            : item.is_read
              ? theme.cardBackground
              : theme.background,
          borderRadius: 12,
          padding: 16,
          marginHorizontal: 16,
          marginVertical: 4,
          borderWidth: 1,
          borderColor: isSelected
            ? theme.primary
            : item.is_read
              ? theme.border
              : theme.primary + "30",
          borderLeftWidth: 4,
          borderLeftColor: priorityColor,
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
          <View style={{ marginRight: 12, marginTop: 2 }}>
            {isSelectionMode ? (
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: isSelected ? theme.primary : theme.border,
                  backgroundColor: isSelected ? theme.primary : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isSelected && <Check size={12} color="white" />}
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: theme.cardBackground,
                  borderRadius: 20,
                  padding: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                {getNotificationIcon(item.type, item.priority)}
              </View>
            )}
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: item.is_read ? "500" : "700",
                  flex: 1,
                  lineHeight: 22,
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {/* Unread indicator */}
              {!item.is_read && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
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
                lineHeight: 20,
                marginBottom: 8,
              }}
              numberOfLines={3}
            >
              {item.message}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Clock size={12} color={theme.textSecondary} />
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: 12,
                    marginLeft: 4,
                  }}
                >
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}
                </Text>
              </View>

              {/* Actions */}
              {!isSelectionMode && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    Alert.alert(
                      "Delete Notification",
                      "Are you sure you want to delete this notification?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => handleDeleteNotification(item.id),
                        },
                      ]
                    );
                  }}
                  style={{ padding: 4 }}
                >
                  <Trash2 size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
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
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text
            style={{
              color: theme.text,
              fontSize: 20,
              fontWeight: "700",
              marginLeft: 12,
            }}
          >
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 2,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isSelectionMode ? (
            <>
              <TouchableOpacity
                onPress={deleteSelectedNotifications}
                disabled={selectedIds.size === 0}
                style={{
                  opacity: selectedIds.size === 0 ? 0.5 : 1,
                }}
              >
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleSelectionMode}>
                <Text
                  style={{
                    color: theme.primary,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllAsRead}>
                  <CheckCheck size={20} color={theme.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={toggleSelectionMode}>
                <Settings size={20} color={theme.icon} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

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
          <BellOff size={64} color={theme.textSecondary} />
          <Text
            style={{
              color: theme.text,
              fontSize: 18,
              fontWeight: "600",
              marginTop: 16,
            }}
          >
            No Notifications
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            You're all caught up! New notifications will appear here.
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
    </SafeAreaView>
  );
}
