import type { ParserSource, RecipeCandidate } from "@/services/recipeParser/parserTypes";
import { parseHtmlDocument } from "@/services/recipeParser/parseHtmlDocument";
import { pickBestCandidate } from "@/services/recipeParser/normalizeRecipe";

const INGREDIENT_SELECTORS = [
  '[itemprop="recipeIngredient"]',
  '[itemprop="ingredients"]',
  ".recipe-ingredients li",
  ".ingredients li",
  "[class*='ingredient'] li",
  "[class*='ingredients'] li",
  "[id*='ingredient'] li",
  "[id*='ingredients'] li",
];

const INSTRUCTION_SELECTORS = [
  '[itemprop="recipeInstructions"]',
  ".recipe-instructions li",
  ".instructions li",
  ".directions li",
  ".method li",
  "[class*='instruction'] li",
  "[class*='direction'] li",
  "[class*='method'] li",
  "[id*='instruction'] li",
  "[id*='direction'] li",
];

const SUMMARY_SELECTORS = [
  '[itemprop="description"]',
  ".recipe-summary",
  ".recipe-description",
  "[class*='summary']",
  "[class*='description']",
];

const TITLE_SELECTORS = [
  '[itemprop="name"]',
  "h1",
  "[class*='recipe-title']",
  "[class*='entry-title']",
  "[class*='post-title']",
];

const NOTES_SELECTORS = [
  '[itemprop="recipeNotes"]',
  '[itemprop="comment"]',
  ".recipe-notes",
  "[class*='notes']",
  "[class*='tips']",
];

function textFromNode(node: Element | null) {
  return node?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function listTextFromRoot(root: ParentNode, selectors: string[]) {
  const items = selectors.flatMap((selector) =>
    Array.from(root.querySelectorAll(selector)).map((node) => textFromNode(node)).filter(Boolean),
  );

  return Array.from(new Set(items));
}

function extractInstructionNodes(root: ParentNode) {
  const explicitInstructionNodes = Array.from(root.querySelectorAll('[itemprop="recipeInstructions"]'));

  if (explicitInstructionNodes.length === 0) {
    return [];
  }

  const steps = explicitInstructionNodes.flatMap((node) => {
    const listItems = Array.from(node.querySelectorAll("li")).map((item) => textFromNode(item)).filter(Boolean);

    if (listItems.length > 0) {
      return listItems;
    }

    const paragraphs = Array.from(node.querySelectorAll("p")).map((item) => textFromNode(item)).filter(Boolean);

    if (paragraphs.length > 0) {
      return paragraphs;
    }

    return [textFromNode(node)].filter(Boolean);
  });

  return Array.from(new Set(steps));
}

function getRecipeRoots(document: Document) {
  const explicitRoots = Array.from(
    document.querySelectorAll(
      '[itemscope][itemtype*="Recipe"], [itemscope][itemtype*="schema.org/Recipe"], [itemtype*="Recipe"]',
    ),
  );

  if (explicitRoots.length > 0) {
    return explicitRoots;
  }

  if (
    document.querySelector('[itemprop="recipeIngredient"]') ||
    document.querySelector('[itemprop="recipeInstructions"]')
  ) {
    return [document.body];
  }

  return [];
}

function buildCandidate(root: Element, source: ParserSource): RecipeCandidate {
  const ingredients = listTextFromRoot(root, INGREDIENT_SELECTORS);

  const steps = extractInstructionNodes(root);
  const summary =
    textFromNode(root.querySelector(SUMMARY_SELECTORS.join(", "))) || source.summaryHint || "";
  const notes = textFromNode(root.querySelector(NOTES_SELECTORS.join(", "))) || null;
  const title =
    textFromNode(root.querySelector(TITLE_SELECTORS.join(", "))) ||
    source.titleHint ||
    "";

  const fallbackSteps = steps.length > 0 ? steps : listTextFromRoot(root, INSTRUCTION_SELECTORS);

  return {
    title,
    summary,
    ingredients,
    steps: fallbackSteps,
    notes,
  };
}

export function extractMicrodataRecipe(source: ParserSource) {
  if (!source.html) {
    console.debug("[Recipe Parser] Microdata recipe not found: no HTML snapshot available.");
    return null;
  }

  const document = parseHtmlDocument(source.html);
  const roots = getRecipeRoots(document);

  if (roots.length === 0) {
    console.debug("[Recipe Parser] Microdata recipe not found: no schema-like roots.");
    return null;
  }

  const bestCandidate = pickBestCandidate(roots.map((root) => buildCandidate(root, source)));

  if (bestCandidate) {
    console.debug("[Recipe Parser] Microdata recipe found.");
    return bestCandidate;
  }

  console.debug("[Recipe Parser] Microdata roots found but no usable recipe extracted.");
  return null;
}
