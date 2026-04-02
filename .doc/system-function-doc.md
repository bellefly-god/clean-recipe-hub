# Recipe Cleaner 系统架构文档

## 1. 文档目的

本文档描述当前 `Recipe Cleaner` Chrome 扩展的最新系统状态，包括：

- 整体架构
- 功能模块
- 主要业务流程
- 解析与 AI 摘要实现方式
- 本地安装与运行方式
- 环境变量配置
- 当前注意事项

当前项目已经从普通的 `React + Vite + TypeScript + Tailwind + Supabase` Web App 转换为一个基于 **Chrome Extension Manifest V3** 和 **Chrome Side Panel API** 的浏览器侧边栏扩展。

系统目前支持两类页面处理能力：

1. `Recipe` 模式
   提取 recipe 页面中的结构化食谱内容
2. `Article` 模式
   提取普通文章正文并调用 AI 生成结构化摘要

---

## 2. 当前系统定位

### 2.1 产品目标

`Recipe Cleaner` 的目标是让用户在浏览网页时，直接通过 Chrome Side Panel 获取页面的核心内容，而不是继续在原始网页中处理广告、导航、营销文案或冗长布局。

### 2.2 当前版本核心能力

当前系统已经具备：

- Chrome Side Panel 扩展形态
- 点击扩展图标直接打开侧边栏
- 自动读取当前 tab URL 和标题
- 当前 tab 变化时自动刷新
- Recipe 页面结构化提取
- Article 正文提取
- OpenRouter AI 摘要
- Supabase 登录
- Saved Recipes 保存/列表/详情
- 设置页
- Guest usage 控制

---

## 3. 技术栈

- React 18
- TypeScript
- Vite 5
- Tailwind CSS
- shadcn/ui
- Supabase JS Client
- Chrome Extension Manifest V3
- Chrome Side Panel API
- Mozilla Readability
- Turndown
- OpenRouter OpenAI-compatible API

---

## 4. 总体架构

### 4.1 分层

当前系统按职责拆分为以下层：

- `background`
  负责扩展生命周期和 side panel 行为配置
- `content`
  负责运行在网页上下文中，提取页面信息
- `sidepanel`
  负责扩展主入口
- `options`
  负责设置页入口
- `features`
  负责页面级业务编排
- `services`
  负责业务服务能力
- `components`
  负责 UI 组件
- `shared`
  负责公共类型、消息、浏览器工具函数
- `lib`
  负责基础设施，例如 Supabase

### 4.2 核心目录结构

```text
src/
  app/
    AppProviders.tsx
    ExtensionApp.tsx
  background/
    service-worker.ts
  content/
    content.ts
  sidepanel/
    index.html
    main.tsx
  options/
    index.html
    main.tsx
  features/
    auth/
    recipe-cleaner/
    saved-recipes/
    settings/
  components/
    article/
    auth/
    layout/
    recipe/
    ui/
  services/
    aiSummary/
    articleParser/
    auth/
    guestUsage/
    recipeParser/
    savedRecipes/
  shared/
    messaging/
    types/
    utils/
  lib/
    supabase/
  types/
    article.ts
    recipe.ts
```

---

## 5. 扩展基础运行机制

## 5.1 Manifest

入口文件：

- `manifest.json`

当前 manifest 关键配置：

- `manifest_version: 3`
- `background.service_worker`
- `side_panel.default_path`
- `options_page`
- `permissions`
  - `storage`
  - `tabs`
  - `sidePanel`
- `host_permissions`
  - `http://*/*`
  - `https://*/*`

---

## 5.2 Toolbar 点击打开 Side Panel

实现文件：

- `src/background/service-worker.ts`

当前逻辑：

- 启动时配置 side panel path
- 使用 `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`
- 在 `onInstalled` 和 `onStartup` 时重新注册
- 使得用户点击扩展图标时可直接打开 side panel

---

## 5.3 Content Script 页面上下文采集

实现文件：

- `src/content/content.ts`

当前 content script 返回：

- `url`
- `title`
- `description`
- `canonicalUrl`
- `siteName`
- `jsonLdBlocks`
- `htmlSnapshot`

其中：

- `jsonLdBlocks`
  供 recipe parser 做 JSON-LD 提取
- `htmlSnapshot`
  供 recipe parser 和 article parser 做 DOM / Readability 分析

为了控制消息体大小，当前不会发送整页原始 DOM，而是发送一份裁剪后的 HTML 快照。

---

## 5.4 Current tab 自动更新

实现文件：

- `src/shared/utils/chrome.ts`
- `src/features/recipe-cleaner/RecipeCleanerPage.tsx`

当前系统会监听：

- `chrome.tabs.onActivated`
- `chrome.tabs.onUpdated`

因此当用户：

- 切换浏览器 tab
- 在当前 tab 中跳转到新 URL

扩展中的 `Current tab` 区域会自动刷新，同时新的 `pageContext` 也会重新读取。

---

## 6. UI 主页面结构

主页面文件：

- `src/features/recipe-cleaner/RecipeCleanerPage.tsx`

当前在同一个页面中承载两种模式：

- `Recipe`
- `Article`

### 当前页面状态

页面统一维护以下状态：

- `idle`
- `loading`
- `result`
- `error`
- `limit`
- `unsupported`

### 当前页面内主要区域

- 模式切换按钮
- Current tab 信息卡片
- URL 输入框
- 加载态
- 结果态
- 错误态
- unsupported 状态
- guest usage 限制态

当前设计原则是：

- 不重做整体 UI
- 尽量复用原有组件
- 通过最小 UI 变更扩展双模式能力

---

## 7. Recipe 模式

## 7.1 功能目标

Recipe 模式用于从网页中提取 recipe 结构化内容，并返回当前 UI 已兼容的数据结构：

- `title`
- `sourceUrl`
- `sourceDomain`
- `summary`
- `ingredients`
- `steps`
- `notes`
- `rawContent`

### 7.2 主要文件

- `src/services/recipeParser/recipeParserService.ts`
- `src/services/recipeParser/extractJsonLdRecipe.ts`
- `src/services/recipeParser/extractMicrodataRecipe.ts`
- `src/services/recipeParser/extractReadableRecipe.ts`
- `src/services/recipeParser/normalizeRecipe.ts`
- `src/services/recipeParser/parserTypes.ts`
- `src/services/recipeParser/parseHtmlDocument.ts`

---

## 7.3 Recipe 解析流程

当前 recipe 解析采用三级优先级：

1. JSON-LD
2. Microdata / schema-like DOM
3. Readability fallback

如果三段都失败，则返回结构化失败结果，而不是崩溃。

### 7.3.1 JSON-LD 提取

优先从：

- `<script type="application/ld+json">`

中查找 `Recipe` 节点，支持：

- `@graph`
- `mainEntity`
- `itemListElement`
- `@type` 为字符串或数组
- `recipeInstructions` 为：
  - 字符串
  - 字符串数组
  - `HowToStep`
  - `HowToSection`

### 7.3.2 Microdata / DOM 提取

如果 JSON-LD 不可用，则尝试从 DOM 中提取常见 recipe 结构，例如：

- `[itemprop="recipeIngredient"]`
- `[itemprop="recipeInstructions"]`
- `.ingredients li`
- `.instructions li`
- `.directions li`
- `[class*='ingredient'] li`
- `[class*='direction'] li`

### 7.3.3 Readability fallback

如果前两步都失败：

- 对 HTML 快照执行 Readability
- 从正文标题、列表、段落、分节标题中做启发式提取
- 尝试识别：
  - ingredients
  - instructions
  - notes

### 7.3.4 结果归一化

无论来自哪一种提取方式，都会经过统一 normalize 流程：

- 清理空白
- 去重
- 规范化 ingredients
- 规范化 steps
- 检查是否满足基本 recipe 可用性

---

## 7.4 Recipe 页面流程

```text
用户进入 Recipe 模式
  -> 输入 URL 或使用当前 tab URL
  -> parseRecipeFromUrl(url, { pageContext })
  -> recipeParserService 调用多阶段解析
     -> JSON-LD
     -> Microdata
     -> Readability fallback
  -> normalize 成统一 Recipe 结果
  -> 成功则展示 RecipeResult
  -> 登录用户可保存到 Supabase
  -> 失败则进入 error 状态
```

---

## 8. Article 模式

## 8.1 功能目标

Article 模式用于从普通文章或正文页中提取可读正文，并通过 AI 生成结构化摘要。

### 8.2 主要文件

- `src/services/articleParser/articleParserService.ts`
- `src/services/articleParser/extractReadableContent.ts`
- `src/services/articleParser/normalizeArticle.ts`
- `src/services/aiSummary/aiSummaryService.ts`
- `src/services/aiSummary/promptTemplates.ts`
- `src/services/aiSummary/providers/openrouterProvider.ts`
- `src/services/aiSummary/types.ts`
- `src/components/article/ArticleAnalysisResult.tsx`
- `src/types/article.ts`

---

## 8.3 Article Parser 输出结构

Article parser 当前返回：

- `title`
- `sourceUrl`
- `sourceDomain`
- `excerpt`
- `contentText`
- `contentMarkdown`
- `metadata`

其中 `metadata` 当前可能包括：

- `byline`
- `siteName`
- `length`
- `excerptLength`

---

## 8.4 Article 提取流程

Article parser 当前流程：

1. 校验 URL
2. 判断输入 URL 是否就是当前 tab
3. 如果是当前 tab，直接复用 `pageContext.htmlSnapshot`
4. 如果不是当前 tab，则尝试远程抓取 HTML
5. 执行 Readability 提取主内容
6. 用 Turndown 将可读 HTML 转为 Markdown
7. 归一化为统一 Article 数据结构

当前用到的第三方库：

- `@mozilla/readability`
- `turndown`

### 为什么单独拆 Article Parser

因为 article 分析和 recipe 提取的目标结构不同：

- recipe 关注 ingredients / steps
- article 关注正文内容与摘要输入

所以 Article Parser 独立于 Recipe Parser。

---

## 9. AI Summary 模块

## 9.1 功能目标

Article 模式下，将正文内容发送到 OpenRouter，由 OpenAI-compatible 模型返回结构化摘要。

### 9.2 主要文件

- `src/services/aiSummary/aiSummaryService.ts`
- `src/services/aiSummary/promptTemplates.ts`
- `src/services/aiSummary/providers/openrouterProvider.ts`
- `src/services/aiSummary/types.ts`

### 9.3 输出结构

AI 摘要统一输出为：

- `shortSummary: string`
- `keyPoints: string[]`
- `actionItems: string[]`
- `tags: string[]`
- `rawModelOutput?: string`

### 9.4 Prompt 设计

当前 prompt 原则：

- 只能基于提供的文章内容总结
- 不允许 hallucinate
- 要求返回 JSON 结构
- 摘要简短
- key points 清晰
- 如果不适用，则 action items 返回空数组

### 9.5 OpenRouter Provider

OpenRouter-specific 逻辑被单独放在：

- `src/services/aiSummary/providers/openrouterProvider.ts`

这样后续如果改成：

- 自建后端
- Edge Function
- 其他 AI Provider

只需要替换 provider，而不需要重写上层业务。

---

## 10. Article 模式业务流程

```text
用户切换到 Article 模式
  -> 输入 URL 或使用当前 tab URL
  -> parseArticleFromUrl(url, { pageContext })
  -> 提取正文内容
  -> summarizeArticle({ article })
  -> 调用 OpenRouter provider
  -> 返回结构化 AI 摘要
  -> 页面展示：
     -> shortSummary
     -> keyPoints
     -> actionItems
     -> tags
```

当前结果页支持：

- 复制 summary
- 复制 key points

---

## 11. 认证与数据保存

## 11.1 Supabase 认证

主要文件：

- `src/lib/supabase/client.ts`
- `src/services/auth/authService.ts`
- `src/features/auth/AuthProvider.tsx`
- `src/components/auth/AuthForm.tsx`

当前支持：

- 注册
- 登录
- session 恢复
- 登出

依赖环境变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

如果未配置，系统不会崩溃，但认证和保存能力不可用。

## 11.2 Saved Recipes

主要文件：

- `src/services/savedRecipes/savedRecipesService.ts`
- `src/features/saved-recipes/SavedRecipesPage.tsx`
- `src/features/saved-recipes/SavedRecipeDetailPage.tsx`

当前保存逻辑仅支持 `Recipe` 模式。

Article 分析结果暂未进入保存流程。

---

## 12. Guest Usage 机制

## 12.1 作用

限制游客用户的免费使用次数。

### 12.2 主要文件

- `src/lib/constants.ts`
- `src/services/guestUsage/guestUsageService.ts`

### 12.3 当前实现

使用：

- `chrome.storage.local`

作为扩展环境下的存储介质。

同时保留 `localStorage` fallback 以便非扩展上下文运行。

主要方法：

- `getGuestUsageCount()`
- `incrementGuestUsage()`
- `getRemainingGuestUses()`
- `hasGuestUsesRemaining()`

### 12.4 当前本地测试状态

当前代码里：

- `GUEST_USAGE_LIMIT_DISABLED = true`

这意味着：

- 本地测试不会拦截游客使用次数
- 也不会继续累加使用次数

这是一个临时测试开关，上线前需要恢复为正常限制逻辑。

---

## 13. 页面与状态流转

## 13.1 通用状态

主页面统一使用：

- `idle`
- `loading`
- `result`
- `error`
- `limit`
- `unsupported`

### 13.2 unsupported

如果当前页面属于浏览器受限协议，例如：

- `chrome://`
- `about:`
- `edge://`
- `chrome-extension://`

则进入 unsupported 状态。

### 13.3 error

以下场景会进入 error：

- recipe 提取失败
- article 提取失败
- OpenRouter key 缺失
- OpenRouter 请求失败
- 模型返回结果格式错误

所有错误都会返回用户可理解的文本，而不会让 UI 崩溃。

---

## 14. 环境变量

建议使用：

- `.env.local`

参考文件：

- `.env.example`

当前支持环境变量：

### Supabase

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### OpenRouter

- `VITE_OPENROUTER_API_KEY`
- `VITE_OPENROUTER_MODEL`

### 代码默认模型

如果未显式配置模型，代码默认使用：

- `openai/gpt-4.1-mini`

### 注意

`.env.example` 仅应该作为示例模板使用，真实密钥应放在 `.env.local` 中，不应该作为可提交的真实凭证长期保留。

---

## 15. 本地安装与运行方式

## 15.1 安装依赖

```bash
npm install
```

## 15.2 配置环境变量

在项目根目录创建：

```text
.env.local
```

示例：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_OPENROUTER_MODEL=openai/gpt-4.1-mini
```

## 15.3 类型检查

```bash
npm run typecheck
```

## 15.4 构建扩展

```bash
npm run build:extension
```

## 15.5 Chrome 本地加载

1. 打开 `chrome://extensions`
2. 开启 `Developer mode`
3. 点击 `Load unpacked`
4. 选择项目的 `dist` 目录

## 15.6 每次代码更新后

1. 重新执行：

```bash
npm run build:extension
```

2. 在 `chrome://extensions` 中点击该扩展的 `Reload`

---

## 16. 当前验证方式

当前推荐的基础检查命令：

```bash
npm run typecheck
npm run build:extension
```

这些命令用于保证：

- TypeScript 类型正确
- 扩展入口可正常打包
- dist 目录可重新加载到 Chrome

---

## 17. 注意事项

## 17.1 OpenRouter Key 当前属于开发态方案

当前 OpenRouter key 是直接在扩展端通过 `VITE_OPENROUTER_API_KEY` 读取并请求远程模型。

这只适合：

- 本地开发
- 测试验证

不适合：

- 生产环境
- 面向终端用户发布

未来应迁移为：

- 自建后端
- Supabase Edge Function
- 或其他服务端代理

## 17.2 Recipe Parser 仍是第一版

当前 recipe parser 已经不是 mock 主流程，但依然是规则优先的第一版实现。

这意味着：

- 很多结构化 recipe 页面已可工作
- 但并不能保证所有 recipe 网站都兼容

后续还需要不断补规则与兼容层。

## 17.3 Article 模式当前不保存结果

目前 `Article` 模式只做提取与 AI 总结，不会写入 Supabase。

## 17.4 Guest Usage 当前处于测试放开状态

本地测试已关闭游客使用次数限制。上线前必须重新恢复。

## 17.5 构建完成不等于浏览器已更新

即使已经执行了：

```bash
npm run build:extension
```

也仍然需要手动去 `chrome://extensions` 点击 `Reload`，浏览器里的 unpacked extension 才会切换到新版本。

---

## 18. 关键文件索引

### 扩展基础

- `manifest.json`
- `src/background/service-worker.ts`
- `src/content/content.ts`
- `src/shared/utils/chrome.ts`
- `src/shared/types/extension.ts`

### 主业务页面

- `src/features/recipe-cleaner/RecipeCleanerPage.tsx`
- `src/components/recipe/UrlInput.tsx`
- `src/components/recipe/RecipeResult.tsx`
- `src/components/article/ArticleAnalysisResult.tsx`

### Recipe 模式

- `src/services/recipeParser/recipeParserService.ts`
- `src/services/recipeParser/extractJsonLdRecipe.ts`
- `src/services/recipeParser/extractMicrodataRecipe.ts`
- `src/services/recipeParser/extractReadableRecipe.ts`
- `src/services/recipeParser/normalizeRecipe.ts`

### Article 模式

- `src/services/articleParser/articleParserService.ts`
- `src/services/articleParser/extractReadableContent.ts`
- `src/services/articleParser/normalizeArticle.ts`

### AI Summary

- `src/services/aiSummary/aiSummaryService.ts`
- `src/services/aiSummary/promptTemplates.ts`
- `src/services/aiSummary/providers/openrouterProvider.ts`
- `src/services/aiSummary/types.ts`

### 认证与数据

- `src/lib/supabase/client.ts`
- `src/services/auth/authService.ts`
- `src/services/savedRecipes/savedRecipesService.ts`
- `src/features/auth/AuthProvider.tsx`
- `src/features/saved-recipes/SavedRecipesPage.tsx`
- `src/features/settings/SettingsPage.tsx`

---

## 19. 后续建议

建议后续优先级如下：

### 第一优先级

- 将 OpenRouter 调用迁移到后端或 Edge Function
- 恢复 guest usage 正常限制
- 增强 Recipe Parser 的站点兼容规则

### 第二优先级

- 为 Article 模式增加保存能力
- 区分 Recipe 与 Article 的 usage 计数策略
- 为 Article 结果增加“复制 markdown / 复制全文”功能

### 第三优先级

- 支持 Google OAuth
- 增加历史记录
- 提供更多 AI prompt 模板

---

## 20. 结论

当前 `Recipe Cleaner` 已经从单一 recipe 清洗工具，演进为一个具备双模式内容处理能力的 Chrome Side Panel 扩展：

- `Recipe` 模式负责结构化食谱提取
- `Article` 模式负责正文提取与 AI 摘要

当前系统特点是：

- 扩展骨架稳定
- UI 改动小
- 模块边界清晰
- 后续具备良好的可替换性

当前最重要的工程注意点是：

- OpenRouter key 仍是开发态方案
- recipe/article 解析仍在持续增强阶段
- guest usage 目前为测试放开状态

在这些约束下，当前版本已经适合继续进行本地验证、功能扩展和后续服务端迁移。
