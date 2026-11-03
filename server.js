// WorkSQL server: static pages, the query sandbox, Stripe checkout-as-login. No dependencies.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const sandbox = require('./src/sandbox');
const { lessons, days, publicLesson, listing, lessonFor, stackDays } = require('./src/lessons');
const { dialectOf } = require('./src/dialects');
const { grade } = require('./src/grade');
const { SCHEMA, TABLE_INFO } = require('./src/seed');
const site = require('./src/site');
const { plans } = require('./src/plans');
const payments = require('./src/payments');
const nudges = require('./src/nudges');
const session = require('./src/session');
const members = require('./src/members');
const { canRun, devUnlockAllowed, DEV_EMAIL } = require('./src/access');
const restore = require('./src/restore');
const { articles, renderArticle, renderIndex, renderGuides, pathOf, sitemapPaths, listing: articleListing } = require('./src/articles');
const { tools, renderTools, renderTool, toolPaths } = require('./src/tools');
const { matchHub, hubPaths } = require('./src/hubs');
const { lookup } = require('./src/lookup');
const guard = require('./src/guard');
const status = require('./src/status');
const backup = require('./src/backup');
const analytics = require('./src/analytics');
const progress = require('./src/progress');
const waitlist = require('./src/waitlist');
const email = require('./src/email');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
};
const TABLES = ['Orders', 'OrderLines', 'Products', 'Customers', 'Staff', 'Returns'];
const PAGES = {
  '/': 'index.html', '/lessons': 'lessons.html', '/pricing': 'pricing.html', '/work': 'work.html',
  '/support': 'support.html', '/privacy': 'privacy.html', '/terms': 'terms.html', '/progress': 'progress.html',
};
// Page views we count (a number per day, nothing about who).
const VIEWS = { '/': 'view_home', '/pricing': 'view_pricing', '/work': 'view_work', '/progress': 'view_progress', '/lessons': 'view_lessons' };
const started = Date.now();
const tooMany = (res) => send(res, 429, { error: 'Too many requests. Give it a few seconds and try again.' });

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

function serveFile(res, file, origin = `http://localhost:${PORT}`) {
  const full = path.join(PUBLIC, file);
  if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, buf) => {
    if (err) return sendHtml(res, 404, errorPage(404));
    // no-cache: browsers may keep a copy but must check it's current, so a deploy shows up on the next load.
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    // Share tags need absolute links: %ORIGIN% in a page becomes the public address.
    res.end(path.extname(full) === '.html' ? buf.toString('utf8').replaceAll('%ORIGIN%', origin) : buf);
  });
}

// Column types as each stack would show them in its own catalogue.
function typeFor(type, dialect) {
  if (dialect === 'tsql') return type;
  const t = type.replace(/^nvarchar/, 'varchar');
  if (dialect === 'postgres') return t.replace(/^int$/, 'integer').replace(/^decimal/, 'numeric').replace(/^bit$/, 'boolean');
  return t.replace(/^bit$/, 'tinyint(1)');
}

async function api(req, res, url) {
  const p = url.pathname;
  let m;
  // The learner's stack: ?dialect= on GETs, "dialect" in POST bodies. Unknown values mean SQL Server.
  const qDialect = dialectOf(url.searchParams.get('dialect'));

  if (req.method === 'GET' && p === '/api/lessons') {
    return send(res, 200, { days: stackDays(qDialect), lessons: lessons.map((l) => listing(lessonFor(l, qDialect))) });
  }

  if (req.method === 'GET' && (m = p.match(/^\/api\/lessons\/(\d+)$/))) {
    const lesson = lessons.find((l) => l.id === +m[1]);
    if (!lesson) return send(res, 404, { error: 'No such lesson.' });
    const tables = {};
    for (const t of TABLES) tables[t] = await sandbox.preview(t, 3);
    const day = stackDays(qDialect).find((d) => d.id === lesson.day);
    const inDay = lessons.filter((l) => l.day === lesson.day);
    return send(res, 200, {
      lesson: publicLesson(lessonFor(lesson, qDialect)), dialect: qDialect, day, indexInDay: inDay.indexOf(lesson) + 1, daySize: inDay.length,
      total: lessons.length, paidCount: lessons.filter((l) => !l.free).length, paidDays: days.length - 1, reviewer: site.reviewer, tables, today: await sandbox.today(),
    });
  }

  if (req.method === 'POST' && p === '/api/run') {
    if (!guard.allow(req, 'run')) return tooMany(res);
    const { lessonId, step, sql, dialect } = await readJson(req);
    const lesson = lessons.find((l) => l.id === +lessonId);
    if (!lesson) return send(res, 404, { error: 'No such lesson.' });
    // Paid tickets need a paid member's cookie. Checked here on the server, not just hidden in the page.
    if (!canRun(lesson, session.whoIs(req))) return send(res, 402, { error: 'paid_only', message: 'This ticket is on the paid plan.' });
    return send(res, 200, await grade(lesson, step, sql, dialect));
  }

  // ---------- work mode ----------
  if (req.method === 'GET' && p === '/api/work') {
    const counts = await sandbox.counts();
    const schema = Object.entries(SCHEMA).map(([name, columns]) => ({
      name, rows: counts[name], description: TABLE_INFO[name], columns: columns.map(([col, type, nullable, key]) => ({ name: col, type: typeFor(type, qDialect), nullable, key: key || null })),
    }));
    return send(res, 200, {
      days: stackDays(qDialect), lessons: lessons.map((l) => publicLesson(lessonFor(l, qDialect))), dialect: qDialect, schema, reviewer: site.reviewer, today: await sandbox.today(),
    });
  }

  if (req.method === 'POST' && p === '/api/query') {
    if (!guard.allow(req, 'query')) return send(res, 429, { error: 'WorkSQL: that’s a lot of runs in a minute. Give it a few seconds and press Execute again.' });
    const { sql, dialect } = await readJson(req);
    const started = Date.now();
    const r = await sandbox.run(String(sql || ''), dialectOf(dialect));
    return send(res, 200, { ...r, ms: Date.now() - started });
  }

  if (req.method === 'POST' && p === '/api/parse') {
    if (!guard.allow(req, 'query')) return send(res, 429, { error: 'WorkSQL: that’s a lot of runs in a minute. Give it a few seconds and try again.' });
    const { sql, dialect } = await readJson(req);
    return send(res, 200, await sandbox.parse(String(sql || ''), dialectOf(dialect)));
  }

  if (req.method === 'GET' && p === '/api/plans') {
    const visible = plans.filter((x) => !x.hidden).map(({ providerPriceId, ...rest }) => rest);
    return send(res, 200, { plans: visible, paymentsLive: payments.live(), launch: launchOffer() });
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
    if (!guard.allow(req, 'checkout')) return tooMany(res);
    const { plan } = await readJson(req);
    analytics.count('checkout_start');
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

  if (req.method === 'POST' && p === '/api/restore') {
    if (!guard.allow(req, 'email')) return tooMany(res);
    const { email: typed } = await readJson(req);
    const out = await restore.request({ typed, origin: originOf(req), ip: guard.ipOf(req) });
    return send(res, out.status, out.body);
  }

  // ---------- progress that follows the person ----------
  // Free learners: an emailed link signs this browser in (no password), then progress syncs like a paid member's.
  if (req.method === 'POST' && p === '/api/save') {
    if (!guard.allow(req, 'email')) return tooMany(res);
    const { email: typed } = await readJson(req);
    const out = await restore.requestSave({ typed, origin: originOf(req), ip: guard.ipOf(req) });
    if (out.status === 200) analytics.count('save_progress');
    return send(res, out.status, out.body);
  }

  if (p === '/api/progress' && (req.method === 'GET' || req.method === 'POST')) {
    const who = session.whoIs(req);
    if (!who.email) return send(res, 401, { error: 'not_signed_in' });
    if (req.method === 'GET') return send(res, 200, { email: who.email, progress: progress.get(who.email) });
    if (!guard.allow(req, 'write')) return tooMany(res);
    return send(res, 200, { email: who.email, progress: progress.sync(who.email, (await readJson(req)).progress) });
  }

  if (req.method === 'POST' && p === '/api/event') {
    if (!guard.allow(req, 'write')) return send(res, 200, { ok: false });
    const { name } = await readJson(req);
    analytics.count(String(name || ''));
    return send(res, 200, { ok: true });
  }

  if (req.method === 'POST' && p === '/api/waitlist') {
    if (!guard.allow(req, 'write')) return tooMany(res);
    const out = waitlist.join(await readJson(req));
    if (out.ok) analytics.count('waitlist');
    return send(res, out.error ? 400 : 200, out);
  }

  if (req.method === 'GET' && p === '/api/status') return send(res, 200, { status: status.get(), support: supportEmail() });

  // ---------- launch-day admin: ADMIN_TOKEN in the x-admin-token header ----------
  if (p.startsWith('/api/admin/')) {
    if (!adminOk(req)) return send(res, 403, { error: 'Not available.' });
    if (req.method === 'GET' && p === '/api/admin/stats') {
      return send(res, 200, { days: analytics.report(14), health: await health(), waitlist: waitlist.size() });
    }
    if (req.method === 'POST' && p === '/api/admin/status') return send(res, 200, { status: status.set(await readJson(req)) });
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
    return send(res, 200, { articles: articles.map(articleListing) });
  }

  if (req.method === 'GET' && p === '/api/lookup') {
    return send(res, 200, { items: lookup() });
  }

  if (req.method === 'POST' && p === '/api/nudge') {
    if (!guard.allow(req, 'email')) return tooMany(res);
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

const supportEmail = () => process.env.SUPPORT_EMAIL || '';

// A launch code for the pricing page, e.g. LAUNCH_CODE=PRODUCTHUNT LAUNCH_OFFER="20% off your first month".
// The code itself is made in Stripe (Product catalogue > Coupons > Promotion codes); Checkout already accepts codes.
function launchOffer() {
  const code = process.env.LAUNCH_CODE;
  if (!code) return null;
  return { code, offer: process.env.LAUNCH_OFFER || 'a launch discount', ends: process.env.LAUNCH_ENDS || null };
}

function adminOk(req) {
  const want = process.env.ADMIN_TOKEN;
  const got = String(req.headers['x-admin-token'] || '');
  return Boolean(want && got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want)));
}

// What /health reports: is the sandbox answering, and is everything launch day needs switched on?
async function health() {
  const t = Date.now();
  const r = await Promise.race([sandbox.run('SELECT 1 AS ok', 'tsql'), new Promise((ok) => setTimeout(() => ok({ error: 'no answer in 2s' }), 2000))]);
  const sandboxOk = !r.error;
  return {
    ok: sandboxOk,
    uptimeMinutes: Math.round((Date.now() - started) / 60000),
    sandbox: { ok: sandboxOk, ms: Date.now() - t, waiting: sandbox.waiting(), error: r.error || undefined },
    payments: payments.live(),
    email: email.configured(),
    lastBackup: backup.latest(),
    status: status.get(),
  };
}

// The same look as the site, for a page that doesn't exist or a crash.
function errorPage(code) {
  const lost = code === 404;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${lost ? 'Not found' : 'Something broke'} · WorkSQL</title><link rel="stylesheet" href="/css/app.css">
  <main class="article" style="text-align:center;padding-top:72px"><h1>${lost ? 'That page isn’t here.' : 'That one’s on us.'}</h1>
  <p>${lost ? 'The link may be old. Your progress is safe.' : 'Something went wrong on the server. Your progress is safe in your browser. Try again in a moment.'}</p>
  <p><a class="btn btn-primary" href="/work">Back to the inbox</a> <a class="btn btn-ghost" href="/">Home</a> <a class="btn btn-ghost" href="/support">Support</a></p></main></html>`;
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(html);
}

function seoRoutes(req, res, url) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === '/tsql') return sendHtml(res, 200, renderIndex(originOf(req))), true;
  if (p === '/guides') return sendHtml(res, 200, renderGuides(originOf(req))), true;
  if (p === '/tools') return sendHtml(res, 200, renderTools(originOf(req))), true;
  const hubHtml = matchHub(p, originOf(req));
  if (hubHtml) return sendHtml(res, 200, hubHtml), true;
  const toolPage = p.match(/^\/tools\/([a-z0-9-]+)$/);
  if (toolPage) {
    const t = tools.find((x) => x.slug === toolPage[1]);
    if (!t) return false;
    return sendHtml(res, 200, renderTool(t, originOf(req))), true;
  }
  const guide = p.match(/^\/guides\/([a-z0-9-]+)$/);
  if (guide) {
    const a = articles.find((x) => x.slug === guide[1] && x.kind === 'guide');
    if (!a) {
      const other = articles.find((x) => x.slug === guide[1]);
      if (other) { res.writeHead(301, { Location: pathOf(other) }); res.end(); return true; }
      return false;
    }
    return sendHtml(res, 200, renderArticle(a, lessons.find((l) => l.id === a.lesson), originOf(req))), true;
  }
  const m = p.match(/^\/tsql\/([a-z0-9-]+)$/);
  if (m) {
    const a = articles.find((x) => x.slug === m[1] && x.kind !== 'guide');
    if (!a) {
      const other = articles.find((x) => x.slug === m[1]);
      if (other) { res.writeHead(301, { Location: pathOf(other) }); res.end(); return true; }
      return false;
    }
    return sendHtml(res, 200, renderArticle(a, lessons.find((l) => l.id === a.lesson), originOf(req))), true;
  }
  if (p === '/sitemap.xml') {
    const o = originOf(req);
    const day = '2026-11-01';
    const urls = [...sitemapPaths(), ...toolPaths(), ...hubPaths()];
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${o}${u}</loc><lastmod>${day}</lastmod></url>`).join('\n')}\n</urlset>\n`);
    return true;
  }
  if (p === '/robots.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`User-agent: *\nDisallow: /api/\nSitemap: ${originOf(req)}/sitemap.xml\n`);
    return true;
  }
  if (p === '/welcome' || p === '/restore') return true; // handled asynchronously in the request handler
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
    analytics.count('paid');
    res.writeHead(303, { Location: '/lessons?welcome=1', 'Set-Cookie': session.setCookieHeader(member.email, { secure: isHttps(req) }) });
    return res.end();
  }
  return sendHtml(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Payment · WorkSQL</title>
    <link rel="stylesheet" href="/css/app.css"><main class="article"><h1>We couldn't confirm that payment yet.</h1>
    <p>If you've just paid, give it a few seconds and try again. If you didn't finish checking out, nothing was charged.</p>
    <p><a class="btn btn-primary" href="/welcome?session_id=${encodeURIComponent(url.searchParams.get('session_id') || '')}">Try again</a> <a class="btn btn-ghost" href="/pricing">Back to pricing</a></p></main>`);
}

// "Email me my progress" link: signs this browser in as that email (free or paid), then shows their progress.
function signIn(req, res, url) {
  const addr = restore.confirmSave(url.searchParams.get('token'));
  if (addr) {
    res.writeHead(303, { Location: '/progress?saved=1', 'Set-Cookie': session.setCookieHeader(addr, { secure: isHttps(req) }) });
    return res.end();
  }
  return sendHtml(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in · WorkSQL</title>
    <link rel="stylesheet" href="/css/app.css"><main class="article"><h1>That link has expired.</h1>
    <p>Links last 15 minutes. Ask for a new one from your Progress page.</p>
    <p><a class="btn btn-primary" href="/progress">Progress</a></p></main>`);
}

// Already-paid link from email. The form never sets the cookie; this click does.
async function restoreAccess(req, res, url) {
  const member = restore.confirm(url.searchParams.get('token'));
  if (member) {
    res.writeHead(303, { Location: '/lessons?restored=1', 'Set-Cookie': session.setCookieHeader(member.email, { secure: isHttps(req) }) });
    return res.end();
  }
  return sendHtml(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Restore · WorkSQL</title>
    <link rel="stylesheet" href="/css/app.css"><main class="article"><h1>That link has expired.</h1>
    <p>Ask for a new one from Pricing → Already paid. Links last 15 minutes.</p>
    <p><a class="btn btn-primary" href="/pricing#already-paid">Already paid</a></p></main>`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/health') { const h = await health(); return send(res, h.ok ? 200 : 503, h); }
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/signin') return signIn(req, res, url);
    if (url.pathname === '/admin') return serveFile(res, 'admin.html');
    if (url.pathname === '/welcome') return await welcome(req, res, url);
    if (url.pathname === '/restore') return await restoreAccess(req, res, url);
    if (seoRoutes(req, res, url)) return;
    if (PAGES[url.pathname]) { if (VIEWS[url.pathname]) analytics.count(VIEWS[url.pathname]); return serveFile(res, PAGES[url.pathname], originOf(req)); }
    if (/^\/lesson\/\d+\/?$/.test(url.pathname)) return serveFile(res, 'lesson.html');
    return serveFile(res, decodeURIComponent(url.pathname).replace(/^\/+/, ''));
  } catch (e) {
    console.error(e);
    if (res.headersSent) return res.end();
    if (url.pathname.startsWith('/api/')) return send(res, 500, { error: 'WorkSQL: something went wrong on our side. Try that again in a moment.' });
    return sendHtml(res, 500, errorPage(500));
  }
});

server.listen(PORT, () => console.log(`WorkSQL running at http://localhost:${PORT}`));

// Check for quiet learners every 15 minutes and send at most one "still waiting" email each.
const sweep = () => nudges.sweep(process.env.SITE_URL || `http://localhost:${PORT}`).catch((e) => console.error('[nudges]', e));
setTimeout(sweep, 10_000);
setInterval(sweep, 15 * 60 * 1000);

backup.schedule();
