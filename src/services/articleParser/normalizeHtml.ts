import type { ExtractedContentType } from "@/types/article";

const NOISE_SELECTORS = [
  "aside",
  "nav",
  "footer",
  "[role='complementary']",
  ".sidebar",
  ".related",
  ".recommend",
  ".recommendation",
  ".comments",
  ".comment",
  ".social-share",
  ".share",
  ".newsletter",
  ".popup",
  ".popover",
  ".advertisement",
  ".ad",
  "[data-testid*='comment']",
  "[data-testid*='share']",
  "[aria-label*='breadcrumb' i]",
  "[aria-label*='language' i]",
  ".breadcrumbs",
  ".breadcrumb",
  ".devsite-breadcrumb",
  ".devsite-breadcrumb-list",
  ".devsite-page-nav",
  ".devsite-book-nav",
  ".devsite-tabs-wrapper",
  ".devsite-selector",
  ".local-nav",
  ".table-of-contents",
  ".toc",
];

export function extractHeadings(root: HTMLElement) {
  return Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .map((heading) => ({
      level: Number(heading.tagName.replace("H", "")),
      text: heading.textContent?.replace(/\s+/g, " ").trim() ?? "",
    }))
    .filter((heading) => heading.text);
}

function removeNoise(root: HTMLElement) {
  root.querySelectorAll(NOISE_SELECTORS.join(", ")).forEach((node) => node.remove());
}

function normalizeLinks(root: HTMLElement, sourceUrl: string) {
  root.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href")?.trim() ?? "";

    if (!href) {
      return;
    }

    try {
      link.setAttribute("href", new URL(href, sourceUrl).toString());
    } catch {
      link.setAttribute("href", href);
    }

    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noreferrer noopener");
  });
}

function sanitizeAttributes(root: HTMLElement) {
  root.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name.startsWith("on")) {
        element.removeAttribute(attribute.name);
      }

      if (attribute.name === "style") {
        element.removeAttribute(attribute.name);
      }
    });
  });
}

function getLinkDensity(element: Element) {
  const textLength = element.textContent?.replace(/\s+/g, " ").trim().length ?? 0;
  const linkTextLength = Array.from(element.querySelectorAll("a"))
    .map((link) => link.textContent?.replace(/\s+/g, " ").trim().length ?? 0)
    .reduce((total, length) => total + length, 0);

  return textLength === 0 ? 0 : linkTextLength / textLength;
}

function hasSubstantialContent(element: Element) {
  const heading = element.matches("h1, h2, h3") ? element : element.querySelector("h1, h2, h3");
  const paragraphLength = Array.from(element.querySelectorAll("p"))
    .map((paragraph) => paragraph.textContent?.replace(/\s+/g, " ").trim().length ?? 0)
    .reduce((max, length) => Math.max(max, length), 0);
  const codeBlocks = element.querySelectorAll("pre, code").length;
  const figures = element.querySelectorAll("figure, img").length;

  return Boolean(heading) || paragraphLength >= 140 || codeBlocks >= 1 || figures >= 1;
}

function isLikelyUtilityBlock(element: Element) {
  const textLength = element.textContent?.replace(/\s+/g, " ").trim().length ?? 0;
  const linkCount = element.querySelectorAll("a").length;
  const listCount = element.querySelectorAll("ul, ol").length;
  const formControls = element.querySelectorAll("select, option, button").length;
  const linkDensity = getLinkDensity(element);

  return (
    (linkCount >= 3 && linkDensity > 0.45 && textLength < 900) ||
    (listCount >= 1 && linkCount >= 4 && textLength < 700) ||
    (formControls >= 2 && textLength < 600)
  );
}

function pruneLeadingTopMatter(root: HTMLElement) {
  const children = Array.from(root.children);

  for (const child of children) {
    if (hasSubstantialContent(child)) {
      break;
    }

    if (isLikelyUtilityBlock(child) || child.matches("header")) {
      child.remove();
      continue;
    }

    const textLength = child.textContent?.replace(/\s+/g, " ").trim().length ?? 0;
    if (textLength < 120 && child.querySelectorAll("a, button, select").length > 0) {
      child.remove();
    }
  }
}

function pruneDocsChrome(root: HTMLElement) {
  pruneLeadingTopMatter(root);

  root.querySelectorAll("details").forEach((details) => {
    const textLength = details.textContent?.replace(/\s+/g, " ").trim().length ?? 0;
    if (getLinkDensity(details) > 0.55 && textLength < 1200) {
      details.remove();
    }
  });
}

export function normalizeHtml(rawHtml: string, sourceUrl: string, pageTypeHint?: ExtractedContentType) {
  const document = new DOMParser().parseFromString(`<article>${rawHtml}</article>`, "text/html");
  const root = document.body.firstElementChild as HTMLElement | null;

  if (!root) {
    return null;
  }

  removeNoise(root);
  if (pageTypeHint === "docs_page" || pageTypeHint === "technical_article") {
    pruneDocsChrome(root);
  }
  normalizeLinks(root, sourceUrl);
  sanitizeAttributes(root);

  return {
    root,
    headings: extractHeadings(root),
    cleanHtml: root.innerHTML.trim(),
  };
}
