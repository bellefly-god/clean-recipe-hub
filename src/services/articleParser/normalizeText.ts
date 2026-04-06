import { parseHtmlDocument } from "@/services/recipeParser/parseHtmlDocument";

const BLOCK_ELEMENTS = new Set([
  "ARTICLE",
  "SECTION",
  "DIV",
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "FIGURE",
  "FIGCAPTION",
]);

function visit(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  if (node.tagName === "PRE") {
    const code = node.textContent?.replace(/\r\n/g, "\n").replace(/\s+$/, "") ?? "";
    return code ? `\n\n${code}\n\n` : "";
  }

  if (node.tagName === "IMG") {
    const alt = node.getAttribute("alt")?.trim();
    return alt ? `\n[Image: ${alt}]\n` : "\n";
  }

  const content = Array.from(node.childNodes)
    .map((child) => visit(child))
    .join("");

  if (node.tagName === "LI") {
    return `\n- ${content.trim()}`;
  }

  if (BLOCK_ELEMENTS.has(node.tagName)) {
    return `\n${content}\n`;
  }

  return content;
}

export function normalizeText(cleanHtml: string) {
  const document = parseHtmlDocument(`<article>${cleanHtml}</article>`);
  const root = document.body.firstElementChild as HTMLElement | null;

  if (!root) {
    return "";
  }

  return visit(root)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
