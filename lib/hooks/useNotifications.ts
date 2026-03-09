/**
 * Hook for notification state: unread count and refresh
 * Subscribes to auth and refetches when user changes
 * Includes offline caching to persist count across sessions
 * Uses local store for offline-first support
 * Subscribes to local store changes for real-time updates
 * Supports filtering by account ID
 */
import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUserOfflineFirst } from "../auth";
import { supabase } from "../database/supabase";
import { getUnreadNotificationCount, getUserNotifications } from "../services/notifications";
import { isOfflineGateLocked } from "../sync/legendSync";
import {
  selectUnreadCount,
  selectUnreadCountByAccount,
  syncNotificationsFromServer,
  notifications$,
} from "../stores/notificationsStore";

const NOTIFICATION_COUNT_KEY = "notification_unread_count";
const NOTIFICATION_LAST_FETCH_KEY = "notification_last_fetch";

interface UseNotificationsOptions {
  accountId?: string | null;
}

export function useNotifications(options?: UseNotificationsOptions) {
  const accountId = options?.accountId;
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const fetchingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  const saveCountToStorage = useCallback(async (count: number) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_COUNT_KEY, count.toString());
      await AsyncStorage.setItem(NOTIFICATION_LAST_FETCH_KEY, Date.now().toString());
    } catch (error) {
      console.error("Error saving notification count to storage:", error);
    }
  }, []);

  const loadCountFromStorage = useCallback(async (): Promise<number> => {
    try {
      const storedCount = await AsyncStorage.getItem(NOTIFICATION_COUNT_KEY);
      if (storedCount !== null) {
        return parseInt(storedCount, 10) || 0;
      }
    } catch (error) {
      console.error("Error loading notification count from storage:", error);
    }
    return 0;
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const user = await getCurrentUserOfflineFirst();
      if (!user) {
        setUnreadCount(0);
        await saveCountToStorage(0);
        userIdRef.current = null;
        return;
      }

      userIdRef.current = user.id;
      const offline = await isOfflineGateLocked();
      setIsOffline(offline);
      
      // Always get local count first (instant display)
      // If accountId is provided, filter by account; otherwise show all
      const localCount = accountId 
        ? selectUnreadCountByAccount(user.id, accountId)
        : selectUnreadCount(user.id);
      setUnreadCount(localCount);
      
      if (offline) {
        // If offline, also check AsyncStorage as fallback
        if (localCount === 0) {
          const cachedCount = await loadCountFromStorage();
          setUnreadCount(cachedCount);
        }
      } else {
        // If online, fetch from server and sync
        try {
          const [serverNotifications, serverCount] = await Promise.all([
            getUserNotifications(user.id, 50, 0),
            getUnreadNotificationCount(user.id),
          ]);
          
          // Sync server notifications to local store
          syncNotificationsFromServer(serverNotifications, user.id);
          
          // Use synced local count
          const updatedLocalCount = accountId
            ? selectUnreadCountByAccount(user.id, accountId)
            : selectUnreadCount(user.id);
          setUnreadCount(updatedLocalCount);
          await saveCountToStorage(updatedLocalCount);
        } catch (fetchError) {
          console.error("Error fetching from server, using local:", fetchError);
          // Local count is already set
        }
      }
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      const cachedCount = await loadCountFromStorage();
      setUnreadCount(cachedCount);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [loadCountFromStorage, saveCountToStorage, accountId]);

  useEffect(() => {
    const initializeCount = async () => {
      const cachedCount = await loadCountFromStorage();
      setUnreadCount(cachedCount);
      setLoading(false);
      fetchUnreadCount();
    };
    
    initializeCount();

    let subscription: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      try {
        const user = await getCurrentUserOfflineFirst();
        if (!user) return;

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
            () => {
              fetchUnreadCount();
            }
          )
          .subscribe();
      } catch (error) {
        console.error("Error setting up notifications subscription:", error);
      }
    };

    setupSubscription();

    // Subscribe to local store changes for real-time updates
    // This ensures the badge updates immediately when notifications are marked as read
    const unsubscribeStore = notifications$.onChange(() => {
      if (userIdRef.current) {
        const newCount = accountId
          ? selectUnreadCountByAccount(userIdRef.current, accountId)
          : selectUnreadCount(userIdRef.current);
        setUnreadCount(newCount);
        saveCountToStorage(newCount);
      }
    });

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      unsubscribeStore();
    };
  }, [fetchUnreadCount, loadCountFromStorage, saveCountToStorage, accountId]);

  const refreshCount = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const decreaseCount = useCallback((amount = 1) => {
    setUnreadCount((prev) => {
      const newCount = Math.max(0, prev - amount);
      saveCountToStorage(newCount);
      return newCount;
    });
  }, [saveCountToStorage]);

  const resetCount = useCallback(() => {
    setUnreadCount(0);
    saveCountToStorage(0);
  }, [saveCountToStorage]);

  return {
    unreadCount,
    loading,
    isOffline,
    refreshCount,
    decreaseCount,
    resetCount,
  };
}
