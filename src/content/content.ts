const SNAPSHOT_ROOT_SELECTOR =
  '[itemscope][itemtype*="Recipe"], main, article, [role="main"], .recipe, #recipe, body';
const SNAPSHOT_CHAR_LIMIT = 250_000;

function getMetaContent(selector: string) {
  return document.querySelector<HTMLMetaElement>(selector)?.content?.trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getJsonLdBlocks() {
  return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
}

function buildSnapshotHtml() {
  const root = document.querySelector(SNAPSHOT_ROOT_SELECTOR) ?? document.body;
  const clone = root.cloneNode(true) as HTMLElement;

  clone
    .querySelectorAll("script, style, noscript, iframe, svg, canvas, video, audio, form")
    .forEach((node) => node.remove());

  if (clone.outerHTML.length > SNAPSHOT_CHAR_LIMIT) {
    clone.querySelectorAll("img, picture, source").forEach((node) => node.remove());
  }

  const head = [
    `<title>${escapeHtml(document.title || "Untitled page")}</title>`,
    `<meta name="description" content="${escapeHtml(getMetaContent('meta[name=\"description\"]') || "")}">`,
  ].join("");

  const bodyHtml = clone.tagName === "BODY" ? clone.innerHTML : clone.outerHTML;
  const html = `<!doctype html><html><head>${head}</head><body>${bodyHtml}</body></html>`;

  return html.length <= SNAPSHOT_CHAR_LIMIT ? html : html.slice(0, SNAPSHOT_CHAR_LIMIT);
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
    jsonLdBlocks: getJsonLdBlocks(),
    htmlSnapshot: buildSnapshotHtml(),
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "GET_PAGE_CONTEXT") {
    return false;
  }

  sendResponse({ pageContext: collectPageContext() });
  return false;
});
