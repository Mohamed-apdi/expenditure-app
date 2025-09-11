import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { isExpoGo } from "../utils/expoGoUtils";
import { supabase } from "../database/supabase";
import { addTransaction } from "./transactions";
import {
  updateSubscription,
  fetchSubscriptionsWithAccounts,
} from "./subscriptions";
import { fetchAccounts } from "./accounts";
import { getBudgetProgress, type BudgetProgress } from "./analytics";
import {
  createBudgetNotification,
  createSubscriptionNotification,
  createTransactionNotification,
} from "./notifications";

// Define the background task name
const SUBSCRIPTION_CHECK_TASK = "subscription-check-task";

// Notification categories with interactive buttons
const SUBSCRIPTION_NOTIFICATION_CATEGORY = "subscription-payment";
const BUDGET_WARNING_CATEGORY = "budget-warning";
const BUDGET_EXCEEDED_CATEGORY = "budget-exceeded";

// Set notification handler only if not in Expo Go
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Define interactive notification actions
export const setupNotificationCategories = async () => {
  // If running in Expo Go, return early
  if (isExpoGo) {
    console.warn(
      "Notification categories are not available in Expo Go with SDK 53."
    );
    return;
  }

  try {
    // Subscription notifications
    await Notifications.setNotificationCategoryAsync(
      SUBSCRIPTION_NOTIFICATION_CATEGORY,
      [
        {
          identifier: "PAY_NOW",
          buttonTitle: "Pay Now",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: "PAUSE_SUBSCRIPTION",
          buttonTitle: "Pause",
          options: {
            isDestructive: true,
            isAuthenticationRequired: false,
          },
        },
      ],
      {
        intentIdentifiers: [],
        customDismissAction: false,
      }
    );

    // Budget warning notifications
    await Notifications.setNotificationCategoryAsync(
      BUDGET_WARNING_CATEGORY,
      [
        {
          identifier: "VIEW_BUDGET",
          buttonTitle: "View Budget",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: "REMIND_LATER",
          buttonTitle: "Remind Later",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ],
      {
        intentIdentifiers: [],
        customDismissAction: false,
      }
    );

    // Budget exceeded notifications
    await Notifications.setNotificationCategoryAsync(
      BUDGET_EXCEEDED_CATEGORY,
      [
        {
          identifier: "VIEW_BUDGET",
          buttonTitle: "View Budget",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: "ADJUST_BUDGET",
          buttonTitle: "Adjust Budget",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ],
      {
        intentIdentifiers: [],
        customDismissAction: false,
      }
    );
  } catch (error) {
    console.error("Failed to setup notification categories:", error);
  }
};

// Request notification permissions
export const requestNotificationPermissions = async () => {
  // If running in Expo Go, return early with a warning
  if (isExpoGo) {
    console.warn(
      "Push notifications are not available in Expo Go with SDK 53. Use development build for full functionality."
    );
    return "unavailable";
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: true,
          allowProvisional: false,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return false;
    }

    // Get push token for debugging
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      console.log("Push token:", token.data);
    } catch (tokenError) {
      console.log("Could not get push token:", tokenError);
    }

    return finalStatus;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    throw error;
  }
};

// Schedule a subscription notification with interactive buttons
export const scheduleSubscriptionNotification = async (
  subscription: any,
  scheduledDate: Date
) => {
  const identifier = `subscription-${subscription.id}`;

  // Cancel any existing notification for this subscription
  await Notifications.cancelScheduledNotificationAsync(identifier);

  const trigger = {
    type: Notifications.SchedulableTriggerInputTypes.DATE as const,
    date: scheduledDate,
  };

  const content = {
    title: "💳 Subscription Payment Due",
    body: `${subscription.name} - $${subscription.amount.toFixed(2)} is due today`,
    categoryIdentifier: SUBSCRIPTION_NOTIFICATION_CATEGORY,
    data: {
      subscriptionId: subscription.id,
      subscriptionName: subscription.name,
      amount: subscription.amount,
      accountId: subscription.account_id,
      billingCycle: subscription.billing_cycle,
    },
    sound: "notification.wav",
  };

  await Notifications.scheduleNotificationAsync({
    identifier,
    content,
    trigger,
  });

  console.log(
    `Scheduled notification for ${subscription.name} at ${scheduledDate}`
  );
};

// Handle notification responses (when user taps action buttons)
export const handleNotificationResponse = async (
  response: Notifications.NotificationResponse
) => {
  const { notification, actionIdentifier } = response;
  const notificationData = notification.request.content.data;

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    // Handle subscription notifications
    if (notificationData.subscriptionId) {
      const subscriptionId = notificationData.subscriptionId;
      const amount = notificationData.amount;
      const accountId = notificationData.accountId;
      const billingCycle = notificationData.billingCycle;
      const subscriptionName = notificationData.subscriptionName;

      if (actionIdentifier === "PAY_NOW") {
        // Process the payment automatically
        await processSubscriptionPayment(
          user.id,
          subscriptionId as string,
          accountId as string,
          amount as number,
          subscriptionName as string,
          billingCycle as string
        );

        // Show success notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "✅ Payment Processed",
            body: `Successfully paid $${(amount as number).toFixed(2)} for ${subscriptionName}`,
            sound: "notification.wav",
          },
          trigger: null, // Show immediately
        });
      } else if (actionIdentifier === "PAUSE_SUBSCRIPTION") {
        // Pause the subscription
        await pauseSubscription(subscriptionId as string);

        // Show confirmation notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⏸️ Subscription Paused",
            body: `${subscriptionName} has been paused and won't charge automatically`,
            sound: "notification.wav",
          },
          trigger: null, // Show immediately
        });
      }
    }

    // Handle budget notifications
    else if (notificationData.budgetCategory) {
      const category = notificationData.budgetCategory;

      if (actionIdentifier === "VIEW_BUDGET") {
        // This would typically deep link to the budget screen
        // For now, show a helpful message
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "📊 Budget View",
            body: `Open the app to view your ${category} budget details`,
            sound: "notification.wav",
          },
          trigger: null,
        });
      } else if (actionIdentifier === "REMIND_LATER") {
        // Schedule a reminder for later (in 4 hours)
        const reminderTime = new Date(Date.now() + 4 * 60 * 60 * 1000);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⚠️ Budget Reminder",
            body: `Don't forget to check your ${category} budget`,
            data: notificationData,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderTime,
          },
        });
      } else if (actionIdentifier === "ADJUST_BUDGET") {
        // Show guidance for adjusting budget
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "💡 Budget Adjustment",
            body: `Open the app to adjust your ${category} budget or review your spending`,
            sound: "notification.wav",
          },
          trigger: null,
        });
      }
    }
  } catch (error) {
    console.error("Error handling notification response:", error);

    // Show error notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "❌ Action Failed",
        body: "Failed to process your request. Please try again in the app.",
        sound: "notification.wav",
      },
      trigger: null,
    });
  }
};

// Process subscription payment
const processSubscriptionPayment = async (
  userId: string,
  subscriptionId: string,
  accountId: string,
  amount: number,
  subscriptionName: string,
  billingCycle: string
) => {
  const today = new Date();
  const todayString = today.toISOString().split("T")[0];

  // Create expense transaction for subscription fee
  await addTransaction({
    user_id: userId,
    account_id: accountId,
    amount: amount,
    description: `Subscription fee for ${subscriptionName}`,
    date: todayString,
    category: "Subscriptions",
    type: "expense",
    is_recurring: true,
    recurrence_interval: billingCycle,
  });

  // Calculate next payment date based on billing cycle
  let nextPayment: Date;
  const currentDate = new Date();

  switch (billingCycle) {
    case "weekly":
      nextPayment = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case "monthly":
      nextPayment = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        currentDate.getDate()
      );
      break;
    case "yearly":
      nextPayment = new Date(
        currentDate.getFullYear() + 1,
        currentDate.getMonth(),
        currentDate.getDate()
      );
      break;
    default:
      nextPayment = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  // Update subscription with new next payment date
  await updateSubscription(subscriptionId, {
    next_payment_date: nextPayment.toISOString().split("T")[0],
  });

  console.log(`Processed payment for ${subscriptionName}`);
};

// Pause subscription
const pauseSubscription = async (subscriptionId: string) => {
  await updateSubscription(subscriptionId, {
    is_active: false,
  });

  console.log(`Paused subscription ${subscriptionId}`);
};

// Send budget warning notification
export const sendBudgetNotification = async (
  budgetProgress: BudgetProgress,
  type: "warning" | "exceeded"
) => {
  try {
    const isExceeded = type === "exceeded";
    const category = isExceeded
      ? BUDGET_EXCEEDED_CATEGORY
      : BUDGET_WARNING_CATEGORY;

    const title = isExceeded ? "🚨 Budget Exceeded!" : "⚠️ Budget Alert!";

    const body = isExceeded
      ? `You've spent $${budgetProgress.spent.toFixed(2)} out of $${budgetProgress.budgeted.toFixed(2)} for ${budgetProgress.category} (${budgetProgress.percentage.toFixed(0)}%)`
      : `You've used ${budgetProgress.percentage.toFixed(0)}% of your ${budgetProgress.category} budget ($${budgetProgress.spent.toFixed(2)}/$${budgetProgress.budgeted.toFixed(2)})`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        categoryIdentifier: category,
        data: {
          budgetCategory: budgetProgress.category,
          budgeted: budgetProgress.budgeted,
          spent: budgetProgress.spent,
          percentage: budgetProgress.percentage,
          remaining: budgetProgress.remaining,
          notificationType: type,
        },
        sound: "notification.wav",
      },
      trigger: null, // Show immediately
    });

    // Save to database notifications table
    const { data, error: authError } = await supabase.auth.getUser();
    if (!authError && data?.user) {
      await createBudgetNotification({
        userId: data.user.id,
        budgetName: budgetProgress.category,
        percentage: budgetProgress.percentage,
        currentAmount: budgetProgress.spent,
        budgetLimit: budgetProgress.budgeted,
        budgetId: budgetProgress.category, // Using category as ID for now
      });
    }

    console.log(
      `Sent ${type} notification for ${budgetProgress.category} budget`
    );
  } catch (error) {
    console.error("Error sending budget notification:", error);
  }
};

// Track last notification times to prevent spam
const lastNotificationTimes = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Check all budgets and send appropriate notifications
export const checkBudgetsAndNotify = async () => {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    // Get current budget progress
    const budgetProgress = await getBudgetProgress(user.id);
    const now = Date.now();

    for (const budget of budgetProgress) {
      const percentage = budget.percentage;
      const notificationKey = `budget-${budget.category}-${percentage >= 100 ? "exceeded" : "warning"}`;
      const lastNotificationTime =
        lastNotificationTimes.get(notificationKey) || 0;

      // Only send notification if enough time has passed since last notification
      if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
        console.log(
          `Skipping notification for ${budget.category} - too recent`
        );
        continue;
      }

      // Send notifications based on budget usage
      if (percentage >= 100) {
        // Budget exceeded (100% or more)
        await sendBudgetNotification(budget, "exceeded");
        lastNotificationTimes.set(notificationKey, now);
      } else if (percentage >= 80) {
        // Budget warning (80% or more but less than 100%)
        await sendBudgetNotification(budget, "warning");
        lastNotificationTimes.set(notificationKey, now);
      }
      // You can add more thresholds here if needed (e.g., 90%)
    }

    console.log("Budget notifications checked and sent");
  } catch (error) {
    console.error("Error checking budget notifications:", error);
  }
};

// Check subscriptions due today and send notifications instead of auto-charging
export const checkDueSubscriptionsAndNotify = async () => {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    // Fetch active subscriptions
    const subscriptions = await fetchSubscriptionsWithAccounts(user.id);
    const activeSubscriptions = subscriptions.filter((sub) => sub.is_active);

    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const now = Date.now();

    for (const subscription of activeSubscriptions) {
      const nextPaymentDate = new Date(subscription.next_payment_date);
      const nextPaymentString = nextPaymentDate.toISOString().split("T")[0];
      const notificationKey = `subscription-${subscription.id}-${todayString}`;
      const lastNotificationTime =
        lastNotificationTimes.get(notificationKey) || 0;

      // Check if payment is due today and we haven't sent a notification recently
      if (
        nextPaymentString === todayString &&
        now - lastNotificationTime >= NOTIFICATION_COOLDOWN
      ) {
        // Send notification with interactive buttons
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "💳 Subscription Payment Due",
            body: `${subscription.name} - $${subscription.amount.toFixed(2)} is due today`,
            categoryIdentifier: SUBSCRIPTION_NOTIFICATION_CATEGORY,
            data: {
              subscriptionId: subscription.id,
              subscriptionName: subscription.name,
              amount: subscription.amount,
              accountId: subscription.account_id,
              billingCycle: subscription.billing_cycle,
            },
            sound: "notification.wav",
          },
          trigger: null, // Show immediately
        });

        // Save to database notifications table
        await createSubscriptionNotification({
          userId: user.id,
          subscriptionName: subscription.name,
          amount: subscription.amount,
          dueDate: subscription.next_payment_date,
          subscriptionId: subscription.id,
          isOverdue: false,
        });

        // Track this notification to prevent duplicates
        lastNotificationTimes.set(notificationKey, now);

        console.log(`Sent notification for subscription: ${subscription.name}`);
      } else if (nextPaymentString === todayString) {
        console.log(
          `Skipping notification for ${subscription.name} - already sent today`
        );
      }
    }
  } catch (error) {
    console.error("Error checking due subscriptions:", error);
  }
};

// Setup background task for checking subscriptions
TaskManager.defineTask(SUBSCRIPTION_CHECK_TASK, async () => {
  try {
    await checkDueSubscriptionsAndNotify();
    return { success: true };
  } catch (error) {
    console.error("Background task failed:", error);
    return { success: false };
  }
});

// Register background task with enhanced settings
export const registerBackgroundTask = async () => {
  // If running in Expo Go, return early with a warning
  if (isExpoGo) {
    console.warn(
      "Background tasks and push notifications are not available in Expo Go with SDK 53. Use development build for full functionality."
    );
    return { success: false, reason: "expo-go-limitation" };
  }

  try {
    // Request permissions first with enhanced settings
    const permissionStatus = await requestNotificationPermissions();

    if (permissionStatus === "unavailable") {
      return { success: false, reason: "permissions-unavailable" };
    }

    // Setup notification categories for interactive buttons
    await setupNotificationCategories();

    // Register background fetch (for iOS)
    if (Platform.OS === "ios") {
      try {
        const BackgroundFetch = await import("expo-background-fetch");
        await BackgroundFetch.default.registerTaskAsync(
          SUBSCRIPTION_CHECK_TASK,
          {
            minimumInterval: 24 * 60 * 60 * 1000, // 24 hours (once daily)
            stopOnTerminate: false,
            startOnBoot: true,
          }
        );
        console.log(
          "iOS Background fetch registered for subscriptions and budgets"
        );
      } catch (error) {
        console.log("Background fetch not available on iOS:", error);
      }
    }

    // For Android, schedule recurring notifications as backup
    if (Platform.OS === "android") {
      try {
        // Schedule daily checks for the next 7 days (reduced from 30)
        for (let days = 1; days <= 7; days++) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + days);
          futureDate.setHours(9, 0, 0, 0); // 9 AM daily check

          await Notifications.scheduleNotificationAsync({
            identifier: `daily-check-${days}`,
            content: {
              title: "Daily Check",
              body: "Checking subscriptions and budgets...",
              data: { type: "daily-check" },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: futureDate,
            },
          });
        }
        console.log("Android scheduled daily checks for 7 days");
      } catch (error) {
        console.log("Failed to schedule Android daily checks:", error);
      }
    }

    // Schedule budget check notifications
    await scheduleBudgetCheckNotifications();

    // Immediate check when app starts
    setTimeout(() => {
      checkAllNotifications();
    }, 5000); // Check after 5 seconds

    console.log("Background task and scheduling setup completed");
    return { success: true };
  } catch (error) {
    console.error("Failed to register background task:", error);
    return { success: false };
  }
};

// Manually trigger subscription check (for testing or manual refresh)
export const manualCheckSubscriptions = async () => {
  await checkDueSubscriptionsAndNotify();
};

// Manually trigger budget check
export const manualCheckBudgets = async () => {
  await checkBudgetsAndNotify();
};

// Combined check for both subscriptions and budgets
export const checkAllNotifications = async () => {
  await Promise.all([
    checkDueSubscriptionsAndNotify(),
    checkBudgetsAndNotify(),
  ]);
};

// Cancel all scheduled subscription notifications
export const cancelAllSubscriptionNotifications = async () => {
  const scheduledNotifications =
    await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    if (notification.identifier.startsWith("subscription-")) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier
      );
    }
  }
};

// Schedule budget check notifications for the next 7 days
export const scheduleBudgetCheckNotifications = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Cancel existing budget check notifications
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      if (notification.identifier.startsWith("budget-check-")) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }

    // Schedule budget checks every other day at 8 PM for the next 7 days
    for (let days = 1; days <= 7; days += 2) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() + days);
      checkDate.setHours(20, 0, 0, 0); // 8 PM

      await Notifications.scheduleNotificationAsync({
        identifier: `budget-check-${days}`,
        content: {
          title: "Budget Check",
          body: "Checking your budget progress for today...",
          data: {
            type: "budget-check",
            userId: user.id,
            scheduledDate: checkDate.toISOString(),
          },
          sound: "notification.wav",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: checkDate,
        },
      });
    }

    console.log(
      "Scheduled budget check notifications every other day for the next 7 days"
    );
  } catch (error) {
    console.error("Error scheduling budget check notifications:", error);
  }
};

// Schedule notifications for all upcoming subscriptions
export const scheduleAllUpcomingNotifications = async () => {
  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Cancel existing subscription notifications
    await cancelAllSubscriptionNotifications();

    // Fetch active subscriptions
    const subscriptions = await fetchSubscriptionsWithAccounts(user.id);
    const activeSubscriptions = subscriptions.filter((sub) => sub.is_active);

    for (const subscription of activeSubscriptions) {
      const nextPaymentDate = new Date(subscription.next_payment_date);

      // Only schedule if the date is in the future
      if (nextPaymentDate > new Date()) {
        await scheduleSubscriptionNotification(subscription, nextPaymentDate);
      }
    }

    console.log(
      `Scheduled notifications for ${activeSubscriptions.length} subscriptions`
    );
  } catch (error) {
    console.error("Error scheduling notifications:", error);
  }
};

export default {
  setupNotificationCategories,
  requestNotificationPermissions,
  scheduleSubscriptionNotification,
  handleNotificationResponse,
  checkDueSubscriptionsAndNotify,
  checkBudgetsAndNotify,
  sendBudgetNotification,
  registerBackgroundTask,
  manualCheckSubscriptions,
  manualCheckBudgets,
  checkAllNotifications,
  cancelAllSubscriptionNotifications,
  scheduleAllUpcomingNotifications,
  scheduleBudgetCheckNotifications,
};
