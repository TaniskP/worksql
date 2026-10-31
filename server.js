// WorkSQL server: static pages, the query sandbox, Stripe checkout-as-login. No dependencies.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const sandbox = require('./src/sandbox');
const { lessons, days, publicLesson, listing } = require('./src/lessons');
const { grade } = require('./src/grade');
const { SCHEMA, TABLE_INFO } = require('./src/seed');
const site = require('./src/site');
const { plans } = require('./src/plans');
const payments = require('./src/payments');
const nudges = require('./src/nudges');
const session = require('./src/session');
const members = require('./src/members');
const { canRun, devUnlockAllowed, DEV_EMAIL } = require('./src/access');
const { articles, renderArticle, renderIndex } = require('./src/articles');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
};
const TABLES = ['Orders', 'OrderLines', 'Products', 'Customers', 'Staff', 'Returns'];
const PAGES = { '/': 'index.html', '/lessons': 'lessons.html', '/pricing': 'pricing.html', '/work': 'work.html' };

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 100_000) { reject(new Error('Too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
  });
}

// Webhooks need the exact bytes Stripe sent to check the signature, so no JSON parsing here.
function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 1_000_000) { reject(new Error('Too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

const isHttps = (req) => (process.env.SITE_URL || '').startsWith('https://') || req.headers['x-forwarded-proto'] === 'https';

function serveFile(res, file) {
  const full = path.join(PUBLIC, file);
  if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    // no-cache: browsers may keep a copy but must check it's current, so a deploy shows up on the next load.
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

async function api(req, res, url) {
  const p = url.pathname;
  let m;

  if (req.method === 'GET' && p === '/api/lessons') return send(res, 200, { days, lessons: lessons.map(listing) });

  if (req.method === 'GET' && (m = p.match(/^\/api\/lessons\/(\d+)$/))) {
    const lesson = lessons.find((l) => l.id === +m[1]);
    if (!lesson) return send(res, 404, { error: 'No such lesson.' });
    const tables = {};
    for (const t of TABLES) tables[t] = await sandbox.preview(t, 3);
    const day = days.find((d) => d.id === lesson.day);
    const inDay = lessons.filter((l) => l.day === lesson.day);
    return send(res, 200, {
      lesson: publicLesson(lesson), day, indexInDay: inDay.indexOf(lesson) + 1, daySize: inDay.length,
      total: lessons.length, paidCount: lessons.filter((l) => !l.free).length, paidDays: days.length - 1, reviewer: site.reviewer, tables, today: await sandbox.today(),
    });
  }

  if (req.method === 'POST' && p === '/api/run') {
    const { lessonId, step, sql } = await readJson(req);
    const lesson = lessons.find((l) => l.id === +lessonId);
    if (!lesson) return send(res, 404, { error: 'No such lesson.' });
    // Paid tickets need a paid member's cookie. Checked here on the server, not just hidden in the page.
    if (!canRun(lesson, session.whoIs(req))) return send(res, 402, { error: 'paid_only', message: 'This ticket is on the paid plan.' });
    return send(res, 200, await grade(lesson, step, sql));
  }

  // ---------- work mode ----------
  if (req.method === 'GET' && p === '/api/work') {
    const counts = await sandbox.counts();
    const schema = Object.entries(SCHEMA).map(([name, columns]) => ({
      name, rows: counts[name], description: TABLE_INFO[name], columns: columns.map(([col, type, nullable, key]) => ({ name: col, type, nullable, key: key || null })),
    }));
    return send(res, 200, { days, lessons: lessons.map(publicLesson), schema, reviewer: site.reviewer, today: await sandbox.today() });
  }

  if (req.method === 'POST' && p === '/api/query') {
    const { sql } = await readJson(req);
    const started = Date.now();
    const r = await sandbox.run(String(sql || ''));
    return send(res, 200, { ...r, ms: Date.now() - started });
  }

  if (req.method === 'POST' && p === '/api/parse') {
    const { sql } = await readJson(req);
    return send(res, 200, await sandbox.parse(String(sql || '')));
  }

  if (req.method === 'GET' && p === '/api/plans') {
    const visible = plans.filter((x) => !x.hidden).map(({ providerPriceId, ...rest }) => rest);
    return send(res, 200, { plans: visible, paymentsLive: payments.live() });
  }

  // ---------- payments and the login cookie ----------
  if (req.method === 'GET' && p === '/api/me') {
    const who = session.whoIs(req);
    return send(res, 200, {
      email: who.email, paid: who.paid, plan: who.plan,
      canManage: Boolean(who.member && who.member.customerId), paymentsLive: payments.live(), devUnlock: devUnlockAllowed(req),
    });
  }

  if (req.method === 'POST' && p === '/api/checkout') {
    const { plan } = await readJson(req);
    const out = await payments.createCheckout({ planId: plan, origin: originOf(req), email: session.whoIs(req).email });
    return send(res, out.status, out.body);
  }

  if (req.method === 'POST' && p === '/api/webhooks/payments') {
    const out = await payments.handleWebhook(await readRaw(req), req.headers['stripe-signature']);
    return send(res, out.status, out.body);
  }

  if (req.method === 'POST' && p === '/api/portal') {
    const url = await payments.portal(session.whoIs(req).member, originOf(req));
    return url ? send(res, 200, { url }) : send(res, 400, { error: 'No subscription to manage on this browser.' });
  }

  if (req.method === 'POST' && p === '/api/signout') {
    res.setHeader('Set-Cookie', session.clearCookieHeader());
    return send(res, 200, { ok: true });
  }

  // Local development: flip this browser between paid and free without going through Stripe.
  if (req.method === 'POST' && p === '/api/dev/plan') {
    if (!devUnlockAllowed(req)) return send(res, 403, { error: 'Not available.' });
    const { paid } = await readJson(req);
    if (paid) {
      members.upsert({ email: DEV_EMAIL, plan: 'yearly', status: 'active' });
      res.setHeader('Set-Cookie', session.setCookieHeader(DEV_EMAIL, { secure: false }));
    } else {
      res.setHeader('Set-Cookie', session.clearCookieHeader());
    }
    return send(res, 200, { ok: true });
  }

  // ---------- reference pages and nudges ----------
  if (req.method === 'GET' && p === '/api/site') return send(res, 200, site);

  if (req.method === 'GET' && p === '/api/articles') {
    return send(res, 200, { articles: articles.map(({ slug, name, short }) => ({ slug, name, short })) });
  }

  if (req.method === 'POST' && p === '/api/nudge') {
    const out = nudges.subscribe(await readJson(req));
    return send(res, out.error ? 400 : 200, out);
  }

  if (req.method === 'POST' && p === '/api/nudge/seen') {
    return send(res, 200, nudges.seen(await readJson(req)));
  }

  return send(res, 404, { error: 'Not found' });
}

// The public address, for canonical links and email links. Set SITE_URL in production.
const originOf = (req) => process.env.SITE_URL || `http://${req.headers.host || `localhost:${PORT}`}`;

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(html);
}

function seoRoutes(req, res, url) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === '/tsql') return sendHtml(res, 200, renderIndex(originOf(req))), true;
  const m = p.match(/^\/tsql\/([a-z0-9-]+)$/);
  if (m) {
    const a = articles.find((x) => x.slug === m[1]);
    if (!a) return false;
    return sendHtml(res, 200, renderArticle(a, lessons.find((l) => l.id === a.lesson), originOf(req))), true;
  }
  if (p === '/sitemap.xml') {
    const o = originOf(req);
    const urls = ['/', '/work', '/lessons', '/pricing', '/tsql', ...articles.map((a) => `/tsql/${a.slug}`)];
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${o}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
    return true;
  }
  if (p === '/robots.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`User-agent: *\nDisallow: /api/\nSitemap: ${originOf(req)}/sitemap.xml\n`);
    return true;
  }
  if (p === '/welcome') return true; // handled asynchronously in the request handler
  if (p === '/unsubscribe') {
    const ok = nudges.unsubscribe(url.searchParams.get('t') || '');
    sendHtml(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribed · WorkSQL</title>
      <link rel="stylesheet" href="/css/app.css"><main class="article"><h1>${ok ? 'Done. No more nudges.' : 'That link has expired.'}</h1>
      <p>${ok ? 'You won’t get “still waiting” emails from WorkSQL again.' : 'Nothing to unsubscribe.'}</p><p><a class="btn btn-primary" href="/">Back to WorkSQL</a></p></main>`);
    return true;
  }
  return false;
}

// Back from Stripe Checkout. Confirm the session with Stripe, save the member, set the login cookie.
async function welcome(req, res, url) {
  let member = null;
  try { member = await payments.completeCheckout(url.searchParams.get('session_id')); } catch (e) { console.error('[welcome]', e.message); }
  if (member) {
    res.writeHead(303, { Location: '/lessons?welcome=1', 'Set-Cookie': session.setCookieHeader(member.email, { secure: isHttps(req) }) });
    return res.end();
  }
  return sendHtml(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Payment · WorkSQL</title>
    <link rel="stylesheet" href="/css/app.css"><main class="article"><h1>We couldn't confirm that payment yet.</h1>
    <p>If you've just paid, give it a few seconds and try again. If you didn't finish checking out, nothing was charged.</p>
    <p><a class="btn btn-primary" href="/welcome?session_id=${encodeURIComponent(url.searchParams.get('session_id') || '')}">Try again</a> <a class="btn btn-ghost" href="/pricing">Back to pricing</a></p></main>`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/welcome') return await welcome(req, res, url);
    if (seoRoutes(req, res, url)) return;
    if (PAGES[url.pathname]) return serveFile(res, PAGES[url.pathname]);
    if (/^\/lesson\/\d+\/?$/.test(url.pathname)) return serveFile(res, 'lesson.html');
    return serveFile(res, decodeURIComponent(url.pathname).replace(/^\/+/, ''));
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Something went wrong.' });
  }
});

server.listen(PORT, () => console.log(`WorkSQL running at http://localhost:${PORT}`));

// Check for quiet learners every 15 minutes and send at most one "still waiting" email each.
const sweep = () => nudges.sweep(process.env.SITE_URL || `http://localhost:${PORT}`).catch((e) => console.error('[nudges]', e));
setTimeout(sweep, 10_000);
setInterval(sweep, 15 * 60 * 1000);
