// Our own launch-day counts: no third-party script, no cookies, no IPs, no emails.
// Just "how many of each thing happened today", kept in ./data/analytics.json and shown on /admin.
const fs = require('node:fs');
const path = require('node:path');

const FILE = process.env.ANALYTICS_FILE || path.join(__dirname, '..', 'data', 'analytics.json');

// The only names the browser may send. Anything else is ignored.
const EVENTS = new Set([
  'view_home', 'view_pricing', 'view_work', 'view_progress', 'view_lessons',
  'clock_in', 'ticket_closed', 'ticket_held_back', 'mock_start', 'mock_finish',
  'checkout_start', 'paid', 'save_progress', 'waitlist', 'share_card', 'export',
]);

let cache = null;
let dirty = false;

function load() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { cache = {}; }
  return cache;
}

function flush() {
  if (!dirty) return;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
  dirty = false;
}
setInterval(flush, 15_000).unref();
process.on('exit', flush);

const today = () => new Date().toISOString().slice(0, 10);

function count(name, n = 1) {
  if (!EVENTS.has(name)) return false;
  const all = load();
  const day = (all[today()] = all[today()] || {});
  day[name] = (day[name] || 0) + n;
  dirty = true;
  return true;
}

// Newest day first, at most `days` of them.
function report(days = 14) {
  flush();
  const all = load();
  return Object.keys(all).sort().reverse().slice(0, days).map((d) => ({ day: d, ...all[d] }));
}

module.exports = { count, report, EVENTS, flush };
