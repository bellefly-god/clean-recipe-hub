import { GET_PAGE_CONTEXT, type ExtensionRequest, type ExtensionResponse } from "@/shared/messaging/messages";
import type { BrowserTabInfo, PageContext } from "@/shared/types/extension";

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

  const request: ExtensionRequest = { type: GET_PAGE_CONTEXT };

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, request, (response?: ExtensionResponse) => {
      if (chrome.runtime.lastError || !response?.pageContext) {
        resolve(null);
        return;
      }

      resolve(response.pageContext);
    });
  });
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
