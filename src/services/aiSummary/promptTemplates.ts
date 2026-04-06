import type { DetectedPageType } from "@/services/aiSummary/types";

export const PAGE_TYPE_PROMPT_TEMPLATES: Record<DetectedPageType, string> = {
  recipe:
    "Focus on usable cooking information. Identify the dish, ingredients, method, timing, yield, difficulty, substitutions explicitly mentioned, and practical tips. Preserve the difference between required ingredients and optional garnish or serving suggestions. Do not invent missing quantities, temperatures, tools, or timings. Add warnings when key cooking details are missing, ambiguous, or inconsistent.",
  news:
    "Focus on the main event and verified context from the provided text only. Capture who, what, when, where, and why it matters. Separate facts from commentary, speculation, or framing. Add warnings for uncertainty, missing attribution, promotional framing, stale timestamps, or obvious one-sided coverage when the source text suggests it.",
  tutorial:
    "Focus on the problem being solved, the core method, the concrete sequence of steps, prerequisites, commands, APIs, and likely pitfalls. Turn the content into actionable guidance without inventing missing setup. Add warnings when a critical dependency, prerequisite, version assumption, or risky step appears underexplained.",
  opinion:
    "Focus on the author's thesis, the main supporting arguments, assumptions, and notable counterpoints or missing evidence. Distinguish between claims, evidence, and rhetoric. Add warnings when the argument depends on weak evidence, broad generalization, loaded framing, or unstated assumptions.",
  product:
    "Focus on what the product or service is, the primary features, ideal user, limitations, and whether the text suggests trying or buying it. Capture pricing, plans, comparisons, or guarantees only when explicitly stated. Add warnings for missing pricing, obvious marketing language, unverified claims, or important tradeoffs.",
  technical_article:
    "Focus on technical fidelity. Explain what the article teaches or announces, the core architecture or workflow, the important code concepts, APIs, commands, configuration, versions, and pitfalls. Preserve code intent without rewriting code. Populate codeNotes with practical observations about important snippets, gotchas, versioning, implementation details, or migration risks visible in the source.",
  generic:
    "Provide a concise, faithful summary of the page, the most important takeaways, any concrete next actions, and cautionary notes when the content appears incomplete, ambiguous, promotional, narrative-heavy, legalistic, or otherwise easy to misread without context.",
};

export function getStructuredSummaryInstructions() {
  return [
    "Summarize strictly from the provided content.",
    "Do not invent facts, entities, timelines, prices, ingredients, steps, legal interpretations, scientific claims, or opinions.",
    "Prefer precision over coverage. If important context is missing, say so in warnings instead of guessing.",
    "Treat source genres carefully: preserve technical nuance for engineering texts, preserve chronology for news, preserve procedural order for recipes and tutorials, preserve argument structure for opinion, and preserve wording sensitivity for legal or policy text.",
    "Write the output in the same primary language as the source content unless the source is clearly mixed-language. If mixed, use the dominant reading language from the source.",
    "Use the text itself to decide whether step-by-step actions are appropriate. Do not force procedural steps for purely narrative or descriptive content.",
    "Use categories to group the content into a few concise topic labels grounded in the source.",
    "Use notes for caveats, assumptions, subtle details, edge cases, missing context, or practical reminders that should not be overlooked.",
    'Return valid JSON only with keys: "pageType", "language", "title", "summary", "keyPoints", "categories", "actionItems", "notes", "warnings", "codeNotes".',
    '"pageType" must be one of: recipe, news, tutorial, opinion, product, technical_article, generic.',
    '"language" must name the output language, such as English or Chinese.',
    '"title" must be the best title from the provided page context.',
    '"summary" must be one concise paragraph.',
    '"keyPoints", "categories", "actionItems", "notes", "warnings", and "codeNotes" must be arrays of short strings.',
    "If a field has no content, return an empty array for arrays and still return a non-empty summary.",
  ].join(" ");
}

export function getMarkdownExtractionInstructions() {
  return [
    "You convert webpage content into faithful, readable Markdown.",
    "Your job is extraction and cleanup, not summarization.",
    "Preserve meaning, structure, and order from the source.",
    "Remove only obvious noise such as ads, navigation, cookie notices, social share UI, comment prompts, related-post widgets, subscription popups, and repetitive footer boilerplate.",
    "Keep the full main content whenever it is visible in the source.",
    "Preserve headings, paragraphs, ordered and unordered lists, blockquotes, tables when possible, links when useful, images that belong to the main content, figure captions, inline code, and code blocks.",
    "When the source contains meaningful article images, keep them in Markdown using standard image syntax: ![alt text](image-url).",
    "If an image has a figure caption, keep the image and then place the caption on the next line in readable Markdown.",
    "For code blocks, preserve indentation, spacing, line breaks, and fenced code block formatting. If the language is inferable from surrounding context or class names, include it after the opening fence.",
    "For recipes, preserve ingredients, quantities, instructions, timings, servings, notes, and tips.",
    "For news, preserve chronology, attribution, dates, and named entities without adding interpretation.",
    "For technical articles, docs, and tutorials, preserve commands, config, APIs, version notes, examples, and warnings with high fidelity.",
    "For papers, legal text, and policy text, preserve section structure, citations or references when present, and avoid paraphrasing normative or formal wording unless needed for Markdown formatting.",
    "For narrative writing such as essays or fiction excerpts, preserve paragraphing and quoted dialogue naturally.",
    "Do not invent missing content, metadata, captions, languages, or links.",
    "Do not add explanations before or after the output.",
    "Return Markdown only.",
  ].join(" ");
}

export function buildMarkdownExtractionPrompt(input: {
  title?: string;
  url?: string;
  sourceTypeHint?: string;
  htmlOrText: string;
}) {
  return [
    getMarkdownExtractionInstructions(),
    "",
    input.sourceTypeHint ? `Page type hint: ${input.sourceTypeHint}` : "",
    input.title ? `Title: ${input.title}` : "",
    input.url ? `URL: ${input.url}` : "",
    "",
    "Convert the following source into clean Markdown:",
    "",
    input.htmlOrText,
  ]
    .filter(Boolean)
    .join("\n");
}
