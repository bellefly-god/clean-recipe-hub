import { detectPageType } from "@/services/aiSummary/detectPageType";
import { detectOutputLanguage } from "@/services/aiSummary/detectOutputLanguage";
import { buildArticleSummaryMessages } from "@/services/aiSummary/getPromptByPageType";
import { getGlm5ApiKey, getGlm5Model, requestGlm5Summary } from "@/services/aiSummary/providers/glm5Provider";
import { getOpenRouterModel, requestOpenRouterCompletion } from "@/services/aiSummary/providers/openrouterProvider";
import type {
  AISummaryInput,
  AISummaryPreparedInput,
  AISummaryProviderName,
  AISummaryResult,
  AISummaryServiceResult,
  DetectedPageType,
} from "@/services/aiSummary/types";

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

function normalizeLanguage(value: unknown, fallback: string) {
  const normalized = cleanText(typeof value === "string" ? value : "");
  return normalized || fallback;
}

function extractJsonString(value: string) {
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = value.match(/\{[\s\S]*\}/);
  return objectMatch?.[0] ?? value;
}

function normalizePageType(value: unknown, fallback: DetectedPageType) {
  return value === "recipe" ||
    value === "news" ||
    value === "tutorial" ||
    value === "opinion" ||
    value === "product" ||
    value === "technical_article" ||
    value === "generic"
    ? value
    : fallback;
}

function parseSummaryPayload(rawOutput: string, input: AISummaryPreparedInput): AISummaryResult | null {
  try {
    const parsed = JSON.parse(extractJsonString(rawOutput)) as Record<string, unknown>;
    const detectedLanguage = detectOutputLanguage(input.article);
    const pageType = normalizePageType(parsed.pageType, input.pageType);
    const language = normalizeLanguage(parsed.language, detectedLanguage.language);
    const title = cleanText(typeof parsed.title === "string" ? parsed.title : input.article.title);
    const shortSummary = cleanText(
      typeof parsed.summary === "string"
        ? parsed.summary
        : typeof parsed.shortSummary === "string"
          ? parsed.shortSummary
          : "",
    );
    const keyPoints = normalizeArray(parsed.keyPoints);
    const categories = normalizeArray(parsed.categories);
    const actionItems = normalizeArray(parsed.actionItems);
    const notes = normalizeArray(parsed.notes);
    const warnings = normalizeArray(parsed.warnings);
    const codeNotes = normalizeArray(parsed.codeNotes);
    const tags = Array.from(new Set([...(pageType === "generic" ? [] : [pageType]), ...categories])).slice(0, 8);

    if (!shortSummary || keyPoints.length === 0) {
      return null;
    }

    return {
      shortSummary,
      keyPoints,
      actionItems,
      categories,
      notes,
      tags,
      codeNotes,
      language,
      pageType,
      title,
      warnings,
      rawModelOutput: rawOutput,
    };
  } catch (error) {
    console.debug("[AI Summary] Failed to parse model JSON output.", error);
    return null;
  }
}

function getPreferredAISummaryProvider(): AISummaryProviderName {
  const configuredProvider = import.meta.env.VITE_AI_SUMMARY_PROVIDER;

  if (configuredProvider === "glm5" || configuredProvider === "openrouter") {
    return configuredProvider;
  }

  if (getGlm5ApiKey()) {
    return "glm5";
  }

  return "openrouter";
}

function getProviderDisplayName(provider: AISummaryProviderName) {
  return provider === "glm5" ? "GLM-5" : "OpenRouter";
}

function normalizeProviderError(error: unknown, provider: AISummaryProviderName) {
  const message =
    error instanceof Error ? error.message : "We couldn't generate an AI summary for this page right now.";

  if (provider === "glm5") {
    if (message.includes("API key is missing")) {
      return "GLM-5 API key is missing. Set VITE_GLM5_API_KEY for local testing.";
    }

    if (message.includes(" 400 ")) {
      return "GLM-5 rejected the summary request. Check the configured model and request format.";
    }

    if (message.includes(" 404 ")) {
      return "The configured GLM-5 model is unavailable. Check VITE_GLM5_MODEL.";
    }

    if (message.includes(" 401 ") || message.includes(" 403 ")) {
      return "GLM-5 authentication failed. Check VITE_GLM5_API_KEY.";
    }

    if (message.includes(" 429 ")) {
      return "GLM-5 rate limit reached. Try again shortly.";
    }

    if (message.includes(" 500 ") || message.includes(" 503 ")) {
      return "GLM-5 is temporarily unavailable. Try again shortly.";
    }
  }

  if (provider === "openrouter") {
    if (message.includes("API key is missing")) {
      return "OpenRouter API key is missing. Set VITE_OPENROUTER_API_KEY for local testing.";
    }

    if (message.includes(" 401 ")) {
      return "OpenRouter authentication failed. Check VITE_OPENROUTER_API_KEY.";
    }

    if (message.includes(" 402 ")) {
      return "OpenRouter account has no available credits for this request.";
    }

    if (message.includes(" 404 ")) {
      return "The configured OpenRouter model or provider route is unavailable.";
    }
  }

  return `${getProviderDisplayName(provider)} summary failed. ${message}`;
}

export async function summarizeArticle(input: AISummaryInput): Promise<AISummaryServiceResult> {
  const provider = getPreferredAISummaryProvider();
  const detection = detectPageType(input.article);
  const preparedInput: AISummaryPreparedInput = {
    ...input,
    pageType: detection.pageType,
  };

  try {
    const rawOutput =
      provider === "glm5"
        ? await requestGlm5Summary(preparedInput)
        : await requestOpenRouterCompletion({
            model: getOpenRouterModel(),
            messages: buildArticleSummaryMessages(preparedInput),
          });

    console.debug(
      "[AI Summary] Requesting summary with provider/model/pageType",
      provider,
      provider === "glm5" ? getGlm5Model() : getOpenRouterModel(),
      detection.pageType,
      detection.signals,
    );

    if (!rawOutput) {
      return {
        success: false,
        error: "The AI provider returned an empty response.",
      };
    }

    const summary = parseSummaryPayload(rawOutput, preparedInput);

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
    console.error("[AI Summary] Summary request failed.", provider, error);
    return {
      success: false,
      error: normalizeProviderError(error, provider),
    };
  }
}
