/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_SUMMARY_PROVIDER?: "glm5" | "openrouter";
  readonly VITE_GLM5_API_KEY?: string;
  readonly VITE_GLM5_MODEL?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_OPENROUTER_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ChromeLike {
  action?: {
    onClicked: {
      addListener: (callback: (tab: { id?: number }) => void | Promise<void>) => void;
    };
  };
  scripting?: {
    executeScript: (options: {
      target: { tabId: number };
      files?: string[];
    }) => Promise<unknown>;
  };
  runtime: {
    id?: string;
    lastError?: { message?: string };
    onInstalled?: {
      addListener: (callback: () => void | Promise<void>) => void;
    };
    onMessage?: {
      addListener: (
        callback: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void,
        ) => boolean | void,
      ) => void;
    };
  };
  sidePanel?: {
    open: (options: Record<string, unknown>) => Promise<void>;
    setOptions: (options: Record<string, unknown>) => Promise<void>;
  };
  storage?: {
    local: {
      get: (key: string) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
    };
  };
  tabs?: {
    query: (queryInfo: Record<string, unknown>) => Promise<Array<{ id?: number; title?: string; url?: string }>>;
    sendMessage: (
      tabId: number,
      message: unknown,
      responseCallback: (response?: unknown) => void,
    ) => void;
    onActivated: {
      addListener: (callback: () => void) => void;
      removeListener: (callback: () => void) => void;
    };
    onUpdated: {
      addListener: (
        callback: (
          tabId: number,
          changeInfo: { status?: string; url?: string; title?: string },
          tab: { active?: boolean },
        ) => void,
      ) => void;
      removeListener: (
        callback: (
          tabId: number,
          changeInfo: { status?: string; url?: string; title?: string },
          tab: { active?: boolean },
        ) => void,
      ) => void;
    };
  };
}

declare const chrome: ChromeLike;
