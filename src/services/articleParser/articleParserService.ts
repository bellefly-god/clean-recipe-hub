import type { PageContext } from "@/shared/types/extension";
import { getDomainFromUrl, isHttpUrl } from "@/shared/utils/url";
import { maybeEnhanceArticleMarkdown } from "@/services/articleParser/aiMarkdownCleanup";
import { extractReadableContent } from "@/services/articleParser/extractReadableContent";
import { normalizeArticle } from "@/services/articleParser/normalizeArticle";
import { selectExtractionStrategy } from "@/services/articleParser/selectExtractionStrategy";
import { detectPageType } from "@/services/pageDetection/detectPageType";
import type { ArticleParseResult } from "@/types/article";

interface ParseArticleOptions {
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

function isSamePage(url: string, pageContext?: PageContext | null) {
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
      console.debug("[Article Parser] Remote fetch failed.", response.status, response.statusText);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      console.debug("[Article Parser] Remote fetch returned non-HTML content.");
      return null;
    }

    return await response.text();
  } catch (error) {
    console.debug("[Article Parser] Remote fetch threw an error.", error);
    return null;
  }
}

function buildResult(result: ArticleParseResult): ArticleParseResult {
  return result;
}

export async function parseArticleFromUrl(
  url: string,
  options?: ParseArticleOptions,
): Promise<ArticleParseResult> {
  if (!isHttpUrl(url)) {
    return buildResult({
      success: false,
      error: "Please enter a valid page URL starting with http:// or https://.",
      pageType: "unsupported",
      uiState: "unsupported",
      notices: [{ code: "unsupported", level: "info" }],
      extractionStatus: "failed",
      extractionSource: "dom",
      failureReason: "invalid_url",
      warnings: [],
    });
  }

  try {
    const pageContext = options?.pageContext ?? null;
    const sourceDomain = getDomainFromUrl(url);
    const html = isSamePage(url, pageContext)
      ? pageContext?.htmlSnapshot ?? null
      : await fetchRemoteHtml(url);

    if (!html) {
      return buildResult({
        success: false,
        error: "We couldn't load enough readable page content to analyze this URL.",
        pageType: "unsupported",
        uiState: "unsupported",
        notices: [{ code: "unsupported", level: "info" }],
        extractionStatus: "failed",
        extractionSource: "dom",
        failureReason: "parse_failed",
        warnings: [],
      });
    }

    const pageDetection = detectPageType({
      url,
      html,
      pageContext,
    });
    const strategy = selectExtractionStrategy(pageDetection.pageType);

    console.debug(
      "[Page Detection] Classified page before extraction.",
      pageDetection.pageType,
      pageDetection.reasons,
      strategy.mode,
    );

    if (!strategy.shouldAttemptExtraction) {
      return buildResult({
        success: false,
        pageType: strategy.pageType,
        uiState: strategy.uiState,
        notices: strategy.notices,
        extractionStatus: strategy.extractionStatus,
        extractionSource: strategy.extractionSource,
        failureReason: strategy.failureReason,
        warnings: strategy.warnings,
      });
    }

    const extraction = extractReadableContent(html, pageContext?.siteName, url, pageDetection.pageType);

    if (!extraction) {
      return buildResult({
        success: false,
        error: "No readable article content was found on this page.",
        pageType: strategy.pageType,
        uiState: strategy.uiState,
        notices: strategy.notices,
        extractionStatus: strategy.extractionStatus === "partial" ? "partial" : "failed",
        extractionSource: strategy.extractionSource,
        failureReason: strategy.failureReason ?? "no_main_content",
        warnings: strategy.warnings,
      });
    }

    const article = normalizeArticle(extraction, {
      url,
      sourceDomain,
      titleHint: pageContext?.title,
      excerptHint: pageContext?.description,
      siteName: pageContext?.siteName,
      publishedAt: pageContext?.publishedAt,
    });

    if (!article) {
      return buildResult({
        success: false,
        error: "This page didn't contain enough readable article content to summarize.",
        pageType: strategy.pageType,
        uiState: strategy.uiState,
        notices: strategy.notices,
        extractionStatus: strategy.extractionStatus === "partial" ? "partial" : "failed",
        extractionSource: strategy.extractionSource,
        failureReason: strategy.failureReason ?? "no_article_found",
        warnings: strategy.warnings,
      });
    }

    article.extractionStatus = strategy.extractionStatus;
    article.extractionSource = strategy.extractionSource;
    article.warnings = strategy.warnings;

    const aiEnhancedMarkdown = await maybeEnhanceArticleMarkdown(article, strategy.pageType);
    if (aiEnhancedMarkdown) {
      article.cleanMarkdown = aiEnhancedMarkdown;
      article.contentMarkdown = aiEnhancedMarkdown;
      if (article.extractionSource === "readability" || article.extractionSource === "dom") {
        article.extractionSource = "mixed";
      }
    }

    return buildResult({
      success: true,
      article,
      pageType: strategy.pageType,
      uiState: strategy.uiState,
      notices: strategy.notices,
      extractionStatus: strategy.extractionStatus,
      extractionSource: article.extractionSource,
      failureReason: strategy.failureReason,
      warnings: strategy.warnings,
    });
  } catch (error) {
    console.error("[Article Parser] Extraction error.", error);
    return buildResult({
      success: false,
      error: "We couldn't analyze this page right now. Try another page.",
      pageType: "unsupported",
      uiState: "unsupported",
      notices: [{ code: "unsupported", level: "info" }],
      extractionStatus: "failed",
      extractionSource: "dom",
      failureReason: "parse_failed",
      warnings: [],
    });
  }
}
