import type { ArticleParseNoticeCode, ArticleParseResult } from "@/types/article";

const ARTICLE_PARSE_MESSAGES: Record<ArticleParseNoticeCode, string> = {
  recipe_page:
    "Recipe page detected. The dedicated recipe card was removed, so this page is shown in the clean article reader and AI analysis flow.",
  feed_page: "This looks like a homepage or article list. Open a full article page for better extraction.",
  paywalled_or_partial_page: "Only the visible content could be extracted from this page.",
  embedded_content_page: "Some embedded content may not be included.",
  shadow_dom_page: "Some content may be incomplete because this page renders inside shadow DOM.",
  unsupported: "We couldn't extract a clean article from this page yet.",
};

export function getArticleParseMessage(code: ArticleParseNoticeCode) {
  return ARTICLE_PARSE_MESSAGES[code];
}

export function getPrimaryArticleParseMessage(result: ArticleParseResult) {
  const firstNotice = result.notices?.[0];

  if (firstNotice) {
    return getArticleParseMessage(firstNotice.code);
  }

  return result.error ?? ARTICLE_PARSE_MESSAGES.unsupported;
}
