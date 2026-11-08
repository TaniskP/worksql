// Real-life guides: tidying messy data, and the window-function reports people ask for every week.
const { sql, c, table, joinDemo, slides, guide } = require('./article-html');

module.exports = [
  guide({
    slug: 'clean-phone-numbers', name: 'Clean phone numbers', topic: 'Cleaning',
    title: 'Clean up UK phone numbers in SQL Server',
    short: 'Strip spaces and symbols, turn +44 into 0, check the length.',
    description: 'Standardise messy UK phone numbers in SQL Server with nested REPLACE (or TRANSLATE), convert +44 to a leading 0, and flag numbers that are the wrong length.',
    lede: 'Phone numbers arrive with spaces, brackets, dashes and country codes. Strip everything that is not a digit, swap a leading 44 for 0, and the same number finally looks the same every time.',
    ask: { who: 'Becky Ashworth', role: 'Support Lead', text: 'The dialler rejects half our numbers because of the formatting. Can you give me a clean version for every customer?' },
    plain: 'Take out the spaces, brackets, dashes and plus signs. If what is left starts with 44 (the UK code), replace that 44 with a 0. A normal UK number is then 11 digits; anything else gets flagged for a person to look at.',
    html: () => `
${table('Customers.phone, before and after', ['phone', 'phone_clean', 'looks valid?'], [['07700 900111', '07700900111', 'Yes'], ['+44 7700 900222', '07700900222', 'Yes'], ['(0113) 496-0000', '01134960000', 'Yes'], ['07700900333 ', '07700900333', 'Yes'], ['447700900444', '07700900444', 'Yes'], ['0770 090', '0770090', 'No, 7 digits']])}
<h2>The query</h2>
${sql(`WITH digits AS (
  SELECT customer_id, phone,
         REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') AS d
  FROM Customers
), cleaned AS (
  SELECT customer_id, phone,
         CASE WHEN d LIKE '44%' THEN '0' + SUBSTRING(d, 3, 20) ELSE d END AS phone_clean
  FROM digits
)
SELECT customer_id, phone, phone_clean,
       CASE WHEN LEN(phone_clean) = 11 AND phone_clean NOT LIKE '%[^0-9]%'
            THEN 'Yes' ELSE 'Check' END AS looks_valid
FROM cleaned;`)}
<p>${c("NOT LIKE '%[^0-9]%'")} reads as “does not contain any character that is not a digit”. On SQL Server 2017 or later, ${c("REPLACE(TRANSLATE(phone, '()-+', '    '), ' ', '')")} does the five REPLACEs in one go.</p>
<div class="mistake"><b>Storing phone numbers as numbers</b>
<p>Convert ${c('07700900111')} to an int and the leading zero is gone for good. Phone numbers are text that happens to contain digits. Keep them in a varchar column.</p></div>`,
  }),

  guide({
    slug: 'split-full-name', name: 'Split a full name', topic: 'Cleaning',
    title: 'Split a full name into first and last name in SQL Server',
    short: 'CHARINDEX for the first space, REVERSE for the last.',
    description: 'Split a full_name column into first and last name in SQL Server with CHARINDEX, LEFT, RIGHT and REVERSE, handling single names and extra spaces.',
    lede: 'The first name is everything before the first space. The last name is everything after the last space. REVERSE is the trick for finding the last space.',
    ask: { who: 'Hannah Okoro', role: 'Marketing Lead', text: 'The event list has one “name” column but the email tool wants first name and surname separately. Can you split it?' },
    plain: 'Find the first gap in the name: everything before it is the first name. Turn the name backwards and find the first gap again: that is the last gap in the real name, and everything after it is the surname. Someone with only one name gets no surname.',
    html: () => `
${table('Contacts', ['full_name', 'first_name', 'last_name'], [['Amy Nair', 'Amy', 'Nair'], ['Ben  Ortiz', 'Ben', 'Ortiz'], ['Cara Jane Smith', 'Cara', 'Smith'], ['Dev', 'Dev', null]])}
<h2>The query</h2>
${sql(`SELECT c.full_name,
       LEFT(v.n, CHARINDEX(' ', v.n + ' ') - 1) AS first_name,
       CASE WHEN CHARINDEX(' ', v.n) > 0
            THEN RIGHT(v.n, CHARINDEX(' ', REVERSE(v.n)) - 1)
       END AS last_name
FROM Contacts c
CROSS APPLY (VALUES (TRIM(c.full_name))) AS v(n);`)}
<h2>How it handles the awkward ones</h2>
<ul>
<li><b>Dev</b> has no space. Adding a space on the end (${c("v.n + ' '")}) means the first-name part still finds one, and the CASE leaves the surname NULL instead of erroring on a negative length.</li>
<li><b>Ben  Ortiz</b> has two spaces. The last space is still right before “Ortiz”, so the surname comes out clean.</li>
<li><b>Cara Jane Smith</b> loses “Jane”. If middle names matter, take everything between the first and last space as a third column.</li>
</ul>
<div class="mistake"><b>Names are not that simple</b>
<p>“Mary Ann Jones”, “Ludwig van Beethoven” and “Nguyễn Văn An” all split wrongly. Use the split for an email greeting, keep the original full name, and never overwrite it.</p></div>`,
  }),

  guide({
    slug: 'map-messy-categories', name: 'Map messy categories', topic: 'Cleaning',
    title: 'Fix inconsistent categories in SQL with a mapping table',
    short: 'A small raw → clean lookup, joined on the tidied label.',
    description: 'Merge inconsistent category labels in SQL Server with a mapping table and a LEFT JOIN, and surface any label nobody has mapped yet.',
    lede: 'When the same category is spelled five ways, a CASE statement in every report quickly gets out of hand. A two-column mapping table, joined on the tidied label, fixes it in one place.',
    ask: { who: 'Marcus Lee', role: 'Merchandiser', text: 'Sales by category is useless, we’ve got “Kitchen”, “kitchenware” and “Kitchen ” as separate rows. Can you merge them?' },
    plain: 'Make a small table that says “this messy label means that clean category”. Tidy each product’s label (lower case, no stray spaces), look it up in the table, and report on the clean name. Any label not in the table shows up clearly so someone can add it.',
    html: () => `
${joinDemo({ title: 'Step through it: each product’s label, looked up in the map',
    left: { name: 'Products', cols: ['product', 'raw_key'], rows: [['Kettle', 'kitchenware'], ['Toaster', 'kitchen'], ['Mug', 'kitchen'], ['Hose', 'garden'], ['Trowel', 'gardening'], ['Parasol', 'outdoor'], ['Candle', 'homeware']] },
    right: { name: 'CategoryMap', cols: ['raw_key', 'clean_category'], rows: [['kitchenware', 'Kitchen'], ['kitchen', 'Kitchen'], ['garden', 'Garden'], ['gardening', 'Garden'], ['outdoor', 'Garden']] },
    on: ['raw_key', 'raw_key'], type: 'left', pick: ['l.product', 'l.raw_key', 'r.clean_category'],
    say: (l, n) => (n ? `“${l[1]}” is in the map.` : `“${l[1]}” is not in the map yet, so it comes back NULL and gets flagged.`) })}
<p>${c('raw_key')} is the product’s category after ${c('LOWER(TRIM(…))')}, so “Kitchen ” and “kitchen” both become ${c('kitchen')}.</p>
<h2>The query</h2>
${sql(`SELECT ISNULL(m.clean_category, CONCAT('UNMAPPED: ', p.category)) AS category,
       COUNT(*) AS products
FROM Products p
LEFT JOIN CategoryMap m ON m.raw_category = LOWER(TRIM(p.category))
GROUP BY ISNULL(m.clean_category, CONCAT('UNMAPPED: ', p.category))
ORDER BY products DESC;`)}
${table('Result', ['category', 'products'], [['Kitchen', 3], ['Garden', 3], ['UNMAPPED: Homeware', 1]])}
<div class="mistake"><b>An INNER JOIN hides new labels</b>
<p>With an inner join, the candle silently drops out of every total. The LEFT JOIN plus the “UNMAPPED” label turns a new spelling into something you can see and fix by adding one row to the map.</p></div>`,
  }),

  guide({
    slug: 'missing-invoice-numbers', name: 'Missing invoice numbers', topic: 'Window',
    title: 'Find gaps in a number sequence in SQL (missing invoice numbers)',
    short: 'LAG to the previous number; a jump of more than 1 is a gap.',
    description: 'Find missing numbers in a sequence such as invoice numbers in SQL Server with LAG, and report each gap as a from–to range.',
    lede: 'Put each invoice number next to the one before it. Where the difference is more than 1, numbers are missing in between.',
    ask: { who: 'Amy Nair', role: 'Finance Lead', text: 'The auditors asked whether any invoice numbers are missing this year. Can you list the gaps?' },
    plain: 'Sort the invoice numbers and look at each one next to the one before it. 1006 after 1003 means 1004 and 1005 never appeared. List every place where the sequence jumps.',
    html: () => `
${table('Invoices, with the previous number alongside', ['invoice_no', 'LAG(invoice_no)', 'jump'], [[1001, null, null], [1002, 1001, 1], [1003, 1002, 1], [1006, 1003, 3], [1007, 1006, 1], [1010, 1007, 3]])}
<h2>The query</h2>
${sql(`WITH numbered AS (
  SELECT invoice_no,
         LAG(invoice_no) OVER (ORDER BY invoice_no) AS prev_no
  FROM Invoices
  WHERE invoice_date >= '2026-01-01' AND invoice_date < '2027-01-01'
)
SELECT prev_no + 1               AS gap_starts,
       invoice_no - 1            AS gap_ends,
       invoice_no - prev_no - 1  AS missing
FROM numbered
WHERE invoice_no - prev_no > 1
ORDER BY gap_starts;`)}
${table('Result', ['gap_starts', 'gap_ends', 'missing'], [[1004, 1005, 2], [1008, 1009, 2]])}
<div class="mistake"><b>Gaps in an IDENTITY column are normal</b>
<p>SQL Server skips identity values after a rolled-back insert or a restart, so gaps in a database ID mean nothing. Invoice numbers are different: if your system issues them, a gap needs an explanation (usually a voided invoice). Check the voids before telling anyone numbers are missing.</p></div>`,
  }),

  guide({
    slug: 'login-streaks', name: 'Login streaks', topic: 'Window',
    title: 'Consecutive-day streaks in SQL (the gaps and islands trick)',
    short: 'Date minus ROW_NUMBER is the same for every day in a run.',
    description: 'Find runs of consecutive days such as login streaks in SQL Server with the gaps-and-islands technique: date minus ROW_NUMBER groups each run.',
    lede: 'Number each user’s login days 1, 2, 3 in date order, then take that number away from the date. Every day in an unbroken run lands on the same answer, which you can group by.',
    ask: { who: 'Noah Clarke', role: 'Product Manager', text: 'We want to add streaks to the app. Can you show me each user’s streaks so far: start, end and length?' },
    plain: 'List the days someone logged in, oldest first, and count them off: first day, second day, third day. Subtract that count from the date. While the days are back to back, the answer stays the same; a missed day makes it jump. Each different answer is one streak.',
    html: () => `
${slides([
    { title: 'Days u1 logged in, numbered', html: table('days', ['d', 'rn', 'd − rn days'], [['2026-11-01', 1, '2026-10-31'], ['2026-11-02', 2, '2026-10-31'], ['2026-11-03', 3, '2026-10-31'], ['2026-11-05', 4, '2026-11-01'], ['2026-11-06', 5, '2026-11-01'], ['2026-11-08', 6, '2026-11-02']]) },
    { title: 'Grouped by that key: one row per streak', html: table('Result', ['user_id', 'streak_start', 'streak_end', 'days'], [['u1', '2026-11-01', '2026-11-03', 3], ['u1', '2026-11-05', '2026-11-06', 2], ['u1', '2026-11-08', '2026-11-08', 1]]) },
  ], { title: 'Gaps and islands, step by step' })}
<h2>The query</h2>
${sql(`WITH days AS (
  SELECT DISTINCT user_id, CAST(login_time AS date) AS d
  FROM Logins
), keyed AS (
  SELECT user_id, d,
         DATEADD(day,
                 -CAST(ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d) AS int),
                 d) AS streak_key
  FROM days
)
SELECT user_id,
       MIN(d)   AS streak_start,
       MAX(d)   AS streak_end,
       COUNT(*) AS days
FROM keyed
GROUP BY user_id, streak_key
ORDER BY user_id, streak_start;`)}
<div class="mistake"><b>Two logins on the same day</b>
<p>Without ${c('DISTINCT')} on the dates, a second login on 2 November gets its own number, shifts the key, and splits a three-day streak in two. Reduce to one row per user per day first.</p></div>`,
  }),

  guide({
    slug: 'latest-status-per-ticket', name: 'Latest status per ticket', topic: 'Window',
    title: 'Current status from a status history table in SQL',
    short: 'ROW_NUMBER newest first per ticket, keep row 1.',
    description: 'Get the latest status per ticket or order from a status history table in SQL Server with ROW_NUMBER, then count tickets by current status.',
    lede: 'History tables keep every change, one row each. The current status is the newest row per ticket, which is a job for ROW_NUMBER, not MAX.',
    ask: { who: 'Becky Ashworth', role: 'Support Lead', text: 'How many tickets are in each status right now? The history table has every change, so I keep counting old statuses.' },
    plain: 'For each ticket, sort its status changes from newest to oldest and keep only the newest. That is where the ticket is right now. Then count how many tickets are in each status.',
    html: () => `
${slides([
    { title: 'Every status change', html: table('StatusHistory', ['ticket', 'status', 'changed_at'], [['T1', 'Open', '09:00'], ['T1', 'In progress', '10:00'], ['T1', 'Resolved', '15:00'], ['T2', 'Open', '11:00'], ['T3', 'Open', '08:00'], ['T3', 'Waiting on customer', '12:00']]) },
    { title: 'Newest row per ticket', html: table('Current', ['ticket', 'status', 'changed_at'], [['T1', 'Resolved', '15:00'], ['T2', 'Open', '11:00'], ['T3', 'Waiting on customer', '12:00']]) },
  ])}
<h2>The query</h2>
${sql(`WITH ranked AS (
  SELECT ticket_id, status, changed_at,
         ROW_NUMBER() OVER (PARTITION BY ticket_id
                            ORDER BY changed_at DESC, history_id DESC) AS rn
  FROM StatusHistory
)
SELECT status, COUNT(*) AS tickets
FROM ranked
WHERE rn = 1
GROUP BY status
ORDER BY tickets DESC;`)}
<div class="mistake"><b>MAX(status)</b>
<p>${c('MAX(status)')} is the alphabetically last word, so T1 would show “Resolved” and T3 “Waiting on customer” by luck, but a ticket that went Resolved → Reopened would show “Resolved”. And ${c('MAX(changed_at)')} with status in the GROUP BY returns one row per status the ticket has ever had.</p></div>`,
  }),

  guide({
    slug: 'quarters-as-columns', name: 'Quarters as columns', topic: 'Reporting',
    title: 'Revenue by region with quarters as columns in SQL',
    short: 'SUM(CASE WHEN quarter = n …) for each column you want.',
    description: 'Turn rows into columns in SQL Server: revenue per region with Q1 to Q4 as columns using conditional SUM, and how it compares with PIVOT.',
    lede: 'A finance table usually has regions down the side and quarters across the top. Conditional aggregation builds each column with its own SUM(CASE …).',
    ask: { who: 'Amy Nair', role: 'Finance Lead', text: 'Can I have this year’s revenue with regions as rows and Q1–Q4 as columns, plus a total? It’s going straight into the board pack.' },
    plain: 'Make one row per region. For the Q1 column, add up only the orders from January to March; for Q2, only April to June; and so on. Orders from other quarters add 0 to that column.',
    html: () => `
${slides([
    { title: 'Revenue as rows', html: table('Totals', ['region', 'quarter', 'revenue'], [['North', 'Q1', 100], ['North', 'Q2', 120], ['North', 'Q3', 90], ['South', 'Q1', 80], ['South', 'Q3', 150], ['South', 'Q4', 60]]) },
    { title: 'Quarters as columns', note: 'South had no Q2 sales, so its Q2 is 0, not blank.', html: table('Result', ['region', 'Q1', 'Q2', 'Q3', 'Q4', 'year_total'], [['North', 100, 120, 90, 0, 310], ['South', 80, 0, 150, 60, 290]]) },
  ])}
<h2>The query</h2>
${sql(`SELECT region,
       SUM(CASE WHEN DATEPART(quarter, order_date) = 1 THEN total ELSE 0 END) AS Q1,
       SUM(CASE WHEN DATEPART(quarter, order_date) = 2 THEN total ELSE 0 END) AS Q2,
       SUM(CASE WHEN DATEPART(quarter, order_date) = 3 THEN total ELSE 0 END) AS Q3,
       SUM(CASE WHEN DATEPART(quarter, order_date) = 4 THEN total ELSE 0 END) AS Q4,
       SUM(total) AS year_total
FROM Orders
WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'
GROUP BY region
ORDER BY region;`)}
<h2>What about PIVOT?</h2>
<p>SQL Server’s ${c('PIVOT')} does the same job, but it fills empty cells with NULL, cannot easily add a total column, and needs the column list hard-coded anyway. Most analysts find the SUM(CASE) version easier to read and change.</p>
<div class="mistake"><b>ELSE 0 or no ELSE?</b>
<p>Without ${c('ELSE 0')} a quarter with no sales comes out NULL, and a spreadsheet formula over it may treat the gap differently from a zero. Decide which you mean; for money, 0 is usually right.</p></div>`,
  }),

  guide({
    slug: 'year-over-year-growth', name: 'Year-over-year growth', topic: 'Window',
    title: 'Year-over-year growth by month in SQL',
    short: 'Join each month to the same month last year, then divide.',
    description: 'Compare each month’s revenue with the same month last year in SQL Server, as a percentage change, skipping the unfinished current month.',
    lede: 'Year-over-year compares October with last October, not with September, so seasonal businesses compare like with like. Join each month’s total to the total twelve months earlier.',
    ask: { who: 'Sandra Okafor', role: 'Managing Director', text: 'Are we up on last year? Month by month please, as a percentage.' },
    plain: 'Add up revenue for each month. Put each month next to the same month a year earlier. The change is (this year − last year) ÷ last year. Leave out the current month: it is not over, so it will always look like a drop.',
    html: () => `
<h2>The query</h2>
${sql(`WITH monthly AS (
  SELECT DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1) AS month,
         SUM(total) AS revenue
  FROM Orders
  WHERE order_date < DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
  GROUP BY DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1)
)
SELECT cur.month,
       cur.revenue,
       prev.revenue AS revenue_last_year,
       CAST(100.0 * (cur.revenue - prev.revenue) / NULLIF(prev.revenue, 0)
            AS decimal(6,1)) AS yoy_pct
FROM monthly cur
LEFT JOIN monthly prev ON prev.month = DATEADD(year, -1, cur.month)
WHERE cur.month >= '2026-01-01'
ORDER BY cur.month;`)}
${table('Result (last two rows)', ['month', 'revenue', 'revenue_last_year', 'yoy_pct'], [['2026-09-01', 7200, 7500, '-4.0'], ['2026-10-01', 9200, 8000, '15.0']])}
<p>The ${c('WHERE order_date <')} the first of this month keeps November out until it is finished.</p>
<div class="mistake"><b>LAG(revenue, 12)</b>
<p>${c('LAG(revenue, 12) OVER (ORDER BY month)')} looks shorter, but it means “twelve rows back”. If one month had no orders it has no row, and every comparison after it is against the wrong month. The join on the date cannot slip.</p></div>`,
  }),

  guide({
    slug: 'seven-day-moving-average', name: '7-day moving average', topic: 'Window',
    title: '7-day moving average in SQL Server',
    short: 'AVG(…) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW).',
    description: 'Smooth daily numbers with a 7-day rolling average in SQL Server using a window frame, and handle the first six days and missing dates.',
    lede: 'Daily numbers bounce around. A 7-day moving average replaces each day with the average of that day and the six before it, so one big day no longer dominates the chart.',
    ask: { who: 'Noah Clarke', role: 'Product Manager', text: 'The daily sign-ups chart is too spiky to read. Can you add a 7-day average line?' },
    plain: 'For each day, take that day and the six days before it, and average them. The spike on day 4 (a promotion) is shared out across the week instead of sticking up on its own. The first six days do not have a full week behind them yet.',
    html: () => `
<h2>The query</h2>
${sql(`SELECT day, signups,
       CAST(AVG(1.0 * signups) OVER (ORDER BY day
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS decimal(6,1)) AS avg_7_day,
       COUNT(*) OVER (ORDER BY day
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS days_in_window
FROM DailySignups
ORDER BY day;`)}
${table('Result', ['day', 'signups', 'avg_7_day', 'days_in_window'], [['Nov 1', 10, '10.0', 1], ['Nov 2', 12, '11.0', 2], ['Nov 3', 8, '10.0', 3], ['Nov 4', 30, '15.0', 4], ['Nov 5', 11, '14.2', 5], ['Nov 6', 9, '13.3', 6], ['Nov 7', 10, '12.9', 7], ['Nov 8', 14, '13.4', 7]])}
<p>${c('days_in_window')} shows when the average is still warming up. Many charts only start the line once it reaches 7.</p>
<div class="mistake"><b>ROWS counts rows, not days</b>
<p>If a day had no sign-ups and so no row, “6 preceding rows” reaches back eight days. Build the daily table from a calendar (every date, LEFT JOIN the counts, ISNULL to 0) before you average it.</p></div>`,
  }),

  guide({
    slug: 'percent-of-total', name: 'Percent of total', topic: 'Window',
    title: 'Percentage of total in SQL with SUM() OVER ()',
    short: 'Divide each group’s total by the grand total in the same query.',
    description: 'Show each region’s share of total revenue in SQL Server with SUM(SUM(total)) OVER (), and why the rounded percentages may not add to exactly 100.',
    lede: 'A share is a group’s total divided by the grand total. SUM(…) OVER () gives you the grand total on every row, without a second query or a join.',
    ask: { who: 'Sandra Okafor', role: 'Managing Director', text: 'What share of this year’s revenue came from each region? Percentages please, for a pie chart.' },
    plain: 'Add up revenue for each region. Add up all the regions together. Divide each region by that grand total and multiply by 100.',
    html: () => `
<h2>The query</h2>
${sql(`SELECT region,
       SUM(total) AS revenue,
       CAST(100.0 * SUM(total) / SUM(SUM(total)) OVER () AS decimal(5,1)) AS pct_of_total
FROM Orders
WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'
GROUP BY region
ORDER BY revenue DESC;`)}
${table('Result', ['region', 'revenue', 'pct_of_total'], [['North', 310, '31.0'], ['South', 290, '29.0'], ['Scotland', 250, '25.0'], ['Wales', 150, '15.0']])}
<h2>Reading SUM(SUM(total)) OVER ()</h2>
<p>The inner ${c('SUM(total)')} is each region’s total from the GROUP BY. The outer ${c('SUM(…) OVER ()')} adds those totals across all rows of the result; the empty brackets mean “the whole result, no grouping”.</p>
<div class="mistake"><b>Rounded shares that add to 99.9%</b>
<p>With real numbers, rounding each share to one decimal place can leave the column adding up to 99.9 or 100.1. That is normal. Mention it, or give the last slice whatever is left over if the chart must show exactly 100.</p></div>`,
  }),
];
