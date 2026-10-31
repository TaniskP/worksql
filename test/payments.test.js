// Checkout is the login: Stripe's signed webhook makes an email a paid member, a signed cookie carries it,
// and the server refuses paid tickets without one. No network calls to Stripe.
const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'worksql-pay-'));
process.env.MEMBERS_FILE = path.join(dir, 'members.json');
process.env.COOKIE_SECRET = 'test-cookie-secret';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

const { verifySignature } = require('../src/stripe');
const session = require('../src/session');
const members = require('../src/members');
const payments = require('../src/payments');
const { canRun } = require('../src/access');
const { lessons } = require('../src/lessons');

const signed = (body, { secret = 'whsec_test', t = Math.floor(Date.now() / 1000) } = {}) =>
  `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
const event = (type, object) => JSON.stringify({ id: `evt_${type}`, type, data: { object } });

(async () => {
  // Webhook signatures
  const body = event('ping', {});
  assert.ok(verifySignature(body, signed(body), 'whsec_test'), 'valid signature');
  assert.ok(!verifySignature(`${body} `, signed(body), 'whsec_test'), 'edited body is rejected');
  assert.ok(!verifySignature(body, signed(body, { secret: 'whsec_other' }), 'whsec_test'), 'wrong secret is rejected');
  assert.ok(!verifySignature(body, signed(body, { t: Math.floor(Date.now() / 1000) - 3600 }), 'whsec_test'), 'old replay is rejected');

  // Signed cookie
  const cookie = session.sign('sam@example.com');
  assert.strictEqual(session.verify(cookie), 'sam@example.com');
  assert.strictEqual(session.verify(cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))), null, 'tampered cookie is rejected');
  const forged = `${Buffer.from('boss@example.com').toString('base64url')}.${cookie.split('.')[1]}.${cookie.split('.')[2]}`;
  assert.strictEqual(session.verify(forged), null, 'swapping the email breaks the signature');

  // Webhook -> member
  const completed = event('checkout.session.completed', {
    id: 'cs_test_1', status: 'complete', payment_status: 'paid', customer: 'cus_1', subscription: 'sub_1',
    customer_details: { email: 'Sam@Example.com' }, metadata: { plan: 'yearly' },
  });
  assert.strictEqual((await payments.handleWebhook(completed, 'v1=nope')).status, 400, 'unsigned webhook is refused');
  assert.strictEqual(members.byEmail('sam@example.com'), null);
  assert.strictEqual((await payments.handleWebhook(completed, signed(completed))).status, 200);
  const m = members.byEmail('sam@example.com');
  assert.ok(members.isActive(m) && m.plan === 'yearly' && m.customerId === 'cus_1', 'paid member saved from the webhook');

  // Who is this, from the cookie
  const req = (value) => ({ headers: { cookie: value ? `other=1; ${session.COOKIE}=${encodeURIComponent(value)}` : '' } });
  assert.strictEqual(session.whoIs(req(session.sign('sam@example.com'))).paid, true);
  assert.strictEqual(session.whoIs(req(null)).paid, false);
  assert.strictEqual(session.whoIs(req(session.sign('nobody@example.com'))).paid, false, 'valid cookie but never paid');

  // Cancelling locks the paid days again
  const cancelled = event('customer.subscription.deleted', { id: 'sub_1', customer: 'cus_1', status: 'canceled' });
  await payments.handleWebhook(cancelled, signed(cancelled));
  assert.strictEqual(session.whoIs(req(session.sign('sam@example.com'))).paid, false, 'cancelled subscription is no longer paid');
  const renewed = event('customer.subscription.updated', { id: 'sub_1', customer: 'cus_1', status: 'active' });
  await payments.handleWebhook(renewed, signed(renewed));
  assert.strictEqual(session.whoIs(req(session.sign('sam@example.com'))).paid, true, 'resubscribing unlocks again');

  // The rule
  const monday = lessons.find((l) => l.free);
  const tuesday = lessons.find((l) => !l.free);
  assert.ok(canRun(monday, { paid: false }) && !canRun(tuesday, { paid: false }) && canRun(tuesday, { paid: true }));

  // End to end against a real server: paid ticket refused without the cookie, allowed with it.
  const port = 3990 + Math.floor(Math.random() * 9);
  const srv = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server.js'], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(port), NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((ok) => srv.stdout.on('data', (d) => { if (String(d).includes('running')) ok(); }));
  const base = `http://localhost:${port}`;
  const run = (id, cookieHeader) => fetch(`${base}/api/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
    body: JSON.stringify({ lessonId: id, step: 99, sql: 'SELECT 1' }),
  });
  try {
    assert.strictEqual((await run(monday.id)).status, 200, 'Monday runs without paying');
    assert.strictEqual((await run(tuesday.id)).status, 402, 'Tuesday is refused without a cookie');
    assert.strictEqual((await run(tuesday.id, `${session.COOKIE}=${encodeURIComponent(session.sign('sam@example.com'))}`)).status, 200, 'Tuesday runs for a paid member');
    const meRes = await fetch(`${base}/api/me`, { headers: { Cookie: `${session.COOKIE}=${encodeURIComponent(session.sign('sam@example.com'))}` } }).then((r) => r.json());
    assert.ok(meRes.paid && meRes.email === 'sam@example.com' && meRes.plan === 'yearly', '/api/me reports the member');
    const unsigned = await fetch(`${base}/api/webhooks/payments`, { method: 'POST', body: completed, headers: { 'Stripe-Signature': 't=1,v1=00' } });
    assert.strictEqual(unsigned.status, 400, 'the live webhook endpoint refuses unsigned events');
  } finally {
    srv.kill();
  }

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('payments: all passed');
})().catch((e) => { console.error('payments: FAIL', e.message); process.exit(1); });
