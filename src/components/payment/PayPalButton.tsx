import { Button } from "@/components/ui/button";
import { PayPalPlanId } from "@/lib/constants";
import { generatePaymentToken } from "@/lib/paymentToken";

// PayPal plan IDs
const PAYPAL_PLANS = {
  monthly: "P-4WM064014K7923346NHRTU5I",
  yearly: "P-9RX64416HR519513SNHRTVCQ"
};

// Payment page URL - your Alibaba Cloud server
const PAYMENT_URL = "https://api.pagecleans.com/subscribe";

interface PayPalButtonProps {
  planId: PayPalPlanId;
  userId: string;
  userEmail: string;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function PayPalButton({ planId, userId, userEmail, onSuccess, disabled }: PayPalButtonProps) {
  const planPrices = {
    monthly: "$4.99",
    yearly: "$39.9"
  };

  const handleSubscribe = async () => {
    if (disabled) return;

    // Generate HMAC-signed token to prevent tampering
    const token = await generatePaymentToken(userId, planId, userEmail || "");

    // Open payment page with signed token
    const paymentUrl = `${PAYMENT_URL}?token=${encodeURIComponent(token)}`;
    chrome.tabs.create({ url: paymentUrl });
  };

  if (disabled) {
    return (
      <div className="rounded-lg bg-muted py-3 text-center text-sm text-muted-foreground">
        Already subscribed
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleSubscribe}
        className="w-full"
        size="lg"
        style={{ backgroundColor: '#0070ba', color: 'white' }}
      >
        Subscribe - {planPrices[planId]} / {planId === 'monthly' ? 'month' : 'year'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Opens PayPal in a new tab
      </p>
    </div>
  );
}
