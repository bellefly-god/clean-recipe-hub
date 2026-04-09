-- =====================================================
-- Clean Recipe Hub - Subscription & Usage Tables
-- Run this in Supabase SQL Editor
-- =====================================================

-- 用户订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  paypal_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'canceled', 'expired', 'inactive')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro_monthly', 'pro_yearly')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 使用记录表（替代 localStorage，支持多设备）
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('clean', 'summary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 访客使用记录表（未登录用户）
CREATE TABLE IF NOT EXISTS guest_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  browser_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('clean', 'summary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal ON subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_user ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_created ON usage_records(created_at);
CREATE INDEX IF NOT EXISTS idx_guest_usage_browser ON guest_usage(browser_id);
CREATE INDEX IF NOT EXISTS idx_guest_usage_created ON guest_usage(created_at);

-- 启用 RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_usage ENABLE ROW LEVEL SECURITY;

-- RLS 策略
-- subscriptions: 用户只能查看和管理自己的订阅
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- usage_records: 用户只能查看自己的使用记录
CREATE POLICY "Users can view own usage"
  ON usage_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON usage_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- guest_usage: 允许匿名插入和查询（浏览器ID识别）
CREATE POLICY "Anyone can view guest usage"
  ON guest_usage FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert guest usage"
  ON guest_usage FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- Helper Functions
-- =====================================================

-- 检查用户是否为付费用户
CREATE OR REPLACE FUNCTION is_premium_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户使用次数（最近30天）
CREATE OR REPLACE FUNCTION get_usage_count(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM usage_records
    WHERE user_id = p_user_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取访客使用次数（最近30天）
CREATE OR REPLACE FUNCTION get_guest_usage_count(p_browser_id TEXT, p_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM guest_usage
    WHERE browser_id = p_browser_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户订阅状态
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  status TEXT,
  plan TEXT,
  current_period_end TIMESTAMPTZ,
  paypal_subscription_id TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.status,
    s.plan,
    s.current_period_end,
    s.paypal_subscription_id,
    (s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > NOW()))::BOOLEAN AS is_active
  FROM subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security for Functions
-- =====================================================

-- 确保函数可以访问数据
ALTER FUNCTION is_premium_user(UUID) SECURITY DEFINER;
ALTER FUNCTION get_usage_count(UUID, INTEGER) SECURITY DEFINER;
ALTER FUNCTION get_guest_usage_count(TEXT, INTEGER) SECURITY DEFINER;
ALTER FUNCTION get_user_subscription(UUID) SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_premium_user(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_usage_count(UUID, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_guest_usage_count(TEXT, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_subscription(UUID) TO PUBLIC;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON subscriptions TO PUBLIC;
GRANT SELECT, INSERT ON usage_records TO PUBLIC;
GRANT SELECT, INSERT ON guest_usage TO PUBLIC;