import { Readability } from "@mozilla/readability";
import { parseHtmlDocument } from "@/services/recipeParser/parseHtmlDocument";
import { detectContentType } from "@/services/articleParser/detectContentType";
import { extractCodeBlocks } from "@/services/articleParser/extractCodeBlocks";
import { extractImages } from "@/services/articleParser/extractImages";
import { normalizeHtml } from "@/services/articleParser/normalizeHtml";
import { normalizeMarkdown } from "@/services/articleParser/normalizeMarkdown";
import { normalizeText } from "@/services/articleParser/normalizeText";
import type {
  ArticleCodeBlock,
  ArticleHeading,
  ArticleImage,
  ArticleMetadata,
  ExtractedContentType,
} from "@/types/article";

export interface ReadableContentExtraction {
  title?: string;
  excerpt?: string;
  cleanText?: string;
  cleanHtml?: string | null;
  cleanMarkdown?: string | null;
  contentText?: string;
  contentHtml?: string | null;
  contentMarkdown?: string | null;
  contentType?: ExtractedContentType;
  images?: ArticleImage[];
  headings?: ArticleHeading[];
  codeBlocks?: ArticleCodeBlock[];
  metadata?: ArticleMetadata;
}

function cleanText(value?: string | null) {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPublishedAt(document: Document) {
  const metaSelectors = [
    'meta[property="article:published_time"]',
    'meta[property="og:published_time"]',
    'meta[name="parsely-pub-date"]',
    'meta[name="publication_date"]',
  ];

  const metaValue = metaSelectors
    .map((selector) => document.querySelector<HTMLMetaElement>(selector)?.content?.trim() ?? "")
    .find(Boolean);

  return metaValue || document.querySelector<HTMLTimeElement>("time[datetime]")?.dateTime?.trim() || undefined;
}

export function extractReadableContent(
  html: string,
  siteName?: string,
  sourceUrl = "",
  pageTypeHint?: ExtractedContentType,
) {
  const document = parseHtmlDocument(html);
  const article = new Readability(document).parse();

  if (!article?.content || !article.textContent) {
    console.debug("[Article Parser] Readability did not find main content.");
    return null;
  }

  const normalized = normalizeHtml(article.content, sourceUrl, pageTypeHint);

  if (!normalized?.cleanHtml) {
    console.debug("[Article Parser] Normalized article HTML is empty.");
    return null;
  }

  const images = extractImages(normalized.root, sourceUrl);
  const codeBlocks = extractCodeBlocks(normalized.root, normalized.headings);
  const cleanHtml = normalized.root.innerHTML.trim();
  const cleanMarkdown = normalizeMarkdown(cleanHtml);
  const cleanTextFromHtml = normalizeText(cleanHtml);
  const contentType = detectContentType({
    url: sourceUrl,
    title: article.title,
    excerpt: article.excerpt,
    text: cleanTextFromHtml,
    headings: normalized.headings,
    codeBlocks,
    root: normalized.root,
    pageTypeHint,
  });

  if (cleanTextFromHtml.length < 200) {
    console.debug("[Article Parser] Readability content too short for article analysis.");
    return null;
  }

  console.debug("[Article Parser] Readable content extracted.", contentType, codeBlocks.length, images.length);

  return {
    title: cleanText(article.title),
    excerpt: cleanText(article.excerpt),
    cleanText: cleanTextFromHtml,
    cleanHtml,
    cleanMarkdown,
    contentText: cleanTextFromHtml,
    contentHtml: cleanHtml,
    contentMarkdown: cleanMarkdown,
    contentType,
    images,
    headings: normalized.headings,
    codeBlocks,
    metadata: {
      byline: cleanText(article.byline) || undefined,
      siteName: cleanText(article.siteName) || siteName,
      publishedAt: getPublishedAt(document),
      length: article.length ?? cleanTextFromHtml.length,
      excerptLength: article.excerpt?.length ?? 0,
    },
  } satisfies ReadableContentExtraction;
}
