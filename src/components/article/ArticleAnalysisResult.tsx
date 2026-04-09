import { useState, type ReactNode } from "react";
import { Check, Copy, Download, RefreshCcw, ScanSearch, Clock, Users, ChefHat, AlertTriangle, Zap, Target, MessageSquareQuote, Lightbulb, TrendingUp, TrendingDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getArticleParseMessage } from "@/features/recipe-cleaner/articleParseMessages";
import type { AISummaryResult } from "@/services/aiSummary/types";
import type { ArticleContent, ArticleParseNotice } from "@/types/article";

type ArticleView = "clean" | "analysis";

interface ArticleAnalysisResultProps {
  article: ArticleContent;
  summary: AISummaryResult | null;
  notices?: ArticleParseNotice[];
  view: ArticleView;
  onRerunClean: () => void;
  onRerunSummary: () => void;
  onAnalyzeSelectedText: () => void;
  onReset: () => void;
}

interface OutlineEntry {
  depth: number;
  text: string;
}

function sanitizeArticleHtml(html?: string | null) {
  if (!html || typeof DOMParser === "undefined") {
    return "";
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script, style, iframe, form, noscript").forEach((node) => node.remove());

  document.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name.startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element instanceof HTMLAnchorElement) {
      element.rel = "noreferrer noopener";
      element.target = "_blank";
    }
  });

  return document.body.innerHTML.trim();
}

function extractOutline(article: ArticleContent, sanitizedHtml: string): OutlineEntry[] {
  if (article.headings.length > 0) {
    return article.headings.slice(0, 12).map((heading) => ({
      depth: heading.level,
      text: heading.text,
    }));
  }

  if (sanitizedHtml && typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(sanitizedHtml, "text/html");
    const headings = Array.from(document.querySelectorAll("h2, h3, h4"))
      .map((heading) => ({
        depth: Number(heading.tagName.replace("H", "")),
        text: heading.textContent?.trim() ?? "",
      }))
      .filter((item) => item.text);

    if (headings.length > 0) {
      return headings.slice(0, 12);
    }
  }

  return (article.cleanMarkdown ?? article.contentMarkdown ?? "")
    .split("\n")
    .map((line) => {
      const match = line.match(/^(#{2,4})\s+(.+)$/);
      if (!match) {
        return null;
      }

      return {
        depth: match[1].length,
        text: match[2].trim(),
      } satisfies OutlineEntry;
    })
    .filter((item): item is OutlineEntry => Boolean(item))
    .slice(0, 12);
}

function extractQuotes(article: ArticleContent, sanitizedHtml: string) {
  const quoteSet = new Set<string>();

  // Helper to clean and validate a quote
  const cleanQuote = (text: string): string | null => {
    // Remove HTML entities
    const cleaned = text
      .replace(/&ldquo;|&rdquo;|&lsquo;|&rsquo;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;|&gt;/g, "")
      .replace(/&[a-z]+;/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // Filter out invalid quotes
    if (cleaned.length < 30 || cleaned.length > 300) return null;
    if (cleaned.includes("<script") || cleaned.includes("<style")) return null;
    // Skip if it looks like a URL or code
    if (cleaned.includes("http://") || cleaned.includes("https://")) return null;
    // Skip very repetitive content
    if ((cleaned.match(/[.!?]/g) || []).length < 2 && cleaned.length > 100) return null;

    return cleaned;
  };

  if (sanitizedHtml && typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(sanitizedHtml, "text/html");
    document.querySelectorAll("blockquote").forEach((quote) => {
      const text = quote.textContent ?? "";
      const cleaned = cleanQuote(text);
      if (cleaned) {
        quoteSet.add(cleaned);
      }
    });
  }

  // Extract meaningful inline quotes (longer, complete sentences)
  const inlineQuotes = article.cleanText.match(/"([^"]{50,280})"/g) ?? [];
  inlineQuotes.forEach((quote) => {
    const withoutQuotes = quote.slice(1, -1);
    const cleaned = cleanQuote(withoutQuotes);
    if (cleaned) {
      quoteSet.add(cleaned);
    }
  });

  // Deduplicate and limit
  const quoteArray = Array.from(quoteSet);
  return quoteArray
    .filter((q, i) => quoteArray.indexOf(q) === i) // Remove exact duplicates
    .filter((q, i) => {
      // Remove near-duplicates (similar quotes)
      return !quoteArray.slice(0, i).some((existing) => {
        const similarity = calculateSimilarity(q, existing);
        return similarity > 0.7;
      });
    })
    .slice(0, 4);
}

// Simple similarity calculation for deduplication
function calculateSimilarity(a: string, b: string): number {
  const aWords = a.toLowerCase().split(/\s+/);
  const bWords = b.toLowerCase().split(/\s+/);
  const intersection = aWords.filter((word) => bWords.includes(word));
  return intersection.length / Math.max(aWords.length, bWords.length);
}

function formatPublishedAt(value?: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function buildCleanBody(article: ArticleContent, sanitizedHtml: string) {
  if (sanitizedHtml) {
    return <div className="article-clean" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
  }

  return (
    <div className="article-clean">
      {article.cleanText.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>{paragraph.trim()}</p>
      ))}
    </div>
  );
}

export function ArticleAnalysisResult({
  article,
  summary,
  notices = [],
  view,
  onRerunClean,
  onRerunSummary,
  onAnalyzeSelectedText,
  onReset,
}: ArticleAnalysisResultProps) {
  const { toast } = useToast();
  const sanitizedHtml = sanitizeArticleHtml(article.cleanHtml || article.contentHtml);
  const outline = extractOutline(article, sanitizedHtml);
  const quotes = extractQuotes(article, sanitizedHtml);
  const takeaways = summary?.warnings?.length ? summary.warnings : summary?.keyPoints.slice(0, 3) ?? [];
  const publishedAt = formatPublishedAt(article.metadata?.publishedAt);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${label} copied to clipboard` });
  };

  const exportMarkdown = () => {
    const content = article.cleanMarkdown || article.contentMarkdown || article.cleanText;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${article.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "article"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in space-y-6 pb-10">
      {notices.map((notice) => (
        <section
          key={notice.code}
          className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900 shadow-soft"
        >
          {getArticleParseMessage(notice.code)}
        </section>
      ))}

      <section className="rounded-2xl border bg-card/90 p-5 shadow-soft">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>{summary?.pageType ?? "article"}</span>
            {summary?.language && (
              <>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>{summary.language}</span>
              </>
            )}
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{article.sourceDomain}</span>
            {article.metadata?.byline && (
              <>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>{article.metadata.byline}</span>
              </>
            )}
            {publishedAt && (
              <>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>{publishedAt}</span>
              </>
            )}
          </div>

          <h1 className="font-display text-2xl leading-tight text-foreground sm:text-3xl">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-sm leading-6 text-muted-foreground">{article.excerpt}</p>
          )}

          {summary?.categories && summary.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {summary.categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {view === "clean" ? (
        <section className="rounded-2xl border bg-card/90 p-5 shadow-soft">
          {buildCleanBody(article, sanitizedHtml)}
        </section>
      ) : summary ? (
        <section className="space-y-4">
          <div className="rounded-2xl border bg-secondary/40 p-5 shadow-soft">
            <h2 className="font-display text-xl text-foreground">Summary</h2>
            <p className="mt-3 leading-7 text-foreground">{summary.shortSummary}</p>
          </div>

          <Accordion type="multiple" defaultValue={summary ? ["summary", "page-specific", "key-points"] : ["summary"]} className="rounded-2xl border bg-card/90 px-5 shadow-soft">
              {/* Summary always visible */}
              <AccordionItem value="summary">
                <AccordionTrigger className="text-left font-display text-lg text-foreground">Summary</AccordionTrigger>
                <AccordionContent>
                  <p className="leading-7 text-foreground">{summary.shortSummary}</p>
                </AccordionContent>
              </AccordionItem>

              {/* Page-specific section */}
              {summary.pageType && summary.pageType !== "generic" && (
                <AccordionItem value="page-specific">
                  <AccordionTrigger className="text-left font-display text-lg text-foreground">
                    {summary.pageType === "recipe" ? "Recipe Details" :
                     summary.pageType === "news" ? "News Facts" :
                     summary.pageType === "tutorial" ? "Tutorial Steps" :
                     summary.pageType === "opinion" ? "Opinion Analysis" :
                     summary.pageType === "product" ? "Product Overview" :
                     summary.pageType === "technical_article" ? "Technical Details" : "Details"}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pb-2">
                      {summary.pageType === "recipe" && <RecipeSection summary={summary} />}
                      {summary.pageType === "news" && <NewsSection summary={summary} />}
                      {summary.pageType === "tutorial" && <TutorialSection summary={summary} />}
                      {summary.pageType === "opinion" && <OpinionSection summary={summary} />}
                      {summary.pageType === "product" && <ProductSection summary={summary} />}
                      {summary.pageType === "technical_article" && <TechnicalSection summary={summary} />}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              <AccordionItem value="key-points">
                <AccordionTrigger className="text-left font-display text-lg text-foreground">Key Points</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-3 pb-2">
                    {summary.keyPoints.map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-foreground">
                        <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                        <span className="leading-7">{item}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {outline.length > 0 && (
                <AccordionItem value="outline">
                  <AccordionTrigger className="text-left font-display text-lg text-foreground">Outline</AccordionTrigger>
                  <AccordionContent>
                    <ol className="space-y-3 pb-2">
                      {outline.map((item, index) => (
                        <li key={`${item.text}-${index}`} className="flex gap-3 text-foreground">
                          <span className="mt-0.5 text-xs text-muted-foreground">{index + 1}</span>
                          <span className="leading-7" style={{ paddingLeft: `${Math.max(0, item.depth - 2) * 12}px` }}>
                            {item.text}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              )}

              {summary.codeNotes && summary.codeNotes.length > 0 && (
                <AccordionItem value="code-notes">
                  <AccordionTrigger className="text-left font-display text-lg text-foreground">Code Notes</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-3 pb-2">
                      {summary.codeNotes.map((item, index) => (
                        <li key={`${item}-${index}`} className="flex items-start gap-3 text-foreground">
                          <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                          <span className="leading-7">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {summary.notes && summary.notes.length > 0 && (
                <AccordionItem value="notes">
                  <AccordionTrigger className="text-left font-display text-lg text-foreground">Notes</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-3 pb-2">
                      {summary.notes.map((item, index) => (
                        <li key={`${item}-${index}`} className="flex items-start gap-3 text-foreground">
                          <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                          <span className="leading-7">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {takeaways.length > 0 && (
                <AccordionItem value="takeaways">
                  <AccordionTrigger className="text-left font-display text-lg text-foreground">Takeaways</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-3 pb-2">
                      {takeaways.map((item, index) => (
                        <li key={`${item}-${index}`} className="leading-7 text-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {quotes.length > 0 && (
                <AccordionItem value="quotes">
                  <AccordionTrigger className="text-left font-display text-lg text-foreground">Quotes</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pb-2">
                      {quotes.map((quote, index) => (
                        <blockquote key={`${quote}-${index}`} className="rounded-xl border-l-2 border-accent bg-secondary/40 px-4 py-3 text-sm leading-7 text-foreground">
                          {quote}
                        </blockquote>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {summary.actionItems.length > 0 && (
                <AccordionItem value="action-items">
                  <AccordionTrigger className="text-left font-display text-lg text-foreground">Action Items</AccordionTrigger>
                  <AccordionContent>
                    <ol className="space-y-4 pb-2">
                      {summary.actionItems.map((item, index) => (
                        <li key={index} className="flex gap-4">
                          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
                            {index + 1}
                          </span>
                          <p className="pt-0.5 leading-7 text-foreground">{item}</p>
                        </li>
                      ))}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </section>
      ) : (
        <section className="rounded-2xl border bg-card/90 p-5 shadow-soft">
          <h2 className="font-display text-xl text-foreground">AI Analysis</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The clean article is ready. Run AI Analysis when you want a structured summary, outline, quotes, and action items.
          </p>
        </section>
      )}

      <section className="rounded-2xl border bg-card/90 p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label={view === "clean" ? "Copy article" : "Copy summary"}
            onClick={() =>
              copyToClipboard(
                view === "clean"
                  ? article.cleanText
                  : [summary?.shortSummary ?? "", ...(summary?.keyPoints ?? []).map((item) => `- ${item}`)].join("\n\n"),
                view === "clean" ? "Article" : "Summary",
              )
            }
          />
          <ActionButton label="Export markdown" icon={<Download className="h-3.5 w-3.5" />} onClick={exportMarkdown} />
          <ActionButton label="Re-run clean" icon={<RefreshCcw className="h-3.5 w-3.5" />} onClick={onRerunClean} />
          <ActionButton label="Summarize" icon={<RefreshCcw className="h-3.5 w-3.5" />} onClick={onRerunSummary} />
          <ActionButton label="Analyze selection" icon={<ScanSearch className="h-3.5 w-3.5" />} onClick={onAnalyzeSelectedText} />
          <Button variant="ghost" size="sm" className="rounded-lg text-muted-foreground" onClick={onReset}>
            New page
          </Button>
        </div>
      </section>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    onClick();
    if (label.toLowerCase().includes("copy")) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button variant="outline" size="sm" className="rounded-lg" onClick={handleClick}>
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-accent" /> : icon ?? <Copy className="mr-1.5 h-3.5 w-3.5" />}
      {copied ? "Copied!" : label}
    </Button>
  );
}

// Page-type specific display components
function RecipeSection({ summary }: { summary: AISummaryResult }) {
  if (!summary.ingredients && !summary.steps && !summary.prepTime && !summary.cookTime) return null;

  return (
    <AccordionItem value="recipe-details">
      <AccordionTrigger className="text-left font-display text-lg text-foreground">
        <div className="flex items-center gap-2">
          <ChefHat className="h-4 w-4" />
          Recipe Details
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pb-2">
          {/* Meta info */}
          <div className="flex flex-wrap gap-3 text-sm">
            {summary.prepTime && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Prep: {summary.prepTime}</span>
              </div>
            )}
            {summary.cookTime && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Cook: {summary.cookTime}</span>
              </div>
            )}
            {summary.servings && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>Servings: {summary.servings}</span>
              </div>
            )}
            {summary.difficulty && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{summary.difficulty}</span>
            )}
          </div>

          {/* Ingredients */}
          {summary.ingredients && summary.ingredients.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium text-foreground">Ingredients</h4>
              <ul className="space-y-1">
                {summary.ingredients.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Steps */}
          {summary.steps && summary.steps.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium text-foreground">Instructions</h4>
              <ol className="space-y-3">
                {summary.steps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="leading-6 text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function NewsSection({ summary }: { summary: AISummaryResult }) {
  if (!summary.who && !summary.what && !summary.when && !summary.where && !summary.why) return null;

  return (
    <AccordionItem value="news-details">
      <AccordionTrigger className="text-left font-display text-lg text-foreground">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Key Facts
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 pb-2 text-sm">
          {summary.who && (
            <div className="flex gap-2">
              <span className="font-medium text-foreground min-w-[60px]">Who:</span>
              <span className="text-muted-foreground">{summary.who}</span>
            </div>
          )}
          {summary.what && (
            <div className="flex gap-2">
              <span className="font-medium text-foreground min-w-[60px]">What:</span>
              <span className="text-muted-foreground">{summary.what}</span>
            </div>
          )}
          {summary.when && (
            <div className="flex gap-2">
              <span className="font-medium text-foreground min-w-[60px]">When:</span>
              <span className="text-muted-foreground">{summary.when}</span>
            </div>
          )}
          {summary.where && (
            <div className="flex gap-2">
              <span className="font-medium text-foreground min-w-[60px]">Where:</span>
              <span className="text-muted-foreground">{summary.where}</span>
            </div>
          )}
          {summary.why && (
            <div className="flex gap-2">
              <span className="font-medium text-foreground min-w-[60px]">Why:</span>
              <span className="text-muted-foreground">{summary.why}</span>
            </div>
          )}
          {summary.attribution && (
            <div className="flex gap-2">
              <span className="font-medium text-foreground min-w-[60px]">Source:</span>
              <span className="text-muted-foreground">{summary.attribution}</span>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function TutorialSection({ summary }: { summary: AISummaryResult }) {
  if (!summary.problem && !summary.prerequisites && !summary.steps && !summary.estimatedTime) return null;

  return (
    <AccordionItem value="tutorial-details">
      <AccordionTrigger className="text-left font-display text-lg text-foreground">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Tutorial Guide
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pb-2">
          {summary.problem && (
            <div>
              <h4 className="mb-1 font-medium text-foreground">Problem</h4>
              <p className="text-sm text-muted-foreground">{summary.problem}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            {summary.difficulty && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{summary.difficulty}</span>
            )}
            {summary.estimatedTime && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{summary.estimatedTime}</span>
              </div>
            )}
          </div>

          {summary.prerequisites && summary.prerequisites.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium text-foreground">Prerequisites</h4>
              <ul className="space-y-1">
                {summary.prerequisites.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.steps && summary.steps.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium text-foreground">Steps</h4>
              <ol className="space-y-3">
                {summary.steps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="leading-6 text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function OpinionSection({ summary }: { summary: AISummaryResult }) {
  if (!summary.thesis && !summary.arguments && !summary.counterpoints) return null;

  return (
    <AccordionItem value="opinion-details">
      <AccordionTrigger className="text-left font-display text-lg text-foreground">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="h-4 w-4" />
          Opinion Analysis
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pb-2">
          {summary.thesis && (
            <div className="rounded-lg bg-secondary/40 p-3">
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Main Argument</h4>
              <p className="text-sm text-foreground">{summary.thesis}</p>
            </div>
          )}

          {summary.arguments && summary.arguments.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1 font-medium text-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                Supporting Arguments
              </h4>
              <ul className="space-y-2">
                {summary.arguments.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground pl-4 border-l-2 border-green-200">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.counterpoints && summary.counterpoints.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1 font-medium text-foreground">
                <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                Counterpoints Addressed
              </h4>
              <ul className="space-y-2">
                {summary.counterpoints.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground pl-4 border-l-2 border-amber-200">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.conclusion && (
            <div className="mt-3 pt-3 border-t">
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Conclusion</h4>
              <p className="text-sm text-foreground">{summary.conclusion}</p>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function ProductSection({ summary }: { summary: AISummaryResult }) {
  if (!summary.productName && !summary.keyFeatures && !summary.pros && !summary.cons) return null;

  return (
    <AccordionItem value="product-details">
      <AccordionTrigger className="text-left font-display text-lg text-foreground">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Product Overview
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pb-2">
          {summary.productName && (
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-foreground">{summary.productName}</span>
              {summary.pricing && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {summary.pricing}
                </span>
              )}
            </div>
          )}

          {summary.keyFeatures && summary.keyFeatures.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium text-foreground">Key Features</h4>
              <ul className="space-y-1">
                {summary.keyFeatures.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {summary.pros && summary.pros.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-green-700">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Pros
                </h4>
                <ul className="space-y-1">
                  {summary.pros.map((item, index) => (
                    <li key={index} className="text-xs text-muted-foreground">+ {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.cons && summary.cons.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-red-700">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Cons
                </h4>
                <ul className="space-y-1">
                  {summary.cons.map((item, index) => (
                    <li key={index} className="text-xs text-muted-foreground">- {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {summary.verdict && (
            <div className="mt-3 pt-3 border-t">
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Verdict</h4>
              <p className="text-sm text-foreground">{summary.verdict}</p>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function TechnicalSection({ summary }: { summary: AISummaryResult }) {
  if (!summary.topic && !summary.technologies && !summary.concepts && !summary.takeaways) return null;

  return (
    <AccordionItem value="technical-details">
      <AccordionTrigger className="text-left font-display text-lg text-foreground">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Technical Details
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pb-2">
          {summary.topic && (
            <div>
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Topic</h4>
              <p className="text-sm text-foreground">{summary.topic}</p>
            </div>
          )}

          {summary.technologies && summary.technologies.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium text-foreground">Technologies</h4>
              <div className="flex flex-wrap gap-2">
                {summary.technologies.map((tech, index) => (
                  <span key={index} className="rounded-full bg-secondary/60 px-2 py-0.5 text-xs text-secondary-foreground">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {summary.concepts && summary.concepts.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium text-foreground">Key Concepts</h4>
              <ul className="space-y-1">
                {summary.concepts.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground pl-3 border-l-2 border-accent">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.takeaways && summary.takeaways.length > 0 && (
            <div>
              <h4 className="mb-2 font-medium text-foreground">Takeaways</h4>
              <ul className="space-y-2">
                {summary.takeaways.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
