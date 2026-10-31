// The homepage demo: one ticket, start to finish, played out in nine short scenes.
// It runs real queries against Harbour & Co, so the rows and the "6 rows, should be 5" mistake are genuine.
import { icons, esc } from '/js/common.js';
import { highlight } from '/js/editor.js';

const root = document.getElementById('demo');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ================= queries (run for real) =================
const SELECT_PART = `SELECT
    o.order_id,
    c.first_name + ' ' + c.last_name AS customer_name,
    o.order_date,
    o.total_amount
FROM Orders o
JOIN Customers c ON c.customer_id = o.customer_id
`;
const WRONG_WHERE = `WHERE o.order_date >= DATEADD(day, -7, GETDATE())
  AND o.total_amount > 50`;
const RIGHT_WHERE = `WHERE o.order_date >= DATEADD(day, -7, CAST(GETDATE() AS date))
  AND o.order_date < CAST(GETDATE() AS date)  -- not today
  AND o.total_amount > 50`;
const ORDER = '\nORDER BY o.order_date DESC;';
const WRONG_SQL = SELECT_PART + WRONG_WHERE + ORDER;
const RIGHT_SQL = SELECT_PART + RIGHT_WHERE + ORDER;

const today = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = iso(today);
let wrongRows = [];
let rightRows = [];

async function loadRows() {
  const q = (sql) => fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) }).then((r) => r.json());
  try {
    const [w, r] = await Promise.all([q(WRONG_SQL), q(RIGHT_SQL)]);
    if (w.rows && r.rows) { wrongRows = w.rows; rightRows = r.rows; return; }
  } catch { /* fall through to sample rows */ }
  const d = (n) => { const x = new Date(today); x.setDate(x.getDate() - n); return iso(x); };
  rightRows = [[10482, 'Isla Grant', d(1), 98.8], [10480, 'Nina Shah', d(2), 69], [10479, 'Niamh Quinn', d(3), 243], [10477, 'Freya Kerr', d(4), 63], [10475, 'Liam Murphy', d(6), 81.5]];
  wrongRows = [[10484, 'David Clarke', TODAY, 239.5], ...rightRows];
}

// ================= sound (synthesised, off until the visitor turns it on) =================
let audio = null;
let soundOn = false;
try { soundOn = localStorage.getItem('worksql.demoSound') === 'on'; } catch { /* private mode */ }

function ctx() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
  return audio;
}
function tone(freq, dur, { type = 'sine', vol = 0.12, at = 0 } = {}) {
  if (!soundOn) return;
  const a = ctx();
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
const sfx = {
  ping() { tone(988, 0.22, { vol: 0.14 }); tone(1319, 0.32, { vol: 0.11, at: 0.1 }); },
  click() { tone(1600, 0.035, { type: 'square', vol: 0.025 }); },
  key() { tone(2200 + Math.random() * 600, 0.018, { type: 'square', vol: 0.008 }); },
  error() { tone(330, 0.2, { type: 'triangle', vol: 0.12 }); tone(247, 0.3, { type: 'triangle', vol: 0.12, at: 0.16 }); },
  success() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { vol: 0.09, at: i * 0.08 })); },
  send() {
    if (!soundOn) return;
    const a = ctx();
    const len = a.sampleRate * 0.45;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    const f = a.createBiquadFilter();
    const g = a.createGain();
    src.buffer = buf;
    f.type = 'bandpass';
    f.frequency.setValueAtTime(500, a.currentTime);
    f.frequency.exponentialRampToValueAtTime(3500, a.currentTime + 0.4);
    g.gain.value = 0.18;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  },
};

// ================= timeline: pause, resume, jump to a chapter =================
class Cancelled extends Error {}
let runId = 0;
let paused = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wait(ms) {
  const id = runId;
  let left = reduceMotion ? Math.min(ms, 400) : ms;
  while (left > 0) {
    await sleep(Math.min(40, left));
    if (id !== runId) throw new Cancelled();
    if (!paused) left -= 40;
  }
}

// ================= markup =================
const LOCK = '<svg viewBox="0 0 24 24" width="13" height="13"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MAIL = [
  { k: 'james', from: 'James Rowe', ini: 'JR', color: '#7c3aed', subj: 'Last week’s orders over £50', prev: 'Need this for the 10am. Don’t include today.', time: '09:14' },
  { k: 'amy', from: 'Amy Nair', subj: 'Monthly revenue by product', prev: 'Can you pull this for last month?', time: '10:32', lock: true },
  { k: 'becky', from: 'Becky Ashworth', subj: 'Customers with no orders', prev: 'I need a list of customers who have never ordered.', time: '11:20', lock: true },
  { k: 'tom', from: 'Tom Gallagher', subj: 'Cancelled vs shipped', prev: 'Show me the cancelled orders this month.', time: '12:05', lock: true },
  { k: 'hr', from: 'HR Team', subj: 'System maintenance this weekend', prev: 'Heads up on Saturday’s maintenance.', time: '14:16', lock: true },
];

const top = (clock = '09:14') => `<div class="d-top"><span class="d-logo">${icons.logo}WorkSQL</span><span class="d-crumb">Harbour &amp; Co</span><span class="d-clock">${clock}</span></div>`;

function mailShell(main, { badge = false } = {}) {
  return `<div class="d-app">${top()}<div class="d-body d-mail">
    <nav class="d-nav"><a class="on"><span>▤</span> Inbox <b class="d-badge"${badge ? '' : ' hidden'}>1</b></a><a><span>➤</span> Sent</a><a><span>✎</span> Drafts</a><a><span>⌫</span> Deleted</a></nav>
    <main class="d-pane">${main}</main></div></div>`;
}

function mailItem(m, { cls = '', prev = m.prev, avatar } = {}) {
  const av = avatar || (m.lock ? LOCK : m.ini);
  return `<li class="d-item ${m.lock ? 'locked' : ''} ${cls}" data-k="${m.k}">
    <span class="d-av" style="${m.lock ? '' : `background:${m.color}`}">${av}</span>
    <div class="d-txt"><b>${esc(m.from)}</b><span class="d-subj">${esc(m.subj)}</span><span class="d-prev">${esc(prev)}</span></div>
    <span class="d-time">${m.time}</span><i class="d-dot"></i></li>`;
}

function inbox(items) {
  return `<div class="d-day">Today</div><ul class="d-list">${items.join('')}</ul>`;
}

const TREE_COLS = [['order_id', 'int'], ['customer_id', 'int'], ['order_date', 'date'], ['total_amount', 'decimal'], ['status', 'varchar']];
function ssmsShell({ ordersOpen = false } = {}) {
  const cols = TREE_COLS.map(([c, t]) => `<div class="d-node col"><span>▫</span> ${c} <em>(${t})</em></div>`).join('');
  return `<div class="d-app">${top('09:16')}<div class="d-body d-ssms">
    <aside class="d-oe"><div class="d-head">Object Explorer</div>
      <div class="d-node"><span>🖥</span> HARBOUR-SQL01</div>
      <div class="d-node l1"><span>▾ 📁</span> Tables</div>
      <div class="d-node l2 ${ordersOpen ? 'open' : ''}" data-k="orders"><span class="tw">${ordersOpen ? '▾' : '▸'}</span> ▦ dbo.Orders</div>
      <div class="d-cols ${ordersOpen ? 'show' : ''}">${cols}</div>
      ${['Customers', 'Staff', 'Products', 'OrderLines', 'Returns'].map((t) => `<div class="d-node l2"><span class="tw">▸</span> ▦ dbo.${t}</div>`).join('')}
    </aside>
    <main class="d-doc">
      <div class="d-toolbar"><span>＋ New Query</span><span class="d-exec" data-k="exec">▶ Execute</span><span class="d-conn">Connect: Harbour &amp; Co</span></div>
      <div class="d-tabs"><span class="on">query1.sql ✕</span><span>＋</span></div>
      <div class="d-editor"><div class="d-gutter"></div><pre class="d-code"></pre><ul class="d-suggest" hidden></ul></div>
      <div class="d-results" hidden></div>
    </main>
    <div class="d-tip" hidden></div>
  </div></div>`;
}

// ================= stage helpers =================
let stage; let app; let cursor; let scale = 1;
const $s = (sel) => stage.querySelector(sel);

function mount(html) {
  app.innerHTML = html;
}

function setCode(text, caret = true) {
  const code = $s('.d-code');
  if (!code) return;
  code.innerHTML = highlight(text).replace(/\n$/, '') + (caret ? '<span class="d-caret"></span>' : '');
  const lines = text.split('\n').length;
  $s('.d-gutter').innerHTML = Array.from({ length: Math.max(lines, 12) }, (_, i) => `<div>${i + 1}</div>`).join('');
}

async function type(text, from = '', { speed = 26, onChar } = {}) {
  let out = from;
  if (reduceMotion) { setCode(from + text); return from + text; }
  for (const ch of text) {
    out += ch;
    setCode(out);
    if (ch !== ' ' && ch !== '\n' && Math.random() < 0.5) sfx.key();
    if (onChar) onChar(out);
    await wait(ch === '\n' ? speed * 4 : speed + Math.random() * speed);
  }
  return out;
}

function relRect(el) {
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale };
}

async function moveTo(el, { dx = 0.5, dy = 0.5 } = {}) {
  if (!el) return;
  const r = relRect(el);
  cursor.hidden = false;
  cursor.style.transform = `translate(${r.x + r.w * dx}px, ${r.y + r.h * dy}px)`;
  await wait(800);
}

async function click(el) {
  await moveTo(el);
  cursor.classList.add('press');
  sfx.click();
  if (el) el.classList.add('d-pressed');
  await wait(220);
  cursor.classList.remove('press');
  if (el) el.classList.remove('d-pressed');
}

function tip(html) {
  const t = $s('.d-tip');
  t.innerHTML = html;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('in'));
}

function results(rows, { highlightToday = false, status = '' } = {}) {
  const box = $s('.d-results');
  box.hidden = false;
  const fmt = (v, i) => (i === 3 ? Number(v).toFixed(2) : esc(v));
  box.innerHTML = `<div class="d-rtabs"><span class="on">Results (${rows.length})</span><span>Messages</span><em class="d-status">${status}</em></div>
    <table><tr><th></th><th>order_id</th><th>customer_name</th><th>order_date</th><th>total_amount</th></tr>
    ${rows.map((r, i) => `<tr class="${highlightToday && String(r[2]).slice(0, 10) === TODAY ? 'today' : ''}" style="--d:${i * 90}ms"><td>${i + 1}</td>${r.map((v, j) => `<td>${fmt(v, j)}</td>`).join('')}</tr>`).join('')}</table>`;
  requestAnimationFrame(() => box.classList.add('in'));
}

// ================= the nine scenes =================
const scenes = [
  {
    title: 'Quiet inbox - one unread', short: 'Inbox',
    setup() { mount(mailShell(inbox(MAIL.slice(1).map((m) => mailItem(m))))); },
    async play() {
      await wait(900);
      $s('.d-list').insertAdjacentHTML('afterbegin', mailItem(MAIL[0], { cls: 'unread arriving' }));
      sfx.ping();
      const badge = $s('.d-badge');
      badge.hidden = false;
      badge.classList.add('pop');
      await wait(1200);
      await click($s('[data-k="james"]'));
      await wait(300);
    },
  },
  {
    title: 'Open the email - read the task', short: 'Email',
    setup() {
      mount(mailShell(`<article class="d-email">
        <header><span class="d-av" style="background:#7c3aed">JR</span><div><b>James Rowe</b><span>Sales Manager · To: Me</span></div><time>09:14</time></header>
        <div class="d-mailbody">
          <p class="fade">Hi,</p>
          <p class="fade">Need last week’s orders over £50 for the 10am.<br>Don’t include today. Show order date, customer name and total amount.</p>
          <p class="fade">Thanks,<br>James</p>
        </div>
        <div class="d-means"><b>What this means</b><ul>
          <li>Only orders from the last 7 days, not including today</li>
          <li>Total amount greater than 50</li>
          <li>Order by order_date, newest first</li></ul></div>
        <div class="d-open"><button class="d-openbtn" data-k="open">▦ Open query window</button><span>Write and run the query on the Harbour &amp; Co database.</span></div>
      </article>`));
    },
    async play() {
      for (const p of stage.querySelectorAll('.d-mailbody .fade')) { p.classList.add('in'); await wait(500); }
      $s('.d-means').classList.add('in');
      for (const li of stage.querySelectorAll('.d-means li')) { await wait(450); li.classList.add('in'); sfx.click(); }
      await wait(500);
      $s('.d-open').classList.add('in');
      $s('.d-openbtn').classList.add('pulse');
      await wait(900);
      await click($s('.d-openbtn'));
      await wait(300);
    },
  },
  {
    title: 'Query window opens - tables at your side', short: 'Query window',
    setup() {
      mount(ssmsShell());
      app.querySelector('.d-app').classList.add('opening');
      setCode('-- Write your query here, then press F5 to run', false);
    },
    async play() {
      await wait(700);
      await click($s('[data-k="orders"]'));
      const node = $s('[data-k="orders"]');
      node.classList.add('open');
      node.querySelector('.tw').textContent = '▾';
      $s('.d-cols').classList.add('show');
      await wait(900);
      tip('<b>Start with the Orders table.</b> You need order_date and total_amount. Join to Customers to get the customer name.');
      await wait(2200);
    },
  },
  {
    title: 'Start writing - suggestions help', short: 'Write',
    setup() {
      mount(ssmsShell({ ordersOpen: true }));
      setCode('');
    },
    async play() {
      tip('<b>Use the column names on the left.</b> Type <code>o.</code> or press Ctrl+Space for suggestions.');
      let text = await type(`SELECT
    o.order_id,
    c.first_name + ' ' + c.last_name AS customer_name,
    o.`);
      // Suggestions pop up at the caret, the selection moves, Enter accepts.
      const box = $s('.d-suggest');
      const caret = $s('.d-caret');
      const r = relRect(caret); const e = relRect($s('.d-editor'));
      box.style.left = `${r.x - e.x}px`;
      box.style.top = `${r.y - e.y + 20}px`;
      const opts = [['order_id', 'int'], ['customer_id', 'int'], ['order_date', 'date'], ['total_amount', 'decimal'], ['status', 'varchar']];
      let sel = 0;
      const draw = () => { box.innerHTML = opts.map(([c, t], i) => `<li class="${i === sel ? 'sel' : ''}"><span>o.${c}</span><em>${t}</em></li>`).join(''); };
      draw();
      box.hidden = false;
      await wait(700);
      for (sel = 1; sel <= 2; sel++) { draw(); sfx.click(); await wait(380); }
      await wait(300);
      box.hidden = true;
      text += 'order_date';
      setCode(text);
      sfx.click();
      await wait(300);
      await type(`,
    o.total_amount
FROM Orders o
JOIN Customers c ON c.customer_id = o.customer_id
${WRONG_WHERE}${ORDER}`, text, { speed: 18 });
      await wait(900);
    },
  },
  {
    title: 'First run - a common mistake', short: 'First run',
    setup() {
      mount(ssmsShell({ ordersOpen: true }));
      setCode(WRONG_SQL, false);
    },
    async play() {
      await wait(500);
      await click($s('[data-k="exec"]'));
      results([], { status: 'Executing query…' });
      await wait(600);
      results(wrongRows, { highlightToday: true, status: `${wrongRows.length} rows returned` });
      await wait(900 + wrongRows.length * 90);
      sfx.error();
      tip(`<div class="d-mark bad"><em>Senior DBA</em><b>You’ve included today.</b>Last 7 days is yesterday back, not today. You’ve got ${wrongRows.length} rows. Should be ${rightRows.length}.</div>`);
      $s('.d-tip').classList.add('mark');
      await wait(3200);
    },
  },
  {
    title: 'Fix and run again - correct result', short: 'Fix',
    setup() {
      mount(ssmsShell({ ordersOpen: true }));
      setCode(WRONG_SQL, false);
      results(wrongRows, { highlightToday: true, status: `${wrongRows.length} rows returned` });
    },
    async play() {
      await wait(600);
      // Delete the WHERE clause back to the JOIN, then type the fixed range.
      const tail = WRONG_SQL.slice(SELECT_PART.length);
      for (let i = tail.length; i >= 0; i -= 3) { setCode(SELECT_PART + tail.slice(0, i)); await wait(14); }
      await type(RIGHT_WHERE + ORDER, SELECT_PART, { speed: 20 });
      await wait(400);
      await click($s('[data-k="exec"]'));
      results([], { status: 'Executing query…' });
      await wait(600);
      results(rightRows, { status: `${rightRows.length} rows returned · Matches expected result ✓` });
      $s('.d-results').classList.add('good');
      await wait(700 + rightRows.length * 90);
      sfx.success();
      tip(`<div class="d-mark good"><span class="d-okic">${TICK}</span><b>${rightRows.length} rows. Matches.</b>2:14 on this one. Time to reply to James.</div>`);
      $s('.d-tip').classList.add('mark');
      await wait(2800);
    },
  },
  {
    title: 'Write and send the reply', short: 'Reply',
    setup() {
      mount(mailShell(`<article class="d-compose">
        <h4>RE: Last week’s orders over £50</h4>
        <div class="d-to">To: <span class="chip">James Rowe</span></div>
        <div class="d-toolbar2"><b>B</b><i>I</i><u>U</u><span>🔗</span><span>📎</span></div>
        <div class="d-reply"><span class="d-replytext"></span><span class="d-caret"></span></div>
        <div class="d-attach">📎 Results · <b class="d-attn">${rightRows.length} rows</b> · last_week_orders.xlsx</div>
        <blockquote>On Monday, James Rowe wrote:<br>Need last week’s orders over £50 for the 10am. Don’t include today.</blockquote>
        <div class="d-sendrow"><button class="d-send" data-k="send">➤ Send</button></div>
      </article>`));
    },
    async play() {
      await wait(500);
      const el = $s('.d-replytext');
      const msg = `Hi James,\n\nHere are last week’s orders over £50, not including today: ${rightRows.length} orders, newest first.\n\nThanks,\nSam`;
      let out = '';
      for (const ch of msg) {
        out += ch;
        el.textContent = out;
        if (ch !== ' ' && Math.random() < 0.4) sfx.key();
        await wait(ch === '\n' ? 120 : 22 + Math.random() * 22);
      }
      await wait(500);
      await click($s('[data-k="send"]'));
      sfx.send();
      $s('.d-compose').classList.add('sent');
      await wait(900);
    },
  },
  {
    title: 'Thread closed - back to the inbox', short: 'Closed',
    setup() {
      mount(mailShell(inbox([
        mailItem(MAIL[0], { cls: 'read', prev: 'You: Here are last week’s orders over £50…' }),
        ...MAIL.slice(1).map((m) => mailItem(m)),
      ])));
    },
    async play() {
      await wait(1100);
      const item = $s('[data-k="james"]');
      item.classList.add('closed', 'flash');
      item.querySelector('.d-av').innerHTML = TICK;
      item.querySelector('.d-prev').textContent = 'Thanks - that’s perfect. Going in the 10am.';
      item.querySelector('.d-time').textContent = '09:32';
      sfx.ping();
      await wait(600);
      $s('.d-pane').insertAdjacentHTML('beforeend', '<div class="d-toast">✓ Ticket closed · Sent to James</div>');
      sfx.success();
      await wait(2600);
    },
  },
  {
    title: 'What next - more real work', short: 'What next',
    setup() {
      mount(mailShell(`<div class="d-split"><div>${inbox([
        mailItem(MAIL[0], { cls: 'closed', prev: 'Thanks - that’s perfect.', avatar: TICK }),
        ...MAIL.slice(1).map((m) => mailItem(m)),
      ])}</div><aside class="d-cta">
        <span class="d-lockbig">${LOCK}</span>
        <h4>Want to solve more of these?</h4>
        <p>Amy, Becky and Tom are waiting. A working week of tickets, about six a day.</p>
        <a class="btn btn-primary" href="/work">Clock in free</a>
        <a class="d-plans" href="/pricing">See plans · £9.99 a month, cancel when you like</a>
      </aside></div>`));
    },
    async play() {
      for (const li of stage.querySelectorAll('.d-item.locked')) { li.classList.add('wiggle'); await wait(260); }
      $s('.d-cta').classList.add('in');
      await wait(700);
      await moveTo($s('.d-cta .btn'));
      cursor.classList.add('rest');
    },
  },
];

// ================= player =================
let current = 0;
let started = false;
let done = false;

function chapterUI() {
  root.querySelectorAll('.demo-chap').forEach((b, i) => {
    b.classList.toggle('on', i === current);
    b.classList.toggle('seen', i < current || done);
  });
  root.querySelector('.demo-num').textContent = `${current + 1}.`;
  root.querySelector('.demo-title').textContent = scenes[current].title;
}

async function playFrom(i) {
  runId++;
  done = false;
  started = true;
  setPlayIcon();
  const id = runId;
  cursor.hidden = true;
  cursor.className = 'demo-cursor';
  try {
    for (current = i; current < scenes.length; current++) {
      chapterUI();
      scenes[current].setup();
      await scenes[current].play();
      if (current < scenes.length - 1) await wait(500);
    }
    current = scenes.length - 1;
    done = true;
    chapterUI();
    setPlayIcon();
  } catch (e) {
    if (!(e instanceof Cancelled) || id === runId) throw e;
  }
}

function setPlayIcon() {
  const b = root.querySelector('[data-act="play"]');
  b.textContent = done ? '↻ Replay' : paused ? '▶ Play' : '❚❚ Pause';
}

function fit() {
  const wrap = root.querySelector('.demo-viewport');
  const narrow = wrap.clientWidth < 700;
  root.classList.toggle('narrow', narrow);
  // Lay out at a comfortable size, then scale down to fit (never up, so text stays crisp).
  const W = narrow ? 600 : Math.max(1000, wrap.clientWidth);
  const H = narrow ? 600 : 560;
  stage.style.width = `${W}px`;
  stage.style.height = `${H}px`;
  scale = Math.min(1, wrap.clientWidth / W);
  stage.style.transform = `scale(${scale})`;
  wrap.style.height = `${H * scale}px`;
}

async function init() {
  root.innerHTML = `
    <div class="demo-caption"><span class="demo-num">1.</span> <span class="demo-title">${scenes[0].title}</span></div>
    <div class="demo-viewport"><div class="demo-stage"><div class="demo-app"></div>
      <div class="demo-cursor" hidden><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l15 11-7 1.2L8.6 21z" fill="#0b1733" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></div>
    </div></div>
    <div class="demo-controls">
      <div class="demo-chaps">${scenes.map((s, i) => `<button class="demo-chap" data-i="${i}" title="${esc(s.title)}"><span>${i + 1}</span><em>${esc(s.short)}</em></button>`).join('')}</div>
      <div class="demo-buttons">
        <button data-act="play">❚❚ Pause</button>
        <button data-act="sound" aria-pressed="${soundOn}">${soundOn ? '🔊 Sound on' : '🔈 Sound off'}</button>
      </div>
    </div>`;
  stage = root.querySelector('.demo-stage');
  app = root.querySelector('.demo-app');
  cursor = root.querySelector('.demo-cursor');
  fit();
  new ResizeObserver(fit).observe(root.querySelector('.demo-viewport'));

  root.querySelectorAll('.demo-chap').forEach((b) => b.addEventListener('click', () => {
    paused = false;
    setPlayIcon();
    playFrom(Number(b.dataset.i));
  }));
  root.querySelector('[data-act="play"]').addEventListener('click', () => {
    if (done) { paused = false; playFrom(0); } else { paused = !paused; }
    setPlayIcon();
  });
  root.querySelector('[data-act="sound"]').addEventListener('click', (e) => {
    soundOn = !soundOn;
    try { localStorage.setItem('worksql.demoSound', soundOn ? 'on' : 'off'); } catch { /* fine */ }
    e.currentTarget.textContent = soundOn ? '🔊 Sound on' : '🔈 Sound off';
    e.currentTarget.setAttribute('aria-pressed', String(soundOn));
    if (soundOn) { ctx(); sfx.ping(); }
  });

  scenes[0].setup();
  chapterUI();
  await loadRows();

  // Start when it scrolls into view; pause when it leaves (unless the visitor paused it).
  let userPaused = false;
  root.querySelector('[data-act="play"]').addEventListener('click', () => { userPaused = paused; });
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!started) playFrom(0);
      else if (!userPaused) { paused = false; setPlayIcon(); }
    } else if (started && !done) { paused = true; setPlayIcon(); }
  }, { threshold: 0.35 }).observe(root);
}

if (root) init();
