export type ExtractedContentType =
  | "recipe"
  | "article"
  | "technical_article"
  | "docs_page"
  | "feed_page"
  | "paywalled_or_partial_page"
  | "embedded_content_page"
  | "shadow_dom_page"
  | "unsupported";

export type ArticleParseNoticeCode =
  | "recipe_page"
  | "feed_page"
  | "paywalled_or_partial_page"
  | "embedded_content_page"
  | "shadow_dom_page"
  | "unsupported";

export type ArticleParseUiState = "ready" | "warning" | "special_page" | "unsupported";
export type ExtractionStatus = "success" | "partial" | "unsupported" | "failed";
export type ExtractionSource = "jsonld" | "microdata" | "readability" | "dom" | "selection" | "mixed";
export type ExtractionFailureReason =
  | "invalid_url"
  | "unsupported_protocol"
  | "no_main_content"
  | "feed_page_detected"
  | "paywall_detected"
  | "content_truncated"
  | "embedded_content_only"
  | "shadow_dom_not_accessible"
  | "parse_failed"
  | "no_recipe_found"
  | "no_article_found";
export type ExtractionWarning =
  | "only_visible_content_extracted"
  | "embedded_content_not_included"
  | "lazy_loaded_images_may_be_missing"
  | "page_looks_like_home_or_feed"
  | "shadow_dom_content_may_be_incomplete";

export interface ArticleParseNotice {
  code: ArticleParseNoticeCode;
  level: "info" | "warning";
}

export interface ArticleImage {
  src: string;
  alt?: string;
  caption?: string;
}

export interface ArticleHeading {
  level: number;
  text: string;
}

export interface ArticleCodeBlock {
  language?: string;
  code: string;
  previewLabel?: string;
}

export interface ArticleMetadata {
  byline?: string;
  siteName?: string;
  publishedAt?: string;
  language?: string;
  length?: number;
  excerptLength?: number;
}

export interface ArticleContent {
  title: string;
  sourceUrl: string;
  sourceDomain: string;
  contentType: ExtractedContentType;
  extractionStatus?: ExtractionStatus;
  extractionSource?: ExtractionSource;
  warnings?: ExtractionWarning[];
  author?: string;
  publishedAt?: string;
  excerpt: string;
  cleanHtml?: string | null;
  cleanText: string;
  cleanMarkdown?: string | null;
  contentText: string;
  contentHtml?: string | null;
  contentMarkdown?: string | null;
  images: ArticleImage[];
  headings: ArticleHeading[];
  codeBlocks: ArticleCodeBlock[];
  metadata?: ArticleMetadata;
}

export interface ArticleParseResult {
  success: boolean;
  article?: ArticleContent;
  error?: string;
  pageType?: ExtractedContentType;
  uiState?: ArticleParseUiState;
  notices?: ArticleParseNotice[];
  extractionStatus?: ExtractionStatus;
  extractionSource?: ExtractionSource;
  failureReason?: ExtractionFailureReason;
  warnings?: ExtractionWarning[];
}
