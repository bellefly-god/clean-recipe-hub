import { PayPalButton } from "@/components/payment/PayPalButton";
import { PAYPAL_PLANS, PayPalPlanId } from "@/lib/constants";

interface PricingPlan {
  id: PayPalPlanId;
  name: string;
  price: number;
  interval: string;
  features: string[];
}

const plans: PricingPlan[] = [
  {
    id: "monthly",
    name: PAYPAL_PLANS.monthly.name,
    price: PAYPAL_PLANS.monthly.price,
    interval: PAYPAL_PLANS.monthly.interval,
    features: PAYPAL_PLANS.monthly.features,
  },
  {
    id: "yearly",
    name: PAYPAL_PLANS.yearly.name,
    price: PAYPAL_PLANS.yearly.price,
    interval: PAYPAL_PLANS.yearly.interval,
    features: PAYPAL_PLANS.yearly.features,
  },
];

interface PricingPlansProps {
  userId: string;
  userEmail: string;
  currentPlan?: string | null;
  onSubscriptionSuccess?: () => void;
}

export function PricingPlans({ userId, userEmail, currentPlan, onSubscriptionSuccess }: PricingPlansProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`relative rounded-xl border bg-card p-5 shadow-soft ${
            plan.id === "yearly" ? "ring-1 ring-amber-500/20" : ""
          }`}
        >
          {plan.id === "yearly" && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
              Best Value
            </div>
          )}

          <div className="mb-4">
            <h3 className="font-display text-lg text-foreground">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold text-foreground">$ {plan.price}</span>
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
            disabled={currentPlan === "pro_monthly" || currentPlan === "pro_yearly"}
          />
        </div>
      ))}
    </div>
  );
}