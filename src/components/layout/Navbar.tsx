import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { Settings, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link to="/" className="font-display text-lg tracking-tight text-foreground">
          Page Cleaner
        </Link>

        <div className="flex items-center gap-1">
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className={isActive("/") ? "text-foreground" : "text-muted-foreground"}
            >
              Home
            </Button>
          </Link>

          <Link to="/settings">
            <Button
              variant="ghost"
              size="sm"
              className={isActive("/settings") ? "text-foreground" : "text-muted-foreground"}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>

          {!user && !loading && (
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <LogIn className="mr-1 h-4 w-4" />
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
