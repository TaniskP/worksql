// Already paid? Same idea as VibeCheckMate: the form only emails a short-lived link.
// Clicking that link is what proves they own the inbox and sets the login cookie.
// Typing the email never unlocks anything.

const crypto = require('node:crypto');
const members = require('./members');
const email = require('./email');
const { stripe } = require('./stripe');
const { secret } = require('./session');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINK_MS = 15 * 60 * 1000;
const SENT = 'If that email has an active plan, a link is on its way. Open it on this device. It works for 15 minutes. Check spam too.';

const hits = new Map();
function rate(key, max, windowMs) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) return false;
  list.push(now);
  hits.set(key, list);
  return true;
}

function signLink(addr) {
  const exp = Date.now() + LINK_MS;
  const data = `${Buffer.from(addr).toString('base64url')}.${exp}`;
  return `${data}.${crypto.createHmac('sha256', secret()).update(data).digest('base64url')}`;
}

function readLink(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  if (parts[2].length !== expected.length || !crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) return null;
  if (Number(parts[1]) < Date.now()) return null;
  try { return Buffer.from(parts[0], 'base64url').toString(); } catch { return null; }
}

const ACTIVE = new Set(['active', 'trialing', 'past_due']);

async function findPaid(typed) {
  const addr = String(typed || '').trim().toLowerCase();
  const local = members.byEmail(addr);
  if (members.isActive(local)) return local;
  if (!process.env.STRIPE_SECRET_KEY || !addr) return null;
  const variants = Array.from(new Set([addr, String(typed || '').trim()]));
  const customers = (await Promise.all(variants.map((value) => stripe.listCustomers({ email: value, limit: 10 }))))
    .flatMap((page) => page.data || []);
  for (const c of customers) {
    const subs = await stripe.listSubscriptions({ customer: c.id, status: 'all', limit: 10 });
    const sub = (subs.data || []).find((s) => ACTIVE.has(s.status));
    if (!sub) continue;
    return members.upsert({
      email: addr,
      customerId: c.id,
      subscriptionId: sub.id,
      plan: (sub.metadata && sub.metadata.plan) || undefined,
      status: sub.status,
    });
  }
  return null;
}

async function request({ typed, origin, ip }) {
  if (!rate(`ip:${ip || 'unknown'}`, 8, 60 * 60 * 1000)) {
    return { status: 429, body: { error: 'Too many restore attempts from this connection. Try again in a bit.' } };
  }
  const addr = String(typed || '').trim().toLowerCase();
  if (!addr || addr.length > 254 || !EMAIL_RE.test(addr)) {
    return { status: 400, body: { error: 'Enter the email you paid with.' } };
  }
  if (process.env.NODE_ENV === 'production' && (!email.configured() || !process.env.SITE_URL)) {
    return { status: 503, body: { error: "Restoring by email isn't available right now." } };
  }
  if (!rate(`email:${addr}`, 3, 60 * 60 * 1000)) {
    return { status: 429, body: { error: 'That email has had a few links already. Check inbox and spam, or try again later.' } };
  }
  const member = await findPaid(typed);
  if (member) {
    const link = `${origin}/restore?token=${encodeURIComponent(signLink(member.email))}`;
    await email.send({
      to: member.email,
      subject: 'Restore your WorkSQL access',
      html: `<p>Open this on the device you want to unlock. It expires in 15 minutes.</p>
        <p><a href="${link}">Restore my access</a></p>
        <p>If you didn't ask for this, ignore it. Nothing changes unless someone opens the link.</p>`,
    });
  }
  return { status: 200, body: { ok: true, message: SENT } };
}

function confirm(token) {
  const addr = readLink(token);
  if (!addr) return null;
  const member = members.byEmail(addr);
  return members.isActive(member) ? member : null;
}

module.exports = { request, confirm, signLink, readLink, SENT, findPaid };
