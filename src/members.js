// Paid members, keyed by the email Stripe Checkout collected. This is the whole "account":
// no passwords, no profiles. Kept in ./data/members.json (git-ignored) until there's a database.
const fs = require('node:fs');
const path = require('node:path');

const FILE = process.env.MEMBERS_FILE || path.join(__dirname, '..', 'data', 'members.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}
function save(list) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

const norm = (email) => String(email || '').trim().toLowerCase();

// Stripe subscription statuses that still get access. past_due keeps access while Stripe retries the card.
const ACTIVE = new Set(['active', 'trialing', 'past_due']);
const isActive = (m) => Boolean(m && ACTIVE.has(m.status));

function byEmail(email) {
  return load().find((m) => m.email === norm(email)) || null;
}

// Create or update a member from a completed checkout (webhook or the /welcome return, whichever lands first).
function upsert({ email, customerId, subscriptionId, plan, status = 'active' }) {
  const list = load();
  const e = norm(email);
  if (!e) throw new Error('A member needs an email');
  let m = list.find((x) => x.email === e) || (customerId && list.find((x) => x.customerId === customerId));
  if (!m) { m = { email: e, createdAt: Date.now() }; list.push(m); }
  Object.assign(m, { email: e, status, updatedAt: Date.now() });
  if (customerId) m.customerId = customerId;
  if (subscriptionId) m.subscriptionId = subscriptionId;
  if (plan) m.plan = plan;
  save(list);
  return m;
}

// Subscription changed (renewed, card failed, cancelled): follow Stripe's status.
function setStatusBySubscription(subscriptionId, status, { customerId } = {}) {
  const list = load();
  const m = list.find((x) => x.subscriptionId === subscriptionId) || (customerId && list.find((x) => x.customerId === customerId));
  if (!m) return null;
  m.status = status;
  m.updatedAt = Date.now();
  save(list);
  return m;
}

module.exports = { byEmail, upsert, setStatusBySubscription, isActive };
