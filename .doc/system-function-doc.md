# Recipe Cleaner Chrome Extension 系统功能文档

## 1. 文档目的

本文档用于说明当前 `Recipe Cleaner` 项目的系统定位、功能流程、代码结构、关键实现方式、构建产物和后续扩展点。

当前项目已从普通的 `React + Vite + TypeScript + Tailwind + Supabase` Web App 改造为基于 **Chrome Extension Manifest V3** 的 **Chrome 侧边栏扩展**，核心运行方式为：

1. 用户打开任意食谱网页
2. 点击 Chrome 扩展图标
3. Chrome Side Panel 打开
4. 扩展读取当前活动页 URL、标题和部分 metadata
5. 侧边栏加载现有 Recipe Cleaner UI
6. 自动预填当前页面 URL
7. 用户执行清洗流程
8. 游客用户可免费使用 3 次
9. 登录用户可通过 Supabase 保存食谱

---

## 2. 系统定位

### 2.1 产品目标

`Recipe Cleaner` 的目标是将冗长、广告过多、信息噪音严重的 recipe 页面，转化为简洁可读的结构化食谱内容。

### 2.2 当前版本能力

当前版本重点完成的是 **扩展架构改造**，不是业务视觉重做，因此尽量复用了原有 Lovable 生成的 UI 组件和页面交互。

当前具备的核心能力：

- 支持 Chrome 扩展 Manifest V3
- 支持 Chrome Side Panel API
- 支持通过 content script 读取当前网页上下文
- 支持在 Side Panel 中复用原有 Recipe Cleaner UI
- 支持游客 3 次免费清洗
- 支持账号登录
- 支持将清洗结果保存到 Supabase
- 支持查看已保存食谱
- 支持设置页查看账号、访客使用情况和 Supabase 状态

---

## 3. 系统整体架构

### 3.1 技术栈

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase JS Client
- Chrome Extension Manifest V3

### 3.2 架构分层

当前代码按以下层次组织：

- `background`
  负责扩展后台行为，例如点击扩展图标后打开 Side Panel
- `content`
  运行在网页上下文中，负责读取页面标题、URL、description、canonical 等信息
- `sidepanel`
  侧边栏入口页
- `options`
  扩展设置页入口
- `features`
  业务功能层，包括认证、食谱清洗、已保存食谱、设置页
- `services`
  业务服务层，包括认证服务、访客额度服务、解析服务、保存服务
- `lib`
  公共基础库，例如 Supabase Client
- `shared`
  扩展通信、类型定义、工具函数

---

## 4. 当前项目目录说明

### 4.1 核心目录

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
      AuthPage.tsx
      AuthProvider.tsx
    recipe-cleaner/
      RecipeCleanerPage.tsx
    saved-recipes/
      SavedRecipeDetailPage.tsx
      SavedRecipesPage.tsx
    settings/
      SettingsPage.tsx
  services/
    auth/
      authService.ts
    guestUsage/
      guestUsageService.ts
    recipeParser/
      recipeParserService.ts
    savedRecipes/
      savedRecipesService.ts
  lib/
    supabase/
      client.ts
      index.ts
  shared/
    messaging/
      messages.ts
    types/
      extension.ts
    utils/
      chrome.ts
      errors.ts
      url.ts
```

### 4.2 兼容层

为了减少原有代码改动，还保留了部分兼容导出文件：

- `src/hooks/useAuth.tsx`
- `src/services/guestUsage.ts`
- `src/services/recipeParser.ts`
- `src/lib/supabase.ts`

这些文件本质上是转发到新的模块实现，目的是尽量不破坏旧组件引用。

---

## 5. 系统功能说明

## 5.1 功能一：点击扩展图标打开 Side Panel

### 功能描述

用户在 Chrome 中打开任意页面后，点击扩展图标，系统打开 `Recipe Cleaner` Side Panel。

### 实现位置

- `manifest.json`
- `src/background/service-worker.ts`

### 实现细节

`manifest.json` 中声明：

- `action`
- `side_panel.default_path`
- `background.service_worker`

后台脚本通过 `chrome.action.onClicked` 监听扩展图标点击事件，然后调用：

- `chrome.sidePanel.setOptions`
- `chrome.sidePanel.open`

这样可以让当前 tab 打开侧边栏页面。

### 流程

1. 用户点击扩展图标
2. background service worker 收到事件
3. 设置当前 tab 的 side panel 路径
4. 打开对应 side panel

---

## 5.2 功能二：读取当前网页信息

### 功能描述

系统在侧边栏中需要知道当前网页：

- URL
- 标题
- description
- canonical URL
- site name

### 实现位置

- `src/content/content.ts`
- `src/shared/messaging/messages.ts`
- `src/shared/utils/chrome.ts`

### 实现细节

`content.ts` 注入到普通网页中，在 `document_idle` 阶段执行，监听来自扩展的消息。

当收到 `GET_PAGE_CONTEXT` 消息时，content script 会返回：

- `window.location.href`
- `document.title`
- `meta[name="description"]`
- `meta[property="og:description"]`
- `link[rel="canonical"]`
- `meta[property="og:site_name"]`

### 流程

1. Side Panel 启动
2. React 页面调用 `getActiveTab()`
3. 获取活动标签页 ID、URL、title
4. 再使用 `chrome.tabs.sendMessage` 请求 content script
5. content script 返回页面上下文
6. Side Panel 将 URL 预填到输入框

---

## 5.3 功能三：加载 Recipe Cleaner 主页面

### 功能描述

Side Panel 中复用原有 Recipe Cleaner 首页 UI，不重新设计产品界面。

### 实现位置

- `src/sidepanel/main.tsx`
- `src/app/ExtensionApp.tsx`
- `src/features/recipe-cleaner/RecipeCleanerPage.tsx`

### 实现细节

项目不再使用传统网站根入口作为唯一入口，而是改为多入口：

- Side Panel 入口
- Options 入口
- Background 入口
- Content Script 入口

其中 Side Panel 入口加载 `ExtensionApp`，并通过 `HashRouter` 承载扩展内部路由。

### 页面状态

`RecipeCleanerPage` 维护以下状态：

- `idle`
- `loading`
- `result`
- `error`
- `limit`
- `unsupported`

这些状态对应当前 UI 中的不同显示内容，尽量复用已有组件：

- `UrlInput`
- `RecipeLoadingSkeleton`
- `RecipeResult`
- `GuestLimit`

---

## 5.4 功能四：自动预填当前页面 URL

### 功能描述

用户打开 side panel 后，当前活动标签页 URL 会自动填入输入框。

### 实现位置

- `src/features/recipe-cleaner/RecipeCleanerPage.tsx`
- `src/components/recipe/UrlInput.tsx`

### 实现细节

`RecipeCleanerPage` 在首次挂载时：

1. 调用 `getActiveTab()`
2. 如果 URL 合法且不是受限页面
3. 把 URL 写入 `currentUrl`
4. 将 `currentUrl` 作为 `initialValue` 传入 `UrlInput`

`UrlInput` 已修改为支持 `initialValue`，可在组件内部同步输入框默认值。

### 特殊处理

如果当前页面属于以下协议，则视为不可直接读取：

- `chrome://`
- `edge://`
- `about:`
- `view-source:`
- `chrome-extension:`

此时页面进入 `unsupported` 状态。

---

## 5.5 功能五：食谱清洗流程

### 功能描述

用户输入或使用自动带入的 URL，点击清洗后，系统执行 recipe parsing 服务，返回清洗结果。

### 实现位置

- `src/features/recipe-cleaner/RecipeCleanerPage.tsx`
- `src/services/recipeParser/recipeParserService.ts`

### 当前实现状态

当前解析服务仍然是 **Mock Parser**，但已完成模块隔离，方便后续替换为真实接口。

### 解析服务职责

`parseRecipeFromUrl(url, options)` 当前负责：

- 校验 URL 是否为 http/https
- 模拟异步延迟
- 基于当前页面上下文生成标题和摘要
- 返回结构化 recipe 数据

### 返回结构

返回内容包括：

- title
- sourceUrl
- sourceDomain
- summary
- ingredients
- steps
- notes

### 后续可替换方向

未来可以将该服务替换成以下任一方案：

- Supabase Edge Function
- 第三方食谱抽取 API
- 后台服务抓取与清洗

由于 UI 层仅依赖统一服务接口，因此替换成本较低。

---

## 5.6 功能六：游客免费使用次数控制

### 功能描述

未登录用户可以免费清洗 3 次。

### 实现位置

- `src/services/guestUsage/guestUsageService.ts`
- `src/lib/constants.ts`
- `src/components/recipe/GuestLimit.tsx`

### 实现细节

配置常量：

- `MAX_GUEST_USES = 3`
- `GUEST_USAGE_KEY = "recipe_cleaner_guest_uses"`

游客计数逻辑优先使用：

- `chrome.storage.local`

如果运行环境不是扩展环境，则回退到：

- `localStorage`

### 核心方法

- `getGuestUsageCount()`
- `incrementGuestUsage()`
- `getRemainingGuestUses()`
- `hasGuestUsesRemaining()`

### 使用流程

1. 页面初始化时读取剩余次数
2. 用户点击清洗前检查是否还有剩余次数
3. 若无剩余次数，切换到 `limit` 状态
4. 若有剩余次数，清洗成功后递增计数
5. UI 显示剩余免费次数

### 设计说明

该逻辑被单独隔离在 service 层，后续若改为服务端配额校验，可直接替换实现，而不影响页面逻辑。

---

## 5.7 功能七：账号认证

### 功能描述

支持用户通过 Supabase 进行邮箱密码登录和注册。

### 实现位置

- `src/lib/supabase/client.ts`
- `src/services/auth/authService.ts`
- `src/features/auth/AuthProvider.tsx`
- `src/features/auth/AuthPage.tsx`
- `src/components/auth/AuthForm.tsx`

### 实现细节

Supabase Client 通过环境变量初始化：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

若环境变量不存在，则客户端为 `null`，系统进入“未配置认证”模式，UI 会提示但不会崩溃。

### AuthProvider 职责

`AuthProvider` 负责：

- 初始化 session
- 监听认证状态变化
- 暴露 `user`
- 暴露 `loading`
- 暴露 `signOut`
- 暴露 `isConfigured`

### 页面行为

- 未登录时可进入 `/auth`
- 已登录访问 `/auth` 会被重定向回首页
- 设置页中可查看账号信息并退出登录

### Google 登录

当前保留了 Google 登录按钮占位，但未启用，仅作为未来扩展预留。

---

## 5.8 功能八：保存食谱到 Supabase

### 功能描述

登录用户可以将清洗结果保存到 Supabase。

### 实现位置

- `src/services/savedRecipes/savedRecipesService.ts`
- `src/features/recipe-cleaner/RecipeCleanerPage.tsx`
- `src/features/saved-recipes/SavedRecipesPage.tsx`
- `src/features/saved-recipes/SavedRecipeDetailPage.tsx`

### 实现细节

保存服务封装了以下能力：

- `listSavedRecipes(userId)`
- `getSavedRecipeById(userId, recipeId)`
- `saveRecipe(userId, recipe)`
- `deleteSavedRecipe(userId, recipeId)`

### 数据表约定

当前实现默认 Supabase 存在 `saved_recipes` 表，字段包括：

- `id`
- `user_id`
- `title`
- `source_url`
- `source_domain`
- `summary`
- `ingredients`
- `steps`
- `notes`
- `raw_content`
- `created_at`

### 页面流程

1. 用户登录
2. 完成 recipe clean
3. 点击 `Save recipe`
4. 页面调用 `saveRecipe(user.id, recipe)`
5. 成功后 toast 提示

### 已保存食谱页面

`SavedRecipesPage` 会查询当前用户的所有食谱，并支持：

- 列表展示
- 打开详情
- 删除食谱

详情页 `SavedRecipeDetailPage` 复用 `RecipeResult` 组件展示。

---

## 5.9 功能九：设置页

### 功能描述

设置页用于展示当前用户状态和扩展运行信息。

### 实现位置

- `src/features/settings/SettingsPage.tsx`
- `src/options/main.tsx`

### 当前显示内容

- 当前账号信息
- 游客已使用次数
- Supabase 是否配置完成
- 退出登录按钮

### 特殊行为

当从 options 入口打开扩展时，`ExtensionApp` 会自动将默认路由重定向到 `/settings`。

---

## 6. 路由设计

系统内部通过 `HashRouter` 管理路由，主要是为了更适配扩展页面环境。

当前路由如下：

- `/`：Recipe Cleaner 主页面
- `/auth`：登录/注册页面
- `/saved`：已保存食谱列表
- `/saved/:recipeId`：已保存食谱详情
- `/settings`：设置页

---

## 7. 多入口构建设计

### 7.1 为什么需要多入口

Chrome 扩展不是单页网站模式，至少会包含：

- 一个 Side Panel 页面
- 一个 Options 页面
- 一个 Background Service Worker
- 一个 Content Script

因此项目构建需要支持多个入口文件。

### 7.2 实现位置

- `vite.config.ts`

### 7.3 当前构建入口

Vite 配置中声明了以下 Rollup 输入：

- `src/sidepanel/index.html`
- `src/options/index.html`
- `src/background/service-worker.ts`
- `src/content/content.ts`

同时通过自定义插件在构建时复制：

- `manifest.json`

到最终 `dist` 目录。

### 7.4 构建输出

当前构建后会生成：

```text
dist/
  manifest.json
  service-worker.js
  content.js
  sidepanel.js
  options.js
  src/
    sidepanel/index.html
    options/index.html
  assets/
    index.css
    index-*.js
```

这套输出已经可以直接用于 Chrome 的 `Load unpacked`。

---

## 8. 核心业务流程

## 8.1 主功能流程：从网页到清洗结果

```text
用户打开 recipe 网页
  -> 点击扩展图标
  -> background 打开 side panel
  -> side panel React 应用启动
  -> 查询 active tab
  -> 通过 content script 获取 page context
  -> 将 URL 预填到输入框
  -> 用户点击 Clean Recipe
  -> 检查 guest limit / 登录状态
  -> 调用 parser service
  -> 返回 recipe 结构化结果
  -> 使用 RecipeResult 组件展示
  -> 登录用户可保存到 Supabase
```

## 8.2 游客配额流程

```text
用户点击清洗
  -> 调用 hasGuestUsesRemaining()
  -> 若无剩余次数，进入 limit 状态
  -> 若有剩余次数，继续清洗
  -> 清洗成功后 incrementGuestUsage()
  -> 重新读取剩余次数并更新 UI
```

## 8.3 保存食谱流程

```text
用户已登录
  -> 在结果页点击 Save recipe
  -> 调用 saveRecipe(user.id, recipe)
  -> Supabase 插入 saved_recipes
  -> 返回保存后的记录
  -> 页面 toast 提示保存成功
```

---

## 9. Manifest 配置说明

### 当前关键配置

- `manifest_version: 3`
- `action`
- `side_panel.default_path`
- `options_page`
- `background.service_worker`
- `permissions`
- `host_permissions`
- `content_scripts`

### 权限说明

- `storage`
  用于存储游客使用次数
- `tabs`
  用于读取当前活动页
- `sidePanel`
  用于打开 Chrome 侧边栏

### Host 权限

```json
[
  "http://*/*",
  "https://*/*"
]
```

用于在普通网页上注入 content script 并读取页面上下文。

---

## 10. 关键实现细节

## 10.1 复用现有 UI 的策略

本次改造没有重做视觉层，而是尽量保留以下资产：

- 原有 Tailwind 主题
- shadcn/ui 组件体系
- URL 输入组件
- 结果展示组件
- 加载骨架屏
- GuestLimit 提示组件
- AuthForm 登录表单

因此改动重点不在 UI，而在运行形态和架构拆分。

## 10.2 为什么使用 HashRouter

Chrome 扩展页面路径与普通 Web 站点不同，且 Side Panel / Options 页面不适合依赖服务端路由。

使用 `HashRouter` 的优点：

- 不依赖服务器 rewrite
- 扩展页面跳转稳定
- Side Panel 与 Options 可以共用同一个路由系统

## 10.3 为什么把 guestUsage、recipeParser、savedRecipes 都拆到 service 层

这是为了让页面只负责：

- 状态切换
- 用户交互
- 结果展示

而将业务规则集中到 service 层，方便后续：

- 替换解析接口
- 替换配额策略
- 替换 Supabase 为其他后端

## 10.4 为什么保留兼容导出文件

原项目中很多组件是直接引用旧路径的。如果一次性大规模改引用，会造成更大风险和更多无关变更。

因此使用兼容转发文件，是一种更稳妥的渐进式重构策略。

---

## 11. 环境变量说明

当前认证与保存能力依赖以下环境变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

如果没有配置：

- 登录功能不可用
- 保存食谱不可用
- 页面会提示未配置，但系统仍可运行在 demo/mock 模式

---

## 12. 本地运行与加载方式

### 12.1 安装依赖

```bash
npm install
```

### 12.2 构建扩展

```bash
npm run build:extension
```

### 12.3 本地加载到 Chrome

1. 打开 `chrome://extensions`
2. 开启右上角 `Developer mode`
3. 点击 `Load unpacked`
4. 选择项目下的 `dist` 目录

### 12.4 当前已验证

已通过：

- `npm run build:extension`
- `npm run typecheck`
- `npm run lint`

其中 lint 仅剩少量 `react-refresh/only-export-components` 警告，不影响扩展构建与使用。

---

## 13. 当前限制

### 13.1 Parser 仍为 Mock

当前食谱清洗结果来自 mock service，不是真实网页解析结果。

### 13.2 未实现自动清洗

当前是自动预填 URL，但没有在 side panel 打开后立刻自动调用清洗。

这是有意保守处理，避免用户在每次点击扩展时都自动触发请求。

### 13.3 图标资源未补齐

当前 manifest 未配置正式图标资源，后续可补：

- 16x16
- 32x32
- 48x48
- 128x128

### 13.4 saved_recipes 表需要后端配合

前端代码已就绪，但 Supabase 中需要存在正确的数据表和字段结构。

---

## 14. 推荐后续迭代方向

### 第一优先级

- 将 `recipeParserService` 替换为真实解析服务
- 增加解析失败原因的分类
- 增加重复保存去重逻辑

### 第二优先级

- 补齐扩展图标
- 增加最近清洗历史
- 增加设置项，例如自动清洗开关

### 第三优先级

- 支持 Google OAuth
- 支持服务端额度控制
- 支持离线缓存最近一次清洗结果

---

## 15. 关键文件索引

### 扩展入口

- `manifest.json`
- `src/background/service-worker.ts`
- `src/content/content.ts`
- `src/sidepanel/main.tsx`
- `src/options/main.tsx`

### 应用壳层

- `src/app/ExtensionApp.tsx`
- `src/app/AppProviders.tsx`

### 核心业务

- `src/features/recipe-cleaner/RecipeCleanerPage.tsx`
- `src/services/recipeParser/recipeParserService.ts`
- `src/services/guestUsage/guestUsageService.ts`
- `src/services/savedRecipes/savedRecipesService.ts`

### 认证

- `src/features/auth/AuthProvider.tsx`
- `src/components/auth/AuthForm.tsx`
- `src/lib/supabase/client.ts`

### 通信与工具

- `src/shared/messaging/messages.ts`
- `src/shared/types/extension.ts`
- `src/shared/utils/chrome.ts`
- `src/shared/utils/url.ts`

---

## 16. 结论

当前项目已经完成从普通 Web App 到 Chrome Side Panel Extension 的第一阶段改造，重点成果是：

- 扩展运行架构已建立
- 现有 UI 已复用
- 页面读取链路已打通
- 访客配额逻辑已迁移到 `chrome.storage.local`
- Supabase 认证与保存能力已模块化
- 构建产物可直接通过 Chrome 加载

后续只需要围绕 parser 能力、后端数据表和体验细节持续增强，即可逐步演进为可正式使用的 Recipe Cleaner Chrome 扩展。
