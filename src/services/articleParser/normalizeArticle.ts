import type { ReadableContentExtraction } from "@/services/articleParser/extractReadableContent";
import type { ArticleContent } from "@/types/article";

interface ArticleSource {
  url: string;
  sourceDomain: string;
  titleHint?: string;
  excerptHint?: string;
  siteName?: string;
}

function cleanText(value?: string | null) {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeArticle(
  extraction: ReadableContentExtraction,
  source: ArticleSource,
): ArticleContent | null {
  const title = cleanText(extraction.title) || cleanText(source.titleHint);
  const excerpt = cleanText(extraction.excerpt) || cleanText(source.excerptHint);
  const contentText = cleanText(extraction.contentText);
  const contentMarkdown = cleanText(extraction.contentMarkdown) || null;

  if (!title || contentText.length < 200) {
    return null;
  }

  return {
    title,
    sourceUrl: source.url,
    sourceDomain: source.sourceDomain,
    excerpt,
    contentText,
    contentMarkdown,
    metadata: {
      ...extraction.metadata,
      siteName: extraction.metadata?.siteName || source.siteName,
    },
  };
}
