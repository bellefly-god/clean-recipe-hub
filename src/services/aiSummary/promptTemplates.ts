import type { DetectedPageType } from "@/services/aiSummary/types";

// Page-specific output templates for structured display
export const PAGE_TYPE_OUTPUT_TEMPLATES: Record<DetectedPageType, string> = {
  recipe: `For recipes, include these ADDITIONAL fields in your JSON:
- "ingredients": array of ingredient strings with quantities (e.g., ["2 cups flour", "1 tsp salt"])
- "prepTime": prep time if stated (e.g., "15 minutes")
- "cookTime": cook time if stated (e.g., "30 minutes")
- "servings": number of servings if stated
- "difficulty": "easy" | "medium" | "hard" if determinable
- "steps": array of cooking steps, each as a concise instruction`,

  news: `For news, include these ADDITIONAL fields in your JSON:
- "who": main subject(s) involved
- "what": what happened in one sentence
- "when": when it happened
- "where": location if stated
- "why": why it matters, context or implications
- "attribution": quoted sources or references`,

  tutorial: `For tutorials, include these ADDITIONAL fields in your JSON:
- "problem": what problem does this solve
- "prerequisites": array of required tools/knowledge
- "steps": array of tutorial steps, numbered and concise
- "difficulty": "beginner" | "intermediate" | "advanced"
- "estimatedTime": time to complete if stated`,

  opinion: `For opinion pieces, include these ADDITIONAL fields in your JSON:
- "thesis": the main argument in one sentence
- "arguments": array of supporting arguments
- "counterpoints": array of opposing views addressed
- "conclusion": the author's final position
- "bias": noted perspective or potential bias`,

  product: `For product content, include these ADDITIONAL fields in your JSON:
- "productName": name of the product/service
- "category": product category
- "keyFeatures": array of main features
- "pros": array of advantages
- "cons": array of disadvantages
- "pricing": pricing info if available
- "verdict": recommendation if given`,

  technical_article: `For technical articles, include these ADDITIONAL fields in your JSON:
- "topic": main technical topic
- "technologies": array of technologies/frameworks mentioned
- "concepts": array of key concepts explained
- "codeSnippets": brief descriptions of any important code
- "takeaways": practical lessons for developers`,

  generic: `For generic content, focus on extracting the most relevant information and organizing it clearly.`,
};

export const PAGE_TYPE_PROMPT_TEMPLATES: Record<DetectedPageType, string> = {
  recipe:
    "Focus on: dish name, ingredients with quantities, cooking method, prep/cook time, servings, difficulty. Each keyPoint: ONE specific detail, MAX 120 chars. Preserve ingredient quantities. Include warnings for missing times or temperatures.",
  news:
    "Focus on: WHO did WHAT, WHEN, WHERE, WHY it matters. Separate facts from opinions. Each keyPoint: MAX 120 chars, include attribution. Add warnings for unverified claims or one-sided coverage.",
  tutorial:
    "Focus on: problem solved, core method, step sequence, prerequisites, commands/APIs. Each keyPoint: ONE actionable item, MAX 120 chars. Add warnings for missing prerequisites or risky steps.",
  opinion:
    "Focus on: author's thesis, main arguments, assumptions, counterpoints. Distinguish claims from evidence. Each keyPoint: MAX 120 chars. Add warnings for weak evidence or loaded framing.",
  product:
    "Focus on: what it is, key features, ideal user, limitations, pricing if stated. Each keyPoint: MAX 120 chars. Add warnings for marketing language, missing pricing, or unverified claims.",
  technical_article:
    "Focus on: what it teaches/announces, core architecture/workflow, key APIs/commands, version info, pitfalls. Use codeNotes for code observations. Each keyPoint: MAX 120 chars. Add warnings for version assumptions or missing context.",
  generic:
    "Focus on: main topic, core ideas, important details. Each keyPoint: MAX 120 chars. Add warnings for incomplete, ambiguous, or promotional content.",
};

export function getStructuredSummaryInstructions() {
  return [
    "You are a precise content analyzer. Return ONLY valid JSON.",
    "",
    "BASE REQUIRED FIELDS:",
    JSON.stringify(
      {
        pageType: "recipe|news|tutorial|opinion|product|technical_article|generic",
        language: "Chinese or English based on source language",
        title: "clear title, max 80 characters",
        summary: "2-3 sentences. Each sentence max 150 characters. Capture the CORE message.",
        keyPoints: ["specific point 1 (max 120 chars)", "specific point 2", "specific point 3"],
        categories: ["tag1", "tag2"],
        actionItems: [],
        notes: [],
        warnings: [],
        codeNotes: [],
      },
      null,
      2,
    ),
    "",
    "PAGE-SPECIFIC FIELDS: (Include these based on detected pageType above)",
    "",
    "For RECIPE pages, add:",
    JSON.stringify(
      {
        ingredients: ["ingredient with quantity"],
        prepTime: "prep time if stated",
        cookTime: "cook time if stated",
        servings: "number if stated",
        difficulty: "easy|medium|hard",
        steps: ["step 1", "step 2"],
      },
      null,
      2,
    ),
    "",
    "For NEWS pages, add:",
    JSON.stringify(
      {
        who: "main subjects",
        what: "what happened",
        when: "when it happened",
        where: "location",
        why: "why it matters",
        attribution: "sources quoted",
      },
      null,
      2,
    ),
    "",
    "For TUTORIAL pages, add:",
    JSON.stringify(
      {
        problem: "what problem it solves",
        prerequisites: ["required tools or knowledge"],
        steps: ["numbered step"],
        difficulty: "beginner|intermediate|advanced",
        estimatedTime: "time if stated",
      },
      null,
      2,
    ),
    "",
    "For OPINION pages, add:",
    JSON.stringify(
      {
        thesis: "main argument",
        arguments: ["supporting point"],
        counterpoints: ["opposing views addressed"],
        conclusion: "final position",
      },
      null,
      2,
    ),
    "",
    "For PRODUCT pages, add:",
    JSON.stringify(
      {
        productName: "product name",
        keyFeatures: ["feature 1"],
        pros: ["advantage"],
        cons: ["disadvantage"],
        pricing: "price if stated",
        verdict: "recommendation if given",
      },
      null,
      2,
    ),
    "",
    "For TECHNICAL articles, add:",
    JSON.stringify(
      {
        topic: "main technical topic",
        technologies: ["tech mentioned"],
        concepts: ["key concept"],
        takeaways: ["practical lesson"],
      },
      null,
      2,
    ),
    "",
    "CRITICAL RULES:",
    "- Return ONLY the JSON object. NO markdown, NO code blocks, NO explanations.",
    "- Fill in page-specific fields ONLY if content contains that information.",
    "- summary: 2-3 sentences MAX. Each sentence MAX 150 characters. Capture the ESSENCE.",
    "- keyPoints: 3-6 points. Each point MAX 120 characters. Be SPECIFIC, not vague.",
    "- categories: 2-4 lowercase topic tags.",
    "- notes: Important details, edge cases, caveats. MAX 100 chars each.",
    "- warnings: ONLY if content has gaps, risks, issues. Otherwise empty array [].",
    "- COMPLETENESS: Include ALL important information from source.",
    "- CONCISENESS: Every field must be brief. No fluff, no padding.",
    "- ACCURACY: Never invent facts. If unsure, add to warnings.",
  ].join("\n");
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
