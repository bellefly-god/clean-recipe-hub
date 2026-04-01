import type { SavedRecipe } from "@/types/recipe";
import { Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface SavedRecipeCardProps {
  recipe: SavedRecipe;
  onDelete: (id: string) => void;
}

export function SavedRecipeCard({ recipe, onDelete }: SavedRecipeCardProps) {
  return (
    <div className="group rounded-xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="truncate font-display text-lg text-foreground">{recipe.title}</h3>
          <p className="text-sm text-muted-foreground">{recipe.sourceDomain}</p>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {recipe.summary}
          </p>
          <p className="text-xs text-muted-foreground/60">
            {new Date(recipe.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link to={`/saved/${recipe.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full rounded-lg">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(recipe.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
