import { supabase } from "../database/supabase";
import type { Subscription } from "../types/types";

export const fetchSubscriptions = async (
  userId: string
): Promise<Subscription[]> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching subscriptions:", error);
    throw error;
  }

  return data || [];
};

export const fetchSubscriptionsWithAccounts = async (
  userId: string
): Promise<any[]> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      `
      *,
      account:accounts(*)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching subscriptions with accounts:", error);
    throw error;
  }

  return data || [];
};

export const addSubscription = async (
  subscription: Omit<Subscription, "id" | "created_at" | "updated_at">
): Promise<Subscription> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert(subscription)
    .select()
    .single();

  if (error) {
    console.error("Error adding subscription:", error);
    throw error;
  }

  return data;
};

export const updateSubscription = async (
  subscriptionId: string,
  updates: Partial<Omit<Subscription, "id" | "created_at" | "updated_at">>
): Promise<Subscription> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("id", subscriptionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }

  return data;
};

export const deleteSubscription = async (
  subscriptionId: string
): Promise<void> => {
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", subscriptionId);

  if (error) {
    console.error("Error deleting subscription:", error);
    throw error;
  }
};

export const toggleSubscriptionStatus = async (
  subscriptionId: string,
  isActive: boolean
): Promise<void> => {
  const { error } = await supabase
    .from("subscriptions")
    .update({ is_active: isActive })
    .eq("id", subscriptionId);

  if (error) {
    console.error("Error toggling subscription status:", error);
    throw error;
  }
};

export const getSubscriptionById = async (
  subscriptionId: string
): Promise<Subscription | null> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching subscription by ID:", error);
    throw error;
  }

  return data;
};

export const getActiveSubscriptions = async (
  userId: string
): Promise<Subscription[]> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("next_payment_date", { ascending: true });

  if (error) {
    console.error("Error fetching active subscriptions:", error);
    throw error;
  }

  return data || [];
};

export const getSubscriptionsByAccount = async (
  userId: string,
  accountId: string
): Promise<Subscription[]> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching subscriptions by account:", error);
    throw error;
  }

  return data || [];
};

export const getSubscriptionsByCategory = async (
  userId: string,
  category: string
): Promise<Subscription[]> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching subscriptions by category:", error);
    throw error;
  }

  return data || [];
};

export const getSubscriptionsByBillingCycle = async (
  userId: string,
  billingCycle: "weekly" | "monthly" | "yearly"
): Promise<Subscription[]> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("billing_cycle", billingCycle)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching subscriptions by billing cycle:", error);
    throw error;
  }

  return data || [];
};

export const getUpcomingSubscriptions = async (
  userId: string,
  days: number = 30
): Promise<Subscription[]> => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .gte("next_payment_date", new Date().toISOString().split("T")[0])
    .lte("next_payment_date", futureDate.toISOString().split("T")[0])
    .order("next_payment_date", { ascending: true });

  if (error) {
    console.error("Error fetching upcoming subscriptions:", error);
    throw error;
  }

  return data || [];
};

export const calculateTotalMonthlyCost = async (
  userId: string
): Promise<number> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("amount, billing_cycle")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("Error calculating total monthly cost:", error);
    throw error;
  }

  if (!data) return 0;

  return data.reduce((total, subscription) => {
    const amount = Number(subscription.amount);
    switch (subscription.billing_cycle) {
      case "weekly":
        return total + amount * 4.33; // Average weeks per month
      case "monthly":
        return total + amount;
      case "yearly":
        return total + amount / 12;
      default:
        return total + amount;
    }
  }, 0);
};
