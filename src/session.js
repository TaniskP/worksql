// The login cookie: the member's email, signed with a server secret so it can't be forged or edited.
// Set after a completed Stripe Checkout; read on every request that needs to know "is this person paid?".
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const members = require('./members');

const COOKIE = 'wsql';
const MAX_AGE = 400 * 24 * 3600; // a year and a bit: the longest browsers keep a cookie

// COOKIE_SECRET must be set in production. In development a random one is kept in ./data so logins survive restarts.
function secret() {
  if (process.env.COOKIE_SECRET) return process.env.COOKIE_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('Set COOKIE_SECRET in production');
  const file = path.join(__dirname, '..', 'data', '.cookie-secret');
  try { return fs.readFileSync(file, 'utf8'); } catch { /* make one */ }
  const s = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, s);
  return s;
}

const b64 = (s) => Buffer.from(s).toString('base64url');
const mac = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

function sign(email) {
  const data = `${b64(email)}.${Math.floor(Date.now() / 1000)}`;
  return `${data}.${mac(data)}`;
}

// Returns the email inside a valid cookie value, or null.
function verify(value) {
  const parts = String(value || '').split('.');
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = mac(data);
  if (parts[2].length !== expected.length || !crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) return null;
  try { return Buffer.from(parts[0], 'base64url').toString(); } catch { return null; }
}

function readCookie(req, name = COOKIE) {
  const header = req.headers.cookie || '';
  for (const piece of header.split(';')) {
    const i = piece.indexOf('=');
    if (i > 0 && piece.slice(0, i).trim() === name) return decodeURIComponent(piece.slice(i + 1).trim());
  }
  return null;
}

function setCookieHeader(email, { secure }) {
  return `${COOKIE}=${encodeURIComponent(sign(email))}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function clearCookieHeader() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

// Who is this, and have they paid? Paid means: a valid cookie AND an active subscription right now,
// so a cancelled or failed subscription locks the paid days again even if the cookie is still there.
function whoIs(req) {
  const email = verify(readCookie(req));
  if (!email) return { email: null, paid: false, plan: null, member: null };
  const member = members.byEmail(email);
  return { email, paid: members.isActive(member), plan: member ? member.plan || null : null, member };
}

module.exports = { sign, verify, readCookie, setCookieHeader, clearCookieHeader, whoIs, COOKIE };
