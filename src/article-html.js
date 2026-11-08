const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sql = (s) => `<pre><code>${esc(s.trim())}</code></pre>`;
const c = (s) => `<code>${esc(s)}</code>`;
const crumbBack = (href) => `<a class="crumb-back" href="${esc(href)}" data-back>← Back</a>`;

// ---------- teaching blocks for guide pages ----------
// Everything renders as plain HTML first (search engines and no-JS readers see the whole thing);
// /js/tables.js then turns join demos and slides into step-through widgets.

const cell = (v) => (v === null || v === undefined ? '<td class="null">NULL</td>' : `<td>${esc(v)}</td>`);

// A small result grid. rows are arrays in column order.
function table(name, cols, rows, { cls = '', note = '' } = {}) {
  return `<figure class="dt ${cls}">${name ? `<figcaption>${esc(name)}${note ? ` <span>${esc(note)}</span>` : ''}</figcaption>` : ''}
<div class="dt-scroll"><table><thead><tr>${cols.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('')}</tbody></table></div></figure>`;
}

// "In plain English": the idea in one or two everyday sentences, before any SQL.
const plain = (text) => `<div class="plain"><b>In plain English</b><p>${text}</p></div>`;

// The request as it arrives: who asked, and what they actually said.
const ask = ({ who, role, text }) => `<div class="ask-card"><div class="ask-who"><span>${esc(who.split(' ').map((w) => w[0]).join('').slice(0, 2))}</span><b>${esc(who)}</b>${role ? ` · ${esc(role)}` : ''}</div><p>${esc(text)}</p></div>`;

// A join you can step through, one row of the left table at a time.
//   left/right: { name, cols, rows }   on: [leftCol, rightCol]
//   type: inner | left | anti (left join … is null) | full
//   pick: result columns as 'l.col' / 'r.col', label: optional headers for them
//   say: (leftRow, matchCount) => plain-English caption for that step
function joinDemo({ left, right, on, type = 'inner', pick, label, title, say }) {
  const li = left.cols.indexOf(on[0]);
  const ri = right.cols.indexOf(on[1]);
  const col = (spec, l, r) => {
    const [side, name] = spec.split('.');
    const src = side === 'l' ? left : right;
    const row = side === 'l' ? l : r;
    return row ? row[src.cols.indexOf(name)] : null;
  };
  const result = [];
  const steps = [];
  const usedRight = new Set();
  left.rows.forEach((l, i) => {
    const matches = right.rows.map((r, j) => (r[ri] !== null && r[ri] === l[li] ? j : -1)).filter((j) => j >= 0);
    matches.forEach((j) => usedRight.add(j));
    const out = [];
    if (type === 'anti') {
      if (!matches.length) { out.push(result.length); result.push(pick.map((p) => col(p, l, null))); }
    } else if (matches.length) {
      for (const j of matches) { out.push(result.length); result.push(pick.map((p) => col(p, l, right.rows[j]))); }
    } else if (type === 'left' || type === 'full') {
      out.push(result.length); result.push(pick.map((p) => col(p, l, null)));
    }
    steps.push({ l: i, r: matches, out, say: say ? say(l, matches.length) : '' });
  });
  if (type === 'full') {
    const rest = right.rows.map((_, j) => j).filter((j) => !usedRight.has(j));
    if (rest.length) {
      const out = rest.map((j) => { result.push(pick.map((p) => col(p, null, right.rows[j]))); return result.length - 1; });
      steps.push({ l: -1, r: rest, out, say: `${rest.length} row${rest.length === 1 ? '' : 's'} in ${right.name} matched nobody, so FULL OUTER JOIN adds ${rest.length === 1 ? 'it' : 'them'} with NULLs on the left.` });
    }
  }
  const heads = label || pick.map((p) => p.split('.')[1]);
  const data = esc(JSON.stringify({ steps, type }));
  return `<div class="jd" data-join="${data}">
${title ? `<div class="jd-title">${esc(title)}</div>` : ''}
<div class="jd-tables">
${table(left.name, left.cols, left.rows, { cls: 'jd-left' })}
${table(right.name, right.cols, right.rows, { cls: 'jd-right' })}
</div>
${table('Result', heads, result, { cls: 'jd-result', note: `${result.length} row${result.length === 1 ? '' : 's'}` })}
</div>`;
}

// Before → after, one slide at a time. Each slide: { title, note, html }.
const slides = (list, { title } = {}) => `<div class="slides">${title ? `<div class="jd-title">${esc(title)}</div>` : ''}
${list.map((s, i) => `<section class="slide" data-n="${i + 1}"><h3><span>${i + 1}/${list.length}</span> ${esc(s.title)}</h3>${s.note ? `<p>${s.note}</p>` : ''}${s.html}</section>`).join('\n')}
</div>`;

// A real-life guide: the request, the idea in plain English, then the worked example.
const guide = (o) => ({
  kind: 'guide', lesson: null, date: '2026-11-08', ...o,
  body: () => `${o.ask ? ask(o.ask) : ''}${plain(o.plain)}${o.html()}`,
});

module.exports = { esc, sql, c, crumbBack, table, plain, ask, joinDemo, slides, guide };
