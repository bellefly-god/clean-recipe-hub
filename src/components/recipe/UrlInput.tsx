import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
  remainingUses?: number | null;
}

export function UrlInput({ onSubmit, loading, remainingUses }: UrlInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="Paste a recipe link…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12 flex-1 rounded-xl border-border bg-card px-4 text-base shadow-soft transition-shadow focus:shadow-card"
          disabled={loading}
        />
        <Button
          type="submit"
          disabled={!url.trim() || loading}
          className="h-12 rounded-xl px-6 text-base font-medium shadow-soft transition-all hover:shadow-card"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {loading ? "Cleaning…" : "Clean Recipe"}
        </Button>
      </div>

      {remainingUses !== null && remainingUses !== undefined && (
        <p className="text-center text-sm text-muted-foreground">
          {remainingUses > 0
            ? `${remainingUses} free clean${remainingUses !== 1 ? "s" : ""} remaining`
            : "No free cleans remaining — sign in to continue"}
        </p>
      )}
    </form>
  );
}
