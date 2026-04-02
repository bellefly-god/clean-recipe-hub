export interface ArticleMetadata {
  byline?: string;
  siteName?: string;
  length?: number;
  excerptLength?: number;
}

export interface ArticleContent {
  title: string;
  sourceUrl: string;
  sourceDomain: string;
  excerpt: string;
  contentText: string;
  contentMarkdown?: string | null;
  metadata?: ArticleMetadata;
}

export interface ArticleParseResult {
  success: boolean;
  article?: ArticleContent;
  error?: string;
}
