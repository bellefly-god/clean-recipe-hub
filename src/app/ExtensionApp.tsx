import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { AuthPage } from "@/features/auth/AuthPage";
import { RecipeCleanerPage } from "@/features/recipe-cleaner/RecipeCleanerPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { AppProviders } from "@/app/AppProviders";

interface ExtensionAppProps {
  entry: "sidepanel" | "options";
}

function RouteInitializer({ entry }: ExtensionAppProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (entry === "options" && location.pathname === "/") {
      navigate("/settings", { replace: true });
    }
  }, [entry, location.pathname, navigate]);

  return null;
}

function NotFound() {
  return <Navigate to="/" replace />;
}

export function ExtensionApp({ entry }: ExtensionAppProps) {
  return (
    <AppProviders>
      <HashRouter>
        <RouteInitializer entry={entry} />
        <div className="min-h-screen bg-background">
          <Navbar />
          <Routes>
            <Route path="/" element={<RecipeCleanerPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </HashRouter>
    </AppProviders>
  );
}
