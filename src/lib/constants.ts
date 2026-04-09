export const MAX_GUEST_USES = 3;
export const GUEST_USAGE_LIMIT_DISABLED = false;
export const GUEST_USAGE_KEY = "recipe_cleaner_guest_uses";
export const APP_NAME = "Recipe Cleaner";

// PayPal Subscription Plans
export const PAYPAL_PLANS = {
  monthly: {
    id: "P-14Y667762H851883NNHLVNYY",
    name: "Pro Monthly",
    price: 3.99,
    currency: "USD",
    interval: "month",
    features: ["Unlimited page cleanings", "Unlimited AI summaries", "All page types supported"],
  },
  yearly: {
    id: "P-5RA73862FS6145123NHLVNZQ",
    name: "Pro Yearly",
    price: 29.9,
    currency: "USD",
    interval: "year",
    features: ["Unlimited page cleanings", "Unlimited AI summaries", "All page types supported", "Save 37% vs monthly"],
  },
} as const;

export type PayPalPlanId = keyof typeof PAYPAL_PLANS;

// PayPal Client ID
export const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
export const PAYPAL_ENVIRONMENT = (import.meta.env.VITE_PAYPAL_ENVIRONMENT as "sandbox" | "live") ?? "sandbox";
