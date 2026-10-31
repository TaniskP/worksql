// Every lesson's reference answer must pass, the data must keep the properties lessons rely on,
// and the sloppy queries people actually type must fail with the right note.
const assert = require('node:assert');
const sandbox = require('../src/sandbox');
const { lessons, stepSpec } = require('../src/lessons');
const { grade } = require('../src/grade');

const L = (id) => lessons.find((l) => l.id === id);
const LAST = (n) => `DATEADD(day, -${n}, CAST(GETDATE() AS date))`;

// [lesson, step, sql, expect]: true = pass, RegExp = fails with matching note, 'error' = SQL error
const cases = [
  // Lesson 1: the walkthrough and the strictness the feedback asked for
  [1, 0, 'SELECT * FROM Customers', true],
  [1, 1, 'SELECT * FROM Customers', /only asked for 3 columns/],
  [1, 1, 'SELECT first_name, last_name, email, city FROM Customers', /Drop city/],
  [1, 1, 'SELECT email, first_name, last_name FROM Customers', /wrong order/],
  [1, 1, 'SELECT first_name, last_name, email FROM dbo.Customers;', true],
  [3, 1, 'SELECT order_id, order_date, total_amount FROM Orders WHERE status = Processing', true],
  [3, 1, "SELECT order_id, order_date, total_amount FROM Orders WHERE status = 'Processing'", /leave the quotes off/],
  [3, 2, "SELECT order_id, order_date, total_amount FROM Orders WHERE status = 'processing'", true],
  [5, 0, 'SELECT GETDATE() AS now', true],
  [5, 2, `SELECT order_id, customer_id, order_date, total_amount FROM Orders
          WHERE DATEDIFF(day, order_date, GETDATE()) BETWEEN 1 AND 7 AND total_amount > 50 ORDER BY order_date DESC`, true],
  [5, 2, `SELECT order_id, customer_id, order_date, total_amount FROM Orders
          WHERE order_date >= DATEADD(day, -7, GETDATE()) AND total_amount > 50 ORDER BY order_date DESC`, /included today/],
  [5, 2, `SELECT order_id, customer_id, order_date, total_amount FROM Orders
          WHERE order_date >= ${LAST(7)} AND order_date < CAST(GETDATE() AS date) AND total_amount > 50`, /not sorted/],
  [7, 1, 'SELECT customer_id, first_name, last_name, phone FROM Customers', /still say NULL/],
  [7, 1, "SELECT customer_id, first_name, last_name, ISNULL(phone, 'No phone') FROM Customers", /Headers aren’t/],
  [7, 1, "SELECT customer_id, first_name, last_name, COALESCE(phone, N'No phone') AS phone FROM Customers", true],
  [9, 2, `SELECT o.order_id, CONCAT(c.first_name, ' ', c.last_name) AS customer_name, o.order_date, o.total_amount
          FROM Orders AS o INNER JOIN Customers AS c ON c.customer_id = o.customer_id
          WHERE o.order_date >= ${LAST(7)} AND o.order_date < CAST(GETDATE() AS date) ORDER BY o.order_date DESC`, true],
  // Paid paths
  [11, 0, 'SELECT TOP (5) order_id, customer_id, total_amount FROM Orders ORDER BY total_amount DESC', true],
  [11, 0, 'SELECT order_id, customer_id, total_amount FROM Orders ORDER BY total_amount DESC', /not all of them/],
  [14, 0, 'SELECT status, total_amount, COUNT(*) AS order_count FROM Orders GROUP BY status', 'error'],
  [18, 0, "SELECT CASE WHEN total_amount < 50 THEN 'Small' WHEN total_amount <= 150 THEN 'Medium' ELSE 'Large' END AS size, COUNT(*) AS order_count FROM Orders GROUP BY size", 'error'],
  [18, 0, "WITH s AS (SELECT CASE WHEN total_amount < 50 THEN 'Small' WHEN total_amount <= 150 THEN 'Medium' ELSE 'Large' END AS size FROM Orders) SELECT size, COUNT(*) AS order_count FROM s GROUP BY size", true],
  [19, 2, 'SELECT c.customer_id, c.first_name, c.last_name, c.email FROM Customers c JOIN Orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL', /inner JOIN/],
  [43, 0, "SELECT s.first_name, s.last_name, s.role FROM Staff s LEFT JOIN Orders o ON o.staff_id = s.staff_id WHERE o.order_id IS NULL AND o.order_date >= DATEADD(day, -30, CAST(GETDATE() AS date))", /date filter is in WHERE/],
  [42, 0, 'SELECT p.product_id, p.product_name FROM Products p WHERE NOT EXISTS (SELECT 1 FROM Returns r WHERE r.product_id = p.product_id)', true],
  [45, 0, 'WITH sold AS (SELECT product_id, SUM(quantity) AS units_sold FROM OrderLines GROUP BY product_id) SELECT p.product_name, s.units_sold FROM sold s JOIN Products p ON p.product_id = s.product_id WHERE s.units_sold > (SELECT AVG(units_sold) FROM sold)', /not sorted/],
  [19, 2, 'SELECT customer_id, first_name, last_name, email FROM Customers c WHERE NOT EXISTS (SELECT 1 FROM Orders o WHERE o.customer_id = c.customer_id)', true],
  [20, 0, "SELECT e.first_name + ' ' + e.last_name AS employee, m.first_name + ' ' + m.last_name AS manager FROM Staff e JOIN Staff m ON m.staff_id = e.manager_id", /left me off/],
  [21, 0, "SELECT c.customer_id, c.first_name, c.last_name FROM Customers c JOIN Orders o ON o.customer_id = c.customer_id WHERE o.status = 'Cancelled'", null],
  [23, 0, "SELECT FORMAT(order_date, 'yyyy-MM') AS month, SUM(total_amount) AS revenue FROM Orders WHERE status = 'Shipped' GROUP BY FORMAT(order_date, 'yyyy-MM') ORDER BY month", true],
  [27, 0, 'SELECT DISTINCT TRIM(first_name) AS first_name, TRIM(last_name) AS last_name, LOWER(TRIM(email)) AS email FROM Customers', true],
  [27, 0, 'SELECT DISTINCT first_name, last_name, LOWER(email) AS email FROM Customers', /aren’t clean|duplicates/],
  [30, 2, 'SELECT o.customer_id, o.order_id, o.order_date, o.total_amount FROM Orders o WHERE o.order_id = (SELECT MAX(order_id) FROM Orders x WHERE x.customer_id = o.customer_id) ORDER BY o.customer_id', true],
  [36, 0, L(36).starter, /multiplying the order/],
  [37, 0, L(37).starter, /Extra rows/],
  [38, 0, L(38).starter, 'error'],
  [39, 0, 'SELECT TOP 1 total_amount AS second_highest FROM (SELECT DISTINCT TOP 2 total_amount FROM Orders ORDER BY total_amount DESC) x ORDER BY total_amount', /no TOP/],
  // Walkthrough steps that fail on purpose, and SQL Server's rule that aliases don't exist in WHERE yet
  [14, 1, 'SELECT status, COUNT(*) AS order_count FROM Orders', true],
  [30, 1, 'SELECT customer_id, order_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn FROM Orders WHERE rn = 1', true],
  [17, 2, "SELECT order_id, total_amount AS amt, 'x' AS size FROM Orders WHERE amt > 50", 'error'],
  [17, 2, "SELECT order_id, total_amount, CASE WHEN total_amount < 50 THEN 'Small' WHEN total_amount < 150 THEN 'Medium' ELSE 'Large' END AS size FROM Orders WHERE order_date >= DATEADD(day, -30, CAST(GETDATE() AS date)) AND order_date < CAST(GETDATE() AS date) ORDER BY total_amount DESC", null],
  // Scripts the way SSMS generates them (Object Explorer in work mode does the same)
  [2, 0, 'USE [Harbour]\nGO\n\nSELECT [first_name]\n      ,[last_name]\n      ,[team]\n  FROM [Harbour].[dbo].[Staff]\nGO', true],
  [2, 0, 'USE Payroll\nGO\nSELECT first_name, last_name, team FROM Staff', 'error'],
  [1, 0, 'DELETE FROM Customers', 'error'],
  [1, 0, 'SELECT first_nme FROM Customers', 'error'],
];

(async () => {
  let failed = 0;
  const ok = (cond, label) => { if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}`); };

  // 1. Every step's reference answer passes, and finals return rows.
  for (const l of lessons) {
    const steps = l.steps || [{ final: true }];
    for (let i = 0; i < steps.length; i++) {
      const spec = stepSpec(l, i);
      if (spec.expectError) continue;
      try {
        const r = await grade(l, i, spec.solution);
        assert.ok(!r.error, r.error);
        assert.ok(r.rows.length > 0, 'no rows');
        assert.ok(r.verdict.pass, `${r.verdict.headline} ${r.verdict.detail || ''}`);
        if (spec.final) console.log(`ok   lesson ${l.id} ${l.topic} (${r.rows.length} rows)`);
      } catch (e) { failed++; console.log(`FAIL lesson ${l.id} step ${i}: ${e.message}`); }
    }
  }

  // 2. Data properties lessons rely on.
  const q = async (sql) => (await sandbox.run(sql)).rows;
  const top6 = await q('SELECT TOP 6 total_amount FROM Orders ORDER BY total_amount DESC');
  ok(new Set(top6.slice(0, 6).map((r) => r[0])).size === 6, `top 6 order totals distinct: ${top6.map((r) => r[0]).join(', ')}`);
  ok((await q(`SELECT COUNT(*) FROM Orders WHERE order_date = ${LAST(7)}`))[0][0] === 0, 'no orders exactly 7 days ago');
  ok((await q('SELECT COUNT(*) FROM Orders WHERE order_date = CAST(GETDATE() AS date) AND total_amount > 50'))[0][0] > 0, 'an order over £50 today');
  ok((await q('SELECT COUNT(*) FROM OrderLines WHERE order_id = 10484'))[0][0] >= 2, 'order 10484 has several lines');
  ok((await q("SELECT COUNT(*) FROM Customers WHERE city = 'Leeds'"))[0][0] >= 3, 'some Leeds customers');
  const spenders = await q('SELECT SUM(total_amount) s FROM Orders GROUP BY customer_id ORDER BY s DESC');
  ok(spenders.filter((r) => r[0] > 1000).length >= 3 && spenders.filter((r) => r[0] > 1000).length <= 15,
    `hamper list a sensible size (${spenders.filter((r) => r[0] > 1000).length} over £1,000)`);
  const top = await q("SELECT TOP 6 SUM(ol.quantity * ol.unit_price) r FROM OrderLines ol JOIN Orders o ON o.order_id = ol.order_id WHERE o.order_date >= DATEADD(day, -90, CAST(GETDATE() AS date)) AND o.order_date < CAST(GETDATE() AS date) AND o.status <> 'Cancelled' GROUP BY ol.product_id ORDER BY r DESC");
  ok(top[4][0] !== top[5][0], 'no tie at the top-5 products boundary');
  const sellers = await q("SELECT TOP 4 SUM(total_amount) r FROM Orders WHERE order_date >= DATEADD(day, -30, CAST(GETDATE() AS date)) AND order_date < CAST(GETDATE() AS date) GROUP BY staff_id ORDER BY r DESC");
  ok(sellers[2][0] !== sellers[3][0], 'no tie at the top-3 sellers boundary');

  // 3. Sloppy and alternative answers.
  for (const [id, step, sql, want] of cases) {
    const r = await grade(L(id), step, sql);
    const label = `lesson ${id}.${step}: ${sql.replace(/\s+/g, ' ').slice(0, 70)}`;
    const note = r.error || (r.verdict ? `${r.verdict.headline} ${r.verdict.detail || ''}` : '');
    const pass = r.verdict && r.verdict.pass;
    const good = want === 'error' ? !!r.error && !r.verdict
      : want === true ? pass
        : want === null ? !pass
          : !pass && want.test(note);
    ok(good, `${label}\n       -> ${note}`);
  }

  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
