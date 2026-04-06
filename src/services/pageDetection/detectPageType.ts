import { parseHtmlDocument } from "@/services/recipeParser/parseHtmlDocument";
import { detectEmbeddedContent } from "@/services/pageDetection/detectEmbeddedContent";
import { detectFeedPage } from "@/services/pageDetection/detectFeedPage";
import { detectPaywall } from "@/services/pageDetection/detectPaywall";
import { detectShadowDom } from "@/services/pageDetection/detectShadowDom";
import type { PageDetectionInput, PageDetectionResult } from "@/services/pageDetection/types";

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase();
}

function countMatches(value: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0);
}

function detectRecipePage(document: Document, url: string, text: string, jsonLdBlocks: string[]) {
  const schemaHit = jsonLdBlocks.some((block) => /"@type"\s*:\s*"Recipe"|"@type"\s*:\s*\[\s*"Recipe"/i.test(block));
  const microdataHit =
    document.querySelector('[itemprop="recipeIngredient"], [itemprop="recipeInstructions"], [itemtype*="Recipe"]') !==
    null;
  const keywordScore = countMatches(text, [
    /\bingredients?\b/,
    /\binstructions?\b/,
    /\bdirections?\b/,
    /\bprep time\b/,
    /\bcook time\b/,
    /\bservings?\b/,
  ]);

  const matched = schemaHit || microdataHit || keywordScore >= 3 || /\brecipe|recipes|cooking\b/.test(url);

  return {
    matched,
    reasons: matched
      ? [schemaHit ? "recipe-schema" : "", microdataHit ? "recipe-microdata" : "", keywordScore >= 3 ? "recipe-keywords" : ""].filter(Boolean)
      : [],
  };
}

function detectTechnicalLikePage(document: Document, url: string, text: string) {
  const preCount = document.querySelectorAll("pre").length;
  const codeCount = document.querySelectorAll("code").length;
  const headingCount = document.querySelectorAll("h2, h3, h4").length;
  const docsUrl = /docs|reference|api|sdk|developer|manual/.test(url);
  const tutorialKeywords = countMatches(text, [
    /\bhow to\b/,
    /\btutorial\b/,
    /\bguide\b/,
    /\binstall(?:ation)?\b/,
    /\bconfiguration\b/,
    /\bexample\b/,
    /\bapi\b/,
    /\bcli\b/,
    /\bterminal\b/,
    /\bfunction\b/,
    /\bclass\b/,
    /\btypescript\b|\bjavascript\b|\bpython\b|\bjava\b|\brust\b|\bsql\b/,
  ]);

  const docsMatched = docsUrl || (headingCount >= 6 && preCount + codeCount >= 3 && tutorialKeywords >= 3);
  const technicalMatched = preCount + codeCount >= 3 || tutorialKeywords >= 5;

  return {
    docsMatched,
    technicalMatched,
    reasons: [
      docsMatched ? "docs-structure" : "",
      technicalMatched ? "code-heavy-structure" : "",
      docsUrl ? "docs-url" : "",
    ].filter(Boolean),
  };
}

function detectArticlePage(document: Document, text: string) {
  const paragraphCount = Array.from(document.querySelectorAll("p")).filter(
    (paragraph) => (paragraph.textContent?.trim().length ?? 0) > 100,
  ).length;
  const headingCount = document.querySelectorAll("h1, h2, h3").length;
  const imageCount = document.querySelectorAll("img").length;
  const matched = text.length > 1200 && paragraphCount >= 4 && headingCount >= 1;

  return {
    matched,
    reasons: matched
      ? [paragraphCount >= 4 ? "strong-paragraph-flow" : "", headingCount >= 1 ? "article-headings" : "", imageCount >= 1 ? "article-images" : ""].filter(Boolean)
      : [],
  };
}

export function detectPageType(input: PageDetectionInput): PageDetectionResult {
  const document = parseHtmlDocument(input.html);
  const text = normalizeText(document.body.textContent?.replace(/\s+/g, " ").trim() ?? "");
  const url = normalizeText(input.url);
  const jsonLdBlocks = input.pageContext?.jsonLdBlocks ?? [];

  const shadowDom = detectShadowDom(input.pageContext);
  if (shadowDom.matched) {
    return {
      pageType: "shadow_dom_page",
      confidence: 0.88,
      reasons: shadowDom.reasons,
    };
  }

  const embedded = detectEmbeddedContent(document, input.pageContext?.iframeCount ?? 0);
  if (embedded.matched) {
    return {
      pageType: "embedded_content_page",
      confidence: 0.84,
      reasons: embedded.reasons,
    };
  }

  const paywall = detectPaywall(document);
  if (paywall.matched) {
    return {
      pageType: "paywalled_or_partial_page",
      confidence: 0.83,
      reasons: paywall.reasons,
    };
  }

  const feed = detectFeedPage(document);
  if (feed.matched) {
    return {
      pageType: "feed_page",
      confidence: 0.82,
      reasons: feed.reasons,
    };
  }

  const recipe = detectRecipePage(document, url, text, jsonLdBlocks);
  if (recipe.matched) {
    return {
      pageType: "recipe",
      confidence: 0.92,
      reasons: recipe.reasons,
    };
  }

  const technical = detectTechnicalLikePage(document, url, text);
  if (technical.docsMatched) {
    return {
      pageType: "docs_page",
      confidence: 0.86,
      reasons: technical.reasons,
    };
  }

  if (technical.technicalMatched) {
    return {
      pageType: "technical_article",
      confidence: 0.84,
      reasons: technical.reasons,
    };
  }

  const article = detectArticlePage(document, text);
  if (article.matched) {
    return {
      pageType: "article",
      confidence: 0.74,
      reasons: article.reasons,
    };
  }

  return {
    pageType: "unsupported",
    confidence: 0.4,
    reasons: text.length < 200 ? ["too-little-readable-content"] : ["no-clear-main-content"],
  };
}
