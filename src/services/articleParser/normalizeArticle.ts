import type { ReadableContentExtraction } from "@/services/articleParser/extractReadableContent";
import type { ArticleContent } from "@/types/article";

interface ArticleSource {
  url: string;
  sourceDomain: string;
  titleHint?: string;
  excerptHint?: string;
  documentLanguage?: string;
  siteName?: string;
  publishedAt?: string;
}

function cleanText(value?: string | null) {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanRichText(value?: string | null) {
  return (value ?? "").replace(/\u00a0/g, " ").trim();
}

function dedupeTitleParts(value: string) {
  const segments = value
    .split(/\s+---\s+|\s+[|｜]\s+/)
    .map((segment) => cleanText(segment))
    .filter(Boolean);

  if (segments.length <= 1) {
    return value;
  }

  const [firstSegment] = segments;
  return firstSegment || value;
}

function stripRedditSuffix(value: string) {
  return value
    .replace(/\s*[:：]\s*r\/[a-z0-9_]+$/i, "")
    .replace(/\s*[-–—]\s*reddit$/i, "")
    .trim();
}

export function normalizeArticleTitle(value: string, sourceDomain: string) {
  let normalized = cleanText(value);

  if (!normalized) {
    return "";
  }

  if (sourceDomain.includes("reddit.com")) {
    normalized = dedupeTitleParts(normalized);
    normalized = stripRedditSuffix(normalized);
  }

  return normalized;
}

export function normalizeArticle(
  extraction: ReadableContentExtraction,
  source: ArticleSource,
): ArticleContent | null {
  const title =
    normalizeArticleTitle(cleanText(extraction.title), source.sourceDomain) ||
    normalizeArticleTitle(cleanText(source.titleHint), source.sourceDomain);
  const excerpt = cleanText(extraction.excerpt) || cleanText(source.excerptHint);
  const cleanTextValue = cleanRichText(extraction.cleanText || extraction.contentText);
  const cleanHtml = cleanRichText(extraction.cleanHtml || extraction.contentHtml) || null;
  const cleanMarkdown = cleanRichText(extraction.cleanMarkdown || extraction.contentMarkdown) || null;

  if (!title || cleanTextValue.length < 200 || extraction.contentType === "unsupported") {
    return null;
  }

  return {
    title,
    sourceUrl: source.url,
    sourceDomain: source.sourceDomain,
    contentType: extraction.contentType || "article",
    author: extraction.metadata?.byline || undefined,
    publishedAt: extraction.metadata?.publishedAt || source.publishedAt,
    excerpt,
    cleanText: cleanTextValue,
    cleanHtml,
    cleanMarkdown,
    contentText: cleanTextValue,
    contentHtml: cleanHtml,
    contentMarkdown: cleanMarkdown,
    images: extraction.images ?? [],
    headings: extraction.headings ?? [],
    codeBlocks: extraction.codeBlocks ?? [],
    metadata: {
      ...extraction.metadata,
      language: extraction.metadata?.language || source.documentLanguage,
      siteName: extraction.metadata?.siteName || source.siteName,
      publishedAt: extraction.metadata?.publishedAt || source.publishedAt,
    },
  };
}
