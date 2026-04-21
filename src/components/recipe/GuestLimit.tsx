import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogIn, Crown } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";

interface GuestLimitProps {
  message?: string;
}

export function GuestLimit({ message }: GuestLimitProps) {
  const { user } = useAuth();
  
  // If user is logged in but has no subscription, show upgrade message
  if (user) {
    return (
      <div className="mx-auto w-full max-w-md animate-fade-in rounded-2xl border bg-card p-8 text-center shadow-card">
        <div className="mb-4 text-4xl">👑</div>
        <h2 className="mb-2 font-display text-xl text-foreground">
          {message ?? "Subscription Required"}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Upgrade to Pro for unlimited page cleanings and AI summaries.
        </p>
        <Link to="/subscription">
          <Button className="h-11 rounded-xl px-8 text-base">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Pro
          </Button>
        </Link>
      </div>
    );
  }

  // Guest user - show sign in message
  return (
    <div className="mx-auto w-full max-w-md animate-fade-in rounded-2xl border bg-card p-8 text-center shadow-card">
      <div className="mb-4 text-4xl">🔒</div>
      <h2 className="mb-2 font-display text-xl text-foreground">
        {message ?? "You've used your 3 free page analyses"}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Sign in to keep analyzing pages and unlock account features.
      </p>
      <Link to="/auth">
        <Button className="h-11 rounded-xl px-8 text-base">
          <LogIn className="mr-2 h-4 w-4" />
          Sign in to continue
        </Button>
      </Link>
    </div>
  );
}
