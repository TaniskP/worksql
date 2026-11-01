// One product, three stacks. Every ticket must work in SQL Server, PostgreSQL and MySQL with the same
// expected rows, each stack must refuse the other stacks' habits in its own words, and a free ticket
// must go end to end through the API in each stack without touching the paid plan.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sandbox = require('../src/sandbox');
const { lessons, stepSpec, lessonFor, stackDays } = require('../src/lessons');
const { grade } = require('../src/grade');
const { DIALECTS } = require('../src/dialects');

const STACKS = Object.keys(DIALECTS);
const L = (id) => lessons.find((l) => l.id === id);
const key = (rows) => rows.map((r) => r.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)).join('|'));
const sameMultiset = (a, b) => JSON.stringify(key(a).sort()) === JSON.stringify(key(b).sort());

// T-SQL habits that must not appear in PostgreSQL or MySQL lesson text.
const TSQL_ONLY = /GETDATE|DATEADD|ISNULL|\bTOP\b|CONVERT\(|SSMS|SQL Server|\+ ' ' \+|\[[A-Za-z ]+\]/;

// [stack, lesson, step, sql, expect]: true = pass, RegExp = fails with a matching note or error
const cases = [
  // PostgreSQL
  ['postgres', 3, 1, 'SELECT order_id, order_date, total_amount FROM Orders WHERE status = Processing', true],
  ['postgres', 3, 2, "SELECT order_id, order_date, total_amount FROM Orders WHERE status = 'processing'", /Nothing came back/],
  ['postgres', 5, 0, 'SELECT now() AS now', true],
  ['postgres', 5, 0, 'SELECT GETDATE() AS now', /function getdate\(\) does not exist/],
  ['postgres', 5, 2, "SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE order_date >= CURRENT_DATE - 7 AND order_date < CURRENT_DATE AND total_amount > 50 ORDER BY order_date DESC", true],
  ['postgres', 5, 2, "SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE order_date >= now() - INTERVAL '7 days' AND total_amount > 50 ORDER BY order_date DESC", /included today/],
  ['postgres', 7, 1, "SELECT customer_id, first_name, last_name, ISNULL(phone, 'No phone') AS phone FROM Customers", /function isnull/],
  ['postgres', 7, 1, "SELECT customer_id, first_name, last_name, COALESCE(phone, 'No phone') FROM Customers", /Headers aren’t/],
  ['postgres', 9, 2, "SELECT o.order_id, CONCAT(c.first_name, ' ', c.last_name) AS customer_name, o.order_date, o.total_amount FROM Orders o JOIN Customers c ON c.customer_id = o.customer_id WHERE o.order_date >= CURRENT_DATE - INTERVAL '7 days' AND o.order_date < CURRENT_DATE ORDER BY o.order_date DESC", true],
  ['postgres', 9, 1, "SELECT o.order_id, c.first_name + ' ' + c.last_name AS customer_name FROM Orders o JOIN Customers c ON c.customer_id = o.customer_id", /operator does not exist/],
  ['postgres', 11, 0, 'SELECT TOP 5 order_id, customer_id, total_amount FROM Orders ORDER BY total_amount DESC', /syntax error at or near "5"/],
  ['postgres', 11, 0, 'SELECT order_id, customer_id, total_amount FROM Orders ORDER BY total_amount DESC FETCH FIRST 5 ROWS ONLY', true],
  ['postgres', 18, 0, "SELECT CASE WHEN total_amount < 50 THEN 'Small' WHEN total_amount <= 150 THEN 'Medium' ELSE 'Large' END AS size, COUNT(*) AS order_count FROM Orders GROUP BY 1", true],
  ['postgres', 23, 0, "SELECT to_char(order_date, 'YYYY-MM') AS month, SUM(total_amount) AS revenue FROM Orders WHERE status = 'Shipped' GROUP BY month ORDER BY month", true],
  ['postgres', 38, 0, 'SELECT status, COUNT(*) AS order_count FROM Orders', /must appear in the GROUP BY clause/],
  ['postgres', 39, 0, 'SELECT total_amount AS second_highest FROM Orders ORDER BY total_amount DESC LIMIT 1 OFFSET 1', /no LIMIT/],
  ['postgres', 1, 0, 'SELECT * FROM [Customers]', /syntax error at or near "\["/],
  // MySQL
  ['mysql', 3, 1, 'SELECT order_id, order_date, total_amount FROM Orders WHERE status = Processing', true],
  ['mysql', 3, 2, "SELECT order_id, order_date, total_amount FROM Orders WHERE status = 'processing'", true],
  ['mysql', 5, 0, 'SELECT NOW() AS now', true],
  ['mysql', 5, 2, 'SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE order_date >= CURDATE() - INTERVAL 7 DAY AND order_date < CURDATE() AND total_amount > 50 ORDER BY order_date DESC', true],
  ['mysql', 5, 2, 'SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE DATEDIFF(CURDATE(), order_date) BETWEEN 1 AND 7 AND total_amount > 50 ORDER BY order_date DESC', true],
  ['mysql', 7, 1, "SELECT customer_id, first_name, last_name, COALESCE(phone, 'No phone') AS phone FROM Customers", true],
  ['mysql', 7, 1, "SELECT customer_id, first_name, last_name, ISNULL(phone, 'No phone') AS phone FROM Customers", /Incorrect parameter count/],
  ['mysql', 9, 1, "SELECT o.order_id, c.first_name || ' ' || c.last_name AS customer_name FROM Orders o JOIN Customers c ON c.customer_id = o.customer_id", /\|\| means OR/],
  ['mysql', 10, 0, 'SELECT `p`.`product_name`, ol.quantity FROM OrderLines ol JOIN Products p ON p.product_id = ol.product_id WHERE ol.order_id = 10484', true],
  ['mysql', 11, 0, 'SELECT TOP 5 order_id, customer_id, total_amount FROM Orders ORDER BY total_amount DESC', /You have an error in your SQL syntax/],
  ['mysql', 14, 2, 'SELECT status, COUNT(*) AS order_count, SUM(total_amount) AS revenue FROM Orders GROUP BY 1', true],
  ['mysql', 20, 0, "SELECT CONCAT(e.first_name, ' ', e.last_name) AS employee, COALESCE(CONCAT(m.first_name, ' ', m.last_name), 'No manager') AS manager FROM Staff e LEFT JOIN Staff m ON m.staff_id = e.manager_id", true],
  ['mysql', 38, 0, 'SELECT status, COUNT(*) AS order_count FROM Orders', /only_full_group_by/],
  // SQL Server refuses the other two stacks' habits
  ['tsql', 11, 0, 'SELECT order_id, customer_id, total_amount FROM Orders ORDER BY total_amount DESC LIMIT 5', /Incorrect syntax near 'LIMIT'/],
  ['tsql', 7, 1, "SELECT customer_id, first_name, last_name, IFNULL(phone, 'No phone') AS phone FROM Customers", /'IFNULL' is not a recognized/],
  ['tsql', 5, 0, 'SELECT NOW() AS now', /'NOW' is not a recognized/],
];

// Steps that fail on purpose, with the mistake written for each stack.
const onPurpose = {
  3: 'SELECT order_id, order_date, total_amount FROM Orders WHERE status = Processing',
  14: 'SELECT status, COUNT(*) AS order_count FROM Orders',
  30: 'SELECT customer_id, order_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) AS rn FROM Orders WHERE rn = 1',
};

(async () => {
  let failed = 0;
  const ok = (cond, label) => { if (!cond) failed++; if (!cond || process.env.VERBOSE) console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}`); };

  // 1. Every step of every ticket, in every stack: the stack's own answer passes and returns
  //    the same rows (and order, where it matters) as SQL Server's.
  let checked = 0;
  for (const base of lessons) {
    const tsqlFinal = await sandbox.run(base.solution, 'tsql');
    for (const d of STACKS) {
      const l = lessonFor(base, d);
      const steps = l.steps || [{ final: true }];
      for (let i = 0; i < steps.length; i++) {
        const spec = stepSpec(l, i);
        const label = `${d} lesson ${l.id} step ${i}`;
        if (spec.expectError) {
          const r = await grade(base, i, onPurpose[l.id], d);
          ok(r.verdict && r.verdict.pass, `${label}: deliberate error -> ${r.error}`);
          continue;
        }
        const r = await grade(base, i, spec.solution, d);
        ok(!r.error && r.verdict && r.verdict.pass, `${label}: ${r.error || (r.verdict && r.verdict.headline)}`);
        if (spec.final && !r.error) {
          ok(sameMultiset(r.rows, tsqlFinal.rows), `${label}: same rows as SQL Server`);
          if (l.orderBy) {
            const cols = l.orderBy.map((o) => r.columns.findIndex((c) => c.toLowerCase() === o.col));
            const sortKey = (rows) => rows.map((row) => cols.map((c) => row[c]).join('|')).join('\n');
            ok(sortKey(r.rows) === sortKey(tsqlFinal.rows), `${label}: same order as SQL Server`);
          }
        }
        checked++;
      }
      // No SQL Server habits left in the text a PostgreSQL or MySQL learner reads.
      if (d !== 'tsql') {
        const texts = [l.topic, l.blurb, l.title, ...l.bullets, ...l.hints, l.tip || '', l.starter || '',
          ...(l.steps || []).flatMap((s) => [s.text || '', s.starter || '', s.done || ''])];
        const bad = texts.find((t) => TSQL_ONLY.test(t));
        ok(!bad, `${d} lesson ${l.id} text has no T-SQL habits${bad ? `: "${bad}"` : ''}`);
      }
    }
  }
  console.log(`ok   ${checked} steps checked across ${STACKS.length} stacks`);
  for (const d of ['postgres', 'mysql']) {
    const bad = stackDays(d).find((day) => TSQL_ONLY.test(day.blurb));
    ok(!bad, `${d} day blurbs have no T-SQL habits${bad ? `: ${bad.blurb}` : ''}`);
  }

  // 2. Wrong answers and other stacks' habits.
  for (const [d, id, step, sql, want] of cases) {
    const r = await grade(L(id), step, sql, d);
    const note = r.error || (r.verdict ? `${r.verdict.headline} ${r.verdict.detail || ''}` : '');
    const pass = r.verdict && r.verdict.pass;
    ok(want === true ? pass : !pass && want.test(note), `${d} lesson ${id}.${step}: ${sql.slice(0, 60)}\n       -> ${note}`);
  }

  // 3. The server honours the stack, and a free ticket goes end to end in each one.
  const port = 3980 + Math.floor(Math.random() * 9);
  const srv = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server.js'], {
    cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(port), NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((done) => srv.stdout.on('data', (b) => { if (String(b).includes('running')) done(); }));
  const base = `http://localhost:${port}`;
  try {
    for (const d of STACKS) {
      const page = await fetch(`${base}/api/lessons/5?dialect=${d}`).then((r) => r.json());
      ok(page.dialect === d, `${d}: lesson page says which stack`);
      const final = page.lesson.steps.length - 1;
      const sql = lessonFor(L(5), d).solution;
      const run = await fetch(`${base}/api/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: 5, step: final, sql, dialect: d }),
      });
      const body = await run.json();
      ok(run.status === 200 && body.verdict && body.verdict.pass, `${d}: free ticket 5 passes end to end (${run.status} ${body.verdict && body.verdict.headline})`);
      const paid = await fetch(`${base}/api/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lessonId: 11, step: 0, sql: 'SELECT 1', dialect: d }),
      });
      ok(paid.status === 402, `${d}: paid tickets still need the one plan (${paid.status})`);
      const work = await fetch(`${base}/api/work?dialect=${d}`).then((r) => r.json());
      ok(work.dialect === d && work.lessons.length === lessons.length, `${d}: work mode loads every ticket`);
      const q = await fetch(`${base}/api/query`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: 'SELECT order_id FROM Orders LIMIT 1', dialect: d }) }).then((r) => r.json());
      ok(d === 'tsql' ? /LIMIT/.test(q.error) : q.rows && q.rows.length === 1, `${d}: query window runs in the stack`);
    }
    const weird = await fetch(`${base}/api/lessons/1?dialect=oracle`).then((r) => r.json());
    ok(weird.dialect === 'tsql', 'an unknown stack falls back to SQL Server');
    const pg = await fetch(`${base}/api/lessons/7?dialect=postgres`).then((r) => r.json());
    ok(pg.lesson.topic === 'COALESCE' && /COALESCE/.test(pg.lesson.steps[1].text), 'PostgreSQL walkthrough teaches COALESCE');
  } finally {
    const gone = new Promise((done) => srv.once('exit', done));
    srv.kill();
    await gone;
  }

  // 4. The picker is on the pages, saved under one key, and the copy offers all three stacks on one plan.
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
  const common = read('js/common.js');
  ok(/worksql_dialect/.test(common), 'stack preference is stored as worksql_dialect');
  ok(/stackPicker/.test(common), 'common.js has the stack picker');
  for (const f of ['index.html', 'work.html', 'lesson.html', 'lessons.html']) ok(/data-stack-picker/.test(read(f)), `${f} has a stack picker`);
  ok(/Practise in SQL Server, PostgreSQL, or MySQL - same plan/.test(read('pricing.html')), 'pricing says all three stacks are one plan');
  const { plans } = require('../src/plans');
  ok(plans.some((p) => (p.features || []).includes('Real SQL in your stack, marked strictly')), 'plan copy says real SQL in your stack');

  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
