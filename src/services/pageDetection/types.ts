import type { PageContext } from "@/shared/types/extension";
import type { ExtractedContentType } from "@/types/article";

export type DetectedPageClassification = ExtractedContentType;

export interface PageDetectionInput {
  url: string;
  html: string;
  pageContext?: PageContext | null;
}

export interface PageDetectionResult {
  pageType: DetectedPageClassification;
  confidence: number;
  reasons: string[];
}
