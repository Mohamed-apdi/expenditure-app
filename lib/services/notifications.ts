import { supabase } from "../database/supabase";

export type NotificationType =
  | "budget"
  | "subscription"
  | "transfer"
  | "expense"
  | "income"
  | "account"
  | "system";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  is_read: boolean;
  metadata?: Record<string, any>; // Additional data like transaction_id, budget_id, etc.
  action_url?: string; // URL to navigate when notification is clicked
  created_at: string;
  read_at?: string;
  expires_at?: string;
}

/**
 * Create a new notification
 */
export async function createNotification({
  user_id,
  title,
  message,
  type,
  priority = "medium",
  metadata,
  action_url,
  expires_at,
}: {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
  action_url?: string;
  expires_at?: string;
}): Promise<Notification | null> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id,
        title,
        message,
        type,
        priority,
        is_read: false,
        metadata,
        action_url,
        expires_at,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limit = 50,
  offset = 0
): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .or("expires_at.is.null,expires_at.gt.now()")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  try {
    if (!userId) {
      console.warn("getUnreadNotificationCount called without userId");
      return 0;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .or("expires_at.is.null,expires_at.gt.now()");

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(
  notificationId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return false;
  }
}

/**
 * Delete old read notifications (cleanup)
 */
export async function deleteOldNotifications(
  userId: string,
  daysOld = 30
): Promise<boolean> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("is_read", true)
      .lt("read_at", cutoffDate.toISOString());

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting old notifications:", error);
    return false;
  }
}

/**
 * Create system notification (for app updates, maintenance, etc.)
 */
export async function createSystemNotification({
  title,
  message,
  priority = "medium",
  action_url,
  expires_at,
}: {
  title: string;
  message: string;
  priority?: NotificationPriority;
  action_url?: string;
  expires_at?: string;
}): Promise<boolean> {
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id");

    if (usersError) throw usersError;

    // Create notification for each user
    const notifications = users.map((user) => ({
      user_id: user.id,
      title,
      message,
      type: "system" as NotificationType,
      priority,
      is_read: false,
      action_url,
      expires_at,
    }));

    const { error } = await supabase
      .from("notifications")
      .insert(notifications);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating system notification:", error);
    return false;
  }
}

/**
 * Helper function to create budget-related notifications
 */
export async function createBudgetNotification({
  userId,
  budgetName,
  percentage,
  currentAmount,
  budgetLimit,
  budgetId,
}: {
  userId: string;
  budgetName: string;
  percentage: number;
  currentAmount: number;
  budgetLimit: number;
  budgetId: string;
}): Promise<Notification | null> {
  const isWarning = percentage >= 80 && percentage < 100;
  const isExceeded = percentage >= 100;

  const title = isExceeded
    ? `🚨 Budget Exceeded: ${budgetName}`
    : `⚠️ Budget Warning: ${budgetName}`;

  const message = isExceeded
    ? `You've exceeded your ${budgetName} budget by $${(currentAmount - budgetLimit).toFixed(2)}. Current: $${currentAmount.toFixed(2)} / $${budgetLimit.toFixed(2)}`
    : `You've used ${percentage.toFixed(1)}% of your ${budgetName} budget. Current: $${currentAmount.toFixed(2)} / $${budgetLimit.toFixed(2)}`;

  return createNotification({
    user_id: userId,
    title,
    message,
    type: "budget",
    priority: isExceeded ? "high" : "medium",
    metadata: {
      budget_id: budgetId,
      percentage,
      current_amount: currentAmount,
      budget_limit: budgetLimit,
    },
    action_url: "/(main)/BudgetScreen",
  });
}

/**
 * Helper function to create subscription-related notifications
 */
export async function createSubscriptionNotification({
  userId,
  subscriptionName,
  amount,
  dueDate,
  subscriptionId,
  isOverdue = false,
}: {
  userId: string;
  subscriptionName: string;
  amount: number;
  dueDate: string;
  subscriptionId: string;
  isOverdue?: boolean;
}): Promise<Notification | null> {
  const title = isOverdue
    ? `🔴 Overdue: ${subscriptionName}`
    : `💳 Payment Due: ${subscriptionName}`;

  const message = isOverdue
    ? `Your ${subscriptionName} subscription payment of $${amount.toFixed(2)} is overdue.`
    : `Your ${subscriptionName} subscription payment of $${amount.toFixed(2)} is due today.`;

  return createNotification({
    user_id: userId,
    title,
    message,
    type: "subscription",
    priority: isOverdue ? "high" : "medium",
    metadata: {
      subscription_id: subscriptionId,
      amount,
      due_date: dueDate,
      is_overdue: isOverdue,
    },
    action_url: "/components/SubscriptionsScreen",
  });
}

/**
 * Helper function to create transaction-related notifications
 */
export async function createTransactionNotification({
  userId,
  title,
  message,
  transactionType,
  amount,
  transactionId,
}: {
  userId: string;
  title: string;
  message: string;
  transactionType: "expense" | "income" | "transfer";
  amount: number;
  transactionId: string;
}): Promise<Notification | null> {
  return createNotification({
    user_id: userId,
    title,
    message,
    type: transactionType,
    priority: "low",
    metadata: {
      transaction_id: transactionId,
      amount,
    },
    action_url: `/(main)/transaction-detail/${transactionId}`,
  });
}
