// Work mode: clock in, and the screen becomes Harbour & Co. Tickets arrive in the inbox one at a time;
// you write the query in a studio window, run it, and send the results to whoever asked.
// The senior DBA reviews before anything goes out: their short notes are the marks, and the first time
// a ticket needs something new, they walk you through it in steps.
import { store, esc, nudgeForm, pingNudge, reviewerName, dialect, DIALECTS, stackPicker, quoteName, errorText, track, saveProgressForm, getPlans, money, startCheckout } from '/js/common.js';
import { attachEditor } from '/js/editor.js';

const $ = (id) => document.getElementById(id);
const stack = dialect();
const S = DIALECTS[stack];
const data = await (await fetch(`/api/work?dialect=${stack}`)).json();
const DAYS = data.days.map((d) => ({ ...d, short: d.name.slice(0, 3) }));
const R = reviewerName(data.reviewer);
const paid = () => store.isPaid();
const unlocked = (l) => l.free || paid();
// A mock shift is its own clean inbox: nothing counts as closed until it's closed in the mock.
let mock = null;
const closed = (l) => (mock ? mock.closed.has(l.id) : !!store.get().completed[l.id]);
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

// No walkthroughs in a mock shift: it's the real ticket straight away, like an interview.
const stepsOf = (l) => (!mock && l.steps && l.steps.length ? l.steps : null);
const onFinal = (l) => !stepsOf(l) || stepOf.get(l.id) >= l.steps.length - 1;

// ================= clock in =================
function renderClockIn() {
  mock = null;
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
  if (needsOnboarding()) { onboard(1); return; }
  ctx(); // the click unlocks audio for the inbox ping
  const active = $('ci-pick').hidden ? null : $('ci-days').querySelector('.day.active');
  clockIn(active ? DAYS.find((d) => d.id === Number(active.dataset.day)) : DAYS[0]);
});

// Monday in work mode opens with Harvey and the date filter (the mistake everyone makes once),
// then Tom's register. The rest follow the lesson order.
const MONDAY_LEADS = [5, 2];

function clockIn(d, list = null) {
  day = d;
  let t = 9 * 60 + 2;
  const rank = (l) => (d.id === 1 && MONDAY_LEADS.includes(l.id) ? MONDAY_LEADS.indexOf(l.id) : 100 + l.n);
  tickets = (list || dayTickets(d).slice().sort((a, b) => rank(a) - rank(b)))
    .map((l) => { const x = { ...l, arrives: t }; t += l.minutes * 3 + 6; return x; });
  track(mock ? 'mock_start' : 'clock_in');
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
  if (next && unlocked(next)) setTimeout(() => { if (!arrived.has(next.id)) arrive(next); }, 900);
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
  const saved = mock ? null : store.draft(`w${l.id}`);
  const t = newQuery({ ticketId: l.id, sql: saved ?? briefOf(l) + ((stepsOf(l) ? l.steps[0].starter : null) ?? l.starter ?? '') });
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
  if (mock) {
    const left = Math.max(0, mock.limit * 60 - Math.round((Date.now() - mock.startedAt) / 1000));
    $('clock').textContent = `Mock shift · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left`;
    $('clock').classList.toggle('low', left < 5 * 60);
    return;
  }
  $('clock').textContent = `${day.short} ${hhmm(clockMin)}`;
}
// The mock's countdown ticks every second; when it hits zero the shift ends with what's been sent.
setInterval(() => {
  if (!mock || $('desk').hidden) return;
  tickClock();
  if (Date.now() - mock.startedAt >= mock.limit * 60_000) finishMock('time');
}, 1000);
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
  const tomorrow = !mock && DAYS.find((d) => d.id === day.id + 1);
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

// The wall sells the week: the next inbox by name, one price, one button.
let plansInfo = null;
async function showLocked(l) {
  const later = data.lessons.filter((x) => !unlocked(x));
  const paidDays = DAYS.filter((d) => dayTickets(d).some((x) => !x.free));
  const nextDay = DAYS.find((d) => d.id === l.day) || paidDays[0];
  const inbox = dayTickets(nextDay);
  plansInfo = plansInfo || await getPlans().catch(() => ({ plans: [] }));
  const yearly = (plansInfo.plans || []).find((p) => p.id === 'yearly');
  const monthly = (plansInfo.plans || []).find((p) => p.id === 'monthly');
  const perMonth = yearly ? money(Math.round(yearly.price / 12)) : '';
  const launch = plansInfo.launch;
  $('thread').innerHTML = `<div class="locked-card sell">
    <div class="sell-kicker">${esc(nextDay.name)} · week ${nextDay.week} · ${esc(nextDay.title)}</div>
    <h3>${esc(nextDay.name)}’s inbox has ${inbox.length} tickets waiting.</h3>
    <ul class="sell-inbox">${inbox.map((x) => `<li><span class="av" style="background:${colorFor(x.from.name)}">${initials(x.from.name)}</span>
      <span><b>${esc(x.from.name)}</b> ${esc(subjectOf(x))}</span></li>`).join('')}</ul>
    <p class="sell-week">The paid week is ${paidDays.length} inboxes like this: ${later.length} tickets, about six a day, every one marked by ${esc(R)}.</p>
    ${yearly ? `<div class="sell-price"><b>${perMonth}/month</b>, billed yearly at ${money(yearly.price)}${monthly ? ` · or ${money(monthly.price)} monthly` : ''}</div>` : ''}
    ${launch ? `<div class="sell-code">Launch code <b>${esc(launch.code)}</b>: ${esc(launch.offer)}. Enter it at checkout.</div>` : ''}
    ${plansInfo.paymentsLive && yearly ? `<button class="btn btn-primary" id="buy-week" style="width:100%">Unlock the week</button>
    <a class="sell-more" href="/pricing">Compare plans</a>` : '<a class="btn btn-primary" href="/pricing" style="width:100%">See plans</a>'}</div>`;
  $('buy-week')?.addEventListener('click', (e) => startCheckout('yearly', e.currentTarget));
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
  try {
    const r = await fetch('/api/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: l.id, step, sql, dialect: stack }),
    });
    if (r.status === 402) return { verdict: { pass: false, headline: 'This ticket is on the paid plan.', detail: 'There’s no active subscription on this browser.' } };
    const j = await r.json().catch(() => null);
    return j || { error: 'The sandbox restarted before it could check that. Send it again.' };
  } catch {
    return { error: 'Lost the connection before it could check that. Send it again in a moment.' };
  }
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

  // Every marked send goes in the learning log: what failed and what the reviewer said.
  if (res.verdict) store.attempt(l.id, { pass: v.pass, headline: v.headline, detail: v.detail, sql: r.sql });
  if (mock) mock.attempts.set(l.id, (mock.attempts.get(l.id) || 0) + 1);

  // Wrong: the senior DBA holds it back, with a short note, before Harvey ever sees it.
  if (!v.pass) {
    track('ticket_held_back');
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
  const secs = Math.round((Date.now() - (openedAt.get(l.id) || Date.now())) / 1000);
  if (mock) { mock.closed.add(l.id); mock.seconds.set(l.id, secs); }
  else { store.complete(l.id, secs, { sql: r.sql, dialect: stack, columns: r.columns, rows: r.rows.length }); track('ticket_closed'); }
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
  else if (mock) setTimeout(() => finishMock('done'), 1800);
}

// ================= object explorer =================
const expanded = new Set(['server', 'dbs', 'harbour', 'tables']);
function buildTree() {
  const row = (key, depth, label, { icon = '', open = null, cls = '', title = '' } = {}) =>
    `<div class="node ${cls}" data-key="${key}" style="padding-left:${6 + depth * 14}px" title="${esc(title)}">
      <span class="tw">${open === null ? '' : open ? '▾' : '▸'}</span><span class="ic">${icon}</span><span>${label}</span></div>`;
  let html = row('server', 0, `${S.server} (${S.version} - HARBOUR\\${esc(login())})`,{ icon: '🖥', open: expanded.has('server') });
  if (expanded.has('server')) {
    html += row('dbs', 1, 'Databases', { icon: '📁', open: expanded.has('dbs') });
    if (expanded.has('dbs')) {
      html += row('harbour', 2, 'Harbour', { icon: '🛢', open: expanded.has('harbour') });
      if (expanded.has('harbour')) {
        html += row('tables', 3, 'Tables', { icon: '📁', open: expanded.has('tables') });
        if (expanded.has('tables')) {
          for (const t of data.schema) {
            const k = `t:${t.name}`;
            html += row(k, 4, `${SCHEMA_PREFIX}${esc(t.name)}`,{ icon: '▦', open: expanded.has(k), cls: 'table', title: `${t.rows} rows. Right-click for scripts.` });
            if (expanded.has(k)) {
              const ck = `c:${t.name}`;
              html += row(ck, 5, 'Columns', { icon: '📁', open: expanded.has(ck) });
              if (expanded.has(ck)) {
                for (const c of t.columns) {
                  const name = quoteName(c.name, stack);
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

// ================= the stack =================
// The same desk in SQL Server, PostgreSQL or MySQL: server name, scripts and quoting follow the stack.
const SCHEMA_PREFIX = stack === 'tsql' ? 'dbo.' : '';
const peekQuery = (name, n) => (stack === 'tsql' ? `SELECT TOP ${n} * FROM dbo.${name}` : `SELECT * FROM ${name} LIMIT ${n}`);
function scriptTop(table) {
  if (stack === 'tsql') {
    const cols = table.columns.map((c) => `[${c.name}]`);
    return `/****** Script for SelectTopNRows command  ******/\nSELECT TOP (1000) ${cols.join('\n      ,')}\n  FROM [Harbour].[dbo].[${table.name}]`;
  }
  return `SELECT ${table.columns.map((c) => quoteName(c.name, stack)).join('\n      ,')}\n  FROM ${table.name}\n LIMIT 1000`;
}
function scriptSelect(table) {
  if (stack === 'tsql') {
    const cols = table.columns.map((c) => `[${c.name}]`);
    return `USE [Harbour]\nGO\n\nSELECT ${cols.join('\n      ,')}\n  FROM [dbo].[${table.name}]\nGO`;
  }
  const q = (n) => (stack === 'mysql' ? `\`${n}\`` : `"${n}"`);
  return `SELECT ${table.columns.map((c) => q(c.name)).join('\n      ,')}\n  FROM ${q(stack === 'mysql' ? 'harbour' : 'public')}.${q(table.name)};`;
}
// Switching stack mid-ticket: same day, same ticket, reloaded with that stack's starter and steps.
function switchStack() {
  const params = new URLSearchParams({ go: '1' });
  if (day) params.set('day', day.id);
  const open = activeTab && activeTab.ticketId ? activeTab.ticketId : openId;
  if (open) params.set('open', open);
  location.href = `/work?${params}`;
}
stackPicker(document.querySelector('[data-stack-picker="work"]'), { onChange: switchStack, label: '' });
$('sb-server').textContent = `${S.server} (${S.version})`;
stackPicker(document.querySelector('[data-stack-picker="clockin"]'), { onChange: () => location.reload() });

// ================= table guide =================
function showTableInfo(name) {
  const t = data.schema.find((x) => x.name === name);
  const box = $('table-info');
  const peekSql = peekQuery(t.name, 10);
  box.innerHTML = `<div class="ti-head"><b>${SCHEMA_PREFIX}${esc(t.name)}</b><button class="ti-x" title="Close">✕</button></div>
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
  if (k.startsWith('col:')) { const c = k.split(':')[2]; editor.insert(quoteName(c, stack)); }
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
    if (a === 'top') {
      newQuery({ sql: scriptTop(table) });
      execute();
    } else if (a === 'script') {
      newQuery({ sql: scriptSelect(table) });
    } else if (a === 'name') editor.insert(`${SCHEMA_PREFIX}${table.name}`);
    else if (a === 'count') { newQuery({ sql: `SELECT COUNT(*) AS row_count FROM ${SCHEMA_PREFIX}${table.name}` }); execute(); }
  };
});
document.addEventListener('click', (e) => { if (!e.target.closest('#ctx')) $('ctx').hidden = true; });

// ================= query windows =================
const editor = attachEditor($('editor'), {
  fixedHeight: true, minLines: 1, lineHeight: 19,
  schema: Object.fromEntries(data.schema.map((t) => [t.name, t.columns.map((c) => c.name)])),
  onChange: (v) => { if (activeTab) { activeTab.sql = v; if (activeTab.ticketId && !mock) store.setDraft(`w${activeTab.ticketId}`, v); } },
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
  $('win-title').textContent = `${tab.name}${who} - ${S.server}.Harbour (HARBOUR\\${login()}) - Harbour SQL Studio · ${S.label}`;
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
    const r = await post('/api/query', { sql, dialect: stack });
    tab.result = { ...r, sql };
    if (tab === activeTab) renderResult(tab);
    // First run: the results pane appears. And the thread's next move updates (check, send, or fix).
    document.querySelector('.workarea').classList.remove('no-results');
    $('t-results').classList.add('on');
    const open = tickets.find((x) => x.id === openId);
    if (open && unlocked(open)) renderActions(open);
    renderCoach();
    emit('run', { ok: !r.error, error: r.error, rows: r.rows ? r.rows.length : 0 });
  } finally {
    running = false;
    $('sb-left').textContent = 'Ready';
  }
}

// A busy server, a restart or a dropped connection reads as a sandbox note, never a blank failure.
const OFFLINE = 'WorkSQL: lost the connection to the sandbox. Check your internet and press Execute again.';
const RESTARTED = 'The sandbox restarted. Run it again.';
async function post(url, body) {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => null);
    if (j && (j.error || j.columns || j.rows || res.ok)) return j;
    return { error: RESTARTED };
  } catch {
    return { error: OFFLINE };
  }
}

async function parse() {
  const r = await post('/api/parse', { sql: editor.selectedOrAll, dialect: stack });
  showRes('msg');
  $('res-msg').innerHTML = r.error ? `<span class="err">${esc(errorText(r.error, r.hint, stack))}</span>` : 'Commands completed successfully.';
  setStatus(r.error ? 'err' : 'ok', r.error ? 'Parse failed.' : 'Commands completed successfully.');
}

function setStatus(kind, text) {
  $('query-status').className = `query-status ${kind}`;
  $('query-status').innerHTML = `<span>${esc(text)}</span><span style="margin-left:auto">${esc(S.server)} | Harbour | ${esc(S.label)}</span>`;
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
    $('res-msg').innerHTML = `<span class="err">${esc(errorText(r.error, r.hint, stack))}</span>\n\nCompletion time: ${stamp()}`;
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
  if (mock) { finishMock('early'); return; }
  const mins = Math.max(1, Math.round((Date.now() - shiftStart) / 60000));
  const next = nextTicket();
  const s = (n, w) => `<b>${n}</b>${w}${n === 1 ? '' : 's'}`;
  $('co-stats').innerHTML = `<div>${s(closedThisShift, 'ticket')} closed</div><div>${s(mins, 'minute')} on shift</div><div><b>${store.streak()}</b>day streak</div>`;
  $('co-note').textContent = !next ? `${day.name}’s inbox is empty. Nice.`
    : unlocked(next) ? `${tickets.filter((l) => !closed(l)).length} tickets still open on ${day.name}. ${first(next)} is waiting on: “${next.title}”`
      : `The free shift is done. ${data.lessons.filter((l) => !unlocked(l)).length} more tickets are waiting on the paid plan.`;
  $('co-title').textContent = 'Shift over.';
  $('co-mock').hidden = true;
  // Their progress is the thing to protect: save it first, the nudge is part of that form.
  if (store.nudgeToken() || !next) nudgeForm($('co-nudge'), next ? { title: `Want a nudge if ${first(next)} is still waiting?` } : {});
  else $('co-nudge').innerHTML = '';
  saveProgressForm($('co-save'), { title: 'Don’t lose today', blurb: 'Your tickets are saved in this browser only. Get a link by email and they follow you to any laptop or phone.' });
  $('desk').hidden = true;
  $('clockout').hidden = false;
});
$('co-again').addEventListener('click', renderClockIn);

// ================= mock shift =================
// "Interview tomorrow": a timed shift of real tickets, no walkthroughs, then a score.
// Free: five of Monday's tickets in 30 minutes. Paid: one from each paid day, plus an interview classic, in 45.
function mockTickets() {
  const shuffle = (xs) => xs.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
  if (!paid()) return shuffle(dayTickets(DAYS[0])).slice(0, 5).sort((a, b) => a.n - b.n);
  const picks = DAYS.slice(1).map((d) => shuffle(dayTickets(d).filter((l) => l.kind !== 'Interview'))[0]).filter(Boolean);
  const classic = shuffle(data.lessons.filter((l) => l.kind === 'Interview'))[0];
  return [...picks, ...(classic ? [classic] : [])].slice(0, 7);
}

function startMock() {
  const list = mockTickets();
  mock = { startedAt: Date.now(), limit: paid() ? 45 : 30, closed: new Set(), attempts: new Map(), seconds: new Map(), ids: list.map((l) => l.id), over: false };
  clockIn({ id: 0, week: 0, name: 'Mock shift', short: 'Mock', title: 'Mock shift' }, list);
  $('desk').classList.add('mock');
}

// Each closed ticket is worth 100, less 15 for every held-back send before it (never below 40).
function scoreOf(m) {
  const per = m.ids.map((id) => (m.closed.has(id) ? Math.max(40, 100 - 15 * Math.max(0, (m.attempts.get(id) || 1) - 1)) : 0));
  return Math.round(per.reduce((a, b) => a + b, 0) / m.ids.length);
}

function finishMock(why) {
  if (!mock || mock.over) return;
  mock.over = true;
  const m = mock;
  const minutes = Math.max(1, Math.round((Date.now() - m.startedAt) / 60000));
  const score = scoreOf(m);
  const result = {
    at: Date.now(), dialect: stack, minutes, limit: m.limit, score,
    tickets: m.ids.map((id) => ({ id, closed: m.closed.has(id), attempts: m.attempts.get(id) || 0, seconds: m.seconds.get(id) || 0 })),
  };
  store.addMock(result);
  track('mock_finish');
  const verdict = score >= 80 ? 'Interview-ready. You’d get these done on the day.'
    : score >= 50 ? 'Close. Read the learning log on your Progress page for what got held back, then go again.'
      : 'Not yet. Work through the week first: every miss here is taught step by step there.';
  $('co-title').textContent = why === 'time' ? 'Time’s up.' : 'Mock shift over.';
  $('co-stats').innerHTML = `<div><b>${score}</b>score</div><div><b>${m.closed.size}/${m.ids.length}</b>closed</div><div><b>${minutes}</b>of ${m.limit} min</div>`;
  $('co-note').textContent = verdict;
  $('co-mock').hidden = false;
  $('co-mock').innerHTML = `<table class="mock-table"><tr><th>Ticket</th><th>From</th><th>Result</th><th>Sends</th><th>Time</th></tr>
    ${result.tickets.map((t) => { const l = data.lessons.find((x) => x.id === t.id); return `<tr><td>${esc(l.topic)}</td><td>${esc(first(l))}</td>
      <td>${t.closed ? '✓ Closed' : t.attempts ? 'Held back' : 'Not sent'}</td><td>${t.attempts}</td><td>${!t.seconds ? '–' : t.seconds < 60 ? `${t.seconds}s` : `${Math.round(t.seconds / 60)} min`}</td></tr>`; }).join('')}</table>
    <p class="muted-note">Saved to your <a href="/progress">Progress page</a>.${paid() ? '' : ' The paid plan’s mock shift draws from the whole week, joins and window functions included.'}</p>`;
  $('co-nudge').innerHTML = '';
  saveProgressForm($('co-save'), { title: 'Keep this score' });
  $('desk').classList.remove('mock');
  $('desk').hidden = true;
  $('clockout').hidden = false;
  mock = null;
}
$('ci-mock')?.addEventListener('click', () => { ctx(); startMock(); });

// ================= first-shift tour =================
// A short guided walk for people who have never opened a database: what each panel is, what a table is,
// a first query of their own, where results land, then back to the real ticket.
const TOUR_KEY = 'worksql.tour';
function tourDone() { try { return localStorage.getItem(TOUR_KEY) === 'done'; } catch { return false; } }
function markTourDone() { try { localStorage.setItem(TOUR_KEY, 'done'); } catch { /* private mode: tour shows again next time */ } }

const FIRST_QUERY = peekQuery('Customers', 10);
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
    { target: '#results-pane', title: 'The results', body: `That’s your answer. Each line is a <b>row</b>: one customer. The grey numbers down the left just count them.<br><br>If something goes wrong, the <b>Messages</b> tab says why, in ${S.short}’s own words.` },
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
        if (w) w.innerHTML = `<b>Close.</b> ${S.short} didn’t like something: check the spelling against the line above and hit ▶ Run again.`;
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

// ================= first clock-in =================
// Name, stack, one sample ticket in twenty seconds, then you're on shift. Never shown again once done,
// and skipped for anyone who has already closed a ticket.
const SAMPLE = {
  tsql: 'SELECT order_id, customer_id, total_amount\n  FROM dbo.Orders\n WHERE order_date = DATEADD(day, -1, CAST(GETDATE() AS date));',
  postgres: 'SELECT order_id, customer_id, total_amount\n  FROM orders\n WHERE order_date = CURRENT_DATE - 1;',
  mysql: 'SELECT order_id, customer_id, total_amount\n  FROM orders\n WHERE order_date = CURDATE() - INTERVAL 1 DAY;',
};
const needsOnboarding = () => !store.get().onboarded && store.completedIds().length === 0;

function onboard(step = 1) {
  const el = $('ci-onboard');
  $('ci-form').hidden = true;
  el.hidden = false;
  const dots = [1, 2, 3].map((n) => `<i class="${n <= step ? 'on' : ''}"></i>`).join('');
  const head = `<div class="ob-step"><span class="tour-dots">${dots}</span><button type="button" class="ob-skip" id="ob-skip">Skip</button></div>`;
  if (step === 1) {
    el.innerHTML = `${head}<h1>First day at Harbour &amp; Co.</h1><p class="ci-lede">What should people in the office call you?</p>
      <form id="ob-name"><input class="ob-input" maxlength="40" autocomplete="given-name" placeholder="First name (optional)" value="${esc(store.get().name)}">
      <button class="btn btn-primary btn-lg" type="submit" style="width:100%">Next</button></form>`;
    el.querySelector('input').focus();
    $('ob-name').addEventListener('submit', (e) => { e.preventDefault(); store.setName(el.querySelector('input').value); onboard(2); });
  } else if (step === 2) {
    el.innerHTML = `${head}<h1>Which database do you use at work?</h1><p class="ci-lede">Every ticket runs and is marked in this one. You can switch any time.</p>
      <div class="ci-stack" data-stack-picker="onboard"></div>
      <button class="btn btn-primary btn-lg" type="button" id="ob-next" style="width:100%">Next</button>`;
    // Changing stack reloads the desk for that stack, then carries on at the sample ticket.
    stackPicker(el.querySelector('[data-stack-picker="onboard"]'), { onChange: () => { location.href = '/work?onboard=3'; }, label: '' });
    $('ob-next').addEventListener('click', () => onboard(3));
  } else {
    el.innerHTML = `${head}<h1>How a ticket works</h1>
      <div class="ob-sample">
        <div class="ob-mail"><b>Harvey Rowe</b> · Sales Manager<br>Can you pull yesterday’s orders for me? Order, customer and total is fine.</div>
        <div class="ob-arrow">You write it in ${esc(S.short)}:</div>
        <pre class="ob-sql">${esc(SAMPLE[stack])}</pre>
        <div class="ob-arrow">▶ Run it, look at the rows, then <b>Send results to Harvey</b>.</div>
        <div class="ob-note"><b>${esc(R)}:</b> I check every send before it goes. If it’s wrong, I hold it back and tell you why.</div>
      </div>
      <button class="btn btn-primary btn-lg" type="button" id="ob-go" style="width:100%">Got it. Clock in</button>`;
    $('ob-go').addEventListener('click', () => finishOnboarding(true));
  }
  $('ob-skip').addEventListener('click', () => finishOnboarding(true));
}

function finishOnboarding(start) {
  store.setOnboarded();
  $('ci-onboard').hidden = true;
  $('ci-form').hidden = false;
  if (!start) return;
  ctx();
  clockIn(DAYS[0]);
  const el = $('toast');
  el.innerHTML = `<b>You’re on shift${store.get().name ? `, ${esc(store.get().name)}` : ''}.</b>Your first ticket is landing now.`;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 3500);
}

// Homepage Clock in free skips the arrival screen; /work from the header still shows it.
const params = new URLSearchParams(location.search);
if (params.has('onboard') && needsOnboarding()) {
  renderClockIn();
  onboard(Number(params.get('onboard')) || 1);
} else if (params.has('mock')) {
  renderClockIn();
  startMock();
} else if (params.has('go') && needsOnboarding() && !params.has('open')) {
  renderClockIn();
  onboard(1);
} else if (params.has('go')) {
  // ?day= and ?open= come back from a stack switch: same day, same ticket, new stack.
  const pick = DAYS.find((d) => d.id === Number(params.get('day')))
    || DAYS.find((d) => dayTickets(d).some((l) => !closed(l) && unlocked(l))) || DAYS[0];
  clockIn(pick);
  const reopen = tickets.find((l) => l.id === Number(params.get('open')));
  if (reopen && unlocked(reopen)) {
    arrived.add(reopen.id);
    clockMin = Math.max(clockMin, reopen.arrives);
    tickClock();
    renderInbox();
    openTicket(reopen.id);
    openQueryWindow(reopen);
  }
} else {
  renderClockIn();
}