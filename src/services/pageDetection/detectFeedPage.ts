export function detectFeedPage(document: Document) {
  const cards = Array.from(
    document.querySelectorAll("article, [role='article'], main li, .post, .post-card, .feed-item, .story, .card"),
  );
  const anchorCount = document.querySelectorAll("a[href]").length;
  const headingCount = document.querySelectorAll("h1, h2, h3").length;
  const repeatedCardCount = cards.filter((card) => card.querySelector("a[href]") && card.textContent?.trim().length).length;
  const largeParagraphCount = Array.from(document.querySelectorAll("p")).filter(
    (paragraph) => (paragraph.textContent?.trim().length ?? 0) > 180,
  ).length;

  const looksLikeFeed =
    repeatedCardCount >= 5 &&
    headingCount >= 4 &&
    anchorCount >= 20 &&
    largeParagraphCount <= Math.max(2, Math.floor(repeatedCardCount / 3));

  return {
    matched: looksLikeFeed,
    reasons: looksLikeFeed ? ["repeated-cards", "many-links", "list-layout"] : [],
  };
}
