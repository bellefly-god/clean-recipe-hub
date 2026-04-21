# Page Cleaner 支付系统文档

## 概述

Page Cleaner 使用 PayPal 沙盒环境进行订阅支付，支持月付（$3.99）和年付（$29.9）两种方案。

## 技术架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chrome        │     │   阿里云         │     │   Supabase      │
│   Extension     │────▶│   服务器         │────▶│   Database      │
│                 │     │   (Node.js)     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   PayPal        │
                        │   Sandbox API   │
                        └─────────────────┘
```

## 模块说明

### 1. 扩展端 (`src/`)

| 文件 | 说明 |
|------|------|
| `src/components/payment/PayPalButton.tsx` | 支付按钮组件，生成 HMAC 签名 token |
| `src/lib/paymentToken.ts` | HMAC 签名生成/验证工具 |
| `src/pages/Subscription.tsx` | 订阅页面 |

### 2. 服务器端 (`/var/www/recipe-cleaner/`)

| 文件 | 说明 |
|------|------|
| `server.js` | Express 服务器，处理支付回调 |
| `public/subscribe.html` | PayPal 支付页面 |

### 3. Nginx 配置

| 文件 | 说明 |
|------|------|
| `/www/server/panel/vhost/nginx/payment80.conf` | 端口 80 代理到 Node.js 3000 |

## 支付流程

```
1. 用户点击订阅按钮
   └─▶ PayPalButton 生成 HMAC 签名 token
       └─▶ 打开支付页面 https://api.pagecleans.com/subscribe?token=<签名>

2. 用户完成 PayPal 支付
   └─▶ PayPal 返回 subscriptionId
       └─▶ 支付页面调用 /api/save-subscription

3. 服务器验证
   ├─▶ 验证 HMAC 签名（防止篡改）
   ├─▶ 调用 PayPal API 验证 subscriptionId（防止伪造）
   └─▶ 写入 Supabase 数据库

4. 订阅完成
   └─▶ 用户关闭支付页面，返回扩展
```

## 安全机制

### HMAC 签名

**生成逻辑 (`paymentToken.ts`)**:
```
data = userId:plan:email:timestamp
signature = HMAC-SHA256(data, secret)
token = Base64({userId, plan, email, timestamp}) + "." + signature
```

**验证逻辑 (`server.js`)**:
- 解析 token，获取 payload 和 signature
- 验证时间戳（1 小时内有效）
- 用相同密钥重新计算 signature，比对

### PayPal API 验证

支付保存前，服务器调用：
```
GET /v1/billing/subscriptions/{subscriptionId}
Authorization: Bearer {accessToken}
```

验证返回的 `status === 'ACTIVE'` 才写入数据库。

## 配置说明

### 当前配置（沙盒环境）

| 配置项 | 值 | 说明 |
|--------|-----|------|
| PayPal Client ID | `AW73dSqXxXlG5m43rEViG96099ZONDJAJc1z4qpoUmmSXHRPQdoARG8qx1CIjYXVYt2LY0QaO066E1Xz` | 沙盒 App ID |
| PayPal Client Secret | `ENbTGPeo1lnIeN04_N400jLeqAun1uL1qDQ2Hc52s4nhid0d_BZFGqfclEq3k-2IpgVuTm7_wXnsyfyd` | 沙盒密钥 |
| PayPal 月付计划 ID | `P-14Y667762H851883NNHLVNYY` | 沙盒测试计划 |
| PayPal 年付计划 ID | `P-5RA73862FS6145123NHLVNZQ` | 沙盒测试计划 |
| PayPal API 地址 | `https://api-m.sandbox.paypal.com` | 沙盒环境 |
| HMAC Secret | `recipe-cleaner-payment-secret-2024` | 签名密钥 |
| Supabase URL | `https://fhjbztyvzknlmcxiemni.supabase.co` | 数据库地址 |
| Supabase Publishable Key | `sb_publishable_VdwzjWHTRq2ZtfA5s9i7Sg_41rUACAS` | 公开密钥（RLS 已禁用） |

### 生产环境替换清单

上线前需要替换以下值：

#### 1. PayPal 配置（必需）

| 配置项 | 获取位置 | 说明 |
|--------|---------|------|
| `PAYPAL_CLIENT_ID` | PayPal Developer Dashboard → My Apps → App Client ID | 生产环境 App ID |
| `PAYPAL_CLIENT_SECRET` | PayPal Developer Dashboard → My Apps → App Secret | 生产环境密钥 |
| `PAYPAL_MONTHLY_PLAN_ID` | PayPal Developer Dashboard → My Apps → Subscriptions → Plan ID | 月付计划 ID |
| `PAYPAL_YEARLY_PLAN_ID` | PayPal Developer Dashboard → My Apps → Subscriptions → Plan ID | 年付计划 ID |
| `PAYPAL_API_BASE` | `https://api-m.paypal.com` | **改为生产环境地址** |

#### 2. HMAC 密钥（必需）

| 配置项 | 说明 |
|--------|------|
| `HMAC_SECRET` | **必须更换为新的随机字符串**，建议 32+ 字符 |

生成建议：
```bash
openssl rand -hex 32
```

#### 3. Supabase 配置（可选）

| 配置项 | 获取位置 | 说明 |
|--------|---------|------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API | 数据库地址 |
| `SUPABASE_KEY` | Supabase Dashboard → Settings → API → `anon` 密钥 | 公开密钥 |

**建议**：生产环境建议启用 RLS，并使用 Service Role Key 配合服务器端验证。

#### 4. 服务器部署配置

| 配置项 | 说明 |
|--------|------|
| 服务器地址 | 替换所有 `api.pagecleans.com` 为实际域名 |
| HTTPS 证书 | 生产环境必须启用 HTTPS |

## 环境变量配置

生产环境建议使用环境变量，修改 `server.js` 开头：

```javascript
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const HMAC_SECRET = process.env.HMAC_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
```

启动时传入：
```bash
HMAC_SECRET="your-new-secret" PAYPAL_CLIENT_ID="..." node server.js
```

或使用 PM2：
```bash
pm2 start server.js --env production
```

## PayPal Webhook 配置（建议）

生产环境建议配置 Webhook，监听以下事件：

| 事件 | 说明 |
|------|------|
| `BILLING.SUBSCRIPTION.CANCELLED` | 用户取消订阅 |
| `BILLING.SUBSCRIPTION.EXPIRED` | 订阅过期 |
| `BILLING.SUBSCRIPTION.SUSPENDED` | 订阅暂停 |
| `PAYMENT.SALE.COMPLETED` | 支付成功 |

Webhook URL: `https://your-domain.com/api/webhook/paypal`

## 数据库 Schema

参考 `supabase/migrations/001_create_subscriptions.sql`

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  paypal_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  plan TEXT NOT NULL DEFAULT 'free',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

## 故障排查

### 支付成功但数据未保存

1. 检查服务器日志：`/var/www/recipe-cleaner/server.log`
2. 验证 HMAC token 是否有效（1 小时内）
3. 检查 PayPal API 是否可达
4. 检查 Supabase 连接

### PayPal API 错误

常见错误码：
- `401`: Client ID 或 Secret 错误
- `404`: subscriptionId 不存在
- `400`: subscription 状态不是 ACTIVE

### HMAC 验证失败

- 检查扩展端和服务器端 `HMAC_SECRET` 是否一致
- 检查 token 是否过期（1 小时）

## 联系方式

如有问题，请提供：
1. PayPal Subscription ID
2. 用户邮箱
3. 服务器日志截图
