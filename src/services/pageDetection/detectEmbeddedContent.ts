export function detectEmbeddedContent(document: Document, iframeCountFromContext = 0) {
  const iframes = Array.from(document.querySelectorAll("iframe"));
  const significantEmbeds = iframes.filter((iframe) => {
    const width = Number(iframe.getAttribute("width") || "0");
    const height = Number(iframe.getAttribute("height") || "0");
    const src = iframe.getAttribute("src") || "";

    return width >= 300 || height >= 180 || /youtube|player|embed|vimeo|spotify|substack|podcast/i.test(src);
  });

  const paragraphCount = document.querySelectorAll("p").length;
  const matched =
    (significantEmbeds.length >= 2 && paragraphCount <= 4) ||
    (iframeCountFromContext >= 3 && paragraphCount <= 3);

  return {
    matched,
    reasons: matched ? ["heavy-iframe-usage", "light-inline-text"] : [],
  };
}
