import TurndownService from "turndown";
import { parseHtmlDocument } from "@/services/recipeParser/parseHtmlDocument";

function inferCodeLanguage(element: Element | null) {
  if (!element) {
    return "";
  }

  const source = [
    element.getAttribute("data-language"),
    element.getAttribute("data-lang"),
    element.getAttribute("lang"),
    element.getAttribute("class"),
  ]
    .filter(Boolean)
    .join(" ");

  const match = source.match(/(?:language-|lang-|highlight-source-|syntax--)([a-z0-9#+._-]+)/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function createTurndownService() {
  const service = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    preformattedCode: true,
  });

  service.keep(["table", "thead", "tbody", "tr", "td", "th"]);

  service.addRule("fencedCodeBlocks", {
    filter: ["pre"],
    replacement: (_content, node) => {
      const element = node as HTMLElement;
      const codeElement = element.querySelector("code");
      const code = (codeElement?.textContent ?? element.textContent ?? "").replace(/\r\n/g, "\n").replace(/\s+$/, "");
      const language = inferCodeLanguage(codeElement) || inferCodeLanguage(element);

      if (!code) {
        return "\n\n";
      }

      return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    },
  });

  service.addRule("figureCaption", {
    filter: ["figcaption"],
    replacement: (content) => `\n\n_${content.trim()}_\n\n`,
  });

  return service;
}

export function normalizeMarkdown(cleanHtml: string) {
  const document = parseHtmlDocument(`<article>${cleanHtml}</article>`);
  const root = document.body.firstElementChild as HTMLElement | null;

  if (!root) {
    return "";
  }

  const markdown = createTurndownService().turndown(root.innerHTML);
  return markdown.replace(/\n{3,}/g, "\n\n").trim();
}
