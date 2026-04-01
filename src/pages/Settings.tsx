import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-8 font-display text-2xl text-foreground">Settings</h1>

      <div className="space-y-6">
        {/* Profile */}
        <section className="rounded-xl border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Profile
          </h2>
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
        </section>

        {/* Usage */}
        <section className="rounded-xl border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Usage
          </h2>
          <p className="text-sm text-muted-foreground">
            Unlimited recipe cleans as a signed-in user.
          </p>
        </section>

        {/* Theme placeholder */}
        <section className="rounded-xl border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Appearance
          </h2>
          <p className="text-sm text-muted-foreground">Theme settings coming soon.</p>
        </section>

        {/* Sign out */}
        <Button variant="outline" className="w-full rounded-xl" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </main>
  );
}
