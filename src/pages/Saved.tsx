import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/EmptyState";
import { SavedRecipeCard } from "@/components/recipe/SavedRecipeCard";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedRecipe } from "@/types/recipe";

// TODO: Replace with Supabase query via react-query
const mockSavedRecipes: SavedRecipe[] = [];

export default function SavedPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const handleDelete = (id: string) => {
    // TODO: Delete from Supabase
    console.log("Delete recipe", id);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 font-display text-2xl text-foreground">Your saved recipes</h1>

      {mockSavedRecipes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="No saved recipes yet"
          description="Clean a recipe and save it to see it here."
          action={
            <Link to="/">
              <Button className="rounded-xl">Clean a recipe</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {mockSavedRecipes.map((recipe) => (
            <SavedRecipeCard key={recipe.id} recipe={recipe} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </main>
  );
}
