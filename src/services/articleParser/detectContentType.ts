import type { ArticleCodeBlock, ArticleHeading, ExtractedContentType } from "@/types/article";

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase();
}

function countMatches(value: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0);
}

interface DetectContentTypeInput {
  url: string;
  title?: string;
  excerpt?: string;
  text: string;
  headings: ArticleHeading[];
  codeBlocks: ArticleCodeBlock[];
  root: HTMLElement;
  pageTypeHint?: ExtractedContentType;
}

export function detectContentType(input: DetectContentTypeInput): ExtractedContentType {
  if (input.pageTypeHint === "docs_page") {
    return "docs_page";
  }

  if (input.pageTypeHint === "technical_article") {
    return "technical_article";
  }

  if (input.pageTypeHint === "recipe") {
    return "recipe";
  }

  const url = normalizeText(input.url);
  const title = normalizeText(input.title);
  const excerpt = normalizeText(input.excerpt);
  const text = normalizeText(input.text.slice(0, 6000));
  const headingText = normalizeText(input.headings.map((heading) => heading.text).join("\n"));
  const combined = [url, title, excerpt, text, headingText].join("\n");

  const recipeScore =
    countMatches(combined, [
      /\bingredients?\b/,
      /\binstructions?\b/,
      /\bdirections?\b/,
      /\bprep time\b/,
      /\bcook time\b/,
      /\bservings?\b/,
    ]) + (/\brecipe|recipes|cooking\b/.test(url) ? 2 : 0);

  const technicalScore =
    input.codeBlocks.length * 2 +
    input.root.querySelectorAll("pre, code").length +
    countMatches(combined, [
      /\bapi\b/,
      /\bsdk\b/,
      /\bcli\b/,
      /\bterminal\b/,
      /\bcode\b/,
      /\bfunction\b/,
      /\bclass\b/,
      /\binstall\b/,
      /\bconfiguration\b/,
      /\bhow to\b/,
      /\btutorial\b/,
      /\bguide\b/,
      /\bexample\b/,
      /\bjavascript\b|\btypescript\b|\bpython\b|\bjava\b|\brust\b|\bsql\b|\bhtml\b|\bcss\b/,
    ]);

  if (recipeScore >= 4) {
    return "recipe";
  }

  if (technicalScore >= 6) {
    return "technical_article";
  }

  if (input.text.trim().length < 200) {
    return "unsupported";
  }

  return "article";
}
