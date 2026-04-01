export function isHttpUrl(value?: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isRestrictedBrowserUrl(value?: string | null) {
  if (!value) {
    return true;
  }

  return /^(chrome|edge|about|view-source|chrome-extension):/i.test(value);
}

export function getDomainFromUrl(value: string) {
  return new URL(value).hostname.replace(/^www\./, "");
}
