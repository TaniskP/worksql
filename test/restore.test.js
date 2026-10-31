const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'worksql-restore-'));
process.env.MEMBERS_FILE = path.join(dir, 'members.json');
process.env.COOKIE_SECRET = 'test-cookie-secret';
process.env.OUTBOX_DIR = path.join(dir, 'outbox');
process.env.NODE_ENV = 'test';

const members = require('../src/members');
const restore = require('../src/restore');

(async () => {
  const token = restore.signLink('sam@example.com');
  assert.strictEqual(restore.readLink(token), 'sam@example.com');
  assert.strictEqual(restore.readLink(token.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))), null, 'tampered restore link is rejected');
  assert.strictEqual(restore.confirm(token), null, 'link without a paid member does not unlock');

  members.upsert({ email: 'sam@example.com', plan: 'yearly', status: 'active' });
  assert.ok(restore.confirm(token) && restore.confirm(token).email === 'sam@example.com', 'active member can confirm');

  members.setStatusBySubscription(members.byEmail('sam@example.com').subscriptionId || 'none', 'canceled');
  members.upsert({ email: 'sam@example.com', status: 'canceled' });
  assert.strictEqual(restore.confirm(token), null, 'cancelled member cannot confirm');

  members.upsert({ email: 'sam@example.com', status: 'active' });
  const paid = await restore.request({ typed: 'sam@example.com', origin: 'http://localhost:9', ip: '10.0.0.1' });
  const stranger = await restore.request({ typed: 'nobody@example.com', origin: 'http://localhost:9', ip: '10.0.0.2' });
  assert.strictEqual(paid.status, 200);
  assert.strictEqual(stranger.status, 200);
  assert.strictEqual(paid.body.message, stranger.body.message, 'same reply whether or not they paid');
  assert.ok(fs.readdirSync(process.env.OUTBOX_DIR).length === 1, 'only the paid address gets an email');

  const bad = await restore.request({ typed: 'not-an-email', origin: 'http://localhost:9', ip: '10.0.0.3' });
  assert.strictEqual(bad.status, 400);

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('restore: all passed');
})().catch((e) => { console.error('restore: FAIL', e); process.exit(1); });
