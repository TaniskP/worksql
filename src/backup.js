// Daily copy of ./data (members, progress, nudges, waitlist, analytics) into dated folders.
// BACKUP_DIR should point at a different disk or a synced folder in production: a backup on the
// same disk as the data only saves you from a bad write, not from losing the machine.
const fs = require('node:fs');
const path = require('node:path');

const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DIR = () => process.env.BACKUP_DIR || path.join(DATA, 'backups');
const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS || 14);

const stamp = (d = new Date()) => d.toISOString().slice(0, 10);

// Copies every .json file in ./data. Runs once a day; a second run the same day refreshes that day's copy.
function run(now = new Date()) {
  const dir = DIR();
  const into = path.join(dir, stamp(now));
  let files = [];
  try { files = fs.readdirSync(DATA).filter((f) => f.endsWith('.json')); } catch { return { copied: 0, into }; }
  fs.mkdirSync(into, { recursive: true });
  for (const f of files) fs.copyFileSync(path.join(DATA, f), path.join(into, f));
  prune(dir, now);
  return { copied: files.length, into };
}

function prune(dir, now) {
  const cutoff = stamp(new Date(now.getTime() - KEEP_DAYS * 86400_000));
  for (const name of fs.readdirSync(dir)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(name) && name < cutoff) fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  }
}

// The most recent backup folder, for /health.
function latest() {
  try { return fs.readdirSync(DIR()).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort().pop() || null; } catch { return null; }
}

function schedule() {
  const go = () => { try { const r = run(); console.log(`[backup] ${r.copied} files -> ${r.into}`); } catch (e) { console.error('[backup]', e.message); } };
  setTimeout(go, 30_000).unref();
  setInterval(go, 24 * 3600_000).unref();
}

module.exports = { run, latest, schedule };

// `npm run backup` runs one now.
if (require.main === module) console.log(run());
