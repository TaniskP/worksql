// Translates the T-SQL people write in SSMS into SQL the sandbox engine can run.
// Covers the work subset: TOP, [square brackets], ISNULL, GETDATE, DATEADD/DATEDIFF,
// CAST/CONVERT, LEN/LEFT/RIGHT, N'strings' and '+' string concatenation.

const { SCHEMA } = require('./seed');

class TsqlError extends Error {
  constructor(message, hint) { super(message); if (hint) this.hint = hint; }
}

// The stack being translated right now. Translation is synchronous, so a module variable is enough.
let dialectNow = 'tsql';

// "Incorrect syntax near" in each stack's own words. near = null means the query just stopped.
function syntaxMsg(near, dialect = dialectNow) {
  if (dialect === 'postgres') return near == null ? 'syntax error at end of input' : `syntax error at or near "${near}"`;
  if (dialect === 'mysql') return `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${near ?? ''}' at line 1`;
  return near == null ? 'Incorrect syntax near the end of the query.' : `Incorrect syntax near '${near}'.`;
}

const KNOWN_COLUMNS = new Set(Object.values(SCHEMA).flatMap((cols) => cols.map((c) => c[0].toLowerCase())));

const DATE_PART_FUNCS = new Set(['DATEADD', 'DATEDIFF', 'DATEPART', 'DATENAME', 'DATETRUNC']);
const RENAMED_FUNCS = {
  ISNULL: 'IFNULL',
  LEN: 'T_LEN',
  LEFT: 'T_LEFT',
  RIGHT: 'T_RIGHT',
  CHARINDEX: 'T_CHARINDEX',
  YEAR: 'T_YEAR',
  MONTH: 'T_MONTH',
  DAY: 'T_DAY',
  DATEADD: 'T_DATEADD',
  DATEDIFF: 'T_DATEDIFF',
  DATEPART: 'T_DATEPART',
  DATENAME: 'T_DATENAME',
  DATETRUNC: 'T_DATETRUNC',
  DATEFROMPARTS: 'T_DATEFROMPARTS',
  EOMONTH: 'T_EOMONTH',
  FORMAT: 'T_FORMAT',
  GETDATE: 'T_GETDATE',
  SYSDATETIME: 'T_GETDATE',
  CURRENT_TIMESTAMP: 'T_GETDATE()',
};
const BLOCKED = new Set([
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE',
  'EXEC', 'EXECUTE', 'GRANT', 'REVOKE', 'ATTACH', 'DETACH', 'PRAGMA', 'VACUUM', 'REINDEX',
]);

function tokenize(sql, dialect = 'tsql') {
  dialectNow = dialect;
  const tokens = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const rest = sql.slice(i);
    if (/\s/.test(c)) { i++; continue; }
    if (rest.startsWith('--') || (dialect === 'mysql' && c === '#')) { const e = sql.indexOf('\n', i); i = e === -1 ? sql.length : e; continue; }
    if (rest.startsWith('/*')) {
      const e = sql.indexOf('*/', i + 2);
      if (e === -1) throw new TsqlError(dialect === 'tsql' ? "Missing end comment mark '*/'." : dialect === 'postgres' ? 'unterminated /* comment at or near "/*"' : syntaxMsg(rest.slice(0, 20)));
      i = e + 2; continue;
    }
    let m;
    if ((m = rest.match(/^[Nn]?'(?:[^']|'')*'/))) {
      const raw = m[0].replace(/^[Nn]/, '');
      tokens.push({ t: 'str', v: raw }); i += m[0].length; continue;
    }
    if (c === "'" || ((c === 'N' || c === 'n') && sql[i + 1] === "'")) {
      throw new TsqlError(dialect === 'tsql' ? 'Unclosed quotation mark after the character string.'
        : dialect === 'postgres' ? `unterminated quoted string at or near "${rest.slice(0, 20)}"` : syntaxMsg(rest.slice(0, 20)));
    }
    if (c === '[' && dialect !== 'tsql') {
      throw new TsqlError(syntaxMsg('['), dialect === 'postgres' ? 'Square brackets are SQL Server only. PostgreSQL quotes names with "double quotes".'
        : 'Square brackets are SQL Server only. MySQL quotes names with `backticks`.');
    }
    if (c === '`' && dialect === 'mysql') {
      const e = sql.indexOf('`', i + 1);
      if (e === -1) throw new TsqlError(syntaxMsg(rest.slice(0, 20)));
      const name = sql.slice(i + 1, e);
      tokens.push({ t: 'ident', v: '"' + name.replace(/"/g, '""') + '"', name });
      i = e + 1; continue;
    }
    if (c === '"' && dialect === 'mysql') { // MySQL reads "double quotes" as a string, not a name
      const q = rest.match(/^"(?:[^"]|"")*"/);
      if (!q) throw new TsqlError(syntaxMsg(rest.slice(0, 20)));
      tokens.push({ t: 'str', v: "'" + q[0].slice(1, -1).replace(/""/g, '"').replace(/'/g, "''") + "'" });
      i += q[0].length; continue;
    }
    if (c === '[') {
      const e = sql.indexOf(']', i);
      if (e === -1) throw new TsqlError("Unclosed square bracket '['.");
      tokens.push({ t: 'ident', v: '"' + sql.slice(i + 1, e).replace(/"/g, '""') + '"', name: sql.slice(i + 1, e) });
      i = e + 1; continue;
    }
    if ((m = rest.match(/^"(?:[^"]|"")*"/))) { tokens.push({ t: 'ident', v: m[0], name: m[0].slice(1, -1) }); i += m[0].length; continue; }
    if ((m = rest.match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/))) { tokens.push({ t: 'num', v: m[0] }); i += m[0].length; continue; }
    if ((m = rest.match(/^[@#]{0,2}[A-Za-z_][A-Za-z0-9_$#@]*/))) {
      if (m[0][0] === '@') throw new TsqlError('Variables (' + m[0] + ") aren't used in these lessons. Write a plain SELECT.");
      if (m[0][0] === '#') throw new TsqlError(dialect === 'tsql' ? 'Temp tables are coming in a later path. Write a plain SELECT for now.' : syntaxMsg('#'));
      tokens.push({ t: 'word', v: m[0], up: m[0].toUpperCase() }); i += m[0].length; continue;
    }
    if ((m = rest.match(/^(<>|!=|>=|<=|!<|!>|\|\||::)/))) { tokens.push({ t: 'op', v: m[0] }); i += m[0].length; continue; }
    tokens.push({ t: c === '(' || c === ')' ? c : 'op', v: c }); i++;
  }
  return tokens;
}

// Index of the ')' matching the '(' at index `open`.
function matchParen(tokens, open) {
  let depth = 0;
  for (let k = open; k < tokens.length; k++) {
    if (tokens[k].t === '(') depth++;
    else if (tokens[k].t === ')' && --depth === 0) return k;
  }
  throw new TsqlError(dialectNow === 'tsql' ? "Incorrect syntax: a '(' is never closed." : syntaxMsg(null));
}

// Split tokens[from..to) at depth-0 commas.
function splitArgs(tokens, from, to) {
  const args = [[]];
  let depth = 0;
  for (let k = from; k < to; k++) {
    const tk = tokens[k];
    if (tk.t === '(') depth++;
    if (tk.t === ')') depth--;
    if (depth === 0 && tk.t === 'op' && tk.v === ',') { args.push([]); continue; }
    args[args.length - 1].push(tk);
  }
  return args;
}

function typeName(tokens) {
  return tokens.map((t) => t.v).join('').toLowerCase();
}

function render(tokens) {
  let out = '';
  let prev = null;
  for (const tk of tokens) {
    const glue = prev && (tk.t === ')' || prev.t === '(' || (tk.t === '(' && prev.t === 'word' && prev.fn) || (tk.t === 'op' && tk.v === ',') || (tk.t === 'op' && tk.v === '.') || (prev.t === 'op' && prev.v === '.'));
    out += (prev && !glue ? ' ' : '') + tk.v;
    prev = tk;
  }
  return out;
}

function transform(tokens) {
  const out = [];
  // Stack of open scopes; each may carry a pending TOP n to emit as LIMIT before it closes.
  const scopes = [{ limit: null }];
  for (let k = 0; k < tokens.length; k++) {
    const tk = tokens[k];
    const next = tokens[k + 1];

    if (tk.t === 'word' && BLOCKED.has(tk.up)) {
      throw new TsqlError(`${tk.up} is switched off here. This sandbox is read-only: SELECT queries only.`);
    }

    // dbo.Orders -> Orders (everything lives in the default schema here)
    // [Harbour].[dbo].Orders -> Orders: the database and schema names SSMS puts in generated scripts
    const nameLc = tk.t === 'ident' ? tk.name.toLowerCase() : (tk.up || '').toLowerCase();
    if ((nameLc === 'dbo' || nameLc === 'harbour') && next && next.v === '.') { k++; continue; }

    if (tk.t === '(') { scopes.push({ limit: null }); out.push(tk); continue; }
    if (tk.t === ')') {
      const scope = scopes.pop();
      if (!scope || scopes.length === 0) throw new TsqlError("Incorrect syntax near ')'.");
      if (scope.limit) out.push({ t: 'word', v: 'LIMIT' }, { t: 'num', v: scope.limit });
      out.push(tk); continue;
    }

    if (tk.t === 'word' && tk.up === 'TOP') {
      const prev = tokens[k - 1];
      if (!prev || !(prev.up === 'SELECT' || prev.up === 'DISTINCT' || prev.up === 'ALL')) {
        throw new TsqlError("Incorrect syntax near 'TOP'. TOP goes straight after SELECT.");
      }
      let n; let skip;
      if (next && next.t === '(' && tokens[k + 2] && tokens[k + 2].t === 'num' && tokens[k + 3] && tokens[k + 3].t === ')') {
        n = tokens[k + 2].v; skip = 3;
      } else if (next && next.t === 'num') {
        n = next.v; skip = 1;
      } else {
        throw new TsqlError("Incorrect syntax near 'TOP'. Try TOP 5 or TOP (5).");
      }
      const after = tokens[k + skip + 1];
      if (after && after.up === 'PERCENT') throw new TsqlError('TOP ... PERCENT is not in this path yet. Use a plain TOP n.');
      if (after && after.up === 'WITH' && tokens[k + skip + 2] && tokens[k + skip + 2].up === 'TIES') {
        throw new TsqlError('TOP ... WITH TIES is not in this path yet. Use a plain TOP n.');
      }
      scopes[scopes.length - 1].limit = String(parseInt(n, 10));
      k += skip; continue;
    }

    // CAST(expr AS type) -> T_CAST(expr, 'type')
    if (tk.t === 'word' && tk.up === 'CAST' && next && next.t === '(') {
      const close = matchParen(tokens, k + 1);
      let depth = 0; let asAt = -1;
      for (let j = k + 2; j < close; j++) {
        if (tokens[j].t === '(') depth++;
        if (tokens[j].t === ')') depth--;
        if (depth === 0 && tokens[j].up === 'AS') asAt = j;
      }
      if (asAt === -1) throw new TsqlError("Incorrect syntax near 'CAST'. It looks like CAST(value AS date).");
      const inner = transform(tokens.slice(k + 2, asAt));
      out.push({ t: 'word', v: 'T_CAST', fn: true }, { t: '(', v: '(' }, ...inner, { t: 'op', v: ',' },
        { t: 'str', v: `'${typeName(tokens.slice(asAt + 1, close))}'` }, { t: ')', v: ')' });
      k = close; continue;
    }

    // CONVERT(type, expr [, style]) -> T_CAST(expr, 'type')
    if (tk.t === 'word' && tk.up === 'CONVERT' && next && next.t === '(') {
      const close = matchParen(tokens, k + 1);
      const args = splitArgs(tokens, k + 2, close);
      if (args.length < 2) throw new TsqlError("CONVERT needs a type and a value, like CONVERT(date, GETDATE()).");
      out.push({ t: 'word', v: 'T_CAST', fn: true }, { t: '(', v: '(' }, ...transform(args[1]), { t: 'op', v: ',' },
        { t: 'str', v: `'${typeName(args[0])}'` }, { t: ')', v: ')' });
      k = close; continue;
    }

    if (tk.t === 'word' && next && next.t === '(' && RENAMED_FUNCS[tk.up]) {
      out.push({ t: 'word', v: RENAMED_FUNCS[tk.up], fn: true });
      // DATEADD(day, ...) -> the date part becomes a string argument.
      if (DATE_PART_FUNCS.has(tk.up)) {
        const part = tokens[k + 2];
        if (!part || part.t !== 'word') throw new TsqlError(`${tk.up} needs a date part first, like ${tk.up}(day, ...).`);
        out.push(next, { t: 'str', v: `'${part.v.toLowerCase()}'` });
        scopes.push({ limit: null });
        k += 2; continue;
      }
      continue;
    }
    if (tk.t === 'word' && tk.up === 'CURRENT_TIMESTAMP') { out.push({ t: 'word', v: 'T_GETDATE()' }); continue; }

    // 'a' + col -> 'a' || col (SQL Server concatenates strings with +)
    if (tk.t === 'op' && tk.v === '+') {
      const prevTok = tokens[k - 1];
      const isStrSide = (t) => t && t.t === 'str';
      if (isStrSide(prevTok) || isStrSide(next) || looksLikeTextConcat(tokens, k)) { out.push({ t: 'op', v: '||' }); continue; }
    }

    if (tk.t === 'word' && next && next.t === '(') { out.push({ ...tk, fn: true }); continue; }
    out.push(tk);
  }
  if (scopes.length !== 1) throw new TsqlError("Incorrect syntax: a '(' is never closed.");
  if (scopes[0].limit) out.push({ t: 'word', v: 'LIMIT' }, { t: 'num', v: scopes[0].limit });
  return out;
}

// In a chain like first_name + ' ' + last_name, every + joins text.
function looksLikeTextConcat(tokens, k) {
  for (let j = k - 1; j >= 0; j--) {
    const t = tokens[j];
    if (t.t === 'op' && t.v === '+' && tokens[j + 1] && tokens[j + 1].t === 'str') return true;
    if (t.t === 'op' && t.v === '+' && tokens[j - 1] && tokens[j - 1].t === 'str') return true;
    if (t.t === 'op' && (t.v === ',' || t.v === '=' || t.v === '<' || t.v === '>')) break;
    if (t.t === 'word' && /^(SELECT|WHERE|AND|OR|ON|AS|FROM|BY)$/.test(t.up)) break;
  }
  for (let j = k + 1; j < tokens.length; j++) {
    const t = tokens[j];
    if (t.t === 'op' && t.v === '+' && (tokens[j + 1]?.t === 'str' || tokens[j - 1]?.t === 'str')) return true;
    if (t.t === 'op' && (t.v === ',' || t.v === '=' || t.v === '<' || t.v === '>')) break;
    if (t.t === 'word' && /^(FROM|WHERE|AND|OR|ON|AS|ORDER|GROUP)$/.test(t.up)) break;
  }
  return false;
}

// ---------- SQL Server's GROUP BY rule ----------
// SQLite lets "SELECT status, total_amount, COUNT(*) ... GROUP BY status" run and picks a random
// total_amount. SQL Server refuses. We refuse too, with SQL Server's message.

const AGGREGATES = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COUNT_BIG', 'STRING_AGG', 'STDEV', 'VAR']);
const NOT_COLUMNS = new Set(['CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN',
  'AS', 'DISTINCT', 'OVER', 'PARTITION', 'BY', 'ORDER', 'ASC', 'DESC', 'ROWS', 'RANGE', 'UNBOUNDED', 'PRECEDING', 'FOLLOWING',
  'CURRENT', 'ROW', 'CURRENT_TIMESTAMP', 'EXISTS', 'SELECT', 'TRUE', 'FALSE',
  // Words inside EXTRACT(... FROM ...), INTERVAL n DAY, ::date and CAST types in PostgreSQL and MySQL
  'FROM', 'INTERVAL', 'DATE', 'DATETIME', 'TIMESTAMP', 'CHAR', 'SIGNED', 'UNSIGNED', 'DECIMAL', 'NUMERIC', 'INTEGER', 'INT', 'TEXT',
  'VARCHAR', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'HOUR', 'MINUTE', 'SECOND', 'QUARTER', 'CURRENT_DATE', 'LOCALTIMESTAMP', 'NULLS',
  'FIRST', 'LAST', 'SEPARATOR', 'ILIKE']);
const PK = Object.fromEntries(Object.entries(SCHEMA).map(([t, cols]) => [t.toLowerCase(), cols.find((c) => c[3] === 'PK')[0].toLowerCase()]));
const TABLE_COLS = Object.fromEntries(Object.entries(SCHEMA).map(([t, cols]) => [t.toLowerCase(), new Set(cols.map((c) => c[0].toLowerCase()))]));
const TABLE_NAME = Object.fromEntries(Object.keys(SCHEMA).map((t) => [t.toLowerCase(), t]));
const FROM_STOP = new Set(['JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'UNION', 'WINDOW', 'USING']);
const CLAUSE_END = new Set(['HAVING', 'ORDER', 'UNION', 'EXCEPT', 'INTERSECT', 'WINDOW']);

const isWordTok = (t) => t && (t.t === 'word' || t.t === 'ident');
const textOf = (toks) => toks.map((t) => (t.t === 'ident' ? t.name : t.v)).join(' ').toLowerCase().replace(/\s*([().,])\s*/g, '$1');
const lastName = (s) => s.split('.').pop();

// Column references in an expression that are not inside an aggregate or a nested SELECT.
function bareColumns(toks) {
  const cols = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const next = toks[i + 1];
    if (t.t === '(' && next && next.up === 'SELECT') { i = matchParen(toks, i); continue; }
    if (t.t === 'word' && next && next.t === '(') {
      const close = matchParen(toks, i + 1);
      const isWindow = toks[close + 1] && toks[close + 1].up === 'OVER';
      if (AGGREGATES.has(t.up) && !isWindow) { i = close; continue; }
      if (DATE_PART_FUNCS.has(t.up)) { i += 2; continue; } // skip the datepart word
      if (t.up === 'CONVERT') { // skip the type argument
        let depth = 0;
        for (let j = i + 1; j < close; j++) {
          if (toks[j].t === '(') depth++;
          if (toks[j].t === ')') depth--;
          if (depth === 1 && toks[j].v === ',') { i = j; break; }
        }
      }
      continue;
    }
    if (t.t === 'op' && t.v === '::') { // x::date: skip the type
      i++;
      if (toks[i + 1] && toks[i + 1].t === '(') i = matchParen(toks, i + 1);
      continue;
    }
    if (t.up === 'AS') { // CAST(x AS type): skip the type
      i++;
      if (toks[i + 1] && toks[i + 1].t === '(') i = matchParen(toks, i + 1);
      continue;
    }
    if (!isWordTok(t) || NOT_COLUMNS.has(t.up)) continue;
    let name = t.t === 'ident' ? t.name : t.v;
    while (toks[i + 1] && toks[i + 1].v === '.' && isWordTok(toks[i + 2])) {
      const n = toks[i + 2];
      name += '.' + (n.t === 'ident' ? n.name : n.v);
      i += 2;
    }
    cols.push(name);
  }
  return cols;
}

function hasAggregate(toks) {
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === '(' && toks[i + 1] && toks[i + 1].up === 'SELECT') { i = matchParen(toks, i); continue; }
    if (t.t === 'word' && AGGREGATES.has(t.up) && toks[i + 1] && toks[i + 1].t === '(') {
      const close = matchParen(toks, i + 1);
      if (!(toks[close + 1] && toks[close + 1].up === 'OVER')) return true;
    }
  }
  return false;
}

function stripAlias(item) {
  let depth = 0;
  for (let j = 0; j < item.length; j++) {
    if (item[j].t === '(') depth++;
    if (item[j].t === ')') depth--;
    if (depth === 0 && item[j].up === 'AS') return item.slice(0, j);
  }
  const last = item[item.length - 1];
  const prev = item[item.length - 2];
  if (item.length > 1 && isWordTok(last) && !NOT_COLUMNS.has(last.up) && !(prev.v === '.')) return item.slice(0, -1);
  return item;
}

// FROM Orders o JOIN Customers AS c -> { o: 'orders', orders: 'orders', c: 'customers', customers: 'customers' }
function fromTables(tokens, from, end) {
  const map = {};
  let depth = 0;
  for (let j = from + 1; j < end; j++) {
    const t = tokens[j];
    if (t.t === '(') depth++;
    if (t.t === ')') depth--;
    if (depth !== 0 || !isWordTok(t)) continue;
    const name = (t.t === 'ident' ? t.name : t.v).toLowerCase();
    if (!PK[name] || (tokens[j - 1] && tokens[j - 1].v === '.')) continue;
    map[name] = name;
    let a = tokens[j + 1];
    if (a && a.up === 'AS') a = tokens[j + 2];
    if (a && isWordTok(a) && !FROM_STOP.has(a.up)) map[(a.t === 'ident' ? a.name : a.v).toLowerCase()] = name;
  }
  return map;
}

// The table a column reference belongs to, if we can tell.
function tableOf(col, tables) {
  const parts = col.toLowerCase().split('.');
  if (parts.length > 1) return tables[parts[parts.length - 2]] || null;
  const owners = [...new Set(Object.values(tables))].filter((t) => TABLE_COLS[t].has(parts[0]));
  return owners.length === 1 ? owners[0] : null;
}

function groupingError(dialect, col, n, tables, grouped) {
  const table = tableOf(col, tables);
  const bare = lastName(col);
  if (dialect === 'postgres') {
    const shown = col.includes('.') ? col.toLowerCase() : table ? `${table}.${bare.toLowerCase()}` : bare.toLowerCase();
    return new TsqlError(`column "${shown}" must appear in the GROUP BY clause or be used in an aggregate function`);
  }
  if (dialect === 'mysql') {
    const shown = table ? `harbour.${TABLE_NAME[table]}.${bare}` : bare;
    return new TsqlError(grouped
      ? `Expression #${n} of SELECT list is not in GROUP BY clause and contains nonaggregated column '${shown}' which is not functionally dependent on columns in GROUP BY clause; this is incompatible with sql_mode=only_full_group_by`
      : `In aggregated query without GROUP BY, expression #${n} of SELECT list contains nonaggregated column '${shown}'; this is incompatible with sql_mode=only_full_group_by`);
  }
  return new TsqlError(`Column '${col}' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.`);
}

function aliasError(dialect, name) {
  if (dialect === 'postgres') return new TsqlError(`column "${name.toLowerCase()}" does not exist`);
  if (dialect === 'mysql') return new TsqlError(`Unknown column '${name}' in 'where clause'`);
  return new TsqlError(`Invalid column name '${name}'.`);
}

// Each stack's GROUP BY rule. SQL Server: every selected column must be grouped or aggregated.
// PostgreSQL and MySQL (ONLY_FULL_GROUP_BY) also accept columns that depend on a grouped primary key,
// and let GROUP BY use a select alias or a position. MySQL also lets HAVING use an alias.
function checkGrouping(tokens, dialect = 'tsql') {
  for (let s = 0; s < tokens.length; s++) {
    if (tokens[s].up !== 'SELECT') continue;
    // Find the end of this SELECT's scope and its clauses, at its own depth.
    let depth = 0; let from = -1; let group = -1; let groupEnd = -1; let end = tokens.length;
    const filters = []; // depth-0 token indexes inside WHERE and HAVING
    let inFilter = false;
    for (let j = s + 1; j < tokens.length; j++) {
      const t = tokens[j];
      if (t.t === '(') { depth++; continue; }
      if (t.t === ')') { if (depth === 0) { end = j; break; } depth--; continue; }
      if (depth !== 0) continue;
      if (['GROUP', 'ORDER', 'UNION', 'EXCEPT', 'INTERSECT', 'WINDOW'].includes(t.up)) inFilter = false;
      if (inFilter) filters.push(j);
      if (t.up === 'WHERE' || (t.up === 'HAVING' && dialect !== 'mysql')) inFilter = true;
      if (t.up === 'HAVING' && dialect === 'mysql') inFilter = false;
      if (t.up === 'FROM' && from < 0) from = j;
      if (t.up === 'GROUP' && tokens[j + 1] && tokens[j + 1].up === 'BY') group = j + 2;
      if (CLAUSE_END.has(t.up) && group >= 0 && groupEnd < 0) groupEnd = j;
      if (['UNION', 'EXCEPT', 'INTERSECT'].includes(t.up)) { end = j; break; }
    }
    if (groupEnd < 0) groupEnd = end;
    let listStart = s + 1;
    while (tokens[listStart] && ['DISTINCT', 'ALL'].includes(tokens[listStart].up)) listStart++;
    if (tokens[listStart] && tokens[listStart].up === 'TOP') listStart += tokens[listStart + 1] && tokens[listStart + 1].t === '(' ? 4 : 2;
    const rawItems = splitArgs(tokens, listStart, from >= 0 ? from : end);

    // SQL Server works out WHERE and HAVING before SELECT, so a column alias doesn't exist there yet.
    // SQLite would quietly accept it. Real column names are fine, even if an alias shadows them.
    const aliases = new Set(rawItems.map((it) => {
      const kept = stripAlias(it);
      if (kept.length === it.length) return null;
      const a = it[it.length - 1];
      return (a.t === 'ident' ? a.name : a.v).toLowerCase();
    }).filter(Boolean));
    for (const j of filters) {
      const t = tokens[j];
      if (!isWordTok(t) || (tokens[j + 1] && tokens[j + 1].t === '(') || (tokens[j - 1] && tokens[j - 1].v === '.')) continue;
      const name = (t.t === 'ident' ? t.name : t.v).toLowerCase();
      if (aliases.has(name) && !KNOWN_COLUMNS.has(name)) throw aliasError(dialect, t.t === 'ident' ? t.name : t.v);
    }

    const items = rawItems.map(stripAlias);
    const grouped = group >= 0;
    if (!grouped && !items.some(hasAggregate)) continue;
    const loose = dialect !== 'tsql';
    let groupToks = grouped ? splitArgs(tokens, group, groupEnd) : [];
    if (loose) { // GROUP BY 1 or GROUP BY alias means that select item
      const aliasOf = rawItems.map((it, n) => (items[n].length < it.length ? textOf([it[it.length - 1]]) : null));
      groupToks = groupToks.map((g) => {
        if (g.length === 1 && g[0].t === 'num' && items[+g[0].v - 1]) return items[+g[0].v - 1];
        const n = g.length === 1 ? aliasOf.indexOf(textOf(g)) : -1;
        return n >= 0 && !KNOWN_COLUMNS.has(textOf(g)) ? items[n] : g;
      });
    }
    const groupExprs = groupToks.map(textOf);
    const groupNames = new Set(groupExprs.flatMap((g) => [g, lastName(g)]));
    const tables = from >= 0 ? fromTables(tokens, from, end) : {};
    // Tables whose primary key is grouped: every column of theirs is allowed (PostgreSQL and MySQL only).
    const keyed = new Set(loose ? groupExprs.map((g) => {
      const t = tableOf(g, tables);
      return t && PK[t] === lastName(g) ? t : null;
    }).filter(Boolean) : []);
    items.forEach((item, n) => {
      if (!item.length) return;
      if (item.length === 1 && item[0].v === '*') {
        if (dialect === 'tsql') throw new TsqlError("Column '*' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.");
        const all = [...new Set(Object.values(tables))];
        if (all.every((t) => keyed.has(t))) return;
        const t = all.find((x) => !keyed.has(x));
        throw groupingError(dialect, t ? `${t}.${[...TABLE_COLS[t]].find((c) => !groupNames.has(c))}` : '*', n + 1, tables, grouped);
      }
      if (groupExprs.includes(textOf(item))) return;
      for (const col of bareColumns(item)) {
        const c = col.toLowerCase();
        if (groupNames.has(c) || groupNames.has(lastName(c))) continue;
        if (keyed.size && keyed.has(tableOf(c, tables))) continue;
        throw groupingError(dialect, col, n + 1, tables, grouped);
      }
    });
  }
}

function translate(sql) {
  const tokens = tokenize(sql);
  // SSMS scripts open with "USE [Harbour] GO". There is only one database, so drop it.
  if (tokens[0] && tokens[0].up === 'USE') {
    const db = tokens[1];
    if (!db || (db.t === 'ident' ? db.name : db.v).toLowerCase() !== 'harbour') {
      throw new TsqlError(`Database '${db ? (db.t === 'ident' ? db.name : db.v) : ''}' does not exist. Make sure that the name is entered correctly.`);
    }
    tokens.splice(0, 2);
    while (tokens[0] && (tokens[0].v === ';' || tokens[0].up === 'GO')) tokens.shift();
  }
  // Allow one trailing semicolon and a trailing GO, nothing else.
  while (tokens.length && ((tokens.at(-1).t === 'op' && tokens.at(-1).v === ';') || tokens.at(-1).up === 'GO')) tokens.pop();
  if (!tokens.length) throw new TsqlError('Nothing to run yet. Write a SELECT first.');
  if (tokens.some((t) => t.t === 'op' && t.v === ';')) throw new TsqlError('One query at a time, please. Remove the extra statements.');
  if (!(tokens[0].up === 'SELECT' || tokens[0].up === 'WITH')) {
    throw new TsqlError(`Incorrect syntax near '${tokens[0].v}'. Start with SELECT.`);
  }
  checkGrouping(tokens);
  return render(transform(tokens));
}

module.exports = {
  translate, TsqlError, tokenize, render, matchParen, splitArgs, checkGrouping, looksLikeTextConcat, syntaxMsg, BLOCKED, KNOWN_COLUMNS,
};
