// A quiet learner gets exactly one "still waiting" email per quiet spell, naming the right colleague.
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'worksql-nudges-'));
process.env.NUDGES_FILE = path.join(dir, 'nudges.json');
process.env.OUTBOX_DIR = path.join(dir, 'outbox');
const nudges = require('../src/nudges');

(async () => {
  assert.ok(nudges.subscribe({ email: 'not an email' }).error, 'rejects bad email');
  const { token } = nudges.subscribe({ email: 'Sam@Example.com', completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 41, 18, 24], name: 'Sam' });
  assert.ok(token);

  assert.strictEqual(await nudges.sweep('https://worksql.test'), 0, 'active learner is not nudged');

  // Pretend they went quiet two days ago.
  const list = JSON.parse(fs.readFileSync(process.env.NUDGES_FILE, 'utf8'));
  list[0].lastSeen = Date.now() - 48 * 3600 * 1000;
  fs.writeFileSync(process.env.NUDGES_FILE, JSON.stringify(list));

  assert.strictEqual(await nudges.sweep('https://worksql.test'), 1, 'quiet learner gets one email');
  assert.strictEqual(await nudges.sweep('https://worksql.test'), 0, 'and only one');
  const [file] = fs.readdirSync(process.env.OUTBOX_DIR);
  const html = fs.readFileSync(path.join(process.env.OUTBOX_DIR, file), 'utf8');
  assert.match(html, /Subject: Amy is still waiting/);
  assert.match(html, /Monthly revenue for the finance pack/);
  assert.match(html, /sam@example\.com/);
  assert.match(html, /https:\/\/worksql\.test\/unsubscribe\?t=/);

  // Coming back resets the spell; unsubscribing stops it for good.
  nudges.seen({ token, completed: [1] });
  assert.ok(nudges.unsubscribe(token));
  const again = JSON.parse(fs.readFileSync(process.env.NUDGES_FILE, 'utf8'));
  again[0].lastSeen = Date.now() - 48 * 3600 * 1000;
  fs.writeFileSync(process.env.NUDGES_FILE, JSON.stringify(again));
  assert.strictEqual(await nudges.sweep('https://worksql.test'), 0, 'unsubscribed is never nudged');

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('nudges: all passed');
})().catch((e) => { console.error('nudges: FAIL', e.message); process.exit(1); });
