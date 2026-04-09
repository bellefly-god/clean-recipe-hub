import { supabase } from "@/lib/supabase";

interface RemoteConfig {
  paypal: {
    clientId: string;
    environment: "sandbox" | "live";
    plans: {
      monthly: string;
      yearly: string;
    };
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  features: {
    aiSummary: {
      enabled: boolean;
      provider: string;
    };
  };
  limits: {
    guestMaxUses: number;
  };
  app: {
    name: string;
    version: string;
  };
}

let cachedConfig: RemoteConfig | null = null;
let configPromise: Promise<RemoteConfig> | null = null;

// Your Cloudflare Worker URL
const CONFIG_URL = "https://clean-hub.ariflim813.workers.dev/";

/**
 * Fetch remote configuration from Cloudflare Worker
 * Caches result for the session
 */
export async function fetchRemoteConfig(): Promise<RemoteConfig | null> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Return existing promise if fetch is in progress
  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    try {
      const response = await fetch(CONFIG_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch config:", response.status);
        return null;
      }

      const config = await response.json() as RemoteConfig;
      cachedConfig = config;
      return config;
    } catch (error) {
      console.error("Error fetching config:", error);
      return null;
    }
  })();

  return configPromise;
}

/**
 * Get PayPal client ID from remote config or fallback to env
 */
export async function getPayPalClientId(): Promise<string | undefined> {
  const config = await fetchRemoteConfig();
  return config?.paypal?.clientId || import.meta.env.VITE_PAYPAL_CLIENT_ID;
}

/**
 * Get PayPal environment from remote config or fallback to env
 */
export async function getPayPalEnvironment(): Promise<"sandbox" | "live"> {
  const config = await fetchRemoteConfig();
  return config?.paypal?.environment || (import.meta.env.VITE_PAYPAL_ENVIRONMENT as "sandbox" | "live") || "sandbox";
}

/**
 * Get PayPal plan IDs from remote config
 */
export async function getPayPalPlanIds(): Promise<{ monthly: string; yearly: string }> {
  const config = await fetchRemoteConfig();
  return {
    monthly: config?.paypal?.plans?.monthly || "",
    yearly: config?.paypal?.plans?.yearly || "",
  };
}

/**
 * Get Supabase configuration from remote config or fallback to env
 */
export async function getSupabaseConfig(): Promise<{ url: string; anonKey: string }> {
  const config = await fetchRemoteConfig();
  return {
    url: config?.supabase?.url || import.meta.env.VITE_SUPABASE_URL || "",
    anonKey: config?.supabase?.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  };
}

/**
 * Get guest usage limit from remote config
 */
export async function getGuestMaxUses(): Promise<number> {
  const config = await fetchRemoteConfig();
  return config?.limits?.guestMaxUses || 3;
}