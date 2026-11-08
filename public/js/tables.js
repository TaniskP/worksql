// Guide pages: step through a JOIN one row at a time, and flip through before → after slides.
// The page already shows every table in full; this only adds the controls on top.

for (const box of document.querySelectorAll('.jd[data-join]')) {
  let data;
  try { data = JSON.parse(box.dataset.join); } catch { continue; }
  const { steps } = data;
  const leftRows = box.querySelectorAll('.jd-left tbody tr');
  const rightRows = box.querySelectorAll('.jd-right tbody tr');
  const outRows = box.querySelectorAll('.jd-result tbody tr');
  const leftName = box.querySelector('.jd-left figcaption')?.textContent.trim() || 'the left table';

  const ui = document.createElement('div');
  ui.className = 'jd-ui';
  ui.innerHTML = `<div class="jd-controls">
      <button type="button" class="jd-btn" data-go="-1" aria-label="Previous row">‹</button>
      <input type="range" min="0" max="${steps.length}" value="${steps.length}" aria-label="Step through ${leftName}">
      <button type="button" class="jd-btn" data-go="1" aria-label="Next row">›</button>
      <button type="button" class="jd-play">▶ Play</button>
    </div>
    <p class="jd-say" aria-live="polite"></p>`;
  box.querySelector('.jd-tables').before(ui);
  const range = ui.querySelector('input');
  const say = ui.querySelector('.jd-say');
  let timer = null;

  const show = (k) => {
    k = Math.max(0, Math.min(steps.length, k));
    range.value = k;
    const all = k === steps.length;
    leftRows.forEach((tr) => tr.classList.remove('on'));
    rightRows.forEach((tr) => tr.classList.remove('hit'));
    outRows.forEach((tr) => tr.classList.remove('new', 'later'));
    if (all) {
      say.innerHTML = `<b>The whole result.</b> Drag the slider, or press ▶, to see where each row comes from.`;
      return;
    }
    const s = steps[k];
    if (s.l >= 0) leftRows[s.l]?.classList.add('on');
    s.r.forEach((j) => rightRows[j]?.classList.add('hit'));
    const done = new Set(steps.slice(0, k + 1).flatMap((x) => x.out));
    outRows.forEach((tr, i) => { if (s.out.includes(i)) tr.classList.add('new'); else if (!done.has(i)) tr.classList.add('later'); });
    const step = s.l >= 0 ? `Row ${s.l + 1} of ${leftRows.length}` : 'Last step';
    const made = s.out.length ? `${s.out.length} result row${s.out.length === 1 ? '' : 's'}` : 'no result row';
    say.innerHTML = `<b>${step}:</b> ${s.say ? `${escapeHtml(s.say)} ` : ''}<span class="jd-made">→ ${made}</span>`;
  };
  const stop = () => { clearInterval(timer); timer = null; ui.querySelector('.jd-play').textContent = '▶ Play'; };

  range.addEventListener('input', () => { stop(); show(Number(range.value)); });
  ui.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    stop();
    const now = Number(range.value);
    // From "whole result", Next starts at the first row and Previous at the last.
    show(now === steps.length ? (b.dataset.go === '1' ? 0 : steps.length - 1) : now + Number(b.dataset.go));
  }));
  ui.querySelector('.jd-play').addEventListener('click', (e) => {
    if (timer) { stop(); return; }
    e.target.textContent = '❚❚ Pause';
    let k = Number(range.value) >= steps.length ? 0 : Number(range.value);
    show(k);
    timer = setInterval(() => { k += 1; show(k); if (k >= steps.length) stop(); }, 1600);
  });
  show(steps.length);
}

for (const box of document.querySelectorAll('.slides')) {
  const list = [...box.querySelectorAll('.slide')];
  if (list.length < 2) continue;
  box.classList.add('live');
  const nav = document.createElement('div');
  nav.className = 'slides-nav';
  nav.innerHTML = `<button type="button" class="jd-btn" data-go="-1" aria-label="Previous">‹</button>
    <span class="slides-dots">${list.map((s, i) => `<button type="button" data-i="${i}" aria-label="Slide ${i + 1}: ${escapeHtml(s.querySelector('h3')?.textContent.replace(/^\d+\/\d+\s*/, '') || '')}"></button>`).join('')}</span>
    <button type="button" class="jd-btn" data-go="1" aria-label="Next">›</button>`;
  box.append(nav);
  let at = 0;
  const go = (i) => {
    at = (i + list.length) % list.length;
    list.forEach((s, j) => { s.hidden = j !== at; });
    nav.querySelectorAll('[data-i]').forEach((d, j) => d.setAttribute('aria-current', j === at ? 'true' : 'false'));
  };
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    go(b.dataset.i !== undefined ? Number(b.dataset.i) : at + Number(b.dataset.go));
  });
  box.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(at + 1); if (e.key === 'ArrowLeft') go(at - 1); });
  box.tabIndex = 0;
  go(0);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
