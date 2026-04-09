import type { AISummaryMessage } from "@/services/aiSummary/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterCompletionOptions {
  messages: AISummaryMessage[];
  model?: string;
  temperature?: number;
  responseFormat?: "json_object" | "text";
}

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}

export function getOpenRouterModel() {
  return import.meta.env.VITE_OPENROUTER_MODEL || "openai/gpt-4.1-mini";
}

export function getOpenRouterApiKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY || "";
}

export async function requestOpenRouterCompletion(options: OpenRouterCompletionOptions) {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    throw new Error("OpenRouter API key is missing. Set VITE_OPENROUTER_API_KEY for local testing.");
  }

  // Dev-only note:
  // Using a provider API key directly in a client-side extension is not production-safe.
  // Keep this isolated here so it can be swapped with a backend or Edge Function later.
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Recipe Cleaner",
    },
    body: JSON.stringify({
      model: options.model || getOpenRouterModel(),
      messages: options.messages,
      temperature: options.temperature ?? 0.05,
      ...(options.responseFormat === "text"
        ? {}
        : {
            response_format: {
              type: "json_object",
            },
          }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${response.statusText} ${errorText}`.trim());
  }

  const data = (await response.json()) as OpenRouterResponse;
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function requestOpenRouterTextCompletion(options: Omit<OpenRouterCompletionOptions, "responseFormat">) {
  return requestOpenRouterCompletion({
    ...options,
    responseFormat: "text",
  });
}
