// Real-life guides: people teams and finance. The requests that land in an analyst's inbox every month.
const { sql, c, table, joinDemo, slides, guide } = require('./article-html');

module.exports = [
  guide({
    slug: 'headcount-on-a-date', name: 'Headcount on a date', topic: 'Reporting',
    title: 'Headcount on a given date in SQL (not just “who is here today”)',
    short: 'Started on or before the date, and had not left yet.',
    description: 'Count employees per department as of any date in SQL Server using start and leave dates, so last quarter’s headcount stays correct.',
    lede: 'Headcount “as of” a date counts people who had started by then and had not yet left. Filtering on “no leave date” only gives you today’s number, and it changes every time someone resigns.',
    ask: { who: 'Leah Byrne', role: 'HR Business Partner', text: 'I need headcount by department as at 31 October for the quarterly pack. Please don’t include people who start next week.' },
    plain: 'Someone counts on 31 October if they had started on or before that day and had not left by then. Anyone who starts later, or who had already left, does not count.',
    html: () => `
${table('Employees', ['name', 'department', 'start_date', 'leave_date', 'counts on 31 Oct?'], [['Ava', 'Sales', '2024-02-01', null, 'Yes'], ['Ben', 'Sales', '2026-11-03', null, 'No (starts later)'], ['Cara', 'Ops', '2023-05-15', '2026-09-30', 'No (had left)'], ['Dev', 'Ops', '2025-01-06', null, 'Yes'], ['Esme', 'Ops', '2026-10-31', null, 'Yes (first day)'], ['Finn', 'Finance', '2022-08-01', null, 'Yes']])}
<h2>The query</h2>
${sql(`DECLARE @asof date = '2026-10-31';

SELECT department, COUNT(*) AS headcount
FROM Employees
WHERE start_date <= @asof
  AND (leave_date IS NULL OR leave_date > @asof)
GROUP BY department
ORDER BY department;`)}
${table('Result', ['department', 'headcount'], [['Finance', 1], ['Ops', 2], ['Sales', 1]])}
<p>Run it again next year with the same ${c('@asof')} and you get the same answer. That is what makes it safe for a pack that gets compared quarter to quarter.</p>
<div class="mistake"><b>What does leave_date mean?</b>
<p>Some HR systems store the last day worked, others the first day gone. If it is the last day worked, someone leaving on the 31st still counts that day, so the test becomes ${c('leave_date >= @asof')}. Check one known leaver before you send it.</p></div>`,
  }),

  guide({
    slug: 'work-anniversaries', name: 'Work anniversaries', topic: 'Dates',
    title: 'Work anniversaries this month in SQL',
    short: 'Same month as the start date, earlier year, still employed.',
    description: 'List staff with a work anniversary this month in SQL Server and how many years they are celebrating, without DATEDIFF’s boundary surprises.',
    lede: 'An anniversary is a start date whose month matches this month, from an earlier year. The years served is simply this year minus the start year.',
    ask: { who: 'Leah Byrne', role: 'HR Business Partner', text: 'Who has a work anniversary this month? I’d like to send cards, so I need the day and how many years.' },
    plain: 'Look for current staff who started in this same month in a previous year. The number of years is this year minus the year they joined. People who joined this month this year are new starters, not anniversaries.',
    html: () => `
${table('Employees (this month is November 2026)', ['name', 'start_date', 'anniversary?'], [['Ava', '2024-02-01', 'No'], ['Dev', '2025-11-17', 'Yes, 1 year'], ['Finn', '2016-11-03', 'Yes, 10 years'], ['Gita', '2026-11-02', 'No (new starter)']])}
<h2>The query</h2>
${sql(`DECLARE @today date = CAST(GETDATE() AS date);

SELECT name, start_date,
       DAY(start_date)                   AS day_of_month,
       YEAR(@today) - YEAR(start_date)   AS years
FROM Employees
WHERE leave_date IS NULL
  AND MONTH(start_date) = MONTH(@today)
  AND YEAR(start_date)  < YEAR(@today)
ORDER BY DAY(start_date);`)}
${table('Result', ['name', 'start_date', 'day_of_month', 'years'], [['Finn', '2016-11-03', 3, 10], ['Dev', '2025-11-17', 17, 1]])}
<div class="mistake"><b>DATEDIFF(year, …) on other days of the year</b>
<p>${c("DATEDIFF(year, '2025-12-31', '2026-01-01')")} is 1, because it counts year boundaries crossed, not birthdays passed. It is fine here because we only look within the anniversary month. For “years of service today” on any date, see <a href="/guides/datediff-age">age in years</a>.</p></div>`,
  }),

  guide({
    slug: 'weekly-overtime', name: 'Weekly overtime', topic: 'Aggregates',
    title: 'Weekly overtime from timesheets in SQL',
    short: 'Group hours by person and week, keep weeks over 40.',
    description: 'Work out weekly overtime in SQL Server from daily timesheet rows: group by Monday-starting weeks without relying on DATEFIRST, then keep weeks over the limit.',
    lede: 'Timesheets are usually one row per person per day. Overtime is worked out per week, so you group the days into weeks first, then compare each week with the contracted hours.',
    ask: { who: 'Raj Patel', role: 'Payroll Officer', text: 'Who worked more than 40 hours last week, and by how much? Payroll closes tomorrow.' },
    plain: 'Add up each person’s hours for the week. Anything above 40 is overtime. Someone who did 10 hours one day and 6 the next has not done overtime if the week still adds up to 40.',
    html: () => `
${slides([
    { title: 'Daily timesheet rows, Mon 26 Oct to Fri 30 Oct', html: table('Timesheets', ['employee', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'], [['Ava', 9, 9, 9, 9, 8], ['Ben', 8, 8, 8, 8, 8], ['Cara', 10, 10, 10, 10, 6]]) },
    { title: 'Grouped by person and week, kept over 40', html: table('Result', ['employee', 'week_start', 'hours', 'overtime'], [['Cara', '2026-10-26', 46, 6], ['Ava', '2026-10-26', 44, 4]]) },
  ], { title: 'From days to weeks' })}
<h2>The query</h2>
${sql(`SELECT employee_id,
       DATEADD(day, -(DATEDIFF(day, '19000101', work_date) % 7), work_date) AS week_start,
       SUM(hours)      AS hours,
       SUM(hours) - 40 AS overtime
FROM Timesheets
WHERE work_date >= '2026-10-26' AND work_date < '2026-11-02'
GROUP BY employee_id,
         DATEADD(day, -(DATEDIFF(day, '19000101', work_date) % 7), work_date)
HAVING SUM(hours) > 40
ORDER BY overtime DESC;`)}
<h2>Why the odd week_start expression</h2>
<p>1 January 1900 was a Monday. Counting the days since then and taking the remainder after dividing by 7 tells you how many days past Monday each date is, so subtracting it lands on that week’s Monday. Unlike ${c('DATEPART(week, …)')}, it does not change when someone’s server has a different ${c('DATEFIRST')} setting.</p>
<div class="mistake"><b>Ben is not on the list</b>
<p>Exactly 40 hours is not overtime, so ${c('> 40')}, not ${c('>= 40')}. Check your contract: some count overtime after 37.5.</p></div>`,
  }),

  guide({
    slug: 'sick-days-per-employee', name: 'Sick days per employee', topic: 'Joins',
    title: 'Sick days and absence spells per employee in SQL',
    short: 'Days = end − start + 1. LEFT JOIN so people with none still show.',
    description: 'Count sickness days and absence spells per employee in SQL Server, keep staff with zero absences, and put the filters in the ON clause.',
    lede: 'Absence systems usually store one row per spell, with a start and end date. Days off is the length of each spell added up; spells is how many rows there are.',
    ask: { who: 'Leah Byrne', role: 'HR Business Partner', text: 'Can I have sick days this year for everyone in the team, including people who haven’t had any? Number of separate spells too.' },
    plain: 'Each absence row is one spell. Its length in days is the end date minus the start date, plus one (a one-day absence starts and ends on the same day). Add up the days per person. People with no absences still need to be on the list, with zero.',
    html: () => `
${joinDemo({ title: 'Step through it: everyone, with their sickness spells if they have any',
    left: { name: 'Employees', cols: ['employee_id', 'name'], rows: [[1, 'Ava'], [2, 'Ben'], [3, 'Cara']] },
    right: { name: 'Absences', cols: ['employee_id', 'start_date', 'end_date'], rows: [[1, '2026-02-02', '2026-02-04'], [1, '2026-09-14', '2026-09-14'], [2, '2026-05-11', '2026-05-15']] },
    on: ['employee_id', 'employee_id'], type: 'left', pick: ['l.name', 'r.start_date', 'r.end_date'],
    say: (l, n) => (n ? `${l[1]} has ${n} sickness spell${n === 1 ? '' : 's'}.` : `${l[1]} has had no sick days. LEFT JOIN keeps her, so she shows as 0.`) })}
<h2>The query</h2>
${sql(`SELECT e.name,
       COUNT(a.absence_id) AS spells,
       ISNULL(SUM(DATEDIFF(day, a.start_date, a.end_date) + 1), 0) AS days_off
FROM Employees e
LEFT JOIN Absences a
  ON a.employee_id = e.employee_id
 AND a.reason = 'Sickness'
 AND a.start_date >= '2026-01-01' AND a.start_date < '2027-01-01'
WHERE e.leave_date IS NULL
GROUP BY e.name
ORDER BY days_off DESC;`)}
${table('Result', ['name', 'spells', 'days_off'], [['Ben', 1, 5], ['Ava', 2, 4], ['Cara', 0, 0]])}
<div class="mistake"><b>Filters on Absences in the WHERE clause</b>
<p>${c("WHERE a.reason = 'Sickness'")} throws away Cara, because her joined reason is NULL. Filters on the right-hand table of a LEFT JOIN belong in ${c('ON')}. And ${c('COUNT(a.absence_id)')}, not ${c('COUNT(*)')}, so Cara’s empty row counts as 0 spells, not 1.</p></div>
<p>These are calendar days. If HR want working days, you need a calendar table that marks weekends and bank holidays, and you count the working days between the two dates.</p>`,
  }),

  guide({
    slug: 'staff-turnover-rate', name: 'Staff turnover rate', topic: 'Reporting',
    title: 'Staff turnover rate in SQL: leavers ÷ average headcount',
    short: 'Count leavers in the period over the average of start and end headcount.',
    description: 'Calculate annual staff turnover in SQL Server: leavers in the year divided by the average of opening and closing headcount, as a percentage.',
    lede: 'The usual turnover formula is leavers in the period divided by the average headcount over it. A simple, widely used average is (headcount at the start + headcount at the end) ÷ 2.',
    ask: { who: 'Sandra Okafor', role: 'Managing Director', text: 'What was our staff turnover this year? HR quoted me a number but I want to check it.' },
    plain: 'Count how many people left during the year. Work out how many people you had at the start and at the end, and average those two. Leavers divided by that average is the turnover rate.',
    html: () => `
<h2>The query</h2>
${sql(`DECLARE @from date = '2026-01-01', @to date = '2027-01-01';

WITH counts AS (
  SELECT
    SUM(CASE WHEN start_date <= @from AND (leave_date IS NULL OR leave_date > @from)
             THEN 1 ELSE 0 END) AS at_start,
    SUM(CASE WHEN start_date <  @to   AND (leave_date IS NULL OR leave_date >= @to)
             THEN 1 ELSE 0 END) AS at_end,
    SUM(CASE WHEN leave_date >= @from AND leave_date < @to
             THEN 1 ELSE 0 END) AS leavers
  FROM Employees
)
SELECT at_start, at_end, leavers,
       CAST(100.0 * leavers / ((at_start + at_end) / 2.0) AS decimal(5,1)) AS turnover_pct
FROM counts;`)}
${table('Result', ['at_start', 'at_end', 'leavers', 'turnover_pct'], [[50, 54, 9, '17.3']])}
<p>Nine leavers over an average of 52 people is 17.3%. All three numbers come from one pass over the table, so they always agree with each other.</p>
<div class="mistake"><b>Dividing by today’s headcount</b>
<p>9 ÷ 54 is 16.7%, and 9 ÷ 50 is 18.0%. Neither is wrong as such, but they are not the same measure. Say which one you used, because HR’s figure may also leave out fixed-term contracts ending or redundancies.</p></div>`,
  }),

  guide({
    slug: 'aged-debt-report', name: 'Aged debt report', topic: 'Reporting',
    title: 'Aged debtors report in SQL: 30, 60, 90+ days overdue',
    short: 'Days overdue per invoice, bucketed with CASE inside SUM.',
    description: 'Build an aged debt (aged receivables) report in SQL Server: days overdue per invoice, grouped into current, 1–30, 31–60, 61–90 and 90+ columns per customer.',
    lede: 'An aged debt report shows how much each customer owes, split by how late it is. Work out the days overdue for each invoice, then add the amounts into a column per age band.',
    ask: { who: 'Amy Nair', role: 'Finance Lead', text: 'Can I have the aged debtors as at today? Usual buckets, one row per customer, biggest balance first.' },
    plain: 'For every unpaid invoice, count how many days past its due date it is. Put the amount in the right column: not due yet, up to 30 days late, 31 to 60, 61 to 90, or over 90. Then add up each customer’s columns.',
    html: () => `
${slides([
    { title: 'Unpaid invoices, with days overdue (today is 8 November 2026)', html: table('Invoices', ['invoice', 'customer', 'due_date', 'amount', 'days_over', 'band'], [['INV-101', 'Acme', '2026-11-20', 500, -12, 'current'], ['INV-102', 'Brightside', '2026-10-25', 300, 14, '1-30'], ['INV-103', 'Acme', '2026-09-20', 1200, 49, '31-60'], ['INV-104', 'Brightside', '2026-08-01', 250, 99, '90+'], ['INV-105', 'Corley', '2026-10-01', 400, 38, '31-60']]) },
    { title: 'One row per customer, one column per band', html: table('Result', ['customer', 'current', '1-30', '31-60', '61-90', '90+', 'total'], [['Acme', 500, 0, 1200, 0, 0, 1700], ['Brightside', 0, 300, 0, 0, 250, 550], ['Corley', 0, 0, 400, 0, 0, 400]]) },
  ], { title: 'From invoices to an aged debt table' })}
<h2>The query</h2>
${sql(`WITH aged AS (
  SELECT customer_name,
         amount_outstanding AS amt,
         DATEDIFF(day, due_date, CAST(GETDATE() AS date)) AS days_over
  FROM Invoices
  WHERE amount_outstanding > 0
)
SELECT customer_name,
       SUM(CASE WHEN days_over <= 0              THEN amt ELSE 0 END) AS [current],
       SUM(CASE WHEN days_over BETWEEN 1  AND 30 THEN amt ELSE 0 END) AS [1-30],
       SUM(CASE WHEN days_over BETWEEN 31 AND 60 THEN amt ELSE 0 END) AS [31-60],
       SUM(CASE WHEN days_over BETWEEN 61 AND 90 THEN amt ELSE 0 END) AS [61-90],
       SUM(CASE WHEN days_over > 90              THEN amt ELSE 0 END) AS [90+],
       SUM(amt) AS total
FROM aged
GROUP BY customer_name
ORDER BY total DESC;`)}
<p>BETWEEN is safe here because ${c('days_over')} is a whole number: there is nothing between 30 and 31. The square brackets let you use headers like ${c('1-30')} that are not normal column names.</p>
<div class="mistake"><b>Ageing from the invoice date</b>
<p>Some teams age from the invoice date, others from the due date. On 30-day terms they differ by a whole bucket. Ask which one your finance team’s version uses before you send it.</p></div>`,
  }),

  guide({
    slug: 'overdue-invoices', name: 'Overdue invoices to chase', topic: 'Joins',
    title: 'Overdue invoices to chase in SQL, after part-payments',
    short: 'Invoice minus payments received, past its due date.',
    description: 'List overdue invoices in SQL Server with the amount still outstanding after part-payments, using a pre-totalled payments CTE and a LEFT JOIN.',
    lede: 'An invoice is overdue when its due date has passed and money is still owed. “Still owed” means the invoice amount minus everything paid against it so far.',
    ask: { who: 'Jo Mensah', role: 'Credit Controller', text: 'Who do I need to chase today? Only what’s actually still outstanding, some of these have been part-paid.' },
    plain: 'Add up the payments received against each invoice. Take that away from the invoice amount. If something is left and the due date has passed, it needs chasing. Invoices with no payments at all count as fully owed.',
    html: () => `
${joinDemo({ title: 'Step through it: invoices, and what has been paid against them',
    left: { name: 'Invoices', cols: ['invoice_id', 'amount', 'due_date'], rows: [['INV-201', 800, '2026-10-15'], ['INV-202', 500, '2026-10-20'], ['INV-203', 1000, '2026-11-30'], ['INV-204', 650, '2026-09-30']] },
    right: { name: 'paid', cols: ['invoice_id', 'paid'], rows: [['INV-201', 800], ['INV-202', 200]] },
    on: ['invoice_id', 'invoice_id'], type: 'left', pick: ['l.invoice_id', 'l.amount', 'r.paid', 'l.due_date'],
    say: (l, n) => (n ? `${l[0]} has payments against it.` : `${l[0]} has no payments yet: paid is NULL, so ISNULL treats it as 0.`) })}
<h2>The query</h2>
${sql(`WITH paid AS (
  SELECT invoice_id, SUM(amount) AS paid
  FROM Payments
  GROUP BY invoice_id
)
SELECT i.invoice_no, i.customer_name, i.due_date,
       i.amount - ISNULL(p.paid, 0) AS outstanding,
       DATEDIFF(day, i.due_date, CAST(GETDATE() AS date)) AS days_overdue
FROM Invoices i
LEFT JOIN paid p ON p.invoice_id = i.invoice_id
WHERE i.due_date < CAST(GETDATE() AS date)
  AND i.amount - ISNULL(p.paid, 0) > 0
ORDER BY days_overdue DESC;`)}
${table('Result (today is 8 November 2026)', ['invoice_no', 'due_date', 'outstanding', 'days_overdue'], [['INV-204', '2026-09-30', 650, 39], ['INV-202', '2026-10-20', 300, 19]])}
<p>INV-201 is fully paid and INV-203 is not due yet, so neither is on the list.</p>
<div class="mistake"><b>Joining Payments without totalling first</b>
<p>An invoice paid in two instalments joins to two payment rows, so a plain join lists it twice and the amounts look wrong. Total the payments per invoice first, as the CTE does.</p></div>`,
  }),

  guide({
    slug: 'vat-by-quarter', name: 'VAT by quarter', topic: 'Aggregates',
    title: 'VAT by quarter in SQL: net, VAT and gross per quarter',
    short: 'Group by year and quarter; round the VAT per invoice.',
    description: 'Total net sales, VAT and gross per quarter in SQL Server with DATEPART(quarter), mixed VAT rates, and rounding per invoice.',
    lede: 'A VAT summary is net, VAT and gross added up per quarter. Group by the year and the quarter together, and work out the VAT on each invoice before you add it up.',
    ask: { who: 'Amy Nair', role: 'Finance Lead', text: 'Can you give me net, VAT and gross by quarter for this year, so I can check it against the return?' },
    plain: 'Work out the VAT on each invoice from its own rate (20%, 5% or 0%), rounded to the penny. Then put the invoices into quarters and add up the net, the VAT and the total.',
    html: () => `
${slides([
    { title: 'Invoices with their VAT rates', html: table('SalesInvoices', ['invoice_date', 'net_amount', 'vat_rate', 'vat'], [['2026-01-15', 1000, 20, 200], ['2026-02-20', 500, 0, 0], ['2026-04-03', 2000, 20, 400], ['2026-05-30', 300, 5, 15], ['2026-07-12', 1500, 20, 300]]) },
    { title: 'Added up per quarter', html: table('Result', ['vat_quarter', 'net', 'vat', 'gross'], [['2026 Q1', 1500, 200, 1700], ['2026 Q2', 2300, 415, 2715], ['2026 Q3', 1500, 300, 1800]]) },
  ])}
<h2>The query</h2>
${sql(`SELECT CONCAT(YEAR(invoice_date), ' Q', DATEPART(quarter, invoice_date)) AS vat_quarter,
       SUM(net_amount)                                       AS net,
       SUM(ROUND(net_amount * vat_rate / 100.0, 2))          AS vat,
       SUM(net_amount + ROUND(net_amount * vat_rate / 100.0, 2)) AS gross
FROM SalesInvoices
WHERE invoice_date >= '2026-01-01' AND invoice_date < '2027-01-01'
GROUP BY YEAR(invoice_date), DATEPART(quarter, invoice_date)
ORDER BY YEAR(invoice_date), DATEPART(quarter, invoice_date);`)}
<div class="mistake"><b>Your VAT quarter may not be a calendar quarter</b>
<p>Many UK businesses have staggered VAT periods, for example February to April. DATEPART(quarter) is January to March. If yours is staggered, group by a period you calculate from the date, or by a lookup table of VAT periods. Ask finance which it is before you send numbers they will file.</p></div>`,
  }),

  guide({
    slug: 'expense-claims-over-limit', name: 'Expense claims over limit', topic: 'Joins',
    title: 'Expense claims over the policy limit in SQL',
    short: 'Join claims to the limit for their category, keep amount > limit.',
    description: 'Flag expense claims above the policy limit in SQL Server by joining to a limits table per category, and handle categories with no limit.',
    lede: 'Policy limits live in a small lookup table: one limit per category. Join each claim to its category’s limit, and keep the claims that go over.',
    ask: { who: 'Raj Patel', role: 'Payroll Officer', text: 'Which expense claims this month are over policy? I need to send them back before I approve the batch.' },
    plain: 'Each claim has a category, like Meals or Hotel. Look up that category’s limit and compare. Anything over the limit gets flagged, with how much it is over by.',
    html: () => `
${joinDemo({ title: 'Step through it: each claim against its category limit',
    left: { name: 'ExpenseClaims', cols: ['employee', 'category', 'amount'], rows: [['Ava', 'Meals', 32], ['Ben', 'Hotel', 145], ['Cara', 'Meals', 18], ['Dev', 'Taxi', 60], ['Esme', 'Train', 74]] },
    right: { name: 'PolicyLimits', cols: ['category', 'limit_amount'], rows: [['Meals', 25], ['Hotel', 120], ['Taxi', 50]] },
    on: ['category', 'category'], type: 'left', pick: ['l.employee', 'l.category', 'l.amount', 'r.limit_amount'],
    say: (l, n) => (n ? `${l[0]}’s ${l[1]} claim is £${l[2]}; the ${l[1]} limit comes across.` : `There is no limit for ${l[1]}. An INNER JOIN would silently drop ${l[0]}’s claim.`) })}
<h2>The query</h2>
${sql(`SELECT c.claim_id, e.name, c.category, c.amount,
       l.limit_amount,
       c.amount - l.limit_amount AS over_by
FROM ExpenseClaims c
JOIN Employees e    ON e.employee_id = c.employee_id
JOIN PolicyLimits l ON l.category    = c.category
WHERE c.amount > l.limit_amount
  AND c.status = 'Submitted'
ORDER BY over_by DESC;`)}
${table('Result', ['name', 'category', 'amount', 'limit_amount', 'over_by'], [['Ben', 'Hotel', 145, 120, 25], ['Dev', 'Taxi', 60, 50, 10], ['Ava', 'Meals', 32, 25, 7]])}
<div class="mistake"><b>A category with no limit</b>
<p>Esme’s train fare has no row in PolicyLimits, so the inner join drops it without a word. If “no limit set” should be checked by hand, LEFT JOIN instead and add ${c('OR l.limit_amount IS NULL')} to the WHERE.</p></div>`,
  }),

  guide({
    slug: 'duplicate-supplier-payments', name: 'Duplicate supplier payments', topic: 'At work',
    title: 'Find duplicate supplier payments in SQL',
    short: 'Same supplier, same amount, within a few days of each other.',
    description: 'Catch possible duplicate payments in SQL Server with a self-join on supplier and amount within a 7-day window, without flagging monthly retainers.',
    lede: 'A duplicate payment is the same amount paid to the same supplier twice, close together. Join the payments table to itself to find pairs like that.',
    ask: { who: 'Amy Nair', role: 'Finance Lead', text: 'Audit want a check for duplicate payments last quarter. Same supplier, same amount, close together.' },
    plain: 'Compare every payment with every later payment to the same supplier. If the amount is identical and the second one was paid within a week of the first, flag the pair for someone to check. A monthly retainer of the same amount is a month apart, so it is not flagged.',
    html: () => `
${table('Payments', ['payment_id', 'supplier', 'amount', 'paid_on'], [['P1', 'Acme', '1250.00', '2026-10-01'], ['P2', 'Acme', '1250.00', '2026-10-03'], ['P3', 'Acme', '1250.00', '2026-11-01'], ['P4', 'Brightside', '480.00', '2026-10-10'], ['P5', 'Brightside', '480.50', '2026-10-10'], ['P6', 'Corley', '99.00', '2026-10-12'], ['P7', 'Corley', '99.00', '2026-10-12']])}
<h2>The query</h2>
${sql(`SELECT a.payment_id AS first_payment,
       b.payment_id AS second_payment,
       a.supplier_name, a.amount,
       a.paid_on AS first_paid, b.paid_on AS second_paid,
       DATEDIFF(day, a.paid_on, b.paid_on) AS days_apart
FROM Payments a
JOIN Payments b
  ON b.supplier_id = a.supplier_id
 AND b.amount      = a.amount
 AND b.payment_id  > a.payment_id
 AND b.paid_on    >= a.paid_on
 AND b.paid_on    <= DATEADD(day, 7, a.paid_on)
ORDER BY a.paid_on;`)}
${table('Result', ['first_payment', 'second_payment', 'supplier_name', 'amount', 'days_apart'], [['P1', 'P2', 'Acme', '1250.00', 2], ['P6', 'P7', 'Corley', '99.00', 0]])}
<p>P3 is a month after P1 and four weeks after P2: the retainer, not flagged. P4 and P5 differ by 50p, so they are two different invoices.</p>
<div class="mistake"><b>This is a list to check, not a list of mistakes</b>
<p>Two genuine £99 orders on the same day happen. Send the pairs with their invoice numbers, so whoever checks can rule them in or out quickly. ${c('b.payment_id > a.payment_id')} makes sure each pair appears once, not twice.</p></div>`,
  }),
];
