import { PayPalButton } from "@/components/payment/PayPalButton";

// PayPal plan IDs
const PAYPAL_PLANS = {
  monthly: {
    id: "monthly" as const,
    name: "Pro Monthly",
    price: 4.99,
    interval: "month",
    features: [
      "Unlimited page cleanings",
      "Unlimited AI summaries",
      "All page types supported",
    ],
  },
  yearly: {
    id: "yearly" as const,
    name: "Pro Yearly",
    price: 39.9,
    interval: "year",
    features: [
      "Unlimited page cleanings",
      "Unlimited AI summaries",
      "All page types supported",
      "Save 37% vs monthly",
    ],
  },
};

interface PricingPlansProps {
  userId: string;
  userEmail: string;
  currentPlan?: string | null;
  subscriptionStatus?: "active" | "canceled" | "expired" | "inactive" | null;
  onSubscriptionSuccess?: () => void;
}

export function PricingPlans({ 
  userId, 
  userEmail, 
  currentPlan, 
  subscriptionStatus,
  onSubscriptionSuccess 
}: PricingPlansProps) {
  // Only disable button if subscription is ACTIVE and matches the plan
  // If subscription is canceled/expired, user should be able to resubscribe
  const isCurrentActivePlan = (planId: string) => {
    if (subscriptionStatus !== "active") return false;
    return currentPlan === `pro_${planId}`;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Object.values(PAYPAL_PLANS).map((plan) => (
        <div
          key={plan.id}
          className={`relative rounded-xl border bg-card p-5 shadow-soft transition-transform hover:scale-[1.02] ${
            plan.id === "yearly" ? "ring-1 ring-amber-500/20" : ""
          }`}
        >
          {plan.id === "yearly" && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white shadow-sm">
              Best Value
            </div>
          )}

          <div className="mb-4">
            <h3 className="font-display text-lg text-foreground">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold text-foreground">${plan.price}</span>
              <span className="text-muted-foreground"> / {plan.interval}</span>
            </div>
          </div>

          <ul className="mb-5 space-y-2 text-sm text-muted-foreground">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <PayPalButton
            planId={plan.id}
            userId={userId}
            userEmail={userEmail}
            onSuccess={onSubscriptionSuccess}
            disabled={isCurrentActivePlan(plan.id)}
          />
        </div>
      ))}
    </div>
  );
}
