import { describe, expect, it } from "vitest";

import { normalizeArticleTitle } from "@/services/articleParser/normalizeArticle";

describe("normalizeArticleTitle", () => {
  it("strips reddit subreddit suffix and duplicate translated title segments", () => {
    const title =
      "我即将毕业于计算机科学专业，现在的就业市场真的这么糟糕吗？：r/Singaporejobs --- Soon to be CS grad here, is the job market really this bad right now? : r/singaporejobs";

    expect(normalizeArticleTitle(title, "www.reddit.com")).toBe(
      "我即将毕业于计算机科学专业，现在的就业市场真的这么糟糕吗？",
    );
  });

  it("keeps non-reddit titles unchanged", () => {
    expect(normalizeArticleTitle("谷歌的绩效管理", "www.ruanyifeng.com")).toBe("谷歌的绩效管理");
  });
});
