// Shared bits: icons, local progress/streak store, plans and the checkout placeholder.

export const icons = {
  logo: '<svg viewBox="0 0 32 32" fill="none"><ellipse cx="16" cy="7" rx="11" ry="4" fill="#1f5eff"/><path d="M5 7v6c0 2.2 4.9 4 11 4s11-1.8 11-4V7c0 2.2-4.9 4-11 4S5 9.2 5 7Z" fill="#1f5eff" opacity=".85"/><path d="M5 15v5c0 2.2 4.9 4 11 4s11-1.8 11-4v-5c0 2.2-4.9 4-11 4S5 17.2 5 15Z" fill="#1f5eff" opacity=".7"/><path d="M5 22v3c0 2.2 4.9 4 11 4s11-1.8 11-4v-3c0 2.2-4.9 4-11 4S5 24.2 5 22Z" fill="#1f5eff" opacity=".55"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path fill="#f97316" d="M12 2s1 3.5-1.5 6.5C8.6 10.8 7 12.3 7 15a5 5 0 0 0 10 0c0-1.7-.7-3-1.5-4 0 1.6-.8 2.7-2 3 .9-3-.3-6.8-1.5-12Z"/><path fill="#fbbf24" d="M12 21a3 3 0 0 1-3-3c0-1.6 1.2-2.6 2-3.6.2 1.2.9 1.8 1.6 2 .4-.7.4-1.6.2-2.4 1.3 1 2.2 2.4 2.2 4a3 3 0 0 1-3 3Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2 4 14h7l-1.5 8L20 10h-7z"/></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2.5" fill="currentColor" fill-opacity=".12"/><path d="M3 9.5h18M3 14.5h18M9 9.5v10.5"/></svg>',
  badge: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  okCircle: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#16a34a"/><path d="M9.5 16.5l4.5 4.5 8.5-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn: '<svg viewBox="0 0 32 32"><path d="M16 3 30 28H2z" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round"/><path d="M16 12v7" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="23.5" r="1.8" fill="#fff"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/></svg>',
  box: '<svg viewBox="0 0 32 32"><rect x="4" y="9" width="24" height="18" rx="2.5" fill="#f5b53d"/><path d="M4 13h24" stroke="#e09a1c" stroke-width="2"/><rect x="11" y="5" width="10" height="6" rx="1.5" fill="none" stroke="#e09a1c" stroke-width="2.4"/><rect x="13.5" y="11.5" width="5" height="3" rx="1" fill="#fff"/></svg>',
};

// ---------- local store ----------
// Progress lives in this browser first. Once the browser is signed in (paid at Stripe, or "email me my
// progress"), every change is merged into the server's copy too, so it follows them to the next device.
const KEY = 'worksql.v1';
const MAX_LOG = 30;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: progress just won't stick */ }
}

export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const store = {
  get() {
    const s = load();
    return {
      ...s, completed: s.completed || {}, days: s.days || [], minutes: s.minutes || {}, plan: s.plan || 'free', drafts: s.drafts || {}, name: s.name || '',
      log: s.log || {}, mocks: s.mocks || [], onboarded: Boolean(s.onboarded),
    };
  },
  setName(name) { const s = this.get(); s.name = String(name || '').trim().slice(0, 40); save(s); queueSync(); },
  nudgeToken() { return load().nudge || null; },
  setNudgeToken(token) { const s = load(); s.nudge = token; save(s); },
  setOnboarded() { const s = this.get(); s.onboarded = true; save(s); queueSync(); },
  // extra: { sql, dialect } of the query that closed it. Attempts come from the log of tries before it.
  complete(id, seconds, extra = {}) {
    const s = this.get();
    if (!s.completed[id]) {
      const attempts = (s.log[id] || []).filter((e) => !e.pass).length + 1;
      s.completed[id] = {
        at: Date.now(), seconds, attempts,
        ...(extra.sql ? { sql: String(extra.sql).slice(0, 4000) } : {}),
        ...(extra.dialect ? { dialect: extra.dialect } : {}),
        // The result's shape, for the portfolio export: column names and how many rows.
        ...(Array.isArray(extra.columns) ? { columns: extra.columns.slice(0, 30).map((c) => String(c).slice(0, 60)), rows: Number(extra.rows) || 0 } : {}),
      };
    }
    const today = localDate();
    if (!s.days.includes(today)) s.days.push(today);
    save(s);
    queueSync(0);
  },
  // Every marked attempt, right or wrong, with the reviewer's note: the learning log.
  attempt(id, { pass, headline = '', detail = '', sql = '' }) {
    const s = this.get();
    const list = s.log[id] || [];
    list.push({ at: Date.now(), pass: Boolean(pass), headline: String(headline).slice(0, 300), detail: String(detail).slice(0, 600), dialect: dialect(), sql: String(sql).slice(0, 2000) });
    s.log[id] = list.slice(-MAX_LOG);
    save(s);
    queueSync();
  },
  addMock(result) {
    const s = this.get();
    s.mocks = [...s.mocks, result].slice(-20);
    save(s);
    queueSync(0);
  },
  addSeconds(sec) {
    const s = this.get();
    const today = localDate();
    s.minutes[today] = (s.minutes[today] || 0) + sec / 60;
    save(s);
    queueSync();
  },
  // Put the merged copy from the server into this browser, keeping what only lives here (drafts, nudge token).
  adopt(server) {
    if (!server) return;
    const s = load();
    for (const k of ['completed', 'days', 'minutes', 'log', 'mocks']) if (server[k]) s[k] = server[k];
    if (server.name) s.name = server.name;
    if (server.onboarded) s.onboarded = true;
    save(s);
  },
  // What goes to the server: everything except drafts and the nudge token.
  forServer() {
    const { completed, days, minutes, log, mocks, name, onboarded } = this.get();
    return { completed, days, minutes, log, mocks, name, onboarded };
  },
  // Drafts are kept per stack, so switching never mixes a PostgreSQL query into the SQL Server one.
  draft(id) { return this.get().drafts[draftKey(id)]; },
  setDraft(id, sql) { const s = this.get(); s.drafts[draftKey(id)] = sql; save(s); },
  // Paid comes from the server (the Stripe login cookie), never from this browser's storage.
  isPaid() { return Boolean(me.paid); },
  streak() {
    const days = new Set(this.get().days);
    const d = new Date();
    if (!days.has(localDate(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (days.has(localDate(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  // "Last session Thursday · 11 minutes": the most recent day before today with practice.
  lastSession() {
    const { minutes } = this.get();
    const today = localDate();
    const past = Object.keys(minutes).filter((d) => d < today && minutes[d] >= 0.5).sort();
    if (!past.length) return null;
    const day = past[past.length - 1];
    const [y, m, dd] = day.split('-').map(Number);
    const name = new Date(y, m - 1, dd).toLocaleDateString('en-GB', { weekday: 'long' });
    return `Last session ${name} · ${Math.round(minutes[day])} minute${Math.round(minutes[day]) === 1 ? '' : 's'}`;
  },
  completedIds() { return Object.keys(this.get().completed).map(Number); },
};

// ---------- stack ----------
// One product, three stacks. The choice lives in this browser; SQL Server is the default.
export const DIALECTS = {
  tsql: { label: 'SQL Server (T-SQL)', short: 'SQL Server', server: 'HARBOUR-SQL01', version: 'SQL Server 16.0' },
  postgres: { label: 'PostgreSQL', short: 'PostgreSQL', server: 'harbour-pg01', version: 'PostgreSQL 16' },
  mysql: { label: 'MySQL', short: 'MySQL', server: 'harbour-mysql01', version: 'MySQL 8.0' },
};
const DIALECT_KEY = 'worksql_dialect';

export function dialect() {
  try { const d = localStorage.getItem(DIALECT_KEY); return Object.hasOwn(DIALECTS, d || '') ? d : 'tsql'; } catch { return 'tsql'; }
}
export function setDialect(d) {
  if (!Object.hasOwn(DIALECTS, d)) return;
  try { localStorage.setItem(DIALECT_KEY, d); } catch { /* private mode: the choice lasts this page only */ }
  document.dispatchEvent(new CustomEvent('worksql:dialect', { detail: d }));
}
// SQL Server drafts keep their old keys, so nobody loses work they had before stacks existed.
const draftKey = (id) => (dialect() === 'tsql' ? id : `${dialect()}:${id}`);

// A name with a space, quoted the way the stack quotes it: [Start Date], "Start Date", `Start Date`.
export function quoteName(name, d = dialect()) {
  if (!/\s/.test(name)) return name;
  return d === 'postgres' ? `"${name}"` : d === 'mysql' ? `\`${name}\`` : `[${name}]`;
}

// The Messages tab, in the stack's own format.
const MYSQL_CODES = [
  [/^Unknown column/, '1054 (42S22)'], [/^Table '.*' doesn't exist/, '1146 (42S02)'], [/^You have an error in your SQL syntax/, '1064 (42000)'],
  [/^FUNCTION .* does not exist/, '1305 (42000)'], [/^Expression #\d+ of SELECT list is not in GROUP BY/, '1055 (42000)'],
  [/^In aggregated query without GROUP BY/, '1140 (42000)'], [/^Incorrect parameter count/, '1582 (42000)'],
  [/is ambiguous/, '1052 (23000)'], [/^Invalid use of group function/, '1111 (HY000)'],
];
function tsqlNumber(msg) {
  if (/^Invalid column/.test(msg)) return 207;
  if (/^Invalid object/.test(msg)) return 208;
  if (/^Incorrect syntax/.test(msg)) return 102;
  if (/not a recognized built-in/.test(msg)) return 195;
  if (/invalid in the select list/.test(msg)) return 8120;
  if (/does not exist/.test(msg)) return 911;
  return 50000;
}
export function errorText(msg, hint, d = dialect()) {
  // The sandbox's own notes are not database errors, so they don't get an error code.
  if (/^WorkSQL:|^Nothing to run yet|^One query at a time|is switched off here|not supported in this sandbox|^Variables \(|^Temp tables|^The sandbox restarted|^Query timeout/.test(msg)) {
    return `${msg}${hint ? `\n${hint}` : ''}`;
  }
  if (d === 'postgres') return `ERROR:  ${msg}${hint ? `\nHINT:  ${hint}` : ''}`;
  if (d === 'mysql') return `ERROR ${(MYSQL_CODES.find(([re]) => re.test(msg)) || [0, '1105 (HY000)'])[1]}: ${msg}${hint ? `\n-- ${hint}` : ''}`;
  return `Msg ${tsqlNumber(msg)}, Level 16, State 1, Line 1\n${msg}${hint ? `\n-- ${hint}` : ''}`;
}

// The switcher: three buttons, one pressed. onChange runs after the choice is saved.
export function stackPicker(el, { onChange, label = 'Your stack' } = {}) {
  if (!el) return;
  const render = () => {
    const now = dialect();
    el.classList.add('stack-picker');
    el.innerHTML = `${label ? `<span class="stack-label" id="stack-label-${el.dataset.stackPicker || 'x'}">${esc(label)}</span>` : ''}
      <span class="stack-opts" role="radiogroup" aria-label="${esc(label || 'SQL stack')}">${Object.entries(DIALECTS).map(([k, v]) =>
  `<button type="button" role="radio" aria-checked="${k === now}" data-d="${k}" class="${k === now ? 'on' : ''}">${esc(v.label)}</button>`).join('')}</span>`;
  };
  render();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-d]');
    if (!b || b.dataset.d === dialect()) return;
    setDialect(b.dataset.d);
    if (onChange) onChange(b.dataset.d);
  });
  document.addEventListener('worksql:dialect', render);
}

// ---------- who is this? ----------
// One call per page. The cookie that answers it is HttpOnly, so only the server can read it.
export const me = await fetch('/api/me').then((r) => r.json()).catch(() => ({ paid: false }));

// ---------- progress sync (signed-in browsers only) ----------
let syncTimer = null;
let syncing = null;
export function syncProgress() {
  if (!me.email) return Promise.resolve(null);
  clearTimeout(syncTimer);
  syncing = fetch('/api/progress', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: store.forServer() }),
  }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.progress) store.adopt(d.progress); return d; }).catch(() => null);
  return syncing;
}
// Small changes (a minute on the clock) wait a few seconds and go together; a closed ticket goes now.
function queueSync(delay = 8000) {
  if (!me.email) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncProgress, delay);
}
// Leaving the page: send what's pending so a closed laptop doesn't lose the last few minutes.
addEventListener('pagehide', () => {
  if (!me.email || !syncTimer) return;
  clearTimeout(syncTimer);
  try { navigator.sendBeacon('/api/progress', new Blob([JSON.stringify({ progress: store.forServer() })], { type: 'application/json' })); } catch { /* fine */ }
});
// Every page load on a signed-in browser pulls in what the other devices did.
export const synced = syncProgress();

// ---------- launch-day counts ----------
// A name and nothing else: no ids, no cookies. See /privacy.
export function track(name) {
  try { navigator.sendBeacon('/api/event', new Blob([JSON.stringify({ name })], { type: 'application/json' })); } catch { /* fine */ }
}

// ---------- "Progress" in the header, once there's something to show ----------
if ((store.completedIds().length || Object.keys(store.get().log).length || me.email) && !location.pathname.startsWith('/progress')) {
  for (const list of document.querySelectorAll('.nav-links, .nav-more-list')) {
    if (list.querySelector('a[href="/progress"]')) continue;
    const pricing = list.querySelector('a[href="/pricing"]');
    const a = Object.assign(document.createElement('a'), { href: '/progress', textContent: 'Progress' });
    if (pricing) pricing.before(a); else list.append(a);
  }
}

// ---------- status banner ----------
// One line across the top of every page while something is wrong ("Sandbox slow, investigating.").
fetch('/api/status').then((r) => r.json()).then(({ status }) => {
  if (!status || !status.message) return;
  const bar = document.createElement('div');
  bar.className = `status-bar ${status.level || 'info'}`;
  bar.setAttribute('role', 'status');
  bar.innerHTML = `<span>${esc(status.message)}</span> <a href="/support">Support</a>`;
  document.body.prepend(bar);
}).catch(() => {});

// ---------- helpers ----------
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function streakPill() {
  return `<span class="streak" title="Days in a row you've finished a lesson">${icons.flame} Streak ${store.streak()}</span>`;
}

export const money = (pence) => (pence % 100 === 0 ? `£${pence / 100}` : `£${(pence / 100).toFixed(2)}`);

export async function getPlans() {
  const r = await fetch('/api/plans');
  return r.json();
}



// ---------- checkout ----------
// Pay buttons only appear once payments are live (see src/payments.js). Until then the
// pricing page shows the plans and what they include, with no button that leads nowhere.
export async function startCheckout(planId, button) {
  button.disabled = true;
  try {
    const r = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: planId }),
    });
    const data = await r.json();
    if (r.ok && data.url) { location.href = data.url; return; }
    button.insertAdjacentHTML('afterend', `<p class="plan-error">${esc(data.message || data.error || 'Checkout failed. Try again.')}</p>`);
  } finally {
    button.disabled = false;
  }
}

export function renderPlans(container, plans, paymentsLive) {
  const paid = me.paid ? me.plan || 'paid' : 'free';
  container.style.setProperty('--cols', plans.length);
  container.innerHTML = plans.map((p) => {
    const per = p.interval ? `<small> / ${p.interval}</small>` : '';
    const badge = p.recommended ? '<span class="badge">Best value</span>' : '';
    let action;
    if (p.id === 'free') action = `<a class="btn btn-ghost" href="/lessons">${paid === 'free' ? 'Guided lessons' : 'Go to lessons'}</a>`;
    else if (paid === p.id) action = '<span class="btn btn-ghost" aria-disabled="true">Your plan</span>';
    else if (paymentsLive) action = `<button class="btn ${p.recommended ? 'btn-primary' : 'btn-ghost'}" data-plan="${p.id}">${esc(p.cta)}</button>`;
    else action = '<p class="not-on-sale">Not on sale yet. Checkout opens soon.</p>';
    return `<div class="plan${p.recommended ? ' recommended' : ''}" id="plan-${p.id}">
      ${badge}
      <h3>${esc(p.name)}</h3>
      <div class="price">${money(p.price)}${per}</div>
      <div class="summary">${esc(p.summary)}</div>
      <ul class="ticks">${p.features.map((f) => `<li>${icons.tick}<span>${esc(f)}</span></li>`).join('')}</ul>
      ${action}
    </div>`;
  }).join('');
  container.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', () => startCheckout(b.dataset.plan, b)));
}

// Local development only: make this browser a paid member (or not) without going through Stripe.
// The server only allows it from this machine and never in production.
export function devPlanToggle(el) {
  if (!me.devUnlock || !el) return;
  el.innerHTML = `Dev only: <button class="btn-text" type="button">${me.paid ? 'switch back to the free plan' : 'unlock paid lessons in this browser'}</button>`;
  el.querySelector('button').addEventListener('click', async () => {
    await fetch('/api/dev/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid: !me.paid }) });
    location.reload();
  });
}

// The "account" card: who's paid on this browser, Stripe's billing page, and signing out.
const RESTORE_SENT = 'If that email has an active plan, a link is on its way. Open it on this device. It works for 15 minutes. Check spam too.';

export function restoreForm(el) {
  if (!el) return;
  if (me.paid) { el.hidden = true; return; }
  el.innerHTML = `<h3>Already paid?</h3>
    <p style="margin-bottom:10px">Cleared cookies, or on a new phone? Enter the email you used at checkout. We’ll send a 15-minute link. Don’t buy again.</p>
    <form class="nudge-form"><input type="email" required placeholder="you@work.com" aria-label="Email you paid with">
    <button class="btn btn-ghost" type="submit">Email link</button></form>
    <p class="nudge-msg muted-note" hidden></p>`;
  el.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = el.querySelector('button');
    const msg = el.querySelector('.nudge-msg');
    btn.disabled = true;
    msg.hidden = false;
    msg.textContent = 'Sending…';
    try {
      const r = await fetch('/api/restore', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: el.querySelector('input').value }),
      });
      const data = await r.json();
      msg.textContent = data.message || data.error || RESTORE_SENT;
    } finally {
      btn.disabled = false;
    }
  });
}

// "Email me my progress": a magic link that signs this browser (and any other) in, so progress follows them.
export function saveProgressForm(el, { title = 'Keep your progress', blurb = 'Switching laptop, or clearing cookies? Get a link by email. Open it on any device and your tickets come with you. No password.' } = {}) {
  if (!el) return;
  if (me.email) {
    el.innerHTML = `<h3>${esc(title)}</h3><p class="muted-note" style="margin:0">Saved to <b>${esc(me.email)}</b>. On another device, ask for a link with the same email and it picks up here.</p>`;
    return;
  }
  el.innerHTML = `<h3>${esc(title)}</h3><p style="margin-bottom:10px">${esc(blurb)}</p>
    <form class="nudge-form"><input type="email" required placeholder="you@work.com" aria-label="Email address">
    <button class="btn btn-primary" type="submit">Email me a link</button></form>
    <label class="save-nudge"><input type="checkbox" checked> Also email me once if a ticket’s waiting and I’ve gone quiet</label>
    <p class="nudge-msg muted-note" hidden></p>`;
  el.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = el.querySelector('button');
    const msg = el.querySelector('.nudge-msg');
    const address = el.querySelector('input[type=email]').value;
    btn.disabled = true;
    msg.hidden = false;
    msg.textContent = 'Sending…';
    try {
      const r = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: address }) });
      const data = await r.json();
      msg.textContent = data.message || data.error || 'Check your inbox.';
      if (r.ok && el.querySelector('.save-nudge input').checked && !store.nudgeToken()) {
        const n = await fetch('/api/nudge', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: address, completed: store.completedIds(), name: store.get().name }),
        }).then((x) => x.json()).catch(() => ({}));
        if (n.token) store.setNudgeToken(n.token);
      }
    } finally {
      btn.disabled = false;
    }
  });
}

export function accountCard(el, { freeHtml }) {
  if (!el) return;
  if (!me.paid && me.email) {
    el.innerHTML = `${freeHtml}<p class="muted-note" style="margin-top:12px">Progress saved to <b>${esc(me.email)}</b>. <button class="btn-text" data-signout>Sign out</button></p>`;
    el.querySelector('[data-signout]').addEventListener('click', async () => { await fetch('/api/signout', { method: 'POST' }); location.reload(); });
    return;
  }
  if (!me.paid) { el.innerHTML = freeHtml; return; }
  el.innerHTML = `<h3>Paid plan</h3><p style="margin-bottom:12px">Signed in as <b>${esc(me.email)}</b> on this browser. Every day is unlocked.</p>
    ${me.canManage ? '<button class="btn btn-ghost" style="width:100%" data-portal>Manage subscription</button>' : ''}
    <button class="btn-text" style="padding:8px 0 0" data-signout>Sign out of this browser</button>`;
  el.querySelector('[data-portal]')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    const r = await fetch('/api/portal', { method: 'POST' }).then((x) => x.json());
    if (r.url) location.href = r.url; else { e.target.disabled = false; e.target.insertAdjacentHTML('afterend', `<p class="plan-error">${esc(r.error || 'Try again.')}</p>`); }
  });
  el.querySelector('[data-signout]').addEventListener('click', async () => {
    await fetch('/api/signout', { method: 'POST' });
    location.reload();
  });
}
// ---------- "still waiting" nudges ----------

// Tell the server we're here and which ticket is next, so a nudge only goes out after a quiet spell.
export function pingNudge() {
  const token = store.nudgeToken();
  if (!token) return;
  fetch('/api/nudge/seen', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, completed: store.completedIds() }),
  }).catch(() => {});
}

export function nudgeForm(el, { title = 'Want a nudge?', blurb = 'One email if you go quiet while someone’s still waiting on a ticket. Nothing else.' } = {}) {
  if (!el) return;
  if (store.nudgeToken()) {
    el.innerHTML = `<h3>${esc(title)}</h3><p class="muted-note" style="margin:0">You’re set. We’ll email once if someone’s waiting and you’ve gone quiet.</p>`;
    return;
  }
  el.innerHTML = `<h3>${esc(title)}</h3><p style="margin-bottom:10px">${esc(blurb)}</p>
    <form class="nudge-form"><input type="email" required placeholder="you@work.com" aria-label="Email address">
    <button class="btn btn-ghost" type="submit">Nudge me</button></form><p class="nudge-msg muted-note" hidden></p>`;
  el.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = el.querySelector('input');
    const r = await fetch('/api/nudge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.value, completed: store.completedIds(), name: store.get().name }),
    });
    const data = await r.json();
    const msg = el.querySelector('.nudge-msg');
    msg.hidden = false;
    if (!r.ok) { msg.textContent = data.error; return; }
    store.setNudgeToken(data.token);
    nudgeForm(el, { title });
  });
}
// The senior DBA whose notes mark every query. Named in src/site.js.
export const reviewerName = (r) => (r && r.first ? r.first : 'Senior DBA');