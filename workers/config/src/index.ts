// Cloudflare Worker - Remote Configuration Service
// Deploy with: npx wrangler deploy

export default {
  async fetch(request, env, ctx) {
    // Only allow requests from your extension's allowed origins
    const allowedOrigins = [
      'chrome-extension://*',
      'https://*.pages.dev',
    ];

    const origin = request.headers.get('Origin') || '';
    const isAllowed = allowedOrigins.some(o => {
      if (o.includes('*')) {
        const pattern = o.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return origin.includes(o);
    });

    // For now, allow all requests (you can restrict this later)
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const config = {
      // PayPal Configuration
      paypal: {
        clientId: env.PAYPAL_CLIENT_ID || '',
        environment: env.PAYPAL_ENVIRONMENT || 'sandbox',
        plans: {
          monthly: env.PAYPAL_MONTHLY_PLAN_ID || '',
          yearly: env.PAYPAL_YEARLY_PLAN_ID || '',
        },
      },

      // Supabase Configuration
      supabase: {
        url: env.SUPABASE_URL || '',
        anonKey: env.SUPABASE_ANON_KEY || '',
      },

      // Feature Flags
      features: {
        aiSummary: {
          enabled: env.FEATURE_AI_SUMMARY === 'true',
          provider: env.AI_SUMMARY_PROVIDER || 'openrouter',
        },
      },

      // Usage Limits
      limits: {
        guestMaxUses: parseInt(env.LIMIT_GUEST_MAX_USES) || 3,
      },

      // App Info
      app: {
        name: 'Recipe Cleaner',
        version: '1.0.0',
      },
    };

    return new Response(JSON.stringify(config, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  },
};
