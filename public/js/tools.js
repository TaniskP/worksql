// In-browser T-SQL tools. No network calls.

const $ = (id) => document.getElementById(id);

document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const el = $(btn.dataset.copy);
    const text = el.value !== undefined ? el.value : el.textContent;
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
    catch { /* ignore */ }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
  });
});

// ---------- formatter ----------
const KEYWORDS = new Set(('select from where group by order having join left right full inner cross outer apply union all except intersect with as on and or not in exists between like is null join case when then else end insert into values update set delete top distinct over partition by rows unbounded preceding following current row go use declare set if else begin end return cast convert isnull coalesce datediff dateadd getdate try_cast iif').split(' '));

function formatTsql(raw) {
  const src = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!src) return '';
  const tokens = src.split(/(\s+|[,()*])/).filter((t) => t && t !== ' ');
  const out = [];
  let indent = 0;
  const push = (s, nl) => { if (nl) out.push('\n' + '  '.repeat(indent)); out.push(s); };
  const isKw = (t) => KEYWORDS.has(t.toLowerCase());
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i];
    if (t === '(') { out.push('('); indent++; continue; }
    if (t === ')') { indent = Math.max(0, indent - 1); out.push(')'); continue; }
    if (t === ',') { out.push(','); push('', true); continue; }
    if (t === '*') { out.push(' *'); continue; }
    const up = t.toUpperCase();
    const word = isKw(t) ? up : t;
    const prev = [...out].reverse().find((x) => x.trim());
    if (/^(SELECT|FROM|WHERE|HAVING|UNION|EXCEPT|INTERSECT|WITH|INSERT|UPDATE|DELETE|VALUES|SET|GO)$/.test(up)) {
      indent = up === 'SELECT' || up === 'WITH' ? 1 : 0;
      if (out.length) out.push('\n');
      out.push(word);
      if (up === 'SELECT' || up === 'FROM' || up === 'WHERE' || up === 'HAVING' || up === 'SET' || up === 'VALUES') { indent = 1; }
      continue;
    }
    if (/^(LEFT|RIGHT|FULL|INNER|CROSS)$/.test(up) && tokens[i + 1] && /^(JOIN|OUTER|APPLY)$/i.test(tokens[i + 1])) {
      out.push('\n' + word);
      continue;
    }
    if (up === 'JOIN' || up === 'APPLY') { out.push(out.length && !String(out[out.length - 1]).endsWith('\n') ? ' ' : ''); out.push(word); indent = 1; continue; }
    if (up === 'GROUP' && tokens[i + 1] && /^BY$/i.test(tokens[i + 1])) { out.push('\nGROUP'); continue; }
    if (up === 'ORDER' && tokens[i + 1] && /^BY$/i.test(tokens[i + 1])) { out.push('\nORDER'); continue; }
    if (up === 'PARTITION' && tokens[i + 1] && /^BY$/i.test(tokens[i + 1])) { out.push('\n  PARTITION'); continue; }
    if (up === 'BY') { out.push(' BY'); indent = 1; continue; }
    if (up === 'ON' || up === 'AND' || up === 'OR') { out.push('\n  ' + word); continue; }
    if (up === 'WHEN' || up === 'ELSE' || up === 'END') { out.push('\n  ' + word); continue; }
    out.push((prev && /[).A-Za-z0-9\]]$/.test(prev) ? ' ' : out.length ? ' ' : '') + word);
  }
  return out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const fmtIn = $('fmt-in');
if (fmtIn) {
  const run = () => { $('fmt-out').value = formatTsql(fmtIn.value); };
  $('fmt-run').addEventListener('click', run);
  run();
}

// ---------- dates ----------
const dtFn = $('dt-fn');
if (dtFn) {
  const paint = () => {
    const fn = dtFn.value;
    $('dt-add-fields').hidden = fn !== 'dateadd';
    $('dt-diff-fields').hidden = fn !== 'datediff';
    const unit = $('dt-unit').value;
    if (fn === 'dateadd') {
      const n = $('dt-n').value || '0';
      const d = $('dt-date').value.trim() || 'GETDATE()';
      $('dt-out').textContent = `DATEADD(${unit}, ${n}, ${d})`;
    } else {
      const a = $('dt-start').value.trim() || 'start_date';
      const b = $('dt-end').value.trim() || 'GETDATE()';
      $('dt-out').textContent = `DATEDIFF(${unit}, ${a}, ${b})`;
    }
  };
  ['dt-fn', 'dt-unit', 'dt-n', 'dt-date', 'dt-start', 'dt-end'].forEach((id) => $(id)?.addEventListener('input', paint));
  dtFn.addEventListener('change', paint);
  paint();
}

// ---------- mock inserts ----------
function guessType(name, hint) {
  const h = (hint || '').toLowerCase();
  const n = name.toLowerCase();
  if (h) return h;
  if (/(^id|_id$|count|qty|quantity)/.test(n)) return 'int';
  if (/(amount|price|total|cost|rate)/.test(n)) return 'decimal';
  if (/(date|at$|_on$|dob|birth)/.test(n)) return 'date';
  if (/^is_|^has_|active|flag/.test(n)) return 'bit';
  return 'nvarchar';
}
function mockValue(type, i, name) {
  if (type === 'int' || type === 'bigint') return String(i);
  if (type === 'decimal' || type === 'money' || type === 'float') return (i * 10).toFixed(2);
  if (type === 'bit') return i % 2;
  if (type === 'date' || type === 'datetime' || type === 'datetime2') {
    const d = new Date(Date.UTC(2026, 0, i));
    const iso = d.toISOString().slice(0, 10);
    return type === 'date' ? `'${iso}'` : `'${iso} 09:00:00'`;
  }
  if (/email/i.test(name)) return `'user${i}@harbour.example'`;
  const label = name.replace(/_/g, ' ');
  return `'${label} ${i}'`;
}
const mkRun = $('mk-run');
if (mkRun) {
  const run = () => {
    const table = ($('mk-table').value.trim() || 'MyTable').replace(/[^\w[\].]/g, '');
    const n = Math.min(200, Math.max(1, Number($('mk-n').value) || 5));
    const cols = $('mk-cols').value.split(',').map((s) => s.trim()).filter(Boolean).map((part) => {
      const [name, hint] = part.split(':').map((x) => x.trim());
      return { name: name.replace(/[^\w]/g, '_') || 'col', type: guessType(name, hint) };
    });
    if (!cols.length) { $('mk-out').textContent = '-- add a column'; return; }
    const names = cols.map((c) => c.name).join(', ');
    const rows = [];
    for (let i = 1; i <= n; i++) rows.push('  (' + cols.map((c) => mockValue(c.type, i, c.name)).join(', ') + ')');
    $('mk-out').textContent = `INSERT INTO ${table} (${names})\nVALUES\n${rows.join(',\n')};`;
  };
  mkRun.addEventListener('click', run);
  run();
}

// ---------- regex -> LIKE ----------
function regexToLike(raw) {
  const notes = [];
  let s = String(raw || '');
  if (!s) return { like: '', notes };
  let start = s.startsWith('^');
  let end = s.endsWith('$') && !s.endsWith('\\$');
  if (start) s = s.slice(1);
  if (end) s = s.slice(0, -1);
  if (/\\[dwsWDS]|\(\?|\+|\{|\}|\|(?![^\[]*\])/.test(s)) {
    notes.push('Lookaheads, repeats and \\d / \\w are not LIKE. This is a best-effort pattern — check it.');
  }
  let like = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && s[i + 1]) { like += s[++i]; continue; }
    if (ch === '.' && s[i + 1] === '*') { like += '%'; i++; continue; }
    if (ch === '.') { like += '_'; continue; }
    if (ch === '*') { like += '%'; notes.push('* without a dot was treated as %.'); continue; }
    if (ch === '%') { like += '[%]'; continue; }
    if (ch === '_') { like += '[_]'; continue; }
    if (ch === '[') {
      const close = s.indexOf(']', i);
      if (close < 0) { like += ch; continue; }
      like += s.slice(i, close + 1);
      i = close;
      continue;
    }
    like += ch;
  }
  if (!start) like = '%' + like;
  if (!end) like += '%';
  like = like.replace(/%+/g, '%');
  return { like, notes };
}

const lkRun = $('lk-run');
if (lkRun) {
  const run = () => {
    const col = ($('lk-col').value.trim() || 'col').replace(/[^\w.[\]]/g, '');
    const { like, notes } = regexToLike($('lk-in').value);
    $('lk-out').textContent = `WHERE ${col} LIKE '${like}'\n-- or\nWHERE PATINDEX('${like}', ${col}) > 0`;
    $('lk-note').textContent = (notes || []).join(' ');
  };
  lkRun.addEventListener('click', run);
  $('lk-in').addEventListener('input', run);
  $('lk-col').addEventListener('input', run);
  run();
}

// ---------- window preview ----------
const SAMPLE = [
  { id: 1, customer: 'Amy', amount: 40, day: 'Mon' },
  { id: 2, customer: 'Amy', amount: 90, day: 'Tue' },
  { id: 3, customer: 'Tom', amount: 40, day: 'Mon' },
  { id: 4, customer: 'Tom', amount: 120, day: 'Wed' },
  { id: 5, customer: 'Becky', amount: 70, day: 'Tue' },
];

function sortKey(row, ord) {
  if (ord === 'amount_asc') return [row.amount, row.id];
  if (ord === 'day') return [{ Mon: 1, Tue: 2, Wed: 3 }[row.day], row.id];
  return [-row.amount, row.id];
}
function windowValues(fn, part, ord) {
  const groups = new Map();
  for (const row of SAMPLE) {
    const key = part === 'customer' ? row.customer : '_all';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const win = new Map();
  for (const rows of groups.values()) {
    const sorted = [...rows].sort((a, b) => {
      const A = sortKey(a, ord), B = sortKey(b, ord);
      return A[0] - B[0] || A[1] - B[1];
    });
    if (fn === 'sum') {
      let run = 0;
      for (const r of sorted) { run += r.amount; win.set(r.id, run); }
      continue;
    }
    let prev, rank = 0, seen = 0;
    for (const r of sorted) {
      seen += 1;
      const tie = prev !== undefined && prev === r.amount;
      if (fn === 'row_number') win.set(r.id, seen);
      else if (fn === 'dense_rank') { if (!tie) rank += 1; win.set(r.id, rank); }
      else { if (!tie) rank = seen; win.set(r.id, rank); }
      prev = r.amount;
    }
  }
  return win;
}

const wFn = $('w-fn');
if (wFn) {
  const paint = () => {
    const fn = wFn.value, part = $('w-part').value, ord = $('w-ord').value;
    const orderSql = { amount_desc: 'amount DESC', amount_asc: 'amount ASC', day: 'day' }[ord];
    const partSql = part ? `PARTITION BY ${part} ` : '';
    const expr = fn === 'sum' ? 'SUM(amount)' : `${fn.toUpperCase()}()`;
    $('w-sql').textContent = `${expr} OVER (${partSql}ORDER BY ${orderSql})`;
    const win = windowValues(fn, part, ord);
    const head = '<tr><th>id</th><th>customer</th><th>amount</th><th>day</th><th>window</th></tr>';
    const body = SAMPLE.map((r) => `<tr><td>${r.id}</td><td>${r.customer}</td><td>${r.amount}</td><td>${r.day}</td><td><b>${win.get(r.id)}</b></td></tr>`).join('');
    $('w-grid').innerHTML = head + body;
  };
  ['w-fn', 'w-part', 'w-ord'].forEach((id) => $(id).addEventListener('change', paint));
  paint();
}

export { formatTsql, regexToLike };
