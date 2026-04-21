import type { ArticleContent } from "@/types/article";

export interface OutputLanguageDetection {
  language: string;
  reason: string;
}

function languageFromHtmlLang(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("zh")) {
    return { language: "Chinese", reason: "html-lang" };
  }

  if (normalized.startsWith("en")) {
    return { language: "English", reason: "html-lang" };
  }

  if (normalized.startsWith("ja")) {
    return { language: "Japanese", reason: "html-lang" };
  }

  if (normalized.startsWith("ko")) {
    return { language: "Korean", reason: "html-lang" };
  }

  return null;
}

function countMatches(value: string, pattern: RegExp) {
  const matches = value.match(pattern);
  return matches?.length ?? 0;
}

export function detectOutputLanguage(article: ArticleContent): OutputLanguageDetection {
  const languageFromMetadata = languageFromHtmlLang(article.metadata?.language);

  if (languageFromMetadata) {
    return languageFromMetadata;
  }

  const sample = [article.title, article.excerpt, article.cleanText.slice(0, 3000)]
    .filter(Boolean)
    .join("\n");

  const chineseScore = countMatches(sample, /[\u4e00-\u9fff]/g);
  const japaneseScore = countMatches(sample, /[\u3040-\u30ff]/g);
  const koreanScore = countMatches(sample, /[\uac00-\ud7af]/g);
  const latinScore = countMatches(sample, /[A-Za-z]/g);

  if (chineseScore >= 24 && chineseScore >= latinScore / 3) {
    return { language: "Chinese", reason: "dominant-cjk-characters" };
  }

  if (japaneseScore >= 16) {
    return { language: "Japanese", reason: "dominant-japanese-characters" };
  }

  if (koreanScore >= 16) {
    return { language: "Korean", reason: "dominant-korean-characters" };
  }

  return { language: "English", reason: "default-latin-text" };
}
