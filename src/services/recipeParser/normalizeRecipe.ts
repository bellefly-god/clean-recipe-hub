import type { Recipe } from "@/types/recipe";
import type { ParserSource, RecipeCandidate } from "@/services/recipeParser/parserTypes";

function cleanText(value?: string | null) {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => cleanText(item)).filter(Boolean)));
}

function splitLooseLines(value: string) {
  return value
    .split(/\r?\n|•|·/)
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function splitInstructionParagraph(value: string) {
  const normalized = value.replace(/\r/g, "\n");
  const numberedSplit = normalized
    .split(/(?:^|\n|\s)(?:step\s*)?\d+[.)]\s+/i)
    .map((item) => cleanText(item))
    .filter(Boolean);

  if (numberedSplit.length > 1) {
    return numberedSplit;
  }

  return normalized
    .split(/\n+/)
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function normalizeIngredients(items?: string[]) {
  return unique(
    (items ?? []).flatMap((item) => {
      if (item.includes("\n") || item.includes("•")) {
        return splitLooseLines(item);
      }

      return cleanText(item);
    }),
  );
}

function normalizeSteps(items?: string[]) {
  return unique(
    (items ?? []).flatMap((item) => {
      if (item.includes("\n") || /\b(?:step\s*)?\d+[.)]/i.test(item)) {
        return splitInstructionParagraph(item);
      }

      return cleanText(item);
    }),
  );
}

function scoreCandidate(candidate: RecipeCandidate) {
  const titleScore = candidate.title ? 2 : 0;
  const summaryScore = candidate.summary ? 1 : 0;
  const ingredientScore = Math.min(candidate.ingredients?.length ?? 0, 8);
  const stepScore = Math.min(candidate.steps?.length ?? 0, 8);
  return titleScore + summaryScore + ingredientScore + stepScore;
}

export function isUsableRecipeCandidate(candidate: RecipeCandidate) {
  const ingredients = normalizeIngredients(candidate.ingredients);
  const steps = normalizeSteps(candidate.steps);

  return Boolean(candidate.title || ingredients.length >= 2 || steps.length >= 2) &&
    ingredients.length >= 2 &&
    steps.length >= 1;
}

export function pickBestCandidate(candidates: RecipeCandidate[]) {
  const usableCandidates = candidates.filter(isUsableRecipeCandidate);

  if (usableCandidates.length === 0) {
    return null;
  }

  return usableCandidates.sort((left, right) => scoreCandidate(right) - scoreCandidate(left))[0];
}

export function normalizeRecipeCandidate(
  candidate: RecipeCandidate,
  source: ParserSource,
): Omit<Recipe, "id" | "createdAt"> | null {
  const title = cleanText(candidate.title) || cleanText(source.titleHint);
  const ingredients = normalizeIngredients(candidate.ingredients);
  const steps = normalizeSteps(candidate.steps);
  const summary = cleanText(candidate.summary) || cleanText(source.summaryHint);
  const notes = cleanText(candidate.notes) || null;
  const rawContent = cleanText(candidate.rawContent) || null;

  if (!title || ingredients.length < 2 || steps.length < 1) {
    return null;
  }

  return {
    title,
    sourceUrl: candidate.sourceUrl || source.url,
    sourceDomain: source.sourceDomain,
    summary,
    ingredients,
    steps,
    notes,
    rawContent,
  };
}
