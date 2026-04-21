import { supabase } from "@/lib/supabase";
import { fetchRemoteConfig, getPayPalClientId, getPayPalEnvironment } from "@/services/config/remoteConfigService";

// PayPal SDK types
declare global {
  interface Window {
    paypal?: {
      Buttons: (
        options: PayPalButtonsOptions
      ) => {
        render: (container: string | HTMLElement) => Promise<void>;
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

// Store the SDK URL for injection
let paypalSdkUrl: string | null = null;

/**
 * Load PayPal SDK script using chrome.scripting API
 */
export async function loadPayPalScript(): Promise<void> {
  // Check if already loaded
  if (window.paypal) {
    return;
  }

  // Get config
  const clientId = await getPayPalClientId();
  const environment = await getPayPalEnvironment();

  if (!clientId) {
    throw new Error("PayPal Client ID not configured");
  }

  const baseUrl = environment === "sandbox"
    ? "https://www.sandbox.paypal.com"
    : "https://www.paypal.com";

  paypalSdkUrl = `${baseUrl}/sdk/js?client-id=${clientId}&intent=subscription&vault=true&currency=USD`;

  return new Promise((resolve, reject) => {
    // Check if script is already being loaded
    const existingScript = document.getElementById("paypal-sdk-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Failed to load PayPal SDK")));
      return;
    }

    const script = document.createElement("script");
    script.id = "paypal-sdk-script";
    script.src = paypalSdkUrl;
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
 * Note: Canceled subscriptions remain valid until current_period_end
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getSubscriptionStatus(userId);
  if (!subscription) return false;

  // Active subscription is always valid
  if (subscription.status === "active") {
    if (subscription.currentPeriodEnd) {
      return new Date(subscription.currentPeriodEnd) > new Date();
    }
    return true;
  }

  // Canceled subscription is valid until current_period_end
  if (subscription.status === "canceled") {
    if (subscription.currentPeriodEnd) {
      return new Date(subscription.currentPeriodEnd) > new Date();
    }
    // If no current_period_end, give 30 days grace period
    return false;
  }

  // Other statuses (expired, inactive) are not valid
  return false;
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
 * This will call PayPal API to cancel the subscription and update the database
 */
export async function cancelSubscription(userId: string): Promise<PayPalSubscriptionResult> {
  if (!supabase) {
    return { success: false, error: "Database not configured" };
  }

  try {
    // Get current subscription to get the PayPal subscription ID
    const subscription = await getSubscriptionStatus(userId);
    const paypalSubscriptionId = subscription?.paypalSubscriptionId;

    // Call backend API to cancel subscription (which will call PayPal API)
    const response = await fetch('https://api.pagecleans.com/api/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        paypalSubscriptionId,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      return { success: false, error: result.error };
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
