import type { PageContext } from "@/shared/types/extension";

export const GET_PAGE_CONTEXT = "GET_PAGE_CONTEXT";

export interface GetPageContextRequest {
  type: typeof GET_PAGE_CONTEXT;
}

export interface GetPageContextResponse {
  pageContext: PageContext;
}

export type ExtensionRequest = GetPageContextRequest;
export type ExtensionResponse = GetPageContextResponse;
