import type {
  ArticleParseNotice,
  ArticleParseUiState,
  ExtractedContentType,
  ExtractionFailureReason,
  ExtractionSource,
  ExtractionStatus,
  ExtractionWarning,
} from "@/types/article";

export interface ExtractionStrategy {
  pageType: ExtractedContentType;
  extractionStatus: ExtractionStatus;
  extractionSource: ExtractionSource;
  uiState: ArticleParseUiState;
  failureReason?: ExtractionFailureReason;
  warnings: ExtractionWarning[];
  notices: ArticleParseNotice[];
  shouldAttemptExtraction: boolean;
  mode: "recipe" | "standard_article" | "technical_article" | "docs_page" | "visible_only" | "shadow_dom";
}

function buildNotice(code: ArticleParseNotice["code"], level: ArticleParseNotice["level"]): ArticleParseNotice {
  return { code, level };
}

export function selectExtractionStrategy(pageType: ExtractedContentType): ExtractionStrategy {
  switch (pageType) {
    case "recipe":
      return {
        pageType,
        extractionStatus: "success",
        extractionSource: "mixed",
        uiState: "ready",
        warnings: [],
        notices: [buildNotice("recipe_page", "info")],
        shouldAttemptExtraction: true,
        mode: "standard_article",
      };
    case "technical_article":
      return {
        pageType,
        extractionStatus: "success",
        extractionSource: "mixed",
        uiState: "ready",
        warnings: [],
        notices: [],
        shouldAttemptExtraction: true,
        mode: "technical_article",
      };
    case "docs_page":
      return {
        pageType,
        extractionStatus: "success",
        extractionSource: "mixed",
        uiState: "ready",
        warnings: [],
        notices: [],
        shouldAttemptExtraction: true,
        mode: "docs_page",
      };
    case "article":
      return {
        pageType,
        extractionStatus: "success",
        extractionSource: "readability",
        uiState: "ready",
        warnings: [],
        notices: [],
        shouldAttemptExtraction: true,
        mode: "standard_article",
      };
    case "feed_page":
      return {
        pageType,
        extractionStatus: "unsupported",
        extractionSource: "dom",
        uiState: "special_page",
        failureReason: "feed_page_detected",
        warnings: ["page_looks_like_home_or_feed"],
        notices: [buildNotice("feed_page", "info")],
        shouldAttemptExtraction: false,
        mode: "standard_article",
      };
    case "paywalled_or_partial_page":
      return {
        pageType,
        extractionStatus: "partial",
        extractionSource: "readability",
        uiState: "warning",
        failureReason: "content_truncated",
        warnings: ["only_visible_content_extracted"],
        notices: [buildNotice("paywalled_or_partial_page", "warning")],
        shouldAttemptExtraction: true,
        mode: "visible_only",
      };
    case "embedded_content_page":
      return {
        pageType,
        extractionStatus: "partial",
        extractionSource: "mixed",
        uiState: "warning",
        failureReason: "embedded_content_only",
        warnings: ["embedded_content_not_included"],
        notices: [buildNotice("embedded_content_page", "warning")],
        shouldAttemptExtraction: true,
        mode: "visible_only",
      };
    case "shadow_dom_page":
      return {
        pageType,
        extractionStatus: "partial",
        extractionSource: "dom",
        uiState: "warning",
        failureReason: "shadow_dom_not_accessible",
        warnings: ["shadow_dom_content_may_be_incomplete"],
        notices: [buildNotice("shadow_dom_page", "warning")],
        shouldAttemptExtraction: true,
        mode: "shadow_dom",
      };
    case "unsupported":
    default:
      return {
        pageType: "unsupported",
        extractionStatus: "unsupported",
        extractionSource: "dom",
        uiState: "unsupported",
        failureReason: "no_article_found",
        warnings: [],
        notices: [buildNotice("unsupported", "info")],
        shouldAttemptExtraction: false,
        mode: "standard_article",
      };
  }
}
