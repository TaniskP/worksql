// Launch-day robustness: rate limits, progress sync, save links, status, backups, counts, waitlist.
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'worksql-launch-'));
process.env.DATA_DIR = path.join(dir, 'data');
process.env.PROGRESS_FILE = path.join(dir, 'data', 'progress.json');
process.env.STATUS_FILE = path.join(dir, 'data', 'status.json');
process.env.ANALYTICS_FILE = path.join(dir, 'data', 'analytics.json');
process.env.WAITLIST_FILE = path.join(dir, 'data', 'waitlist.json');
process.env.MEMBERS_FILE = path.join(dir, 'data', 'members.json');
process.env.BACKUP_DIR = path.join(dir, 'backups');
process.env.OUTBOX_DIR = path.join(dir, 'outbox');
process.env.COOKIE_SECRET = 'test-cookie-secret';
process.env.NODE_ENV = 'test';
delete process.env.STATUS_MESSAGE;

const guard = require('../src/guard');
const progress = require('../src/progress');
const restore = require('../src/restore');
const status = require('../src/status');
const backup = require('../src/backup');
const analytics = require('../src/analytics');
const waitlist = require('../src/waitlist');

const req = (ip) => ({ headers: {}, socket: { remoteAddress: ip } });

(async () => {
  // ---------- rate limits ----------
  const [max] = guard.LIMITS.query;
  for (let i = 0; i < max; i++) assert.ok(guard.allow(req('1.1.1.1'), 'query'), `call ${i + 1} allowed`);
  assert.strictEqual(guard.allow(req('1.1.1.1'), 'query'), false, 'one over the limit is refused');
  assert.ok(guard.allow(req('2.2.2.2'), 'query'), 'another connection is unaffected');
  assert.ok(guard.allow(req('1.1.1.1'), 'run'), 'buckets are separate');
  assert.strictEqual(guard.ipOf({ headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }, socket: {} }), '9.9.9.9', 'first forwarded address is the client');

  // ---------- progress merge ----------
  const laptop = {
    completed: { 1: { at: 1000, seconds: 60, sql: 'SELECT 1', dialect: 'tsql', attempts: 2 }, 2: { at: 3000, seconds: 30 } },
    days: ['2026-11-01'], minutes: { '2026-11-01': 12 }, name: 'Sam',
    log: { 1: [{ at: 900, pass: false, headline: 'Extra columns.' }, { at: 1000, pass: true, headline: 'Right.' }] },
  };
  const phone = {
    completed: { 2: { at: 2000, seconds: 45, sql: 'SELECT 2', dialect: 'postgres' }, 3: { at: 4000, seconds: 20 } },
    days: ['2026-11-02', '2026-11-01'], minutes: { '2026-11-01': 5, '2026-11-02': 8 },
    log: { 1: [{ at: 900, pass: false, headline: 'Extra columns.' }], 2: [{ at: 1900, pass: false, headline: 'Wrong date range.' }] },
    mocks: [{ at: 5000, dialect: 'mysql', minutes: 20, limit: 30, score: 80, tickets: [{ id: 1, closed: true, attempts: 1, seconds: 100 }] }],
  };
  const m = progress.merge(laptop, phone);
  assert.deepStrictEqual(Object.keys(m.completed).sort(), ['1', '2', '3'], 'union of closed tickets');
  assert.strictEqual(m.completed[2].at, 2000, 'earliest close wins');
  assert.strictEqual(m.completed[2].sql, 'SELECT 2', 'its query comes with it');
  assert.strictEqual(m.completed[1].attempts, 2);
  assert.deepStrictEqual(m.days, ['2026-11-01', '2026-11-02'], 'days are a sorted union');
  assert.strictEqual(m.minutes['2026-11-01'], 12, 'the longer time on a day wins, never the sum');
  assert.strictEqual(m.log[1].length, 2, 'the same attempt from two devices is kept once');
  assert.strictEqual(m.log[2].length, 1);
  assert.strictEqual(m.mocks.length, 1);
  assert.strictEqual(m.name, 'Sam', 'a missing name does not wipe one');
  assert.deepStrictEqual(progress.merge(m, m), m, 'merging twice changes nothing');

  const junk = progress.clean({ completed: { 9999: { at: 1 }, 1: { at: 'x', sql: 'x'.repeat(10_000) } }, days: ['nope', '2026-01-01'], minutes: { bad: 5 } });
  assert.deepStrictEqual(Object.keys(junk.completed), ['1'], 'unknown ticket ids are dropped');
  assert.strictEqual(junk.completed[1].sql.length, 4000, 'long queries are cut');
  assert.deepStrictEqual(junk.days, ['2026-01-01']);
  assert.deepStrictEqual(junk.minutes, {});

  progress.sync('Sam@Example.com', laptop);
  const both = progress.sync('sam@example.com', phone);
  assert.strictEqual(Object.keys(both.completed).length, 3, 'two syncs to one email merge');
  progress._reset();
  assert.strictEqual(Object.keys(progress.get('sam@example.com').completed).length, 3, 'saved to disk');

  // ---------- save-progress links ----------
  const sent = await restore.requestSave({ typed: 'new@example.com', origin: 'http://localhost:9', ip: '3.3.3.3' });
  assert.strictEqual(sent.status, 200);
  const mail = fs.readdirSync(process.env.OUTBOX_DIR).map((f) => fs.readFileSync(path.join(process.env.OUTBOX_DIR, f), 'utf8')).join('');
  const token = decodeURIComponent(mail.match(/signin\?token=([^"&]+)/)[1]);
  assert.strictEqual(restore.confirmSave(token), 'new@example.com', 'the emailed link signs in a free learner');
  assert.strictEqual(restore.confirm(token), null, 'but does not unlock paid days');
  assert.strictEqual((await restore.requestSave({ typed: 'nope', origin: 'x', ip: '3.3.3.4' })).status, 400);

  // ---------- status line ----------
  assert.strictEqual(status.get(), null, 'no banner by default');
  status.set({ message: 'Sandbox slow, investigating.', level: 'warn' });
  assert.deepStrictEqual([status.get().message, status.get().level], ['Sandbox slow, investigating.', 'warn']);
  status.set({ message: '' });
  assert.strictEqual(status.get(), null, 'an empty message clears it');

  // ---------- backups ----------
  fs.writeFileSync(path.join(process.env.DATA_DIR, 'members.json'), '[]');
  const old = path.join(process.env.BACKUP_DIR, '2020-01-01');
  fs.mkdirSync(old, { recursive: true });
  const b = backup.run(new Date('2026-11-03T12:00:00Z'));
  assert.ok(b.copied >= 2, 'every data file is copied');
  assert.ok(fs.existsSync(path.join(b.into, 'members.json')));
  assert.ok(!fs.existsSync(old), 'backups older than the keep window are removed');
  assert.strictEqual(backup.latest(), '2026-11-03');

  // ---------- counts ----------
  assert.ok(analytics.count('clock_in'));
  analytics.count('clock_in');
  assert.strictEqual(analytics.count('email:someone@example.com'), false, 'only known event names are counted');
  assert.strictEqual(analytics.report(1)[0].clock_in, 2);

  // ---------- waitlist ----------
  assert.ok(waitlist.join({ email: 'Lead@Team.com', seats: 12 }).ok);
  assert.ok(waitlist.join({ email: 'lead@team.com' }).ok);
  assert.strictEqual(waitlist.size(), 1, 'one entry per email');
  assert.ok(waitlist.join({ email: 'bad' }).error);

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('launch: all passed');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
