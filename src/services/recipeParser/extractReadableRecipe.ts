import { Readability } from "@mozilla/readability";
import type { ParserSource, RecipeCandidate } from "@/services/recipeParser/parserTypes";
import { parseHtmlDocument } from "@/services/recipeParser/parseHtmlDocument";

const INGREDIENT_HEADING_RE = /\bingredients?\b|what you'll need|you will need/i;
const STEP_HEADING_RE = /\binstructions?\b|\bdirections?\b|\bmethod\b|\bpreparation\b|\bprep\b|\bsteps?\b/i;
const NOTES_HEADING_RE = /\bnotes?\b|\btips?\b|\bchef'?s notes?\b|\bhelpful tips\b/i;
const INGREDIENT_LINE_RE =
  /^\s*(?:\d+\/\d+|\d+(?:[.,]\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter|pinch|dash)\b/i;
const MEASUREMENT_RE =
  /\b(?:cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|g|kg|ml|l|pound|pounds|lb|lbs|clove|cloves|slice|slices)\b/i;

function cleanText(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isHeading(node: Element | null) {
  return Boolean(node && /^H[1-6]$/.test(node.tagName));
}

function collectTextBlocks(nodes: Element[]) {
  const values = nodes.flatMap((node) => {
    const listItems = Array.from(node.querySelectorAll("li")).map((item) => cleanText(item.textContent));
    if (listItems.length > 0) {
      return listItems.filter(Boolean);
    }

    const paragraphs = Array.from(node.querySelectorAll("p")).map((item) => cleanText(item.textContent));
    if (paragraphs.length > 0) {
      return paragraphs.filter(Boolean);
    }

    return [cleanText(node.textContent)].filter(Boolean);
  });

  return Array.from(new Set(values));
}

function collectSectionContent(heading: Element) {
  const nodes: Element[] = [];
  let next = heading.nextElementSibling;

  while (next && !isHeading(next)) {
    nodes.push(next);
    next = next.nextElementSibling;
  }

  return nodes;
}

function extractSections(articleBody: HTMLElement) {
  const headings = Array.from(articleBody.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  const sections = {
    ingredients: [] as string[],
    steps: [] as string[],
    notes: [] as string[],
  };

  headings.forEach((heading) => {
    const label = cleanText(heading.textContent).toLowerCase();
    const content = collectTextBlocks(collectSectionContent(heading));

    if (content.length === 0) {
      return;
    }

    if (INGREDIENT_HEADING_RE.test(label)) {
      sections.ingredients.push(...content);
      return;
    }

    if (STEP_HEADING_RE.test(label)) {
      sections.steps.push(...content);
      return;
    }

    if (NOTES_HEADING_RE.test(label)) {
      sections.notes.push(...content);
    }
  });

  return sections;
}

function detectIngredientLikeLines(lines: string[]) {
  return lines.filter((line) => INGREDIENT_LINE_RE.test(line) || MEASUREMENT_RE.test(line)).slice(0, 20);
}

function detectStepLikeLines(lines: string[]) {
  return lines
    .filter((line) => line.length > 35 || /^\d+[.)]\s+/.test(line) || /\b(?:mix|stir|bake|cook|heat|combine|add|pour)\b/i.test(line))
    .slice(0, 20);
}

function extractTextLines(root: ParentNode) {
  return Array.from(root.querySelectorAll("li, p"))
    .map((node) => cleanText(node.textContent))
    .filter(Boolean);
}

function extractSectionsFromRoot(root: ParentNode) {
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  const sections = {
    ingredients: [] as string[],
    steps: [] as string[],
    notes: [] as string[],
  };

  headings.forEach((heading) => {
    const label = cleanText(heading.textContent).toLowerCase();
    const content = collectTextBlocks(collectSectionContent(heading));

    if (content.length === 0) {
      return;
    }

    if (INGREDIENT_HEADING_RE.test(label)) {
      sections.ingredients.push(...content);
      return;
    }

    if (STEP_HEADING_RE.test(label)) {
      sections.steps.push(...content);
      return;
    }

    if (NOTES_HEADING_RE.test(label)) {
      sections.notes.push(...content);
    }
  });

  return sections;
}

export function extractReadableRecipe(source: ParserSource) {
  if (!source.html) {
    console.debug("[Recipe Parser] Readability fallback unavailable: no HTML snapshot.");
    return null;
  }

  const readabilityDocument = parseHtmlDocument(source.html);
  const article = new Readability(readabilityDocument).parse();

  if (!article?.content) {
    console.debug("[Recipe Parser] Readability fallback failed: no readable content.");
    return null;
  }

  const articleDocument = parseHtmlDocument(article.content);
  const articleBody = articleDocument.body;
  const fullDocument = parseHtmlDocument(source.html);
  const articleSections = extractSections(articleBody);
  const fullSections = extractSectionsFromRoot(fullDocument.body);

  let ingredients = articleSections.ingredients.length > 0 ? articleSections.ingredients : fullSections.ingredients;
  let steps = articleSections.steps.length > 0 ? articleSections.steps : fullSections.steps;
  const notes =
    articleSections.notes.join("\n") ||
    fullSections.notes.join("\n") ||
    null;

  if (ingredients.length === 0 || steps.length === 0) {
    const articleLines = extractTextLines(articleBody);
    const documentLines = extractTextLines(fullDocument.body);
    const candidateLines = articleLines.length >= documentLines.length / 3 ? articleLines : documentLines;

    if (ingredients.length === 0) {
      ingredients = detectIngredientLikeLines(candidateLines);
    }

    if (steps.length === 0) {
      steps = detectStepLikeLines(candidateLines);
    }
  }

  if (ingredients.length < 2 || steps.length < 1) {
    console.debug("[Recipe Parser] Readability fallback did not find recipe-like sections.");
    return null;
  }

  console.debug("[Recipe Parser] Readability fallback used.");

  return {
    title: cleanText(article.title) || source.titleHint,
    summary: cleanText(article.excerpt) || source.summaryHint,
    ingredients,
    steps,
    notes,
    rawContent: cleanText(article.textContent),
  } satisfies RecipeCandidate;
}
