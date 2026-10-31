import { attachEditor } from '/js/editor.js';
import { icons, store, streakPill, esc, pingNudge, reviewerName } from '/js/common.js';

const $ = (id) => document.getElementById(id);
const id = Number(location.pathname.match(/\/lesson\/(\d+)/)?.[1] || 1);

document.querySelector('[data-logo]').insertAdjacentHTML('afterbegin', icons.logo);
document.querySelectorAll('[data-icon]').forEach((el) => { el.outerHTML = icons[el.dataset.icon]; });
$('streak').innerHTML = streakPill();
$('last').textContent = store.lastSession() || '';

const res = await fetch(`/api/lessons/${id}`);
if (!res.ok) location.href = '/lessons';
const { lesson, day, indexInDay, daySize, paidCount, paidDays, tables, reviewer } = await res.json();
const reviewerLabel = reviewerName(reviewer);
const startedAt = Date.now();
const firstName = lesson.from.name.split(' ')[0];
const steps = lesson.steps.length ? lesson.steps : [{ text: null, final: true, starter: lesson.starter }];
const alreadyDone = !!store.get().completed[lesson.id];
let step = alreadyDone ? steps.length - 1 : 0;

document.title = `${lesson.topic} · Ticket ${lesson.n} · WorkSQL`;
$('crumb-path').textContent = `Week ${day.week} · ${day.name}`;
$('crumb-n').textContent = `Ticket ${indexInDay} of ${daySize}`;
$('crumb-topic').textContent = lesson.topic;
$('date').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
$('kind').textContent = lesson.kind;
$('avatar').textContent = lesson.from.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
$('from-name').textContent = lesson.from.name;
$('from-role').textContent = `· ${lesson.from.role}`;
$('time').textContent = lesson.time;
$('title').textContent = lesson.title;
$('bullets').innerHTML = lesson.bullets.map((b) => `<li>${esc(b)}</li>`).join('');
$('tip').textContent = lesson.tip || '';

// ---------- walkthrough steps ----------
const coach = []; // what each finished step taught, shown under it
const hintLevel = {}; // step -> how many hints have been shown
function renderSteps() {
  if (!lesson.steps.length) return;
  $('steps').hidden = false;
  $('steps').innerHTML = steps.map((s, i) => {
    const state = i < step ? 'done' : i === step ? 'current' : 'todo';
    return `<li class="${state}"><span class="dot">${i < step ? icons.check : i + 1}</span>
      <div>${esc(s.text)}${i < step && coach[i] ? `<div class="coach">${esc(coach[i])}</div>` : ''}</div></li>`;
  }).join('');
}
renderSteps();

// ---------- table previews ----------
function moneyColumns(columns, rows) {
  const set = new Set();
  columns.forEach((c, i) => {
    const nums = rows.map((r) => r[i]).filter((v) => typeof v === 'number');
    if (nums.length && (nums.some((v) => !Number.isInteger(v)) || (/amount|revenue|spent|avg|total|price|change/i.test(c) && !/count|_id$|units/i.test(c)))) set.add(i);
  });
  return set;
}

function gridHtml(columns, rows, { small = false, extra = new Set() } = {}) {
  const money = moneyColumns(columns, rows);
  const cell = (v, i) => {
    if (v === null || v === undefined) return '<td class="null">NULL</td>';
    if (typeof v === 'number' && money.has(i)) return `<td>${v.toFixed(2)}</td>`;
    return `<td>${esc(v)}</td>`;
  };
  return `<table class="grid${small ? ' small' : ''}"><thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r, ri) => `<tr${extra.has(ri) ? ' class="extra"' : ''}>${r.map(cell).join('')}</tr>`).join('')}</tbody></table>`;
}

function showTable(name) {
  $('tabs').querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.t === name));
  const t = tables[name];
  $('preview').innerHTML = gridHtml(t.columns.map((c) => (/\s/.test(c) ? `[${c}]` : c)), t.rows, { small: true });
}
$('tabs').innerHTML = Object.keys(tables).map((t) => `<button class="tab" data-t="${t}">${t}</button>`).join('');
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) showTable(b.dataset.t); });
showTable(lesson.table);

// ---------- paywall ----------
if (!lesson.free && !store.isPaid()) {
  $('steps').hidden = true;
  $('work').innerHTML = `<section class="card paywall" style="margin-top:16px">
    <h2>${esc(firstName)}’s ticket is on the paid plan.</h2>
    <p>Monday is free. This is ${esc(day.name)} of week ${day.week} (${esc(day.title)}), one of ${paidCount} paid tickets across ${paidDays} more working days.</p>
    <a class="btn btn-primary btn-lg" href="/pricing">See what’s included ${icons.arrow}</a>
    <div style="margin-top:14px"><a class="btn btn-text" href="/lessons">Back to lessons</a></div>
  </section>`;
  throw new Error('locked'); // stop wiring the editor
}

// ---------- editor ----------
const ta = $('sql');
const editor = attachEditor(document.querySelector('.editor'), {
  onChange: (v) => store.setDraft(lesson.id, v),
  keys: { 'Ctrl+Enter': () => run(), F5: () => run() }, // F5 is the SSMS habit
  schema: Object.fromEntries(Object.entries(tables).map(([name, t]) => [name, t.columns])),
});

const starterFor = (i) => steps[i].starter || lesson.starter || (i === 0 ? 'SELECT\n    ' : null);
function setText(text) {
  editor.set(text);
  editor.focus();
}
setText(store.get().drafts[lesson.id] ?? starterFor(step));

$('reset').addEventListener('click', () => setText(starterFor(step) ?? 'SELECT\n    '));

// ---------- results ----------
function showTab(name) {
  document.querySelectorAll('.rtab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $('results').hidden = name !== 'results';
  $('messages').hidden = name !== 'messages';
}
document.querySelectorAll('.rtab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

function errorNumber(msg) {
  if (/^Invalid column/.test(msg)) return 207;
  if (/^Invalid object/.test(msg)) return 208;
  if (/^Incorrect syntax/.test(msg)) return 102;
  if (/not a recognized built-in/.test(msg)) return 195;
  if (/invalid in the select list/.test(msg)) return 8120;
  return 50000;
}

const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

function nextButton() {
  const next = lesson.next;
  if (!next) return `<a class="btn btn-primary" href="/lessons">Back to lessons ${icons.arrow}</a>`;
  if (!next.free && !store.isPaid()) return `<a class="btn btn-primary" href="/lessons#day-${next.day}">See Tuesday’s inbox ${icons.arrow}</a>`;
  return `<a class="btn btn-primary" href="/lesson/${next.id}">${next.day !== lesson.day ? 'Next day’s inbox' : 'Next ticket'} ${icons.arrow}</a>`;
}

function renderVerdict(v, { sqlError = false } = {}) {
  const box = $('verdict');
  const isFinal = step === steps.length - 1;

  if (v.pass && !isFinal) {
    coach[step] = steps[step].done || '';
    box.innerHTML = `<div class="verdict ok">${icons.okCircle.replace('<svg', '<svg class="ic"')}
      <div class="msg"><em class="who">${esc(reviewerLabel)}</em><strong>Step ${step + 1} done.</strong><span>${esc(coach[step])}</span></div>
      <button class="btn btn-primary" id="next-step">Next step ${icons.arrow}</button></div>`;
    $('next-step').addEventListener('click', () => {
      step++;
      renderSteps();
      if (steps[step].starter) setText(steps[step].starter);
      box.innerHTML = '';
      ta.focus();
    });
    return;
  }

  if (v.pass) {
    const secs = Math.round((Date.now() - startedAt) / 1000);
    const wall = lesson.next && !lesson.next.free && lesson.free && !store.isPaid();
    box.innerHTML = `<div class="verdict ok">${icons.okCircle.replace('<svg', '<svg class="ic"')}
      <div class="msg"><strong>${esc(v.headline)} Sent to ${esc(firstName)}.</strong>
        <span class="reply">“${esc(lesson.thanks)}” - ${esc(firstName)}</span>
        ${wall ? `<span class="wall-note">That’s Monday done. Tuesday’s inbox has 6 tickets waiting, and the week runs on from there: ${paidCount} tickets over ${paidDays} days, on the paid plan.</span>` : ''}
      </div>
      <span class="time">${fmtTime(secs)} on this one.</span>${nextButton()}</div>`;
    store.complete(lesson.id, secs);
    pingNudge();
    step = steps.length - 1;
    renderSteps();
    $('streak').innerHTML = streakPill();
    return;
  }

  const who = sqlError ? 'SQL Server' : reviewerLabel;
  box.innerHTML = `<div class="verdict bad">${icons.warn.replace('<svg', '<svg class="ic"')}
    <div class="msg"><em class="who">${esc(who)}</em><strong>${esc(v.headline)}</strong><span>${esc(v.detail || '')}</span><div class="hint-box" id="hint" hidden></div></div>
    <button class="btn btn-text" id="show-hint">${icons.bulb} Show hint</button></div>`;
  // Hints come one at a time and point at the mistake. None of them is the query.
  $('show-hint').addEventListener('click', () => {
    const h = $('hint');
    const inStep = lesson.steps.length && step < steps.length - 1;
    const pool = inStep ? [steps[step].text] : lesson.hints;
    const level = hintLevel[step] = Math.min((hintLevel[step] ?? -1) + 1, pool.length - 1);
    h.hidden = false;
    h.innerHTML = pool.slice(0, level + 1).map((x, i) => `<div>${pool.length > 1 ? `<b>Hint ${i + 1}.</b> ` : ''}${esc(x)}</div>`).join('');
    $('show-hint').lastChild.textContent = level < pool.length - 1 ? ' Another hint' : ' That’s all the hints';
    if (level === pool.length - 1) $('show-hint').disabled = true;
  });
}

let running = false;
async function run() {
  if (running) return;
  running = true;
  $('run').disabled = true;
  $('status').className = 'status';
  $('status').textContent = 'Executing query…';
  try {
    const r = await fetch('/api/run', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: lesson.id, step, sql: ta.value }),
    });
    const data = await r.json();
    const stamp = new Date().toISOString().replace('Z', '0000+00:00');
    if (data.error) {
      $('rtab-results').textContent = 'Results';
      $('results').innerHTML = '<div class="empty">No results. Check the Messages tab.</div>';
      $('messages').innerHTML = `<div class="messages"><span class="err">Msg ${errorNumber(data.error)}, Level 16, State 1, Line 1\n${esc(data.error)}</span>\n\nCompletion time: ${stamp}</div>`;
      $('status').textContent = 'Query completed with errors.';
      showTab('messages');
      renderVerdict(data.verdict || { pass: false, headline: data.error, detail: 'SQL Server would say the same. Fix it and run again.' }, { sqlError: !data.verdict });
      return;
    }
    const v = data.verdict;
    const n = data.rows.length;
    $('rtab-results').textContent = `Results (${n}${data.truncated ? '+' : ''})`;
    $('results').innerHTML = data.columns.length
      ? gridHtml(data.columns, data.rows, { extra: new Set(v.extraRows) })
      : '<div class="empty">No columns returned.</div>';
    $('messages').innerHTML = `<div class="messages">(${n} row${n === 1 ? '' : 's'} affected)\n\nCompletion time: ${stamp}</div>`;
    $('status').className = `status${v.pass ? ' ok' : ''}`;
    $('status').innerHTML = `${n} row${n === 1 ? '' : 's'} returned${v.pass ? ` · Matches expected result ${icons.tick}` : ''}`;
    showTab('results');
    renderVerdict(v);
  } catch {
    $('status').textContent = 'Could not reach the sandbox. Is the server running?';
  } finally {
    running = false;
    $('run').disabled = false;
  }
}
$('run').addEventListener('click', run);

// Count practice time for "Last session Thursday · 11 minutes".
let tick = Date.now();
function flush() {
  if (document.visibilityState === 'visible') store.addSeconds((Date.now() - tick) / 1000);
  tick = Date.now();
}
setInterval(flush, 15000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') store.addSeconds((Date.now() - tick) / 1000); tick = Date.now(); });
window.addEventListener('pagehide', flush);
