# AI Analysis Optimization Log

Last updated: 2026-04-17 16:24:13 CST

## 2026-04-17

### Confirmed effective fixes

1. Large article requests no longer fail before AI runs

- Root cause:
  Wiley and similar academic pages can produce very large `cleanText` payloads. The AI request used to send the full extracted text to `/api/ai/summarize`, which caused `PayloadTooLargeError: request entity too large` on the server before the model was called.
- Fix:
  - Frontend now truncates AI input before sending: `src/services/aiSummary/aiSummaryService.ts`
  - Current cap: `15000` chars
  - Server JSON body limit increased: `server/server.js`
- Verification:
  - Server logs showed repeated `PayloadTooLargeError`
  - After truncation, long paper-like payloads successfully returned `200`

2. English articles were incorrectly summarized in Chinese

- Root cause:
  The server `SYSTEM_PROMPT` was written entirely in Chinese, which strongly biased Gemini toward Chinese output even when the request explicitly passed `preferredOutputLanguage: "English"`.
- Fix:
  - Replaced the old Chinese-only system prompt with a language-neutral English base prompt
  - Added dynamic language requirements via `buildSystemPrompt(preferredOutputLanguage)`
  - Added strict English and Chinese output instructions in `server/server.js`
- Verification:
  - Before fix:
    Sending English content with `preferredOutputLanguage: "English"` still returned Chinese summaries
  - After fix:
    The same request returned English `one_sentence_summary`, `key_points`, and `fact_vs_opinion.facts`

3. `facts` / `opinions` were returned by the server but not shown correctly in the UI

- Root cause:
  The server returned `fact_vs_opinion`, but the frontend did not fully map these values into `AISummaryResult`, so sections like `News Facts` appeared empty.
- Fix:
  - Added `facts` and `opinions` to `src/services/aiSummary/types.ts`
  - Mapped them in `src/services/aiSummary/providers/serverProvider.ts`
  - Rendered them in `src/components/article/ArticleAnalysisResult.tsx`
- Verification:
  - Server responses now expose non-empty `facts`
  - Frontend has a concrete rendering path for `Reported Facts` and `Opinion Signals`

4. AI provider routing is more stable

- Current server routing:
  - Primary: `gemini-2.5-flash-lite`
  - Fallback: `gemini-2.5-flash`
  - Last resort: `openrouter/free`
- Related hardening:
  - Better JSON extraction and parsing
  - More defensive normalization for model output
  - Connect and request timeouts
  - Clearer upstream error handling

### Important observations from live verification

1. Clean Page success does not automatically mean AI analysis will succeed

- If `Clean Page` is already available, `AI Analysis` usually reuses the cached parsed article.
- In that case, failures are more likely to come from:
  - server request size limits
  - model output instability
  - upstream provider/network issues
  than from DOM extraction itself.

2. Remote fetching is still blocked on some sites

- Some sites, including Wiley and Ruanyifeng blog pages in direct-fetch scenarios, can return anti-bot or challenge pages when fetched remotely.
- This affects URL-fetch fallback paths.
- However, if the current tab is already open and the extension can read DOM successfully, analysis can still work from the DOM snapshot path.

3. Browser translation can still affect perceived language behavior

- Frontend language detection originally relied heavily on extracted article text.
- If a browser auto-translates the page, the DOM text may become Chinese even when the original article is English.
- To reduce this, page context now carries document language metadata from the page `lang` attribute and language detection prefers that metadata when available.

### Files most relevant to this round

- `server/server.js`
- `src/services/aiSummary/aiSummaryService.ts`
- `src/services/aiSummary/providers/serverProvider.ts`
- `src/services/aiSummary/detectOutputLanguage.ts`
- `src/components/article/ArticleAnalysisResult.tsx`
- `src/content/content.ts`
- `src/shared/types/extension.ts`
- `src/types/article.ts`

### Current best-known behavior

- Long extracted articles should be truncated before upload and analyzed successfully
- English input with explicit English language preference should return English output
- `facts` from server responses should be available to the frontend and render in the analysis UI

### Remaining risks

1. Model classification for academic papers is still imperfect

- Some paper-like content is currently classified as `news` or `other`
- The language issue is fixed, but page-type classification could still be improved later

2. Existing cached summaries can make it look like a fix did not apply

- If the user views an already-generated summary, the side panel may still show old results until the summary is re-run

3. Browser-translated pages may still introduce mixed-language edge cases

- The new `documentLanguage` metadata helps, but translation-heavy pages can still confuse extraction or downstream rendering in rare cases
