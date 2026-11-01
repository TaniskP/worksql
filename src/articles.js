// T-SQL reference pages: the things people type into Google at work, answered properly,
// each ending in a ticket to try it on. Rendered on the server so search engines can read them.

const { esc, sql, c } = require('./article-html');
const extra = require('./topics');
const { navInner } = require('./nav');
const { catalogSearch, searchBits } = require('./search');

const core = [
  {
    slug: 'getdate', name: 'GETDATE()', lesson: 5,
    title: 'SQL Server GETDATE(): today, yesterday and the last 7 days',
    short: 'Today, yesterday, last week. And why “last 7 days” keeps including today.',
    description: 'How to use GETDATE() in SQL Server to filter today, yesterday and the last 7 days, and the mistake that includes today’s rows by accident.',
    lede: 'GETDATE() returns the current date and time on the server. Most of the time you want a date range built from it, and the time part is what trips people up.',
    body: () => `
<h2>What GETDATE() returns</h2>
${sql('SELECT GETDATE() AS now;   -- 2026-10-31 09:14:27.183')}
<p>It is a ${c('datetime')}: date <em>and</em> time, to the millisecond. Compare a date column against it and the time part comes along for the ride.</p>
<h2>Midnight today</h2>
<p>Cast it to ${c('date')} to drop the time. That gives you the start of today, which is the anchor for every range below.</p>
${sql('SELECT CAST(GETDATE() AS date) AS today;   -- 2026-10-31')}
<h2>Today’s rows</h2>
${sql(`SELECT order_id, total_amount
FROM Orders
WHERE order_date >= CAST(GETDATE() AS date)
  AND order_date <  DATEADD(day, 1, CAST(GETDATE() AS date));`)}
<h2>Yesterday</h2>
${sql(`WHERE order_date >= DATEADD(day, -1, CAST(GETDATE() AS date))
  AND order_date <  CAST(GETDATE() AS date)`)}
<h2>The last 7 days, not including today</h2>
${sql(`SELECT order_id, order_date, total_amount
FROM Orders
WHERE order_date >= DATEADD(day, -7, CAST(GETDATE() AS date))
  AND order_date <  CAST(GETDATE() AS date)
ORDER BY order_date DESC;`)}
<p>Two ends: greater than or equal to midnight seven days ago, and strictly less than midnight today. This pair works whether the column is a ${c('date')} or a ${c('datetime')}.</p>
<div class="mistake"><b>The usual mistake</b>
<p>${c('WHERE order_date >= DATEADD(day, -7, GETDATE())')} has no upper bound, so this morning’s orders sneak in. It also starts the range at <em>this time</em> seven days ago, not midnight, so half of that first day goes missing. When someone asks for “last week” they almost always mean whole days, ending yesterday.</p></div>
<h2>Avoid wrapping the column</h2>
<p>${c('WHERE CAST(order_date AS date) = CAST(GETDATE() AS date)')} works, but putting a function on the column can stop SQL Server using an index on it. Comparing the bare column with a range, as above, keeps it fast on big tables.</p>
<h2>Related functions</h2>
<p>${c('SYSDATETIME()')} is the same idea with more precision (${c('datetime2')}). ${c('CURRENT_TIMESTAMP')} is the ANSI spelling of ${c('GETDATE()')}. ${c('GETUTCDATE()')} gives UTC.</p>`,
  },
  {
    slug: 'dateadd', name: 'DATEADD', lesson: 6,
    title: 'DATEADD in SQL Server: add or subtract days, weeks, months',
    short: 'Move a date backwards or forwards by any unit.',
    description: 'DATEADD syntax and examples in SQL Server: subtract days, add months, start of last month, and the end-of-month behaviour to watch for.',
    lede: 'DATEADD moves a date by a number of units. Negative numbers go back in time. It is how almost every “last N days” filter is written.',
    body: () => `
<h2>Syntax</h2>
${sql('DATEADD(datepart, number, date)')}
<p>The date part is written as a word, not a string: ${c('day')}, ${c('week')}, ${c('month')}, ${c('year')}, ${c('hour')}, ${c('minute')}. Short forms like ${c('dd')} and ${c('mm')} also work but are harder to read.</p>
<h2>Examples</h2>
${sql(`SELECT DATEADD(day,   -30, CAST(GETDATE() AS date)) AS thirty_days_ago,
       DATEADD(week,   -1, CAST(GETDATE() AS date)) AS a_week_ago,
       DATEADD(month,   1, '2026-01-15')             AS next_month,
       DATEADD(year,   -1, CAST(GETDATE() AS date)) AS a_year_ago;`)}
<h2>Orders from the last 30 days</h2>
${sql(`SELECT order_id, order_date, total_amount
FROM Orders
WHERE order_date >= DATEADD(day, -30, CAST(GETDATE() AS date))
  AND order_date <  CAST(GETDATE() AS date)
ORDER BY total_amount DESC;`)}
<h2>The first day of last month</h2>
${sql(`SELECT DATEADD(month, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AS start_of_last_month;`)}
<div class="mistake"><b>Watch the end of the month</b>
<p>${c("DATEADD(month, 1, '2026-01-31')")} returns ${c('2026-02-28')}. SQL Server clamps to the last day of the shorter month instead of overflowing. Adding a month back again won’t take you to the 31st.</p></div>
<p>DATEADD keeps the type you give it: pass a ${c('date')} and you get a ${c('date')}, pass ${c('GETDATE()')} and you keep the time part.</p>`,
  },
  {
    slug: 'datediff', name: 'DATEDIFF', lesson: 5,
    title: 'DATEDIFF in SQL Server: the number of days between two dates',
    short: 'Days, months or years between two dates, and the boundary rule.',
    description: 'How DATEDIFF counts in SQL Server (boundaries crossed, not time elapsed), with examples for days since an order and age in months.',
    lede: 'DATEDIFF counts how many boundaries of a unit you cross going from one date to another. That is not quite the same as how much time has passed.',
    body: () => `
<h2>Syntax</h2>
${sql('DATEDIFF(datepart, start_date, end_date)')}
<p>The result is ${c('end - start')}: positive when the end is later.</p>
<h2>Days since each customer’s last order</h2>
${sql(`SELECT customer_id,
       MAX(order_date) AS last_order,
       DATEDIFF(day, MAX(order_date), GETDATE()) AS days_since
FROM Orders
GROUP BY customer_id
ORDER BY days_since DESC;`)}
<div class="mistake"><b>Boundaries, not elapsed time</b>
<p>${c("DATEDIFF(year, '2025-12-31', '2026-01-01')")} is 1, even though one day passed. ${c("DATEDIFF(day, '2026-10-30 23:59', '2026-10-31 00:01')")} is 1, after two minutes. Use the unit you actually mean, and don’t use years to work out someone’s age.</p></div>
<h2>Last 7 days with DATEDIFF</h2>
${sql(`WHERE DATEDIFF(day, order_date, GETDATE()) BETWEEN 1 AND 7`)}
<p>This gives the same rows as a ${c('DATEADD')} range, but it wraps the column in a function, so SQL Server can’t use an index on ${c('order_date')}. On big tables, prefer the range form shown on the <a href="/tsql/getdate">GETDATE page</a>.</p>`,
  },
  {
    slug: 'isnull', name: 'ISNULL', lesson: 7,
    title: 'ISNULL vs COALESCE in SQL Server: replace NULL with a value',
    short: 'Swap NULL for a word or a zero. ISNULL or COALESCE?',
    description: 'Replace NULL in SQL Server with ISNULL or COALESCE. Examples, the column-name gotcha, and the differences between the two.',
    lede: 'NULL means “nobody filled this in”. Reports usually want a word or a zero instead. ISNULL swaps it for whatever you give it.',
    body: () => `
<h2>Syntax</h2>
${sql("ISNULL(column, replacement)")}
<h2>Example</h2>
${sql(`SELECT customer_id,
       first_name,
       ISNULL(phone, 'No phone') AS phone
FROM Customers;`)}
<div class="mistake"><b>Don’t lose the header</b>
<p>Wrap a column in a function and SQL Server names it “(No column name)”. Add ${c('AS phone')} to give the header back, or whoever pastes your results into a template will ask.</p></div>
<h2>Zero instead of NULL in totals</h2>
${sql(`SELECT p.product_name,
       ISNULL(r.units_returned, 0) AS units_returned
FROM Products p
LEFT JOIN (SELECT product_id, SUM(quantity) AS units_returned
           FROM Returns GROUP BY product_id) r
  ON r.product_id = p.product_id;`)}
<h2>ISNULL or COALESCE?</h2>
<ul>
<li>${c('COALESCE(a, b, c)')} takes any number of arguments and returns the first that isn’t NULL. ${c('ISNULL')} takes exactly two.</li>
<li>${c('COALESCE')} is standard SQL and works in other databases. ${c('ISNULL')} is SQL Server only.</li>
<li>${c('ISNULL')} returns the type of the first argument, so a long replacement can be cut short to fit the column’s length. ${c('COALESCE')} picks a type that fits all its arguments.</li>
</ul>
<p>In day-to-day SQL Server reports either is fine. Pick one and be consistent.</p>
<h2>Testing for NULL</h2>
<p>To filter, use ${c('WHERE phone IS NULL')}. ${c('= NULL')} is never true, not even for NULL.</p>`,
  },
  {
    slug: 'top', name: 'TOP', lesson: 11,
    title: 'SELECT TOP in SQL Server, and why it needs ORDER BY',
    short: 'The first N rows. Meaningless without ORDER BY.',
    description: 'How SELECT TOP works in SQL Server: TOP n, TOP (n), TOP PERCENT, WITH TIES, and why TOP without ORDER BY returns arbitrary rows.',
    lede: 'TOP limits how many rows come back. SQL Server’s version of LIMIT. On its own it doesn’t pick the biggest, the newest or anything else.',
    body: () => `
<h2>The five biggest orders</h2>
${sql(`SELECT TOP (5) order_id, customer_id, total_amount
FROM Orders
ORDER BY total_amount DESC;`)}
<p>${c('TOP 5')} and ${c('TOP (5)')} both work. The brackets are required when the number is a variable or an expression, so many people always use them.</p>
<div class="mistake"><b>TOP without ORDER BY</b>
<p>${c('SELECT TOP 5 * FROM Orders')} returns five rows, but which five is up to SQL Server. It might look sorted today and not next week. If the question says biggest, newest or first, you need ORDER BY.</p></div>
<h2>Ties</h2>
${sql(`SELECT TOP (3) WITH TIES customer_id, total_spent
FROM CustomerTotals
ORDER BY total_spent DESC;`)}
<p>${c('WITH TIES')} keeps any extra rows that tie with the last one, so you might get more than three.</p>
<h2>A percentage</h2>
${sql('SELECT TOP (10) PERCENT order_id, total_amount FROM Orders ORDER BY total_amount DESC;')}
<h2>Coming from MySQL or PostgreSQL?</h2>
<p>SQL Server doesn’t have ${c('LIMIT')}. Use ${c('TOP')}, or ${c('OFFSET … FETCH NEXT … ROWS ONLY')} after an ORDER BY for paging.</p>`,
  },
  {
    slug: 'group-by-month', name: 'Group by month', lesson: 23,
    title: 'Group by month in SQL Server: CONVERT, FORMAT and DATEFROMPARTS',
    short: 'Monthly totals from daily rows, three ways.',
    description: 'Three ways to group by month in SQL Server: CONVERT(char(7), date, 120), FORMAT(date, \'yyyy-MM\') and DATEFROMPARTS. Examples with revenue by month.',
    lede: 'Finance always wants it by month. The trick is turning each date into one value per month, then grouping by that exact expression.',
    body: () => `
<h2>CONVERT to yyyy-mm text</h2>
${sql(`SELECT CONVERT(char(7), order_date, 120) AS month,
       SUM(total_amount) AS revenue
FROM Orders
WHERE status = 'Shipped'
GROUP BY CONVERT(char(7), order_date, 120)
ORDER BY month;`)}
<p>Style 120 formats a date as ${c('yyyy-mm-dd hh:mi:ss')}. A ${c('char(7)')} only has room for the first seven characters: ${c('2026-03')}. Text in this format sorts in date order, which is handy.</p>
<h2>FORMAT</h2>
${sql(`SELECT FORMAT(order_date, 'yyyy-MM') AS month, SUM(total_amount) AS revenue
FROM Orders
GROUP BY FORMAT(order_date, 'yyyy-MM');`)}
<p>Easier to read, and you can write ${c("'MMM yyyy'")} for “Mar 2026”. It is noticeably slower on large tables, so prefer CONVERT for big reports.</p>
<h2>Keep it a real date</h2>
${sql(`SELECT DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1) AS month_start,
       SUM(total_amount) AS revenue
FROM Orders
GROUP BY DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1);`)}
<p>This returns the first of each month as a ${c('date')}, which Excel and Power BI treat as a date rather than text. On SQL Server 2022 you can write ${c('DATETRUNC(month, order_date)')} instead.</p>
<div class="mistake"><b>GROUP BY the alias</b>
<p>${c('GROUP BY month')} fails in SQL Server: GROUP BY is worked out before SELECT, so the alias doesn’t exist yet. Repeat the expression, or put it in a CTE first.</p></div>`,
  },
  {
    slug: 'case-when', name: 'CASE WHEN', lesson: 17,
    title: 'CASE WHEN in SQL Server: label rows for a report',
    short: 'Small, Medium, Large. If-then-else inside a query.',
    description: 'CASE WHEN examples in SQL Server: label rows into bands, count per band, and conditional totals with SUM(CASE ...). Plus the boundary mistake.',
    lede: 'CASE is if-then-else for a column. It checks each WHEN in order and returns the first match, or the ELSE if nothing matches.',
    body: () => `
<h2>Label orders by size</h2>
${sql(`SELECT order_id,
       total_amount,
       CASE
         WHEN total_amount < 50   THEN 'Small'
         WHEN total_amount <= 150 THEN 'Medium'
         ELSE 'Large'
       END AS size
FROM Orders;`)}
<p>Order matters. An order of £40 matches the first WHEN and stops there, so the second WHEN only ever sees £50 and up.</p>
<div class="mistake"><b>Check the edges</b>
<p>Is exactly £50 Small or Medium? Is £150 Medium or Large? ${c('<')} versus ${c('<=')} decides it, and a report that disagrees with the slide by one order is the kind of thing that gets noticed. Without ELSE, anything that matches nothing becomes NULL.</p></div>
<h2>Count per band</h2>
${sql(`SELECT CASE WHEN total_amount < 50 THEN 'Small'
            WHEN total_amount <= 150 THEN 'Medium'
            ELSE 'Large' END AS size,
       COUNT(*) AS order_count
FROM Orders
GROUP BY CASE WHEN total_amount < 50 THEN 'Small'
              WHEN total_amount <= 150 THEN 'Medium'
              ELSE 'Large' END;`)}
<p>SQL Server won’t let you ${c('GROUP BY size')}, so either repeat the CASE or build the label in a CTE.</p>
<h2>Conditional totals</h2>
${sql(`SELECT SUM(CASE WHEN status = 'Shipped'   THEN 1 ELSE 0 END) AS shipped,
       SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM Orders;`)}
<p>${c('IIF(condition, a, b)')} is a two-way shorthand for a simple CASE.</p>`,
  },
  {
    slug: 'left-join-is-null', name: 'LEFT JOIN … IS NULL', lesson: 19,
    title: 'Find rows with no match in SQL Server: LEFT JOIN … IS NULL',
    short: 'Customers who never ordered. Products that never sold.',
    description: 'Find rows with no matching row in another table in SQL Server using LEFT JOIN … WHERE … IS NULL or NOT EXISTS, with examples and the common mistakes.',
    lede: 'An inner JOIN only keeps rows that match on both sides. To find the ones that don’t match, keep everything from one side and look for the gaps.',
    body: () => `
<h2>Customers who have never ordered</h2>
${sql(`SELECT c.customer_id, c.first_name, c.last_name, c.email
FROM Customers c
LEFT JOIN Orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;`)}
<p>LEFT JOIN keeps every customer. Where there’s no order, every column from Orders comes back NULL, so filtering on a column that is never NULL in a real order (its key) leaves only the customers with none.</p>
<div class="mistake"><b>Three ways to get it wrong</b>
<p>Using a plain JOIN returns nothing. Writing ${c('= NULL')} instead of ${c('IS NULL')} returns nothing. Putting an extra condition on Orders in the WHERE clause (say, ${c("o.status = 'Shipped'")}) quietly turns the LEFT JOIN back into an inner join. Put conditions on the right-hand table in the ON clause instead.</p></div>
<h2>The same with NOT EXISTS</h2>
${sql(`SELECT p.product_id, p.product_name
FROM Products p
WHERE NOT EXISTS (SELECT 1 FROM OrderLines ol WHERE ol.product_id = p.product_id);`)}
<p>NOT EXISTS reads closer to the question and never duplicates rows. Both forms are fine in SQL Server. Avoid ${c('NOT IN (subquery)')} when the subquery can return NULL: one NULL makes the whole thing return nothing.</p>`,
  },
  {
    slug: 'row-number', name: 'ROW_NUMBER', lesson: 30,
    title: 'ROW_NUMBER in SQL Server: the latest row per group',
    short: 'Latest order per customer, the whole row.',
    description: 'Use ROW_NUMBER() OVER (PARTITION BY … ORDER BY …) in SQL Server to get the latest or first row per group, and why you can’t filter it in the same WHERE.',
    lede: 'MAX gives you the latest date per customer. When you want the whole latest row (its ID and amount too) you number the rows and keep number 1.',
    body: () => `
<h2>Number each customer’s orders</h2>
${sql(`SELECT customer_id, order_id, order_date,
       ROW_NUMBER() OVER (PARTITION BY customer_id
                          ORDER BY order_date DESC, order_id DESC) AS rn
FROM Orders;`)}
<p>PARTITION BY restarts the numbering for each customer. ORDER BY decides who gets 1. The second sort column settles ties, so two orders on the same day don’t both claim first place at random.</p>
<h2>Keep number 1</h2>
${sql(`WITH ranked AS (
  SELECT customer_id, order_id, order_date, total_amount,
         ROW_NUMBER() OVER (PARTITION BY customer_id
                            ORDER BY order_date DESC, order_id DESC) AS rn
  FROM Orders
)
SELECT customer_id, order_id, order_date, total_amount
FROM ranked
WHERE rn = 1
ORDER BY customer_id;`)}
<div class="mistake"><b>“Invalid column name 'rn'”</b>
<p>Adding ${c('WHERE rn = 1')} to the first query fails. SQL Server works out WHERE before SELECT, so the alias doesn’t exist yet, and window functions aren’t allowed in WHERE anyway. Wrap it in a CTE or subquery and filter outside.</p></div>
<h2>ROW_NUMBER, RANK or DENSE_RANK?</h2>
<p>${c('ROW_NUMBER')} always gives 1, 2, 3. ${c('RANK')} gives ties the same number and skips (1, 1, 3). ${c('DENSE_RANK')} gives ties the same number without gaps (1, 1, 2). For “one row per group” you want ROW_NUMBER.</p>`,
  },
  {
    slug: 'invalid-in-the-select-list', name: 'GROUP BY error 8120', lesson: 38,
    title: 'Fix “Column is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause”',
    short: 'Msg 8120, explained and fixed.',
    description: 'What SQL Server error Msg 8120 means (“is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause”) and three ways to fix it.',
    lede: 'Msg 8120 means you asked for one row per group, but also asked for a column that could have many different values in that group. SQL Server won’t guess which one you meant.',
    body: () => `
<h2>The error</h2>
${sql(`SELECT status, customer_id, COUNT(*) AS order_count
FROM Orders
GROUP BY status;
-- Msg 8120, Level 16: Column 'Orders.customer_id' is invalid in the select list
-- because it is not contained in either an aggregate function or the GROUP BY clause.`)}
<p>There is one row per status, but each status has many customers. Which ${c('customer_id')} should go on the row? SQL Server refuses to pick. (MySQL and SQLite sometimes do pick one at random, which is worse.)</p>
<h2>Fix 1: group by it too</h2>
${sql(`SELECT status, customer_id, COUNT(*) AS order_count
FROM Orders
GROUP BY status, customer_id;`)}
<p>Now there’s a row per status per customer. Right if that’s what you wanted.</p>
<h2>Fix 2: aggregate it</h2>
${sql(`SELECT status, COUNT(DISTINCT customer_id) AS customers, COUNT(*) AS order_count
FROM Orders
GROUP BY status;`)}
<h2>Fix 3: you forgot GROUP BY entirely</h2>
${sql(`SELECT status, COUNT(*) AS order_count
FROM Orders
GROUP BY status;   -- without this line, COUNT(*) is one total for the whole table`)}
<div class="mistake"><b>The alias version</b>
<p>${c('GROUP BY size')} where ${c('size')} is a CASE alias gives a similar error. GROUP BY runs before SELECT, so repeat the CASE expression or put it in a CTE.</p></div>`,
  },
  {
    kind: 'guide', slug: 'last-week-orders', name: 'Last week’s orders', lesson: 5,
    title: 'How to pull last week’s orders in SQL Server (not “the last 7 days”)',
    short: 'Monday–Sunday last week, not a rolling 7 days ending now.',
    description: 'The SQL Server date filter for last week’s orders: whole days, Monday to Sunday (or Sunday to Saturday), without today’s rows sneaking in.',
    lede: 'When someone says “last week’s orders” they mean the calendar week that just finished, not a sliding window of 168 hours. Those two queries return different money.',
    body: () => `
<h2>What they actually asked for</h2>
<p>James wants last week. If today is Thursday 30 October, last week is Monday 20 to Sunday 26, not “from last Thursday until now”. A rolling ${c('DATEADD(day, -7, GETDATE())')} includes this morning and drops half of last Thursday.</p>
<h2>UK week: Monday to Sunday</h2>
${sql(`DECLARE @today date = CAST(GETDATE() AS date);
DECLARE @thisMonday date = DATEADD(day, 1 - DATEPART(weekday, DATEADD(day, -1, @today)), @today);
-- weekday of Monday after shifting so Monday = 1, when DATEFIRST is 7 (US default)

SELECT order_id, order_date, total_amount
FROM Orders
WHERE order_date >= DATEADD(week, -1, @thisMonday)
  AND order_date <  @thisMonday
ORDER BY order_date;`)}
<p>SQL Server’s ${c('DATEPART(weekday, …)')} depends on ${c('DATEFIRST')}. The safer habit on a shared server is to pin the week yourself.</p>
<h2>A version that does not care about DATEFIRST</h2>
${sql(`DECLARE @today date = CAST(GETDATE() AS date);
DECLARE @thisMonday date = DATEADD(day, -(DATEDIFF(day, '20000103', @today) % 7), @today);
-- 3 Jan 2000 was a Monday

SELECT order_id, customer_id, total_amount, order_date
FROM Orders
WHERE order_date >= DATEADD(day, -7, @thisMonday)
  AND order_date <  @thisMonday;`)}
<div class="mistake"><b>The rolling 7 days</b>
<p>${c('WHERE order_date >= DATEADD(day, -7, GETDATE())')} is “the last 7 × 24 hours”. Finance will reconcile it against last week’s pack and the numbers will not match. If they said last week, give them last week.</p></div>
<h2>Send the total with it</h2>
${sql(`SELECT COUNT(*) AS orders, SUM(total_amount) AS revenue
FROM Orders
WHERE order_date >= DATEADD(day, -7, @thisMonday)
  AND order_date <  @thisMonday;`)}
<p>Put the range in the email subject: “Orders Mon 20–Sun 26 Oct”. Then nobody asks whether today is in it.</p>`,
  },
  {
    kind: 'guide', slug: 'yesterday-sales', name: 'Yesterday’s sales', lesson: 37,
    title: 'Yesterday’s sales in SQL Server: a date filter that does not leak today',
    short: 'Midnight to midnight. Today’s orders stay out.',
    description: 'How to write yesterday’s sales in SQL Server so GETDATE() does not pull through this morning’s orders.',
    lede: '“Yesterday” sounds like one line. Most leaked reports use GETDATE() on both ends and quietly include this morning.',
    body: () => `
<h2>The range</h2>
${sql(`DECLARE @today date = CAST(GETDATE() AS date);

SELECT order_id, order_date, total_amount, status
FROM Orders
WHERE order_date >= DATEADD(day, -1, @today)
  AND order_date <  @today
ORDER BY order_date;`)}
<p>Lower bound is midnight yesterday. Upper bound is midnight today, not included. Works for ${c('date')} and ${c('datetime')} columns.</p>
<div class="mistake"><b>These two look right and are not</b>
<p>${c('WHERE CAST(order_date AS date) = CAST(GETDATE() AS date)')} is <em>today</em>. ${c('WHERE order_date >= DATEADD(day, -1, GETDATE())')} starts at this <em>time</em> yesterday and has no end, so today’s rows come with it.</p></div>
<h2>One number for the stand-up</h2>
${sql(`SELECT COUNT(*) AS orders,
       SUM(total_amount) AS revenue,
       SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM Orders
WHERE order_date >= DATEADD(day, -1, CAST(GETDATE() AS date))
  AND order_date <  CAST(GETDATE() AS date);`)}
<p>If they also want “same day last week”, subtract 8 and 7 days from midnight today. Same shape, different bounds.</p>`,
  },
  {
    kind: 'guide', slug: 'why-select-star-fails', name: 'Why SELECT * fails', lesson: 1,
    title: 'Why SELECT * is a problem at work (and why we mark it wrong)',
    short: 'Extra columns break the paste. Name what they asked for.',
    description: 'Why SELECT * is refused in workplace SQL Server reports: column order, extra fields, and the habit that survives a schema change.',
    lede: 'SELECT * feels faster. The person who asked for three columns will paste your result into a sheet that has three headers. The fourth column wrecks the paste.',
    body: () => `
<h2>What they asked for</h2>
<p>Amy wants ${c('order_id')}, ${c('customer_id')}, ${c('total_amount')}. That is the contract. ${c('SELECT *')} also returns dates, status, staff ids, whatever the table grew last Tuesday.</p>
${sql(`-- What they asked for
SELECT order_id, customer_id, total_amount
FROM Orders
WHERE status = 'Shipped'
ORDER BY total_amount DESC;`)}
<h2>It also breaks next month</h2>
<p>Add a column to ${c('Orders')} and every ${c('SELECT *')} downstream changes shape. Named columns keep last quarter’s workbook working.</p>
<div class="mistake"><b>“I’ll drop the extras in Excel”</b>
<p>You will, the first time. The fifth time, someone else runs the script and they will not. Write the columns once.</p></div>
<h2>When SELECT * is fine</h2>
<p>Peeking in SSMS. ${c('SELECT TOP (20) * FROM Orders')} to see what a table looks like. Not in anything you send, save, or schedule.</p>`,
  },
  {
    kind: 'guide', slug: 'where-vs-having', name: 'WHERE vs HAVING', lesson: 16,
    title: 'WHERE vs HAVING in SQL Server: filter rows, then filter groups',
    short: 'WHERE is before the group. HAVING is after the total.',
    description: 'The difference between WHERE and HAVING in SQL Server, with a workplace example: customers who have spent over £1,000.',
    lede: 'WHERE throws rows away before you total them. HAVING throws groups away after. Use the wrong one and either the query fails or the total is of the wrong pile.',
    body: () => `
<h2>Customers over £1,000</h2>
${sql(`SELECT customer_id, SUM(total_amount) AS spent
FROM Orders
WHERE status = 'Shipped'          -- drop rows first
GROUP BY customer_id
HAVING SUM(total_amount) > 1000  -- then drop groups
ORDER BY spent DESC;`)}
<p>${c('WHERE status = \'Shipped\'')} belongs on the row. ${c('HAVING SUM(total_amount) > 1000')} can only exist after ${c('GROUP BY')}.</p>
<div class="mistake"><b>HAVING on a raw column</b>
<p>${c('HAVING status = \'Shipped\'')} without grouping by status is the 8120 family of pain. If it is not an aggregate and not in GROUP BY, it is a WHERE.</p></div>
<h2>You cannot put SUM in WHERE</h2>
${sql(`-- Fails
WHERE SUM(total_amount) > 1000`)}
<p>WHERE runs too early. The total does not exist yet. That is the whole distinction.</p>`,
  },
  {
    kind: 'guide', slug: 'count-vs-count-distinct', name: 'COUNT vs COUNT DISTINCT', lesson: 13,
    title: 'COUNT(*) vs COUNT(DISTINCT …) in SQL Server',
    short: 'Orders vs customers. Easy to mix up in a stand-up number.',
    description: 'When to use COUNT(*) and COUNT(DISTINCT column) in SQL Server, and how a JOIN quietly inflates the count.',
    lede: '“How many customers ordered last week?” is not the same question as “how many orders.” COUNT(*) answers the second. The first needs DISTINCT, or a count of customers.',
    body: () => `
<h2>Three numbers finance actually wants</h2>
${sql(`SELECT COUNT(*) AS orders,
       COUNT(DISTINCT customer_id) AS customers,
       SUM(total_amount) AS revenue
FROM Orders
WHERE order_date >= DATEADD(day, -7, CAST(GETDATE() AS date))
  AND order_date <  CAST(GETDATE() AS date);`)}
<p>${c('COUNT(*)')} counts rows. ${c('COUNT(customer_id)')} counts non-NULL ids (usually the same). ${c('COUNT(DISTINCT customer_id)')} counts people.</p>
<div class="mistake"><b>A JOIN then COUNT(*)</b>
<p>Join ${c('OrderLines')} and ${c('COUNT(*)')} becomes line items, not orders. If the grain changed, say so in the column name (${c('AS lines')}), or count ${c('DISTINCT order_id')}.</p></div>
<h2>COUNT(*) vs COUNT(column)</h2>
<p>${c('COUNT(*)')} includes rows where the column is NULL. ${c('COUNT(phone)')} skips NULL phones. That is how “customers” and “customers we can call” diverge.</p>`,
  },
  {
    kind: 'guide', slug: 'join-doubled-my-totals', name: 'JOIN doubled my totals', lesson: 36,
    title: 'My JOIN doubled the totals: the SQL Server grain mistake',
    short: 'One order, many lines. SUM after the join is wrong.',
    description: 'Why a JOIN to a child table doubles SQL Server totals, and how to aggregate the lines first or count distinct orders.',
    lede: 'You joined Orders to OrderLines to get product names and the revenue doubled. Nothing is wrong with SUM. The grain changed and nobody told SUM.',
    body: () => `
<h2>What happened</h2>
<p>One order of £90 with three lines becomes three rows after the join. ${c('SUM(o.total_amount)')} adds £90 three times.</p>
${sql(`-- Inflated
SELECT SUM(o.total_amount) AS revenue
FROM Orders o
JOIN OrderLines ol ON ol.order_id = o.order_id;`)}
<h2>Aggregate the lines first</h2>
${sql(`SELECT o.order_id, o.total_amount, x.lines, x.units
FROM Orders o
JOIN (
  SELECT order_id, COUNT(*) AS lines, SUM(quantity) AS units
  FROM OrderLines
  GROUP BY order_id
) x ON x.order_id = o.order_id;`)}
<p>Now one row per order. Totals stay honest. You can still ${c('SUM(o.total_amount)')} outside.</p>
<div class="mistake"><b>SUM(line price) vs order total</b>
<p>If you want revenue from lines, sum ${c('quantity * unit_price')} on ${c('OrderLines')}. If you want the order total, stay on ${c('Orders')} and do not join lines in the same grain.</p></div>`,
  },
  {
    kind: 'guide', slug: 'find-duplicate-customers', name: 'Find duplicate customers', lesson: 28,
    title: 'Find duplicate customers in SQL Server',
    short: 'Same email twice. GROUP BY and HAVING.',
    description: 'How to find duplicate customers in SQL Server with GROUP BY and HAVING COUNT(*) > 1, then list the actual rows.',
    lede: 'Someone typed the same person in twice. Reports count them as two customers. You want the keys that collide, then the rows.',
    body: () => `
<h2>Which emails appear more than once</h2>
${sql(`SELECT LOWER(LTRIM(RTRIM(email))) AS email, COUNT(*) AS times
FROM Customers
GROUP BY LOWER(LTRIM(RTRIM(email)))
HAVING COUNT(*) > 1
ORDER BY times DESC;`)}
<p>Trim and lower first. ${c('Sam@Harbour.co')} and ${c('sam@harbour.co')} are one person in the real world.</p>
<h2>Then the actual rows</h2>
${sql(`SELECT c.customer_id, c.first_name, c.last_name, c.email
FROM Customers c
WHERE LOWER(LTRIM(RTRIM(c.email))) IN (
  SELECT LOWER(LTRIM(RTRIM(email)))
  FROM Customers
  GROUP BY LOWER(LTRIM(RTRIM(email)))
  HAVING COUNT(*) > 1
)
ORDER BY c.email, c.customer_id;`)}
<div class="mistake"><b>Matching on name only</b>
<p>Two John Smiths are not always a duplicate. Email, phone, or a customer code is safer. Name + postcode if that is all you have, and still check by eye before you merge.</p></div>`,
  },
  {
    kind: 'guide', slug: 'convert-datetime-to-date', name: 'Datetime to date', lesson: 5,
    title: 'Convert datetime to date in SQL Server without breaking the index',
    short: 'CAST to date for the value. Do not wrap the column in the WHERE.',
    description: 'How to convert datetime to date in SQL Server, and why CAST(column AS date) in the WHERE clause can slow a big table down.',
    lede: 'You want “on this day”, but the column has a time. Cast the value you compare against, not the whole column, if you can help it.',
    body: () => `
<h2>Drop the time on a value</h2>
${sql(`SELECT CAST(GETDATE() AS date) AS today,
       CONVERT(date, GETDATE()) AS also_today;`)}
<p>Either is fine. ${c('CAST')} is easier to read.</p>
<h2>Filter a datetime column by a day</h2>
${sql(`DECLARE @day date = '2026-10-30';

SELECT order_id, order_date
FROM Orders
WHERE order_date >= @day
  AND order_date <  DATEADD(day, 1, @day);`)}
<p>The column stays bare. SQL Server can use an index on ${c('order_date')}.</p>
<div class="mistake"><b>Wrapping the column</b>
<p>${c('WHERE CAST(order_date AS date) = @day')} is easy and often “fine” on a small table. On a large one it can force a scan. Same rows, slower plan.</p></div>
<h2>Showing a date in the result</h2>
${sql(`SELECT order_id, CAST(order_date AS date) AS order_day, total_amount
FROM Orders;`)}
<p>Casting in SELECT is about the header you send. That does not hurt the filter.</p>`,
  },
  {
    kind: 'guide', slug: 'cte-for-reports', name: 'CTEs for reports', lesson: 29,
    title: 'CTEs in SQL Server: name a step so the report can be read',
    short: 'WITH name AS (…): write the query in the order you think.',
    description: 'How to use a CTE in SQL Server for workplace reports: last order per customer, then filter, without a nested mess.',
    lede: 'A CTE is a named subquery at the top. You write the steps in the order a colleague can read them. SQL Server does not care; the next person does.',
    body: () => `
<h2>Last order date, then the quiet customers</h2>
${sql(`WITH last_order AS (
  SELECT customer_id, MAX(order_date) AS last_date
  FROM Orders
  GROUP BY customer_id
)
SELECT c.customer_id, c.first_name, c.last_name, lo.last_date
FROM Customers c
JOIN last_order lo ON lo.customer_id = c.customer_id
WHERE lo.last_date < DATEADD(day, -90, CAST(GETDATE() AS date))
ORDER BY lo.last_date;`)}
<p>Read it top to bottom: build last order, join names, keep 90 days quiet. The same thing as a nested FROM, without the nest.</p>
<div class="mistake"><b>A CTE is not a table</b>
<p>It lives for one statement. The next query cannot see ${c('last_order')} unless you write the WITH again, or you make a real temp table / view.</p></div>
<h2>When to use one</h2>
<p>You need a result twice. You need to filter a ${c('ROW_NUMBER')}. You are about to nest three levels and you can still smell the fire drill. Start a CTE.</p>`,
  },
  {
    kind: 'guide', slug: 'ssms-run-a-query', name: 'Run a query in SSMS', lesson: 1,
    title: 'How to run a query in SSMS (F5, the selection, and the wrong database)',
    short: 'Highlight the batch. Check the database dropdown. Then F5.',
    description: 'How to execute T-SQL in SQL Server Management Studio: F5, Execute, highlighting a batch, and the wrong-database mistake.',
    lede: 'SSMS will run whatever is in the window, or whatever you highlighted. The other classic is running it against master because the dropdown was not on the company database.',
    body: () => `
<h2>Execute</h2>
<ul>
<li>F5, or Ctrl+E, or the Execute button on the toolbar.</li>
<li>Highlight a statement first if the file has more than one. SSMS runs the highlight, not the whole script.</li>
<li>Results land in the grid. Messages is where row counts and errors go.</li>
</ul>
<h2>The database dropdown</h2>
<p>Top left. If it says ${c('master')} and you query ${c('Orders')}, you get “Invalid object name”. Pick the database, or start the script with ${c('USE Harbour;')} (your real name, not ours).</p>
${sql(`USE Harbour;
GO
SELECT TOP (20) order_id, order_date, total_amount
FROM Orders
ORDER BY order_date DESC;`)}
<div class="mistake"><b>GO is not T-SQL</b>
<p>${c('GO')} is an SSMS batch splitter. It is not a SQL Server keyword. Do not put it in a stored procedure or in an app. A blank line is enough between statements in a normal query.</p></div>
<h2>Stop a runaway</h2>
<p>The red square, or Alt+Break. If you forgot the WHERE on a big update, that is the button. We do not run updates on WorkSQL. At work, that is the one that matters.</p>`,
  },
  {
    kind: 'guide', slug: 'between-dates-inclusive', name: 'BETWEEN dates', lesson: 5,
    title: 'BETWEEN two dates in SQL Server: the inclusive trap',
    short: 'BETWEEN includes both ends. A datetime end includes 00:00 that day only.',
    description: 'Why BETWEEN start AND end is a trap on datetime columns in SQL Server, and the half-open range to use instead.',
    lede: 'BETWEEN is inclusive on both sides. On a date column that is usually what you wanted. On a datetime, the end is midnight of that day, so almost the whole last day goes missing.',
    body: () => `
<h2>What people write</h2>
${sql(`-- Looks like 1–31 October. Drops almost all of the 31st if order_date has a time.
WHERE order_date BETWEEN '2026-10-01' AND '2026-10-31'`)}
<p>${c("'2026-10-31'")} becomes ${c('2026-10-31 00:00:00')}. An order at 09:14 on the 31st is after that, so it is out.</p>
<h2>The half-open range</h2>
${sql(`WHERE order_date >= '2026-10-01'
  AND order_date <  '2026-11-01'`)}
<p>First moment of the 1st, up to but not including the 1st of next month. Every clock time on the 31st is in.</p>
<div class="mistake"><b>BETWEEN and GETDATE()</b>
<p>${c('BETWEEN DATEADD(day, -7, GETDATE()) AND GETDATE()')} has a time on both ends. You lose the start of the first day and you include this morning. Use midnight bounds instead. See <a href="/guides/last-week-orders">last week’s orders</a>.</p></div>`,
  },
  {
    kind: 'guide', slug: 'email-the-numbers', name: 'Email the numbers', lesson: 5,
    title: 'How to email last week’s numbers so your manager can use them',
    short: 'Range in the subject. Columns they asked for. One total line.',
    description: 'A workplace habit for SQL Server reports: put the date range in the subject, name the columns, and send one total they can check.',
    lede: 'The query can be right and the email still useless. Managers paste. They do not want a novel. They want the range, the columns, and a total they can eyeball.',
    body: () => `
<h2>Subject line</h2>
<p><em>Harbour orders Mon 20–Sun 26 Oct — 142 orders, £18,410</em></p>
<p>If the range is in the subject, they do not have to ask whether today is included.</p>
<h2>The result they can paste</h2>
${sql(`SELECT order_id, order_date, customer_id, total_amount, status
FROM Orders
WHERE order_date >= '2026-10-20'
  AND order_date <  '2026-10-27'
ORDER BY order_date, order_id;`)}
<p>Headers match the sheet. No ${c('SELECT *')}. Ordered so two people get the same first row.</p>
<h2>The check total</h2>
${sql(`SELECT COUNT(*) AS orders, SUM(total_amount) AS revenue
FROM Orders
WHERE order_date >= '2026-10-20'
  AND order_date <  '2026-10-27';`)}
<p>One row. If their pivot is £200 off, you both look at the same number first. Then you argue about cancelled orders, not about the query.</p>
<div class="mistake"><b>Sending the query and no result</b>
<p>Half the office cannot run it. Send the grid (or a CSV) and keep the SQL underneath for the person who will ask “how did you get this?”</p></div>`,
  },
];

const articles = core.concat(extra);

const isGuide = (a) => a.kind === 'guide';
const pathOf = (a) => isGuide(a) ? `/guides/${a.slug}` : `/tsql/${a.slug}`;
const hubOf = (a) => isGuide(a) ? { href: '/guides', label: 'Guides' } : { href: '/tsql', label: 'T-SQL reference' };

function page({ title, description, body, canonical }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:type" content="article">` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap">
  <link rel="stylesheet" href="/css/app.css">
</head>
<body>
  <header class="site-header" style="border-bottom:1px solid var(--line)">
    <nav class="nav">
      <a href="/" class="logo"><svg viewBox="0 0 32 32" fill="none" width="26" height="26"><ellipse cx="16" cy="7" rx="11" ry="4" fill="#1f5eff"/><path d="M5 7v18c0 2.2 4.9 4 11 4s11-1.8 11-4V7c0 2.2-4.9 4-11 4S5 9.2 5 7Z" fill="#1f5eff" opacity=".75"/></svg>WorkSQL</a>
      ${navInner(canonical)}
      <div class="nav-actions"><a href="/work" class="btn btn-primary">Clock in</a></div>
    </nav>
  </header>
  <main>${body}</main>
  <footer class="footer"><div class="inner"><span>WorkSQL · SQL Server, five minutes.</span><div class="links"><a href="/guides">Guides</a><a href="/tools">Free tools</a><a href="/convert">Convert</a><a href="/interview">Interview</a><a href="/tsql">T-SQL reference</a><a href="/work">Work mode</a></div></div></footer>
</body>
</html>`;
}

function renderArticle(a, lesson, origin) {
  const hub = hubOf(a);
  const others = articles.filter((x) => x !== a && isGuide(x) === isGuide(a)).slice(0, 5);
  const ld = {
    '@context': 'https://schema.org', '@type': isGuide(a) ? 'Article' : 'TechArticle',
    headline: a.title, description: a.description, proficiencyLevel: 'Beginner',
    datePublished: '2026-10-31', dateModified: '2026-10-31',
    author: { '@type': 'Organization', name: 'WorkSQL' },
    publisher: { '@type': 'Organization', name: 'WorkSQL', url: origin || 'https://worksql.com' },
    mainEntityOfPage: origin ? `${origin}${pathOf(a)}` : undefined,
  };
  const tryIt = lesson
    ? `<section class="try">
      <h2>Try it on Harbour &amp; Co</h2>
      <p>${esc(lesson.from.name)} (${esc(lesson.from.role)}) needs this now: “${esc(lesson.title)}” Write the query, run it, send the results. ${lesson.free ? 'Free.' : 'On the paid plan.'}</p>
      <a class="btn btn-primary" href="/lesson/${lesson.id}">Take the ticket →</a>
    </section>`
    : `<section class="try"><h2>Try it at the desk</h2><p>Monday is free. Clock in and write the query yourself.</p><a class="btn btn-primary" href="/work">Clock in</a></section>`;
  const body = `<article class="article">
    <div class="crumb"><a href="${hub.href}">${esc(hub.label)}</a> › ${esc(a.name)}</div>
    <h1>${esc(a.title)}</h1>
    <p class="lede">${esc(a.lede)}</p>
    ${a.body()}
    ${tryIt}
    <section class="try" style="margin-top:16px">
      <h2>Learn it on a real ticket</h2>
      <p>Monday is free on WorkSQL. A colleague’s ticket lands, you write the T-SQL, we mark it. No videos. Five minutes.</p>
      <a class="btn btn-primary" href="/work">Clock in free</a>
      <a class="btn btn-ghost" href="/lessons" style="margin-left:8px">See Monday’s tickets</a>
    </section>
    <div class="related">More: ${others.map((x) => `<a href="${pathOf(x)}">${esc(x.name)}</a>`).join('')}</div>
    <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
  </article>`;
  return page({ title: `${a.title} | WorkSQL`, description: a.description, body, canonical: origin && `${origin}${pathOf(a)}` });
}

function renderIndex(origin) {
  const refs = articles.filter((a) => !isGuide(a));
  const body = `<article class="article">
    <h1>T-SQL reference</h1>
    <p class="lede">Short answers to the SQL Server functions people search for at work. Each one ends with a ticket you can try it on. For the “James needs last week” kind of job, see <a href="/guides">Guides</a>.</p>
    ${catalogSearch({ placeholder: 'GETDATE, DATEADD, CASE, ROW_NUMBER…', total: refs.length, noun: 'pages' })}
    <div class="ref-links">${refs.map((a) => `<a class="ref-link" href="${pathOf(a)}" data-search="${searchBits(a.name + ' ' + a.title + ' ' + a.short + ' ' + a.slug)}"><b>${esc(a.name)}</b><span>${esc(a.short)}</span></a>`).join('')}</div>
  </article>`;
  return page({ title: 'T-SQL reference: SQL Server functions explained | WorkSQL', description: 'Plain-English SQL Server reference: GETDATE, DATEADD, DATEDIFF, ISNULL, TOP, CASE, LEFT JOIN, ROW_NUMBER, grouping by month and the GROUP BY error.', body, canonical: origin && `${origin}/tsql` });
}

function renderGuides(origin) {
  const card = (a) => `<a class="ref-link" href="${pathOf(a)}" data-search="${searchBits(a.name + ' ' + a.title + ' ' + a.short + ' ' + a.slug)}"><b>${esc(a.name)}</b><span>${esc(a.short)}</span></a>`;
  const guides = articles.filter(isGuide);
  const refs = articles.filter((a) => !isGuide(a));
  const body = `<article class="article">
    <h1>SQL Server guides</h1>
    <p class="lede">Joins, dates, types, and the tickets people get at work. Search, or scroll. Each page has a worked example in plain English. Free in-browser <a href="/tools">T-SQL tools</a> sit next door — formatter, schema diagrams, CASE, PIVOT, IN-list.</p>
    ${catalogSearch({ placeholder: 'LEFT JOIN, age, CAST, yesterday…', total: articles.length, noun: 'pages' })}
    <h2>At work</h2>
    <div class="ref-links" id="guides">${guides.map(card).join('')}</div>
    <h2>Functions and types</h2>
    <div class="ref-links" id="refs">${refs.map(card).join('')}</div>
  </article>`;
  return page({ title: 'SQL Server guides for work | WorkSQL', description: 'Searchable SQL Server guides: LEFT JOIN, RIGHT JOIN, age from a date, CAST, GROUP BY, and the workplace queries people actually send.', body, canonical: origin && `${origin}/guides` });
}

function sitemapPaths() {
  return ['/', '/work', '/lessons', '/pricing', '/guides', '/tsql', ...articles.map(pathOf)];
}

function listing(a) {
  return { slug: a.slug, name: a.name, short: a.short, kind: isGuide(a) ? 'guide' : 'ref', href: pathOf(a) };
}

module.exports = { articles, renderArticle, renderIndex, renderGuides, pathOf, sitemapPaths, listing, page };
