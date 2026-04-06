import { buildMarkdownExtractionPrompt } from "@/services/aiSummary/promptTemplates";
import {
  getOpenRouterApiKey,
  getOpenRouterModel,
  requestOpenRouterTextCompletion,
} from "@/services/aiSummary/providers/openrouterProvider";
import type { ArticleContent, ArticleImage, ExtractedContentType } from "@/types/article";

const MAX_MARKDOWN_INPUT_CHARS = 24_000;

function shouldUseAIMarkdownCleanup() {
  return import.meta.env.VITE_ENABLE_AI_MARKDOWN_CLEANUP === "true";
}

function stripMarkdownFence(value: string) {
  const fenced = value.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? value.trim();
}

function truncateInput(value: string) {
  return value.length <= MAX_MARKDOWN_INPUT_CHARS
    ? value
    : `${value.slice(0, MAX_MARKDOWN_INPUT_CHARS)}\n\n[truncated source]`;
}

function escapeMarkdownImageText(value?: string) {
  return (value ?? "").replace(/[\[\]]/g, "").trim();
}

function normalizeImageUrl(value: string) {
  return value.trim().replace(/[).*]+$/g, "");
}

function collectMarkdownImageUrls(markdown: string) {
  const urls = new Set<string>();
  const pattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const match of markdown.matchAll(pattern)) {
    if (match[1]) {
      urls.add(normalizeImageUrl(match[1]));
    }
  }

  return urls;
}

function formatImageMarkdown(image: ArticleImage) {
  const alt = escapeMarkdownImageText(image.alt || image.caption || "Image");
  const src = image.src.trim();
  const caption = image.caption?.trim();

  if (!src) {
    return "";
  }

  return [`![${alt}](${src})`, caption ? `_${caption}_` : ""].filter(Boolean).join("\n");
}

function mergeMissingImages(markdown: string, images: ArticleImage[]) {
  if (images.length === 0) {
    return markdown;
  }

  const referencedUrls = collectMarkdownImageUrls(markdown);
  const missingBlocks = images
    .filter((image) => !referencedUrls.has(normalizeImageUrl(image.src)))
    .map(formatImageMarkdown)
    .filter(Boolean);

  if (missingBlocks.length === 0) {
    return markdown;
  }

  const imageSection = ["## Images", ...missingBlocks].join("\n\n");
  return `${markdown.trim()}\n\n${imageSection}`.trim();
}

function buildSourcePayload(article: ArticleContent) {
  return article.cleanHtml || article.contentHtml || article.cleanMarkdown || article.contentMarkdown || article.cleanText;
}

export async function maybeEnhanceArticleMarkdown(
  article: ArticleContent,
  pageType: ExtractedContentType,
): Promise<string | null> {
  if (!shouldUseAIMarkdownCleanup()) {
    return null;
  }

  if (!getOpenRouterApiKey()) {
    console.debug("[Article Parser] AI markdown cleanup skipped because OpenRouter key is missing.");
    return null;
  }

  const sourcePayload = buildSourcePayload(article);
  if (!sourcePayload || sourcePayload.trim().length < 200) {
    return null;
  }

  try {
    const prompt = buildMarkdownExtractionPrompt({
      title: article.title,
      url: article.sourceUrl,
      sourceTypeHint: pageType,
      htmlOrText: truncateInput(sourcePayload),
    });

    const response = await requestOpenRouterTextCompletion({
      model: getOpenRouterModel(),
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Return Markdown only. Preserve meaningful article images with Markdown image syntax. Do not wrap the final answer in code fences unless the entire source is itself a fenced code block example.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const cleanedMarkdown = mergeMissingImages(stripMarkdownFence(response), article.images);
    if (cleanedMarkdown.length < 120) {
      return null;
    }

    console.debug("[Article Parser] AI markdown cleanup completed.", pageType, cleanedMarkdown.length);
    return cleanedMarkdown;
  } catch (error) {
    console.debug("[Article Parser] AI markdown cleanup failed.", error);
    return null;
  }
}
