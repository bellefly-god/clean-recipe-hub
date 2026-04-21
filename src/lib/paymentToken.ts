const HMAC_SECRET = 'recipe-cleaner-payment-secret-2024';

/**
 * Generate a signed payment token for PayPal subscription.
 * Uses Web Crypto API for browser compatibility.
 */
export async function generatePaymentToken(userId: string, plan: string, email: string): Promise<string> {
  const timestamp = Date.now().toString();
  const data = `${userId}:${plan}:${email}:${timestamp}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(HMAC_SECRET);
  const messageData = encoder.encode(data);

  // Import the secret key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the data
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const payload = btoa(JSON.stringify({
    userId,
    plan,
    email,
    timestamp,
  }));

  return `${payload}.${signature}`;
}
