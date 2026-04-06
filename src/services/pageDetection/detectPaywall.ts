const PAYWALL_SELECTORS = [
  "[class*='paywall']",
  "[class*='subscriber']",
  "[class*='membership']",
  "[class*='premium']",
  "[data-testid*='paywall']",
  ".meteredContent",
  ".subscribe",
];

const PAYWALL_PATTERNS = [
  /\bsubscribe to continue\b/i,
  /\bsign in to continue\b/i,
  /\bstart your free trial\b/i,
  /\bmember-only\b/i,
  /\balready a subscriber\b/i,
  /\bcontinue reading\b/i,
  /\bremaining articles\b/i,
];

export function detectPaywall(document: Document) {
  const text = document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const selectorHit = document.querySelector(PAYWALL_SELECTORS.join(", "));
  const patternHits = PAYWALL_PATTERNS.filter((pattern) => pattern.test(text));
  const looksTruncated = /\.\.\.$/.test(text.slice(-20)) || /\bread more\b/i.test(text);
  const matched = Boolean(selectorHit) || patternHits.length >= 1 || (looksTruncated && text.length < 1800);

  return {
    matched,
    reasons: matched ? ["paywall-language", looksTruncated ? "truncated-copy" : ""].filter(Boolean) : [],
  };
}
