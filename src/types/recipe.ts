export interface Recipe {
  id: string;
  title: string;
  sourceUrl: string;
  sourceDomain: string;
  summary: string;
  ingredients: string[];
  steps: string[];
  notes: string | null;
  rawContent?: string | null;
  createdAt: string;
}

export interface SavedRecipe extends Recipe {
  userId: string;
}

export interface RecipeParseResult {
  success: boolean;
  recipe?: Omit<Recipe, "id" | "createdAt">;
  error?: string;
}
