export const MAX_GUEST_USES = 3;
export const GUEST_USAGE_LIMIT_DISABLED = false;
export const GUEST_USAGE_KEY = "page_cleaner_guest_uses";
export const APP_NAME = "Page Cleaner";

// PayPal Subscription Plans
export const PAYPAL_PLANS = {
  monthly: {
    id: "P-4WM064014K7923346NHRTU5I",
    name: "Pro Monthly",
    price: 4.99,
    currency: "USD",
    interval: "month",
    features: ["Unlimited page cleanings", "Unlimited AI summaries", "All page types supported"],
  },
  yearly: {
    id: "P-9RX64416HR519513SNHRTVCQ",
    name: "Pro Yearly",
    price: 39.9,
    currency: "USD",
    interval: "year",
    features: ["Unlimited page cleanings", "Unlimited AI summaries", "All page types supported", "Save 33% vs monthly"],
  },
} as const;

export type PayPalPlanId = keyof typeof PAYPAL_PLANS;

// PayPal Client ID
export const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
export const PAYPAL_ENVIRONMENT = (import.meta.env.VITE_PAYPAL_ENVIRONMENT as "sandbox" | "live") ?? "sandbox";
