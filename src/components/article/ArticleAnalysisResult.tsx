import { useState, type ReactNode } from "react";
import { Check, Copy, Download, RefreshCcw, ScanSearch } from "lucide-react";
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

  if (sanitizedHtml && typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(sanitizedHtml, "text/html");
    document.querySelectorAll("blockquote").forEach((quote) => {
      const text = quote.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (text.length >= 40) {
        quoteSet.add(text);
      }
    });
  }

  const inlineQuotes = article.cleanText.match(/"([^"]{40,220})"/g) ?? [];
  inlineQuotes.forEach((quote) => {
    quoteSet.add(quote.replace(/\s+/g, " ").trim());
  });

  return Array.from(quoteSet).slice(0, 4);
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

          <Accordion type="multiple" defaultValue={["key-points", "outline"]} className="rounded-2xl border bg-card/90 px-5 shadow-soft">
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
