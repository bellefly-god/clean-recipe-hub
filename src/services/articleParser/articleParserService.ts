import type { PageContext } from "@/shared/types/extension";
import { getDomainFromUrl, isHttpUrl } from "@/shared/utils/url";
import { extractReadableContent } from "@/services/articleParser/extractReadableContent";
import { normalizeArticle } from "@/services/articleParser/normalizeArticle";
import type { ArticleParseResult } from "@/types/article";

interface ParseArticleOptions {
  pageContext?: PageContext | null;
}

function normalizeComparableUrl(value: string) {
  try {
    const normalized = new URL(value);
    normalized.hash = "";
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

function isSamePage(url: string, pageContext?: PageContext | null) {
  if (!pageContext?.url) {
    return false;
  }

  const targetUrl = normalizeComparableUrl(url);
  const pageUrl = normalizeComparableUrl(pageContext.url);
  const canonicalUrl = pageContext.canonicalUrl ? normalizeComparableUrl(pageContext.canonicalUrl) : "";

  return targetUrl === pageUrl || (canonicalUrl !== "" && targetUrl === canonicalUrl);
}

async function fetchRemoteHtml(url: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "omit",
    });

    if (!response.ok) {
      console.debug("[Article Parser] Remote fetch failed.", response.status, response.statusText);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      console.debug("[Article Parser] Remote fetch returned non-HTML content.");
      return null;
    }

    return await response.text();
  } catch (error) {
    console.debug("[Article Parser] Remote fetch threw an error.", error);
    return null;
  }
}

export async function parseArticleFromUrl(
  url: string,
  options?: ParseArticleOptions,
): Promise<ArticleParseResult> {
  if (!isHttpUrl(url)) {
    return {
      success: false,
      error: "Please enter a valid page URL starting with http:// or https://.",
    };
  }

  try {
    const pageContext = options?.pageContext ?? null;
    const sourceDomain = getDomainFromUrl(url);
    const html = isSamePage(url, pageContext)
      ? pageContext?.htmlSnapshot ?? null
      : await fetchRemoteHtml(url);

    if (!html) {
      return {
        success: false,
        error: "We couldn't load enough readable page content to analyze this URL.",
      };
    }

    const extraction = extractReadableContent(html, pageContext?.siteName);

    if (!extraction) {
      return {
        success: false,
        error: "No readable article content was found on this page.",
      };
    }

    const article = normalizeArticle(extraction, {
      url,
      sourceDomain,
      titleHint: pageContext?.title,
      excerptHint: pageContext?.description,
      siteName: pageContext?.siteName,
    });

    if (!article) {
      return {
        success: false,
        error: "This page didn't contain enough readable article content to summarize.",
      };
    }

    return {
      success: true,
      article,
    };
  } catch (error) {
    console.error("[Article Parser] Extraction error.", error);
    return {
      success: false,
      error: "We couldn't analyze this page right now. Try another page.",
    };
  }
}
