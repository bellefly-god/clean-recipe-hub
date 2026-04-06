import type { ArticleImage } from "@/types/article";

const IMAGE_SOURCE_ATTRIBUTES = ["src", "data-src", "data-original", "data-lazy-src", "data-url"];

function resolveUrl(value: string, sourceUrl: string) {
  try {
    return new URL(value, sourceUrl).toString();
  } catch {
    return value;
  }
}

function getImageSource(image: HTMLImageElement, sourceUrl: string) {
  const candidate = IMAGE_SOURCE_ATTRIBUTES.map((attribute) => image.getAttribute(attribute)?.trim() ?? "").find(Boolean);

  return candidate ? resolveUrl(candidate, sourceUrl) : "";
}

export function extractImages(root: HTMLElement, sourceUrl: string) {
  const seen = new Set<string>();
  const images: ArticleImage[] = [];

  root.querySelectorAll("img").forEach((image) => {
    const src = getImageSource(image, sourceUrl);

    if (!src || seen.has(src)) {
      return;
    }

    seen.add(src);

    const figure = image.closest("figure");
    const caption = figure?.querySelector("figcaption")?.textContent?.replace(/\s+/g, " ").trim() || undefined;
    const alt = image.getAttribute("alt")?.trim() || undefined;

    images.push({
      src,
      alt,
      caption,
    });

    image.setAttribute("src", src);
    image.setAttribute("loading", "lazy");
    image.removeAttribute("srcset");
  });

  return images;
}
