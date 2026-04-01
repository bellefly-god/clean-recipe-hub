import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { RecipeResult } from "@/components/recipe/RecipeResult";
import { useAuth } from "@/features/auth/AuthProvider";
import { getSavedRecipeById } from "@/services/savedRecipes/savedRecipesService";
import { getErrorMessage } from "@/shared/utils/errors";
import type { SavedRecipe } from "@/types/recipe";

export function SavedRecipeDetailPage() {
  const navigate = useNavigate();
  const { recipeId } = useParams();
  const { user, loading } = useAuth();
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !recipeId) {
      setIsLoadingRecipe(false);
      return;
    }

    void (async () => {
      try {
        setRecipe(await getSavedRecipeById(user.id, recipeId));
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Unable to load this recipe."));
      } finally {
        setIsLoadingRecipe(false);
      }
    })();
  }, [recipeId, user]);

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoadingRecipe) {
    return <main className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted-foreground">Loading recipe…</main>;
  }

  if (!recipe) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {error || "Recipe not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-8">
      <RecipeResult recipe={recipe} onBack={() => navigate("/saved")} />
    </main>
  );
}
