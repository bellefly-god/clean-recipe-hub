export interface BrowserTabInfo {
  id?: number;
  title?: string;
  url?: string;
}

export interface PageContext {
  url: string;
  title: string;
  description?: string;
  canonicalUrl?: string;
  siteName?: string;
}
