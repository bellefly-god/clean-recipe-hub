import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { SavedRecipeCard } from "@/components/recipe/SavedRecipeCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/features/auth/AuthProvider";
import { deleteSavedRecipe, listSavedRecipes } from "@/services/savedRecipes/savedRecipesService";
import { getErrorMessage } from "@/shared/utils/errors";
import type { SavedRecipe } from "@/types/recipe";

export function SavedRecipesPage() {
  const { user, loading, isConfigured } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setIsLoadingRecipes(false);
      return;
    }

    void (async () => {
      try {
        setError("");
        setIsLoadingRecipes(true);
        setRecipes(await listSavedRecipes(user.id));
      } catch (loadError) {
        setError(getErrorMessage(loadError, "Unable to load saved recipes."));
      } finally {
        setIsLoadingRecipes(false);
      }
    })();
  }, [user]);

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleDelete = async (recipeId: string) => {
    try {
      await deleteSavedRecipe(user.id, recipeId);
      setRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Unable to delete this recipe."));
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 font-display text-2xl text-foreground">Your saved recipes</h1>

      {!isConfigured && (
        <div className="mb-6 rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">
          Supabase is not configured yet. Saving is disabled until extension env vars are supplied.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoadingRecipes ? (
        <div className="text-sm text-muted-foreground">Loading saved recipes…</div>
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="No saved recipes yet"
          description="Clean a recipe in the side panel and save it to see it here."
          action={
            <Link to="/">
              <Button className="rounded-xl">Clean a recipe</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <SavedRecipeCard key={recipe.id} recipe={recipe} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </main>
  );
}
