import type { ArticleContent } from "@/types/article";

export interface OutputLanguageDetection {
  language: string;
  reason: string;
}

function countMatches(value: string, pattern: RegExp) {
  const matches = value.match(pattern);
  return matches?.length ?? 0;
}

export function detectOutputLanguage(article: ArticleContent): OutputLanguageDetection {
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
