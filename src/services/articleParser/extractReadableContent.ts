import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { parseHtmlDocument } from "@/services/recipeParser/parseHtmlDocument";
import type { ArticleMetadata } from "@/types/article";

export interface ReadableContentExtraction {
  title?: string;
  excerpt?: string;
  contentText?: string;
  contentMarkdown?: string | null;
  metadata?: ArticleMetadata;
}

const turndownService = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

function cleanText(value?: string | null) {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractReadableContent(html: string, siteName?: string) {
  const document = parseHtmlDocument(html);
  const article = new Readability(document).parse();

  if (!article?.content || !article.textContent) {
    console.debug("[Article Parser] Readability did not find main content.");
    return null;
  }

  const contentText = cleanText(article.textContent);

  if (contentText.length < 200) {
    console.debug("[Article Parser] Readability content too short for article analysis.");
    return null;
  }

  const contentMarkdown = turndownService.turndown(article.content);

  console.debug("[Article Parser] Readable content extracted.");

  return {
    title: cleanText(article.title),
    excerpt: cleanText(article.excerpt),
    contentText,
    contentMarkdown: cleanText(contentMarkdown),
    metadata: {
      byline: cleanText(article.byline) || undefined,
      siteName: cleanText(article.siteName) || siteName,
      length: article.length ?? contentText.length,
      excerptLength: article.excerpt?.length ?? 0,
    },
  } satisfies ReadableContentExtraction;
}
