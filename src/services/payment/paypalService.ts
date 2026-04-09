import { supabase } from "@/lib/supabase";
import { fetchRemoteConfig, getPayPalClientId, getPayPalEnvironment } from "@/services/config/remoteConfigService";

// PayPal SDK types
declare global {
  interface Window {
    paypal?: {
      Buttons: (
        options: PayPalButtonsOptions
      ) => {
        render: (container: string) => Promise<void>;
        close: () => void;
      };
    };
  }
}

interface PayPalButtonsOptions {
  style?: {
    layout?: "vertical" | "horizontal";
    color?: "gold" | "blue" | "silver" | "white" | "black";
    shape?: "rect" | "pill";
    label?: "paypal" | "checkout" | "buynow" | "pay";
    height?: number;
  };
  createSubscription?: (data: unknown, actions: PayPalActions) => Promise<string>;
  onApprove?: (data: PayPalApproveData, actions: PayPalActions) => Promise<void>;
  onCancel?: () => void;
  onError?: (err: unknown) => void;
}

interface PayPalActions {
  subscription: {
    create: (plan: { plan_id: string }) => Promise<{ id: string }>;
    get: (id: string) => Promise<unknown>;
  };
  order: {
    create: (order: unknown) => Promise<{ id: string }>;
    capture: () => Promise<unknown>;
  };
  redirect: (url: string) => void;
}

interface PayPalApproveData {
  subscriptionID: string;
  orderID?: string;
  facilitatorAccessToken?: string;
}

export interface SubscriptionStatus {
  id: string;
  status: "active" | "canceled" | "expired" | "inactive";
  plan: "free" | "pro_monthly" | "pro_yearly";
  currentPeriodEnd: string | null;
  paypalSubscriptionId: string | null;
}

export interface PayPalSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  error?: string;
}

/**
 * Load PayPal SDK script
 */
export async function loadPayPalScript(): Promise<void> {
  // Fetch config from remote
  const clientId = await getPayPalClientId();
  const environment = await getPayPalEnvironment();

  return new Promise((resolve, reject) => {
    if (!clientId) {
      reject(new Error("PayPal Client ID not configured"));
      return;
    }

    // Already loaded
    if (window.paypal) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.getElementById("paypal-sdk-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Failed to load PayPal SDK")));
      return;
    }

    const script = document.createElement("script");
    script.id = "paypal-sdk-script";
    const baseUrl = environment === "sandbox"
      ? "https://www.sandbox.paypal.com"
      : "https://www.paypal.com";
    script.src = `${baseUrl}/sdk/js?client-id=${clientId}&intent=subscription&vault=true&currency=USD`;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PayPal SDK"));

    document.head.appendChild(script);
  });
}

/**
 * Check if PayPal is configured
 */
export function isPayPalConfigured(): boolean {
  return !!PAYPAL_CLIENT_ID;
}

/**
 * Get current subscription status for user
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, status, plan, current_period_end, paypal_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    status: data.status,
    plan: data.plan,
    currentPeriodEnd: data.current_period_end,
    paypalSubscriptionId: data.paypal_subscription_id,
  };
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getSubscriptionStatus(userId);
  if (!subscription) return false;

  if (subscription.status !== "active") return false;

  if (subscription.currentPeriodEnd) {
    return new Date(subscription.currentPeriodEnd) > new Date();
  }

  return true;
}

/**
 * Create or update subscription in database after PayPal approval
 */
export async function savePayPalSubscription(
  userId: string,
  email: string,
  paypalSubscriptionId: string,
  planId: "pro_monthly" | "pro_yearly"
): Promise<PayPalSubscriptionResult> {
  if (!supabase) {
    return { success: false, error: "Database not configured" };
  }

  try {
    // Check if subscription already exists
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // Update existing subscription
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan: planId,
          paypal_subscription_id: paypalSubscriptionId,
          current_period_end:
            planId === "pro_monthly"
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Create new subscription
      const { error } = await supabase.from("subscriptions").insert({
        user_id: userId,
        email,
        status: "active",
        plan: planId,
        paypal_subscription_id: paypalSubscriptionId,
        current_period_end:
          planId === "pro_monthly"
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true, subscriptionId: paypalSubscriptionId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Cancel PayPal subscription
 */
export async function cancelSubscription(userId: string): Promise<PayPalSubscriptionResult> {
  if (!supabase) {
    return { success: false, error: "Database not configured" };
  }

  try {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get PayPal environment for display
 */
export function getPayPalEnvironment(): "sandbox" | "live" {
  return PAYPAL_ENVIRONMENT;
}
