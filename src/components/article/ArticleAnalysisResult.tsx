import { useState } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { AISummaryResult } from "@/services/aiSummary/types";
import type { ArticleContent } from "@/types/article";

interface ArticleAnalysisResultProps {
  article: ArticleContent;
  summary: AISummaryResult;
  onBack: () => void;
}

export function ArticleAnalysisResult({
  article,
  summary,
  onBack,
}: ArticleAnalysisResultProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${label} copied to clipboard` });
  };

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in space-y-8">
      <div className="space-y-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
          {article.title}
        </h1>

        <p className="text-sm text-muted-foreground">
          from <span className="font-medium">{article.sourceDomain}</span>
        </p>

        {article.excerpt && (
          <p className="text-base leading-relaxed text-muted-foreground">{article.excerpt}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyButton
          label="Copy summary"
          onClick={() => copyToClipboard(summary.shortSummary, "Summary")}
        />
        <CopyButton
          label="Copy key points"
          onClick={() => copyToClipboard(summary.keyPoints.map((item) => `- ${item}`).join("\n"), "Key points")}
        />
      </div>

      <section className="space-y-4 rounded-xl border bg-secondary/40 p-5">
        <h2 className="font-display text-xl text-foreground">Summary</h2>
        <p className="leading-relaxed text-foreground">{summary.shortSummary}</p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-foreground">Key points</h2>
        <ul className="space-y-2">
          {summary.keyPoints.map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-foreground">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {summary.actionItems.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl text-foreground">Action items</h2>
          <ol className="space-y-4">
            {summary.actionItems.map((item, index) => (
              <li key={index} className="flex gap-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
                  {index + 1}
                </span>
                <p className="pt-0.5 leading-relaxed text-foreground">{item}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {summary.tags.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-foreground">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {summary.tags.map((tag) => (
              <span key={tag} className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CopyButton({ label, onClick }: { label: string; onClick: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    onClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" className="rounded-lg" onClick={handleClick}>
      {copied ? (
        <Check className="mr-1.5 h-3.5 w-3.5 text-accent" />
      ) : (
        <Copy className="mr-1.5 h-3.5 w-3.5" />
      )}
      {copied ? "Copied!" : label}
    </Button>
  );
}
