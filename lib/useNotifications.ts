import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { getUnreadNotificationCount } from './notifications';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Auth error:', error);
        setUnreadCount(0);
        return;
      }
      
      if (!data?.user) {
        setUnreadCount(0);
        return;
      }

      const count = await getUnreadNotificationCount(data.user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
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
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.log('No authenticated user for notifications subscription');
          return;
        }

        // Subscribe to notification changes
        subscription = supabase
          .channel('notifications_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('Notification change detected:', payload);
              // Refetch count when notifications change
              fetchUnreadCount();
            }
          )
          .subscribe();
      } catch (error) {
        console.error('Error setting up notifications subscription:', error);
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
    setUnreadCount(prev => Math.max(0, prev - amount));
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
