// One product, three SQL stacks. Learners pick SQL Server (T-SQL), PostgreSQL or MySQL, and the sandbox
// reads their query the way that stack would: its functions, its quoting, its GROUP BY rule, its errors.
// T-SQL goes through tsql.js. PostgreSQL and MySQL are translated here onto the same sandbox engine.

const {
  translate: translateTsql, TsqlError, tokenize, render, matchParen, splitArgs, checkGrouping, looksLikeTextConcat, syntaxMsg, BLOCKED,
} = require('./tsql');

const DIALECTS = {
  tsql: { label: 'SQL Server (T-SQL)', short: 'SQL Server' },
  postgres: { label: 'PostgreSQL', short: 'PostgreSQL' },
  mysql: { label: 'MySQL', short: 'MySQL' },
};
const DEFAULT_DIALECT = 'tsql';
const dialectOf = (d) => (Object.hasOwn(DIALECTS, String(d)) ? String(d) : DEFAULT_DIALECT);

// ---------- token helpers ----------
const w = (v, fn) => ({ t: 'word', v, up: v.toUpperCase(), fn: !!fn });
const str = (v) => ({ t: 'str', v: `'${String(v).replace(/'/g, "''")}'` });
const open = () => ({ t: '(', v: '(' });
const close = () => ({ t: ')', v: ')' });
const comma = () => ({ t: 'op', v: ',' });
const call = (name, ...args) => [w(name, true), open(), ...args.flatMap((a, i) => (i ? [comma(), ...a] : a)), close()];
const now = () => call('T_GETDATE');
const today = () => call('T_CAST', now(), [str('date')]);
const isOp = (t, v) => t && t.t === 'op' && t.v === v;
const nameOf = (t) => (t.t === 'ident' ? t.name : t.v);

const UNITS = {
  day: 'day', days: 'day', week: 'week', weeks: 'week', month: 'month', months: 'month', mon: 'month', mons: 'month',
  year: 'year', years: 'year', hour: 'hour', hours: 'hour', minute: 'minute', minutes: 'minute', min: 'minute', mins: 'minute',
  second: 'second', seconds: 'second', sec: 'second', secs: 'second', quarter: 'quarter', quarters: 'quarter',
};
const DATE_COLUMNS = new Set(['order_date', 'return_date', 'created_date', 'start date']);

// What a SQL Server habit is called in the other two stacks. Shown under the error.
const HABITS = {
  postgres: {
    GETDATE: 'PostgreSQL uses now() for the time, or CURRENT_DATE for today.',
    SYSDATETIME: 'PostgreSQL uses now() for the time, or CURRENT_DATE for today.',
    ISNULL: "PostgreSQL uses COALESCE(phone, 'No phone').",
    IFNULL: "PostgreSQL uses COALESCE(phone, 'No phone').",
    LEN: 'PostgreSQL uses length().',
    DATEADD: "Add or take away an interval: CURRENT_DATE - INTERVAL '7 days'.",
    DATEDIFF: 'Take one date from another: CURRENT_DATE - order_date gives the number of days.',
    DATEPART: 'PostgreSQL uses EXTRACT(YEAR FROM order_date).',
    DATENAME: "PostgreSQL uses to_char(order_date, 'FMDay') or to_char(order_date, 'FMMonth').",
    DATETRUNC: "PostgreSQL uses date_trunc('month', order_date).",
    YEAR: 'PostgreSQL uses EXTRACT(YEAR FROM order_date).',
    MONTH: 'PostgreSQL uses EXTRACT(MONTH FROM order_date).',
    DAY: 'PostgreSQL uses EXTRACT(DAY FROM order_date).',
    CONVERT: 'PostgreSQL casts with CAST(x AS date) or x::date.',
    FORMAT: "PostgreSQL formats dates with to_char(order_date, 'YYYY-MM').",
    CHARINDEX: "PostgreSQL uses strpos(text, 'x') or position('x' IN text).",
    EOMONTH: "PostgreSQL has no EOMONTH. Use date_trunc('month', d) for the first of the month.",
    IIF: 'PostgreSQL uses CASE WHEN ... THEN ... ELSE ... END.',
    IF: 'PostgreSQL uses CASE WHEN ... THEN ... ELSE ... END.',
    GROUP_CONCAT: "PostgreSQL uses string_agg(x, ', ').",
    DATEFROMPARTS: 'PostgreSQL uses make_date(year, month, day).',
    CURDATE: 'PostgreSQL uses CURRENT_DATE.',
    DATE_ADD: "PostgreSQL adds an interval: order_date + INTERVAL '7 days'.",
    DATE_SUB: "PostgreSQL takes away an interval: CURRENT_DATE - INTERVAL '7 days'.",
    DATE_FORMAT: "PostgreSQL uses to_char(order_date, 'YYYY-MM').",
  },
  mysql: {
    GETDATE: 'MySQL uses NOW() for the time, or CURDATE() for today.',
    SYSDATETIME: 'MySQL uses NOW() for the time, or CURDATE() for today.',
    ISNULL: "MySQL's ISNULL(x) only tests for NULL. Use IFNULL(phone, 'No phone') or COALESCE.",
    LEN: 'MySQL uses CHAR_LENGTH() (or LENGTH() for bytes).',
    DATEADD: 'MySQL uses DATE_SUB(CURDATE(), INTERVAL 7 DAY) or DATE_ADD.',
    DATEPART: 'MySQL uses EXTRACT(YEAR FROM order_date) or YEAR(order_date).',
    DATENAME: 'MySQL uses DAYNAME(order_date) or MONTHNAME(order_date).',
    DATETRUNC: "MySQL has no date_trunc. DATE_FORMAT(order_date, '%Y-%m-01') gives the first of the month.",
    DATE_TRUNC: "MySQL has no date_trunc. DATE_FORMAT(order_date, '%Y-%m-01') gives the first of the month.",
    CHARINDEX: "MySQL uses LOCATE('x', text).",
    EOMONTH: 'MySQL uses LAST_DAY(order_date).',
    IIF: 'MySQL uses IF(condition, a, b) or CASE.',
    STRING_AGG: "MySQL uses GROUP_CONCAT(x SEPARATOR ', ').",
    TO_CHAR: "MySQL uses DATE_FORMAT(order_date, '%Y-%m').",
    DATEFROMPARTS: "MySQL can build a date with STR_TO_DATE, but most reports use DATE_FORMAT instead.",
    STRPOS: "MySQL uses LOCATE('x', text).",
  },
};

// Functions that behave the same in the stack and in the sandbox. Anything not listed, mapped or
// rewritten below is refused with the stack's own "does not exist" error.
const SAME = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'ABS', 'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM', 'REPLACE', 'COALESCE',
  'NULLIF', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'NTILE', 'FIRST_VALUE', 'LAST_VALUE', 'PERCENT_RANK', 'CUME_DIST',
  'LENGTH', 'SUBSTRING', 'SUBSTR', 'CEIL', 'CEILING', 'FLOOR', 'POWER', 'SQRT', 'EXP', 'LN', 'SIGN', 'MOD', 'CONCAT_WS'];
// Keywords that can sit right before a bracket without being a function call.
const PAREN_KEYWORDS = new Set(['EXISTS', 'IN', 'OVER', 'VALUES', 'AND', 'OR', 'NOT', 'AS', 'ON', 'FROM', 'WHERE', 'SELECT', 'USING',
  'THEN', 'ELSE', 'WHEN', 'BY', 'JOIN', 'ALL', 'ANY', 'CASE', 'LIKE', 'BETWEEN', 'DISTINCT', 'IS', 'HAVING', 'LIMIT', 'OFFSET', 'UNION',
  'ASC', 'DESC', 'PARTITION', 'END', 'WITH', 'EXCEPT', 'INTERSECT', 'SOME', 'NULLS', 'LAST', 'FIRST', 'ILIKE']);
const NATIVE = {
  postgres: new Set([...SAME, 'CONCAT', 'REPEAT', 'REVERSE', 'LOG']),
  mysql: new Set([...SAME, 'IFNULL', 'REPEAT', 'REVERSE', 'LOG']),
};
const RENAMED = {
  postgres: { LEFT: 'T_LEFT', RIGHT: 'T_RIGHT', CHAR_LENGTH: 'LENGTH', CHARACTER_LENGTH: 'LENGTH', MAKE_DATE: 'T_DATEFROMPARTS', GREATEST: 'MAX', LEAST: 'MIN' },
  mysql: {
    LEFT: 'T_LEFT', RIGHT: 'T_RIGHT', CHAR_LENGTH: 'LENGTH', CHARACTER_LENGTH: 'LENGTH', CONCAT: 'M_CONCAT', IF: 'IIF',
    YEAR: 'T_YEAR', MONTH: 'T_MONTH', DAY: 'T_DAY', DAYOFMONTH: 'T_DAY', LAST_DAY: 'T_EOMONTH', DATE_FORMAT: 'M_DATE_FORMAT',
    GREATEST: 'MAX', LEAST: 'MIN',
  },
};

function noSuchFunction(dialect, name, argc) {
  const lc = name.toLowerCase();
  const msg = dialect === 'postgres' ? `function ${lc}(${argc ? '...' : ''}) does not exist` : `FUNCTION harbour.${lc} does not exist`;
  return new TsqlError(msg, HABITS[dialect][name.toUpperCase()]
    || (dialect === 'postgres' ? 'No function matches the given name and argument types.' : 'Check the function name for MySQL.'));
}

// ---------- operands ----------

// Start index of the operand that ends at out[end - 1]: a value, a name, a (group) or a call.
function operandStart(out, end) {
  let i = end - 1;
  if (i < 0) return -1;
  if (out[i].t === ')') {
    let depth = 0;
    for (; i >= 0; i--) {
      if (out[i].t === ')') depth++;
      else if (out[i].t === '(' && --depth === 0) break;
    }
    if (i > 0 && out[i - 1].t === 'word' && out[i - 1].fn) i--;
  } else if (!['word', 'ident', 'num', 'str'].includes(out[i].t)) return -1;
  while (i >= 2 && isOp(out[i - 1], '.') && ['word', 'ident'].includes(out[i - 2].t)) i -= 2;
  return i;
}

// End index (exclusive) of the operand that starts at out[start].
function operandEnd(out, start) {
  const t = out[start];
  if (!t) return -1;
  if (t.t === '(') return matchParen(out, start) + 1;
  if (t.t === 'word' && out[start + 1] && out[start + 1].t === '(') return matchParen(out, start + 1) + 1;
  if (!['word', 'ident', 'num', 'str'].includes(t.t)) return -1;
  let j = start + 1;
  while (isOp(out[j], '.') && out[j + 1] && ['word', 'ident'].includes(out[j + 1].t)) j += 2;
  return j;
}

function popOperand(out, what) {
  const i = operandStart(out, out.length);
  if (i < 0) throw new TsqlError(syntaxMsg(what));
  return out.splice(i);
}

// Is this operand a date? Date columns, CURRENT_DATE, ::date, date_trunc and date arithmetic all count.
function isDateOperand(toks) {
  if (!toks.length) return false;
  const first = toks[0];
  if (toks.length === 1 || (toks.length === 3 && isOp(toks[1], '.'))) {
    const last = toks[toks.length - 1];
    return (last.t === 'word' || last.t === 'ident') && DATE_COLUMNS.has(nameOf(last).toLowerCase());
  }
  if (first.v === 'T_CAST') return toks[toks.length - 2] && toks[toks.length - 2].v === "'date'";
  return ['T_DATEADD', 'P_DATE_TRUNC', 'T_DATEFROMPARTS', 'T_EOMONTH'].includes(first.v);
}

// ---------- intervals ----------

// INTERVAL '7 days' (PostgreSQL) or INTERVAL 7 DAY (MySQL), starting at tokens[k].
// Returns { amount: tokens, unit, next: index after the interval }.
function readInterval(tokens, k, dialect) {
  const a = tokens[k + 1];
  if (dialect === 'postgres') {
    if (!a || a.t !== 'str') throw new TsqlError(syntaxMsg(a ? a.v : null), "Write intervals like INTERVAL '7 days'.");
    const m = a.v.slice(1, -1).trim().match(/^(-?\d+)\s*([a-z]+)?$/i);
    const unitWord = m && m[2] ? m[2] : tokens[k + 2] && tokens[k + 2].t === 'word' ? tokens[k + 2].v : null;
    const unit = unitWord && UNITS[unitWord.toLowerCase()];
    if (!m || !unit) throw new TsqlError(`invalid input syntax for type interval: ${a.v}`, "This sandbox reads intervals like INTERVAL '7 days' or INTERVAL '1 month'.");
    return { amount: [{ t: 'num', v: m[1] }], unit, next: k + (m[2] ? 2 : 3) };
  }
  // MySQL: INTERVAL <expr> <UNIT>
  let j = k + 1;
  const amount = [];
  if (isOp(tokens[j], '-') || isOp(tokens[j], '+')) amount.push(tokens[j++]);
  const t = tokens[j];
  if (!t) throw new TsqlError(syntaxMsg(null));
  if (t.t === '(') { const c = matchParen(tokens, j); amount.push(...tokens.slice(j, c + 1)); j = c + 1; }
  else if (t.t === 'num' || t.t === 'str') { amount.push(t.t === 'str' ? { t: 'num', v: String(parseInt(t.v.slice(1), 10)) } : t); j++; }
  else throw new TsqlError(syntaxMsg(t.v), 'Write intervals like INTERVAL 7 DAY.');
  const u = tokens[j];
  const unit = u && u.t === 'word' && UNITS[u.v.toLowerCase()];
  if (!unit) throw new TsqlError(syntaxMsg(u ? u.v : null), 'Write intervals like INTERVAL 7 DAY or INTERVAL 1 MONTH.');
  return { amount, unit, next: j + 1 };
}

const dateAdd = (unit, amount, negate, base) => call('T_DATEADD', [str(unit)],
  negate ? [{ t: 'op', v: '-' }, open(), ...amount, close()] : amount, base);

// ---------- the PostgreSQL / MySQL translator ----------

function transform(tokens, dialect) {
  const out = [];
  const pg = dialect === 'postgres';
  const sub = (toks) => transform(toks, dialect);

  for (let k = 0; k < tokens.length; k++) {
    const tk = tokens[k];
    const next = tokens[k + 1];
    const prev = tokens[k - 1];

    if (tk.t === 'word' && BLOCKED.has(tk.up)) {
      throw new TsqlError(`${tk.up} is switched off here. This sandbox is read-only: SELECT queries only.`);
    }

    // Schema prefixes: public.orders (PostgreSQL), harbour.Orders (MySQL). dbo is SQL Server's.
    if ((tk.t === 'word' || tk.t === 'ident') && isOp(next, '.')) {
      const n = nameOf(tk).toLowerCase();
      if ((pg && n === 'public') || (!pg && n === 'harbour')) { k++; continue; }
      if (n === 'dbo' || (pg && n === 'harbour')) {
        const table = tokens[k + 2] ? nameOf(tokens[k + 2]) : '';
        throw new TsqlError(pg ? `relation "${n}.${table.toLowerCase()}" does not exist` : `Table 'dbo.${table}' doesn't exist`,
          `Drop the "${n}." prefix. In ${DIALECTS[dialect].short} the tables are just Orders, Customers and so on.`);
      }
    }

    if (tk.t === 'word' && tk.up === 'TOP' && prev && ['SELECT', 'DISTINCT'].includes(prev.up)) {
      throw new TsqlError(syntaxMsg(next ? next.v : null), `TOP is SQL Server only. In ${DIALECTS[dialect].short}, put LIMIT ${next && next.t === 'num' ? next.v : 'n'} at the end of the query.`);
    }

    // PostgreSQL: FETCH FIRST 5 ROWS ONLY -> LIMIT 5
    if (pg && tk.up === 'FETCH' && next && ['FIRST', 'NEXT'].includes(next.up)) {
      const n = tokens[k + 2] && tokens[k + 2].t === 'num' ? tokens[k + 2] : { t: 'num', v: '1' };
      let j = k + 2 + (tokens[k + 2] && tokens[k + 2].t === 'num' ? 1 : 0);
      if (tokens[j] && ['ROW', 'ROWS'].includes(tokens[j].up)) j++;
      if (!tokens[j] || tokens[j].up !== 'ONLY') throw new TsqlError(syntaxMsg(tokens[j] ? tokens[j].v : null));
      out.push(w('LIMIT'), n); k = j; continue;
    }

    // Postfix cast: x::date, '7 days'::interval
    if (tk.t === 'op' && tk.v === '::') {
      if (!pg) throw new TsqlError(syntaxMsg('::'), 'The :: cast is PostgreSQL. MySQL uses CAST(x AS DATE).');
      let j = k + 1;
      if (!tokens[j] || tokens[j].t !== 'word') throw new TsqlError(syntaxMsg(tokens[j] ? tokens[j].v : null));
      const typeToks = [tokens[j]];
      while (tokens[j + 1] && tokens[j + 1].t === 'word' && /^(PRECISION|VARYING|WITHOUT|WITH|TIME|ZONE)$/.test(tokens[j + 1].up)) typeToks.push(tokens[++j]);
      if (tokens[j + 1] && tokens[j + 1].t === '(') { const c = matchParen(tokens, j + 1); typeToks.push(...tokens.slice(j + 1, c + 1)); j = c; }
      const type = typeToks.map((t) => t.v).join('').toLowerCase();
      const operand = popOperand(out, '::');
      if (type === 'interval') {
        if (operand.length !== 1 || operand[0].t !== 'str') throw new TsqlError('This sandbox reads intervals written like INTERVAL \'7 days\'.');
        const iv = readInterval([{ t: 'word', up: 'INTERVAL' }, operand[0]], 0, dialect);
        applyInterval(out, iv);
      } else {
        out.push(...call('T_CAST', operand, [str(type)]));
      }
      k = j; continue;
    }

    if (tk.t === 'word' && tk.up === 'INTERVAL') {
      const iv = readInterval(tokens, k, dialect);
      applyInterval(out, { ...iv, amount: sub(iv.amount) });
      k = iv.next - 1; continue;
    }

    if (tk.t === 'word' && tk.up === 'ILIKE') {
      if (!pg) throw new TsqlError(syntaxMsg('ILIKE'), 'ILIKE is PostgreSQL. MySQL’s LIKE already ignores case on these tables.');
      out.push(w('LIKE')); continue;
    }

    if (tk.t === 'op' && tk.v === '||' && !pg) {
      throw new TsqlError("WorkSQL: in MySQL, || means OR, so this would give 0 or 1, not joined text.", "Join text with CONCAT(first_name, ' ', last_name).");
    }

    // 'a' + col: SQL Server joins text with +. These two don't.
    if (isOp(tk, '+') && ((prev && prev.t === 'str') || (next && next.t === 'str') || looksLikeTextConcat(tokens, k))) {
      if (pg) throw new TsqlError('operator does not exist: text + unknown', "Join text with || or concat(): first_name || ' ' || last_name.");
      throw new TsqlError("WorkSQL: in MySQL, + only adds numbers, so this text would turn into 0.", "Join text with CONCAT(first_name, ' ', last_name).");
    }

    // MySQL: / always gives a decimal, even for two whole numbers.
    if (!pg && isOp(tk, '/')) { out.push({ t: 'op', v: '*' }, { t: 'num', v: '1.0' }, tk); continue; }
    if (!pg && tk.t === 'word' && tk.up === 'DIV') { out.push({ t: 'op', v: '/' }); continue; }

    // Words that are values without brackets.
    if (tk.t === 'word' && !(next && next.t === '(')) {
      if (tk.up === 'CURRENT_DATE') { out.push(...today()); continue; }
      if (['CURRENT_TIMESTAMP', 'LOCALTIMESTAMP', 'LOCALTIME'].includes(tk.up)) { out.push(...now()); continue; }
      // PostgreSQL folds unquoted aliases to lower case.
      if (pg && prev && prev.up === 'AS' && !(next && next.t === '(')) { out.push({ ...tk, v: tk.v.toLowerCase(), up: tk.up }); continue; }
    }

    if (tk.t === 'word' && next && next.t === '(') {
      const c = matchParen(tokens, k + 1);
      const inner = tokens.slice(k + 2, c);
      const args = inner.length ? splitArgs(tokens, k + 2, c) : [];
      const name = tk.up;
      const done = (toks) => { out.push(...toks); k = c; };

      if (name === 'CAST') {
        let depth = 0; let asAt = -1;
        inner.forEach((t, j) => { if (t.t === '(') depth++; if (t.t === ')') depth--; if (depth === 0 && t.up === 'AS') asAt = j; });
        if (asAt === -1) throw new TsqlError(syntaxMsg(')'), 'It looks like CAST(value AS date).');
        done(call('T_CAST', sub(inner.slice(0, asAt)), [str(inner.slice(asAt + 1).map((t) => t.v).join('').toLowerCase())]));
        continue;
      }
      if (name === 'EXTRACT' || (pg && name === 'DATE_PART')) {
        let part; let expr;
        if (name === 'EXTRACT') {
          if (!inner[0] || !inner[1] || inner[1].up !== 'FROM') throw new TsqlError(syntaxMsg(inner[1] ? inner[1].v : ')'), 'It looks like EXTRACT(YEAR FROM order_date).');
          part = inner[0].t === 'str' ? inner[0].v.slice(1, -1) : inner[0].v; expr = inner.slice(2);
        } else {
          if (args.length !== 2 || args[0].length !== 1 || args[0][0].t !== 'str') throw noSuchFunction(dialect, 'date_part', args.length);
          part = args[0][0].v.slice(1, -1); expr = args[1];
        }
        done(call('P_EXTRACT', [str(part.toLowerCase())], sub(expr)));
        continue;
      }
      if (['NOW', 'SYSDATE', 'LOCALTIMESTAMP', 'CURRENT_TIMESTAMP', 'LOCALTIME'].includes(name) && (name === 'NOW' || !pg)) {
        if (args.length) throw noSuchFunction(dialect, name, args.length);
        done(now()); continue;
      }
      if (!pg && ['CURDATE', 'CURRENT_DATE'].includes(name)) { done(today()); continue; }
      if (name === 'DATE' && args.length === 1) { done(call('T_CAST', sub(args[0]), [str('date')])); continue; }

      if (pg) {
        if (name === 'DATE_TRUNC' && args.length === 2) { done(call('P_DATE_TRUNC', sub(args[0]), sub(args[1]))); continue; }
        if (name === 'TO_CHAR' && args.length === 2) { done(call('P_TO_CHAR', sub(args[0]), sub(args[1]))); continue; }
        if (name === 'STRPOS' && args.length === 2) { done(call('INSTR', sub(args[0]), sub(args[1]))); continue; }
        if (name === 'POSITION') {
          const at = inner.findIndex((t) => t.up === 'IN');
          if (at < 0) throw new TsqlError(syntaxMsg(')'));
          done(call('INSTR', sub(inner.slice(at + 1)), sub(inner.slice(0, at)))); continue;
        }
        if (name === 'STRING_AGG' && args.length === 2) {
          if (args[1].some((t) => t.up === 'ORDER')) throw new TsqlError('string_agg(... ORDER BY ...) is not supported in this sandbox yet.', 'Leave the ORDER BY out of string_agg.');
          done(call('GROUP_CONCAT', sub(args[0]), sub(args[1]))); continue;
        }
      } else {
        if ((name === 'DATE_ADD' || name === 'DATE_SUB' || name === 'ADDDATE' || name === 'SUBDATE') && args.length === 2) {
          const neg = name === 'DATE_SUB' || name === 'SUBDATE';
          if (args[1][0] && args[1][0].up === 'INTERVAL') {
            const iv = readInterval(args[1], 0, dialect);
            done(dateAdd(iv.unit, sub(iv.amount), neg, sub(args[0])));
          } else {
            done(dateAdd('day', sub(args[1]), neg, sub(args[0])));
          }
          continue;
        }
        if (name === 'DATEDIFF') {
          if (args.length !== 2) throw new TsqlError("Incorrect parameter count in the call to native function 'DATEDIFF'", "MySQL's DATEDIFF takes two dates, later one first: DATEDIFF(CURDATE(), order_date).");
          done(call('T_DATEDIFF', [str('day')], sub(args[1]), sub(args[0]))); continue;
        }
        if (name === 'TIMESTAMPDIFF' && args.length === 3 && args[0].length === 1 && UNITS[args[0][0].v.toLowerCase()]) {
          done(call('T_DATEDIFF', [str(UNITS[args[0][0].v.toLowerCase()])], sub(args[1]), sub(args[2]))); continue;
        }
        if (name === 'CONVERT') {
          if (args.length !== 2) throw new TsqlError(syntaxMsg(')'), 'MySQL’s CONVERT is CONVERT(value, DATE).');
          done(call('T_CAST', sub(args[0]), [str(args[1].map((t) => t.v).join('').toLowerCase())])); continue;
        }
        if (name === 'ISNULL') {
          if (args.length !== 1) throw new TsqlError("Incorrect parameter count in the call to native function 'ISNULL'", HABITS.mysql.ISNULL);
          done([open(), ...sub(args[0]), w('IS'), w('NULL'), close()]); continue;
        }
        if (name === 'LOCATE' && args.length === 2) { done(call('T_CHARINDEX', sub(args[0]), sub(args[1]))); continue; }
        if (name === 'INSTR' && args.length === 2) { done(call('T_CHARINDEX', sub(args[1]), sub(args[0]))); continue; }
        if (name === 'DAYNAME' && args.length === 1) { done(call('T_DATENAME', [str('weekday')], sub(args[0]))); continue; }
        if (name === 'MONTHNAME' && args.length === 1) { done(call('T_DATENAME', [str('month')], sub(args[0]))); continue; }
        if (name === 'DAYOFWEEK' && args.length === 1) { done(call('T_DATEPART', [str('weekday')], sub(args[0]))); continue; }
        if (name === 'FORMAT' && args.length === 2 && args[1].length === 1 && args[1][0].t === 'num') {
          done(call('T_FORMAT', sub(args[0]), [str('N' + args[1][0].v)])); continue;
        }
        if (name === 'GROUP_CONCAT') {
          if (inner.some((t) => t.up === 'ORDER')) throw new TsqlError('GROUP_CONCAT(... ORDER BY ...) is not supported in this sandbox yet.', 'Leave the ORDER BY out of GROUP_CONCAT.');
          const sep = inner.findIndex((t) => t.up === 'SEPARATOR');
          done(sep >= 0 ? call('GROUP_CONCAT', sub(inner.slice(0, sep)), sub(inner.slice(sep + 1))) : call('GROUP_CONCAT', sub(inner), [str(',')]));
          continue;
        }
      }

      if (RENAMED[dialect][name]) { done(call(RENAMED[dialect][name], ...args.map(sub))); continue; }
      if (NATIVE[dialect].has(name)) { out.push({ ...tk, fn: true }); continue; }
      if (PAREN_KEYWORDS.has(name)) { out.push(tk); continue; }
      throw noSuchFunction(dialect, tk.v, args.length);
    }

    out.push(tk);
  }
  return out;
}

// date +/- interval: take the operand already written on the left.
function applyInterval(out, iv) {
  const op = out[out.length - 1];
  if (!isOp(op, '+') && !isOp(op, '-')) {
    throw new TsqlError('WorkSQL: intervals work here as a date plus or minus an interval.', "Write it like CURRENT_DATE - INTERVAL '7 days'.");
  }
  out.pop();
  const base = popOperand(out, op.v);
  out.push(...dateAdd(iv.unit, iv.amount, op.v === '-', base));
}

// PostgreSQL: date - 7 is a date, date - date is a number of days.
function pgDateMath(out) {
  for (let i = 1; i < out.length; i++) {
    const op = out[i];
    if (!isOp(op, '-') && !isOp(op, '+')) continue;
    const ls = operandStart(out, i);
    if (ls < 0) continue;
    const left = out.slice(ls, i);
    if (!isDateOperand(left)) continue;
    const re = operandEnd(out, i + 1);
    if (re < 0) continue;
    const right = out.slice(i + 1, re);
    let repl = null;
    if (right.length === 1 && right[0].t === 'num') repl = dateAdd('day', right, op.v === '-', left);
    else if (op.v === '-' && isDateOperand(right)) repl = call('T_DATEDIFF', [str('day')], right, left);
    if (!repl) continue;
    out.splice(ls, re - ls, ...repl);
    i = ls;
  }
  return out;
}

// PostgreSQL sorts NULLs last going up and first going down. The sandbox does the opposite, so say it.
function pgNullOrder(out) {
  const res = [];
  for (let i = 0; i < out.length; i++) {
    res.push(out[i]);
    if (!(out[i].up === 'ORDER' && out[i + 1] && out[i + 1].up === 'BY')) continue;
    res.push(out[++i]);
    let depth = 0; let item = [];
    const flush = () => {
      if (!item.length) return;
      const has = item.some((t) => t.up === 'NULLS');
      res.push(...item);
      if (!has) res.push(w('NULLS'), w(item[item.length - 1].up === 'DESC' ? 'FIRST' : 'LAST'));
      item = [];
    };
    for (i++; i < out.length; i++) {
      const t = out[i];
      if (t.t === '(') depth++;
      if (t.t === ')') { if (depth === 0) break; depth--; }
      if (depth === 0 && (['LIMIT', 'OFFSET', 'FETCH', 'ROWS', 'RANGE', 'GROUPS', 'UNION', 'EXCEPT', 'INTERSECT'].includes(t.up))) break;
      if (depth === 0 && isOp(t, ',')) { flush(); res.push(t); continue; }
      item.push(t);
    }
    flush();
    i--;
  }
  return res;
}

// PostgreSQL compares text case-sensitively: 'processing' does not match 'Processing'.
function pgCaseSensitive(out) {
  const cmp = new Set(['=', '<>', '!=', '<', '>', '<=', '>=']);
  const res = [];
  let inList = 0;
  for (let i = 0; i < out.length; i++) {
    const t = out[i];
    if (t.up === 'IN' && out[i + 1] && out[i + 1].t === '(' && out[i + 2] && out[i + 2].t === 'str') inList = 1;
    else if (inList && t.t === '(') inList++;
    else if (inList && t.t === ')') { inList--; if (inList === 1) inList = 0; }
    res.push(t);
    if (t.t === 'str' && (inList === 2 || cmp.has(out[i - 1] && out[i - 1].v) || cmp.has(out[i + 1] && out[i + 1].v))) {
      res.push(w('COLLATE'), w('BINARY'));
    }
  }
  return res;
}

function translateStd(sql, dialect) {
  const tokens = tokenize(sql, dialect);
  if (tokens[0] && tokens[0].up === 'USE') {
    const db = tokens[1];
    const name = db ? nameOf(db) : '';
    if (dialect === 'postgres') throw new TsqlError(syntaxMsg('USE'), 'PostgreSQL has no USE. You are already connected to the harbour database.');
    if (name.toLowerCase() !== 'harbour') throw new TsqlError(`Unknown database '${name}'`);
    tokens.splice(0, 2);
    while (tokens[0] && isOp(tokens[0], ';')) tokens.shift();
  }
  while (tokens.length && isOp(tokens.at(-1), ';')) tokens.pop();
  if (!tokens.length) throw new TsqlError('Nothing to run yet. Write a SELECT first.');
  if (tokens.some((t) => isOp(t, ';'))) throw new TsqlError('One query at a time, please. Remove the extra statements.');
  if (tokens.some((t) => t.up === 'GO')) throw new TsqlError(syntaxMsg('GO'), 'GO is an SSMS batch separator. Leave it out here.');
  if (!(tokens[0].up === 'SELECT' || tokens[0].up === 'WITH')) throw new TsqlError(syntaxMsg(tokens[0].v), 'Start with SELECT.');
  checkGrouping(tokens, dialect);
  let out = transform(tokens, dialect);
  if (dialect === 'postgres') out = pgCaseSensitive(pgNullOrder(pgDateMath(out)));
  return render(out);
}

// SQL Server habits that the sandbox engine would quietly accept but SQL Server refuses.
const SQLITE_ONLY_IN_TSQL = new Set(['IFNULL', 'GROUP_CONCAT', 'INSTR', 'STRFTIME', 'JULIANDAY', 'DATETIME', 'DATE', 'SUBSTR', 'LENGTH',
  'PRINTF', 'TOTAL', 'TYPEOF', 'NOW', 'CURDATE', 'DATE_TRUNC', 'TO_CHAR', 'DATE_FORMAT', 'DATE_ADD', 'DATE_SUB', 'EXTRACT', 'MAKE_DATE', 'STRPOS']);
const TSQL_HABITS = {
  IFNULL: "SQL Server uses ISNULL(phone, 'No phone') or COALESCE.", LENGTH: 'SQL Server uses LEN().', SUBSTR: 'SQL Server uses SUBSTRING().',
  NOW: 'SQL Server uses GETDATE().', CURDATE: 'SQL Server uses CAST(GETDATE() AS date).', DATE_TRUNC: 'SQL Server 2022 uses DATETRUNC(month, d).',
  TO_CHAR: "SQL Server uses FORMAT(d, 'yyyy-MM') or CONVERT(char(7), d, 120).", DATE_FORMAT: "SQL Server uses FORMAT(d, 'yyyy-MM').",
  DATE_ADD: 'SQL Server uses DATEADD(day, -7, d).', DATE_SUB: 'SQL Server uses DATEADD(day, -7, d).', GROUP_CONCAT: "SQL Server uses STRING_AGG(x, ', ').",
  EXTRACT: 'SQL Server uses DATEPART(year, d) or YEAR(d).', DATE: 'SQL Server uses CAST(x AS date).', INSTR: "SQL Server uses CHARINDEX('x', text).",
  MAKE_DATE: 'SQL Server uses DATEFROMPARTS(y, m, d).', STRPOS: "SQL Server uses CHARINDEX('x', text).",
};

function translateTsqlStrict(sql) {
  const tokens = tokenize(sql, 'tsql');
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    const next = tokens[k + 1];
    if (t.t === 'word' && t.up === 'LIMIT' && next && (next.t === 'num' || next.t === '(')) {
      throw new TsqlError(syntaxMsg('LIMIT', 'tsql'), `LIMIT is PostgreSQL and MySQL. SQL Server puts TOP straight after SELECT: SELECT TOP ${next.t === 'num' ? next.v : 'n'} ...`);
    }
    if (isOp(t, '||')) throw new TsqlError(syntaxMsg('|', 'tsql'), "SQL Server joins text with +: first_name + ' ' + last_name.");
    if (isOp(t, '::')) throw new TsqlError(syntaxMsg(':', 'tsql'), 'The :: cast is PostgreSQL. SQL Server uses CAST(x AS date).');
    if (t.t === 'word' && t.up === 'ILIKE') throw new TsqlError(syntaxMsg('ILIKE', 'tsql'), 'ILIKE is PostgreSQL. SQL Server’s LIKE already ignores case here.');
    if (t.t === 'word' && t.up === 'INTERVAL') throw new TsqlError(syntaxMsg('INTERVAL', 'tsql'), 'SQL Server uses DATEADD(day, -7, d), not INTERVAL.');
    if (t.t === 'word' && next && next.t === '(' && SQLITE_ONLY_IN_TSQL.has(t.up) && !(tokens[k - 1] && isOp(tokens[k - 1], '.'))) {
      throw new TsqlError(`'${t.v}' is not a recognized built-in function name.`, TSQL_HABITS[t.up]);
    }
  }
  return translateTsql(sql);
}

function translate(sql, dialect = DEFAULT_DIALECT) {
  const d = dialectOf(dialect);
  return d === 'tsql' ? translateTsqlStrict(sql) : translateStd(sql, d);
}

// Engine messages -> the wording each stack shows.
function engineMessage(msg, dialect, sql = '') {
  let m;
  const d = dialectOf(dialect);
  const fn = (name) => name.replace(/^(T_|P_|M_)/, '');
  if (d === 'tsql') {
    if ((m = msg.match(/no such column: (?:\w+\.)?(.+)/))) return `Invalid column name '${m[1].replace(/"/g, '')}'.`;
    if ((m = msg.match(/no such table: (.+)/))) return `Invalid object name '${m[1]}'.`;
    if ((m = msg.match(/no such function: (\w+)/))) return `'${fn(m[1])}' is not a recognized built-in function name.`;
    if ((m = msg.match(/near "(.+?)": syntax error/))) return `Incorrect syntax near '${fn(m[1])}'.`;
    if (/incomplete input/.test(msg)) return 'Incorrect syntax near the end of the query.';
    if ((m = msg.match(/ambiguous column name: (.+)/))) return `Ambiguous column name '${m[1]}'.`;
    if (/misuse of window function/.test(msg)) return 'Windowed functions can only appear in the SELECT or ORDER BY clauses.';
    if (/misuse of aggregate/.test(msg)) return 'An aggregate may not appear in the WHERE clause. Use HAVING instead.';
    if (/a GROUP BY clause is required|must appear in the GROUP BY/.test(msg)) return 'Column is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.';
    if (/readonly/.test(msg)) return 'This sandbox is read-only: SELECT queries only.';
    return msg.replace(/\b[TPM]_/g, '');
  }
  if (d === 'postgres') {
    if ((m = msg.match(/no such column: (.+)/))) {
      const col = m[1].replace(/"/g, '');
      return col.includes('.') ? `column ${col} does not exist` : `column "${col.toLowerCase()}" does not exist`;
    }
    if ((m = msg.match(/no such table: (.+)/))) return `relation "${m[1].toLowerCase()}" does not exist`;
    if ((m = msg.match(/no such function: (\w+)/))) return `function ${fn(m[1]).toLowerCase()}() does not exist`;
    if ((m = msg.match(/near "(.+?)": syntax error/))) return `syntax error at or near "${fn(m[1])}"`;
    if (/incomplete input/.test(msg)) return 'syntax error at end of input';
    if ((m = msg.match(/ambiguous column name: (.+)/))) return `column reference "${m[1]}" is ambiguous`;
    if (/misuse of window function/.test(msg)) return 'window functions are not allowed in WHERE';
    if (/misuse of aggregate/.test(msg)) return 'aggregate functions are not allowed in WHERE';
    if (/readonly/.test(msg)) return 'cannot execute this in a read-only transaction';
    return msg.replace(/\b[TPM]_/g, '');
  }
  if ((m = msg.match(/no such column: (.+)/))) {
    const col = m[1].replace(/"/g, '');
    return `Unknown column '${col}' in '${mysqlClause(sql, col.split('.').pop())}'`;
  }
  if ((m = msg.match(/no such table: (.+)/))) return `Table 'harbour.${m[1]}' doesn't exist`;
  if ((m = msg.match(/no such function: (\w+)/))) return `FUNCTION harbour.${fn(m[1]).toLowerCase()} does not exist`;
  if ((m = msg.match(/near "(.+?)": syntax error/))) return syntaxMsg(fn(m[1]), 'mysql');
  if (/incomplete input/.test(msg)) return syntaxMsg('', 'mysql');
  if ((m = msg.match(/ambiguous column name: (.+)/))) return `Column '${m[1]}' in field list is ambiguous`;
  if (/misuse of (aggregate|window)/.test(msg)) return 'Invalid use of group function';
  if (/readonly/.test(msg)) return 'Cannot execute statement in a READ ONLY transaction.';
  return msg.replace(/\b[TPM]_/g, '');
}

// MySQL names the clause an unknown column was found in.
function mysqlClause(sql, col) {
  const clean = String(sql).replace(/'(?:[^']|'')*'/g, "''");
  const at = clean.search(new RegExp(`\\b${col.replace(/[^\w ]/g, '')}\\b`, 'i'));
  const before = at < 0 ? clean : clean.slice(0, at);
  const kws = [...before.matchAll(/\b(SELECT|FROM|WHERE|ON|GROUP\s+BY|HAVING|ORDER\s+BY)\b/gi)];
  const last = kws.length ? kws[kws.length - 1][1].toUpperCase().replace(/\s+/, ' ') : 'SELECT';
  return { SELECT: 'field list', FROM: 'from clause', WHERE: 'where clause', ON: 'on clause', 'GROUP BY': 'group statement', HAVING: 'having clause', 'ORDER BY': 'order clause' }[last];
}

// Column header for an expression with no alias, as each stack shows it.
function unnamedHeader(name, dialect) {
  if (dialect === 'tsql') return '(No column name)';
  if (dialect === 'postgres') {
    const f = name.match(/^([A-Za-z_]+)\s*\(/);
    if (!f) return '?column?';
    const n = f[1].replace(/^(T_|P_|M_)/, '').toLowerCase();
    return { getdate: 'now', cast: name.match(/'([a-z]+)[^']*'\s*\)$/)?.[1] || 'cast', group_concat: 'string_agg', extract: 'extract', date_trunc: 'date_trunc', to_char: 'to_char', dateadd: '?column?' }[n] || n;
  }
  return name.replace(/\b[TPM]_/g, '');
}

module.exports = { DIALECTS, DEFAULT_DIALECT, dialectOf, translate, engineMessage, unnamedHeader, TsqlError };
