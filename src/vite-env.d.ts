/// <reference types="vite/client" />

interface ChromeLike {
  action?: {
    onClicked: {
      addListener: (callback: (tab: { id?: number }) => void | Promise<void>) => void;
    };
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
  };
}

declare const chrome: ChromeLike;
