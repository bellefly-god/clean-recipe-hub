import { detectPageType } from "@/services/aiSummary/detectPageType";
import { detectOutputLanguage } from "@/services/aiSummary/detectOutputLanguage";
import { requestServerSummary } from "@/services/aiSummary/providers/serverProvider";
import type {
  AISummaryInput,
  AISummaryPreparedInput,
  AISummaryServiceResult,
} from "@/services/aiSummary/types";

const MAX_SERVER_SUMMARY_INPUT_CHARS = 15000;

export async function summarizeArticle(input: AISummaryInput, contentOverride?: string): Promise<AISummaryServiceResult> {
  const detection = detectPageType(input.article);
  const outputLanguage = detectOutputLanguage(input.article);
  const preparedInput: AISummaryPreparedInput = {
    ...input,
    pageType: detection.pageType,
  };

  console.debug(
    "[AI Summary] Requesting summary via server API, pageType:",
    detection.pageType,
    detection.signals,
  );

  // Use override content for "Analyze Selection" feature, otherwise fall back to article fields
  const rawContent = contentOverride || preparedInput.article.contentText || preparedInput.article.cleanText || preparedInput.article.excerpt || '';
  const content = rawContent.slice(0, MAX_SERVER_SUMMARY_INPUT_CHARS);

  // Call server API for AI summary (API key is stored securely on server)
  const result = await requestServerSummary({
    content,
    pageType: detection.pageType,
    title: preparedInput.article.title || 'Untitled',
    url: preparedInput.article.sourceUrl,
    preferredOutputLanguage: outputLanguage.language,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error || "AI analysis failed. Please try again.",
    };
  }

  return {
    success: true,
    summary: result.summary!,
  };
}
