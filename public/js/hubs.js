const $ = (id) => document.getElementById(id);
const set = (id, t) => { const el = $(id); if (el) el.textContent = t; };
const data = () => {
  try { return JSON.parse($('hub-data')?.textContent || '{}'); }
  catch { return {}; }
};

function excelSlugHits(slug, f) {
  const map = {
    vlookup: /VLOOKUP/i, xlookup: /XLOOKUP/i, iferror: /IFERROR/i, ifna: /IFNA/i, ifs: /IFS\s*\(/i,
    countifs: /COUNTIFS/i, countif: /COUNTIF/i, sumifs: /SUMIFS/i, sumif: /SUMIF/i,
    averageif: /AVERAGEIF/i, sumproduct: /SUMPRODUCT/i, concatenate: /CONCATENATE/i, concat: /CONCAT\s*\(/i,
    textjoin: /TEXTJOIN/i, left: /^LEFT\s*\(/i, right: /^RIGHT\s*\(/i, mid: /MID\s*\(/i, len: /^LEN\s*\(/i,
    trim: /TRIM\s*\(/i, upper: /UPPER\s*\(/i, lower: /LOWER\s*\(/i, proper: /PROPER\s*\(/i,
    find: /FIND\s*\(/i, search: /SEARCH\s*\(/i, substitute: /SUBSTITUTE\s*\(/i, text: /TEXT\s*\(/i,
    value: /VALUE\s*\(/i, date: /^DATE\s*\(/i, eomonth: /EOMONTH/i, networkdays: /NETWORKDAYS/i,
    'index-match': /INDEX\s*\(|MATCH\s*\(/i, unique: /UNIQUE\s*\(/i, filter: /FILTER\s*\(/i,
    minifs: /MINIFS/i, maxifs: /MAXIFS/i, round: /ROUND\s*\(/i, today: /TODAY\s*\(/i, now: /NOW\s*\(/i,
    if: /\bIF\s*\(/i,
  };
  if (slug === 'if' && /IFERROR|IFNA|IFS|COUNTIF|SUMIF|AVERAGEIF|MINIFS|MAXIFS/i.test(f)) return false;
  return !!(map[slug] && map[slug].test(f));
}

function translateExcel(raw, fallback, slug) {
  const f = String(raw || '').trim();
  if (!f) return fallback || '-- paste a formula';
  if (slug && excelSlugHits(slug, f) && fallback) return fallback;
  const iff = f.match(/IFS\s*\(/i);
  if (iff) return fallback || `CASE\n  WHEN … THEN …\n  ELSE …\nEND`;
  const nested = f.match(/IF\s*\(\s*([^,]+),\s*"?([^",]+)"?\s*,\s*(IF\s*\(.*\))\s*\)/i);
  if (nested) return fallback;
  const simpleIf = f.match(/IF\s*\(\s*([^,]+),\s*"?([^",]+)"?\s*,\s*"?([^")]+)"?\s*\)/i);
  if (simpleIf && !/IFERROR|IFNA|IFS|COUNTIF|SUMIF|AVERAGEIF|MINIFS|MAXIFS/i.test(f)) {
    return `CASE WHEN ${simpleIf[1].replace(/[A-Z]\d+/g, 'total_amount')} THEN '${simpleIf[2]}' ELSE '${simpleIf[3]}' END`;
  }
  if (/VLOOKUP|XLOOKUP|INDEX\s*\(|MATCH\s*\(/i.test(f)) {
    return `-- lookup → JOIN\nSELECT t.*, d.lookup_col\nFROM Tickets t\nLEFT JOIN Dim d ON d.key = t.key;`;
  }
  if (/COUNTIFS?/i.test(f)) return `SELECT COUNT(*) FROM Orders WHERE status = 'Shipped';`;
  if (/SUMIFS?/i.test(f)) return `SELECT SUM(total_amount) FROM Orders WHERE status = 'Shipped';`;
  if (/AVERAGEIF/i.test(f)) return `SELECT AVG(total_amount) FROM Orders WHERE status = 'Shipped';`;
  if (/SUMPRODUCT/i.test(f)) return `SELECT SUM(qty * unit_price) FROM OrderLines;`;
  if (/TEXTJOIN/i.test(f)) return `SELECT STRING_AGG(sku, ', ') FROM OrderLines WHERE sku <> '';`;
  if (/CONCATENATE|CONCAT\s*\(/i.test(f)) return `CONCAT(first_name, ' ', last_name)`;
  if (/^LEFT\s*\(/i.test(f)) return `LEFT(LTRIM(RTRIM(postcode)), 4)`;
  if (/^RIGHT\s*\(/i.test(f)) return `RIGHT(LTRIM(RTRIM(phone)), 4)`;
  if (/MID\s*\(/i.test(f)) return `SUBSTRING(order_ref, 4, 2)`;
  if (/^LEN\s*\(/i.test(f)) return `LEN(email)`;
  if (/TRIM\s*\(/i.test(f)) return `LTRIM(RTRIM(email))`;
  if (/UPPER\s*\(/i.test(f)) return `UPPER(sku)`;
  if (/LOWER\s*\(/i.test(f)) return `LOWER(email)`;
  if (/PROPER\s*\(/i.test(f)) return `UPPER(LEFT(first_name, 1)) + LOWER(SUBSTRING(first_name, 2, 200))`;
  if (/FIND\s*\(|SEARCH\s*\(/i.test(f)) return `CHARINDEX('@', email)`;
  if (/SUBSTITUTE\s*\(/i.test(f)) return `REPLACE(postcode, ' ', '')`;
  if (/TEXT\s*\(/i.test(f)) return `CONVERT(char(10), order_date, 23)`;
  if (/VALUE\s*\(/i.test(f)) return `TRY_CONVERT(decimal(12,2), REPLACE(raw_amount, ',', ''))`;
  if (/^DATE\s*\(/i.test(f)) return `DATEFROMPARTS(y, m, d)`;
  if (/EOMONTH/i.test(f)) return `EOMONTH(order_date, 0)`;
  if (/NETWORKDAYS/i.test(f)) return `-- calendar table\nSELECT COUNT(*) FROM Calendar WHERE is_weekday = 1 AND day BETWEEN @start AND @end;`;
  if (/UNIQUE\s*\(/i.test(f)) return `SELECT DISTINCT customer_id FROM Orders;`;
  if (/FILTER\s*\(/i.test(f)) return `SELECT * FROM Orders WHERE status = 'Shipped';`;
  if (/MINIFS/i.test(f)) return `SELECT MIN(order_date) FROM Orders WHERE status = 'Shipped';`;
  if (/MAXIFS/i.test(f)) return `SELECT MAX(order_date) FROM Orders WHERE status = 'Shipped';`;
  if (/ROUND\s*\(/i.test(f)) return `ROUND(total_amount, 2)`;
  if (/TODAY\s*\(/i.test(f)) return `CAST(GETDATE() AS date)`;
  if (/NOW\s*\(/i.test(f)) return `GETDATE()`;
  if (/IFERROR|IFNA/i.test(f)) return `ISNULL(TRY_CONVERT(int, raw_code), 0)`;
  return fallback || '-- no mapping for that formula yet. Try the function pages on /excel-to-sql.';
}

function pandasSlugHits(slug, f) {
  const map = {
    merge: /merge\s*\(/i, join: /\.join\s*\(/i, concat: /concat\s*\(/i, groupby: /groupby\s*\(/i,
    agg: /\.agg\s*\(/i, 'pivot-table': /pivot_table/i, pivot: /pivot\s*\(/i, fillna: /fillna/i,
    dropna: /dropna/i, 'drop-duplicates': /drop_duplicates/i, loc: /\.loc\[/i, iloc: /\.iloc\[/i,
    query: /\.query\s*\(/i, 'sort-values': /sort_values/i, rename: /\.rename\s*\(/i, astype: /astype/i,
    apply: /\.apply\s*\(/i, 'value-counts': /value_counts/i, nunique: /nunique/i, head: /\.head\s*\(/i,
    tail: /\.tail\s*\(/i, 'reset-index': /reset_index/i, assign: /\.assign\s*\(/i, where: /\.where\s*\(/i,
    replace: /\.replace\s*\(/i, 'str-contains': /str\.contains/i, 'dt-to-period': /to_period/i, 'to-sql': /to_sql/i,
  };
  return !!(map[slug] && map[slug].test(f));
}

function translatePandas(raw, fallback, slug) {
  const f = String(raw || '');
  if (slug && pandasSlugHits(slug, f) && fallback) return fallback;
  if (/merge\s*\(/i.test(f)) return fallback || `-- merge → JOIN\nSELECT a.*, b.col\nFROM a\nLEFT JOIN b ON b.key = a.key;`;
  if (/\.join\s*\(/i.test(f)) return fallback;
  if (/concat\s*\(/i.test(f)) return `SELECT * FROM uk\nUNION ALL\nSELECT * FROM ie;`;
  if (/groupby\s*\(/i.test(f)) return `SELECT customer_id, SUM(total_amount) AS sales\nFROM Orders\nGROUP BY customer_id;`;
  if (/\.agg\s*\(/i.test(f)) return `SELECT SUM(total_amount), AVG(total_amount), COUNT(*) FROM Orders;`;
  if (/pivot_table/i.test(f)) return fallback;
  if (/pivot\s*\(/i.test(f)) return fallback;
  if (/fillna/i.test(f)) return `ISNULL(phone, '')`;
  if (/dropna/i.test(f)) return `WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> ''`;
  if (/drop_duplicates/i.test(f)) return fallback;
  if (/\.loc\[/i.test(f)) return `SELECT order_id, email FROM Orders WHERE total_amount > 100;`;
  if (/\.iloc\[/i.test(f)) return `SELECT TOP 10 * FROM Orders ORDER BY order_id;`;
  if (/\.query\s*\(/i.test(f)) return `SELECT * FROM Orders WHERE status = 'Shipped' AND total_amount > 50;`;
  if (/sort_values/i.test(f)) return `ORDER BY status ASC, total_amount DESC`;
  if (/\.rename\s*\(/i.test(f)) return `SELECT total_amount AS sales FROM Orders;`;
  if (/astype/i.test(f)) return `TRY_CONVERT(int, customer_id)`;
  if (/\.apply\s*\(/i.test(f)) return `CASE WHEN total_amount > 10000 THEN 'A' ELSE 'B' END`;
  if (/value_counts/i.test(f)) return `SELECT status, COUNT(*) AS n FROM Orders GROUP BY status ORDER BY n DESC;`;
  if (/nunique/i.test(f)) return `SELECT COUNT(DISTINCT customer_id) FROM Orders;`;
  if (/\.head\s*\(/i.test(f)) return `SELECT TOP 5 * FROM Orders ORDER BY order_date DESC;`;
  if (/\.tail\s*\(/i.test(f)) return `SELECT TOP 5 * FROM Orders ORDER BY order_date DESC;`;
  if (/reset_index/i.test(f)) return fallback;
  if (/\.assign\s*\(/i.test(f)) return fallback;
  if (/\.where\s*\(/i.test(f)) return `CASE WHEN status = 'Shipped' THEN total_amount ELSE 0 END`;
  if (/\.replace\s*\(/i.test(f)) return `CASE status WHEN 'Shipped' THEN 'S' ELSE status END`;
  if (/str\.contains/i.test(f)) return `WHERE email LIKE '%harbour%'`;
  if (/to_period/i.test(f)) return `CONVERT(char(7), order_date, 120)`;
  if (/to_sql/i.test(f)) return fallback;
  return fallback || '-- no mapping for that snippet. See /pandas-to-sql.';
}

function translateDialect(pair, src) {
  let s = src;
  const note = (t) => `-- ${t}\n`;
  if (pair === 'mysql-to-tsql') {
    s = s.replace(/`([^`]+)`/g, '[$1]');
    s = s.replace(/IFNULL\s*\(/gi, 'ISNULL(');
    s = s.replace(/\bNOW\s*\(\s*\)/gi, 'GETDATE()');
    s = s.replace(/\bCURDATE\s*\(\s*\)/gi, 'CAST(GETDATE() AS date)');
    s = s.replace(/DATE_ADD\s*\(\s*([^,]+),\s*INTERVAL\s+(-?\d+)\s+DAY\s*\)/gi, 'DATEADD(day, $2, $1)');
    s = s.replace(/GROUP_CONCAT\s*\(\s*([^)]+)\)/gi, 'STRING_AGG($1, \',\')');
    s = s.replace(/\bIF\s*\(/gi, 'IIF(');
    const lim = s.match(/LIMIT\s+(\d+)\s*,\s*(\d+)/i);
    if (lim) {
      s = s.replace(/LIMIT\s+\d+\s*,\s*\d+/i, '').replace(/;\s*$/, '');
      s += `\nOFFSET ${lim[1]} ROWS FETCH NEXT ${lim[2]} ROWS ONLY;`;
    } else {
      const one = s.match(/LIMIT\s+(\d+)/i);
      if (one) {
        s = s.replace(/LIMIT\s+\d+/i, '');
        if (!/SELECT\s+TOP/i.test(s)) s = s.replace(/SELECT\s+/i, `SELECT TOP ${one[1]} `);
      }
    }
    return note('MySQL → T-SQL (LIMIT, IFNULL, NOW, backticks)') + s;
  }
  if (pair === 'postgresql-to-tsql') {
    s = s.replace(/::(\w+)/g, '');
    s = s.replace(/\bILIKE\b/gi, 'LIKE');
    s = s.replace(/\|\|/g, ', ');
    s = s.replace(/\bTRUE\b/gi, '1').replace(/\bFALSE\b/gi, '0');
    s = s.replace(/DATE_TRUNC\s*\(\s*'month'\s*,\s*([^)]+)\)/gi, 'DATEFROMPARTS(YEAR($1), MONTH($1), 1)');
    const off = s.match(/LIMIT\s+(\d+)\s+OFFSET\s+(\d+)/i);
    if (off) {
      s = s.replace(/LIMIT\s+\d+\s+OFFSET\s+\d+/i, `OFFSET ${off[2]} ROWS FETCH NEXT ${off[1]} ROWS ONLY`);
    } else {
      const one = s.match(/LIMIT\s+(\d+)/i);
      if (one) s = s.replace(/LIMIT\s+\d+/i, '').replace(/SELECT\s+/i, `SELECT TOP ${one[1]} `);
    }
    return note('PostgreSQL → T-SQL. ::casts removed — add CAST() by hand. || became commas; wrap CONCAT() if needed.') + s;
  }
  if (pair === 'oracle-to-tsql') {
    s = s.replace(/NVL\s*\(/gi, 'ISNULL(');
    s = s.replace(/\bSYSDATE\b/gi, 'GETDATE()');
    s = s.replace(/FROM\s+DUAL/gi, '');
    s = s.replace(/VARCHAR2/gi, 'nvarchar');
    s = s.replace(/\|\|/g, ', ');
    const rn = s.match(/ROWNUM\s*<=\s*(\d+)/i);
    if (rn) {
      s = s.replace(/AND\s+ROWNUM\s*<=\s*\d+/i, '').replace(/WHERE\s+ROWNUM\s*<=\s*\d+/i, '');
      s = s.replace(/SELECT\s+/i, `SELECT TOP ${rn[1]} `);
    }
    s = s.replace(/\bMINUS\b/gi, 'EXCEPT');
    return note('Oracle → T-SQL. DECODE → CASE by hand. LISTAGG → STRING_AGG.') + s;
  }
  if (pair === 'snowflake-to-tsql') {
    s = s.replace(/\bIFNULL\s*\(|\bNVL\s*\(/gi, 'ISNULL(');
    s = s.replace(/\bIFF\s*\(/gi, 'IIF(');
    s = s.replace(/\bILIKE\b/gi, 'LIKE');
    s = s.replace(/TO_VARCHAR\s*\(/gi, 'CONVERT(varchar, ');
    const q = /QUALIFY\s+([\s\S]+?)(?=ORDER BY|LIMIT|;|$)/i.exec(s);
    if (q) {
      s = s.replace(q[0], '');
      s = `-- QUALIFY became a filter on a derived table\nSELECT * FROM (\n${s.replace(/;\s*$/, '')}\n) q\nWHERE ${q[1].trim()};`;
    }
    const one = s.match(/LIMIT\s+(\d+)/i);
    if (one) s = s.replace(/LIMIT\s+\d+/i, '').replace(/SELECT\s+/i, `SELECT TOP ${one[1]} `);
    return note('Snowflake → T-SQL. VARIANT → OPENJSON on /tools/json-openjson.') + s;
  }
  if (pair === 'sqlite-to-tsql') {
    s = s.replace(/IFNULL\s*\(/gi, 'ISNULL(');
    s = s.replace(/\|\|/g, ', ');
    s = s.replace(/date\s*\(\s*'now'\s*\)/gi, 'CAST(GETDATE() AS date)');
    s = s.replace(/date\s*\(\s*'now'\s*,\s*'(-?\d+)\s+day'\s*\)/gi, 'DATEADD(day, $1, CAST(GETDATE() AS date))');
    const one = s.match(/LIMIT\s+(\d+)/i);
    if (one) s = s.replace(/LIMIT\s+\d+/i, '').replace(/SELECT\s+/i, `SELECT TOP ${one[1]} `);
    return note('SQLite → T-SQL. Pick real types when you land.') + s;
  }
  if (pair === 'bigquery-to-tsql') {
    s = s.replace(/`([^`]+)`/g, (_, t) => '[' + t.split('.').pop() + ']');
    s = s.replace(/SAFE_CAST\s*\(\s*([^)]+)\s+AS\s+INT64\s*\)/gi, 'TRY_CAST($1 AS bigint)');
    s = s.replace(/IFNULL\s*\(/gi, 'ISNULL(');
    s = s.replace(/CURRENT_DATE\s*\(\s*\)/gi, 'CAST(GETDATE() AS date)');
    s = s.replace(/DATE_SUB\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, 'DATEADD(day, -$2, $1)');
    s = s.replace(/INT64/gi, 'bigint').replace(/FLOAT64/gi, 'float').replace(/STRING/gi, 'nvarchar(4000)');
    const q = /QUALIFY\s+([\s\S]+?)(?=ORDER BY|LIMIT|;|$)/i.exec(s);
    if (q) {
      s = s.replace(q[0], '');
      s = `SELECT * FROM (\n${s.replace(/;\s*$/, '')}\n) q\nWHERE ${q[1].trim()};`;
    }
    const one = s.match(/LIMIT\s+(\d+)/i);
    if (one) s = s.replace(/LIMIT\s+\d+/i, '').replace(/SELECT\s+/i, `SELECT TOP ${one[1]} `);
    return note('BigQuery → T-SQL. STRUCT/ARRAY need a child table or OPENJSON.') + s;
  }
  if (pair === 'tsql-to-mysql') {
    s = s.replace(/\[([^\]]+)\]/g, '`$1`');
    s = s.replace(/ISNULL\s*\(/gi, 'IFNULL(');
    s = s.replace(/GETDATE\s*\(\s*\)/gi, 'NOW()');
    s = s.replace(/DATEADD\s*\(\s*day\s*,\s*([^,]+),\s*([^)]+)\)/gi, 'DATE_ADD($2, INTERVAL $1 DAY)');
    s = s.replace(/STRING_AGG\s*\(/gi, 'GROUP_CONCAT(');
    const top = s.match(/SELECT\s+TOP\s+(\d+)/i);
    if (top) {
      s = s.replace(/SELECT\s+TOP\s+\d+/i, 'SELECT');
      s = s.replace(/;\s*$/, '') + `\nLIMIT ${top[1]};`;
    }
    return note('T-SQL → MySQL') + s;
  }
  if (pair === 'tsql-to-postgresql') {
    s = s.replace(/ISNULL\s*\(/gi, 'COALESCE(');
    s = s.replace(/GETDATE\s*\(\s*\)/gi, 'now()');
    s = s.replace(/DATEADD\s*\(\s*(\w+)\s*,\s*([^,]+),\s*([^)]+)\)/gi, '($3 + ($2) * INTERVAL \'1 $1\')');
    const top = s.match(/SELECT\s+TOP\s+(\d+)/i);
    if (top) {
      s = s.replace(/SELECT\s+TOP\s+\d+/i, 'SELECT');
      s = s.replace(/;\s*$/, '') + `\nLIMIT ${top[1]};`;
    }
    return note('T-SQL → PostgreSQL. CONVERT styles → to_char by hand.') + s;
  }
  return s;
}

const meta = data();
if ($('hub-run') && meta.kind === 'excel') {
  const run = () => set('hub-out', translateExcel($('hub-in').value, meta.tsql, meta.slug));
  $('hub-run').addEventListener('click', run);
}
if ($('hub-run') && meta.kind === 'pandas') {
  const run = () => set('hub-out', translatePandas($('hub-in').value, meta.tsql, meta.slug));
  $('hub-run').addEventListener('click', run);
}
if ($('hub-run') && meta.kind === 'dialect') {
  const run = () => set('hub-out', translateDialect(meta.slug, $('hub-in').value));
  $('hub-run').addEventListener('click', run);
  run();
}
if ($('iv-reveal')) {
  $('iv-reveal').addEventListener('click', () => {
    const box = $('iv-box');
    if (box) box.hidden = !box.hidden;
    $('iv-reveal').textContent = box?.hidden ? 'Reveal a worked answer' : 'Hide answer';
  });
}
