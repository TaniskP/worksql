// Compares a learner's result with the expected result and explains the difference like a colleague would.
// Strict on purpose: same columns, same names, same order of columns, same rows, and a real ORDER BY
// when the task asks for one. A near-miss does not get a green tick.

function norm(v) {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number' || typeof v === 'bigint') return String(Math.round(Number(v) * 100) / 100);
  const s = String(v);
  const date = s.match(/^(\d{4}-\d{2}-\d{2})(?: 00:00:00(?:\.0+)?)?$/);
  if (date) return date[1];
  if (/^-?\d+(\.\d+)?$/.test(s)) return String(Math.round(Number(s) * 100) / 100);
  return s;
}

const key = (row) => row.map(norm).join('␟');
const lc = (s) => String(s).toLowerCase();
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const list = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// Rows (by index) in a that have no partner in b.
function multisetDiff(a, b) {
  const counts = new Map();
  for (const r of b) counts.set(key(r), (counts.get(key(r)) || 0) + 1);
  const left = [];
  a.forEach((r, i) => {
    const k = key(r);
    if (counts.get(k)) counts.set(k, counts.get(k) - 1);
    else left.push(i);
  });
  return left;
}

const sameRows = (a, b) => !multisetDiff(a, b).length && !multisetDiff(b, a).length;
const fail = (headline, detail, extraRows = []) => ({ pass: false, headline, detail, extraRows });

function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'(?:[^']|'')*'/g, "''");
}

function checkColumns(user, expected, sql) {
  const uc = user.columns.map(lc);
  const ec = expected.columns.map(lc);
  if (uc.join('|') === ec.join('|')) return null;

  const want = list(expected.columns);
  const missing = expected.columns.filter((c) => !uc.includes(lc(c)));
  const extra = user.columns.filter((c) => !ec.includes(lc(c)));

  if (/select\s+(distinct\s+)?(top\s*\(?\s*\d+\s*\)?\s+)?\*/i.test(stripComments(sql)) && !missing.length) {
    return fail(`I only asked for ${expected.columns.length} column${expected.columns.length === 1 ? '' : 's'}.`, `Swap the * for ${want}.`);
  }
  if (!missing.length && extra.length) {
    return fail(`Drop ${list(extra)}. Nobody asked for ${extra.length === 1 ? 'it' : 'them'}.`, `Just ${want}.`);
  }
  if (!missing.length && !extra.length) {
    return fail('Right columns, wrong order.', `${want}, in that order. It gets pasted into the same template every week.`);
  }
  if (user.columns.length === expected.columns.length) {
    // Same shape: if the values line up, it is only the headers that are wrong.
    if (sameRows(user.rows, expected.rows)) {
      const pairs = user.columns.map((c, i) => [c, expected.columns[i]]).filter(([a, b]) => lc(a) !== lc(b));
      const fix = pairs.map(([a, b]) => (a === '(No column name)' || a === '?column?' ?`the unnamed column should be ${b}` : `${a} should be called ${b}`));
      return fail('Numbers are right. Headers aren’t.', `Name them with AS: ${fix.join('; ')}.`);
    }
  }
  if (missing.length) {
    return fail(`You’ve missed ${list(missing)}.`, `I need ${want}.${extra.length ? ` Drop ${list(extra)}.` : ''}`);
  }
  return fail('Wrong columns.', `I need ${want}.`);
}

// A column name with a space, quoted the way the stack quotes it.
function quoteName(c, dialect) {
  if (!/\s/.test(c)) return c;
  if (dialect === 'postgres') return `"${c}"`;
  if (dialect === 'mysql') return '`' + c + '`';
  return `[${c}]`;
}

function check(spec, user, expected, { today, sql, dialect = 'tsql' }) {
  const colIssue = checkColumns(user, expected, sql);
  if (colIssue) return colIssue;

  const rowsLine = user.rows.length === expected.rows.length ? ''
    : `You’ve got ${plural(user.rows.length, 'row')}. Should be ${expected.rows.length}.`;
  const extraIdx = multisetDiff(user.rows, expected.rows);
  const missingIdx = multisetDiff(expected.rows, user.rows);

  if (!extraIdx.length && !missingIdx.length) {
    if (spec.orderBy) {
      const o = spec.orderBy[0];
      const sortText = `ORDER BY ${spec.orderBy.map((x) => quoteName(x.col, dialect) +(x.desc ? ' DESC' : '')).join(', ')}`;
      if (!/order\s+by/i.test(stripComments(sql).replace(/over\s*\([^)]*\)/gi, ''))) {
        return fail('Right rows, not sorted.', `Add ${sortText}. Without it the order is luck, and next week it changes.`);
      }
      const cols = spec.orderBy.map((x) => expected.columns.findIndex((c) => lc(c) === lc(x.col)));
      const sortKey = (rows) => rows.map((r) => cols.map((i) => norm(r[i])).join('|')).join('\n');
      if (sortKey(user.rows) !== sortKey(expected.rows)) {
        return fail('Right rows, wrong order.', `Sort with ${sortText}.${o.desc ? ' DESC puts the biggest or newest first.' : ''}`);
      }
    }
    return { pass: true, headline: `${plural(user.rows.length, 'row')}. Matches.`, extraRows: [] };
  }

  const ctx = {
    user, expected, today, sql, dialect,
    extra: extraIdx.map((i) => user.rows[i]),
    missing: missingIdx.map((i) => expected.rows[i]),
    col: (name) => expected.columns.findIndex((c) => lc(c) === lc(name)),
  };
  const specific = spec.diagnose && spec.diagnose(ctx);
  if (specific) return fail(specific.headline, `${rowsLine} ${specific.detail || ''}`.trim(), extraIdx);

  if (!user.rows.length) return fail('Nothing came back. That filter’s too tight.', `Should be ${plural(expected.rows.length, 'row')}.`);
  if (missingIdx.length && !extraIdx.length) return fail('You’re missing rows.', rowsLine || 'Check the filter.');
  if (extraIdx.length && !missingIdx.length) return fail('Extra rows. I’ve highlighted them.', rowsLine, extraIdx);
  return fail('Some values are off. Odd ones are highlighted.', rowsLine || 'Same row count, different numbers.', extraIdx);
}

module.exports = { check, norm };
