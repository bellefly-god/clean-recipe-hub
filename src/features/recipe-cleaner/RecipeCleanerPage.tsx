import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, FileText, Link2, ListChecks, Newspaper, Sparkles, Zap } from "lucide-react";
import { ArticleAnalysisResult } from "@/components/article/ArticleAnalysisResult";
import { UrlInput } from "@/components/recipe/UrlInput";
import { RecipeLoadingSkeleton } from "@/components/recipe/RecipeLoadingSkeleton";
import { RecipeResult } from "@/components/recipe/RecipeResult";
import { GuestLimit } from "@/components/recipe/GuestLimit";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { getRemainingGuestUses, hasGuestUsesRemaining, incrementGuestUsage } from "@/services/guestUsage/guestUsageService";
import { parseRecipeFromUrl } from "@/services/recipeParser/recipeParserService";
import { saveRecipe } from "@/services/savedRecipes/savedRecipesService";
import { parseArticleFromUrl } from "@/services/articleParser/articleParserService";
import { summarizeArticle } from "@/services/aiSummary/aiSummaryService";
import type { AISummaryResult } from "@/services/aiSummary/types";
import type { BrowserTabInfo, PageContext } from "@/shared/types/extension";
import { getErrorMessage } from "@/shared/utils/errors";
import { getActiveTab, getPageContextFromTab, observeActiveTabChanges } from "@/shared/utils/chrome";
import { isHttpUrl, isRestrictedBrowserUrl } from "@/shared/utils/url";
import type { ArticleContent } from "@/types/article";
import type { Recipe } from "@/types/recipe";

type PageState = "idle" | "loading" | "result" | "error" | "limit" | "unsupported";
type CleanerMode = "recipe" | "article";

function normalizeComparableUrl(value?: string | null) {
  if (!value) {
    return "";
  }

  try {
    const normalized = new URL(value);
    normalized.hash = "";
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

export function RecipeCleanerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<CleanerMode>("recipe");
  const [state, setState] = useState<PageState>("idle");
  const [recipe, setRecipe] = useState<Omit<Recipe, "id" | "createdAt"> | null>(null);
  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [articleSummary, setArticleSummary] = useState<AISummaryResult | null>(null);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [activeTab, setActiveTab] = useState<BrowserTabInfo | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const currentUrlRef = useRef("");
  const previousActiveUrlRef = useRef("");

  useEffect(() => {
    void getRemainingGuestUses().then(setRemaining);
  }, []);

  useEffect(() => {
    const refreshActiveTab = async () => {
      const tab = await getActiveTab();
      setActiveTab(tab);

      if (!tab?.url) {
        setPageContext(null);
        return;
      }

      if (isRestrictedBrowserUrl(tab.url)) {
        setState("unsupported");
        setError("Recipe Cleaner can only read normal web pages. Open a recipe site, then try again.");
        setPageContext(null);
        return;
      }

      if (isHttpUrl(tab.url) && (currentUrlRef.current === "" || currentUrlRef.current === previousActiveUrlRef.current)) {
        setCurrentUrl(tab.url);
        currentUrlRef.current = tab.url;
      }

      previousActiveUrlRef.current = tab.url;

      setState((currentState) => (currentState === "unsupported" ? "idle" : currentState));
      setError("");

      const tabPageContext = await getPageContextFromTab(tab.id);
      setPageContext(
        tabPageContext ?? {
          url: tab.url,
          title: tab.title ?? "Untitled page",
        },
      );
    };

    void refreshActiveTab();
    const stopObserving = observeActiveTabChanges(refreshActiveTab);

    return stopObserving;
  }, []);

  const getFreshPageContextForUrl = async (url: string) => {
    const activeTabSnapshot = await getActiveTab();

    if (!activeTabSnapshot?.id || !activeTabSnapshot.url) {
      return pageContext;
    }

    const targetUrl = normalizeComparableUrl(url);
    const activeTabUrl = normalizeComparableUrl(activeTabSnapshot.url);

    if (targetUrl !== activeTabUrl) {
      return pageContext;
    }

    const refreshedPageContext = await getPageContextFromTab(activeTabSnapshot.id);

    if (refreshedPageContext) {
      setActiveTab(activeTabSnapshot);
      setPageContext(refreshedPageContext);
      return refreshedPageContext;
    }

    return pageContext;
  };

  const handleClean = async (url: string) => {
    if (!user && !(await hasGuestUsesRemaining())) {
      setState("limit");
      return;
    }

    setState("loading");
    setError("");

    const result = await parseRecipeFromUrl(url, { pageContext });

    if (!result.success || !result.recipe) {
      setState("error");
      setError(result.error ?? "Couldn't extract the recipe. Try another URL.");
      return;
    }

    if (!user) {
      await incrementGuestUsage();
      setRemaining(await getRemainingGuestUses());
    }

    setRecipe(result.recipe);
    setArticle(null);
    setArticleSummary(null);
    setCurrentUrl(url);
    currentUrlRef.current = url;
    setState("result");
  };

  const handleAnalyzeArticle = async (url: string) => {
    if (!user && !(await hasGuestUsesRemaining())) {
      setState("limit");
      return;
    }

    setState("loading");
    setError("");

    const latestPageContext = await getFreshPageContextForUrl(url);
    const articleResult = await parseArticleFromUrl(url, { pageContext: latestPageContext });

    if (!articleResult.success || !articleResult.article) {
      setState("error");
      setError(articleResult.error ?? "We couldn't extract readable article content from this page.");
      return;
    }

    const summaryResult = await summarizeArticle({
      article: articleResult.article,
    });

    if (!summaryResult.success || !summaryResult.summary) {
      setState("error");
      setError(summaryResult.error ?? "We couldn't generate an AI summary for this page.");
      return;
    }

    if (!user) {
      await incrementGuestUsage();
      setRemaining(await getRemainingGuestUses());
    }

    setRecipe(null);
    setArticle(articleResult.article);
    setArticleSummary(summaryResult.summary);
    setCurrentUrl(url);
    currentUrlRef.current = url;
    setState("result");
  };

  const handleSave = async () => {
    if (!user || !recipe) {
      toast({ description: "Sign in to save recipes." });
      return;
    }

    try {
      await saveRecipe(user.id, recipe);
      toast({ description: "Recipe saved to Supabase." });
    } catch (saveError) {
      toast({
        variant: "destructive",
        description: getErrorMessage(saveError, "Unable to save this recipe right now."),
      });
    }
  };

  const handleBack = () => {
    setRecipe(null);
    setArticle(null);
    setArticleSummary(null);
    setState("idle");
  };

  const handlePrimarySubmit = (url: string) => {
    if (mode === "article") {
      void handleAnalyzeArticle(url);
      return;
    }

    void handleClean(url);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {state === "idle" && (
        <div className="animate-fade-in space-y-8 text-center">
          <div className="mx-auto flex max-w-xs rounded-2xl border bg-card p-1 shadow-soft">
            <Button
              type="button"
              variant={mode === "recipe" ? "default" : "ghost"}
              className="flex-1 rounded-xl"
              onClick={() => setMode("recipe")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Recipe
            </Button>
            <Button
              type="button"
              variant={mode === "article" ? "default" : "ghost"}
              className="flex-1 rounded-xl"
              onClick={() => setMode("article")}
            >
              <Newspaper className="mr-2 h-4 w-4" />
              Article
            </Button>
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
              {mode === "recipe" ? (
                <>
                  Clean any recipe,
                  <br />
                  <span className="text-accent">instantly.</span>
                </>
              ) : (
                <>
                  Analyze any article,
                  <br />
                  <span className="text-accent">in seconds.</span>
                </>
              )}
            </h1>
            <p className="mx-auto max-w-md text-lg text-muted-foreground">
              {mode === "recipe"
                ? "The current tab URL is ready below. Clean the recipe into a distraction-free format with the existing parser flow."
                : "The current tab URL is ready below. Extract the readable article content and generate an AI summary with key points and action items."}
            </p>
          </div>

          {activeTab?.title && (
            <div className="mx-auto max-w-xl rounded-2xl border bg-card/80 p-4 text-left shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Current tab
              </p>
              <p className="mt-2 truncate text-sm font-medium text-foreground">{activeTab.title}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{activeTab.url}</p>
            </div>
          )}

          <div className="mx-auto max-w-xl">
            <UrlInput
              initialValue={currentUrl}
              onSubmit={handlePrimarySubmit}
              remainingUses={user ? null : remaining}
              placeholder={mode === "recipe" ? "Paste a recipe link…" : "Paste an article link…"}
              submitLabel={mode === "recipe" ? "Clean Recipe" : "Analyze Page"}
              loadingLabel={mode === "recipe" ? "Cleaning…" : "Analyzing…"}
            />
          </div>

          <div className="mx-auto grid max-w-lg gap-6 pt-2 sm:grid-cols-3">
            {mode === "recipe" ? (
              <>
                <Benefit icon={<Zap className="h-5 w-5" />} title="Remove clutter" description="No ads, pop-ups, or life-story filler" />
                <Benefit icon={<ListChecks className="h-5 w-5" />} title="Clean format" description="Ingredients and steps, nothing else" />
                <Benefit icon={<Bookmark className="h-5 w-5" />} title="Save recipes" description="Signed-in users can persist recipes to Supabase" />
              </>
            ) : (
              <>
                <Benefit icon={<FileText className="h-5 w-5" />} title="Readable text" description="Extract the main article from the current page" />
                <Benefit icon={<ListChecks className="h-5 w-5" />} title="AI key points" description="Get a short summary and structured takeaways" />
                <Benefit icon={<Zap className="h-5 w-5" />} title="Fast review" description="Scan long pages before deciding what to read in full" />
              </>
            )}
          </div>
        </div>
      )}

      {state === "loading" && (
        <div className="space-y-6">
          <p className="animate-pulse-soft text-center text-sm text-muted-foreground">
            Cleaning your recipe…
          </p>
          <RecipeLoadingSkeleton />
        </div>
      )}

      {state === "result" && mode === "recipe" && recipe && (
        <RecipeResult recipe={recipe} onBack={handleBack} onSave={handleSave} canSave={!!user} />
      )}

      {state === "result" && mode === "article" && article && articleSummary && (
        <ArticleAnalysisResult article={article} summary={articleSummary} onBack={handleBack} />
      )}

      {state === "error" && (
        <StateCard
          title="Something went wrong"
          description={error}
          actionLabel="Try another URL"
          onAction={handleBack}
        />
      )}

      {state === "unsupported" && (
        <StateCard
          title="This page isn't supported"
          description={error}
          actionLabel={currentUrl ? "Try this page URL anyway" : "Go to a recipe website"}
          onAction={currentUrl ? () => void handleClean(currentUrl) : undefined}
        />
      )}

      {state === "limit" && <GuestLimit />}
    </main>
  );
}

function Benefit({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function StateCard({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mx-auto max-w-md animate-fade-in space-y-4 rounded-2xl border bg-card p-8 text-center shadow-card">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground">
        <Link2 className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-xl text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center justify-center gap-3">
        {onAction && actionLabel && (
          <Button className="rounded-xl" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        <Link to="/auth">
          <Button variant="outline" className="rounded-xl">
            Sign in
          </Button>
        </Link>
      </div>
    </div>
  );
}
