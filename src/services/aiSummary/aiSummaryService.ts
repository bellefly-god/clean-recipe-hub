import { buildArticleSummaryMessages } from "@/services/aiSummary/promptTemplates";
import { getOpenRouterModel, requestOpenRouterCompletion } from "@/services/aiSummary/providers/openrouterProvider";
import type { AISummaryInput, AISummaryResult, AISummaryServiceResult } from "@/services/aiSummary/types";

function cleanText(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => cleanText(typeof item === "string" ? item : ""))
    .filter(Boolean);
}

function extractJsonString(value: string) {
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = value.match(/\{[\s\S]*\}/);
  return objectMatch?.[0] ?? value;
}

function parseSummaryPayload(rawOutput: string): AISummaryResult | null {
  try {
    const parsed = JSON.parse(extractJsonString(rawOutput)) as Record<string, unknown>;
    const shortSummary = cleanText(typeof parsed.shortSummary === "string" ? parsed.shortSummary : "");
    const keyPoints = normalizeArray(parsed.keyPoints);
    const actionItems = normalizeArray(parsed.actionItems);
    const tags = normalizeArray(parsed.tags);

    if (!shortSummary || keyPoints.length === 0) {
      return null;
    }

    return {
      shortSummary,
      keyPoints,
      actionItems,
      tags,
      rawModelOutput: rawOutput,
    };
  } catch (error) {
    console.debug("[AI Summary] Failed to parse model JSON output.", error);
    return null;
  }
}

export async function summarizeArticle(input: AISummaryInput): Promise<AISummaryServiceResult> {
  try {
    console.debug("[AI Summary] Requesting OpenRouter summary with model", getOpenRouterModel());

    const rawOutput = await requestOpenRouterCompletion({
      model: getOpenRouterModel(),
      messages: buildArticleSummaryMessages(input),
    });

    if (!rawOutput) {
      return {
        success: false,
        error: "The AI provider returned an empty response.",
      };
    }

    const summary = parseSummaryPayload(rawOutput);

    if (!summary) {
      return {
        success: false,
        error: "The AI provider returned malformed summary data.",
      };
    }

    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error("[AI Summary] Summary request failed.", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "We couldn't generate an AI summary for this page right now.",
    };
  }
}
