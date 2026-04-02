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
