import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";

interface GuestLimitProps {
  message?: string;
}

export function GuestLimit({ message }: GuestLimitProps) {
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
