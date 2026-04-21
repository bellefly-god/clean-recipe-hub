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
let configPromise: Promise<RemoteConfig | null> | null = null;

// Your Cloudflare Worker URL
const CONFIG_URL = "https://clean-hub.ariflim813.workers.dev/";

// Debug flag - set to true to see config loading status
const DEBUG_CONFIG = true;

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
      if (DEBUG_CONFIG) {
        console.log("[Config] Fetching from:", CONFIG_URL);
      }

      const response = await fetch(CONFIG_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("[Config] Failed to fetch config:", response.status);
        return null;
      }

      const config = await response.json() as RemoteConfig;

      if (DEBUG_CONFIG) {
        console.log("[Config] Remote config loaded:", config);
      }

      cachedConfig = config;
      return config;
    } catch (error) {
      console.error("[Config] Error fetching config:", error);
      return null;
    }
  })();

  return configPromise;
}

/**
 * Get PayPal client ID from remote config or fallback to env
 */
export async function getPayPalClientId(): Promise<string | undefined> {
  // Try remote config first
  const config = await fetchRemoteConfig();
  const remoteClientId = config?.paypal?.clientId;

  // Fallback to environment variable
  const envClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  if (DEBUG_CONFIG) {
    console.log("[Config] PayPal Client ID - Remote:", remoteClientId, "Env:", envClientId);
  }

  return remoteClientId || envClientId;
}

/**
 * Get PayPal environment from remote config or fallback to env
 */
export async function getPayPalEnvironment(): Promise<"sandbox" | "live"> {
  const config = await fetchRemoteConfig();
  const remoteEnv = config?.paypal?.environment;
  const envEnv = import.meta.env.VITE_PAYPAL_ENVIRONMENT;

  return (remoteEnv || envEnv || "sandbox") as "sandbox" | "live";
}

/**
 * Get PayPal plan IDs from remote config
 */
export async function getPayPalPlanIds(): Promise<{ monthly: string; yearly: string }> {
  const config = await fetchRemoteConfig();

  // Fallback to hardcoded plan IDs (for sandbox)
  return {
    monthly: config?.paypal?.plans?.monthly || "P-4WM064014K7923346NHRTU5I",
    yearly: config?.paypal?.plans?.yearly || "P-9RX64416HR519513SNHRTVCQ",
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