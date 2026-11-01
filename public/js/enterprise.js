const $ = (id) => document.getElementById(id);
const on = (id, ev, fn) => $(id)?.addEventListener(ev, fn);
const set = (id, t) => { const el = $(id); if (el) el.textContent = t; };
const live = (ids, fn) => ids.forEach((id) => { on(id, 'input', fn); on(id, 'change', fn); });

function decimalBytes(p) {
  const n = Number(p) || 18;
  if (n <= 9) return 5;
  if (n <= 19) return 9;
  if (n <= 28) return 13;
  return 17;
}

const TYPE_WORDS = /^(int|bigint|tinyint|smallint|bit|decimal|numeric|money|smallmoney|float|real|date|time|datetime|datetime2|datetimeoffset|smalldatetime|char|nchar|varchar|nvarchar|binary|varbinary|uniqueidentifier|xml|sysname)$/i;

function parseType(line) {
  const s = line.trim();
  if (!s || s.startsWith('--')) return null;
  const named = s.match(/^(\w+)\s+([a-zA-Z0-9_]+)(?:\s*\(\s*([^)]*)\s*\))?$/);
  if (named && !TYPE_WORDS.test(named[1])) {
    return { name: named[1], type: named[2].toLowerCase(), parts: (named[3] || '').split(',').map((x) => x.trim()).filter(Boolean) };
  }
  const bare = s.match(/^([a-zA-Z0-9_]+)(?:\s*\(\s*([^)]*)\s*\))?$/);
  if (bare) return { name: 'col', type: bare[1].toLowerCase(), parts: (bare[2] || '').split(',').map((x) => x.trim()).filter(Boolean) };
  return null;
}

function colSize(col, fill) {
  const t = col.type;
  const n = Number(col.parts[0]) || 0;
  const p = Number(col.parts[0]) || 18;
  if (t === 'bit') return { fixed: 1, variable: 0, note: 'bit' };
  if (t === 'tinyint') return { fixed: 1, variable: 0, note: 'tinyint' };
  if (t === 'smallint') return { fixed: 2, variable: 0, note: 'smallint' };
  if (t === 'int') return { fixed: 4, variable: 0, note: 'int' };
  if (t === 'bigint') return { fixed: 8, variable: 0, note: 'bigint' };
  if (t === 'real') return { fixed: 4, variable: 0, note: 'real' };
  if (t === 'float') return { fixed: n && n <= 24 ? 4 : 8, variable: 0, note: 'float' };
  if (t === 'money') return { fixed: 8, variable: 0, note: 'money' };
  if (t === 'smallmoney') return { fixed: 4, variable: 0, note: 'smallmoney' };
  if (t === 'decimal' || t === 'numeric') return { fixed: decimalBytes(p), variable: 0, note: `${t}(${p})` };
  if (t === 'date') return { fixed: 3, variable: 0, note: 'date' };
  if (t === 'smalldatetime') return { fixed: 4, variable: 0, note: 'smalldatetime' };
  if (t === 'datetime') return { fixed: 8, variable: 0, note: 'datetime' };
  if (t === 'datetime2' || t === 'datetimeoffset') {
    const scale = col.parts[0] !== undefined && col.parts[0] !== '' ? Number(col.parts[0]) : 7;
    const body = scale <= 2 ? 6 : scale <= 4 ? 7 : 8;
    return { fixed: t === 'datetimeoffset' ? body + 2 : body, variable: 0, note: t };
  }
  if (t === 'time') return { fixed: 5, variable: 0, note: 'time' };
  if (t === 'uniqueidentifier') return { fixed: 16, variable: 0, note: 'uniqueidentifier' };
  if (t === 'char' || t === 'binary') return { fixed: n || 1, variable: 0, note: `${t}(${n || 1})` };
  if (t === 'nchar') return { fixed: 2 * (n || 1), variable: 0, note: `nchar(${n || 1})` };
  if (t === 'varchar' || t === 'varbinary') {
    if (String(col.parts[0]).toLowerCase() === 'max') return { fixed: 0, variable: 24, note: `${t}(max) pointer` };
    const payload = Math.round((n || 1) * fill);
    return { fixed: 0, variable: 2 + payload, note: `${t}(${n || 1}) ~${payload} used` };
  }
  if (t === 'nvarchar') {
    if (String(col.parts[0]).toLowerCase() === 'max') return { fixed: 0, variable: 24, note: 'nvarchar(max) pointer' };
    const payload = Math.round(2 * (n || 1) * fill);
    return { fixed: 0, variable: 2 + payload, note: `nvarchar(${n || 1}) ~${payload} used` };
  }
  if (t === 'xml' || t === 'sysname' || t === 'sql_variant') return { fixed: 0, variable: 24, note: t };
  return { fixed: 8, variable: 0, note: `${t} (guessed 8)` };
}

if ($('rs-run')) {
  const run = () => {
    const fill = Math.min(1, Math.max(0.05, Number($('rs-fill').value) || 0.6));
    const rows = Math.max(1, Number($('rs-n').value) || 1);
    const cols = $('rs-in').value.split(/\n/).map(parseType).filter(Boolean);
    if (!cols.length) { set('rs-out', '-- add a type per line'); return; }
    let fixed = 0, variable = 0, varCols = 0;
    const lines = [];
    for (const c of cols) {
      const s = colSize(c, fill);
      fixed += s.fixed;
      variable += s.variable;
      if (s.variable) varCols++;
      lines.push(`  ${c.name || 'col'} ${s.note}: ${s.fixed + s.variable} bytes`);
    }
    const bitmap = 2 + Math.ceil(cols.length / 8);
    const varHeader = varCols ? 2 + 2 * varCols : 0;
    // variable already includes 2-byte length per varchar; MS also stores a 2-byte offset per var col + 2-byte count
    const varOverhead = varCols ? 2 * varCols + 2 : 0;
    const payloadVar = Math.max(0, variable - 2 * varCols);
    const row = 4 + bitmap + fixed + varOverhead + payloadVar;
    const warn = row > 8060 ? '\n-- Over 8,060 bytes in-row. Wide/LOB columns will go off-row.' : '';
    const mb = (row * rows) / 1024 / 1024;
    set('rs-out', `-- Estimate, not DBCC SHOWCONTIG
Columns: ${cols.length}
Null bitmap: ${bitmap} bytes
Fixed data: ${fixed} bytes
Variable payload (at ${fill} fill): ${payloadVar} bytes
Variable offsets: ${varOverhead} bytes
Row header: 4
≈ ${row} bytes / row
${rows.toLocaleString()} rows ≈ ${mb.toFixed(1)} MB heap (no indexes, no fill factor)
${lines.join('\n')}${warn}`);
  };
  on('rs-run', 'click', run);
  run();
}

if ($('dm-expr')) {
  const paint = () => {
    const e = $('dm-expr').value || 'order_date';
    const inn = $('dm-in').value;
    const out = $('dm-out').value;
    let src = e;
    if (inn === 'iso') src = `TRY_CONVERT(date, ${e}, 23)`;
    if (inn === 'uk') src = `TRY_CONVERT(date, ${e}, 103)`;
    if (inn === 'us') src = `TRY_CONVERT(date, ${e}, 101)`;
    if (inn === 'ymd') src = `TRY_CONVERT(date, ${e}, 112)`;
    let sql = src;
    if (out === 'date') sql = `CAST(${src} AS date)`;
    else if (out === 'dt2') sql = `CAST(${src} AS datetime2(0))`;
    else sql = `CONVERT(varchar(30), ${src}, ${out})`;
    const pretty = out === '23' || out === '103' || out === '101' || out === '120' || out === '112'
      ? `\n-- FORMAT is readable and slow in a WHERE\n-- FORMAT(${src}, '…')`
      : '';
    set('dm-out-sql', sql + pretty);
  };
  live(['dm-expr', 'dm-in', 'dm-out'], paint);
  paint();
}

if ($('mf-run')) {
  const run = () => {
    const n = Math.min(100000, Math.max(10, Number($('mf-n').value) || 10000));
    const shape = $('mf-shape').value;
    const loop = $('mf-loop').checked;
    const tally = loop
      ? `DECLARE @i int = 1;
WHILE @i <= ${n}
BEGIN
  -- insert one row using @i, then
  SET @i += 1;
END;`
      : `WITH n AS (
  SELECT 1 AS i
  UNION ALL
  SELECT i + 1 FROM n WHERE i < ${n}
)`;
    const cust = loop
      ? `-- Customers via WHILE
CREATE TABLE #Customers (customer_id int, first_name nvarchar(40), last_name nvarchar(40), email nvarchar(200), postcode nvarchar(12));
DECLARE @i int = 1;
WHILE @i <= ${n}
BEGIN
  INSERT #Customers
  SELECT @i,
         CHOOSE((@i % 6) + 1, 'Amy','Tom','Becky','James','Priya','Owen'),
         CHOOSE((@i % 6) + 1, 'Nair','Gallagher','Shah','Cole','Khan','Reed'),
         CONCAT('user', @i, '@harbour.example'),
         CHOOSE((@i % 6) + 1, 'SW1A 1AA','M1 1AE','B1 1AA','G1 1XX','LS1 1BA','EH1 1YZ');
  SET @i += 1;
END;`
      : `${tally}
SELECT i AS customer_id,
       CHOOSE((i % 6) + 1, 'Amy','Tom','Becky','James','Priya','Owen') AS first_name,
       CHOOSE((i % 6) + 1, 'Nair','Gallagher','Shah','Cole','Khan','Reed') AS last_name,
       CONCAT('user', i, '@harbour.example') AS email,
       CHOOSE((i % 6) + 1, 'SW1A 1AA','M1 1AE','B1 1AA','G1 1XX','LS1 1BA','EH1 1YZ') AS postcode
INTO #Customers
FROM n
OPTION (MAXRECURSION ${Math.min(32767, n)});`;
    const orders = `-- Orders: 1–3 per customer
SELECT ROW_NUMBER() OVER (ORDER BY c.customer_id, v.n) AS order_id,
       c.customer_id,
       DATEADD(day, -(v.n * 3 + c.customer_id % 20), CAST(GETDATE() AS date)) AS order_date,
       CAST(20 + (c.customer_id * v.n % 90) AS decimal(12,2)) AS total_amount
INTO #Orders
FROM #Customers c
CROSS JOIN (VALUES (1),(2),(3)) v(n)
WHERE v.n <= 1 + (c.customer_id % 3);`;
    let out = `-- Dummy data. Not production. Not an API.
`;
    if (shape === 'customers') out += cust;
    else if (shape === 'orders') out += `${cust}\n\n${orders}`;
    else out += `${cust}\n\n${orders}`;
    set('mf-out', out);
  };
  on('mf-run', 'click', run);
  run();
}

if ($('ixr-lo')) {
  const paint = () => {
    const lo = Number($('ixr-lo').value) || 10;
    const hi = Number($('ixr-hi').value) || 30;
    const pages = Number($('ixr-pages').value) || 1000;
    const online = $('ixr-online').checked ? ' ON' : ' OFF';
    const schema = ($('ixr-schema').value || 'dbo').replace(/[^\w]/g, '');
    set('ixr-out', `-- Draft. Read before you schedule it.
DECLARE @schema sysname = N'${schema}';
DECLARE @sql nvarchar(max) = N'';

SELECT @sql = @sql +
  CASE
    WHEN ips.avg_fragmentation_in_percent >= ${hi}
      THEN N'ALTER INDEX ' + QUOTENAME(i.name) + N' ON '
           + QUOTENAME(OBJECT_SCHEMA_NAME(i.object_id)) + N'.'
           + QUOTENAME(OBJECT_NAME(i.object_id))
           + N' REBUILD WITH (ONLINE =${online});' + CHAR(13)
    WHEN ips.avg_fragmentation_in_percent >= ${lo}
      THEN N'ALTER INDEX ' + QUOTENAME(i.name) + N' ON '
           + QUOTENAME(OBJECT_SCHEMA_NAME(i.object_id)) + N'.'
           + QUOTENAME(OBJECT_NAME(i.object_id))
           + N' REORGANIZE;' + CHAR(13)
    ELSE N''
  END
FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
JOIN sys.indexes i
  ON i.object_id = ips.object_id AND i.index_id = ips.index_id
WHERE i.index_id > 0
  AND ips.page_count >= ${pages}
  AND OBJECT_SCHEMA_NAME(i.object_id) = @schema
  AND ips.avg_fragmentation_in_percent >= ${lo};

PRINT @sql;
-- EXEC sp_executesql @sql;`);
  };
  live(['ixr-lo', 'ixr-hi', 'ixr-pages', 'ixr-online', 'ixr-schema'], paint);
  paint();
}

if ($('gd-table')) {
  const paint = () => {
    const table = $('gd-table').value || 'Customers';
    const method = $('gd-method').value;
    const cols = $('gd-cols').value.split(/\n/).map((l) => {
      const [n, k] = l.split(':').map((s) => s && s.trim());
      return n && { name: n, kind: (k || 'name').toLowerCase() };
    }).filter(Boolean);
    if (method === 'hash') {
      set('gd-out', `-- Run on a COPY only
${cols.map((c) => `UPDATE ${table}
SET ${c.name} = CONVERT(varchar(64), HASHBYTES('SHA2_256', CONCAT('worksql|', ${c.name})), 2)
WHERE ${c.name} IS NOT NULL;`).join('\n\n')}`);
      return;
    }
    if (method === 'scramble') {
      set('gd-out', cols.map((c) => {
        if (c.kind === 'phone') return `UPDATE ${table} SET ${c.name} = CONCAT('07', RIGHT('000000000' + CAST(ABS(CHECKSUM(${c.name})) % 1000000000 AS varchar(9)), 9)) WHERE ${c.name} IS NOT NULL;`;
        if (c.kind === 'email') return `UPDATE ${table} SET ${c.name} = CONCAT('user', ${table === 'Customers' ? 'customer_id' : 'id'}, '@example.invalid') WHERE ${c.name} IS NOT NULL;`;
        if (c.kind === 'salary') return `UPDATE ${table} SET ${c.name} = ${c.name} * 0 + 1; -- wipe; or ROUND to band`;
        return `UPDATE ${table} SET ${c.name} = CONCAT(LEFT(${c.name}, 1), '***') WHERE ${c.name} IS NOT NULL;`;
      }).join('\n'));
      return;
    }
    const fn = { email: 'email()', phone: 'partial(0, "XXXX", 4)', name: 'partial(1, "XXXX", 0)', salary: 'default()', id: 'default()' };
    set('gd-out', cols.map((c) => `ALTER TABLE ${table} ALTER COLUMN ${c.name} ADD MASKED WITH (FUNCTION = '${fn[c.kind] || 'default()'}');`).join('\n'));
  };
  live(['gd-table', 'gd-cols', 'gd-method'], paint);
  paint();
}

if ($('sa-table')) {
  const paint = () => {
    const t = $('sa-table').value || 'Customers';
    const key = $('sa-key').value || 'customer_id';
    const cols = $('sa-cols').value.split(',').map((s) => s.trim()).filter(Boolean);
    const ev = [ $('sa-i').checked && 'INSERT', $('sa-u').checked && 'UPDATE', $('sa-d').checked && 'DELETE' ].filter(Boolean);
    const evSql = ev.join(', ') || 'UPDATE';
    set('sa-out', `IF OBJECT_ID('dbo.${t}Audit') IS NULL
CREATE TABLE dbo.${t}Audit (
  audit_id int IDENTITY PRIMARY KEY,
  ${key} int,
  action char(1) NOT NULL,
  at_utc datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
  login_name sysname NOT NULL DEFAULT SUSER_SNAME(),
  detail nvarchar(max)
);

CREATE OR ALTER TRIGGER tr_${t}_audit
ON dbo.${t}
AFTER ${evSql}
AS
BEGIN
  SET NOCOUNT ON;
  INSERT dbo.${t}Audit (${key}, action, detail)
  SELECT COALESCE(i.${key}, d.${key}),
         CASE WHEN i.${key} IS NULL THEN 'D' WHEN d.${key} IS NULL THEN 'I' ELSE 'U' END,
         (SELECT ${cols.map((c) => `d.${c} AS old_${c}, i.${c} AS new_${c}`).join(', ')}
          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
  FROM deleted d
  FULL OUTER JOIN inserted i ON i.${key} = d.${key};
END;`);
  };
  live(['sa-table', 'sa-key', 'sa-cols', 'sa-i', 'sa-u', 'sa-d'], paint);
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

if ($('mg-run')) {
  const run = () => {
    const rows = parseCsv($('mg-in').value);
    if (rows.length < 2) { set('mg-out', '-- need a header and a row'); return; }
    const table = ($('mg-table').value || 'T').replace(/[^\w[\].]/g, '');
    const key = ($('mg-key').value || rows[0][0]).replace(/[^\w]/g, '');
    const headers = rows[0].map((h) => h.replace(/[^\w]/g, '_') || 'col');
    if (!headers.includes(key)) { set('mg-out', `-- key "${key}" is not in the header row`); return; }
    const vals = rows.slice(1).map((r) => '  (' + headers.map((_, i) => {
      const v = (r[i] || '').replace(/'/g, "''");
      return v === '' ? 'NULL' : (/^-?\d+(\.\d+)?$/.test(v) ? v : `'${v}'`);
    }).join(', ') + ')');
    const updates = headers.filter((h) => h !== key).map((h) => `t.${h} = s.${h}`).join(',\n    ');
    const insertCols = headers.join(', ');
    const insertVals = headers.map((h) => `s.${h}`).join(', ');
    set('mg-out', `MERGE ${table} AS t
USING (VALUES
${vals.join(',\n')}
) AS s (${insertCols})
ON t.${key} = s.${key}
WHEN MATCHED THEN UPDATE SET
    ${updates}
WHEN NOT MATCHED THEN INSERT (${insertCols})
    VALUES (${insertVals});`);
  };
  on('mg-run', 'click', run);
  run();
}

if ($('ts-col')) {
  const paint = () => {
    const c = $('ts-col').value || 'phone';
    const job = $('ts-job').value;
    const sql = {
      digits: `-- keep digits\nREPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${c}, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')`,
      uk44: `-- +44 / 0044 → 0…\nCASE\n  WHEN REPLACE(${c}, ' ', '') LIKE '+44%' THEN '0' + SUBSTRING(REPLACE(${c}, ' ', ''), 4, 20)\n  WHEN REPLACE(${c}, ' ', '') LIKE '0044%' THEN '0' + SUBSTRING(REPLACE(${c}, ' ', ''), 5, 20)\n  ELSE REPLACE(${c}, ' ', '')\nEND`,
      postcode: `REPLACE(${c}, ' ', '')`,
      email: `-- first email-shaped token\nSUBSTRING(${c},\n  NULLIF(CHARINDEX('@', ${c}), 0) - CHARINDEX(' ', REVERSE(LEFT(${c}, CHARINDEX('@', ${c})))) + 1,\n  CHARINDEX(' ', ${c} + ' ', CHARINDEX('@', ${c})) - (NULLIF(CHARINDEX('@', ${c}), 0) - CHARINDEX(' ', REVERSE(LEFT(${c}, CHARINDEX('@', ${c})))) + 1)\n)`,
      alnum: `-- letters and digits: nest REPLACE for junk, or translate in the app\nREPLACE(REPLACE(${c}, ' ', ''), '-', '')`,
      spaces: `REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(${c})), CHAR(9), ' '), '  ', ' '), '  ', ' ')`,
    }[job];
    set('ts-out', sql);
  };
  live(['ts-col', 'ts-job'], paint);
  paint();
}
