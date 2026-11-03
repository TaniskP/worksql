// The progress board: one page for "where am I?" Days, tickets, streak, time, the learning log,
// mock shifts, a share card and a portfolio export. Reads this browser's store, which is already
// merged with the server's copy when the browser is signed in (see syncProgress in common.js).
import { icons, store, esc, me, synced, dialect, DIALECTS, localDate, saveProgressForm, track, reviewerName } from '/js/common.js';

const $ = (id) => document.getElementById(id);
document.querySelector('[data-logo]').insertAdjacentHTML('afterbegin', icons.logo);

await synced;
const stack = dialect();
const [{ days, lessons }, site] = await Promise.all([
  fetch(`/api/lessons?dialect=${stack}`).then((r) => r.json()),
  fetch('/api/site').then((r) => r.json()).catch(() => ({})),
]);
const R = reviewerName(site.reviewer);
const s = store.get();
const done = (l) => Boolean(s.completed[l.id]);
const unlocked = (l) => l.free || me.paid;
const dayOf = (l) => days.find((d) => d.id === l.day);
const ticketsOn = (d) => lessons.filter((l) => l.day === d.id);
const subject = (l) => l.title.split(/(?<=[.?!])\s/)[0].replace(/[.?!]$/, '');
const first = (name) => name.split(' ')[0];
const closedCount = lessons.filter(done).length;

// ---------- flash after a sign-in link ----------
const params = new URLSearchParams(location.search);
if (params.has('saved') && me.email) {
  $('pg-flash').hidden = false;
  $('pg-flash').innerHTML = `Signed in as <b>${esc(me.email)}</b>. Your progress is saved and will follow you to any device you open the link on.`;
}

// ---------- heading and "continue" ----------
$('pg-title').textContent = s.name ? `${s.name}’s week` : 'Your week';
$('pg-sub').innerHTML = `${esc(DIALECTS[stack].label)} · ${me.paid ? 'Paid plan, every day unlocked' : 'Free plan, Monday unlocked'}${me.email ? ` · saved to ${esc(me.email)}` : ' · saved in this browser only'}`;
$('pg-kicker').textContent = 'Harbour & Co · Progress';

// A ticket they've already had a go at comes first; otherwise the next one in the week.
const started = (l) => (s.log[l.id] || []).length || s.drafts[`w${l.id}`] || s.drafts[l.id];
const next = lessons.find((l) => !done(l) && unlocked(l) && started(l)) || lessons.find((l) => !done(l));
if (!next) {
  $('pg-continue').innerHTML = '<div class="pg-next done"><b>Every ticket closed.</b><span>New weeks land on the paid plan as they’re written.</span><a class="btn btn-ghost" href="/work?mock=1">Take a mock shift</a></div>';
} else if (unlocked(next)) {
  $('pg-continue').innerHTML = `<div class="pg-next"><span class="pg-next-k">Continue where you left off</span>
    <b>${esc(first(next.from))} is waiting</b><span>${esc(subject(next))}</span>
    <a class="btn btn-primary" href="/work?go=1&day=${next.day}&open=${next.id}">Clock in ${icons.arrow}</a></div>`;
} else {
  const d = dayOf(next);
  $('pg-continue').innerHTML = `<div class="pg-next"><span class="pg-next-k">Monday’s done</span>
    <b>${esc(d.name)}’s inbox: ${ticketsOn(d).length} tickets</b><span>${esc(d.title)}, on the paid plan.</span>
    <a class="btn btn-primary" href="/pricing">Unlock the week ${icons.arrow}</a></div>`;
}

// ---------- tiles ----------
const totalMin = Object.values(s.minutes).reduce((a, b) => a + b, 0);
const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`);
const firstTry = lessons.filter((l) => done(l) && (s.completed[l.id].attempts || 1) === 1).length;
$('pg-tiles').innerHTML = [
  ['Tickets closed', `${closedCount}<small>/${lessons.length}</small>`],
  ['Streak', `${store.streak()}<small> day${store.streak() === 1 ? '' : 's'}</small>`],
  ['Time practised', hm(totalMin)],
  ['First-try sends', closedCount ? `${Math.round((firstTry / closedCount) * 100)}<small>%</small>` : '–'],
].map(([k, v]) => `<div class="pg-tile"><span>${k}</span><b>${v}</b></div>`).join('');

// ---------- the week board ----------
$('pg-week').innerHTML = days.map((d) => {
  const ls = ticketsOn(d);
  const n = ls.filter(done).length;
  const locked = !ls.some(unlocked);
  const pct = ls.length ? n / ls.length : 0;
  const level = pct === 1 ? 4 : pct >= 0.66 ? 3 : pct >= 0.33 ? 2 : pct > 0 ? 1 : 0;
  return `<a class="pg-day l${level}${locked ? ' locked' : ''}" href="${locked ? '/pricing' : `/work?go=1&day=${d.id}`}" title="${esc(d.title)}">
    <span class="pg-day-name">${d.name.slice(0, 3)}${days.filter((x) => x.name === d.name).length > 1 ? ` <i>wk ${d.week}</i>` : ''}</span>
    <b>${n}/${ls.length}</b>
    <span class="pg-bar"><i style="width:${Math.round(pct * 100)}%"></i></span>
    <span class="pg-day-title">${locked ? `${icons.lock} Paid` : esc(d.title)}</span></a>`;
}).join('');

// ---------- practice heatmap: 12 weeks, Monday first ----------
(function heatmap() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7 * 11);
  const active = new Set(s.days);
  const cells = [];
  let practisedDays = 0;
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = localDate(d);
    const m = s.minutes[key] || 0;
    const level = m >= 30 ? 4 : m >= 15 ? 3 : m >= 5 ? 2 : m >= 0.5 || active.has(key) ? 1 : 0;
    if (level) practisedDays++;
    const label = `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}: ${m >= 0.5 ? `${Math.round(m)} min` : active.has(key) ? 'ticket closed' : 'no practice'}`;
    cells.push(`<i class="h${level}" title="${label}"></i>`);
  }
  $('pg-heat').innerHTML = `<div class="pg-heat-grid">${cells.join('')}</div>
    <div class="pg-heat-key">Less <i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i> More</div>`;
  $('pg-heat').setAttribute('aria-label', `${practisedDays} days with practice in the last 12 weeks`);
  $('pg-heat-hint').textContent = `${practisedDays} day${practisedDays === 1 ? '' : 's'} practised in the last 12 weeks`;
}());

// ---------- every ticket, with the learning log ----------
const ago = (t) => {
  if (!t) return '–';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const dur = (sec) => (!sec ? '–' : sec < 60 ? `${sec}s` : `${Math.round(sec / 60)} min`);

function statusOf(l) {
  if (done(l)) return ['closed', '✓ Closed'];
  if (!unlocked(l)) return ['locked', 'Paid'];
  if ((s.log[l.id] || []).length || s.drafts[l.id] || s.drafts[`w${l.id}`]) return ['progress', 'In progress'];
  return ['open', 'Open'];
}

function logHtml(l) {
  const c = s.completed[l.id];
  const log = s.log[l.id] || [];
  const misses = log.filter((e) => !e.pass);
  const parts = [`<div class="pg-ask"><b>${esc(l.from)}</b>${l.role ? ` · ${esc(l.role)}` : ''}<br>${esc(l.title)}</div>`];
  if (misses.length) {
    parts.push(`<div class="pg-log-h">Held back ${misses.length} time${misses.length === 1 ? '' : 's'}</div><ol class="pg-log">${misses.map((e) =>
      `<li><span class="pg-log-when">${ago(e.at)}${e.dialect ? ` · ${esc(DIALECTS[e.dialect]?.short || e.dialect)}` : ''}</span>
        <b>${esc(e.headline)}</b>${e.detail ? ` <span>${esc(e.detail)}</span>` : ''}</li>`).join('')}</ol>`);
  } else if (c) {
    parts.push(`<div class="pg-log-h good">Right first time. ${esc(R)} let it straight through.</div>`);
  }
  if (c && c.sql) {
    parts.push(`<div class="pg-log-h">The query that closed it${c.dialect ? ` (${esc(DIALECTS[c.dialect]?.short || c.dialect)})` : ''}</div><pre class="pg-sql">${esc(stripBrief(c.sql))}</pre>`);
    if (c.columns) parts.push(`<div class="pg-shape">Result: ${c.rows} row${c.rows === 1 ? '' : 's'} · ${c.columns.map(esc).join(', ')}</div>`);
  }
  if (!c && !misses.length) parts.push(`<div class="pg-log-h">Nothing sent yet.</div>`);
  return parts.join('');
}

// Work mode opens each query with the ticket's notes as -- comments; the portfolio only needs the query.
function stripBrief(sql) {
  const lines = String(sql).split('\n');
  let i = 0;
  while (i < lines.length && (/^\s*--/.test(lines[i]) || !lines[i].trim())) i++;
  return lines.slice(i).join('\n').trim() || String(sql).trim();
}

let filter = 'all';
function renderTable() {
  const rows = lessons.filter((l) => filter === 'all' || (filter === 'closed' ? done(l) : !done(l)));
  $('pg-table').innerHTML = `<thead><tr><th>Day</th><th>Ticket</th><th>Stack</th><th>Status</th><th>Attempts</th><th>Time</th><th>Last activity</th></tr></thead>
    <tbody>${rows.map((l) => {
    const d = dayOf(l);
    const c = s.completed[l.id];
    const log = s.log[l.id] || [];
    const [cls, label] = statusOf(l);
    const attempts = c ? c.attempts || Math.max(1, log.filter((e) => !e.pass).length + 1) : log.length;
    const last = Math.max(c ? c.at : 0, ...log.map((e) => e.at), 0);
    const st = c && c.dialect ? DIALECTS[c.dialect]?.short : log.length ? DIALECTS[log[log.length - 1].dialect]?.short : '';
    const open = unlocked(l) && (c || log.length);
    return `<tr class="pg-row ${cls}${open ? ' has-log' : ''}" data-id="${l.id}" ${open ? 'tabindex="0" aria-expanded="false"' : ''}>
      <td>${d.name.slice(0, 3)}${d.week > 1 ? ` <i class="wk">wk ${d.week}</i>` : ''}</td>
      <td><b>${esc(l.topic)}</b><span class="pg-from">${esc(first(l.from))}: ${esc(subject(l))}</span></td>
      <td>${esc(st || '–')}</td><td><span class="pg-status ${cls}">${label}</span></td>
      <td>${attempts || '–'}</td><td>${c ? dur(c.seconds) : '–'}</td><td>${ago(last)}</td></tr>
      <tr class="pg-detail" data-for="${l.id}" hidden><td colspan="7">${open ? logHtml(l) : ''}</td></tr>`;
  }).join('')}</tbody>`;
}
renderTable();
$('pg-table').addEventListener('click', (e) => toggleRow(e.target.closest('.pg-row.has-log')));
$('pg-table').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(e.target.closest('.pg-row.has-log')); } });
function toggleRow(tr) {
  if (!tr) return;
  const detail = $('pg-table').querySelector(`.pg-detail[data-for="${tr.dataset.id}"]`);
  detail.hidden = !detail.hidden;
  tr.setAttribute('aria-expanded', String(!detail.hidden));
}
$('pg-filters').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-f]');
  if (!b) return;
  filter = b.dataset.f;
  $('pg-filters').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  renderTable();
});

// ---------- mock shifts ----------
if (s.mocks.length) {
  $('pg-mocks-card').hidden = false;
  $('pg-mocks').innerHTML = `<table class="pg-table compact"><thead><tr><th>When</th><th>Stack</th><th>Score</th><th>Closed</th><th>Time</th></tr></thead><tbody>
    ${s.mocks.slice().reverse().map((m) => `<tr><td>${new Date(m.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
      <td>${esc(DIALECTS[m.dialect]?.short || m.dialect)}</td><td><b>${m.score}</b></td>
      <td>${m.tickets.filter((t) => t.closed).length}/${m.tickets.length}</td><td>${m.minutes} of ${m.limit} min</td></tr>`).join('')}</tbody></table>`;
}

// ---------- share card ----------
// The best true sentence about them: a whole day closed beats a count of tickets.
const fullDays = days.filter((d) => ticketsOn(d).length && ticketsOn(d).every(done));
const bestDay = fullDays[fullDays.length - 1];
const stackUsed = (() => {
  const counts = {};
  for (const c of Object.values(s.completed)) if (c.dialect) counts[c.dialect] = (counts[c.dialect] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return DIALECTS[top ? top[0] : stack].short;
})();
const headline = bestDay ? `Closed ${bestDay.week > 1 ? `week ${bestDay.week} ` : ''}${bestDay.name} at Harbour & Co`
  : closedCount ? `${closedCount} workplace ticket${closedCount === 1 ? '' : 's'} closed at Harbour & Co` : 'First shift at Harbour & Co';
const detail = `${closedCount} workplace SQL ticket${closedCount === 1 ? '' : 's'} · ${stackUsed}${store.streak() > 1 ? ` · ${store.streak()}-day streak` : ''}`;
const postText = `${headline}: ${detail}. Real requests from colleagues, real SQL, marked by a senior DBA. Practising on WorkSQL: ${location.origin}`;

function drawCard() {
  const c = $('pg-canvas');
  const g = c.getContext('2d');
  const W = c.width; const H = c.height;
  g.fillStyle = '#0b1733'; g.fillRect(0, 0, W, H);
  const grad = g.createRadialGradient(W * 0.85, H * 0.1, 40, W * 0.85, H * 0.1, W * 0.7);
  grad.addColorStop(0, 'rgba(31,94,255,.55)'); grad.addColorStop(1, 'rgba(31,94,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // the "ticket closed" stamp
  g.save(); g.translate(W - 210, 210); g.rotate(-0.12);
  g.strokeStyle = '#4ade80'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 110, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-48, 4); g.lineTo(-12, 40); g.lineTo(54, -34); g.stroke();
  g.restore();
  const font = (w, px) => `${w} ${px}px Inter, 'Segoe UI', system-ui, sans-serif`;
  g.fillStyle = '#9fb4ff'; g.font = font(700, 30); g.fillText('WorkSQL', 80, 100);
  g.fillStyle = '#8392b3'; g.font = font(500, 26); g.fillText(s.name ? `${s.name} · ticket log` : 'Ticket log', 80, 150);
  g.fillStyle = '#ffffff'; g.font = font(800, 64);
  wrap(g, headline, 80, 290, W - 420, 76);
  g.fillStyle = '#c7d2fe'; g.font = font(600, 32); g.fillText(detail, 80, 470);
  g.fillStyle = '#8392b3'; g.font = font(500, 26); g.fillText(`Real tickets from colleagues. Real SQL. ${location.host}`, 80, 560);
}
function wrap(g, text, x, y, max, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > max && line) { g.fillText(line, x, y); line = w; y += lh; } else line = test;
  }
  g.fillText(line, x, y);
}
document.fonts?.ready.then(drawCard);
drawCard();
$('pg-download').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = $('pg-canvas').toDataURL('image/png');
  a.download = 'worksql-ticket-log.png';
  a.click();
  track('share_card');
});
$('pg-linkedin').href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(location.origin)}`;
$('pg-linkedin').addEventListener('click', () => track('share_card'));
$('pg-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(postText); $('pg-copy-msg').textContent = 'Copied. Paste it with the image.'; } catch { $('pg-copy-msg').textContent = postText; }
  $('pg-copy-msg').hidden = false;
});

// ---------- export ----------
const closedTickets = lessons.filter(done).sort((a, b) => s.completed[a.id].at - s.completed[b.id].at);

function markdown() {
  const lines = [`# ${s.name ? `${s.name}: ` : ''}WorkSQL ticket log`, '',
    `${closedTickets.length} workplace SQL ticket${closedTickets.length === 1 ? '' : 's'} closed at Harbour & Co, a practice company on WorkSQL (${location.host}).`,
    `Every query was run against the same database and marked by a senior DBA before it was sent.`, '',
    `Exported ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`, ''];
  for (const l of closedTickets) {
    const c = s.completed[l.id];
    const d = dayOf(l);
    lines.push(`## ${d.name}${d.week > 1 ? ` (week ${d.week})` : ''}: ${l.topic}`, '',
      `**From:** ${l.from}${l.role ? `, ${l.role}` : ''}  `, `**Asked:** ${l.title}  `,
      `**Stack:** ${DIALECTS[c.dialect]?.label || '–'} · **Attempts:** ${c.attempts || 1} · **Time:** ${dur(c.seconds)}`, '');
    if (c.sql) lines.push('```sql', stripBrief(c.sql), '```', '');
    if (c.columns) lines.push(`Result: ${c.rows} row${c.rows === 1 ? '' : 's'}, columns ${c.columns.map((x) => `\`${x}\``).join(', ')}.`, '');
  }
  return lines.join('\n');
}

$('pg-md').addEventListener('click', () => {
  if (!closedTickets.length) { alert('Close a ticket first. Your log fills in as you go.'); return; }
  const blob = new Blob([markdown()], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `worksql-ticket-log-${localDate()}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  track('export');
});

$('pg-pdf').addEventListener('click', () => {
  if (!closedTickets.length) { alert('Close a ticket first. Your log fills in as you go.'); return; }
  $('pg-print').innerHTML = `<h1>${esc(s.name ? `${s.name}: ` : '')}WorkSQL ticket log</h1>
    <p>${closedTickets.length} workplace SQL ticket${closedTickets.length === 1 ? '' : 's'} closed at Harbour &amp; Co, a practice company on WorkSQL (${esc(location.host)}). Every query was marked by a senior DBA before it was sent.</p>
    ${closedTickets.map((l) => {
    const c = s.completed[l.id]; const d = dayOf(l);
    return `<article><h2>${esc(d.name)}${d.week > 1 ? ` (week ${d.week})` : ''}: ${esc(l.topic)}</h2>
      <p><b>${esc(l.from)}</b>${l.role ? `, ${esc(l.role)}` : ''}: ${esc(l.title)}</p>
      <p class="meta">${esc(DIALECTS[c.dialect]?.label || '')} · ${c.attempts || 1} attempt${(c.attempts || 1) === 1 ? '' : 's'} · ${dur(c.seconds)}</p>
      ${c.sql ? `<pre>${esc(stripBrief(c.sql))}</pre>` : ''}
      ${c.columns ? `<p class="meta">Result: ${c.rows} rows · ${c.columns.map(esc).join(', ')}</p>` : ''}</article>`;
  }).join('')}`;
  track('export');
  window.print();
});

saveProgressForm($('pg-save'));
