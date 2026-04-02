import type { ParserSource, RecipeCandidate } from "@/services/recipeParser/parserTypes";
import { pickBestCandidate } from "@/services/recipeParser/normalizeRecipe";
import { parseHtmlDocument } from "@/services/recipeParser/parseHtmlDocument";

type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];

interface JsonLdObject {
  [key: string]: JsonLdValue;
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined || value === null ? [] : [value];
}

function toText(value: JsonLdValue | undefined): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function hasRecipeType(node: JsonLdObject) {
  const typeValue = node["@type"];
  const types = toArray(typeValue).map((value) => toText(value).toLowerCase());
  return types.includes("recipe");
}

function flattenJsonLdNodes(value: JsonLdValue, depth = 0): JsonLdObject[] {
  if (depth > 8 || !value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenJsonLdNodes(item, depth + 1));
  }

  if (typeof value !== "object") {
    return [];
  }

  const node = value as JsonLdObject;
  const nestedGraphs = flattenJsonLdNodes(node["@graph"], depth + 1);
  const nestedMainEntity = flattenJsonLdNodes(node.mainEntity, depth + 1);
  const nestedSubject = flattenJsonLdNodes(node.subjectOf, depth + 1);
  const nestedItemList = flattenJsonLdNodes(node.itemListElement, depth + 1);

  return [node, ...nestedGraphs, ...nestedMainEntity, ...nestedSubject, ...nestedItemList];
}

function parseJsonLdBlock(rawBlock: string) {
  try {
    return JSON.parse(rawBlock) as JsonLdValue;
  } catch (error) {
    console.debug("[Recipe Parser] Skipping invalid JSON-LD block.", error);
    return null;
  }
}

function getJsonLdBlocksFromHtml(html?: string) {
  if (!html) {
    return [];
  }

  const document = parseHtmlDocument(html);
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
}

function extractInstructionTexts(value: JsonLdValue | undefined): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return [value.trim()];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractInstructionTexts(item));
  }

  if (typeof value !== "object") {
    return [];
  }

  const node = value as JsonLdObject;
  const typeValue = toArray(node["@type"]).map((item) => toText(item).toLowerCase());

  if (typeValue.includes("howtosection")) {
    return [
      ...extractInstructionTexts(node.name),
      ...extractInstructionTexts(node.itemListElement),
      ...extractInstructionTexts(node.recipeInstructions),
    ];
  }

  if (typeValue.includes("howtostep")) {
    return [toText(node.text) || toText(node.name)].filter(Boolean);
  }

  return [
    toText(node.text),
    ...extractInstructionTexts(node.itemListElement),
    ...extractInstructionTexts(node.recipeInstructions),
    ...extractInstructionTexts(node.steps),
  ].filter(Boolean);
}

function extractIngredients(value: JsonLdValue | undefined): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildCandidateFromJsonLd(node: JsonLdObject): RecipeCandidate {
  return {
    title: toText(node.name) || toText(node.headline),
    summary: toText(node.description),
    ingredients: extractIngredients(node.recipeIngredient),
    steps: extractInstructionTexts(node.recipeInstructions),
    notes: toText(node.keywords) || null,
    sourceUrl: toText(node.url),
  };
}

export function extractJsonLdRecipe(source: ParserSource) {
  const jsonLdBlocks = source.jsonLdBlocks?.length
    ? source.jsonLdBlocks
    : getJsonLdBlocksFromHtml(source.html);

  if (jsonLdBlocks.length === 0) {
    console.debug("[Recipe Parser] JSON-LD recipe not found: no blocks available.");
    return null;
  }

  const candidates = jsonLdBlocks
    .map(parseJsonLdBlock)
    .flatMap((parsed) => flattenJsonLdNodes(parsed))
    .filter(hasRecipeType)
    .map(buildCandidateFromJsonLd);

  const bestCandidate = pickBestCandidate(candidates);

  if (bestCandidate) {
    console.debug("[Recipe Parser] JSON-LD recipe found.");
    return bestCandidate;
  }

  console.debug("[Recipe Parser] JSON-LD blocks present but no usable recipe found.");
  return null;
}
