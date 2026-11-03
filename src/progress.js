// Progress that follows the person, not the browser. Keyed by the email in the login cookie:
// a paid member's Stripe email, or a free learner who saved their progress with a magic link.
// Kept in ./data/progress.json. The browser keeps its own copy and the two are merged, never overwritten,
// so practising on a phone and a laptop on the same day loses nothing.
const fs = require('node:fs');
const path = require('node:path');
const { lessons } = require('./lessons');

const FILE = process.env.PROGRESS_FILE || path.join(__dirname, '..', 'data', 'progress.json');
const IDS = new Set(lessons.map((l) => l.id));
const DIALECTS = new Set(['tsql', 'postgres', 'mysql']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LOG = 30;   // wrong answers kept per ticket
const MAX_MOCKS = 20; // mock shifts kept

let cache = null;
function load() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { cache = {}; }
  return cache;
}
function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(cache));
}

const str = (s, n) => String(s == null ? '' : s).slice(0, n);
const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

// Whatever the browser sends, keep only the shape we expect, with sane sizes.
function clean(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const out = { completed: {}, days: [], minutes: {}, log: {}, mocks: [], name: str(s.name, 40), onboarded: Boolean(s.onboarded) };
  for (const [id, c] of Object.entries(s.completed || {})) {
    if (!IDS.has(Number(id)) || !c || typeof c !== 'object') continue;
    out.completed[id] = { at: num(c.at), seconds: Math.max(0, Math.round(num(c.seconds))) };
    if (c.sql) out.completed[id].sql = str(c.sql, 4000);
    if (DIALECTS.has(c.dialect)) out.completed[id].dialect = c.dialect;
    if (c.attempts) out.completed[id].attempts = Math.max(0, Math.round(num(c.attempts)));
    if (Array.isArray(c.columns)) { out.completed[id].columns = c.columns.slice(0, 30).map((x) => str(x, 60)); out.completed[id].rows = Math.max(0, Math.round(num(c.rows))); }
  }
  out.days = Array.from(new Set((Array.isArray(s.days) ? s.days : []).filter((d) => DATE_RE.test(d)))).sort().slice(-400);
  for (const [d, m] of Object.entries(s.minutes || {})) if (DATE_RE.test(d)) out.minutes[d] = Math.max(0, Math.min(24 * 60, num(m)));
  for (const [id, list] of Object.entries(s.log || {})) {
    if (!IDS.has(Number(id)) || !Array.isArray(list)) continue;
    out.log[id] = list.slice(-MAX_LOG).map((e) => ({
      at: num(e.at), pass: Boolean(e.pass), headline: str(e.headline, 300), detail: str(e.detail, 600),
      dialect: DIALECTS.has(e.dialect) ? e.dialect : undefined, sql: e.sql ? str(e.sql, 2000) : undefined,
    }));
  }
  out.mocks = (Array.isArray(s.mocks) ? s.mocks : []).slice(-MAX_MOCKS).map((m) => ({
    at: num(m.at), dialect: DIALECTS.has(m.dialect) ? m.dialect : 'tsql', minutes: num(m.minutes), limit: num(m.limit),
    tickets: (Array.isArray(m.tickets) ? m.tickets : []).slice(0, 20).map((t) => ({ id: num(t.id), closed: Boolean(t.closed), attempts: num(t.attempts), seconds: num(t.seconds) })),
    score: num(m.score),
  }));
  return out;
}

// Both sides win: the union of everything, the earliest close of each ticket, the longest time on each day.
function merge(a, b) {
  const x = clean(a); const y = clean(b);
  const completed = { ...x.completed };
  for (const [id, c] of Object.entries(y.completed)) {
    const was = completed[id];
    if (!was) { completed[id] = c; continue; }
    const first = was.at && (!c.at || was.at <= c.at) ? was : c;
    const other = first === was ? c : was;
    completed[id] = {
      ...other, ...first, sql: first.sql || other.sql, dialect: first.dialect || other.dialect,
      columns: first.columns || other.columns, rows: first.columns ? first.rows : other.rows,
      attempts: Math.max(first.attempts || 0, other.attempts || 0) || undefined,
    };
    for (const k of Object.keys(completed[id])) if (completed[id][k] === undefined) delete completed[id][k];
  }
  const minutes = { ...x.minutes };
  for (const [d, m] of Object.entries(y.minutes)) minutes[d] = Math.max(minutes[d] || 0, m);
  const log = { ...x.log };
  for (const [id, list] of Object.entries(y.log)) {
    const seen = new Map((log[id] || []).map((e) => [`${e.at}:${e.headline}`, e]));
    for (const e of list) seen.set(`${e.at}:${e.headline}`, e);
    log[id] = [...seen.values()].sort((p, q) => p.at - q.at).slice(-MAX_LOG);
  }
  const mocks = new Map(x.mocks.map((m) => [m.at, m]));
  for (const m of y.mocks) mocks.set(m.at, m);
  return {
    completed,
    days: Array.from(new Set([...x.days, ...y.days])).sort(),
    minutes,
    log,
    mocks: [...mocks.values()].sort((p, q) => p.at - q.at).slice(-MAX_MOCKS),
    name: y.name || x.name,
    onboarded: x.onboarded || y.onboarded,
  };
}

const key = (email) => String(email || '').trim().toLowerCase();

function get(email) {
  return load()[key(email)] || null;
}

// Merge what this browser has into what we hold, save it, and hand back the result.
function sync(email, incoming) {
  const all = load();
  const k = key(email);
  if (!k) throw new Error('progress needs an email');
  all[k] = { ...merge(all[k] || {}, incoming), updatedAt: Date.now() };
  save();
  return all[k];
}

module.exports = { get, sync, merge, clean, _reset: () => { cache = null; } };
