import type { DetectedPageType } from "@/services/aiSummary/types";

export function getStructuredSummaryInstructions(): string {
  return `你是一名专业的文章分析助手。请分析输入文章，并以严格 JSON 格式返回结果。

要求：
1. 必须先识别文章主类型。
2. 必须同时输出"通用分析"和"类型专属分析"。
3. 不要编造信息；原文未提及则填写 "未提及"。
4. 区分事实、观点、推测、经验、营销表达。
5. 输出必须是合法 JSON，不要包含 markdown，不要加解释文字。
6. 输出语言与文章语言一致，除非用户明确指定其他语言。

文章主类型枚举：
news
finance
travel
blog_opinion
tutorial
recipe
research_paper
product_review
marketing
other

请返回以下 JSON 结构：

{
  "article_type": "",
  "one_sentence_summary": "",
  "key_points": [
    "",
    "",
    ""
  ],
  "content_nature": {
    "category": "",
    "reason": ""
  },
  "target_audience": "",
  "read_recommendation": {
    "level": "",
    "reason": ""
  },
  "common_entities": {
    "people": [],
    "organizations": [],
    "locations": [],
    "dates": [],
    "products": [],
    "numbers": []
  },
  "fact_vs_opinion": {
    "facts": [],
    "opinions": [],
    "speculations": []
  },
  "type_specific_analysis": {},
  "risk_or_limitations": [],
  "actionable_takeaways": [],
  "confidence": {
    "score": 0,
    "reason": ""
  }
}

type_specific_analysis 根据类型返回不同字段：

如果 article_type = "news"
{
  "event_overview": "",
  "key_people_or_orgs": [],
  "time_and_place": "",
  "impact": "",
  "uncertainties": [],
  "what_to_watch_next": []
}

如果 article_type = "finance"
{
  "core_thesis": "",
  "supporting_data_or_logic": [],
  "bullish_factors": [],
  "risk_factors": [],
  "facts": [],
  "speculations": [],
  "affected_sectors_or_groups": []
}

如果 article_type = "travel"
{
  "destination": "",
  "recommended_duration": "",
  "best_time_to_go": "",
  "highlights": [],
  "budget_info": "",
  "transport_tips": [],
  "stay_tips": [],
  "pitfalls": [],
  "is_it_directly_actionable": ""
}

如果 article_type = "blog_opinion"
{
  "main_argument": "",
  "supporting_reasons": [],
  "useful_lessons": [],
  "personal_experience_elements": [],
  "bias_or_stance": ""
}

如果 article_type = "tutorial"
{
  "problem_to_solve": "",
  "solution_summary": "",
  "steps": [],
  "prerequisites": [],
  "common_mistakes": [],
  "beginner_friendly": ""
}

如果 article_type = "recipe"
{
  "dish_name": "",
  "ingredients": [],
  "steps": [],
  "prep_time": "",
  "cook_time": "",
  "key_tips": [],
  "substitutions": [],
  "failure_points": []
}

如果 article_type = "research_paper"
{
  "research_question": "",
  "method": "",
  "data_or_experiment": "",
  "main_findings": [],
  "contributions": [],
  "limitations": [],
  "worth_reading_full_text": ""
}

如果 article_type = "product_review"
{
  "product_name": "",
  "problem_it_solves": "",
  "core_features": [],
  "pros": [],
  "cons": [],
  "best_for": [],
  "promotional_tone": ""
}

如果 article_type = "marketing"
{
  "main_value_proposition": "",
  "target_users": [],
  "promises": [],
  "credible_information": [],
  "marketing_language_signals": [],
  "what_users_should_really_focus_on": []
}`;
}

export function buildSummaryPrompt(input: {
  title?: string;
  url?: string;
  content: string;
}): string {
  return [
    getStructuredSummaryInstructions(),
    "",
    "输入：",
    `标题：${input.title || "未提供"}`,
    `链接：${input.url || "未提供"}`,
    `正文：${input.content}`,
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
