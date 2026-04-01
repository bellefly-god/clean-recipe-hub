import type { Recipe } from "@/types/recipe";
import { Button } from "@/components/ui/button";
import { Check, Copy, ArrowLeft, Bookmark } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface RecipeResultProps {
  recipe: Recipe | Omit<Recipe, "id" | "createdAt">;
  onBack: () => void;
  onSave?: () => void;
  canSave?: boolean;
}

export function RecipeResult({ recipe, onBack, onSave, canSave }: RecipeResultProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${label} copied to clipboard` });
  };

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
          {recipe.title}
        </h1>

        <p className="text-sm text-muted-foreground">
          from <span className="font-medium">{recipe.sourceDomain}</span>
        </p>

        {recipe.summary && (
          <p className="text-base leading-relaxed text-muted-foreground">{recipe.summary}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <CopyButton
          onClick={() => copyToClipboard(recipe.ingredients.join("\n"), "Ingredients")}
          label="Copy ingredients"
        />
        <CopyButton
          onClick={() =>
            copyToClipboard(recipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"), "Steps")
          }
          label="Copy steps"
        />
        {canSave && onSave && (
          <Button variant="outline" size="sm" className="rounded-lg" onClick={onSave}>
            <Bookmark className="mr-1.5 h-3.5 w-3.5" />
            Save recipe
          </Button>
        )}
      </div>

      {/* Ingredients */}
      <section className="space-y-4">
        <h2 className="font-display text-xl text-foreground">Ingredients</h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-foreground">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Steps */}
      <section className="space-y-4">
        <h2 className="font-display text-xl text-foreground">Instructions</h2>
        <ol className="space-y-4">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
                {i + 1}
              </span>
              <p className="pt-0.5 leading-relaxed text-foreground">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Notes */}
      {recipe.notes && (
        <section className="rounded-xl border bg-secondary/50 p-5">
          <h2 className="mb-2 font-display text-lg text-foreground">Notes</h2>
          <p className="leading-relaxed text-muted-foreground">{recipe.notes}</p>
        </section>
      )}
    </div>
  );
}

function CopyButton({ onClick, label }: { onClick: () => void; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    onClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" className="rounded-lg" onClick={handleClick}>
      {copied ? (
        <Check className="mr-1.5 h-3.5 w-3.5 text-accent" />
      ) : (
        <Copy className="mr-1.5 h-3.5 w-3.5" />
      )}
      {copied ? "Copied!" : label}
    </Button>
  );
}
