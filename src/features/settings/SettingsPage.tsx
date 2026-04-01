import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { getGuestUsageCount } from "@/services/guestUsage/guestUsageService";

export function SettingsPage() {
  const { user, loading, signOut, isConfigured } = useAuth();
  const [guestUsageCount, setGuestUsageCount] = useState(0);

  useEffect(() => {
    void getGuestUsageCount().then(setGuestUsageCount);
  }, []);

  if (loading) {
    return null;
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-8 font-display text-2xl text-foreground">Settings</h1>

      <div className="space-y-6">
        <section className="rounded-xl border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </h2>

          {user ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="text-foreground">{user.email}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Member since:</span>{" "}
                <span className="text-foreground">
                  {new Date(user.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Sign in to save cleaned recipes to Supabase and sync them across devices later.</p>
              <Link to="/auth">
                <Button className="rounded-xl">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </Button>
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Usage
          </h2>
          <p className="text-sm text-muted-foreground">
            Guests have used {guestUsageCount} of 3 free cleans in this browser profile.
          </p>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Supabase
          </h2>
          <p className="text-sm text-muted-foreground">
            {isConfigured
              ? "Supabase env vars are configured for extension pages."
              : "Supabase env vars are missing. Auth and saved recipes stay disabled until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set."}
          </p>
        </section>

        {user && (
          <Button variant="outline" className="w-full rounded-xl" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        )}
      </div>
    </main>
  );
}
