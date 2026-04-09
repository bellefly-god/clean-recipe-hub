import { PAGE_TYPE_PROMPT_TEMPLATES, getStructuredSummaryInstructions } from "@/services/aiSummary/promptTemplates";
import { detectOutputLanguage } from "@/services/aiSummary/detectOutputLanguage";
import type { AISummaryMessage, AISummaryPreparedInput } from "@/services/aiSummary/types";

const MAX_INPUT_CHARS = 35_000;

function truncateContent(value: string) {
  return value.length <= MAX_INPUT_CHARS ? value : `${value.slice(0, MAX_INPUT_CHARS)}\n\n[Content truncated - showing first 35,000 characters for analysis]`;
}

export function getPromptByPageType(input: AISummaryPreparedInput) {
  const { article, pageType } = input;
  const outputLanguage = detectOutputLanguage(article);
  const articleContent = truncateContent(article.contentMarkdown || article.contentText);
  const metadataLines = [
    `Detected page type: ${pageType}`,
    `Preferred output language: ${outputLanguage.language}`,
    `Language detection reason: ${outputLanguage.reason}`,
    `Title: ${article.title}`,
    `URL: ${article.sourceUrl}`,
    article.excerpt ? `Excerpt: ${article.excerpt}` : "",
    article.author ? `Author: ${article.author}` : "",
    article.publishedAt ? `Published at: ${article.publishedAt}` : "",
    article.metadata?.siteName ? `Site: ${article.metadata.siteName}` : "",
    article.metadata?.byline ? `Byline: ${article.metadata.byline}` : "",
    article.headings.length > 0 ? `Headings: ${article.headings.map((heading) => heading.text).slice(0, 8).join(" | ")}` : "",
    article.codeBlocks.length > 0 ? `Code blocks: ${article.codeBlocks.length}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    getStructuredSummaryInstructions(),
    "",
    `Page-type guidance: ${PAGE_TYPE_PROMPT_TEMPLATES[pageType]}`,
    "Summarization goals: produce a faithful summary, extract the core ideas, group the content into a few useful categories, provide step-by-step actions only when the text supports procedural guidance, and surface important notes or caveats that a careful reader should keep in mind.",
    "",
    metadataLines,
    "",
    "Content:",
    articleContent,
  ].join("\n");
}

export function buildArticleSummaryMessages(input: AISummaryPreparedInput): AISummaryMessage[] {
  return [
    {
      role: "system",
      content: getStructuredSummaryInstructions(),
    },
    {
      role: "user",
      content: getPromptByPageType(input),
    },
  ];
}
