// Workplace SQL interview prompts. Editor is in-browser; we do not run their query here.
const q = (slug, name, title, short, description, lede, prompt, hint, answer, note) =>
  ({ slug, name, title, short, description, lede, prompt, hint, answer, note });

module.exports = [
  q('top-n-per-group', 'Top N per group',
    'SQL interview: top 3 orders per customer (ROW_NUMBER)',
    'PARTITION BY customer, filter rn <= 3.',
    'SQL interview question: find the top 3 highest-value orders per customer in T-SQL with ROW_NUMBER.',
    '“Top 3 per country” is the same pattern as “top 3 per customer.” Number the rows, then keep 1..3.',
    'Find the three highest-value orders for each customer. Include ties only if you meant RANK.',
    'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total_amount DESC)',
    `SELECT *
FROM (
  SELECT o.*,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total_amount DESC, order_id DESC) AS rn
  FROM Orders o
) x
WHERE rn <= 3;`,
    'RANK keeps ties and can return more than 3. ROW_NUMBER always returns 3. Ask which they wanted.'),
  q('running-total', 'Running total',
    'SQL interview: running total with SUM() OVER',
    'Window SUM, not a triangular self-join.',
    'SQL interview: write a T-SQL running total of sales by day using SUM() OVER.',
    'A running total keeps every row. GROUP BY would collapse them. That is the whole trick.',
    'For each order, show the customer’s spend so far, ordered by order_date.',
    'SUM(total_amount) OVER (PARTITION BY customer_id ORDER BY order_date, order_id)',
    `SELECT order_id, customer_id, order_date, total_amount,
       SUM(total_amount) OVER (
         PARTITION BY customer_id
         ORDER BY order_date, order_id
         ROWS UNBOUNDED PRECEDING
       ) AS running_spend
FROM Orders;`,
    'ROWS UNBOUNDED PRECEDING is the honest default. RANGE can double-count same-day twins.'),
  q('second-highest', 'Second highest',
    'SQL interview: second-highest salary / order',
    'ROW_NUMBER = 2, or OFFSET 1 FETCH 1. Not MAX of a MAX.',
    'SQL interview question: second highest value in SQL Server without a brittle MAX subquery.',
    'Second highest is a ranking problem. Nested MAX works until there is a tie and someone asks for the row.',
    'Return the customer with the second-highest lifetime spend, and the spend.',
    'ROW_NUMBER on the aggregated spend',
    `WITH spend AS (
  SELECT customer_id, SUM(total_amount) AS sales
  FROM Orders
  GROUP BY customer_id
)
SELECT customer_id, sales
FROM (
  SELECT *, ROW_NUMBER() OVER (ORDER BY sales DESC, customer_id) AS rn
  FROM spend
) x
WHERE rn = 2;`,
    'DENSE_RANK = 2 returns every customer tied for second. Say so in the interview.'),
  q('find-duplicates', 'Find duplicates',
    'SQL interview: find duplicate emails (GROUP BY HAVING)',
    'HAVING COUNT(*) > 1, then join back for the rows.',
    'SQL interview: write T-SQL to find duplicate emails and the rows that share them.',
    'The hunt is a GROUP BY. The rows are a join back to that set.',
    'List every customer whose email appears more than once.',
    'GROUP BY email HAVING COUNT(*) > 1',
    `SELECT email, COUNT(*) AS times
FROM Customers
GROUP BY email
HAVING COUNT(*) > 1;

SELECT c.*
FROM Customers c
JOIN (
  SELECT email FROM Customers GROUP BY email HAVING COUNT(*) > 1
) d ON d.email = c.email;`,
    'Uniqueidentifier keys do not make the email unique. UNIQUE on email does.'),
  q('gaps-and-islands', 'Gaps and islands',
    'SQL interview: consecutive days / islands',
    'date − ROW_NUMBER is the island key.',
    'SQL interview: gaps and islands in T-SQL — consecutive order days per customer.',
    'An island is a run of days with no gap. Subtract a row number from the date and the run shares a key.',
    'For each customer, find streaks of consecutive order dates and the length of each streak.',
    'DATEADD(day, −rn, day) as grp',
    `WITH d AS (
  SELECT customer_id, CAST(order_date AS date) AS day,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY CAST(order_date AS date)) AS rn
  FROM Orders
  GROUP BY customer_id, CAST(order_date AS date)
)
SELECT customer_id, MIN(day) AS start_day, MAX(day) AS end_day, COUNT(*) AS days
FROM (
  SELECT *, DATEADD(day, -rn, day) AS grp FROM d
) x
GROUP BY customer_id, grp;`,
    'Two orders on one day are one day. Group the date first.'),
  q('employees-without-orders', 'Anti-join',
    'SQL interview: customers with no orders (LEFT JOIN IS NULL)',
    'LEFT JOIN … WHERE right.key IS NULL. Or NOT EXISTS.',
    'SQL interview: find rows in A that are not in B. T-SQL anti-join.',
    '“Employees without orders” is the same as “customers who never bought.”',
    'Return customers who have no row in Orders.',
    'LEFT JOIN Orders, WHERE o.customer_id IS NULL',
    `SELECT c.customer_id, c.email
FROM Customers c
LEFT JOIN Orders o ON o.customer_id = c.customer_id
WHERE o.customer_id IS NULL;`,
    'NOT EXISTS is often cleaner. NOT IN (subquery) dies if the subquery returns NULL.'),
  q('month-over-month', 'Month over month',
    'SQL interview: month-over-month growth',
    'Aggregate to month, then LAG the total.',
    'SQL interview: month-over-month sales in T-SQL with LAG.',
    'Two grains: first the month, then the previous month. Do not LAG the raw orders.',
    'Sales by month, previous month, and percent change.',
    'LAG(sales) OVER (ORDER BY ym)',
    `WITH m AS (
  SELECT CONVERT(char(7), order_date, 120) AS ym,
         SUM(total_amount) AS sales
  FROM Orders
  GROUP BY CONVERT(char(7), order_date, 120)
)
SELECT ym, sales,
       LAG(sales) OVER (ORDER BY ym) AS prev_sales,
       (sales - LAG(sales) OVER (ORDER BY ym)) * 1.0
         / NULLIF(LAG(sales) OVER (ORDER BY ym), 0) AS mom
FROM m;`,
    'First month’s LAG is NULL. NULLIF stops a divide by zero.'),
  q('retention-cohort', 'Cohort retention',
    'SQL interview: signup cohort retention',
    'First-seen month, then activity month, then COUNT DISTINCT.',
    'SQL interview: cohort retention in T-SQL — users by signup month and later activity.',
    'A cohort is “who first appeared in the same bucket.” Retention is whether they came back.',
    'For each signup month, how many customers ordered again in later months?',
    'MIN(order_date) per customer is the cohort',
    `WITH first_seen AS (
  SELECT customer_id, CONVERT(char(7), MIN(order_date), 120) AS cohort
  FROM Orders
  GROUP BY customer_id
),
activity AS (
  SELECT DISTINCT customer_id, CONVERT(char(7), order_date, 120) AS ym
  FROM Orders
)
SELECT f.cohort, a.ym, COUNT(*) AS customers
FROM first_seen f
JOIN activity a ON a.customer_id = f.customer_id
GROUP BY f.cohort, a.ym
ORDER BY f.cohort, a.ym;`,
    'COUNT(*) here is customers, because activity is already DISTINCT. Do not double-count orders.'),
  q('self-join-manager', 'Self-join',
    'SQL interview: employee / manager self-join',
    'Join the table to itself on manager_id = staff_id.',
    'SQL interview: self-join in T-SQL to show each staff member and their manager.',
    'The manager is a row in the same table. Alias it twice.',
    'List each staff member and their manager’s name. Top person has no manager.',
    'LEFT JOIN Staff m ON m.staff_id = s.manager_id',
    `SELECT s.staff_id, s.full_name,
       m.full_name AS manager_name
FROM Staff s
LEFT JOIN Staff m ON m.staff_id = s.manager_id;`,
    'A tree walk (all bosses above) is a recursive CTE, not one self-join.'),
  q('pivot-status', 'Pivot',
    'SQL interview: rows to columns (PIVOT / CASE)',
    'CASE per status is enough. PIVOT if they asked for the keyword.',
    'SQL interview: pivot order status into columns in T-SQL.',
    'Wide reports are either PIVOT or a handful of SUM(CASE). Interviewers accept both. CASE is easier to read.',
    'One row per customer, columns for Shipped, Cancelled, Processing sales.',
    'SUM(CASE WHEN status = … THEN amount ELSE 0 END)',
    `SELECT customer_id,
       SUM(CASE WHEN status = 'Shipped' THEN total_amount ELSE 0 END) AS shipped,
       SUM(CASE WHEN status = 'Cancelled' THEN total_amount ELSE 0 END) AS cancelled,
       SUM(CASE WHEN status = 'Processing' THEN total_amount ELSE 0 END) AS processing
FROM Orders
GROUP BY customer_id;`,
    'Dynamic statuses: /tools/pivot. Do not concatenate user text into PIVOT IN.'),
  q('median', 'Median',
    'SQL interview: median in SQL Server',
    'PERCENTILE_CONT(0.5) or a pair of ROW_NUMBERs.',
    'SQL interview: median order value in T-SQL. AVG is not the median.',
    'Median is the middle row after you sort. Average is a different question.',
    'Median total_amount of Orders.',
    'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_amount)',
    `SELECT DISTINCT
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_amount)
         OVER () AS median_amount
FROM Orders;`,
    'PERCENTILE_CONT interpolates. PERCENTILE_DISC picks a real row. Say which.'),
  q('consecutive-days', 'Consecutive dates',
    'SQL interview: customers who ordered 3 days in a row',
    'Island length >= 3, or three self-joins on date+1.',
    'SQL interview: find users with 3 consecutive activity days in T-SQL.',
    'Three days in a row is an island of length 3, or date, date+1, date+2 as a join.',
    'Customers who placed at least one order on three consecutive calendar days.',
    'Island COUNT(*) >= 3',
    `WITH d AS (
  SELECT DISTINCT customer_id, CAST(order_date AS date) AS day FROM Orders
),
n AS (
  SELECT customer_id, day,
         DATEADD(day, -ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day), day) AS grp
  FROM d
)
SELECT DISTINCT customer_id
FROM n
GROUP BY customer_id, grp
HAVING COUNT(*) >= 3;`,
    'The self-join version is fine for 3. Islands scale when they say “N days.”'),
  q('latest-per-customer', 'Latest row',
    'SQL interview: latest order per customer',
    'ROW_NUMBER = 1, not MAX + join that duplicates ties.',
    'SQL interview: most recent order per customer in T-SQL.',
    'MAX(order_date) then join back fails when two orders share that date. Number the rows.',
    'Return the most recent order row per customer (full row, not just the date).',
    'ROW_NUMBER PARTITION BY customer_id ORDER BY order_date DESC',
    `SELECT *
FROM (
  SELECT o.*,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) AS rn
  FROM Orders o
) x
WHERE rn = 1;`,
    'CROSS APPLY (SELECT TOP 1 …) is the same idea and sometimes reads better.'),
  q('delete-dupes-keep-one', 'Delete dupes',
    'SQL interview: delete duplicates, keep one row',
    'ROW_NUMBER in a CTE, DELETE WHERE rn > 1.',
    'SQL interview: T-SQL to delete duplicate emails and keep the lowest id.',
    'SELECT the keepers first. Then delete. Never DELETE FROM Customers WHERE email IN (duplicates) — that drops everyone.',
    'For emails that appear more than once, keep the smallest customer_id and delete the rest.',
    'DELETE from a CTE where rn > 1',
    `WITH d AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY email ORDER BY customer_id) AS rn
  FROM Customers
)
DELETE FROM d WHERE rn > 1;`,
    'Run the CTE as a SELECT first. Backup. This is the interview version of a very real Friday.'),
  q('recursive-org-chart', 'Recursive CTE',
    'SQL interview: walk a manager tree',
    'Anchor the CEO, UNION ALL the staff who report to the current set.',
    'SQL interview: recursive CTE in T-SQL for an org chart.',
    'A recursive CTE is the one time WITH is not just a name. Anchor, then join to itself.',
    'Starting from the person with no manager, list everyone under them with a depth.',
    'UNION ALL join back to the CTE on manager_id',
    `WITH tree AS (
  SELECT staff_id, full_name, manager_id, 0 AS depth
  FROM Staff
  WHERE manager_id IS NULL
  UNION ALL
  SELECT s.staff_id, s.full_name, s.manager_id, t.depth + 1
  FROM Staff s
  JOIN tree t ON t.staff_id = s.manager_id
)
SELECT * FROM tree;`,
    'OPTION (MAXRECURSION 100) if the graph is deep. A cycle will loop until that cap.'),
  q('percent-of-total', 'Percent of total',
    'SQL interview: share of total with a window',
    'amount / SUM(amount) OVER ().',
    'SQL interview: percent of total in T-SQL without a second query.',
    'The total is one window. The row stays. That is SUM() OVER () with an empty PARTITION.',
    'Each order as a percent of that customer’s spend, and of all spend.',
    'SUM(total_amount) OVER (PARTITION BY customer_id)',
    `SELECT order_id, customer_id, total_amount,
       total_amount * 1.0 / SUM(total_amount) OVER (PARTITION BY customer_id) AS pct_of_customer,
       total_amount * 1.0 / SUM(total_amount) OVER () AS pct_of_all
FROM Orders;`,
    'Times 1.0 (or CAST to decimal) or you get integer 0. NULLIF the total if it can be 0.'),
  q('yoy', 'Year over year',
    'SQL interview: year-over-year with LAG',
    'Grain to year (or month), LAG(..., 1) or LAG(..., 12) for months.',
    'SQL interview: year-over-year sales in T-SQL.',
    'YoY is MoM with a different lag. Get the grain right first.',
    'Annual sales and the prior year’s sales.',
    'LAG(sales, 1) OVER (ORDER BY yr)',
    `WITH y AS (
  SELECT DATEPART(year, order_date) AS yr, SUM(total_amount) AS sales
  FROM Orders
  GROUP BY DATEPART(year, order_date)
)
SELECT yr, sales, LAG(sales) OVER (ORDER BY yr) AS prev_year
FROM y;`,
    'Same month last year: grain to year-month, LAG(..., 12).'),
  q('window-vs-group', 'Window vs GROUP BY',
    'SQL interview: why the table did not shrink',
    'GROUP BY collapses. OVER keeps every row.',
    'SQL interview: difference between GROUP BY and a window function in T-SQL.',
    'If they still want the order_id and a total, they want a window, not a GROUP BY.',
    'Show each order and the customer’s total spend on the same row.',
    'SUM(total_amount) OVER (PARTITION BY customer_id)',
    `SELECT order_id, customer_id, total_amount,
       SUM(total_amount) OVER (PARTITION BY customer_id) AS customer_sales
FROM Orders;`,
    'GROUP BY customer_id cannot keep order_id unless you aggregate it. That is Msg 8120.'),
  q('left-join-filter-trap', 'LEFT JOIN trap',
    'SQL interview: WHERE on the right table killed the LEFT JOIN',
    'Filter right-hand columns in ON, not WHERE.',
    'SQL interview: why a LEFT JOIN returned only matches after a WHERE on the right table.',
    'WHERE o.status = \'Shipped\' turns a LEFT JOIN into an INNER JOIN. NULL is not Shipped.',
    'All customers, and their shipped orders if any — including customers who never shipped.',
    'AND o.status = \'Shipped\' belongs in the ON',
    `SELECT c.customer_id, c.email, o.order_id, o.total_amount
FROM Customers c
LEFT JOIN Orders o
  ON o.customer_id = c.customer_id
 AND o.status = 'Shipped';`,
    'Put the filter in WHERE and the customers with no shipped orders disappear. That is the trap.'),
  q('datediff-age', 'Age from a date',
    'SQL interview: age in years from a date of birth',
    'DATEDIFF(year) overcounts. Step back one if the birthday has not happened.',
    'SQL interview: compute age in T-SQL without being a year early.',
    'DATEDIFF(year, dob, today) counts year boundaries, not birthdays.',
    'Age in completed years as of today.',
    'DATEDIFF then subtract if the anniversary is still ahead',
    `SELECT customer_id, dob,
       DATEDIFF(year, dob, CAST(GETDATE() AS date))
       - CASE WHEN DATEADD(year, DATEDIFF(year, dob, CAST(GETDATE() AS date)), dob)
                   > CAST(GETDATE() AS date)
              THEN 1 ELSE 0 END AS age
FROM Customers;`,
    'Do not use this for anything legal without a test table of leap-day births.'),
  q('in-vs-exists', 'IN vs EXISTS',
    'SQL interview: IN vs EXISTS vs JOIN',
    'EXISTS short-circuits. IN + NULL in the list is a trap.',
    'SQL interview: when to use EXISTS instead of IN in T-SQL.',
    'A subquery that can return NULL makes NOT IN return no rows. EXISTS does not have that mood.',
    'Customers who have at least one shipped order.',
    'WHERE EXISTS (SELECT 1 FROM Orders o WHERE …)',
    `SELECT c.customer_id, c.email
FROM Customers c
WHERE EXISTS (
  SELECT 1 FROM Orders o
  WHERE o.customer_id = c.customer_id
    AND o.status = 'Shipped'
);`,
    'A JOIN can duplicate customers if they have two shipped orders. EXISTS will not.'),
  q('union-vs-union-all', 'UNION vs UNION ALL',
    'SQL interview: UNION dedupes, UNION ALL does not',
    'UNION ALL is cheaper. UNION is DISTINCT across the stack.',
    'SQL interview: UNION vs UNION ALL in SQL Server.',
    'Stacking UK and IE customers: ALL if you already know they are disjoint. UNION if you do not.',
    'One list of emails from Customers and from a leads extract, no duplicates.',
    'UNION (not ALL) or UNION ALL + DISTINCT',
    `SELECT email FROM Customers
UNION
SELECT email FROM Leads;`,
    'UNION sorts/hashes to dedupe. On two huge disjoint sets, ALL and say so.'),
  q('count-distinct', 'COUNT DISTINCT',
    'SQL interview: COUNT(*) vs COUNT(col) vs COUNT DISTINCT',
    'Three different questions. NULL and doubles change the answer.',
    'SQL interview: difference between COUNT(*), COUNT(column), and COUNT(DISTINCT) in T-SQL.',
    'COUNT(*) is rows. COUNT(col) skips NULL. COUNT(DISTINCT col) skips NULL and doubles.',
    'How many orders, how many with an email, how many different customers.',
    'COUNT(*), COUNT(email), COUNT(DISTINCT customer_id)',
    `SELECT COUNT(*) AS orders,
       COUNT(email) AS with_email,
       COUNT(DISTINCT customer_id) AS customers
FROM Orders;`,
    'COUNT(DISTINCT) + another DISTINCT is usually two questions, not one fancy COUNT.'),
  q('interview-nulls', 'NULL three-valued logic',
    'SQL interview: why WHERE col <> \'x\' dropped the NULLs',
    'NULL <> \'x\' is unknown. WHERE keeps only true.',
    'SQL interview: three-valued logic in SQL Server. NULL comparisons.',
    'The filter is not false. It is unknown. Unknown rows vanish.',
    'All orders that are not Cancelled, including those with a NULL status.',
    'WHERE status <> \'Cancelled\' OR status IS NULL',
    `SELECT * FROM Orders
WHERE status <> 'Cancelled' OR status IS NULL;

-- or
WHERE ISNULL(status, '') <> 'Cancelled';`,
    'ISNULL in a WHERE can kill a seek. The OR IS NULL form is the honest one.'),
];
