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

// ---------- local store (no accounts yet: progress lives in this browser) ----------
const KEY = 'worksql.v1';

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
    return { completed: s.completed || {}, days: s.days || [], minutes: s.minutes || {}, plan: s.plan || 'free', drafts: s.drafts || {}, name: s.name || '' };
  },
  setName(name) { const s = this.get(); s.name = name; save(s); },
  nudgeToken() { return load().nudge || null; },
  setNudgeToken(token) { const s = load(); s.nudge = token; save(s); },
  complete(id, seconds) {
    const s = this.get();
    if (!s.completed[id]) s.completed[id] = { at: Date.now(), seconds };
    const today = localDate();
    if (!s.days.includes(today)) s.days.push(today);
    save(s);
  },
  addSeconds(sec) {
    const s = this.get();
    const today = localDate();
    s.minutes[today] = (s.minutes[today] || 0) + sec / 60;
    save(s);
  },
  setDraft(id, sql) { const s = this.get(); s.drafts[id] = sql; save(s); },
  setPlan(plan) { const s = this.get(); s.plan = plan; save(s); },
  isPaid() { return this.get().plan !== 'free'; },
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
async function startCheckout(planId, button) {
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
  const paid = store.get().plan;
  container.style.setProperty('--cols', plans.length);
  container.innerHTML = plans.map((p) => {
    const per = p.interval ? `<small> / ${p.interval}</small>` : '';
    const badge = p.recommended ? '<span class="badge">Best value</span>' : '';
    let action;
    if (p.id === 'free') action = `<a class="btn btn-ghost" href="/lessons">${paid === 'free' ? 'Start free' : 'Go to lessons'}</a>`;
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

// Local development only: flip the stored plan to test paid lessons without a payment provider.
export function devPlanToggle(el) {
  if (!['localhost', '127.0.0.1'].includes(location.hostname) || !el) return;
  const paid = store.isPaid();
  el.innerHTML = `Dev only: <button class="btn-text" type="button">${paid ? 'switch back to the free plan' : 'unlock paid lessons in this browser'}</button>`;
  el.querySelector('button').addEventListener('click', () => { store.setPlan(paid ? 'free' : 'yearly'); location.reload(); });
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