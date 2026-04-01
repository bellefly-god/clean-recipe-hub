function getMetaContent(selector: string) {
  return document.querySelector<HTMLMetaElement>(selector)?.content?.trim();
}

function collectPageContext() {
  const canonicalUrl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;

  return {
    url: window.location.href,
    title: document.title || getMetaContent('meta[property="og:title"]') || "Untitled page",
    description:
      getMetaContent('meta[name="description"]') ||
      getMetaContent('meta[property="og:description"]') ||
      "",
    canonicalUrl,
    siteName: getMetaContent('meta[property="og:site_name"]') || window.location.hostname,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "GET_PAGE_CONTEXT") {
    return false;
  }

  sendResponse({ pageContext: collectPageContext() });
  return false;
});
