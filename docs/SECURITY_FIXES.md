# Security Fixes - 2026-04-17

This document records the security fixes applied to the clean-recipe-hub project.

## Changes Made

### 1. Environment Variables Configuration (P0)

**Files Modified:**
- `server/server.js` - Now loads environment variables from `.env` file
- `server/package.json` - Added `dotenv` dependency
- `server/.env.example` - Created template for environment variables
- `server/.env` - Created with actual values (NOT committed to git)

**Changes:**
- All sensitive credentials (API keys, secrets) now read from environment variables
- Fallback to hardcoded values for development (with warnings)
- Configuration validation on startup

**Usage:**
```bash
# Install dependencies
cd server && npm install

# Create production .env file
cp .env.example .env
# Edit .env with production values

# Start server
npm start
```

### 2. Payment Plan Verification (P0)

**Files Modified:**
- `server/server.js` - Enhanced `validatePayPalSubscription()` function

**Changes:**
- Added verification that subscription plan matches expected plan
- Server now uses verified plan from PayPal response, not client-provided value
- Logs security events for plan mismatches

**Code:**
```javascript
// Verify the plan ID matches what we expect
const validPlanIds = [PAYPAL_MONTHLY_PLAN_ID, PAYPAL_YEARLY_PLAN_ID];
if (!validPlanIds.includes(subscription.plan_id)) {
  return { valid: false, error: 'Invalid subscription plan' };
}

// Use verified plan from PayPal, not client-provided planId
const verifiedPlan = validationResult.data?.plan || planId;
```

### 3. PayPal Webhook Implementation (P0)

**Files Modified:**
- `server/server.js` - Added webhook endpoint and handlers

**New Endpoints:**
- `POST /api/webhook/paypal` - Receives PayPal webhook events
- `GET /api/webhook/paypal` - Health check for webhook endpoint

**Events Handled:**
- `BILLING.SUBSCRIPTION.ACTIVATED` - Log only
- `BILLING.SUBSCRIPTION.CANCELLED` - Update database status
- `BILLING.SUBSCRIPTION.EXPIRED` - Update database status
- `BILLING.SUBSCRIPTION.SUSPENDED` - Update database status
- `PAYMENT.SALE.COMPLETED` - Update subscription period
- `PAYMENT.SALE.DENIED` - Log for review
- `PAYMENT.SALE.REFUNDED` - Log for review
- `PAYMENT.SALE.REVERSED` - Log for review

**Configuration:**
```bash
# Add to .env
PAYPAL_WEBHOOK_ID=your_webhook_id_here
```

### 4. XSS Protection Enhancement (P1)

**Files Modified:**
- `src/components/article/ArticleAnalysisResult.tsx`
- `package.json` - Added `dompurify` and `@types/dompurify`

**Changes:**
- Replaced custom sanitization with DOMPurify library
- Added strict whitelist of allowed HTML tags
- Added protection against event handler attributes
- All external links now have `rel="noreferrer noopener"` and `target="_blank"`

**Allowed Tags:**
```javascript
['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
 'strong', 'em', 'b', 'i', 'u', 's',
 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
 'div', 'span', 'figure', 'figcaption']
```

### 5. Message Source Verification (P1)

**Files Modified:**
- `src/background/service-worker.ts`

**Changes:**
- Added verification that messages come from trusted origins
- Only allows messages from `api.pagecleans.com` and file:// URLs
- Logs and rejects messages from untrusted sources

```javascript
const allowedOrigins = [
  'https://api.pagecleans.com',
  'null', // file:// URLs
];
```

## Environment Variables Reference

### Required for Production

```bash
# Server
PORT=3000
NODE_ENV=production

# PayPal (REQUIRED for payment to work)
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_client_secret
PAYPAL_API_BASE=https://api-m.paypal.com
PAYPAL_MONTHLY_PLAN_ID=your_monthly_plan_id
PAYPAL_YEARLY_PLAN_ID=your_yearly_plan_id
PAYPAL_WEBHOOK_ID=your_webhook_id

# AI APIs (REQUIRED for AI features)
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Security (REQUIRED - generate with: openssl rand -hex 32)
HMAC_SECRET=your_hmac_secret_min_32_chars

# Server Domain
SERVER_DOMAIN=https://api.pagecleans.com
```

## Git Safety

Updated `.gitignore` to prevent committing sensitive files:
- `*.env` - All environment files
- `server/.env` - Server-specific env
- `*.pem`, `*.key` - SSL certificates
- `credentials.json` - Credential files

**Important:** The `.env.example` file IS committed, but contains placeholder values only.

## Remaining Security Tasks

1. [ ] Generate new HMAC_SECRET for production (use `openssl rand -hex 32`)
2. [ ] Configure PayPal Webhook in PayPal Developer Dashboard
3. [ ] Move API keys to secure storage (AWS Secrets Manager, HashiCorp Vault, etc.)
4. [ ] Enable Supabase Row Level Security (RLS)
5. [ ] Implement rate limiting on API endpoints
6. [ ] Add request logging and monitoring
7. [ ] Set up automated security scanning

## Testing Checklist

After deploying:

- [ ] Payment flow works (subscribe, cancel)
- [ ] AI summary feature works
- [ ] Webhook events are received and processed
- [ ] No console errors in extension
- [ ] XSS attempts are blocked
- [ ] Invalid payment tokens are rejected
- [ ] Plan verification prevents plan mismatch attacks

## Rollback Plan

If issues arise after deployment:

1. Revert to previous `server/server.js` version
2. Re-add hardcoded credentials (temporary)
3. Deploy hotfix
4. Document issues

## Date: 2026-04-17
