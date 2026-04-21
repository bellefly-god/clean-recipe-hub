# Page Cleaner Chrome 扩展发布指南

## 一、发布前检查清单

### 1. 代码准备
- [x] 前端代码已构建 (`npm run build`)
- [x] 生产环境 PayPal 配置已更新
- [x] manifest.json 版本号已确认 (当前: 1.0.0)
- [x] 图标文件已准备 (icon16.png, icon48.png, icon128.png)

### 2. 必需资源
- [ ] 隐私政策页面: https://api.pagecleans.com/privacy.html
- [ ] 服务条款页面: https://api.pagecleans.com/terms.html
- [ ] 扩展截图 (1280x800 或 640x400)
- [ ] 宣传图片 (可选, 1280x800)

---

## 二、打包扩展

### 方法 1: 手动打包

```bash
cd ~/Desktop/ai-project/clean-recipe-hub

# 创建发布目录
mkdir -p release-package

# 复制必需文件
cp -r dist/* release-package/
cp manifest.json release-package/
cp public/icon*.png release-package/

# 打包为 zip
cd release-package
zip -r ../page-cleaner-extension-v1.0.0.zip .
cd ..
rm -rf release-package

echo "扩展已打包: page-cleaner-extension-v1.0.0.zip"
```

### 方法 2: 使用脚本打包

```bash
cd ~/Desktop/ai-project/clean-recipe-hub
npm run build
zip -r page-cleaner-extension-v1.0.0.zip dist/ manifest.json public/icon*.png
```

---

## 三、发布到 Chrome Web Store

### 步骤 1: 登录开发者仪表板

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/dev/dashboard)
2. 使用 Google 账号登录
3. 支付一次性注册费 **$5 USD**（如果还没有）

### 步骤 2: 添加新扩展

1. 点击 **"Add new item"** 或 **"添加新项目"**
2. 上传 zip 文件: `page-cleaner-extension-v1.0.0.zip`
3. 等待上传和处理完成

### 步骤 3: 填写商店信息

#### 基本信息
| 字段 | 内容 |
|------|------|
| **Name** | Page Cleaner |
| **Short description** (132字符) | Open any page in a clean Chrome side panel with AI-powered analysis and summary. |
| **Detailed description** | 见下方 |

#### 详细描述 (Detailed Description)
```
Page Cleaner - Your Intelligent Reading Companion

🧹 Clean Reading Experience
Transform any cluttered webpage into a clean, distraction-free reading experience. Perfect for articles, blogs, recipes, news, and more.

🤖 AI-Powered Analysis
Get instant AI summaries and insights:
• One-sentence summary
• Key points extraction
• Content type detection (news, blog, recipe, tutorial, etc.)
• Fact vs opinion analysis
• Target audience identification

✨ Features
• Side panel integration - Read without leaving your current tab
• One-click clean view - Instantly transform any page
• AI summary - Understand content in seconds
• Multiple page types - Articles, recipes, tutorials, news, and more
• Dark/Light mode - Comfortable reading anytime
• Save and export - Keep your cleaned pages

💡 Perfect For
• News readers who want quick summaries
• Recipe enthusiasts who need clean instructions
• Researchers who analyze multiple articles
• Anyone who values distraction-free reading

🔒 Privacy First
• No data collection beyond what's needed for the service
• Your reading history stays private
• Secure authentication with Supabase

Start reading smarter today with Page Cleaner!
```

#### 分类
| 字段 | 选择 |
|------|------|
| **Category** | Productivity |
| **Language** | English |

#### 隐私信息
| 字段 | 内容 |
|------|------|
| **Privacy Policy URL** | https://api.pagecleans.com/privacy.html |
| **Single Purpose** | Display web pages in a clean, readable format with AI-powered analysis in the Chrome side panel. |

#### 权限说明
| 权限 | 用途说明 |
|------|---------|
| `storage` | Store user preferences and subscription status |
| `tabs` | Access current tab URL for cleaning |
| `sidePanel` | Display clean view in Chrome side panel |
| `scripting` | Extract page content for cleaning |
| `activeTab` | Access current tab content when user clicks extension |

### 步骤 4: 上传截图和图片

#### 必需截图 (至少 1 张，最多 5 张)
- 尺寸: 1280x800 或 640x400
- 格式: PNG 或 JPEG
- 内容建议:
  1. 扩展主界面截图
  2. AI 分析结果截图
  3. 设置页面截图

#### 小型宣传图 (可选)
- 尺寸: 440x280
- 用于搜索结果展示

#### 大型宣传图 (可选)
- 尺寸: 1280x800
- 用于商店详情页

### 步骤 5: 设置定价

| 选项 | 选择 |
|------|------|
| **Pricing** | Free (免费) |
| **Payment** | 使用扩展内订阅 (PayPal) |

注意: Chrome 商店不允许扩展内购买，但允许使用外部支付系统。

### 步骤 6: 提交审核

1. 检查所有信息是否正确
2. 点击 **"Submit for review"**
3. 等待审核结果

---

## 四、审核时间

- **通常时间**: 1-3 个工作日
- **首次提交**: 可能需要更长时间
- **审核状态**: 可在 Developer Dashboard 查看

---

## 五、审核常见问题

### 1. 权限问题
如果被拒绝，确保:
- 每个权限都有清晰的用途说明
- 使用最小权限原则
- Single Purpose 描述清晰

### 2. 隐私政策
确保:
- 隐私政策 URL 可访问
- 明确说明数据收集和使用
- 包含用户权利说明

### 3. 内容政策
确保:
- 无误导性描述
- 无虚假功能声明
- 截图真实反映功能

---

## 六、发布后维护

### 更新扩展
1. 修改代码
2. 更新 manifest.json 中的 version
3. 重新构建: `npm run build`
4. 打包上传
5. 提交审核

### 版本号规则
- **Major (x.0.0)**: 重大功能更新
- **Minor (1.x.0)**: 新功能添加
- **Patch (1.0.x)**: Bug 修复

---

## 七、快速命令参考

```bash
# 构建扩展
cd ~/Desktop/ai-project/clean-recipe-hub
npm run build

# 打包扩展 (版本 1.0.0)
zip -r page-cleaner-extension-v1.0.0.zip \
  dist/ \
  manifest.json \
  public/icon16.png \
  public/icon48.png \
  public/icon128.png

# 查看包内容
unzip -l page-cleaner-extension-v1.0.0.zip

# 查看包大小
ls -lh page-cleaner-extension-v1.0.0.zip
```

---

## 八、相关链接

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/dev/dashboard)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/policies/)
- [Extension Publishing Guide](https://developer.chrome.com/docs/webstore/publish/)

---

*文档创建时间: 2026-04-18*
*项目: Page Cleaner Chrome Extension*
