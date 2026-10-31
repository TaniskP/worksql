// Runs learner queries in a worker thread so a runaway query can be killed without taking the server down.
const { parentPort } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');
const { build, isoDate } = require('./seed');
const { register } = require('./sqlfuncs');
const { translate, TsqlError } = require('./tsql');

const MAX_ROWS = 1000;
let db = null;
let builtFor = null;

function getDb() {
  const today = isoDate(new Date());
  if (db && builtFor === today) return db;
  if (db) db.close();
  db = new DatabaseSync(':memory:');
  register(db, () => new Date());
  build(db, new Date());
  db.exec('PRAGMA query_only = ON');
  builtFor = today;
  return db;
}

// SQLite messages -> the wording people see in SSMS.
function sqlServerMessage(msg) {
  let m;
  if ((m = msg.match(/no such column: (?:\w+\.)?(.+)/))) return `Invalid column name '${m[1].replace(/"/g, '')}'.`;
  if ((m = msg.match(/no such table: (.+)/))) return `Invalid object name '${m[1]}'.`;
  if ((m = msg.match(/no such function: T_(\w+)/))) return `'${m[1]}' is not a recognized built-in function name.`;
  if ((m = msg.match(/no such function: (\w+)/))) return `'${m[1]}' is not a recognized built-in function name.`;
  if ((m = msg.match(/near "(.+?)": syntax error/))) return `Incorrect syntax near '${m[1].replace(/^T_/, '')}'.`;
  if (/incomplete input/.test(msg)) return 'Incorrect syntax near the end of the query.';
  if ((m = msg.match(/ambiguous column name: (.+)/))) return `Ambiguous column name '${m[1]}'.`;
  if (/misuse of window function/.test(msg)) return 'Windowed functions can only appear in the SELECT or ORDER BY clauses.';
  if (/misuse of aggregate/.test(msg))return 'An aggregate may not appear in the WHERE clause. Use HAVING instead.';
  if (/a GROUP BY clause is required|must appear in the GROUP BY/.test(msg)) return 'Column is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.';
  if (/readonly/.test(msg)) return 'This sandbox is read-only: SELECT queries only.';
  return msg.replace(/T_/g, '');
}

// SQL Server shows "(No column name)" for unaliased expressions.
function displayName(c) {
  if (c.column && c.name === c.column) return c.name;
  return /^[\w ]+$/.test(c.name) && !/\(/.test(c.name) ? c.name : '(No column name)';
}

function run(sql) {
  let translated;
  try {
    translated = translate(sql);
  } catch (e) {
    if (e instanceof TsqlError) return { error: e.message };
    throw e;
  }
  try {
    const stmt = getDb().prepare(translated);
    stmt.setReturnArrays(true);
    const columns = stmt.columns().map(displayName);
    const rows = [];
    for (const row of stmt.iterate()) {
      rows.push(row.map((v) => (typeof v === 'bigint' ? Number(v) : v)));
      if (rows.length > MAX_ROWS) break;
    }
    return { columns, rows: rows.slice(0, MAX_ROWS), truncated: rows.length > MAX_ROWS };
  } catch (e) {
    return { error: sqlServerMessage(e.message) };
  }
}

function preview(table, n) {
  const stmt = getDb().prepare(`SELECT * FROM "${table}" ORDER BY 1 ${table === 'Orders' ? 'DESC' : ''} LIMIT ${n}`);
  stmt.setReturnArrays(true);
  return { columns: stmt.columns().map((c) => c.name), rows: stmt.all() };
}

// SSMS "Parse": check the query compiles without running it.
function parse(sql) {
  try {
    getDb().prepare(translate(sql));
    return { ok: true };
  } catch (e) {
    return { error: e instanceof TsqlError ? e.message : sqlServerMessage(e.message) };
  }
}

function counts() {
  const out = {};
  for (const t of ['Customers', 'Orders', 'OrderLines', 'Products', 'Returns', 'Staff']) {
    out[t] = Number(getDb().prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get().n);
  }
  return out;
}

parentPort.on('message', ({ id, op, sql, table, n }) => {
  try {
    if (op === 'run') parentPort.postMessage({ id, result: run(sql) });
    else if (op === 'parse') parentPort.postMessage({ id, result: parse(sql) });
    else if (op === 'counts') parentPort.postMessage({ id, result: counts() });
    else if (op === 'preview') parentPort.postMessage({ id, result: preview(table, n) });
    else if (op === 'today') { getDb(); parentPort.postMessage({ id, result: builtFor }); }
  } catch (e) {
    parentPort.postMessage({ id, result: { error: e.message } });
  }
});
