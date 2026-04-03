import type { AISummaryInput, AISummaryMessage } from "@/services/aiSummary/types";

const MAX_INPUT_CHARS = 18_000;

function truncateContent(value: string) {
  return value.length <= MAX_INPUT_CHARS ? value : `${value.slice(0, MAX_INPUT_CHARS)}\n\n[truncated]`;
}

export function buildArticleSummaryMessages(input: AISummaryInput): AISummaryMessage[] {
  const { article } = input;
  const articleContent = truncateContent(article.contentMarkdown || article.contentText);

  return [
    {
      role: "system",
      content:
        "You summarize webpages strictly from the provided content. Do not invent facts. Return valid JSON with keys shortSummary, keyPoints, actionItems, tags. shortSummary must be a concise paragraph. keyPoints, actionItems, and tags must be arrays of strings. If action items are not applicable, return an empty array.",
    },
    {
      role: "user",
      content: [
        `Title: ${article.title}`,
        `URL: ${article.sourceUrl}`,
        article.excerpt ? `Excerpt: ${article.excerpt}` : "",
        "",
        "Content:",
        articleContent,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
}

export function buildArticleSummaryPrompt(input: AISummaryInput) {
  const messages = buildArticleSummaryMessages(input);
  return messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n");
}

export function getArticleSummaryJsonSchema() {
  return {
    type: "object",
    properties: {
      shortSummary: {
        type: "string",
        description: "A concise summary paragraph of the provided webpage content.",
      },
      keyPoints: {
        type: "array",
        description: "Important takeaways from the provided webpage content.",
        items: {
          type: "string",
        },
      },
      actionItems: {
        type: "array",
        description: "Practical next steps only if the webpage content clearly suggests them.",
        items: {
          type: "string",
        },
      },
      tags: {
        type: "array",
        description: "A short list of topical tags for the webpage.",
        items: {
          type: "string",
        },
      },
    },
    required: ["shortSummary", "keyPoints", "actionItems", "tags"],
  };
}
