// The few Stripe calls WorkSQL needs, over Stripe's REST API with Node's own fetch and crypto.
// No SDK, so there's nothing to install.
const crypto = require('node:crypto');

const API = 'https://api.stripe.com/v1';

// Stripe takes form-encoded bodies with bracketed keys: line_items[0][price]=...
function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function call(method, path, body) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body ? form(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${method} ${path}: ${data.error ? data.error.message : res.status}`);
  return data;
}

const stripe = {
  createCheckoutSession: (params) => call('POST', '/checkout/sessions', params),
  getCheckoutSession: (id) => call('GET', `/checkout/sessions/${encodeURIComponent(id)}`),
  createPortalSession: (params) => call('POST', '/billing_portal/sessions', params),
};

// Stripe-Signature: t=1700000000,v1=hex[,v1=hex]. Signed payload is `${t}.${rawBody}`, HMAC-SHA256 with the
// endpoint's whsec_ secret. Rejects anything older than five minutes so a captured request can't be replayed.
function verifySignature(rawBody, header, secret, { toleranceSec = 300, now = Date.now() } = {}) {
  if (!header || !secret) return false;
  const parts = {};
  const v1 = [];
  for (const piece of String(header).split(',')) {
    const [k, v] = piece.split('=');
    if (k === 't') parts.t = v;
    if (k === 'v1') v1.push(v);
  }
  const t = Number(parts.t);
  if (!t || !v1.length) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return v1.some((sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

module.exports = { stripe, verifySignature, form };
