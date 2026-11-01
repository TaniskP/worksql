// Work mode: clock in, and the screen becomes Harbour & Co. Tickets arrive in the inbox one at a time;
// you write the query in a studio window, run it, and send the results to whoever asked.
// The senior DBA reviews before anything goes out: their short notes are the marks, and the first time
// a ticket needs something new, they walk you through it in steps.
import { store, esc, nudgeForm, pingNudge, reviewerName } from '/js/common.js';
import { attachEditor } from '/js/editor.js';

const $ = (id) => document.getElementById(id);
const data = await (await fetch('/api/work')).json();
const DAYS = data.days.map((d) => ({ ...d, short: d.name.slice(0, 3) }));
const R = reviewerName(data.reviewer);
const paid = () => store.isPaid();
const unlocked = (l) => l.free || paid();
const closed = (l) => !!store.get().completed[l.id];
const first = (l) => l.from.name.split(' ')[0];
const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const COLORS = ['#c2410c', '#0f766e', '#7c3aed', '#be185d', '#1d4ed8', '#4d7c0f', '#b45309'];
const colorFor = (name) => COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
// No sign-up, so no name unless they've given one elsewhere.
const login = () => (store.get().name || 'you').toLowerCase().replace(/\s+/g, '.');
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// ---------- session state ----------
let day = null;            // DAYS entry
let tickets = [];          // lessons for the day, with .arrives (minutes since midnight)
let openId = null;         // ticket shown in the thread
const arrived = new Set(); // tickets that have reached the inbox this shift
const unread = new Set();
const threads = new Map(); // ticket id -> [{ html }]
const openedAt = new Map();
const asked = new Map();   // ticket id -> hints given
const stepOf = new Map();  // ticket id -> walkthrough step the learner is on
let clockMin = 9 * 60;
let shiftStart = 0;
let closedThisShift = 0;
let tabs = [];
let activeTab = null;
let tabSeq = 0;

const stepsOf = (l) => (l.steps && l.steps.length ? l.steps : null);
const onFinal = (l) => !stepsOf(l) || stepOf.get(l.id) >= l.steps.length - 1;

// ================= clock in =================
function renderClockIn() {
  const now = new Date();
  $('ci-time').textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  $('ci-date').textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const pick = DAYS.find((d) => dayTickets(d).some((l) => !closed(l) && unlocked(l))) || DAYS[0];
  // First visit: no menu. Clock in and Monday starts. The other days appear once a ticket is closed.
  const firstVisit = store.completedIds().length === 0;
  $('ci-pick').hidden = firstVisit;
  $('ci-title').textContent = firstVisit ? `${DAYS[0].name}, 09:00` : 'Clock in';
  $('ci-lede').textContent = firstVisit ? 'You’ve got 1 new message.' : 'Pick up where you left off, or choose a day.';
  $('ci-days').innerHTML = DAYS.map((d) => {
    const ls = dayTickets(d);
    const done = ls.filter(closed).length;
    const free = ls.every((l) => l.free);
    const tag = free ? '<span class="free-chip tag">Free</span>' : paid() ? '<span class="free-chip tag">Unlocked</span>' : '<span class="paid-chip tag">Paid</span>';
    return `<button type="button" class="day${d === pick ? ' active' : ''}${!free && !paid() ? ' locked' : ''}" data-day="${d.id}">
      <strong>Week ${d.week} · ${d.name}</strong>${tag}
      <span>${esc(d.title)} · ${ls.length} tickets · ${done} closed</span></button>`;
  }).join('');
  $('ci-days').querySelectorAll('.day').forEach((b) => b.addEventListener('click', () => {
    $('ci-days').querySelectorAll('.day').forEach((x) => x.classList.toggle('active', x === b));
  }));
  $('clockin').hidden = false;
  $('desk').hidden = true;
  $('clockout').hidden = true;
}

function dayTickets(d) {
  return data.lessons.filter((l) => l.day === d.id);
}

$('ci-form').addEventListener('submit', (e) => {
  e.preventDefault();
  ctx(); // the click unlocks audio for the inbox ping
  const active = $('ci-pick').hidden ? null : $('ci-days').querySelector('.day.active');
  clockIn(active ? DAYS.find((d) => d.id === Number(active.dataset.day)) : DAYS[0]);
});

// Monday in work mode opens with Harvey and the date filter (the mistake everyone makes once),
// then Tom's register. The rest follow the lesson order.
const MONDAY_LEADS = [5, 2];

function clockIn(d) {
  day = d;
  let t = 9 * 60 + 2;
  const rank = (l) => (d.id === 1 && MONDAY_LEADS.includes(l.id) ? MONDAY_LEADS.indexOf(l.id) : 100 + l.n);
  tickets = dayTickets(d).slice().sort((a, b) => rank(a) - rank(b))
    .map((l) => { const x = { ...l, arrives: t }; t += l.minutes * 3 + 6; return x; });
  arrived.clear(); unread.clear(); threads.clear(); openedAt.clear(); stepOf.clear();
  tabs = []; tabSeq = 0; activeTab = null; openId = null;
  closedThisShift = 0;
  shiftStart = Date.now();
  // Everything already closed is in the inbox; the first open ticket arrives a moment after clock-in.
  tickets.filter(closed).forEach((l) => arrived.add(l.id));
  clockMin = 9 * 60;
  $('clockin').hidden = true;
  $('desk').hidden = false;
  $('sb-login').textContent = `HARBOUR\\${login()}`;
  setStage('mail');
  buildTree();
  pingNudge();
  tickClock();
  $('table-info').hidden = true;
  renderInbox();
  showThread(null);
  const next = nextTicket();
  if (next && unlocked(next)) setTimeout(() => arrive(next), 900);
  else if (next) showThread(next.id);
}

// ================= the desk fills in as you go =================
// mail: just the inbox and the message. query: the query window and tables appear when you open one.
// Results appear after the first run; the reply button after a run that worked.
let stage = 'mail';
function setStage(s) {
  stage = s;
  $('desk').classList.toggle('stage-mail', s === 'mail');
  const wa = document.querySelector('.workarea');
  if (s === 'query') {
    const anyResult = tabs.some((tab) => tab.result);
    wa.classList.toggle('no-results', !anyResult);
    $('t-results').classList.toggle('on', anyResult);
  } else {
    $('win-title').textContent = `Inbox - Harbour & Co (HARBOUR\\${login()})`;
  }
}

function ensureTab(l) {
  const tab = tabs.find((t) => t.ticketId === l.id);
  if (tab) { switchTab(tab); return tab; }
  if (stepsOf(l) && !stepOf.has(l.id) && !closed(l)) stepOf.set(l.id, 0);
  const t = newQuery({ ticketId: l.id, sql: store.get().drafts[`w${l.id}`] ?? briefOf(l) + ((stepsOf(l) ? l.steps[0].starter : null) ?? l.starter ?? '') });
  // A walkthrough opens with one line from the senior DBA; the first step sits under it.
  if (stepsOf(l) && !closed(l)) t.note = { kind: 'info', who: R, text: `This one’s new: ${l.topic}. We’ll do it in pieces before anything goes to ${first(l)}.` };
  renderCoach();
  return t;
}

function openQueryWindow(l) {
  setStage('query');
  ensureTab(l);
  renderActions(l);
  editor.focus();
}

// ================= the inbox ping =================
let audio = null;
let muted = false;
try { muted = localStorage.getItem('worksql.ping') === 'off'; } catch { /* private mode */ }
function ctx() {
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch { /* no audio */ }
  return audio;
}
function ping() {
  const a = ctx();
  if (!a || muted) return;
  [[988, 0], [1319, 0.1]].forEach(([f, at]) => {
    const o = a.createOscillator(); const g = a.createGain(); const t = a.currentTime + at;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 0.35);
  });
}
function renderMute() { $('mute').textContent = muted ? '🔕' : '🔔'; $('mute').title = muted ? 'Turn the new-message ping on' : 'Mute the new-message ping'; }
$('mute').addEventListener('click', () => {
  muted = !muted;
  try { localStorage.setItem('worksql.ping', muted ? 'off' : 'on'); } catch { /* fine */ }
  renderMute();
  if (!muted) ping();
});
renderMute();

function nextTicket() {
  return tickets.find((l) => !closed(l));
}

function tickClock() {
  $('clock').textContent = `${day.short} ${hhmm(clockMin)}`;
}
setInterval(() => { if (!$('desk').hidden) { clockMin++; tickClock(); store.addSeconds(60); } }, 60000);

// ================= inbox =================
function arrive(l, { open = true } = {}) {
  arrived.add(l.id);
  unread.add(l.id);
  clockMin = Math.max(clockMin, l.arrives);
  tickClock();
  ping();
  toast(l);
  renderInbox();
  if (open) openTicket(l.id);
}

function toast(l) {
  const el = $('toast');
  el.innerHTML = `<b>${esc(l.from.name)}</b>${esc(l.title)}`;
  el.hidden = false;
  el.onclick = () => { el.hidden = true; openTicket(l.id); };
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 5000);
}

function mailItem(l, cls) {
  return `<li class="mail ${cls}" data-id="${l.id}">
    <span class="av" style="background:${colorFor(l.from.name)}">${initials(l.from.name)}</span>
    <span class="who">${esc(l.from.name)}</span><span class="when">${hhmm(l.arrives)}</span>
    <span class="subj">${esc(subjectOf(l))}</span></li>`;
}

function renderInbox() {
  const shown = tickets.filter((l) => arrived.has(l.id)).slice().reverse(); // newest first, like a mail client
  let html = shown.map((l) => mailItem(l, [closed(l) ? 'closed' : '', unread.has(l.id) ? 'unread' : '', l.id === openId ? 'open' : ''].join(' '))).join('');
  const waiting = tickets.filter((l) => !arrived.has(l.id) && !closed(l));
  const locked = waiting.filter((l) => !unlocked(l));
  const queued = waiting.length - locked.length;
  if (queued) html += `<li class="mail-group">${queued} more coming in today</li>`;
  if (locked.length) {
    html += `<li class="mail-group">${locked.length} waiting · paid plan</li>` + locked.map((l) => mailItem(l, 'locked')).join('');
  }
  // Free users see tomorrow's pile, by name, on the far side of the wall.
  const tomorrow = DAYS.find((d) => d.id === day.id + 1);
  // Only once today's free work has run out, so the first screen is just mail.
  if (!paid() && tomorrow && !locked.length && !queued && !nextTicket()) {
    const later = dayTickets(tomorrow);
    html += `<li class="mail-group">${tomorrow.name}’s inbox: ${later.length} tickets · paid plan</li>`
      + later.map((l) => mailItem({ ...l, arrives: 9 * 60 }, 'locked')).join('');
  }
  $('mail-list').innerHTML = html;
  $('mail-list').querySelectorAll('.mail').forEach((li) => li.addEventListener('click', () => {
    const id = Number(li.dataset.id);
    const l = data.lessons.find((x) => x.id === id);
    if (!unlocked(l)) { showLocked(l); return; }
    openTicket(id);
  }));
  const n = [...unread].filter((id) => !closed(data.lessons.find((l) => l.id === id))).length;
  $('inbox-count').textContent = n ? String(n) : '';
}

// ================= messages read like email =================
const addressOf = (name) => `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@harbour.co`;
// The subject line is the first sentence of the message, like someone typing it into Outlook.
const subjectOf = (l) => l.title.split(/(?<=[.?!])\s/)[0].replace(/[.?!]$/, '');

function mailMsg({ from, role, to, when, body, extra = '' }) {
  const me = from === 'You';
  const av = me ? `<span class="av" style="background:#1f5eff">${initials(store.get().name || 'Me')}</span>`
    : `<span class="av" style="background:${colorFor(from)}">${initials(from)}</span>`;
  return `<article class="em ${extra}"><header>${av}<div class="em-who"><b>${esc(from)}</b>${me ? '' : ` <span class="em-addr">&lt;${addressOf(from)}&gt;</span>`}
    <div class="em-to">${role ? `${esc(role)} · ` : ''}To: ${esc(to)}</div></div><time>${when}</time></header><div class="em-body">${body}</div></article>`;
}

function threadFor(l) {
  if (!threads.has(l.id)) {
    const msgs = [
      { html: `<h2 class="em-subject">${esc(subjectOf(l))}</h2>` },
      { html: mailMsg({ from: l.from.name, role: l.from.role, to: 'Me', when: hhmm(l.arrives),
        body: `<p>Hi,</p><p>${esc(l.title)}</p><p>Thanks,<br>${esc(first(l))}</p>` }) },
    ];
    if (closed(l)) msgs.push({ html: '<div class="sys-line closed">✓ Ticket closed</div>' });
    threads.set(l.id, msgs);
  }
  return threads.get(l.id);
}

function openTicket(id) {
  openId = id;
  unread.delete(id);
  const l = tickets.find((x) => x.id === id);
  if (!openedAt.has(id)) openedAt.set(id, Date.now());
  renderInbox();
  // Once the query window is open, each ticket gets its own tab.
  if (stage === 'query' && unlocked(l)) ensureTab(l);
  showThread(id);
}

function showThread(id) {
  const l = data.lessons.find((x) => x.id === id);
  if (!l) {
    $('thread').innerHTML = '<div class="reading-empty">Nothing open yet.<br>New messages land on the left.</div>';
    $('thread-actions').innerHTML = '';
    return;
  }
  if (!unlocked(l)) { showLocked(l); return; }
  const t = tickets.find((x) => x.id === id) || l;
  $('thread').innerHTML = threadFor(t).map((m) => m.html).join('');
  $('thread').scrollTop = $('thread').scrollHeight;
  renderActions(t);
}

// Under the message: one next move. Teaching lives in the query window, not in the mail.
function renderActions(l) {
  if (closed(l)) {
    const next = nextTicket();
    $('thread-actions').innerHTML = `<div class="why">Closed. ${next ? (unlocked(next) ? 'The next one is in your inbox.' : 'The rest of today is on the paid plan.') : 'Inbox zero. Clock out when you’re ready.'}</div>`;
    return;
  }
  const tab = tabs.find((t) => t.ticketId === l.id);
  let html;
  if (stage === 'mail' || !tab) html = '<button class="btn btn-primary" id="open-q">Open a query window</button>';
  else if (!onFinal(l)) html = '<div class="why next">You’re working through it in the query window. The senior DBA is with you.</div>';
  else if (!tab.result) html = '<div class="why next">Write the query in the window, then hit <b>▶ Execute</b>.</div>';
  else if (tab.result.error) html = '<div class="why next">That run hit an error. The <b>Messages</b> tab says why.</div>';
  else html = `<button class="btn btn-primary" id="send">Send results to ${esc(first(l))}</button>`;
  $('thread-actions').innerHTML = html;
  $('open-q')?.addEventListener('click', () => openQueryWindow(l));
  $('send')?.addEventListener('click', () => send(l));
}

function showLocked(l) {
  const later = data.lessons.filter((x) => !unlocked(x));
  const paidDays = DAYS.filter((d) => dayTickets(d).some((x) => !x.free));
  $('thread').innerHTML = `<div class="locked-card">
    <h3>${esc(l.from.name)}’s ticket is on the paid plan.</h3>
    That’s the free day done. The rest of the week is ${paidDays.length} more inboxes, ${later.length} tickets, about six a day:
    <ol>${paidDays.map((d) => `<li><b>${d.name} (week ${d.week})</b>: ${esc(d.title)}, ${dayTickets(d).length} tickets</li>`).join('')}</ol>
    <a class="btn btn-primary" href="/pricing" style="width:100%">See plans</a></div>`;
  $('thread-actions').innerHTML = '';
}

// ================= the coach strip (top of the query window) =================
// The senior DBA's current step, a note when something's held back, and Kwame's one-line pointers.
const helperFor = (l) => (l.from.name.startsWith('Kwame') ? { name: 'Becky', role: 'Support' } : { name: 'Kwame', role: 'Data Analyst' });

function renderCoach() {
  const el = $('coach');
  const tab = activeTab;
  const l = tab && tab.ticketId && tickets.find((x) => x.id === tab.ticketId);
  if (!l || stage !== 'query' || closed(l) || !unlocked(l)) { el.hidden = true; return; }
  const lines = [];
  if (tab.note) lines.push(`<div class="cl ${tab.note.kind}"><b>${esc(tab.note.who)}:</b> ${esc(tab.note.text)}</div>`);
  const steps = stepsOf(l);
  let acts = '';
  if (steps && !onFinal(l)) {
    const i = stepOf.get(l.id);
    lines.push(`<div class="cl step"><b>${esc(R)}:</b> <span class="n">Step ${i + 1} of ${steps.length}</span> ${esc(steps[i].text)}</div>`);
    acts += `<button class="coach-btn" id="check" ${tab.result ? '' : 'disabled title="Run it first"'}>Check step ${i + 1}</button>`;
  } else if (steps && tab.stepsDone && !(tab.note && tab.note.kind === 'bad')) {
    lines.push(`<div class="cl step"><b>${esc(R)}:</b> Now the real thing. ${esc(steps[steps.length - 1].text)} Send it to ${esc(first(l))} when it’s right.</div>`);
  }
  if (tab.hint) lines.push(`<div class="cl hint"><b>${esc(helperFor(l).name)}:</b> ${esc(tab.hint)}</div>`);
  // Pointers only after they've had a go, one line at a time.
  if (tab.result && onFinal(l)) acts += `<button class="coach-link" id="ask">Ask ${esc(helperFor(l).name)}</button>`;
  if (tab.checking) lines.push(`<div class="cl wait">${esc(tab.checking)}</div>`);
  if (!lines.length && !acts) { el.hidden = true; return; }
  el.innerHTML = `<div class="coach-lines">${lines.join('')}</div><div class="coach-acts">${acts}</div>`;
  el.hidden = false;
  $('check')?.addEventListener('click', () => checkStep(l));
  $('ask')?.addEventListener('click', () => {
    const n = asked.get(l.id) || 0;
    tab.hint = n < l.hints.length ? l.hints[n] : 'That’s all I’ve got without writing it for you.';
    asked.set(l.id, n + 1);
    renderCoach();
  });
}

function briefOf(l) {
  return `-- ${l.from.name}: ${subjectOf(l)}\n${l.bullets.map((b) => `-- ${b}`).join('\n')}\n\n`;
}

// ================= walkthrough steps =================
let sending = false;
async function grade(l, step, sql) {
  const r = await fetch('/api/run', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: l.id, step, sql }),
  });
  if (r.status === 402) return { verdict: { pass: false, headline: 'This ticket is on the paid plan.', detail: 'There’s no active subscription on this browser.' } };
  return r.json();
}

async function checkStep(l) {
  const tab = tabs.find((t) => t.ticketId === l.id) || activeTab;
  if (sending || !tab.result) return;
  const i = stepOf.get(l.id);
  sending = true;
  const res = await grade(l, i, tab.result.sql);
  sending = false;
  const v = res.verdict || { pass: false, headline: res.error, detail: 'Fix that and run it again.' };
  if (!v.pass) {
    tab.note = { kind: 'bad', who: R, text: `${v.headline}${v.detail ? ` ${v.detail}` : ''}` };
  } else {
    tab.note = { kind: 'good', who: R, text: l.steps[i].done || 'Good.' };
    stepOf.set(l.id, i + 1);
    const next = l.steps[i + 1];
    if (next.final) tab.stepsDone = true;
    if (next.starter) { tab.sql = briefOf(l) + next.starter; if (tab === activeTab) editor.set(tab.sql); }
    tab.result = null; // the next step needs its own run
  }
  renderCoach();
  renderActions(l);
}

// ================= sending results =================
async function send(l) {
  const tab = tabs.find((t) => t.ticketId === l.id) || activeTab;
  if (sending || !tab.result || tab.result.error) return;
  const r = tab.result;
  sending = true;
  tab.note = null;
  tab.checking = `${R} is checking it before it goes out…`;
  renderCoach();
  const res = await grade(l, 99, r.sql);
  await new Promise((ok) => setTimeout(ok, 600));
  sending = false;
  tab.checking = null;
  const v = res.verdict || { pass: false, headline: res.error || 'Something went wrong.', detail: '' };

  // Wrong: the senior DBA holds it back, with a short note, before Harvey ever sees it.
  if (!v.pass) {
    tab.note = { kind: 'bad', who: R, text: `Held back. ${v.headline}${v.detail ? ` ${v.detail}` : ''}` };
    renderCoach();
    if (tab === activeTab && v.extraRows && v.extraRows.length) renderGrid(tab, new Set(v.extraRows));
    return;
  }

  // Right: your reply goes out, and a moment later they answer.
  const msgs = threadFor(l);
  const say = (html) => { msgs.push({ html }); if (openId === l.id) showThread(l.id); };
  const preview = r.rows.slice(0, 3);
  say(mailMsg({ from: 'You', to: l.from.name, when: hhmm(clockMin), extra: 'mine',
    body: `<p>Hi ${esc(first(l))},</p><p>Here you go.</p>
      <div class="attach"><div class="att-head">📎 Results · ${r.rows.length} row${r.rows.length === 1 ? '' : 's'}</div>
      <table><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${preview.map((row) => `<tr>${row.map((x) => `<td>${x === null ? 'NULL' : esc(x)}</td>`).join('')}</tr>`).join('')}</table></div>` }));
  store.complete(l.id, Math.round((Date.now() - (openedAt.get(l.id) || Date.now())) / 1000));
  closedThisShift++;
  pingNudge();
  renderActions(l);
  renderCoach();
  await new Promise((ok) => setTimeout(ok, 900));
  ping();
  say(mailMsg({ from: l.from.name, role: l.from.role, to: 'Me', when: hhmm(clockMin + 1), extra: 'reply',
    body: `<p>${esc(l.thanks)}</p><p>${esc(first(l))}</p>` }));
  say('<div class="sys-line closed">✓ Ticket closed</div>');
  clockMin += l.minutes;
  tickClock();
  renderInbox();

  const next = nextTicket();
  if (next && unlocked(next)) setTimeout(() => arrive(next), 1600);
  else if (next) setTimeout(() => { renderInbox(); }, 400);
}

// ================= object explorer =================
const expanded = new Set(['server', 'dbs', 'harbour', 'tables']);
function buildTree() {
  const row = (key, depth, label, { icon = '', open = null, cls = '', title = '' } = {}) =>
    `<div class="node ${cls}" data-key="${key}" style="padding-left:${6 + depth * 14}px" title="${esc(title)}">
      <span class="tw">${open === null ? '' : open ? '▾' : '▸'}</span><span class="ic">${icon}</span><span>${label}</span></div>`;
  let html = row('server', 0, `HARBOUR-SQL01 (SQL Server 16.0 - HARBOUR\\${esc(login())})`, { icon: '🖥', open: expanded.has('server') });
  if (expanded.has('server')) {
    html += row('dbs', 1, 'Databases', { icon: '📁', open: expanded.has('dbs') });
    if (expanded.has('dbs')) {
      html += row('harbour', 2, 'Harbour', { icon: '🛢', open: expanded.has('harbour') });
      if (expanded.has('harbour')) {
        html += row('tables', 3, 'Tables', { icon: '📁', open: expanded.has('tables') });
        if (expanded.has('tables')) {
          for (const t of data.schema) {
            const k = `t:${t.name}`;
            html += row(k, 4, `dbo.${esc(t.name)}`, { icon: '▦', open: expanded.has(k), cls: 'table', title: `${t.rows} rows. Right-click for scripts.` });
            if (expanded.has(k)) {
              const ck = `c:${t.name}`;
              html += row(ck, 5, 'Columns', { icon: '📁', open: expanded.has(ck) });
              if (expanded.has(ck)) {
                for (const c of t.columns) {
                  const name = /\s/.test(c.name) ? `[${c.name}]` : c.name;
                  const key = c.key === 'PK' ? '<span class="key">🔑</span>' : c.key === 'FK' ? '<span class="key">⚷</span>' : '';
                  html += row(`col:${t.name}:${c.name}`, 6, `${key} ${esc(name)} <span class="ty">(${c.key ? c.key + ', ' : ''}${esc(c.type)}, ${c.nullable ? 'null' : 'not null'})</span>`,
                    { icon: '▫', cls: 'col', title: 'Double-click to insert' });
                }
              }
            }
          }
        }
      }
    }
  }
  $('tree').innerHTML = html;
}

$('tree').addEventListener('click', (e) => {
  const n = e.target.closest('.node');
  if (!n) return;
  $('tree').querySelectorAll('.node.sel').forEach((x) => x.classList.remove('sel'));
  n.classList.add('sel');
  const k = n.dataset.key;
  if (k.startsWith('col:')) return;
  // Clicking a table name explains it; the arrow opens it (straight to its columns).
  if (k.startsWith('t:')) showTableInfo(k.slice(2));
  if (e.target.closest('.tw') || !n.classList.contains('table')) {
    const opening = !expanded.has(k);
    if (opening) expanded.add(k); else expanded.delete(k);
    if (opening && k.startsWith('t:')) { expanded.add(`c:${k.slice(2)}`); emit('expand', k.slice(2)); }
    buildTree();
    $('tree').querySelector(`[data-key="${CSS.escape(k)}"]`)?.classList.add('sel');
  }
});

// ================= table guide =================
function showTableInfo(name) {
  const t = data.schema.find((x) => x.name === name);
  const box = $('table-info');
  const peekSql = `SELECT TOP 10 * FROM dbo.${t.name}`;
  box.innerHTML = `<div class="ti-head"><b>dbo.${esc(t.name)}</b><button class="ti-x" title="Close">✕</button></div>
    <div class="ti-meta">${t.rows} rows · ${t.columns.length} columns</div>
    <p>${esc(t.description || '')}</p>
    <div class="ti-try">Peek at the first 10 rows:<code>${esc(peekSql)}</code></div>
    <div class="ti-actions"><button class="ti-run">▶ Run</button><button class="ti-use">Use in editor</button></div>`;
  box.hidden = false;
  box.querySelector('.ti-x').onclick = () => { box.hidden = true; };
  box.querySelector('.ti-use').onclick = () => peek(peekSql);
  box.querySelector('.ti-run').onclick = () => { peek(peekSql); execute(); };
}

// Peek queries get their own tab so they never overwrite a ticket's query.
function peek(sql) {
  let tab = tabs.find((t) => t.peek);
  if (!tab) { tab = newQuery({ sql }); tab.peek = true; tab.name = 'Peek.sql'; renderTabs(); }
  tab.sql = sql;
  switchTab(tab);
  emit('peek', sql);
}

// ================= events the tour listens to =================
const listeners = {};
const on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); return () => { listeners[ev] = listeners[ev].filter((f) => f !== fn); }; };
const emit = (ev, x) => (listeners[ev] || []).slice().forEach((fn) => fn(x));
$('tree').addEventListener('dblclick', (e) => {
  const n = e.target.closest('.node');
  if (!n) return;
  const k = n.dataset.key;
  if (k.startsWith('col:')) { const c = k.split(':')[2]; editor.insert(/\s/.test(c) ? `[${c}]` : c); }
  else if (k.startsWith('t:')) {
    expanded.has(k) ? expanded.delete(k) : expanded.add(k);
    expanded.add(`c:${k.slice(2)}`);
    buildTree();
  }
});
$('tree').addEventListener('contextmenu', (e) => {
  const n = e.target.closest('.node.table');
  if (!n) return;
  e.preventDefault();
  const table = data.schema.find((t) => t.name === n.dataset.key.slice(2));
  const menu = $('ctx');
  menu.innerHTML = `<button data-a="top">Select Top 1000 Rows</button><button data-a="script">Script Table as SELECT To New Query Window</button><hr>
    <button data-a="name">Insert name into query</button><button data-a="count">Count rows</button>`;
  menu.style.left = `${e.clientX}px`; menu.style.top = `${e.clientY}px`;
  menu.hidden = false;
  menu.onclick = (ev) => {
    const a = ev.target.dataset.a;
    menu.hidden = true;
    const cols = table.columns.map((c) => `[${c.name}]`);
    if (a === 'top') {
      newQuery({ sql: `/****** Script for SelectTopNRows command  ******/\nSELECT TOP (1000) ${cols.join('\n      ,')}\n  FROM [Harbour].[dbo].[${table.name}]` });
      execute();
    } else if (a === 'script') {
      newQuery({ sql: `USE [Harbour]\nGO\n\nSELECT ${cols.join('\n      ,')}\n  FROM [dbo].[${table.name}]\nGO` });
    } else if (a === 'name') editor.insert(`dbo.${table.name}`);
    else if (a === 'count') { newQuery({ sql: `SELECT COUNT(*) AS row_count FROM dbo.${table.name}` }); execute(); }
  };
});
document.addEventListener('click', (e) => { if (!e.target.closest('#ctx')) $('ctx').hidden = true; });

// ================= query windows =================
const editor = attachEditor($('editor'), {
  fixedHeight: true, minLines: 1, lineHeight: 19,
  schema: Object.fromEntries(data.schema.map((t) => [t.name, t.columns.map((c) => c.name)])),
  onChange: (v) => { if (activeTab) { activeTab.sql = v; if (activeTab.ticketId) store.setDraft(`w${activeTab.ticketId}`, v); } },
});

function newQuery({ ticketId = null, sql = '' } = {}) {
  const tab = { key: ++tabSeq, name: `SQLQuery${tabSeq}.sql`, ticketId, sql, result: null };
  tabs.push(tab);
  switchTab(tab);
  return tab;
}

function switchTab(tab) {
  activeTab = tab;
  editor.set(tab.sql, { silent: true });
  editor.focus();
  renderTabs();
  renderResult(tab);
  renderCoach();
  const who = tab.ticketId ? ` (${first(data.lessons.find((l) => l.id === tab.ticketId))})` : '';
  $('win-title').textContent = `${tab.name}${who} - HARBOUR-SQL01.Harbour (HARBOUR\\${login()}) - Harbour SQL Studio`;
}

function renderTabs() {
  $('doc-tabs').innerHTML = tabs.map((t) => {
    const who = t.ticketId ? ` · ${first(data.lessons.find((l) => l.id === t.ticketId))}` : '';
    return `<button class="doc-tab${t === activeTab ? ' active' : ''}" data-k="${t.key}">${t.name}${who}<span class="x" data-x="${t.key}" title="Close">✕</span></button>`;
  }).join('');
}
$('doc-tabs').addEventListener('click', (e) => {
  const x = e.target.closest('[data-x]');
  if (x) {
    const k = Number(x.dataset.x);
    const i = tabs.findIndex((t) => t.key === k);
    tabs.splice(i, 1);
    if (!tabs.length) newQuery();
    else if (activeTab.key === k) switchTab(tabs[Math.max(0, i - 1)]);
    else renderTabs();
    return;
  }
  const b = e.target.closest('.doc-tab');
  if (b) switchTab(tabs.find((t) => t.key === Number(b.dataset.k)));
});

// ================= execute / parse =================
const stamp = () => new Date().toISOString().replace('Z', '0000+00:00');
const dur = (ms) => `00:00:${String(Math.min(59, Math.floor(ms / 1000))).padStart(2, '0')}`;
function errNo(msg) {
  if (/^Invalid column/.test(msg)) return 207;
  if (/^Invalid object/.test(msg)) return 208;
  if (/^Incorrect syntax/.test(msg)) return 102;
  if (/not a recognized built-in/.test(msg)) return 195;
  if (/invalid in the select list/.test(msg)) return 8120;
  if (/does not exist/.test(msg)) return 911;
  return 50000;
}

let running = false;
async function execute() {
  if (running) return;
  const tab = activeTab;
  const sql = editor.selectedOrAll;
  if (!sql.trim()) return;
  running = true;
  setStatus('run', 'Executing query...');
  $('sb-left').textContent = 'Executing...';
  try {
    const r = await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) }).then((x) => x.json());
    tab.result = { ...r, sql };
    if (tab === activeTab) renderResult(tab);
    // First run: the results pane appears. And the thread's next move updates (check, send, or fix).
    document.querySelector('.workarea').classList.remove('no-results');
    $('t-results').classList.add('on');
    const open = tickets.find((x) => x.id === openId);
    if (open && unlocked(open)) renderActions(open);
    renderCoach();
    emit('run', { ok: !r.error, error: r.error, rows: r.rows ? r.rows.length : 0 });
  } catch {
    setStatus('err', 'Lost connection to HARBOUR-SQL01. Is the server running?');
  } finally {
    running = false;
    $('sb-left').textContent = 'Ready';
  }
}

async function parse() {
  const r = await fetch('/api/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: editor.selectedOrAll }) }).then((x) => x.json());
  showRes('msg');
  $('res-msg').innerHTML = r.error ? `<span class="err">Msg ${errNo(r.error)}, Level 16, State 1, Line 1\n${esc(r.error)}</span>` : 'Commands completed successfully.';
  setStatus(r.error ? 'err' : 'ok', r.error ? 'Parse failed.' : 'Commands completed successfully.');
}

function setStatus(kind, text) {
  $('query-status').className = `query-status ${kind}`;
  $('query-status').innerHTML = `<span>${esc(text)}</span><span style="margin-left:auto">HARBOUR-SQL01 | Harbour</span>`;
}

function showRes(which) {
  document.querySelectorAll('.res-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === which));
  $('res-grid').hidden = which !== 'grid';
  $('res-msg').hidden = which !== 'msg';
}
document.querySelectorAll('.res-tab').forEach((b) => b.addEventListener('click', () => showRes(b.dataset.tab)));

function renderGrid(tab, extra = new Set()) {
  const r = tab.result;
  $('res-grid').innerHTML = `<table class="sgrid"><tr><th class="rn"></th>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
    ${r.rows.map((row, i) => `<tr${extra.has(i) ? ' class="extra"' : ''}><td class="rn">${i + 1}</td>${row.map((v) => (v === null ? '<td class="null">NULL</td>' : `<td>${esc(v)}</td>`)).join('')}</tr>`).join('')}</table>`;
}

function renderResult(tab) {
  const r = tab.result;
  if (!r) {
    $('res-grid').innerHTML = '<div class="res-empty">Press F5 to execute. Select part of the query first to run just that part.</div>';
    $('res-msg').textContent = '';
    setStatus('', 'Ready');
    $('sb-time').textContent = '00:00:00'; $('sb-rows').textContent = '0 rows';
    showRes('grid');
    return;
  }
  $('sb-time').textContent = dur(r.ms || 0);
  if (r.error) {
    $('res-grid').innerHTML = '';
    $('res-msg').innerHTML = `<span class="err">Msg ${errNo(r.error)}, Level 16, State 1, Line 1\n${esc(r.error)}</span>\n\nCompletion time: ${stamp()}`;
    setStatus('err', 'Query completed with errors.');
    $('sb-rows').textContent = '0 rows';
    showRes('msg');
    return;
  }
  renderGrid(tab);
  $('res-msg').textContent = `(${r.rows.length} row${r.rows.length === 1 ? '' : 's'} affected)\n\nCompletion time: ${stamp()}`;
  setStatus('ok', 'Query executed successfully.');
  $('sb-rows').textContent = `${r.rows.length} row${r.rows.length === 1 ? '' : 's'}`;
  showRes('grid');
}

function toggleResults() {
  document.querySelector('.workarea').classList.toggle('no-results');
  $('t-results').classList.toggle('on', !document.querySelector('.workarea').classList.contains('no-results'));
}

$('t-new').addEventListener('click', () => newQuery());
$('t-exec').addEventListener('click', execute);
$('t-parse').addEventListener('click', parse);
$('t-results').addEventListener('click', toggleResults);
$('t-results').classList.add('on');

// The studio's shortcuts, caught before the browser's (F5 would otherwise reload the page).
document.addEventListener('keydown', (e) => {
  if ($('desk').hidden) return;
  const ctrl = e.ctrlKey || e.metaKey;
  if (e.key === 'F5' && ctrl) { e.preventDefault(); parse(); return; }
  if (e.key === 'F5' || (ctrl && e.key.toLowerCase() === 'e') || (e.altKey && e.key.toLowerCase() === 'x')) { e.preventDefault(); execute(); return; }
  if (ctrl && e.key.toLowerCase() === 'r') { e.preventDefault(); toggleResults(); }
}, true);

// ================= clock out =================
$('clock-out').addEventListener('click', () => {
  const mins = Math.max(1, Math.round((Date.now() - shiftStart) / 60000));
  const next = nextTicket();
  const s = (n, w) => `<b>${n}</b>${w}${n === 1 ? '' : 's'}`;
  $('co-stats').innerHTML = `<div>${s(closedThisShift, 'ticket')} closed</div><div>${s(mins, 'minute')} on shift</div><div><b>${store.streak()}</b>day streak</div>`;
  $('co-note').textContent = !next ? `${day.name}’s inbox is empty. Nice.`
    : unlocked(next) ? `${tickets.filter((l) => !closed(l)).length} tickets still open on ${day.name}. ${first(next)} is waiting on: “${next.title}”`
      : `The free shift is done. ${data.lessons.filter((l) => !unlocked(l)).length} more tickets are waiting on the paid plan.`;
  nudgeForm($('co-nudge'), next ? { title: `Want a nudge if ${first(next)} is still waiting?` } : {});
  $('desk').hidden = true;
  $('clockout').hidden = false;
});
$('co-again').addEventListener('click', renderClockIn);

// ================= first-shift tour =================
// A short guided walk for people who have never opened a database: what each panel is, what a table is,
// a first query of their own, where results land, then back to the real ticket.
const TOUR_KEY = 'worksql.tour';
function tourDone() { try { return localStorage.getItem(TOUR_KEY) === 'done'; } catch { return false; } }
function markTourDone() { try { localStorage.setItem(TOUR_KEY, 'done'); } catch { /* private mode: tour shows again next time */ } }

const FIRST_QUERY = 'SELECT TOP 10 * FROM dbo.Customers';
let tourAt = -1;
let tourOff = [];

function tourSteps() {
  const l = tickets.find((t) => t.id === openId && !closed(t)) || nextTicket();
  const who = l && unlocked(l) ? first(l) : 'your colleague';
  return [
    { title: 'Welcome to Harbour & Co', body: 'This is where you’ll work. It looks and feels like the real thing, but nothing here can break, so poke around.<br><br>Want a one-minute look around first?',
      buttons: [['Show me around', 'next'], ['Skip, I know my way', 'skip']] },
    { target: '.inbox', title: 'Your inbox', body: `People send you tickets here, like a work chat. ${esc(who)}’s is open below: that’s what they need from you.` },
    { target: '.explorer', title: 'The database', body: 'This is <b>Harbour</b>, the company database. Each <b>dbo.</b> name is a <b>table</b>: a grid of data, like a tab in a spreadsheet.<br><br>Click the <b>▸</b> next to <b>dbo.Customers</b> to look inside.',
      wait: 'expand', waiting: 'Waiting for you to click ▸…' },
    { target: '.explorer', title: 'Columns', body: 'Those are its <b>columns</b>: the headings of the grid. 🔑 marks the ID that makes every row unique.<br><br>Columns tell you <i>what</i> is stored. To see the actual <b>rows</b>, you ask the database with a query.' },
    { target: '#editor', title: 'Your first query', body: `This is the query window. Type this in yourself, or let us paste it:<code>${FIRST_QUERY}</code>Then hit <b>▶ Run</b> below.<br><span class="tour-small">In plain English: “show me the first 10 rows of Customers”. Later, <b>F5</b> does the same, like in SSMS.</span>`,
      buttons: [['▶ Run', 'run'], ['Use in editor', 'use']], wait: 'run', waiting: 'Waiting for you to run it…' },
    { target: '#results-pane', title: 'The results', body: 'That’s your answer. Each line is a <b>row</b>: one customer. The grey numbers down the left just count them.<br><br>If something goes wrong, the <b>Messages</b> tab says why, in SQL Server’s own words.' },
    { target: '.explorer', title: 'Look around', body: 'Every table works the same way. <b>Click any table name</b> to see what’s in it, with a peek query you can drop into the editor.<br><br>Orders and Products are good ones to try.' },
    { target: '.thread-actions', title: `Back to ${esc(who)}`, body: `Now the real ticket. Read ${esc(who)}’s message, write the query in ${esc(who)}’s tab, press <b>F5</b>, then <b>Send results to ${esc(who)}</b>.<br><br>Stuck? <b>Ask Kwame</b> for a pointer. He won’t write it for you.`,
      buttons: [['Start the ticket', 'done']] },
  ];
}

function startTour() {
  endTour(false);
  tourAt = 0;
  renderTour();
}

function endTour(save = true) {
  tourOff.forEach((off) => off());
  tourOff = [];
  tourAt = -1;
  $('tour-ring').hidden = true;
  $('tour-card').hidden = true;
  if (save) markTourDone();
}

function tourNext() {
  tourOff.forEach((off) => off());
  tourOff = [];
  tourAt++;
  if (tourAt >= tourSteps().length) { endTour(); return; }
  renderTour();
}

function renderTour() {
  const steps = tourSteps();
  const s = steps[tourAt];
  const card = $('tour-card');
  const dots = steps.slice(1).map((_, i) => `<i class="${i + 1 <= tourAt ? 'on' : ''}"></i>`).join('');
  const buttons = (s.buttons || (s.wait ? [] : [['Next', 'next']]))
    .map(([label, act], i) => `<button class="${i === 0 ? 'btn btn-primary' : 'btn btn-ghost'}" data-act="${act}">${label}</button>`).join('');
  card.innerHTML = `<div class="tour-step">${tourAt ? `Step ${tourAt} of ${steps.length - 1}` : 'First shift'}</div>
    <h3>${s.title}</h3><div class="tour-body">${s.body}</div>
    ${s.waiting ? `<div class="tour-wait"><span class="tour-spin"></span>${s.waiting}</div>` : ''}
    <div class="tour-btns">${buttons}</div>
    ${tourAt ? `<div class="tour-foot"><span class="tour-dots">${dots}</span><button class="tour-skip" data-act="skip">Skip tour</button></div>` : ''}`;
  card.hidden = false;
  card.classList.remove('in');
  requestAnimationFrame(() => card.classList.add('in'));
  card.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    const act = b.dataset.act;
    if (act === 'next') tourNext();
    else if (act === 'skip') endTour();
    else if (act === 'use') peek(FIRST_QUERY);
    else if (act === 'run') {
      // Run whatever they've typed; if the editor is still empty, paste the query first.
      if (!editor.value.trim()) peek(FIRST_QUERY);
      execute();
    }
    else if (act === 'done') {
      const tab = tabs.find((t) => t.ticketId === openId);
      if (tab) switchTab(tab);
      endTour();
      editor.focus();
    }
  }));

  // Steps that wait for the learner to do the thing themselves.
  if (s.wait === 'expand') {
    tourOff.push(on('expand', () => setTimeout(tourNext, 350)));
  }
  if (s.wait === 'run') {
    tourOff.push(on('run', (r) => {
      if (r.ok) {
        celebrate('Your first query. Nice.');
        setTimeout(tourNext, 600);
      } else {
        const w = card.querySelector('.tour-wait');
        if (w) w.innerHTML = '<b>Close.</b> SQL Server didn’t like something: check the spelling against the line above and hit ▶ Run again.';
      }
    }));
  }
  placeTour();
}

function placeTour() {
  if (tourAt < 0) return;
  const s = tourSteps()[tourAt];
  const ring = $('tour-ring');
  const card = $('tour-card');
  const el = s.target && document.querySelector(s.target);
  ring.hidden = false;
  if (!el) {
    // No target: dim everything and centre the card.
    Object.assign(ring.style, { left: '50%', top: '50%', width: '0px', height: '0px' });
    Object.assign(card.style, { left: `${(innerWidth - card.offsetWidth) / 2}px`, top: `${Math.max(40, (innerHeight - card.offsetHeight) / 2)}px` });
    ring.classList.add('none');
    return;
  }
  ring.classList.remove('none');
  const r = el.getBoundingClientRect();
  const pad = 4;
  Object.assign(ring.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  const w = card.offsetWidth; const h = card.offsetHeight; const gap = 16;
  let left;
  if (r.right + gap + w < innerWidth - 8) left = r.right + gap;
  else if (r.left - gap - w > 8) left = r.left - gap - w;
  else left = Math.min(innerWidth - w - 8, Math.max(8, r.left + 24));
  const top = Math.min(innerHeight - h - 12, Math.max(12, r.top + 12));
  Object.assign(card.style, { left: `${left}px`, top: `${top}px` });
}
addEventListener('resize', placeTour);

function celebrate(text) {
  const el = $('toast');
  el.innerHTML = `<b>✓ ${esc(text)}</b>That’s the whole loop: ask, run, read the rows.`;
  el.hidden = false;
  el.onclick = () => { el.hidden = true; };
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 3500);
}

$('t-tour').addEventListener('click', startTour);

// Homepage Clock in free skips the arrival screen; /work from the header still shows it.
if (new URLSearchParams(location.search).has('go')) {
  const pick = DAYS.find((d) => dayTickets(d).some((l) => !closed(l) && unlocked(l))) || DAYS[0];
  clockIn(pick);
} else {
  renderClockIn();
}