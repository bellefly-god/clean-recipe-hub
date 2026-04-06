import type { ArticleContent } from "@/types/article";
import type { DetectedPageType, PageTypeDetection } from "@/services/aiSummary/types";

const PAGE_TYPES: DetectedPageType[] = [
  "recipe",
  "news",
  "tutorial",
  "opinion",
  "product",
  "technical_article",
  "generic",
];

function normalizeText(value?: string | null) {
  return (value ?? "").toLowerCase();
}

function countMatches(value: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0);
}

export function detectPageType(article: ArticleContent): PageTypeDetection {
  const url = normalizeText(article.sourceUrl);
  const title = normalizeText(article.title);
  const excerpt = normalizeText(article.excerpt);
  const content = normalizeText(article.contentText.slice(0, 5000));
  const combined = [title, excerpt, content].filter(Boolean).join("\n");

  const scores: Record<DetectedPageType, number> = {
    recipe: 0,
    news: 0,
    tutorial: 0,
    opinion: 0,
    product: 0,
    technical_article: 0,
    generic: 0,
  };
  const signals: string[] = [];

  if (article.contentType === "technical_article" || article.contentType === "docs_page") {
    scores.technical_article += 6;
    signals.push(article.contentType === "docs_page" ? "content-type-docs" : "content-type-technical");
  }

  if (/recipe|recipes|cooking|food|kitchen/.test(url)) {
    scores.recipe += 2;
    signals.push("recipe-url");
  }

  if (/news|press|latest|breaking|world|politics|business/.test(url)) {
    scores.news += 2;
    signals.push("news-url");
  }

  if (/how-to|tutorial|guide|docs|learn|getting-started/.test(url)) {
    scores.tutorial += 2;
    signals.push("tutorial-url");
  }

  if (/docs|developer|reference|api|sdk|guide|tutorial|changelog/.test(url)) {
    scores.technical_article += 2;
    signals.push("technical-url");
  }

  if (/opinion|editorial|analysis|essay|column|perspective/.test(url)) {
    scores.opinion += 2;
    signals.push("opinion-url");
  }

  if (/product|pricing|features|compare|review|shop|buy|plans|subscribe/.test(url)) {
    scores.product += 2;
    signals.push("product-url");
  }

  const recipeMatches = countMatches(combined, [
    /\bingredients?\b/,
    /\binstructions?\b/,
    /\bdirections?\b/,
    /\bprep time\b/,
    /\bcook time\b/,
    /\bservings?\b/,
    /\bpreheat\b/,
  ]);
  if (recipeMatches >= 2) {
    scores.recipe += recipeMatches;
    signals.push("recipe-keywords");
  }

  const newsMatches = countMatches(combined, [
    /\bbreaking\b/,
    /\breported?\b/,
    /\bannounced?\b/,
    /\blatest\b/,
    /\baccording to\b/,
    /\bupdate(?:d)?\b/,
    /\bpublished\b/,
  ]);
  if (newsMatches >= 2) {
    scores.news += newsMatches;
    signals.push("news-keywords");
  }

  const tutorialMatches = countMatches(combined, [
    /\bhow to\b/,
    /\bstep(?:-by-step)?\b/,
    /\bguide\b/,
    /\btutorial\b/,
    /\bwalkthrough\b/,
    /\bprerequisites?\b/,
    /\binstall(?:ation)?\b/,
  ]);
  if (tutorialMatches >= 2) {
    scores.tutorial += tutorialMatches;
    signals.push("tutorial-keywords");
  }

  const technicalMatches =
    article.codeBlocks.length * 2 +
    countMatches(combined, [
      /\bapi\b/,
      /\bsdk\b/,
      /\bcli\b/,
      /\bterminal\b/,
      /\bcode\b/,
      /\bcode block\b/,
      /\bfunction\b/,
      /\bclass\b/,
      /\brepository\b/,
      /\bmodule\b/,
      /\btypescript\b|\bjavascript\b|\bpython\b|\bjava\b|\brust\b|\bsql\b|\bhtml\b|\bcss\b/,
      /\binstall(?:ation)?\b/,
      /\bconfiguration\b/,
      /\bexample\b/,
    ]);

  if (technicalMatches >= 3) {
    scores.technical_article += technicalMatches;
    signals.push("technical-keywords");
  }

  const opinionMatches = countMatches(combined, [
    /\bi think\b/,
    /\bi believe\b/,
    /\bin my view\b/,
    /\bshould\b/,
    /\bargues?\b/,
    /\bopinion\b/,
    /\bperspective\b/,
    /\bthesis\b/,
  ]);
  if (opinionMatches >= 2) {
    scores.opinion += opinionMatches;
    signals.push("opinion-keywords");
  }

  const productMatches = countMatches(combined, [
    /\bprice\b/,
    /\bpricing\b/,
    /\bfeatures?\b/,
    /\bspecs?\b/,
    /\bcompare\b/,
    /\bbuy\b/,
    /\btrial\b/,
    /\bsubscription\b/,
    /\bplan(s)?\b/,
  ]);
  if (productMatches >= 2) {
    scores.product += productMatches;
    signals.push("product-keywords");
  }

  if (/\b(step 1|step one|what you'll need|before you start)\b/.test(combined) || /```|`[^`]+`/.test(article.contentMarkdown || "")) {
    scores.tutorial += 2;
    signals.push("tutorial-structure");
  }

  if (article.codeBlocks.length >= 1 || article.cleanHtml?.includes("<pre") || article.cleanHtml?.includes("<code")) {
    scores.technical_article += 3;
    signals.push("technical-structure");
  }

  if (/\bingredients?\b[\s\S]{0,300}\binstructions?\b/.test(combined) || /\bprep time\b|\bcook time\b/.test(combined)) {
    scores.recipe += 2;
    signals.push("recipe-structure");
  }

  if (/\bpros?\b[\s\S]{0,200}\bcons?\b/.test(combined) || /\bworth it\b|\bideal for\b/.test(combined)) {
    scores.product += 2;
    signals.push("product-structure");
  }

  if (/\bop-ed\b|\bcounterpoint\b|\bcritics?\b|\bsupporters?\b/.test(combined)) {
    scores.opinion += 2;
    signals.push("opinion-structure");
  }

  const ranked = PAGE_TYPES
    .filter((pageType) => pageType !== "generic")
    .map((pageType) => ({ pageType, score: scores[pageType] }))
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];

  if (!best || best.score < 2) {
    return {
      pageType: "generic",
      confidence: 0.2,
      signals: signals.length > 0 ? signals : ["low-confidence"],
    };
  }

  return {
    pageType: best.pageType,
    confidence: Math.min(0.95, 0.3 + best.score * 0.1),
    signals,
  };
}
