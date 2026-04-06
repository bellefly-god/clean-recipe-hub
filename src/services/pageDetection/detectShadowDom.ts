import type { PageContext } from "@/shared/types/extension";

export function detectShadowDom(pageContext?: PageContext | null) {
  const openShadowRootCount = pageContext?.openShadowRootCount ?? 0;
  const shadowTextLength = pageContext?.shadowTextLength ?? 0;
  const matched = openShadowRootCount > 0 && shadowTextLength > 500;

  return {
    matched,
    reasons: matched ? ["open-shadow-root-content", `shadow-root-count:${openShadowRootCount}`] : [],
  };
}
