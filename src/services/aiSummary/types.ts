import type { ArticleContent } from "@/types/article";

export type AISummaryProviderName = "glm5" | "openrouter";

export interface AISummaryResult {
  shortSummary: string;
  keyPoints: string[];
  actionItems: string[];
  tags: string[];
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
