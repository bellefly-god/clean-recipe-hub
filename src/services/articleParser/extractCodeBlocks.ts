import type { ArticleCodeBlock, ArticleHeading } from "@/types/article";

function cleanCode(value?: string | null) {
  return (value ?? "").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").replace(/\s+$/, "");
}

function inferCodeLanguage(element: Element) {
  const attributeSource = [
    element.getAttribute("data-language"),
    element.getAttribute("data-lang"),
    element.getAttribute("lang"),
    element.getAttribute("class"),
  ]
    .filter(Boolean)
    .join(" ");

  const match = attributeSource.match(
    /(?:language-|lang-|highlight-source-|brush:\s*|syntax--)([a-z0-9#+._-]+)/i,
  );

  return match?.[1]?.toLowerCase() || undefined;
}

function getNearestHeading(headings: ArticleHeading[], element: Element) {
  const previousHeadings = headings.filter((heading) => {
    const headingId = heading.text.trim();
    return Boolean(headingId);
  });

  let current: Element | null = element;

  while (current) {
    let sibling: Element | null = current.previousElementSibling;
    while (sibling) {
      if (/^H[1-6]$/.test(sibling.tagName)) {
        return sibling.textContent?.trim() || undefined;
      }

      sibling = sibling.previousElementSibling;
    }

    current = current.parentElement;
  }

  return previousHeadings.at(-1)?.text;
}

export function extractCodeBlocks(root: HTMLElement, headings: ArticleHeading[]) {
  const seen = new Set<string>();
  const blocks: ArticleCodeBlock[] = [];

  root.querySelectorAll("pre, pre code, .highlight pre, .codehilite pre").forEach((node) => {
    const element = node instanceof HTMLElement && node.tagName === "PRE" ? node : node.parentElement;

    if (!element) {
      return;
    }

    const codeElement = element.querySelector("code") ?? element;
    const code = cleanCode(codeElement.textContent ?? element.textContent);

    if (!code || seen.has(code)) {
      return;
    }

    seen.add(code);
    blocks.push({
      language: inferCodeLanguage(codeElement) || inferCodeLanguage(element),
      code,
      previewLabel: getNearestHeading(headings, element),
    });
  });

  return blocks;
}
