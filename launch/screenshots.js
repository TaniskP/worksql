// Product Hunt gallery shots, taken from the running site with a headless Edge or Chrome.
//   npm start            (in one terminal)
//   node launch/screenshots.js [http://localhost:3000] [tsql|postgres|mysql]
// Writes launch/shots/*.png at 1440x900, 2x. Uses a throwaway browser profile, so nothing touches yours.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { lessons, lessonFor } = require('../src/lessons');

const BASE = process.argv[2] || 'http://localhost:3000';
const STACK = process.argv[3] || 'tsql';
const OUT = path.join(__dirname, 'shots');
const PORT = 9333;
const W = 1440; const H = 900;

const bin = [
  process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean).find((b) => fs.existsSync(b));
if (!bin) { console.error('No Edge or Chrome found. Set CHROME_PATH.'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A believable week: Monday closed except one, a held-back attempt or two, minutes on most days.
function seedState() {
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const monday = lessons.filter((l) => l.day === 1);
  const completed = {}; const log = {}; const minutes = {};
  monday.slice(0, 9).forEach((l, i) => {
    const sol = lessonFor(l, STACK).solution;
    const at = Date.now() - (9 - i) * 3600_000 * 7;
    completed[l.id] = { at, seconds: 90 + i * 37, attempts: i % 3 === 1 ? 2 : 1, sql: sol, dialect: STACK };
    if (i % 3 === 1) log[l.id] = [{ at: at - 60_000, pass: false, headline: 'Today’s orders are in there.', detail: 'Stop before today: order_date < today, not <=.', dialect: STACK }, { at, pass: true, headline: 'Matches.', dialect: STACK }];
  });
  [0, 1, 2, 4, 5, 8, 9, 11, 15, 16, 22].forEach((n, i) => { minutes[day(n)] = 6 + (i * 7) % 25; });
  return {
    completed, log, minutes, days: Object.keys(minutes), name: 'Sam', onboarded: true, drafts: {}, mocks: [
      { at: Date.now() - 86400_000, dialect: STACK, minutes: 24, limit: 30, score: 83, tickets: monday.slice(0, 5).map((l, i) => ({ id: l.id, closed: i !== 3, attempts: i === 1 ? 2 : 1, seconds: 200 + i * 40 })) },
    ],
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'worksql-shots-'));
  const browser = spawn(bin, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
  }
  if (!target) throw new Error('browser did not start');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener('open', ok, { once: true }));
  let seq = 0; const waiting = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } });
  const cdp = (method, params = {}) => new Promise((ok, bad) => {
    const id = ++seq; waiting.set(id, (m) => (m.error ? bad(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  const js = async (expr) => (await cdp('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true })).result.value;
  const go = async (url, wait = 1800) => { await cdp('Page.navigate', { url: BASE + url }); await sleep(wait); };
  const shot = async (name, { full = false } = {}) => {
    let clip;
    if (full) {
      const { contentSize } = await cdp('Page.getLayoutMetrics');
      clip = { x: 0, y: 0, width: W, height: Math.min(contentSize.height, 2600), scale: 1 };
    }
    const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(clip ? { clip } : {}) });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(data, 'base64'));
    console.log('wrote', path.join('launch', 'shots', name));
  };

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });

  // Fresh visitor: homepage, cookie notice answered so it isn't in every shot.
  await go('/');
  await js(`localStorage.clear(); localStorage.setItem('worksql_dialect', '${STACK}'); localStorage.setItem('worksql.consent', JSON.stringify({ choice: 'essential', at: new Date().toISOString() })); localStorage.setItem('worksql.v1', JSON.stringify({ onboarded: true, name: 'Sam' }));`);
  await go('/');
  await shot('01-home.png');

  // Inbox → query → results. Becky's Leeds ticket: no walkthrough, so it's the real thing straight away.
  const ticket = lessons.find((l) => l.id === 4);
  await go(`/work?go=1&day=1&open=${ticket.id}`, 3500);
  const sql = lessonFor(ticket, STACK).solution.replace(/`/g, '\\`');
  await js(`document.querySelector('.mail[data-id="${ticket.id}"]').click(); await new Promise(r => setTimeout(r, 300));
    const ta = document.querySelector('#editor textarea'); ta.value = \`${sql}\`; ta.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('t-exec').click(); await new Promise(r => setTimeout(r, 900));`);
  await shot('02-query.png');

  // A held-back send first (the coaching), then the right one going out.
  await js(`const ta = document.querySelector('#editor textarea'); ta.value = 'SELECT * FROM ${STACK === 'tsql' ? 'dbo.' : ''}Customers WHERE city = \\'Leeds\\''; ta.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('t-exec').click(); await new Promise(r => setTimeout(r, 900)); document.getElementById('send').click(); await new Promise(r => setTimeout(r, 1800));`);
  await shot('03-held-back.png');
  await js(`const ta = document.querySelector('#editor textarea'); ta.value = \`${sql}\`; ta.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('t-exec').click(); await new Promise(r => setTimeout(r, 900)); document.getElementById('send').click(); await new Promise(r => setTimeout(r, 3600));`);
  await shot('04-sent.png');

  // The progress board, with a believable week behind it.
  await js(`localStorage.setItem('worksql.v1', ${JSON.stringify(JSON.stringify(seedState()))});`);
  await go('/progress', 2500);
  await js(`const r = document.querySelector('.pg-row.has-log'); r && r.click();`);
  await shot('05-progress.png', { full: true });

  // The paywall that sells Tuesday.
  await go('/work?go=1&day=2', 3000);
  await shot('06-paywall.png');

  ws.close();
  browser.kill();
  await sleep(500);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold a file */ }
})().catch((e) => { console.error(e); process.exit(1); });
