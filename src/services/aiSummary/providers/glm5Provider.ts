import { getPromptByPageType } from "@/services/aiSummary/getPromptByPageType";
import type { AISummaryPreparedInput } from "@/services/aiSummary/types";

const GLM5_API_URL = "https://api.codexcc.top/v1/messages";

interface Glm5MessageResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
}

export function getGlm5Model() {
  return import.meta.env.VITE_GLM5_MODEL || "glm-5";
}

export function getGlm5ApiKey() {
  return import.meta.env.VITE_GLM5_API_KEY || "";
}

export async function requestGlm5Summary(input: AISummaryPreparedInput) {
  const apiKey = getGlm5ApiKey();

  if (!apiKey) {
    throw new Error("GLM-5 API key is missing. Set VITE_GLM5_API_KEY for local testing.");
  }

  // Dev-only note:
  // Using a GLM-5 API key directly in a client-side extension is not production-safe.
  // Keep this isolated here so it can later move behind a backend or Edge Function.
  const response = await fetch(GLM5_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: getGlm5Model(),
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: getPromptByPageType(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GLM-5 request failed: ${response.status} ${errorText}`.trim());
  }

  const data = (await response.json()) as Glm5MessageResponse;
  const text =
    data.content
      ?.filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    throw new Error("GLM-5 returned no content.");
  }

  return text;
}
