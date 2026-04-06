const SNAPSHOT_ROOT_SELECTOR =
  '[itemscope][itemtype*="Recipe"], main, article, [role="main"], .recipe, #recipe, body';
const SNAPSHOT_CHAR_LIMIT = 250_000;
const PRESERVED_ATTRIBUTES = new Set([
  "href",
  "src",
  "srcset",
  "alt",
  "title",
  "datetime",
  "lang",
  "data-language",
  "data-lang",
  "itemprop",
  "itemtype",
  "itemscope",
]);

function getMetaContent(selector: string) {
  return document.querySelector<HTMLMetaElement>(selector)?.content?.trim();
}

function getPublishedAt() {
  return (
    getMetaContent('meta[property="article:published_time"]') ||
    getMetaContent('meta[property="og:published_time"]') ||
    getMetaContent('meta[name="parsely-pub-date"]') ||
    getMetaContent('meta[name="publication_date"]') ||
    document.querySelector<HTMLTimeElement>("time[datetime]")?.dateTime?.trim() ||
    ""
  );
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

function getShadowDomStats() {
  let openShadowRootCount = 0;
  let shadowTextLength = 0;

  document.querySelectorAll("*").forEach((element) => {
    if (!(element instanceof HTMLElement) || !element.shadowRoot) {
      return;
    }

    openShadowRootCount += 1;
    shadowTextLength += element.shadowRoot.textContent?.replace(/\s+/g, " ").trim().length ?? 0;
  });

  return {
    openShadowRootCount,
    shadowTextLength,
  };
}

function getPreferredImageSource(image: HTMLImageElement) {
  const candidate = [
    image.getAttribute("src"),
    image.getAttribute("data-src"),
    image.getAttribute("data-original"),
    image.getAttribute("data-lazy-src"),
    image.getAttribute("data-url"),
  ]
    .map((value) => value?.trim() ?? "")
    .find(Boolean);

  return candidate ?? "";
}

function getPreferredSourceSet(source: Element) {
  const candidate = [
    source.getAttribute("srcset"),
    source.getAttribute("data-srcset"),
    source.getAttribute("data-original-srcset"),
  ]
    .map((value) => value?.trim() ?? "")
    .find(Boolean);

  return candidate ?? "";
}

function compactSnapshotDom(root: HTMLElement) {
  root.querySelectorAll("*").forEach((element) => {
    if (element instanceof HTMLImageElement) {
      const src = getPreferredImageSource(element);
      if (src) {
        element.setAttribute("src", src);
      }

      const alt = element.getAttribute("alt")?.trim();
      Array.from(element.attributes).forEach((attribute) => {
        if (!PRESERVED_ATTRIBUTES.has(attribute.name)) {
          element.removeAttribute(attribute.name);
        }
      });

      if (alt) {
        element.setAttribute("alt", alt);
      }

      element.removeAttribute("srcset");
      element.removeAttribute("sizes");
      return;
    }

    if (element.tagName === "SOURCE") {
      const srcset = getPreferredSourceSet(element);
      Array.from(element.attributes).forEach((attribute) => {
        if (!PRESERVED_ATTRIBUTES.has(attribute.name)) {
          element.removeAttribute(attribute.name);
        }
      });

      if (srcset) {
        element.setAttribute("srcset", srcset);
      }

      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const isCodeClass =
        attribute.name === "class" &&
        /language-|lang-|highlight-source-|syntax--/i.test(attribute.value);

      if (attribute.name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (attribute.name === "class" && isCodeClass) {
        return;
      }

      if (!PRESERVED_ATTRIBUTES.has(attribute.name)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
}

function buildSnapshotHtml() {
  const root = document.querySelector(SNAPSHOT_ROOT_SELECTOR) ?? document.body;
  const clone = root.cloneNode(true) as HTMLElement;

  clone
    .querySelectorAll("script, style, noscript, iframe, svg, canvas, video, audio, form")
    .forEach((node) => node.remove());

  compactSnapshotDom(clone);

  if (clone.outerHTML.length > SNAPSHOT_CHAR_LIMIT) {
    clone.querySelectorAll("picture source").forEach((node) => node.remove());
  }

  if (clone.outerHTML.length > SNAPSHOT_CHAR_LIMIT) {
    clone.querySelectorAll("*").forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }

      Array.from(node.attributes).forEach((attribute) => {
        const isCodeClass =
          attribute.name === "class" &&
          /language-|lang-|highlight-source-|syntax--/i.test(attribute.value);

        if (!PRESERVED_ATTRIBUTES.has(attribute.name) && !isCodeClass) {
          node.removeAttribute(attribute.name);
        }
      });
    });
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
  const shadowStats = getShadowDomStats();

  return {
    url: window.location.href,
    title: document.title || getMetaContent('meta[property="og:title"]') || "Untitled page",
    description:
      getMetaContent('meta[name="description"]') ||
      getMetaContent('meta[property="og:description"]') ||
      "",
    canonicalUrl,
    siteName: getMetaContent('meta[property="og:site_name"]') || window.location.hostname,
    publishedAt: getPublishedAt(),
    iframeCount: document.querySelectorAll("iframe").length,
    openShadowRootCount: shadowStats.openShadowRootCount,
    shadowTextLength: shadowStats.shadowTextLength,
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
