const $ = (id) => document.getElementById(id);
const on = (id, ev, fn) => $(id)?.addEventListener(ev, fn);
const set = (id, t) => { const el = $(id); if (el) el.textContent = t; };
const live = (ids, fn) => ids.forEach((id) => { on(id, 'input', fn); on(id, 'change', fn); });

function parseCreate(sql) {
  const tables = [];
  const re = /CREATE\s+TABLE\s+(?:\[?[\w]+\]?\.)?\[?(\w+)\]?\s*\(/gi;
  let m;
  while ((m = re.exec(sql))) {
    const name = m[1];
    let i = m.index + m[0].length;
    let depth = 1;
    let body = '';
    while (i < sql.length && depth > 0) {
      const ch = sql[i++];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
      if (depth > 0) body += ch;
    }
    const cols = [];
    const refs = [];
    const parts = [];
    let cur = '', d = 0;
    for (const ch of body) {
      if (ch === '(') d++;
      if (ch === ')') d--;
      if (ch === ',' && d === 0) { parts.push(cur); cur = ''; }
      else cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    for (const line of parts) {
      const s = line.trim();
      if (!s) continue;
      if (/^CONSTRAINT/i.test(s) || /^PRIMARY KEY/i.test(s) || /^UNIQUE/i.test(s) || /^CHECK/i.test(s)) continue;
      const cm = s.match(/^\[?(\w+)\]?\s+([\w()0-9,]+)/);
      if (!cm) continue;
      const fk = s.match(/REFERENCES\s+\[?(\w+)\]?/i);
      cols.push({ name: cm[1], type: cm[2], pk: /PRIMARY\s+KEY/i.test(s) });
      if (fk) refs.push({ from: name, to: fk[1], col: cm[1] });
    }
    tables.push({ name, cols, refs });
  }
  return tables;
}

if ($('sch-run')) {
  const run = () => {
    const tables = parseCreate($('sch-in').value);
    let mermaid = 'erDiagram\n';
    let html = '';
    for (const t of tables) {
      mermaid += `  ${t.name} {\n`;
      html += `<div class="er-table"><h3>${t.name}</h3><ul>${t.cols.map((c) => `<li>${c.pk ? '<b>' : ''}${c.name} <span>${c.type}</span>${c.pk ? '</b>' : ''}</li>`).join('')}</ul></div>`;
      for (const c of t.cols) mermaid += `    ${c.type.replace(/[^\w]+/g, '_').replace(/_+$/, '')} ${c.name} ${c.pk ? 'PK' : ''}\n`;
      mermaid += '  }\n';
    }
    for (const t of tables) for (const r of t.refs) mermaid += `  ${r.to} ||--o{ ${r.from} : "${r.col}"\n`;
    $('sch-vis').innerHTML = html || '<p class="muted-note">No CREATE TABLE found.</p>';
    $('sch-out').value = mermaid;
  };
  on('sch-run', 'click', run);
  run();
}

if ($('dtp-kind')) {
  const extra = () => {
    const k = $('dtp-kind').value;
    const box = $('dtp-extra');
    if (k === 'number') box.innerHTML = `<label>Decimals? <select id="dtp-dec"><option value="no">No (counts, ids)</option><option value="yes">Yes (money)</option></select></label>
      <label>Can it exceed 2 billion? <select id="dtp-big"><option value="no">No</option><option value="yes">Yes</option></select></label>`;
    else if (k === 'text') box.innerHTML = `<label>Max length <input id="dtp-len" type="number" value="200"></label>
      <label>Accents / other scripts? <select id="dtp-uni"><option value="yes">Yes — nvarchar</option><option value="no">No — varchar is fine</option></select></label>`;
    else if (k === 'when') box.innerHTML = `<label>Need the time of day? <select id="dtp-time"><option value="no">Date only</option><option value="yes">Date and time</option></select></label>`;
    else if (k === 'id') box.innerHTML = `<label>Created on many machines? <select id="dtp-guid"><option value="no">No — int identity</option><option value="yes">Yes — uniqueidentifier</option></select></label>`;
    else box.innerHTML = '';
    box.querySelectorAll('select,input').forEach((el) => el.addEventListener('input', paint));
  };
  const paint = () => {
    const k = $('dtp-kind').value;
    let out = 'bit  -- 0, 1 or NULL';
    if (k === 'number') out = $('dtp-dec')?.value === 'yes' ? 'decimal(12,2)' : ($('dtp-big')?.value === 'yes' ? 'bigint' : 'int');
    if (k === 'text') {
      const n = Math.min(4000, Math.max(1, Number($('dtp-len')?.value) || 200));
      out = `${$('dtp-uni')?.value === 'no' ? 'varchar' : 'nvarchar'}(${n})`;
    }
    if (k === 'when') out = $('dtp-time')?.value === 'yes' ? 'datetime2(0)' : 'date';
    if (k === 'id') out = $('dtp-guid')?.value === 'yes' ? 'uniqueidentifier' : 'int IDENTITY(1,1)';
    set('dtp-out', out);
  };
  on('dtp-kind', 'change', () => { extra(); paint(); });
  extra(); paint();
}

if ($('df-run')) {
  const colsOf = (sql) => {
    const t = parseCreate(sql)[0];
    const map = new Map();
    if (t) for (const c of t.cols) map.set(c.name.toLowerCase(), c);
    return { name: t ? t.name : 'Table', map };
  };
  const run = () => {
    const a = colsOf($('df-a').value), b = colsOf($('df-b').value);
    const names = new Set([...a.map.keys(), ...b.map.keys()]);
    const lines = [`-- Sync ${a.name} toward the new shape. Read before you run.`];
    for (const n of names) {
      const L = a.map.get(n), R = b.map.get(n);
      if (!L && R) lines.push(`ALTER TABLE ${a.name} ADD ${R.name} ${R.type} NULL;`);
      else if (L && !R) lines.push(`ALTER TABLE ${a.name} DROP COLUMN ${L.name};`);
      else if (L.type.toLowerCase() !== R.type.toLowerCase()) lines.push(`ALTER TABLE ${a.name} ALTER COLUMN ${R.name} ${R.type};`);
    }
    if (lines.length === 1) lines.push('-- No column differences found.');
    set('df-out', lines.join('\n'));
  };
  on('df-run', 'click', run);
  run();
}

if ($('ky-out')) {
  const paint = () => {
    const natural = $('ky-natural').checked, multi = $('ky-multi').checked, merge = $('ky-merge').checked, wide = $('ky-wide').checked;
    let rec = 'int IDENTITY(1,1) primary key.\nJoins stay narrow. Add a UNIQUE constraint on the business code if you have one.';
    if (merge) rec = 'uniqueidentifier with NEWSEQUENTIALID() as the clustered key, or a sequential identity plus a unique GUID.\nNEWID() as clustered jumps around and fragments the index.';
    else if (multi && !wide) rec = 'A composite PRIMARY KEY on those columns is honest if they are stable and short.\nOr: identity PK plus a UNIQUE (col1, col2) so joins stay on one int.';
    else if (natural && !wide) rec = 'You can use the business code as the primary key if it never changes.\nMost teams still prefer an identity and UNIQUE the code — codes get corrected.';
    if (wide && natural) rec = 'Do not cluster on a wide changing code.\nint IDENTITY as PK, UNIQUE on the business columns.';
    set('ky-out', rec);
  };
  ['ky-natural', 'ky-multi', 'ky-merge', 'ky-wide'].forEach((id) => on(id, 'change', paint));
  paint();
}

if ($('nm-in')) {
  const paint = () => {
    const raw = $('nm-in').value || 'name';
    const words = raw.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
    const snake = words.map((w) => w.toLowerCase()).join('_') || 'name';
    const pascal = words.map((w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase()).join('');
    const camel = pascal ? pascal[0].toLowerCase() + pascal.slice(1) : 'name';
    const style = $('nm-style').value;
    const out = style === 'pascal' ? pascal : style === 'camel' ? camel : style === 'bracket' ? `[${snake}]` : snake;
    set('nm-out', out);
  };
  live(['nm-in', 'nm-style'], paint);
  paint();
}

if ($('cs-col')) {
  const rows = [{ op: '>', val: '10000', then: 'Tier 1' }, { op: '>', val: '1000', then: 'Tier 2' }];
  const ops = ['>', '>=', '<', '<=', '=', '<>'];
  const draw = () => {
    $('cs-rows').innerHTML = rows.map((r, i) => `<div class="tool-row">
      <label>When ${$('cs-col').value} <select data-i="${i}" data-k="op">${ops.map((o) => `<option${o === r.op ? ' selected' : ''}>${o}</option>`).join('')}</select></label>
      <label>Value <input data-i="${i}" data-k="val" value="${r.val}"></label>
      <label>Then <input data-i="${i}" data-k="then" value="${r.then}"></label>
    </div>`).join('');
    $('cs-rows').querySelectorAll('input,select').forEach((el) => el.addEventListener('input', () => {
      rows[+el.dataset.i][el.dataset.k] = el.value;
      paint();
    }));
    paint();
  };
  const paint = () => {
    const col = $('cs-col').value || 'col';
    const alias = $('cs-as').value || 'label';
    const els = $('cs-else').value;
    const body = rows.map((r) => `  WHEN ${col} ${r.op} ${isNaN(Number(r.val)) ? `'${r.val.replace(/'/g, "''")}'` : r.val} THEN '${r.then.replace(/'/g, "''")}'`).join('\n');
    set('cs-out', `CASE\n${body}\n  ELSE '${els.replace(/'/g, "''")}'\nEND AS ${alias}`);
  };
  on('cs-add', 'click', () => { rows.push({ op: '>', val: '0', then: 'New' }); draw(); });
  live(['cs-col', 'cs-as', 'cs-else'], paint);
  draw();
}

if ($('ch-col')) {
  const paint = () => {
    const col = $('ch-col').value || 'signup_date';
    const f = $('ch-freq').value;
    const expr = {
      week: `CONCAT(DATEPART(year, ${col}), '-W', RIGHT('0' + CAST(DATEPART(iso_week, ${col}) AS varchar(2)), 2))`,
      month: `CONVERT(char(7), ${col}, 120)`,
      quarter: `CONCAT(DATEPART(year, ${col}), '-Q', DATEPART(quarter, ${col}))`,
      year: `DATEPART(year, ${col})`,
    }[f];
    set('ch-out', `SELECT ${expr} AS cohort,\n       COUNT(*) AS n\nFROM Customers\nGROUP BY ${expr}\nORDER BY cohort;`);
  };
  live(['ch-col', 'ch-freq'], paint);
  paint();
}

if ($('fy-col')) {
  const paint = () => {
    const col = $('fy-col').value || 'order_date';
    const start = Number($('fy-m').value) || 10;
    set('fy-out', `-- Fiscal year starting month ${start}
SELECT
  ${col},
  YEAR(DATEADD(month, ${1 - start}, ${col})) AS fiscal_year,
  CONCAT('FY', YEAR(DATEADD(month, ${1 - start}, ${col})),
         '-Q', DATEPART(quarter, DATEADD(month, ${1 - start}, ${col}))) AS fiscal_quarter
FROM Orders;`);
  };
  live(['fy-col', 'fy-m'], paint);
  paint();
}

if ($('cc-cols')) {
  const paint = () => {
    const cols = $('cc-cols').value.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const sep = $('cc-sep').value;
    const q = sep.replace(/'/g, "''");
    const eng = $('cc-eng').value;
    let sql = '-- add columns';
    if (eng === 'tsql' && cols.length) sql = `CONCAT(${cols.flatMap((c, i) => i ? [`'${q}'`, c] : [c]).join(', ')})`;
    if (eng === 'plus' && cols.length) sql = cols.map((c) => `ISNULL(${c}, '')`).join(` + '${q}' + `);
    if (eng === 'pipe' && cols.length) sql = cols.map((c) => `COALESCE(${c}, '')`).join(` || '${q}' || `);
    set('cc-out', sql);
  };
  live(['cc-eng', 'cc-cols', 'cc-sep'], paint);
  paint();
}

if ($('pv-src')) {
  const paint = () => {
    const src = $('pv-src').value || 'Orders';
    const row = $('pv-row').value || 'customer_id';
    const col = $('pv-col').value || 'status';
    const val = $('pv-val').value || 'total_amount';
    const vals = $('pv-vals').value.split(',').map((s) => `'${s.trim().replace(/'/g, "''")}'`).filter((s) => s !== "''");
    set('pv-out', `-- Static
SELECT *
FROM (
  SELECT ${row}, ${col}, ${val}
  FROM ${src}
) s
PIVOT (SUM(${val}) FOR ${col} IN (${vals.join(', ')})) p;

-- Dynamic (review before exec)
DECLARE @cols nvarchar(max), @sql nvarchar(max);
SELECT @cols = STRING_AGG(QUOTENAME(${col}), ',')
FROM (SELECT DISTINCT ${col} FROM ${src}) d;
SET @sql = '
SELECT * FROM (SELECT ${row}, ${col}, ${val} FROM ${src}) s
PIVOT (SUM(${val}) FOR ${col} IN (' + @cols + ')) p';
EXEC sp_executesql @sql;`);
  };
  live(['pv-src', 'pv-row', 'pv-col', 'pv-val', 'pv-vals'], paint);
  paint();
}

function parseCsv(text) {
  const rows = [];
  for (const line of text.replace(/\r/g, '').split('\n')) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === ',' && !q) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}
if ($('cv-run')) {
  const run = () => {
    const rows = parseCsv($('cv-in').value);
    if (rows.length < 2) { set('cv-out', '-- need a header and a row'); return; }
    const table = ($('cv-table').value || 'T').replace(/[^\w[\].]/g, '');
    const headers = rows[0].map((h) => h.replace(/[^\w]/g, '_') || 'col');
    const vals = rows.slice(1).map((r) => '  (' + headers.map((_, i) => {
      const v = (r[i] || '').replace(/'/g, "''");
      return v === '' ? 'NULL' : (/^-?\d+(\.\d+)?$/.test(v) ? v : `'${v}'`);
    }).join(', ') + ')');
    set('cv-out', `INSERT INTO ${table} (${headers.join(', ')})\nVALUES\n${vals.join(',\n')};`);
  };
  on('cv-run', 'click', run);
  run();
}

if ($('jn-run')) {
  const sqlType = (v) => {
    if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'decimal(18,4)';
    if (typeof v === 'boolean') return 'bit';
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return 'datetime2';
    return 'nvarchar(4000)';
  };
  const run = () => {
    let obj;
    try { obj = JSON.parse($('jn-in').value); } catch { set('jn-out', '-- JSON did not parse'); return; }
    if (Array.isArray(obj)) obj = obj[0] || {};
    const src = $('jn-src').value || '@json';
    const cols = Object.entries(obj).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v))
      .map(([k, v]) => `  ${k} ${sqlType(v)} '$.${k}'`);
    set('jn-out', `SELECT *\nFROM OPENJSON(${src})\nWITH (\n${cols.join(',\n')}\n);`);
  };
  on('jn-run', 'click', run);
  run();
}

if ($('ne-col')) {
  const paint = () => {
    const c = $('ne-col').value || 'phone';
    const sql = {
      missing: `WHERE ${c} IS NULL OR LTRIM(RTRIM(${c})) = ''`,
      present: `WHERE ${c} IS NOT NULL AND LTRIM(RTRIM(${c})) <> ''`,
      nullonly: `WHERE ${c} IS NULL`,
      blankonly: `WHERE ${c} IS NOT NULL AND LTRIM(RTRIM(${c})) = ''`,
    }[$('ne-mode').value];
    set('ne-out', sql);
  };
  live(['ne-col', 'ne-mode'], paint);
  paint();
}

if ($('du-table')) {
  const paint = () => {
    const t = $('du-table').value || 'Customers';
    const cols = $('du-cols').value.split(',').map((s) => s.trim()).filter(Boolean);
    const g = cols.join(', ') || 'email';
    set('du-out', `SELECT ${g}, COUNT(*) AS times
FROM ${t}
GROUP BY ${g}
HAVING COUNT(*) > 1
ORDER BY times DESC;

-- Then the rows
SELECT t.*
FROM ${t} t
JOIN (
  SELECT ${g} FROM ${t} GROUP BY ${g} HAVING COUNT(*) > 1
) d ON ${cols.map((c) => `t.${c} = d.${c}`).join(' AND ') || '1=1'};`);
  };
  live(['du-table', 'du-cols'], paint);
  paint();
}

if ($('st-chips')) {
  const styles = [
    [23, 'ISO yyyy-mm-dd'], [120, 'ODBC yyyy-mm-dd hh:mi:ss'], [103, 'British dd/mm/yyyy'],
    [101, 'US mm/dd/yyyy'], [112, 'yyyyMMdd'], [107, 'Mon dd, yyyy'],
  ];
  let pick = 23;
  const paint = () => {
    const e = $('st-expr').value || 'GETDATE()';
    $('st-chips').innerHTML = styles.map(([n, l]) => `<button type="button" class="btn ${n === pick ? 'btn-primary' : 'btn-ghost'}" data-st="${n}">${n} · ${l}</button>`).join('');
    $('st-chips').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { pick = +b.dataset.st; paint(); }));
    set('st-out', `CONVERT(varchar(30), ${e}, ${pick})`);
  };
  on('st-expr', 'input', paint);
  paint();
}

if ($('vn-out')) {
  const sample = {
    inner: 'Customers who have at least one order. Unmatched customers drop.',
    left: 'Every customer. Orders if they exist; NULL order columns if not.',
    right: 'Every order. Same as LEFT JOIN from Orders. At work, write LEFT.',
    full: 'Matches plus leftovers from both sides.',
    cross: 'Every customer × every order. Usually a mistake.',
  };
  const sql = {
    inner: 'FROM Customers c\nINNER JOIN Orders o ON o.customer_id = c.customer_id',
    left: 'FROM Customers c\nLEFT JOIN Orders o ON o.customer_id = c.customer_id',
    right: 'FROM Customers c\nRIGHT JOIN Orders o ON o.customer_id = c.customer_id',
    full: 'FROM Customers c\nFULL OUTER JOIN Orders o ON o.customer_id = c.customer_id',
    cross: 'FROM Customers c\nCROSS JOIN Orders o',
  };
  const paint = (kind) => {
    $('vn-vis').innerHTML = `<p class="lede" style="margin:12px 0">${sample[kind]}</p>
      <svg viewBox="0 0 280 140" width="280" height="140">
        <circle cx="110" cy="70" r="52" fill="${kind === 'left' || kind === 'full' || kind === 'inner' ? '#dbeafe' : '#f1f5f9'}" stroke="#1f5eff"/>
        <circle cx="170" cy="70" r="52" fill="${kind === 'right' || kind === 'full' || kind === 'inner' ? '#dbeafe' : '#f1f5f9'}" stroke="#1f5eff"/>
        <text x="78" y="74" font-size="12">C</text><text x="188" y="74" font-size="12">O</text>
      </svg>`;
    set('vn-out', sql[kind]);
  };
  document.querySelectorAll('[data-join]').forEach((b) => b.addEventListener('click', () => paint(b.dataset.join)));
  paint('left');
}

if ($('ix-table')) {
  const paint = () => {
    const t = $('ix-table').value || 'Orders';
    const eq = $('ix-eq').value.split(',').map((s) => s.trim()).filter(Boolean);
    const rg = $('ix-range').value.split(',').map((s) => s.trim()).filter(Boolean);
    const inc = $('ix-inc').value.split(',').map((s) => s.trim()).filter(Boolean);
    const key = [...eq, ...rg].join(', ') || 'customer_id';
    const incSql = inc.length ? `\n  INCLUDE (${inc.join(', ')})` : '';
    set('ix-out', `-- Starting point, not a promise\nCREATE INDEX IX_${t}_${eq[0] || 'col'}\n  ON ${t} (${key})${incSql};`);
  };
  live(['ix-table', 'ix-eq', 'ix-range', 'ix-inc'], paint);
  paint();
}

if ($('sg-run')) {
  const run = () => {
    let s = $('sg-in').value;
    const notes = [];
    s = s.replace(/YEAR\s*\(\s*([\w.]+)\s*\)\s*=\s*(\d{4})\s+AND\s+MONTH\s*\(\s*\1\s*\)\s*=\s*(\d{1,2})/gi, (_, col, y, m) => {
      const mm = String(m).padStart(2, '0');
      const next = Number(m) === 12 ? `${Number(y) + 1}-01-01` : `${y}-${String(Number(m) + 1).padStart(2, '0')}-01`;
      notes.push(`YEAR+MONTH(${col}) replaced with a month range.`);
      return `${col} >= '${y}-${mm}-01' AND ${col} < '${next}'`;
    });
    s = s.replace(/YEAR\s*\(\s*([\w.]+)\s*\)\s*=\s*(\d{4})/gi, (_, col, y) => {
      notes.push(`YEAR(${col}) replaced with a range.`);
      return `${col} >= '${y}-01-01' AND ${col} < '${Number(y) + 1}-01-01'`;
    });
    s = s.replace(/MONTH\s*\(\s*([\w.]+)\s*\)\s*=\s*(\d{1,2})/gi, (_, col, m) => {
      notes.push(`MONTH(${col}) is not a full rewrite without the year — wrap a year range yourself.`);
      return `DATEPART(month, ${col}) = ${m} /* still not ideal; prefer a date range */`;
    });
    s = s.replace(/CAST\s*\(\s*([\w.]+)\s+AS\s+date\s*\)\s*=\s*'([^']+)'/gi, (_, col, d) => {
      notes.push(`CAST(${col} AS date) = … rewritten as a half-open range.`);
      return `${col} >= '${d}' AND ${col} < DATEADD(day, 1, '${d}')`;
    });
    if (/LIKE\s+'%/i.test(s)) notes.push('Leading % on LIKE will not seek. See /tools/like-perf.');
    set('sg-out', (notes.length ? notes.map((n) => '-- ' + n).join('\n') + '\n' : '-- No YEAR()/CAST(date)= patterns found.\n') + s);
  };
  on('sg-run', 'click', run);
  run();
}

if ($('lp-col')) {
  const paint = () => {
    const c = $('lp-col').value || 'last_name';
    const q = ($('lp-q').value || 'Ash').replace(/'/g, "''");
    const p = $('lp-pat').value;
    const like = p === 'prefix' ? `${q}%` : p === 'suffix' ? `%${q}` : `%${q}%`;
    const seek = p === 'prefix' ? 'Can seek an index on this column.' : 'Cannot seek a normal index. Fine on a small table; painful on a log.';
    const alt = p === 'prefix' ? '-- this is the cheap shape' : `-- alternatives: full-text, or a persisted reverse() column for suffix\n-- WHERE ${c} LIKE '${q}%'  -- if you can search starts-with instead`;
    set('lp-out', `WHERE ${c} LIKE '${like}'\n-- ${seek}\n${alt}`);
  };
  live(['lp-col', 'lp-q', 'lp-pat'], paint);
  paint();
}

if ($('ct-reuse')) {
  const paint = () => {
    if ($('ct-rec').value === 'yes') return set('ct-out', 'WITH recursive CTE.\nWalking a manager tree is what recursive CTEs are for. #temp cannot recurse by itself.');
    if ($('ct-reuse').value === 'yes' || $('ct-ix').value === 'yes' || $('ct-size').value === 'big') {
      return set('ct-out', '#temp table.\nYou reuse it, you want stats/indexes, or it is large. Materialise once:\nSELECT … INTO #x FROM …;\nCREATE CLUSTERED INDEX IX ON #x (…);');
    }
    set('ct-out', 'WITH cte AS ( … )\nOne statement, modest rows, no extra index. A CTE stays readable.');
  };
  live(['ct-reuse', 'ct-size', 'ct-ix', 'ct-rec'], paint);
  paint();
}

if ($('ms-table')) {
  const paint = () => {
    const fn = { email: 'email()', partial: 'partial(1, "XXXX", 2)', default: 'default()', random: 'random(1, 9999)' }[$('ms-fn').value];
    set('ms-out', `ALTER TABLE ${$('ms-table').value}
  ALTER COLUMN ${$('ms-col').value}
  ADD MASKED WITH (FUNCTION = '${fn}');\n\n-- Unmask for a user:\n-- GRANT UNMASK TO reporting_user;`);
  };
  live(['ms-table', 'ms-col', 'ms-fn'], paint);
  paint();
}

if ($('an-table')) {
  const paint = () => {
    const t = $('an-table').value || 'Customers';
    const cols = $('an-cols').value.split(/\n/).map((s) => s.trim()).filter(Boolean);
    set('an-out', `-- Run on a COPY only
${cols.map((c) => `UPDATE ${t}
SET ${c} = CONVERT(varchar(64), HASHBYTES('SHA2_256', CONCAT('worksql-demo|', ${c})), 2)
WHERE ${c} IS NOT NULL;`).join('\n\n')}`);
  };
  live(['an-table', 'an-cols'], paint);
  paint();
}

if ($('rl-table')) {
  const paint = () => {
    const table = $('rl-table').value || 'Orders';
    const col = $('rl-col').value || 'customer_id';
    const key = $('rl-key').value || 'TenantId';
    set('rl-out', `CREATE OR ALTER FUNCTION dbo.fn_tenant_${table}(@tenant int)
RETURNS TABLE
WITH SCHEMABINDING
AS RETURN SELECT 1 AS allow
WHERE @tenant = CONVERT(int, SESSION_CONTEXT(N'${key}'));

CREATE SECURITY POLICY pol_${table}
ADD FILTER PREDICATE dbo.fn_tenant_${table}(${col}) ON dbo.${table}
WITH (STATE = ON);

-- In the app, before each batch:
-- EXEC sp_set_session_context @key = N'${key}', @value = @CustomerId;`);
  };
  live(['rl-table', 'rl-col', 'rl-key'], paint);
  paint();
}

if ($('au-table')) {
  const paint = () => {
    const t = $('au-table').value || 'Customers';
    const key = $('au-key').value || 'customer_id';
    const cols = $('au-cols').value.split(',').map((s) => s.trim()).filter(Boolean);
    set('au-out', `IF OBJECT_ID('dbo.${t}Audit') IS NULL
CREATE TABLE dbo.${t}Audit (
  audit_id int IDENTITY PRIMARY KEY,
  ${key} int,
  action char(1),
  at_utc datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
  login_name sysname NOT NULL DEFAULT SUSER_SNAME(),
  detail nvarchar(max)
);

CREATE OR ALTER TRIGGER tr_${t}_audit
ON dbo.${t}
AFTER UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  INSERT dbo.${t}Audit (${key}, action, detail)
  SELECT d.${key},
         CASE WHEN i.${key} IS NULL THEN 'D' ELSE 'U' END,
         (SELECT ${cols.map((c) => `d.${c} AS old_${c}, i.${c} AS new_${c}`).join(', ')} FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
  FROM deleted d
  LEFT JOIN inserted i ON i.${key} = d.${key};
END;`);
  };
  live(['au-table', 'au-key', 'au-cols'], paint);
  paint();
}

if ($('si-run')) {
  const run = () => {
    const src = $('si-in').value || '';
    const hits = [];
    if (/\+\s*(req|request|params|query|body|input|argv)/i.test(src) || /['"]\s*\+\s*\w+/.test(src)) hits.push('String concatenation with a request/variable next to SQL text.');
    if (/\$\{/.test(src)) hits.push('Template literal interpolation inside SQL.');
    if (/f["'].*SELECT|`.*SELECT/i.test(src) && /\$\{|\+/.test(src)) hits.push('An f-string or template building a SELECT.');
    if (/execute\s*\(\s*['"]/i.test(src) && /\+/.test(src)) hits.push('EXECUTE of glued text.');
    const ok = `Use a parameter. Example (node / tedious):
const sql = "SELECT customer_id, email FROM Customers WHERE email = @email";
// request.input('email', ted.NVarChar, req.query.email)

Example (C#):
cmd.CommandText = "SELECT customer_id, email FROM Customers WHERE email = @email";
cmd.Parameters.AddWithValue("@email", email);`;
    set('si-out', hits.length ? `Flagged:\n- ${hits.join('\n- ')}\n\n${ok}` : `No obvious glue found. Still use parameters.\n\n${ok}`);
  };
  on('si-run', 'click', run);
  run();
}

if ($('xl-in')) {
  const paint = () => {
    const f = $('xl-in').value.trim();
    let out = 'No mapping for that formula yet. Try IF, VLOOKUP, CONCATENATE, SUMIF, LEFT, LEN.';
    const iff = f.match(/IF\s*\(\s*([^,]+),\s*("?)([^",]+)\2\s*,\s*("?)([^")]+)\4\s*\)/i);
    if (iff) out = `CASE WHEN ${iff[1].replace(/A2/i, 'total_amount')} THEN '${iff[3]}' ELSE '${iff[5]}' END`;
    if (/VLOOKUP/i.test(f)) out = `-- VLOOKUP(key, range, col) → JOIN
SELECT t.*, d.lookup_col
FROM Tickets t
LEFT JOIN Dim d ON d.key = t.key;`;
    if (/CONCATENATE|CONCAT\s*\(/i.test(f)) out = `CONCAT(first_name, ' ', last_name)`;
    if (/SUMIF/i.test(f)) out = `SUM(CASE WHEN status = 'Shipped' THEN total_amount ELSE 0 END)`;
    if (/^LEFT\s*\(/i.test(f)) out = `LEFT(postcode, 4)`;
    if (/^LEN\s*\(/i.test(f)) out = `LEN(email)`;
    set('xl-out', out);
  };
  on('xl-in', 'input', paint);
  paint();
}

if ($('tl-from')) {
  const paint = () => {
    const a = $('tl-from').value || '2026-01-01';
    const b = $('tl-to').value || '2026-12-31';
    if ($('tl-g').value === 'n') {
      set('tl-out', `WITH n AS (
  SELECT 1 AS i
  UNION ALL
  SELECT i + 1 FROM n WHERE i < 100
)
SELECT i FROM n
OPTION (MAXRECURSION 100);`);
      return;
    }
    set('tl-out', `WITH d AS (
  SELECT CAST('${a}' AS date) AS day
  UNION ALL
  SELECT DATEADD(day, 1, day) FROM d WHERE day < CAST('${b}' AS date)
)
SELECT d.day, COUNT(o.order_id) AS orders
FROM d
LEFT JOIN Orders o ON CAST(o.order_date AS date) = d.day
GROUP BY d.day
ORDER BY d.day
OPTION (MAXRECURSION 400);`);
  };
  live(['tl-from', 'tl-to', 'tl-g'], paint);
  paint();
}

if ($('cn-server')) {
  const paint = () => {
    const server = $('cn-server').value || 'localhost';
    const db = $('cn-db').value || 'Harbour';
    const port = $('cn-port').value || '1433';
    const enc = $('cn-enc').checked;
    const trust = $('cn-trust').checked;
    const win = $('cn-auth').value === 'windows';
    $('cn-sql').hidden = win;
    const host = port === '1433' ? server : `${server},${port}`;
    const ado = win
      ? `Server=${host};Database=${db};Integrated Security=true;Encrypt=${enc};TrustServerCertificate=${trust};`
      : `Server=${host};Database=${db};User Id=${$('cn-user').value};Password=${$('cn-pass').value};Encrypt=${enc};TrustServerCertificate=${trust};`;
    const py = win
      ? `mssql+pyodbc:///?odbc_connect=${encodeURIComponent(`DRIVER={ODBC Driver 18 for SQL Server};SERVER=${host};DATABASE=${db};Trusted_Connection=yes;Encrypt=${enc ? 'yes' : 'no'};TrustServerCertificate=${trust ? 'yes' : 'no'};`)}`
      : `mssql+pyodbc://${$('cn-user').value}:PASSWORD@${host}/${db}?driver=ODBC+Driver+18+for+SQL+Server`;
    const node = `sqlserver://${win ? '' : `${$('cn-user').value}:PASSWORD@`}${host}/${db}?encrypt=${enc}&trustServerCertificate=${trust}`;
    set('cn-out', `.NET / SSMS\n${ado}\n\nPython (SQLAlchemy)\n${py}\n\nNode\n${node}`);
  };
  live(['cn-server', 'cn-db', 'cn-port', 'cn-auth', 'cn-user', 'cn-pass', 'cn-enc', 'cn-trust'], paint);
  paint();
}

if ($('bt-run')) {
  const run = () => {
    const n = Math.max(1, Number($('bt-n').value) || 50);
    const stmts = $('bt-in').value.split(/;\s*\n?/).map((s) => s.trim()).filter(Boolean);
    const batches = [];
    for (let i = 0; i < stmts.length; i += n) {
      batches.push(stmts.slice(i, i + n).map((s) => s.endsWith(';') ? s : s + ';').join('\n'));
    }
    set('bt-out', batches.join('\nGO\n'));
  };
  on('bt-run', 'click', run);
  run();
}

if ($('in-raw')) {
  const paint = () => {
    const col = $('in-col').value || 'email';
    const raw = $('in-raw').value.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const nums = $('in-num').checked;
    const list = raw.map((v) => nums ? v.replace(/[^\d.-]/g, '') : `'${v.replace(/'/g, "''")}'`).filter(Boolean);
    set('in-out', `WHERE ${col} IN (${list.join(', ')})`);
  };
  live(['in-col', 'in-raw', 'in-num'], paint);
  paint();
}
