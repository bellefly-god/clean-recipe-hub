import type { ArticleContent } from "@/types/article";

export type AISummaryProviderName = "glm5" | "openrouter";
export type DetectedPageType =
  | "recipe"
  | "news"
  | "tutorial"
  | "opinion"
  | "product"
  | "technical_article"
  | "generic";

export interface PageTypeDetection {
  pageType: DetectedPageType;
  confidence: number;
  signals: string[];
}

export interface AISummaryResult {
  shortSummary: string;
  keyPoints: string[];
  actionItems: string[];
  tags: string[];
  categories?: string[];
  notes?: string[];
  codeNotes?: string[];
  language?: string;
  pageType?: DetectedPageType;
  title?: string;
  warnings?: string[];
  rawModelOutput?: string;
}

export interface AISummaryServiceResult {
  success: boolean;
  summary?: AISummaryResult;
  error?: string;
}

export interface AISummaryMessage {
  role: "system" | "user";
  content: string;
}

export interface AISummaryInput {
  article: ArticleContent;
}

export interface AISummaryPreparedInput extends AISummaryInput {
  pageType: DetectedPageType;
}
