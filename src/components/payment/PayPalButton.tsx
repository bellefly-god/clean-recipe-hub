import { useEffect, useRef, useState } from "react";
import { PayPalPlanId } from "@/lib/constants";
import { loadPayPalScript, savePayPalSubscription } from "@/services/payment/paypalService";
import { getPayPalPlanIds } from "@/services/config/remoteConfigService";
import { Button } from "@/components/ui/button";

interface PayPalButtonProps {
  planId: PayPalPlanId;
  userId: string;
  userEmail: string;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function PayPalButton({ planId, userId, userEmail, onSuccess, disabled }: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [planIdRemote, setPlanIdRemote] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function initPayPal() {
      try {
        // Fetch plan ID from remote config
        const planIds = await getPayPalPlanIds();
        const remotePlanId = planIds[planId];

        if (mounted) {
          setPlanIdRemote(remotePlanId);
        }

        await loadPayPalScript();
        if (mounted) {
          setSdkReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load PayPal");
        }
      }
    }

    void initPayPal();

    return () => {
      mounted = false;
    };
  }, [planId]);

  useEffect(() => {
    if (!sdkReady || !window.paypal || !containerRef.current || disabled || !planIdRemote) {
      return;
    }

    const buttons = window.paypal.Buttons({
      style: {
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "paypal",
        height: 45,
      },
      createSubscription: (_data, actions) => {
        return actions.subscription.create({
          plan_id: planIdRemote,
        });
      },
      onApprove: async (data) => {
        setLoading(true);
        try {
          const result = await savePayPalSubscription(userId, userEmail, data.subscriptionID, planId);
          if (result.success) {
            onSuccess?.();
          } else {
            setError(result.error ?? "Failed to save subscription");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
          setLoading(false);
        }
      },
      onCancel: () => {
        setError("Payment was cancelled");
      },
      onError: (err) => {
        setError("Payment failed. Please try again.");
        console.error("PayPal error:", err);
      },
    });

    // Clear previous content and render buttons
    containerRef.current.innerHTML = "";
    void buttons.render(containerRef.current);

    return () => {
      buttons.close();
    };
  }, [sdkReady, disabled, planId, planIdRemote, userId, userEmail, onSuccess]);

  if (error) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
          PayPal SDK failed to load. Please refresh the page.
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </Button>
      </div>
    );
  }

  if (!sdkReady || !planIdRemote) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-paypal-blue/10 py-3 text-sm text-paypal-blue">
        <span className="mr-2">Loading PayPal...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-paypal-blue/10 py-3 text-sm text-paypal-blue">
        Processing payment...
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="rounded-lg bg-muted py-3 text-center text-sm text-muted-foreground">
        Already subscribed
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="[&>div]:flex [&>div]:justify-center"
      />
    </div>
  );
}
