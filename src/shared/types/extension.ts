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
  publishedAt?: string;
  iframeCount?: number;
  openShadowRootCount?: number;
  shadowTextLength?: number;
  jsonLdBlocks?: string[];
  htmlSnapshot?: string;
}
