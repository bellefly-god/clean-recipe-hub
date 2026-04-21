import type { AISummaryResult } from "./types";

const DEFAULT_SERVER_API_BASE = "https://api.pagecleans.com";

function resolveServerApiBase() {
  const configuredBase = import.meta.env.VITE_SERVER_API_BASE?.trim();
  const serverApiBase = configuredBase || DEFAULT_SERVER_API_BASE;
  return serverApiBase.replace(/\/+$/, "");
}

const SERVER_API_BASE = resolveServerApiBase();

export interface ServerSummaryResult {
  success: boolean;
  summary?: AISummaryResult;
  error?: string;
}

type ServerArticleType = "news" | "blog_opinion" | "tutorial" | "recipe" | "other";

interface ServerSummaryPayload {
  article_type?: ServerArticleType;
  one_sentence_summary?: string;
  key_points?: string[];
  content_nature?: {
    category?: string;
    reason?: string;
  };
  target_audience?: string;
  fact_vs_opinion?: {
    facts?: string[];
    opinions?: string[];
    speculations?: string[];
  };
  type_specific_analysis?: Record<string, unknown>;
  confidence?: {
    score?: number;
    reason?: string;
  };
  actionable_takeaways?: string[];
  risk_or_limitations?: string[];
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\bNeed JSON in Chinese\.?/gi, "")
    .replace(/\bChinese article\.?/gi, "")
    .replace(/\bOutput in Chinese\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  if (value && typeof value === "object" && Array.isArray((value as { items?: unknown[] }).items)) {
    return ((value as { items: unknown[] }).items)
      .map((item) => cleanText(typeof item === "string" ? item : (item as { value?: unknown })?.value))
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const normalized = value.trim();
  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    return cleanStringArray(parsed);
  } catch {
    return normalized
      .split(/\n|[;；]/)
      .map((item) => item.replace(/^[-*•\d.\s]+/, "").trim())
      .filter(Boolean);
  }
}

function optionalArray(value: unknown): string[] | undefined {
  const result = cleanStringArray(value);
  return result.length > 0 ? result : undefined;
}

function optionalText(value: unknown): string | undefined {
  const result = cleanText(value);
  return result || undefined;
}

function normalizePageType(articleType?: ServerArticleType): AISummaryResult["pageType"] {
  switch (articleType) {
    case "recipe":
      return "recipe";
    case "news":
      return "news";
    case "tutorial":
      return "tutorial";
    case "blog_opinion":
      return "opinion";
    default:
      return "generic";
  }
}

export async function requestServerSummary(input: {
  content: string;
  pageType: string;
  title: string;
  url?: string;
  preferredOutputLanguage?: string;
}): Promise<ServerSummaryResult> {
  try {
    const response = await fetch(`${SERVER_API_BASE}/api/ai/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: input.content,
        pageType: input.pageType,
        title: input.title,
        url: input.url,
        preferredOutputLanguage: input.preferredOutputLanguage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: errorData.error || `Server error: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.success || !data.summary) {
      return {
        success: false,
        error: data.error || 'Server returned invalid response',
      };
    }

    const serverSummary = data.summary as ServerSummaryPayload;
    const pageType = normalizePageType(serverSummary.article_type);
    const typeSpecific = serverSummary.type_specific_analysis ?? {};

    // Convert server summary to AISummaryResult format
    const summary: AISummaryResult = {
      shortSummary: serverSummary.one_sentence_summary || "",
      keyPoints: cleanStringArray(serverSummary.key_points),
      actionItems: serverSummary.actionable_takeaways || [],
      categories: [
        serverSummary.content_nature?.category,
        serverSummary.target_audience,
        serverSummary.article_type,
      ].filter(Boolean) as string[],
      notes: [
        serverSummary.content_nature?.reason,
        serverSummary.confidence?.reason,
      ].filter(Boolean),
      tags: serverSummary.article_type ? [serverSummary.article_type] : [],
      codeNotes: [],
      language: input.preferredOutputLanguage || "English",
      pageType,
      title: serverSummary.one_sentence_summary
        ? (input.title || "").slice(0, 80)
        : input.title,
      warnings: serverSummary.risk_or_limitations || [],
      rawModelOutput: JSON.stringify(serverSummary),
      facts: cleanStringArray(serverSummary.fact_vs_opinion?.facts),
      opinions: cleanStringArray(serverSummary.fact_vs_opinion?.opinions),
      thesis:
        pageType === "opinion"
          ? optionalText(typeSpecific.main_argument)
          : undefined,
      arguments:
        pageType === "opinion"
          ? optionalArray(typeSpecific.supporting_reasons)
          : undefined,
      conclusion:
        pageType === "opinion"
          ? optionalText(typeSpecific.bias_or_stance)
          : undefined,
      who:
        pageType === "news"
          ? optionalText(cleanStringArray(typeSpecific.key_people_or_orgs).join(" / "))
          : undefined,
      what:
        pageType === "news"
          ? optionalText(typeSpecific.event_overview)
          : undefined,
      why:
        pageType === "news"
          ? optionalText(typeSpecific.impact)
          : undefined,
      problem:
        pageType === "tutorial"
          ? optionalText(typeSpecific.problem_to_solve)
          : undefined,
      prerequisites:
        pageType === "tutorial"
          ? optionalArray(typeSpecific.prerequisites)
          : undefined,
      steps:
        pageType === "tutorial" || pageType === "recipe"
          ? optionalArray(typeSpecific.steps)
          : undefined,
      ingredients:
        pageType === "recipe"
          ? optionalArray(typeSpecific.ingredients)
          : undefined,
    };

    return {
      success: true,
      summary,
    };
  } catch (error) {
    console.error('[Server AI] Request failed:', error);
    const isNetworkError =
      error instanceof TypeError &&
      /failed to fetch|load failed|networkerror/i.test(error.message);

    return {
      success: false,
      error: isNetworkError
        ? `Unable to reach AI server at ${SERVER_API_BASE}. If this is a local build, make sure your local server is running.`
        : error instanceof Error
          ? error.message
          : 'Failed to connect to AI server',
    };
  }
}
