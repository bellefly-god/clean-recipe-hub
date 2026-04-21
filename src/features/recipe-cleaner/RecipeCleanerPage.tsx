import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, FileText, Link2, ListChecks, Settings2, WandSparkles, Zap } from "lucide-react";
import { ArticleAnalysisResult } from "@/components/article/ArticleAnalysisResult";
import { RecipeLoadingSkeleton } from "@/components/recipe/RecipeLoadingSkeleton";
import { GuestLimit } from "@/components/recipe/GuestLimit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { getPrimaryArticleParseMessage } from "@/features/recipe-cleaner/articleParseMessages";
import { getRemainingGuestUses, hasGuestUsesRemaining, incrementGuestUsage } from "@/services/guestUsage/guestUsageService";
import { hasActiveSubscription } from "@/services/payment/paypalService";
import { parseArticleFromUrl } from "@/services/articleParser/articleParserService";
import { summarizeArticle } from "@/services/aiSummary/aiSummaryService";
import type { AISummaryResult } from "@/services/aiSummary/types";
import type { BrowserTabInfo, PageContext } from "@/shared/types/extension";
import { getActiveTab, getPageContextFromTab, observeActiveTabChanges } from "@/shared/utils/chrome";
import { isHttpUrl, isRestrictedBrowserUrl } from "@/shared/utils/url";
import type { ArticleContent, ArticleParseNotice } from "@/types/article";

type PageState = "idle" | "loading" | "result" | "error" | "limit" | "unsupported";
type ArticleView = "clean" | "analysis";
type PendingArticleAction = {
  kind: "clean" | "summary";
  url: string;
};

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
  const [state, setState] = useState<PageState>("idle");
  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [articleSummary, setArticleSummary] = useState<AISummaryResult | null>(null);
  const [articleNotices, setArticleNotices] = useState<ArticleParseNotice[]>([]);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [activeTab, setActiveTab] = useState<BrowserTabInfo | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [loadingTitle, setLoadingTitle] = useState("Working…");
  const [loadingDescription, setLoadingDescription] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(12);
  const [articleView, setArticleView] = useState<ArticleView>("clean");
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [pendingArticleAction, setPendingArticleAction] = useState<PendingArticleAction | null>(null);
  const currentUrlRef = useRef("");
  const previousActiveUrlRef = useRef("");
  const loadingTimerRef = useRef<number | null>(null);

  const clearLoadingTimer = () => {
    if (loadingTimerRef.current !== null) {
      window.clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  const updateLoadingState = (title: string, description: string, progress: number) => {
    setLoadingTitle(title);
    setLoadingDescription(description);
    setLoadingProgress(progress);
  };

  const startAIPendingProgress = (baseTitle: string) => {
    clearLoadingTimer();
    updateLoadingState(baseTitle, "Waiting for the AI model to finish analyzing the page.", 72);

    loadingTimerRef.current = window.setInterval(() => {
      setLoadingProgress((current) => (current >= 92 ? current : current + 3));
    }, 1200);
  };

  useEffect(() => {
    void getRemainingGuestUses().then(setRemaining);
  }, []);

  useEffect(() => {
    return () => {
      clearLoadingTimer();
    };
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
        setError("Page Cleaner can only read normal web pages. Open a supported webpage, then try again.");
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

  const updateCurrentUrl = (url: string) => {
    setCurrentUrl(url);
    currentUrlRef.current = url;
  };

  const getCachedArticleForUrl = (url: string) => {
    if (!article) {
      return null;
    }

    return normalizeComparableUrl(article.sourceUrl) === normalizeComparableUrl(url) ? article : null;
  };

  const loadArticleForUrl = async (url: string) => {
    updateLoadingState("Reading page…", "Loading the current page content for article analysis.", 16);
    const latestPageContext = await getFreshPageContextForUrl(url);
    updateLoadingState("Extracting article…", "Pulling out the main readable article content.", 38);
    const articleResult = await parseArticleFromUrl(url, { pageContext: latestPageContext });

    if (!articleResult.success || !articleResult.article) {
      clearLoadingTimer();
      setArticle(null);
      setArticleSummary(null);
      setArticleNotices(articleResult.notices ?? []);
      setError(getPrimaryArticleParseMessage(articleResult));
      setState(articleResult.uiState === "special_page" || articleResult.uiState === "unsupported" ? "unsupported" : "error");
      return null;
    }

    setArticleNotices(articleResult.notices ?? []);
    return articleResult.article;
  };

  const handleCleanArticle = async (url: string) => {
    // Check if user has access (logged in with subscription, or guest with remaining uses)
    if (user) {
      // Logged in user - check subscription
      const hasSubscription = await hasActiveSubscription(user.id);
      if (!hasSubscription) {
        // User is logged in but has no active subscription
        // Redirect to subscription page instead of showing limit
        setState("limit");
        return;
      }
    } else {
      // Guest user - check remaining uses
      if (!(await hasGuestUsesRemaining())) {
        setState("limit");
        return;
      }
    }

    setState("loading");
    setError("");
    clearLoadingTimer();

    const nextArticle = await loadArticleForUrl(url);

    if (!nextArticle) {
      return;
    }

    if (!user) {
      await incrementGuestUsage();
      setRemaining(await getRemainingGuestUses());
    }

    const keepExistingSummary =
      articleSummary && normalizeComparableUrl(nextArticle.sourceUrl) === normalizeComparableUrl(article?.sourceUrl);

    setArticle(nextArticle);
    setArticleSummary(keepExistingSummary ? articleSummary : null);
    setArticleView("clean");
    updateCurrentUrl(url);
    updateLoadingState("Preparing clean reader…", "Formatting the full article for side panel reading.", 96);
    setState("result");
  };

  const handleAnalyzeArticle = async (url: string) => {
    // Check if user has access (logged in with subscription, or guest with remaining uses)
    if (user) {
      const hasSubscription = await hasActiveSubscription(user.id);
      if (!hasSubscription) {
        setState("limit");
        return;
      }
    } else {
      if (!(await hasGuestUsesRemaining())) {
        setState("limit");
        return;
      }
    }

    setState("loading");
    setError("");
    clearLoadingTimer();
    const nextArticle = getCachedArticleForUrl(url) ?? (await loadArticleForUrl(url));

    if (!nextArticle) {
      return;
    }

    updateLoadingState("Preparing AI analysis…", "Building a page-type-aware prompt for the extracted content.", 58);
    startAIPendingProgress("Analyzing with AI…");
    const summaryResult = await summarizeArticle({
      article: nextArticle,
    });

    if (!summaryResult.success || !summaryResult.summary) {
      clearLoadingTimer();
      setState("error");
      setError(summaryResult.error ?? "We couldn't generate an AI summary for this page.");
      return;
    }

    if (!user) {
      await incrementGuestUsage();
      setRemaining(await getRemainingGuestUses());
    }

    setArticle(nextArticle);
    setArticleSummary(summaryResult.summary);
    setArticleView("analysis");
    updateCurrentUrl(url);
    clearLoadingTimer();
    updateLoadingState("Finalizing summary…", "Formatting the AI response for display.", 97);
    setState("result");
  };

  const handleAnalyzeSelectedText = async () => {
    // Get selected text from the main page via content script
    let selectedText = "";
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTED_TEXT" });
        selectedText = response?.selectedText?.replace(/\s+/g, " ").trim() ?? "";
      }
    } catch (err) {
      console.error("Failed to get selected text:", err);
    }

    if (!article || selectedText.length < 40) {
      toast({ description: "Select a meaningful passage in the clean article first." });
      return;
    }

    // Check if user has access (logged in with subscription, or guest with remaining uses)
    if (user) {
      const hasSubscription = await hasActiveSubscription(user.id);
      if (!hasSubscription) {
        setState("limit");
        return;
      }
    } else {
      if (!(await hasGuestUsesRemaining())) {
        setState("limit");
        return;
      }
    }

    setState("loading");
    setError("");
    clearLoadingTimer();
    updateLoadingState("Preparing selected text…", "Summarizing only the text you selected.", 52);
    startAIPendingProgress("Analyzing selection…");

    const summaryResult = await summarizeArticle(
      {
        article,
      },
      selectedText,
    );

    if (!summaryResult.success || !summaryResult.summary) {
      clearLoadingTimer();
      setState("error");
      setError(summaryResult.error ?? "We couldn't analyze the selected text right now.");
      return;
    }

    if (!user) {
      await incrementGuestUsage();
      setRemaining(await getRemainingGuestUses());
    }

    setArticleSummary(summaryResult.summary);
    setArticleView("analysis");
    clearLoadingTimer();
    updateLoadingState("Finalizing summary…", "Formatting the AI response for display.", 97);
    setState("result");
  };

  const handleBack = () => {
    clearLoadingTimer();
    setArticle(null);
    setArticleSummary(null);
    setArticleNotices([]);
    setArticleView("clean");
    setState("idle");
  };

  const requestArticleAction = (kind: PendingArticleAction["kind"], url: string) => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl || state === "loading") {
      return;
    }

    setPendingArticleAction({
      kind,
      url: trimmedUrl,
    });
  };

  const confirmArticleAction = () => {
    if (!pendingArticleAction) {
      return;
    }

    const { kind, url } = pendingArticleAction;
    setPendingArticleAction(null);

    if (kind === "clean") {
      void handleCleanArticle(url);
      return;
    }

    void handleAnalyzeArticle(url);
  };

  const pendingActionCopy =
    pendingArticleAction?.kind === "clean"
      ? {
          title: "Clean this page?",
          description: "Page Cleaner will re-extract the current page and refresh the clean reading view.",
          actionLabel: "Clean Page",
        }
      : {
          title: "Run AI analysis?",
          description: "Page Cleaner will send the cleaned page content to the AI summarizer and refresh the analysis result.",
          actionLabel: "Summarize",
        };

  return (
    <main className="mx-auto max-w-2xl px-3 py-3 sm:px-4">
        <div className="sticky top-14 z-40 -mx-3 border-b bg-background/95 px-3 pb-3 backdrop-blur sm:-mx-4 sm:px-4">
          <div className="rounded-2xl border bg-card/95 p-3 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {article ? "Current page" : "Page analysis"}
                </p>
                <h1 className="line-clamp-2 font-display text-xl leading-tight text-foreground">
                  {article?.title || activeTab?.title || "Clean and analyze the current page"}
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  {article?.sourceUrl || activeTab?.url || currentUrl || "Open any page to begin"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-muted-foreground"
                  onClick={() => setToolbarCollapsed((current) => !current)}
                >
                  {toolbarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
                <Link to="/settings">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {!toolbarCollapsed && (
              <>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant={articleView === "clean" ? "default" : "ghost"}
                    className="rounded-xl px-4"
                    onClick={() => setArticleView("clean")}
                  >
                    Clean
                  </Button>
                  <Button
                    type="button"
                    variant={articleView === "analysis" ? "default" : "ghost"}
                    className="rounded-xl px-4"
                    onClick={() => articleSummary ? setArticleView("analysis") : requestArticleAction("summary", currentUrl)}
                  >
                    AI Analysis
                  </Button>
                </div>

                <div className="mt-3 space-y-3">
                  <Input
                    type="url"
                    value={currentUrl}
                    onChange={(event) => updateCurrentUrl(event.target.value)}
                    placeholder="Paste a page URL…"
                    className="h-11 rounded-xl border-border bg-card px-4 text-sm shadow-soft"
                    disabled={state === "loading"}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Button className="h-11 rounded-xl" disabled={!currentUrl.trim() || state === "loading"} onClick={() => requestArticleAction("clean", currentUrl)}>
                      <FileText className="mr-2 h-4 w-4" />
                      Clean Page
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-11 rounded-xl"
                      disabled={!currentUrl.trim() || state === "loading"}
                      onClick={() => requestArticleAction("summary", currentUrl)}
                    >
                      <WandSparkles className="mr-2 h-4 w-4" />
                      Summarize
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6 pt-4">
          {!article && state === "idle" && (
            <div className="animate-fade-in space-y-5">
              {activeTab?.title && (
                <section className="rounded-2xl border bg-card/80 p-4 shadow-soft">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current tab</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{activeTab.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{activeTab.url}</p>
                </section>
              )}

              <section className="grid gap-3">
                <Benefit icon={<FileText className="h-5 w-5" />} title="Full clean page" description="Read the complete cleaned page in a narrow, distraction-free layout." />
                <Benefit icon={<ListChecks className="h-5 w-5" />} title="Structured AI analysis" description="Switch into AI Analysis for summaries, outlines, quotes, takeaways, and code notes." />
                <Benefit icon={<Zap className="h-5 w-5" />} title="Recipes still readable" description="Recipe pages now run through the article cleaner, so ingredients and steps stay readable without the old recipe card." />
              </section>
            </div>
          )}

          {state === "loading" && (
            <div className="space-y-6">
              <p className="animate-pulse-soft text-center text-sm text-muted-foreground">Analyzing your page…</p>
              <RecipeLoadingSkeleton title={loadingTitle} description={loadingDescription} progress={loadingProgress} />
            </div>
          )}

          {article && state === "result" && (
            <ArticleAnalysisResult
              article={article}
              summary={articleSummary}
              notices={articleNotices}
              view={articleView}
              onRerunClean={() => requestArticleAction("clean", currentUrl)}
              onRerunSummary={() => requestArticleAction("summary", currentUrl)}
              onAnalyzeSelectedText={() => void handleAnalyzeSelectedText()}
              onReset={handleBack}
            />
          )}

          {state === "error" && (
            <StateCard
              title="Something went wrong"
              description={error}
              actionLabel="Try again"
              onAction={currentUrl ? () => void handleCleanArticle(currentUrl) : handleBack}
            />
          )}

          {state === "unsupported" && (
            <StateCard
              title="This page isn't supported"
              description={error}
              actionLabel={currentUrl ? "Try this page again" : "Open another page"}
              onAction={currentUrl ? () => void handleCleanArticle(currentUrl) : undefined}
            />
          )}

          {state === "limit" && <GuestLimit />}
        </div>

        <AlertDialog open={Boolean(pendingArticleAction)} onOpenChange={(open) => !open && setPendingArticleAction(null)}>
          <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{pendingActionCopy?.title}</AlertDialogTitle>
              <AlertDialogDescription>{pendingActionCopy?.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction className="rounded-xl" onClick={confirmArticleAction}>
                {pendingActionCopy?.actionLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </main>
  );
}

function Benefit({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
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
