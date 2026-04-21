# Chrome Web Store 上架指南

## 我已完成的工作

### 1. 隐私政策页面
- 文件：`/public/privacy.html`
- 包含：信息收集、数据使用、第三方服务、用户权利等

### 2. 服务条款页面
- 文件：`/public/terms.html`
- 包含：订阅条款、退款政策、使用规范等

### 3. 首页
- 文件：`/public/index.html`
- 作为法律页面的入口

### 4. 服务器路由更新
- `/privacy.html` - 隐私政策
- `/terms.html` - 服务条款
- `/auth-callback` - 认证回调（处理 hash 格式）

---

## 你需要提供的内容

### 1. 插件图标（必须）
请提供以下尺寸的 PNG 图标（透明背景）：
- 16x16 像素（favicon）
- 48x48 像素（扩展管理页面）
- 128x128 像素（Web Store 显示）

图标设计建议：
- 简洁的扫帚或清洁相关图形
- 单色或双色设计
- 确保在不同尺寸下都清晰可辨

### 2. 替换联系邮箱
在以下文件中搜索 `support@pagecleaner.app`，替换为你实际的联系邮箱：
- `/public/privacy.html`
- `/public/terms.html`

### 3. Google 开发者账号
- 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- 注册开发者账号（$5 一次性费用）
- 准备一个 Google 账号

### 4. PayPal 沙盒转生产（如需要）
当前使用的是 PayPal 沙盒环境：
- `PAYPAL_CLIENT_ID`: 沙盒 ID
- `PAYPAL_CLIENT_SECRET`: 沙盒密钥
- 上线前需替换为生产环境凭证

---

## 你需要手动执行的步骤

### 步骤 1：部署服务器更新

在服务器上执行：

```bash
# 上传新文件
scp server.js root@api.pagecleans.com:/var/www/recipe-cleaner/server.js
scp public/* root@api.pagecleans.com:/var/www/recipe-cleaner/public/

# 重启服务
pkill -f 'node server.js'
cd /var/www/recipe-cleaner
nohup node server.js > server.log 2>&1 &
```

### 步骤 2：配置 Supabase URL

在 [Supabase Dashboard](https://supabase.com/dashboard)：
1. 进入 **Authentication** → **URL Configuration**
2. 设置 **Site URL**: `https://api.pagecleans.com`
3. 添加 **Redirect URLs**:
   - `https://api.pagecleans.com/auth-callback`
   - `https://api.pagecleans.com/*`

### 步骤 3：准备图标

如果你是设计师：
1. 设计图标（推荐 512x512 源文件）
2. 导出为 16x16, 48x48, 128x128 PNG

如果你不是设计师：
1. 在 Fiverr 或 Upwork 上找设计师
2. 或使用 Canva/Figma 制作简单图标

### 步骤 4：替换联系邮箱

编辑 `/public/privacy.html` 和 `/public/terms.html`，将 `support@pagecleaner.app` 替换为你的邮箱。

### 步骤 5：构建并打包扩展

```bash
# 构建扩展
npm run build:extension

# 打包
cd dist && zip -r ../release/page-cleaner.zip .
```

### 步骤 6：创建 Store 截图

需要 3-5 张截图展示核心功能：
- 扩展安装后的侧边栏界面
- 页面清洗效果对比
- AI 分析功能展示
- 订阅页面

推荐尺寸：
- 1280x800 像素（最佳）
- 或 640x400 像素

### 步骤 7：注册 Chrome Web Store 开发者账号

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 支付 $5 注册费
3. 填写开发者信息

### 步骤 8：上传扩展

1. 点击 "新增项目"
2. 上传 `.zip` 文件
3. 填写以下信息：
   - **扩展名称**: Page Cleaner
   - **简短描述** (最多 80 字符)
   - **详细描述**: 功能介绍和使用说明
   - **分类**: 工具类
   - **语言**: 英文

### 步骤 9：配置支付

在 PayPal 开发者平台：
1. 创建生产环境应用
2. 获取生产环境的 Client ID 和 Secret
3. 更新服务器环境变量

---

## 上线前检查清单

- [ ] 服务器部署完成并运行
- [ ] Privacy Policy 页面可访问
- [ ] Terms of Service 页面可访问
- [ ] Supabase Site URL 已配置
- [ ] 插件图标已准备（16x16, 48x48, 128x128）
- [ ] Store 截图已准备（3-5 张）
- [ ] Chrome Web Store 开发者账号已注册
- [ ] PayPal 生产环境已配置（可选，沙盒也可发布）
- [ ] 联系邮箱已更新
- [ ] 扩展已打包上传

---

## 可选：注册域名

虽然可以用 IP 上架，但注册域名有以下好处：
- 更专业，用户信任度更高
- 可配置 HTTPS（Chrome 未来可能要求）
- PayPal 生产环境建议使用 HTTPS

推荐域名注册商：
- Namecheap
- GoDaddy
- Cloudflare Registrar

---

## 注意事项

1. **审核时间**: Chrome Web Store 审核通常需要 1-7 天
2. **审核被拒**: 如果被拒，查看拒绝原因并修改后重新提交
3. **常见被拒原因**:
   - 功能描述不清晰
   - 图标尺寸不符合要求
   - 缺少隐私政策
   - 权限过多未作说明
