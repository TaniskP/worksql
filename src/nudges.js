// "James is still waiting." One email when someone has gone quiet and a ticket is still open for them.
// Subscribers live in ./data/nudges.json until there are real accounts.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const email = require('./email');
const { lessons, nextOpen } = require('./lessons');

const FILE = process.env.NUDGES_FILE || path.join(__dirname, '..', 'data', 'nudges.json');
const QUIET_FOR_MS = Number(process.env.NUDGE_AFTER_HOURS || 24) * 3600 * 1000;

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}
function save(list) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

const validEmail = (e) => typeof e === 'string' && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function subscribe({ email: address, completed, name }) {
  if (!validEmail(address)) return { error: 'That doesn’t look like an email address.' };
  const list = load();
  const lower = address.trim().toLowerCase();
  let sub = list.find((s) => s.email === lower);
  if (!sub) {
    sub = { token: crypto.randomBytes(16).toString('hex'), email: lower, createdAt: Date.now() };
    list.push(sub);
  }
  Object.assign(sub, { unsubscribed: false, lastSeen: Date.now(), ticketId: nextOpen(completed).id, name: String(name || '').slice(0, 20) });
  save(list);
  return { token: sub.token };
}

// Called whenever the learner is active, with the ticket they'd see next.
function seen({ token, completed }) {
  const list = load();
  const sub = list.find((s) => s.token === token);
  if (!sub) return { error: 'unknown' };
  sub.lastSeen = Date.now();
  if (completed) sub.ticketId = nextOpen(completed).id;
  save(list);
  return { ok: true };
}

function unsubscribe(token) {
  const list = load();
  const sub = list.find((s) => s.token === token);
  if (sub) { sub.unsubscribed = true; save(list); }
  return !!sub;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function compose(sub, origin) {
  const l = lessons.find((x) => x.id === sub.ticketId) || lessons[0];
  const first = l.from.name.split(' ')[0];
  const paidWall = !l.free;
  const subject = `${first} is still waiting`;
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;color:#0b1733;font-size:15px;line-height:1.5">
  <p>${sub.name ? `Hi ${esc(sub.name)},` : 'Hi,'}</p>
  <p>${esc(l.from.name)} (${esc(l.from.role)}) sent this and it’s still open in your inbox at Harbour &amp; Co:</p>
  <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #1f5eff;background:#eef3ff">${esc(l.title)}</blockquote>
  <p>${paidWall ? 'It’s on the paid plan, along with the rest of the week’s inbox.' : 'It’s about five minutes.'}</p>
  <p><a href="${origin}/work" style="display:inline-block;background:#1f5eff;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Clock in</a></p>
  <p style="color:#6b7690;font-size:12px;margin-top:28px">You asked WorkSQL to nudge you when someone’s waiting. One email per quiet spell.
  <a href="${origin}/unsubscribe?t=${sub.token}" style="color:#6b7690">Unsubscribe</a>.</p></div>`;
  return { subject, html };
}

// Send one nudge per quiet spell: quiet for QUIET_FOR_MS since last seen, and not nudged since.
async function sweep(origin) {
  const list = load();
  let sent = 0;
  for (const sub of list) {
    if (sub.unsubscribed) continue;
    if (Date.now() - sub.lastSeen < QUIET_FOR_MS) continue;
    if (sub.nudgedAt && sub.nudgedAt > sub.lastSeen) continue;
    const msg = compose(sub, origin);
    try {
      await email.send({ to: sub.email, ...msg });
      sub.nudgedAt = Date.now();
      sent++;
    } catch (e) {
      console.error(`[nudges] could not email ${sub.email}: ${e.message}`);
    }
  }
  if (sent) save(list);
  return sent;
}

module.exports = { subscribe, seen, unsubscribe, sweep, compose };
