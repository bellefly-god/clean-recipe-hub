import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { UrlInput } from "@/components/recipe/UrlInput";
import { RecipeResult } from "@/components/recipe/RecipeResult";
import { RecipeLoadingSkeleton } from "@/components/recipe/RecipeLoadingSkeleton";
import { GuestLimit } from "@/components/recipe/GuestLimit";
import { parseRecipeFromUrl } from "@/services/recipeParser";
import { getRemainingGuestUses, hasGuestUsesRemaining, incrementGuestUsage } from "@/services/guestUsage";
import type { Recipe } from "@/types/recipe";
import { useToast } from "@/hooks/use-toast";
import { Zap, ListChecks, Bookmark } from "lucide-react";

type PageState = "idle" | "loading" | "result" | "error" | "limit";

export default function Index() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<PageState>("idle");
  const [recipe, setRecipe] = useState<Omit<Recipe, "id" | "createdAt"> | null>(null);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(getRemainingGuestUses());

  const handleClean = async (url: string) => {
    // Check guest limit
    if (!user && !hasGuestUsesRemaining()) {
      setState("limit");
      return;
    }

    setState("loading");
    setError("");

    const result = await parseRecipeFromUrl(url);

    if (!result.success || !result.recipe) {
      setState("error");
      setError(result.error ?? "Couldn't extract the recipe. Try another URL.");
      return;
    }

    // Consume a guest use
    if (!user) {
      incrementGuestUsage();
      setRemaining(getRemainingGuestUses());
    }

    setRecipe(result.recipe);
    setState("result");
  };

  const handleSave = () => {
    if (!user) {
      toast({ description: "Sign in to save recipes." });
      return;
    }
    // TODO: Save to Supabase saved_recipes table
    toast({ description: "Recipe saved! (mock — connect Supabase to persist)" });
  };

  const handleBack = () => {
    setState("idle");
    setRecipe(null);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
      {state === "idle" && (
        <div className="animate-fade-in space-y-10 text-center">
          {/* Hero */}
          <div className="space-y-4">
            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
              Clean any recipe,
              <br />
              <span className="text-accent">instantly.</span>
            </h1>
            <p className="mx-auto max-w-md text-lg text-muted-foreground">
              Paste a recipe link and get a distraction-free page with just the ingredients and
              steps. No ads, no life stories.
            </p>
          </div>

          {/* Input */}
          <div className="mx-auto max-w-xl">
            <UrlInput
              onSubmit={handleClean}
              remainingUses={user ? null : remaining}
            />
          </div>

          {/* Benefits */}
          <div className="mx-auto grid max-w-lg gap-6 pt-4 sm:grid-cols-3">
            <Benefit icon={<Zap className="h-5 w-5" />} title="Remove clutter" description="No ads, pop-ups, or long stories" />
            <Benefit icon={<ListChecks className="h-5 w-5" />} title="Clean format" description="Ingredients and steps, nothing else" />
            <Benefit icon={<Bookmark className="h-5 w-5" />} title="Save recipes" description="Keep your favorites after signing in" />
          </div>
        </div>
      )}

      {state === "loading" && (
        <div className="space-y-6">
          <p className="text-center text-sm text-muted-foreground animate-pulse-soft">
            Cleaning your recipe…
          </p>
          <RecipeLoadingSkeleton />
        </div>
      )}

      {state === "result" && recipe && (
        <RecipeResult
          recipe={recipe}
          onBack={handleBack}
          onSave={handleSave}
          canSave={!!user}
        />
      )}

      {state === "error" && (
        <div className="animate-fade-in space-y-6 text-center">
          <div className="text-4xl">😕</div>
          <h2 className="font-display text-xl text-foreground">Something went wrong</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={handleBack}
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Try another URL
          </button>
        </div>
      )}

      {state === "limit" && <GuestLimit />}
    </main>
  );
}

function Benefit({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="space-y-2 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
