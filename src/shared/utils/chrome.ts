import { GET_PAGE_CONTEXT, type ExtensionRequest, type ExtensionResponse } from "@/shared/messaging/messages";
import type { BrowserTabInfo, PageContext } from "@/shared/types/extension";

type ActiveTabChangeCallback = () => void | Promise<void>;

export function isExtensionEnvironment() {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}

export async function getActiveTab(): Promise<BrowserTabInfo | null> {
  if (!isExtensionEnvironment() || !chrome.tabs?.query) {
    return null;
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const [tab] = tabs ?? [];

  if (!tab) {
    return null;
  }

  return {
    id: tab.id,
    title: tab.title,
    url: tab.url,
  };
}

export async function getPageContextFromTab(tabId?: number): Promise<PageContext | null> {
  if (!isExtensionEnvironment() || !tabId || !chrome.tabs?.sendMessage) {
    return null;
  }

  const pageContext = await requestPageContextFromTab(tabId);

  if (pageContext) {
    return pageContext;
  }

  const injected = await injectContentScriptIntoTab(tabId);

  if (!injected) {
    return null;
  }

  return requestPageContextFromTab(tabId);
}

export function observeActiveTabChanges(callback: ActiveTabChangeCallback) {
  if (!isExtensionEnvironment() || !chrome.tabs?.onActivated || !chrome.tabs?.onUpdated) {
    return () => {};
  }

  const handleActivated = () => {
    void callback();
  };

  const handleUpdated = (
    _tabId: number,
    changeInfo: { status?: string; url?: string; title?: string },
    tab: { active?: boolean },
  ) => {
    if (!tab.active) {
      return;
    }

    if (changeInfo.status === "complete" || changeInfo.url || changeInfo.title) {
      void callback();
    }
  };

  chrome.tabs.onActivated.addListener(handleActivated);
  chrome.tabs.onUpdated.addListener(handleUpdated);

  return () => {
    chrome.tabs?.onActivated?.removeListener(handleActivated);
    chrome.tabs?.onUpdated?.removeListener(handleUpdated);
  };
}

export async function getLocalStorageValue<T>(key: string): Promise<T | null> {
  if (!isExtensionEnvironment() || !chrome.storage?.local) {
    return null;
  }

  const result = await chrome.storage.local.get(key);
  return (result[key] as T | undefined) ?? null;
}

export async function setLocalStorageValue<T>(key: string, value: T) {
  if (!isExtensionEnvironment() || !chrome.storage?.local) {
    return;
  }

  await chrome.storage.local.set({ [key]: value });
}

async function requestPageContextFromTab(tabId: number): Promise<PageContext | null> {
  const request: ExtensionRequest = { type: GET_PAGE_CONTEXT };

  return new Promise((resolve) => {
    chrome.tabs?.sendMessage?.(tabId, request, (response?: ExtensionResponse) => {
      if (chrome.runtime.lastError || !response?.pageContext) {
        resolve(null);
        return;
      }

      resolve(response.pageContext);
    });
  });
}

async function injectContentScriptIntoTab(tabId: number) {
  if (!chrome.scripting?.executeScript) {
    console.debug("[Recipe Cleaner] chrome.scripting unavailable; cannot inject content script.");
    return false;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    console.debug("[Recipe Cleaner] Injected content script into tab.", tabId);
    return true;
  } catch (error) {
    console.debug("[Recipe Cleaner] Failed to inject content script into tab.", tabId, error);
    return false;
  }
}
