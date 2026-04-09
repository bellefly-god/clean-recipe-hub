import { useEffect, useState } from "react";
import { Check, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { getSubscriptionStatus, cancelSubscription, type SubscriptionStatus } from "@/services/payment/paypalService";
import { PricingPlans } from "@/components/payment/PricingPlans";
import { getPayPalEnvironment } from "@/services/config/remoteConfigService";

export function SubscriptionPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [paypalEnv, setPaypalEnv] = useState<string>("sandbox");

  useEffect(() => {
    async function loadSubscription() {
      if (user?.id) {
        const status = await getSubscriptionStatus(user.id);
        setSubscription(status);
      }
      const env = await getPayPalEnvironment();
      setPaypalEnv(env);
      setLoading(false);
    }
    void loadSubscription();
  }, [user?.id]);

  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    if (!confirm("Are you sure you want to cancel your subscription? You'll keep access until the end of your billing period.")) {
      return;
    }

    setCanceling(true);
    try {
      const result = await cancelSubscription(user.id);
      if (result.success) {
        setSubscription((prev) => prev ? { ...prev, status: "canceled" } : null);
      } else {
        alert(result.error ?? "Failed to cancel subscription");
      }
    } finally {
      setCanceling(false);
    }
  };

  const handleSubscriptionSuccess = async () => {
    if (user?.id) {
      const status = await getSubscriptionStatus(user.id);
      setSubscription(status);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-xl border bg-card p-8 text-center shadow-soft">
          <Crown className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h2 className="mb-2 font-display text-xl text-foreground">
            Sign in to Subscribe
          </h2>
          <p className="text-sm text-muted-foreground">
            Create an account or sign in to unlock unlimited access.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-muted" />
          <div className="h-32 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const isActive = subscription?.status === "active";
  const isCanceled = subscription?.status === "canceled";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <Zap className="mx-auto mb-3 h-10 w-10 text-amber-500" />
        <h1 className="font-display text-2xl text-foreground">
          Upgrade to Pro
        </h1>
        <p className="mt-2 text-muted-foreground">
          Unlimited page cleanings and AI summaries
        </p>
      </div>

      {isActive && subscription && (
        <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/5 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-medium text-foreground">Active Subscription</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Plan: <span className="font-medium text-foreground">
                  {subscription.plan === "pro_monthly" ? "Pro Monthly" : "Pro Yearly"}
                </span>
              </p>
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleCancelSubscription()}
              disabled={canceling || isCanceled}
            >
              {canceling ? "Canceling..." : "Cancel"}
            </Button>
          </div>
        </div>
      )}

      {isCanceled && subscription && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-sm text-muted-foreground">
            Your subscription has been canceled. You'll have access until{" "}
            {subscription.currentPeriodEnd
              ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
              : "the end of your billing period"}.
          </p>
        </div>
      )}

      {!isActive && !isCanceled && (
        <PricingPlans
          userId={user.id}
          userEmail={user.email ?? ""}
          currentPlan={subscription?.plan}
          onSubscriptionSuccess={() => void handleSubscriptionSuccess()}
        />
      )}

      {paypalEnv === "sandbox" && (
        <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center text-xs text-amber-600">
          ⚠️ Using PayPal Sandbox mode — payments are simulated for testing
        </div>
      )}
    </div>
  );
}