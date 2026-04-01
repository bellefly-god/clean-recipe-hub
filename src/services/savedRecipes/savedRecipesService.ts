import { supabase } from "@/lib/supabase";
import type { Recipe, SavedRecipe } from "@/types/recipe";

type RecipeDraft = Omit<Recipe, "id" | "createdAt">;

const SAVED_RECIPES_TABLE = "saved_recipes";

interface SavedRecipeRow {
  id: string;
  user_id: string;
  title: string;
  source_url: string;
  source_domain: string;
  summary: string;
  ingredients: string[] | null;
  steps: string[] | null;
  notes: string | null;
  raw_content: string | null;
  created_at: string;
}

function mapRecipeRow(row: SavedRecipeRow): SavedRecipe {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    sourceUrl: row.source_url,
    sourceDomain: row.source_domain,
    summary: row.summary,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    notes: row.notes ?? null,
    rawContent: row.raw_content ?? null,
    createdAt: row.created_at,
  };
}

function getSavePayload(userId: string, recipe: RecipeDraft) {
  return {
    user_id: userId,
    title: recipe.title,
    source_url: recipe.sourceUrl,
    source_domain: recipe.sourceDomain,
    summary: recipe.summary,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    notes: recipe.notes,
    raw_content: recipe.rawContent ?? null,
  };
}

function assertSupabaseConfigured() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
}

export async function listSavedRecipes(userId: string) {
  assertSupabaseConfigured();

  const { data, error } = await supabase!
    .from(SAVED_RECIPES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SavedRecipeRow[]).map(mapRecipeRow);
}

export async function getSavedRecipeById(userId: string, recipeId: string) {
  assertSupabaseConfigured();

  const { data, error } = await supabase!
    .from(SAVED_RECIPES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("id", recipeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapRecipeRow(data as SavedRecipeRow) : null;
}

export async function saveRecipe(userId: string, recipe: RecipeDraft) {
  assertSupabaseConfigured();

  const { data, error } = await supabase!
    .from(SAVED_RECIPES_TABLE)
    .insert(getSavePayload(userId, recipe))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapRecipeRow(data as SavedRecipeRow);
}

export async function deleteSavedRecipe(userId: string, recipeId: string) {
  assertSupabaseConfigured();

  const { error } = await supabase!
    .from(SAVED_RECIPES_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("id", recipeId);

  if (error) {
    throw error;
  }
}
