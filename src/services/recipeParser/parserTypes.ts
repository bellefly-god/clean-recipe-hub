export interface RecipeCandidate {
  title?: string;
  summary?: string;
  ingredients?: string[];
  steps?: string[];
  notes?: string | null;
  rawContent?: string | null;
  sourceUrl?: string;
}

export interface ParserSource {
  url: string;
  sourceDomain: string;
  titleHint?: string;
  summaryHint?: string;
  html?: string;
  jsonLdBlocks?: string[];
}
