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

// Length limits for content truncation
const MAX_SUMMARY_LENGTH = 450;
const MAX_KEYPOINT_LENGTH = 150;
const MAX_NOTE_LENGTH = 100;
const MAX_FIELD_LENGTH = 200;

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength - 3) + "...";
}

function parsePageSpecificFields(parsed: Record<string, unknown>, pageType: DetectedPageType): Partial<AISummaryResult> {
  const result: Partial<AISummaryResult> = {};

  if (pageType === "recipe") {
    if (parsed.ingredients) result.ingredients = normalizeArray(parsed.ingredients);
    if (parsed.prepTime) result.prepTime = cleanText(String(parsed.prepTime));
    if (parsed.cookTime) result.cookTime = cleanText(String(parsed.cookTime));
    if (typeof parsed.servings === "number") result.servings = parsed.servings;
    if (parsed.difficulty) result.difficulty = cleanText(String(parsed.difficulty));
    if (parsed.steps) result.steps = normalizeArray(parsed.steps);
  }

  if (pageType === "news") {
    if (parsed.who) result.who = truncate(cleanText(String(parsed.who)), MAX_FIELD_LENGTH);
    if (parsed.what) result.what = truncate(cleanText(String(parsed.what)), MAX_FIELD_LENGTH);
    if (parsed.when) result.when = truncate(cleanText(String(parsed.when)), MAX_FIELD_LENGTH);
    if (parsed.where) result.where = truncate(cleanText(String(parsed.where)), MAX_FIELD_LENGTH);
    if (parsed.why) result.why = truncate(cleanText(String(parsed.why)), MAX_FIELD_LENGTH);
    if (parsed.attribution) result.attribution = truncate(cleanText(String(parsed.attribution)), MAX_FIELD_LENGTH);
  }

  if (pageType === "tutorial") {
    if (parsed.problem) result.problem = truncate(cleanText(String(parsed.problem)), MAX_FIELD_LENGTH);
    if (parsed.prerequisites) result.prerequisites = normalizeArray(parsed.prerequisites);
    if (parsed.steps) result.steps = normalizeArray(parsed.steps);
    if (parsed.difficulty) result.difficulty = cleanText(String(parsed.difficulty));
    if (parsed.estimatedTime) result.estimatedTime = truncate(cleanText(String(parsed.estimatedTime)), 50);
  }

  if (pageType === "opinion") {
    if (parsed.thesis) result.thesis = truncate(cleanText(String(parsed.thesis)), MAX_FIELD_LENGTH);
    if (parsed.arguments) result.arguments = normalizeArray(parsed.arguments);
    if (parsed.counterpoints) result.counterpoints = normalizeArray(parsed.counterpoints);
    if (parsed.conclusion) result.conclusion = truncate(cleanText(String(parsed.conclusion)), MAX_FIELD_LENGTH);
    if (parsed.bias) result.bias = truncate(cleanText(String(parsed.bias)), 100);
  }

  if (pageType === "product") {
    if (parsed.productName) result.productName = truncate(cleanText(String(parsed.productName)), 100);
    if (parsed.keyFeatures) result.keyFeatures = normalizeArray(parsed.keyFeatures);
    if (parsed.pros) result.pros = normalizeArray(parsed.pros);
    if (parsed.cons) result.cons = normalizeArray(parsed.cons);
    if (parsed.pricing) result.pricing = truncate(cleanText(String(parsed.pricing)), 100);
    if (parsed.verdict) result.verdict = truncate(cleanText(String(parsed.verdict)), MAX_FIELD_LENGTH);
  }

  if (pageType === "technical_article") {
    if (parsed.topic) result.topic = truncate(cleanText(String(parsed.topic)), MAX_FIELD_LENGTH);
    if (parsed.technologies) result.technologies = normalizeArray(parsed.technologies);
    if (parsed.concepts) result.concepts = normalizeArray(parsed.concepts);
    if (parsed.takeaways) result.takeaways = normalizeArray(parsed.takeaways);
  }

  return result;
}

function parseSummaryPayload(rawOutput: string, input: AISummaryPreparedInput): AISummaryResult | null {
  try {
    const parsed = JSON.parse(extractJsonString(rawOutput)) as Record<string, unknown>;
    const detectedLanguage = detectOutputLanguage(input.article);
    const pageType = normalizePageType(parsed.pageType, input.pageType);
    const language = normalizeLanguage(parsed.language, detectedLanguage.language);
    const title = truncate(cleanText(typeof parsed.title === "string" ? parsed.title : input.article.title), 80);
    const shortSummaryRaw = cleanText(
      typeof parsed.summary === "string"
        ? parsed.summary
        : typeof parsed.shortSummary === "string"
          ? parsed.shortSummary
          : "",
    );
    const keyPointsRaw = normalizeArray(parsed.keyPoints);
    const categories = normalizeArray(parsed.categories).slice(0, 4);
    const actionItems = normalizeArray(parsed.actionItems);
    const notes = normalizeArray(parsed.notes);
    const warnings = normalizeArray(parsed.warnings);
    const codeNotes = normalizeArray(parsed.codeNotes);
    const tags = Array.from(new Set([...(pageType === "generic" ? [] : [pageType]), ...categories])).slice(0, 8);

    // Generate summary from keyPoints if summary is empty
    const shortSummary = shortSummaryRaw || (keyPointsRaw.length > 0 ? keyPointsRaw.slice(0, 2).join(". ") + "." : "");

    // If both summary and keyPoints are empty, parsing failed
    if (!shortSummary && keyPointsRaw.length === 0) {
      console.debug("[AI Summary] Both summary and keyPoints are empty. Raw output preview:", rawOutput.slice(0, 500));
      return null;
    }

    // Truncate content to prevent display issues
    const truncatedSummary = truncate(shortSummary, MAX_SUMMARY_LENGTH);
    const truncatedKeyPoints = keyPointsRaw.map((p) => truncate(p, MAX_KEYPOINT_LENGTH));
    const truncatedNotes = notes.map((n) => truncate(n, MAX_NOTE_LENGTH));
    const truncatedWarnings = warnings.map((w) => truncate(w, MAX_NOTE_LENGTH));

    // Parse page-specific fields
    const pageSpecific = parsePageSpecificFields(parsed, pageType);

    return {
      shortSummary: truncatedSummary,
      keyPoints: truncatedKeyPoints,
      actionItems,
      categories,
      notes: truncatedNotes,
      tags,
      codeNotes,
      language,
      pageType,
      title,
      warnings: truncatedWarnings,
      rawModelOutput: rawOutput,
      ...pageSpecific,
    };
  } catch (error) {
    console.debug("[AI Summary] JSON parse failed. Raw output preview:", rawOutput.slice(0, 800));
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
