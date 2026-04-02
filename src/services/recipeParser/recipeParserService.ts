import type { RecipeParseResult } from "@/types/recipe";
import type { PageContext } from "@/shared/types/extension";
import { getDomainFromUrl, isHttpUrl } from "@/shared/utils/url";
import { extractJsonLdRecipe } from "@/services/recipeParser/extractJsonLdRecipe";
import { extractMicrodataRecipe } from "@/services/recipeParser/extractMicrodataRecipe";
import { extractReadableRecipe } from "@/services/recipeParser/extractReadableRecipe";
import { normalizeRecipeCandidate } from "@/services/recipeParser/normalizeRecipe";
import type { ParserSource } from "@/services/recipeParser/parserTypes";

interface ParseRecipeOptions {
  pageContext?: PageContext | null;
}

function normalizeComparableUrl(value: string) {
  try {
    const normalized = new URL(value);
    normalized.hash = "";
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

function isSameRecipePage(url: string, pageContext?: PageContext | null) {
  if (!pageContext?.url) {
    return false;
  }

  const targetUrl = normalizeComparableUrl(url);
  const pageUrl = normalizeComparableUrl(pageContext.url);
  const canonicalUrl = pageContext.canonicalUrl ? normalizeComparableUrl(pageContext.canonicalUrl) : "";

  return targetUrl === pageUrl || (canonicalUrl !== "" && targetUrl === canonicalUrl);
}

async function fetchRemoteHtml(url: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
    });

    if (!response.ok) {
      console.debug("[Recipe Parser] Remote fetch failed.", response.status, response.statusText);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      console.debug("[Recipe Parser] Remote fetch returned non-HTML content.");
      return null;
    }

    return await response.text();
  } catch (error) {
    console.debug("[Recipe Parser] Remote fetch threw an error.", error);
    return null;
  }
}

async function buildParserSource(url: string, pageContext?: PageContext | null): Promise<ParserSource> {
  const sourceDomain = getDomainFromUrl(url);

  if (isSameRecipePage(url, pageContext)) {
    return {
      url,
      sourceDomain,
      titleHint: pageContext?.title,
      summaryHint: pageContext?.description,
      html: pageContext?.htmlSnapshot,
      jsonLdBlocks: pageContext?.jsonLdBlocks,
    };
  }

  console.debug("[Recipe Parser] Requested URL differs from active page context. Falling back to remote fetch.");

  const html = await fetchRemoteHtml(url);
  return {
    url,
    sourceDomain,
    html: html ?? undefined,
  };
}

export async function parseRecipeFromUrl(
  url: string,
  options?: ParseRecipeOptions,
): Promise<RecipeParseResult> {
  if (!isHttpUrl(url)) {
    return {
      success: false,
      error: "Please enter a valid recipe URL starting with http:// or https://.",
    };
  }

  try {
    const pageContext = options?.pageContext ?? null;
    const parserSource = await buildParserSource(url, pageContext);

    const candidate =
      extractJsonLdRecipe(parserSource) ??
      extractMicrodataRecipe(parserSource) ??
      extractReadableRecipe(parserSource);

    if (!candidate) {
      console.debug("[Recipe Parser] No recipe candidate found after all parser stages.");
      return {
        success: false,
        error: "This page doesn't appear to contain a recipe we can extract yet.",
      };
    }

    const recipe = normalizeRecipeCandidate(candidate, parserSource);

    if (!recipe) {
      console.debug("[Recipe Parser] Candidate extracted but failed normalization.");
      return {
        success: false,
        error: "We found page content, but it didn't contain a complete recipe.",
      };
    }

    return {
      success: true,
      recipe,
    };
  } catch (error) {
    console.error("[Recipe Parser] Extraction error.", error);
    return {
      success: false,
      error: "We couldn't parse this recipe page right now. Try another page.",
    };
  }
}
