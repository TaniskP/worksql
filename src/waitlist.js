// "Tell me when Teams is ready." Email addresses only, in ./data/waitlist.json.
const fs = require('node:fs');
const path = require('node:path');

const FILE = process.env.WAITLIST_FILE || path.join(__dirname, '..', 'data', 'waitlist.json');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}

function join({ email, team, seats }) {
  const addr = String(email || '').trim().toLowerCase();
  if (!addr || addr.length > 254 || !EMAIL_RE.test(addr)) return { error: 'That doesn’t look like an email address.' };
  const list = load();
  const entry = list.find((x) => x.email === addr) || (list.push({ email: addr, at: Date.now() }), list[list.length - 1]);
  if (team) entry.team = String(team).slice(0, 80);
  if (seats) entry.seats = Math.max(0, Math.min(10_000, Number(seats) || 0));
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
  return { ok: true };
}

const size = () => load().length;

module.exports = { join, size };
