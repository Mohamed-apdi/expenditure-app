/**
 * Hook for notification state: unread count and refresh
 * Subscribes to auth and refetches when user changes
 */
import { useState, useEffect, useCallback } from "react";
import { getCurrentUserOfflineFirst } from "../auth";
import { supabase } from "../database/supabase";
import { getUnreadNotificationCount } from "../services/notifications";

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch unread count (uses cached session when offline)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) {
        setUnreadCount(0);
        return;
      }

      const count = await getUnreadNotificationCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up real-time subscription for notification changes
  useEffect(() => {
    fetchUnreadCount();

    let subscription: any = null;

    const setupSubscription = async () => {
      try {
        const user = await getCurrentUserOfflineFirst();
        if (!user) return;

        // Subscribe to notification changes
        subscription = supabase
          .channel("notifications_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              // Refetch count when notifications change
              fetchUnreadCount();
            }
          )
          .subscribe();
      } catch (error) {
        console.error("Error setting up notifications subscription:", error);
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [fetchUnreadCount]);

  // Manually refresh count (useful after marking notifications as read)
  const refreshCount = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Decrease count manually (for optimistic updates)
  const decreaseCount = useCallback((amount = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  // Reset count (when marking all as read)
  const resetCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    unreadCount,
    loading,
    refreshCount,
    decreaseCount,
    resetCount,
  };
}
