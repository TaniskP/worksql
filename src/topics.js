// Extra workplace T-SQL pages: joins, types, dates, strings, windows. Same shape as src/articles.js.
const { sql, c } = require('./article-html');

const g = (slug, name, lesson, title, short, description, lede, body) =>
  ({ kind: 'guide', slug, name, lesson, title, short, description, lede, body });
const r = (slug, name, lesson, title, short, description, lede, body) =>
  ({ slug, name, lesson, title, short, description, lede, body });

module.exports = [
  g('inner-join', 'INNER JOIN', 9,
    'INNER JOIN in SQL Server: names instead of IDs',
    'Keep rows that match on both sides. The everyday join.',
    'How INNER JOIN works in SQL Server at work: put customer names on orders, and why unmatched rows disappear.',
    'An INNER JOIN keeps a row only when both tables have a match. That is how you turn a customer_id into a name.',
    () => `
<h2>Orders with the customer’s name</h2>
${sql(`SELECT o.order_id, o.order_date, o.total_amount,
       c.first_name, c.last_name
FROM Orders o
INNER JOIN Customers c ON c.customer_id = o.customer_id
ORDER BY o.order_date DESC;`)}
<p>Read ${c('ON')} as “this row belongs to that row”. ${c('INNER')} is optional. ${c('JOIN')} means the same thing.</p>
<div class="mistake"><b>A customer with no orders vanishes</b>
<p>INNER JOIN drops them. If you need everyone, even people who never bought, that is a <a href="/guides/left-join">LEFT JOIN</a>.</p></div>`),

  g('left-join', 'LEFT JOIN', 19,
    'LEFT JOIN in SQL Server: keep everyone on the left',
    'All customers, and their orders if they have any.',
    'LEFT JOIN in SQL Server with a worked example: every customer, plus order details when they exist, NULLs when they do not.',
    'LEFT JOIN keeps every row from the left table. If the right table has no match, those columns come back NULL. That is the join you use for “everyone, and the extra if it exists.”',
    () => `
<h2>Every customer, last order if they have one</h2>
${sql(`SELECT c.customer_id, c.first_name, c.last_name,
       o.order_id, o.order_date, o.total_amount
FROM Customers c
LEFT JOIN Orders o ON o.customer_id = c.customer_id
ORDER BY c.last_name, o.order_date;`)}
<p>Amy appears once per order. If she never ordered, she still appears, with NULL order columns. To find only those gaps, see <a href="/tsql/left-join-is-null">LEFT JOIN … IS NULL</a>.</p>
<div class="mistake"><b>A WHERE on the right-hand table</b>
<p>${c("WHERE o.status = 'Shipped'")} after a LEFT JOIN quietly deletes the unmatched left rows, because NULL is not Shipped. Put filters on Orders in the ${c('ON')} clause instead.</p></div>
<h2>At work</h2>
<p>This is the join you will write most after INNER. “All products, sales if any.” “All staff, orders this month if any.”</p>`),

  g('right-join', 'RIGHT JOIN', 19,
    'RIGHT JOIN in SQL Server: almost nobody writes this at work',
    'Same as LEFT JOIN from the other side. Teams write LEFT.',
    'Are RIGHT JOINs used at work? Rarely. How RIGHT JOIN works, and why workplace SQL Server almost always flips the tables and writes LEFT JOIN.',
    'A RIGHT JOIN keeps every row from the right table. You will see it in textbooks. You will almost never see it in a shop that has to maintain the script next year.',
    () => `
<h2>What it does</h2>
${sql(`SELECT c.customer_id, c.first_name, o.order_id, o.total_amount
FROM Customers c
RIGHT JOIN Orders o ON o.customer_id = c.customer_id;`)}
<p>Every order is kept. A customer with no orders does not appear. An order with a missing customer_id still appears, with NULL customer columns.</p>
<h2>Write the LEFT instead</h2>
${sql(`SELECT c.customer_id, c.first_name, o.order_id, o.total_amount
FROM Orders o
LEFT JOIN Customers c ON c.customer_id = o.customer_id;`)}
<p>Same result. The “main” table is on the left, which is how people read. New joiners look for LEFT JOIN. Reviewers look for LEFT JOIN.</p>
<div class="mistake"><b>Mixing LEFT and RIGHT in one query</b>
<p>It parses. Nobody can tell you what it means in six months. Pick a side, stay there. At Harbour &amp; Co we only write INNER and LEFT.</p></div>
<h2>So are they used?</h2>
<p>Generated SQL, old Access upsizes, and people who learned from a slide that listed every join type. Not in a ticket you send to James.</p>`),

  g('full-outer-join', 'FULL OUTER JOIN', 19,
    'FULL OUTER JOIN in SQL Server: both leftovers',
    'Rows from either side that do not match, plus the matches.',
    'When to use FULL OUTER JOIN in SQL Server, with a worked example comparing two lists.',
    'FULL OUTER JOIN keeps matches and also the leftovers from both tables. At work that is “in A but not B, in B but not A, and in both.”',
    () => `
<h2>Products vs a stock list</h2>
${sql(`SELECT p.product_id, p.product_name, s.qty_on_hand
FROM Products p
FULL OUTER JOIN Stock s ON s.product_id = p.product_id;`)}
<p>A product with no stock row still shows (qty NULL). A stock row for a deleted product still shows (name NULL).</p>
<div class="mistake"><b>You probably wanted two LEFT JOINs</b>
<p>FULL OUTER is rare in day-to-day reports. Reconciling two extracts is the honest use. For “all customers and their orders”, LEFT JOIN is enough.</p></div>`),

  g('cross-join', 'CROSS JOIN', 9,
    'CROSS JOIN in SQL Server: every combination',
    'Every staff × every day. Easy to explode.',
    'What CROSS JOIN does in SQL Server, when a calendar of staff days needs it, and how it accidentally multiplies a total.',
    'CROSS JOIN pairs every row on the left with every row on the right. No ON. Ten staff and seven days is 70 rows. Ten staff and ten thousand orders is a mess.',
    () => `
<h2>A roster grid</h2>
${sql(`SELECT s.first_name, d.day_name
FROM Staff s
CROSS JOIN (VALUES ('Mon'),('Tue'),('Wed'),('Thu'),('Fri')) d(day_name)
ORDER BY s.first_name, d.day_name;`)}
<div class="mistake"><b>Forgot the ON</b>
<p>An old-style comma join ${c('FROM Orders, Customers')} is a CROSS JOIN. Then a WHERE that was meant to be the key. Miss the WHERE and the total is orders × customers. If a number looks ten times too big, count the rows first.</p></div>`),

  g('self-join', 'Self-join', 20,
    'Self-join in SQL Server: each person and their manager',
    'Join a table to itself. Staff.manager_id → Staff.',
    'How to self-join in SQL Server to list each employee with their manager’s name.',
    'The manager’s name lives in the same table. You join Staff to Staff and give each side an alias so SQL Server can tell them apart.',
    () => `
<h2>Staff with manager name</h2>
${sql(`SELECT e.first_name AS staff,
       e.team,
       m.first_name AS manager
FROM Staff e
LEFT JOIN Staff m ON m.staff_id = e.manager_id
ORDER BY e.first_name;`)}
<p>LEFT JOIN so the person at the top (no manager) still appears. INNER JOIN would hide them.</p>
<div class="mistake"><b>Same alias twice</b>
<p>You cannot say ${c('FROM Staff JOIN Staff')}. Name them ${c('e')} and ${c('m')}.</p></div>`),

  r('varchar-vs-nvarchar', 'varchar vs nvarchar', 27,
    'varchar vs nvarchar in SQL Server',
    'Plain text vs Unicode. Names and email are usually nvarchar.',
    'The difference between varchar and nvarchar in SQL Server, and which to use for names, email and codes at work.',
    'varchar stores non-Unicode text. nvarchar stores Unicode (N for national). If a name can have accents or other scripts, nvarchar is the one that will not turn them into question marks.',
    () => `
<h2>How they look</h2>
${sql(`SELECT CAST('Becky' AS varchar(20)) AS ascii_name,
       CAST(N'Sandrá' AS nvarchar(20)) AS unicode_name;`)}
<p>The ${c('N')} before a string literal means “this is Unicode.” Miss it and a nvarchar comparison can do extra conversions.</p>
<h2>At work</h2>
<ul>
<li>Names, addresses, free text: ${c('nvarchar')}.</li>
<li>Codes you control (status, SKU): ${c('varchar')} is fine.</li>
<li>${c('nvarchar(max)')} for a dump, not for a column you filter on all day.</li>
</ul>
<div class="mistake"><b>varchar(1) for a flag</b>
<p>Use ${c('char(1)')} or a ${c('bit')}. Do not store Yes/No as a long string if a bit will do.</p></div>`),

  r('int-decimal-money', 'int, decimal, money', 13,
    'int vs decimal vs money in SQL Server',
    'Counts are int. Money is decimal. Do not divide two ints.',
    'When to use int, bigint, decimal and money in SQL Server, and why integer division silently drops the pence.',
    'IDs and counts are integers. Money is decimal (or money). Divide two ints in SQL Server and you get an int: 3 / 2 is 1, not 1.5.',
    () => `
<h2>A safe average</h2>
${sql(`SELECT AVG(CAST(total_amount AS decimal(12,2))) AS avg_order
FROM Orders
WHERE status = 'Shipped';`)}
<p>${c('AVG')} on an int column returns int. Cast first if you want pence.</p>
<ul>
<li>${c('int')} — normal counts and IDs. ${c('bigint')} if it can exceed two billion.</li>
<li>${c('decimal(12,2)')} — pounds and pence. Precision you choose.</li>
<li>${c('money')} — works, but ${c('decimal')} is clearer in new work.</li>
</ul>
<div class="mistake"><b>float for invoices</b>
<p>Binary floating point does not land on 0.10 exactly. Finance notices. Use decimal.</p></div>`),

  r('date-vs-datetime', 'date vs datetime', 5,
    'date vs datetime vs datetime2 in SQL Server',
    'date is a day. datetime has a time. datetime2 is the modern one.',
    'Which SQL Server type to use for a birthday, an order timestamp, and why datetime rounded in ways that still bite old tables.',
    'A birthday is a date. An order stamped at 09:14 is a datetime (or datetime2). Mixing them is how “yesterday” leaks today.',
    () => `
<h2>Pick one</h2>
${sql(`SELECT CAST(GETDATE() AS date) AS just_day,
       GETDATE() AS datetime_now,
       SYSDATETIME() AS datetime2_now;`)}
<ul>
<li>${c('date')} — no time. Filters are simple.</li>
<li>${c('datetime')} — old default, odd rounding, range starts 1753.</li>
<li>${c('datetime2')} — prefer this for new timestamp columns.</li>
</ul>
<p>How to filter a timestamp by a day is on <a href="/guides/convert-datetime-to-date">datetime to date</a>.</p>`),

  r('bit-true-false', 'bit', 1,
    'bit in SQL Server: 0, 1 and NULL',
    'A yes/no flag. Not quite a boolean. NULL is the third state.',
    'How the bit type works in SQL Server, how SSMS shows it, and why NULL is not “no”.',
    'bit is SQL Server’s yes/no. It stores 0, 1, or NULL. SSMS often shows it as a checkbox. Reports still want a word.',
    () => `
<h2>Label it for a human</h2>
${sql(`SELECT product_name,
       CASE WHEN is_discontinued = 1 THEN 'Yes'
            WHEN is_discontinued = 0 THEN 'No'
            ELSE 'Unknown' END AS discontinued
FROM Products;`)}
<p>${c('WHERE is_discontinued = 0')} does not include NULL. If the flag was never set, those rows vanish. Say whether unknown counts as no.</p>`),

  r('uniqueidentifier', 'uniqueidentifier', 1,
    'uniqueidentifier (GUID) in SQL Server',
    'A wide random id. Fine as a key, clumsy as a clustered index.',
    'What uniqueidentifier is in SQL Server, NEWID() vs NEWSEQUENTIALID(), and when a plain int is kinder.',
    'A uniqueidentifier is a 16-byte GUID. Systems use them when ids must be unique across machines. They are painful to type and make a clustered index jump around if you use NEWID().',
    () => `
<h2>Make one</h2>
${sql(`SELECT NEWID() AS random_guid;`)}
<p>At work, if the table already has an ${c('int')} identity, keep using that for joins. Join on the GUID only when that is the real key.</p>
<div class="mistake"><b>WHERE id = 'the-guid-without-quotes'</b>
<p>It is a literal. Quote it. And do not ${c('SELECT *')} and paste a 36-character id into Slack if a customer number exists.</p></div>`),

  r('cast-convert', 'CAST and CONVERT', 23,
    'CAST and CONVERT in SQL Server',
    'Change a type. CAST for readability. CONVERT when you need a style.',
    'CAST vs CONVERT in SQL Server with worked examples for dates and numbers.',
    'CAST says what type you want. CONVERT can also take a style number, which is how people still format dates as yyyy-mm.',
    () => `
<h2>Both</h2>
${sql(`SELECT CAST(total_amount AS int) AS pounds_only,
       CONVERT(char(10), order_date, 23) AS iso_date,
       CONVERT(char(7), order_date, 120) AS year_month
FROM Orders;`)}
<p>Style 23 is yyyy-mm-dd. Style 120 is yyyy-mm-dd hh:mi:ss, which is why ${c('char(7)')} becomes yyyy-mm. See <a href="/tsql/group-by-month">group by month</a>.</p>`),

  r('try-cast', 'TRY_CAST', 27,
    'TRY_CAST in SQL Server: convert without blowing up',
    'Bad text becomes NULL instead of an error that stops the report.',
    'How TRY_CAST and TRY_CONVERT work in SQL Server when a dirty column has mixed text and numbers.',
    'CAST on a dirty column stops the whole query at the first bad value. TRY_CAST returns NULL for that row and keeps going. That is what you want on an import.',
    () => `
<h2>A messy quantity</h2>
${sql(`SELECT product_name,
       TRY_CAST(raw_qty AS int) AS qty
FROM ImportLines;`)}
<p>Rows that say “n/a” become NULL qty. You can find them with ${c('WHERE TRY_CAST(raw_qty AS int) IS NULL AND raw_qty IS NOT NULL')}.</p>`),

  r('null-vs-blank', 'NULL vs blank', 7,
    'NULL vs empty string in SQL Server',
    'NULL means unknown. A blank means someone typed nothing. They are not equal.',
    'The difference between NULL and an empty string in SQL Server, and how to treat both as “no phone”.',
    'NULL is unknown. A blank is a value. An empty-string check is false for NULL. Reports that should say No phone need to catch both.',
    () => `
<h2>Treat both as missing</h2>
${sql(`SELECT customer_id, first_name,
       CASE WHEN phone IS NULL OR LTRIM(RTRIM(phone)) = '' THEN 'No phone'
            ELSE phone END AS phone
FROM Customers;`)}
<p>Or ${c("NULLIF(LTRIM(RTRIM(phone)), '')")} which turns a blank into NULL, then ${c('ISNULL')}.</p>
<div class="mistake"><b>= NULL</b>
<p>Never true. Use ${c('IS NULL')}. Same as on the <a href="/tsql/isnull">ISNULL</a> page.</p></div>`),

  r('like', 'LIKE', 27,
    'LIKE in SQL Server: search text',
    '% for any length. _ for one character. Watch the leading %.',
    'How LIKE works in SQL Server, wildcards, and why LIKE \'%smith%\' can be slow on a big table.',
    'LIKE is pattern match on text. % means any string. _ means one character. People use it for “name contains”.',
    () => `
<h2>Contains, starts with</h2>
${sql(`SELECT customer_id, first_name, last_name, email
FROM Customers
WHERE last_name LIKE 'Ash%'          -- starts with Ash
   OR email LIKE '%@harbour.co';     -- ends with that domain`)}
<div class="mistake"><b>Leading %</b>
<p>${c("LIKE '%son'")} cannot use a normal index well. Fine on Customers. Painful on ten million log rows. If you do it every morning, talk about full-text or a computed last-four column.</p></div>
<p>To search for a real % character, use ${c('ESCAPE')} or ${c("LIKE '%[%]%'")}.</p>`),

  r('substring', 'SUBSTRING, LEFT, RIGHT', 27,
    'SUBSTRING, LEFT and RIGHT in SQL Server',
    'Pull a piece of a string. First 4 of a postcode, last 4 of a card we should not store.',
    'How to take part of a string in SQL Server with LEFT, RIGHT and SUBSTRING, with a postcode example.',
    'LEFT is the start. RIGHT is the end. SUBSTRING is a middle slice. At work: first part of a postcode, not a credit card.',
    () => `
<h2>Postcode area</h2>
${sql(`SELECT customer_id,
       LEFT(postcode, CHARINDEX(' ', postcode + ' ') - 1) AS area
FROM Customers;`)}
<p>${c('LEFT(postcode, 4)')} is simpler if you always want four characters. The CHARINDEX version stops at the space.</p>
${sql(`SELECT SUBSTRING(email, CHARINDEX('@', email) + 1, 200) AS domain
FROM Customers
WHERE email LIKE '%@%';`)}`),

  r('trim', 'TRIM', 27,
    'TRIM, LTRIM and RTRIM in SQL Server',
    'Knock spaces off a name before you compare or de-duplicate.',
    'How to trim spaces in SQL Server, and why duplicates hide behind a trailing space.',
    'Imports come in with spaces. Two emails that look the same will not GROUP BY together until you trim.',
    () => `
<h2>Clean then compare</h2>
${sql(`SELECT LOWER(TRIM(email)) AS email, COUNT(*) AS times
FROM Customers
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1;`)}
<p>${c('TRIM')} (2017+) knocks both ends. Older servers: ${c('LTRIM(RTRIM(email))')}. See <a href="/guides/find-duplicate-customers">find duplicates</a>.</p>`),

  r('concat', 'CONCAT', 9,
    'CONCAT and + in SQL Server',
    'Stick first and last name together. + dies on NULL. CONCAT does not.',
    'How to concatenate strings in SQL Server: the + operator vs CONCAT, and the NULL trap.',
    'Plus joins strings. If any part is NULL, the whole thing becomes NULL. CONCAT treats NULL as empty. Use CONCAT for a display name.',
    () => `
<h2>A display name</h2>
${sql(`SELECT customer_id,
       CONCAT(first_name, ' ', last_name) AS name,
       first_name + ' ' + last_name AS name_plus_nulls
FROM Customers;`)}
<p>If ${c('last_name')} is NULL, ${c('name_plus_nulls')} is NULL and the mail merge is blank. ${c('CONCAT')} still prints the first name.</p>`),

  r('replace', 'REPLACE', 27,
    'REPLACE in SQL Server',
    'Swap text. Hyphens out of a phone number. Not a regex.',
    'How REPLACE works in SQL Server, with a worked example cleaning a phone number.',
    'REPLACE swaps every copy of a bit of text for something else. It is not a regular expression. For messy phones, nest a few.',
    () => `
<h2>Digits-only phone</h2>
${sql(`SELECT customer_id, phone,
       REPLACE(REPLACE(REPLACE(ISNULL(phone, ''), ' ', ''), '-', ''), '(', '') AS phone_flat
FROM Customers;`)}
<p>Still not perfect (${c(')')} and ${c('+44')}). Good enough to find “the same number typed two ways” before you buy a cleaner.</p>`),

  r('charindex', 'CHARINDEX', 27,
    'CHARINDEX in SQL Server: find a character',
    'Position of @ in an email. Zero means not found.',
    'How CHARINDEX works in SQL Server, and how to split on the first space or @.',
    'CHARINDEX returns the position of a search string, starting at 1. Zero means it was not there. People use it to split email and names.',
    () => `
<h2>Domain after @</h2>
${sql(`SELECT email,
       CASE WHEN CHARINDEX('@', email) = 0 THEN NULL
            ELSE SUBSTRING(email, CHARINDEX('@', email) + 1, 200) END AS domain
FROM Customers;`)}
<p>${c('PATINDEX')} is the same idea with a LIKE pattern. ${c('CHARINDEX')} is enough for a single character.</p>`),

  g('datediff-age', 'Age from a date', 5,
    'How to work out age in SQL Server (and why DATEDIFF(year) lies)',
    'Birthday to today. Do not use years crossed. Check the birthday has happened.',
    'How to calculate age in years from a date of birth in SQL Server, and why DATEDIFF(year, dob, GETDATE()) is a year out before their birthday.',
    'DATEDIFF(year, dob, today) counts New Year’s Eves, not birthdays. Someone born 31 December 2000 is “26” on 1 January 2026. They are 25.',
    () => `
<h2>The honest age</h2>
${sql(`SELECT customer_id, first_name, date_of_birth,
       DATEDIFF(year, date_of_birth, GETDATE())
         - CASE WHEN DATEADD(year, DATEDIFF(year, date_of_birth, GETDATE()), date_of_birth) > CAST(GETDATE() AS date)
                THEN 1 ELSE 0 END AS age
FROM Customers;`)}
<p>Work out the year gap, then subtract one if this year’s birthday is still in the future.</p>
<div class="mistake"><b>DATEDIFF(year) on its own</b>
<p>Fine for a rough “how many year boundaries.” Wrong on a form, a discount, or anything legal-looking. Same boundary trick as <a href="/tsql/datediff">DATEDIFF</a>.</p></div>
<h2>Age in days or months</h2>
${sql(`SELECT DATEDIFF(day, date_of_birth, CAST(GETDATE() AS date)) AS age_days;`)}
<p>Days are honest. Months have the same boundary issue as years.</p>`),

  r('eomonth', 'EOMONTH', 23,
    'EOMONTH in SQL Server: last day of the month',
    'Month-end close. First day is EOMONTH plus one, last month.',
    'How to get month start and month end in SQL Server with EOMONTH, for a finance close.',
    'EOMONTH returns the last day of the month of a date. Finance lives on month ends. First of the month is one day after last month’s EOMONTH.',
    () => `
<h2>This month so far</h2>
${sql(`DECLARE @today date = CAST(GETDATE() AS date);
DECLARE @start date = DATEADD(day, 1, EOMONTH(@today, -1));

SELECT order_id, order_date, total_amount
FROM Orders
WHERE order_date >= @start
  AND order_date <  DATEADD(day, 1, @today);`)}
<p>${c('EOMONTH(@today, -1)')} is last day of last month. Add a day, you have this month’s 1st.</p>`),

  r('datepart', 'DATEPART', 5,
    'DATEPART and DATENAME in SQL Server',
    'Weekday, month number, week number. DATEFIRST changes weekday.',
    'How DATEPART and DATENAME work in SQL Server, and the DATEFIRST trap on weekdays.',
    'DATEPART pulls a number out of a date (month = 10). DATENAME pulls a word (October). Weekday numbers depend on DATEFIRST, which is not the same on every server.',
    () => `
<h2>Month and weekday</h2>
${sql(`SELECT order_id, order_date,
       DATEPART(month, order_date) AS month_no,
       DATENAME(month, order_date) AS month_name,
       DATENAME(weekday, order_date) AS weekday_name
FROM Orders;`)}
<p>For “Monday to Sunday last week”, do not trust ${c('DATEPART(weekday, …)')} alone. Pin the week as on <a href="/guides/last-week-orders">last week’s orders</a>.</p>`),

  r('format-dates', 'FORMAT dates', 23,
    'FORMAT dates in SQL Server',
    'Pretty for a slide. Slow for a GROUP BY on a big table.',
    'When to use FORMAT for dates in SQL Server, and when CONVERT is the better habit.',
    'FORMAT makes dates look like “31 Oct 2026”. It is easy and it is not cheap. For grouping and filtering, keep a real date or CONVERT to yyyy-mm.',
    () => `
<h2>For the email, not the GROUP BY</h2>
${sql(`SELECT FORMAT(order_date, 'dd MMM yyyy') AS nice,
       CONVERT(char(10), order_date, 23) AS iso
FROM Orders;`)}
<p>Group with CONVERT or DATEFROMPARTS, then FORMAT only in the last SELECT if someone insists on “Oct 2026” in the grid. See <a href="/tsql/group-by-month">group by month</a>.</p>`),

  r('group-by', 'GROUP BY', 14,
    'GROUP BY in SQL Server: one row per bucket',
    'Orders by status. Revenue by customer. Every non-total column goes in the GROUP BY.',
    'How GROUP BY works in SQL Server, with a worked example of orders and revenue by status.',
    'GROUP BY collapses rows that share a value into one. COUNT and SUM then talk about that pile. Any column you SELECT without totalling must appear in the GROUP BY.',
    () => `
<h2>By status</h2>
${sql(`SELECT status,
       COUNT(*) AS orders,
       SUM(total_amount) AS revenue
FROM Orders
GROUP BY status
ORDER BY revenue DESC;`)}
<p>If you add ${c('customer_id')} to the SELECT, you must add it to the GROUP BY, or SQL Server raises <a href="/tsql/invalid-in-the-select-list">Msg 8120</a>.</p>`),

  r('distinct', 'DISTINCT', 13,
    'SELECT DISTINCT in SQL Server',
    'Unique values. Use it to peek. Prefer GROUP BY when you also want a count.',
    'When SELECT DISTINCT is right in SQL Server, and when COUNT(DISTINCT) or GROUP BY is clearer.',
    'DISTINCT removes duplicate rows from the result. It is a quick “which statuses exist.” It is a poor way to write a real report that also needs totals.',
    () => `
<h2>Which statuses</h2>
${sql(`SELECT DISTINCT status
FROM Orders
ORDER BY status;`)}
<h2>How many of each</h2>
${sql(`SELECT status, COUNT(*) AS orders
FROM Orders
GROUP BY status;`)}
<p>That second query is what people meant. DISTINCT would hide the count.</p>`),

  r('in-list', 'IN', 3,
    'IN and NOT IN in SQL Server',
    'Status in a short list. NOT IN dies if the list contains NULL.',
    'How IN works in SQL Server, and why NOT IN (subquery) returns nothing when a NULL sneaks in.',
    'IN is “equals any of these.” Fine for a short list you wrote. NOT IN plus a subquery that can return NULL is a well-known trap.',
    () => `
<h2>A list you wrote</h2>
${sql(`SELECT order_id, status, total_amount
FROM Orders
WHERE status IN ('Shipped', 'Processing')
ORDER BY order_id;`)}
<div class="mistake"><b>NOT IN (SELECT phone …)</b>
<p>If one phone is NULL, the whole NOT IN becomes unknown, and you get no rows. Use ${c('NOT EXISTS')} or ${c('WHERE phone NOT IN (…) AND phone IS NOT NULL')}. Prefer <a href="/tsql/left-join-is-null">NOT EXISTS</a>.</p></div>`),

  r('exists', 'EXISTS', 21,
    'EXISTS in SQL Server: “has at least one”',
    'Customers with a cancelled order. Stops at the first match.',
    'How EXISTS works in SQL Server compared with IN and JOIN, with a cancelled-order example.',
    'EXISTS asks whether a subquery finds a row. It does not care how many. That is the right shape for “customers who have ever cancelled.”',
    () => `
<h2>Has a cancelled order</h2>
${sql(`SELECT c.customer_id, c.first_name, c.last_name
FROM Customers c
WHERE EXISTS (
  SELECT 1 FROM Orders o
  WHERE o.customer_id = c.customer_id
    AND o.status = 'Cancelled'
);`)}
<p>${c('SELECT 1')} is a habit. EXISTS only checks for a row, not the value. A JOIN to cancelled orders can duplicate the customer if they cancelled twice.</p>`),

  r('and-or', 'AND and OR', 3,
    'AND vs OR in SQL Server: put the brackets in',
    'OR without brackets is how a filter quietly goes wide.',
    'How AND and OR combine in SQL Server, and why you should bracket OR in a workplace WHERE clause.',
    'AND is both. OR is either. AND binds tighter, so a missing bracket means “all shipped rows, plus anything over £50” when you meant “shipped and over £50.”',
    () => `
<h2>What you meant</h2>
${sql(`SELECT order_id, status, total_amount
FROM Orders
WHERE status = 'Shipped'
  AND (total_amount > 50 OR customer_id = 12);`)}
<div class="mistake"><b>No brackets</b>
<p>${c("WHERE status = 'Shipped' AND total_amount > 50 OR customer_id = 12")} includes every order for customer 12, including cancelled ones. When you type OR, add brackets.</p></div>`),

  r('union', 'UNION', 13,
    'UNION vs UNION ALL in SQL Server',
    'Stack two result sets. ALL keeps duplicates and is faster.',
    'The difference between UNION and UNION ALL in SQL Server, and when to stack two queries at work.',
    'UNION stacks rows. UNION ALL keeps duplicates. UNION distincts them, which means a sort. If the two piles cannot overlap, use ALL.',
    () => `
<h2>This week and a one-off extract</h2>
${sql(`SELECT order_id, total_amount, 'live' AS source FROM Orders
WHERE order_date >= CAST(GETDATE() AS date)
UNION ALL
SELECT order_id, total_amount, 'archive' FROM OrdersArchive
WHERE order_date >= CAST(GETDATE() AS date);`)}
<p>Column count and types must match. Names come from the first SELECT.</p>`),

  r('subquery', 'Subquery', 26,
    'Subqueries in SQL Server: a query inside a query',
    'Orders above average. Or a scalar in the SELECT. Easy to hide a slow extra hit.',
    'How to write a subquery in SQL Server, with a worked example of orders above average order value.',
    'A subquery is a SELECT in brackets. In WHERE it filters. In FROM it is a derived table. In SELECT it runs per row if you are not careful.',
    () => `
<h2>Above average</h2>
${sql(`SELECT order_id, total_amount
FROM Orders
WHERE total_amount > (SELECT AVG(total_amount) FROM Orders)
ORDER BY total_amount DESC;`)}
<p>The inner query runs once here. A correlated subquery that mentions the outer table can run once per row. If it is slow, rewrite as a JOIN to a grouped CTE. See <a href="/guides/cte-for-reports">CTEs</a>.</p>`),

  r('rank', 'RANK', 33,
    'RANK vs DENSE_RANK vs ROW_NUMBER in SQL Server',
    'Ties. RANK skips. DENSE_RANK does not. ROW_NUMBER never ties.',
    'The difference between RANK, DENSE_RANK and ROW_NUMBER in SQL Server, with a product ranking example.',
    'ROW_NUMBER is for “one row per group.” RANK is for a league table that skips after a tie (1, 1, 3). DENSE_RANK is 1, 1, 2.',
    () => `
<h2>Products in a category</h2>
${sql(`SELECT category, product_name, units_sold,
       RANK() OVER (PARTITION BY category ORDER BY units_sold DESC) AS rnk,
       DENSE_RANK() OVER (PARTITION BY category ORDER BY units_sold DESC) AS dense,
       ROW_NUMBER() OVER (PARTITION BY category ORDER BY units_sold DESC, product_id) AS rn
FROM ProductSales;`)}
<p>For “latest order per customer” use <a href="/tsql/row-number">ROW_NUMBER</a>, not RANK. Two orders on the same day would both be rank 1.</p>`),

  r('lag', 'LAG and LEAD', 34,
    'LAG and LEAD in SQL Server: the previous row',
    'This month versus last month, without a self-join.',
    'How LAG and LEAD work in SQL Server for month-over-month change.',
    'LAG looks at the previous row in the order you set. LEAD looks forward. That is month-over-month without joining the table to itself.',
    () => `
<h2>Month-over-month revenue</h2>
${sql(`WITH m AS (
  SELECT CONVERT(char(7), order_date, 120) AS month,
         SUM(total_amount) AS revenue
  FROM Orders
  GROUP BY CONVERT(char(7), order_date, 120)
)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_month,
       revenue - LAG(revenue) OVER (ORDER BY month) AS change
FROM m
ORDER BY month;`)}
<p>The first month has no previous row, so LAG is NULL. Wrap it in ${c('ISNULL')} if the sheet cannot stand a blank.</p>`),

  r('running-total', 'Running total', 32,
    'Running totals in SQL Server with SUM() OVER',
    'Daily revenue and the year-to-date next to it.',
    'How to write a running total in SQL Server using a window SUM, with a daily revenue example.',
    'SUM() OVER adds as it goes. You keep the detail rows. No cursor. No triangular join.',
    () => `
<h2>Daily take, running total</h2>
${sql(`SELECT CAST(order_date AS date) AS day,
       SUM(total_amount) AS revenue,
       SUM(SUM(total_amount)) OVER (ORDER BY CAST(order_date AS date)) AS running
FROM Orders
WHERE status = 'Shipped'
GROUP BY CAST(order_date AS date)
ORDER BY day;`)}
<p>The inner SUM is per day. The window SUM walks those daily totals in date order. Leave ${c('ROWS UNBOUNDED PRECEDING')} implicit unless you need to be exact about ties.</p>`),

  r('offset-fetch', 'OFFSET FETCH', 11,
    'OFFSET FETCH in SQL Server: paging',
    'Page 2 of a grid. Always with ORDER BY. TOP is simpler for “first 5”.',
    'How OFFSET FETCH paging works in SQL Server, versus SELECT TOP.',
    'OFFSET FETCH skips N rows then takes M. It is paging. It needs ORDER BY. For “the five biggest” you still want TOP.',
    () => `
<h2>Page of customers</h2>
${sql(`SELECT customer_id, first_name, last_name, email
FROM Customers
ORDER BY last_name, customer_id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;`)}
<p>Page 3 if the page size is 10. Without a stable ORDER BY (include the key), page 2 can overlap page 1 after an insert.</p>`),

  r('coalesce', 'COALESCE', 7,
    'COALESCE in SQL Server',
    'First non-NULL. Several fallbacks. Prefer this over nested ISNULL if you know other databases.',
    'How COALESCE works in SQL Server compared with ISNULL, with a phone-or-email example.',
    'COALESCE returns the first argument that is not NULL. You can pass three or four. ISNULL only takes two. See also <a href="/tsql/isnull">ISNULL</a>.',
    () => `
<h2>Something we can contact</h2>
${sql(`SELECT customer_id, first_name,
       COALESCE(NULLIF(LTRIM(RTRIM(phone)), ''), email, 'No contact') AS contact
FROM Customers;`)}
<p>${c('NULLIF')} turns a blank phone into NULL so COALESCE can skip it and try email.</p>`),

  r('temp-table', 'Temp tables', 29,
    'Temp tables vs table variables vs CTEs in SQL Server',
    '#scratch for a step you need twice. CTE if it is only this statement.',
    'When to use a temp table, a table variable or a CTE in SQL Server at work.',
    'A CTE is a name for this statement. A temp table (#name) lives for the batch and can have indexes. A table variable is easy and often a worse plan. For a morning report, CTE or #temp is enough.',
    () => `
<h2>A #temp you reuse</h2>
${sql(`SELECT customer_id, MAX(order_date) AS last_date
INTO #last
FROM Orders
GROUP BY customer_id;

SELECT c.first_name, c.last_name, l.last_date
FROM Customers c
JOIN #last l ON l.customer_id = c.customer_id
WHERE l.last_date < DATEADD(day, -90, CAST(GETDATE() AS date));`)}
<p>Drop is automatic at the end of the session. In SSMS, run the whole batch, not just the second half.</p>`),

  r('variables', 'Variables', 5,
    'Variables in SQL Server: DECLARE and SET',
    'Put today’s midnight in a name so the WHERE is readable.',
    'How to declare and set variables in T-SQL, with a date-range example you can reuse.',
    'A variable is a name for a value in this batch. Use them so the same midnight is not typed twice and the two ends cannot drift.',
    () => `
<h2>One range, two uses</h2>
${sql(`DECLARE @today date = CAST(GETDATE() AS date);
DECLARE @from date = DATEADD(day, -7, @today);

SELECT * FROM Orders WHERE order_date >= @from AND order_date < @today;
SELECT COUNT(*) AS orders, SUM(total_amount) AS revenue
FROM Orders WHERE order_date >= @from AND order_date < @today;`)}
<p>Set on DECLARE (2008+) or ${c('SET @today = …')}. ${c('SELECT @today = …')} also works and confuses people. Prefer SET or DECLARE.</p>`),

  r('insert-select', 'INSERT SELECT', 1,
    'INSERT … SELECT in SQL Server',
    'Copy rows into a table. Name the columns. Do not SELECT *.',
    'How INSERT SELECT works in SQL Server, and the column-list habit that saves you when the table grows.',
    'INSERT SELECT copies the result of a query into a table. Name both sides. SELECT * will break the day someone adds a column.',
    () => `
<h2>A working copy</h2>
${sql(`INSERT INTO OrdersAudit (order_id, customer_id, total_amount, copied_at)
SELECT order_id, customer_id, total_amount, GETDATE()
FROM Orders
WHERE order_date >= CAST(GETDATE() AS date);`)}
<p>WorkSQL does not run inserts. At work, wrap a write in a transaction if you are still learning, and SELECT the output first without the INSERT.</p>`),

  r('update-join', 'UPDATE with JOIN', 36,
    'UPDATE … FROM JOIN in SQL Server',
    'Set a column from another table. Preview with SELECT first.',
    'How SQL Server’s UPDATE FROM JOIN works, and the preview habit that stops a bad write.',
    'SQL Server lets you UPDATE from a JOIN. That is handy and dangerous. Write the SELECT first. When the grid is right, change SELECT to UPDATE.',
    () => `
<h2>Preview, then write</h2>
${sql(`-- Look first
SELECT c.customer_id, c.phone, i.new_phone
FROM Customers c
JOIN ImportPhones i ON i.customer_id = c.customer_id;

-- Then, and only then
-- UPDATE c SET phone = i.new_phone
-- FROM Customers c
-- JOIN ImportPhones i ON i.customer_id = c.customer_id;`)}
<div class="mistake"><b>No WHERE and no JOIN</b>
<p>${c('UPDATE Customers SET phone = NULL')} is everyone. Check ${c('@@ROWCOUNT')} after. WorkSQL will not run this. Your live server will.</p></div>`),

  r('foreign-key', 'Foreign keys', 9,
    'Primary keys and foreign keys in SQL Server',
    'Orders.customer_id must exist in Customers. That is the join you already write.',
    'What primary keys and foreign keys mean in SQL Server, in the language of the Orders–Customers join.',
    'A primary key uniquely identifies a row (customer_id). A foreign key says this value must exist over there (Orders.customer_id → Customers). The JOIN you write follows that line.',
    () => `
<h2>The line you already use</h2>
${sql(`SELECT o.order_id, c.first_name, c.last_name
FROM Orders o
JOIN Customers c ON c.customer_id = o.customer_id;`)}
<p>If a foreign key exists, an order cannot be saved for a customer that is not there. If it does not exist, you will find orphan orders with a <a href="/guides/left-join">LEFT JOIN</a> and NULL names.</p>`),

  r('collation', 'Collation', 27,
    'Collation in SQL Server: why two emails do not match',
    'CI = ignore case. CS = case sensitive. Accents too.',
    'What collation means in SQL Server when a join on email fails because of case or accents.',
    'Collation is the rules for comparing text: case, accents, alphabet. A CI (case-insensitive) database treats Sam@ and sam@ as equal. A CS one does not.',
    () => `
<h2>See the rules</h2>
${sql(`SELECT name, collation_name FROM sys.databases WHERE name = DB_NAME();
SELECT email FROM Customers WHERE email = 'sam@harbour.co';`)}
<p>If a join misses rows that look the same, check trailing spaces first (<a href="/guides/trim">TRIM</a>), then collation. Do not sprinkle ${c('COLLATE')} on every column as a habit. Fix the data or the column.</p>`),

  r('nolock', 'NOLOCK', 14,
    'WITH (NOLOCK) in SQL Server: why people put it on, and why you should not',
    'Dirty reads. You can see a row that gets rolled back.',
    'What NOLOCK does in SQL Server, why it shows up on old workplace scripts, and when READ UNCOMMITTED is a bad idea.',
    'NOLOCK means “do not wait for other people’s locks.” You can read a value that never committed. Reports go out. Then the number changes.',
    () => `
<h2>What you will see in old scripts</h2>
${sql(`SELECT order_id, total_amount
FROM Orders WITH (NOLOCK)
WHERE order_date >= CAST(GETDATE() AS date);`)}
<p>Someone put it on because a report blocked a checkout, or the other way round. The fix is usually a better index or a replica, not dirty reads on finance numbers.</p>
<div class="mistake"><b>NOLOCK on a total you will send</b>
<p>If James will stand up the number, wait for the committed rows.</p></div>`),

  r('iif', 'IIF', 17,
    'IIF in SQL Server: a short CASE',
    'Two-way only. CASE when there are three bands.',
    'How IIF works in SQL Server as a shorthand for a two-branch CASE.',
    'IIF(condition, a, b) is CASE WHEN condition THEN a ELSE b END. Fine for yes/no. For Small / Medium / Large, write CASE so the edges stay visible.',
    () => `
<h2>Two-way</h2>
${sql(`SELECT order_id, total_amount,
       IIF(total_amount >= 150, 'Large', 'Not large') AS size
FROM Orders;`)}
<p>Three bands belong on <a href="/tsql/case-when">CASE WHEN</a>.</p>`),

  r('having', 'HAVING', 16,
    'HAVING in SQL Server: filter after the total',
    'Customers over £1,000. WHERE cannot see a SUM.',
    'HAVING examples in SQL Server after GROUP BY, and how it differs from WHERE.',
    'HAVING is WHERE for groups. It runs after GROUP BY. That is the only reason it exists. Longer version: <a href="/guides/where-vs-having">WHERE vs HAVING</a>.',
    () => `
<h2>Over £1,000</h2>
${sql(`SELECT customer_id, SUM(total_amount) AS spent
FROM Orders
WHERE status <> 'Cancelled'
GROUP BY customer_id
HAVING SUM(total_amount) > 1000
ORDER BY spent DESC;`)}`),

  r('count', 'COUNT', 13,
    'COUNT in SQL Server: rows, values, and distinct people',
    'COUNT(*) is rows. COUNT(column) skips NULL. COUNT(DISTINCT) is people.',
    'COUNT(*), COUNT(column) and COUNT(DISTINCT) in SQL Server with a last-week example.',
    'Three different questions. See also <a href="/guides/count-vs-count-distinct">COUNT vs COUNT DISTINCT</a>.',
    () => `
<h2>Last week</h2>
${sql(`SELECT COUNT(*) AS orders,
       COUNT(customer_id) AS orders_with_customer,
       COUNT(DISTINCT customer_id) AS customers
FROM Orders
WHERE order_date >= DATEADD(day, -7, CAST(GETDATE() AS date))
  AND order_date <  CAST(GETDATE() AS date);`)}`),

  r('sum-avg', 'SUM and AVG', 13,
    'SUM and AVG in SQL Server',
    'Totals and averages. AVG of an int is an int unless you cast.',
    'How SUM and AVG work in SQL Server, including NULL handling and integer averages.',
    'SUM ignores NULL. AVG ignores NULL too, and does not count those rows in the divisor. Empty set: SUM is NULL, not zero. Wrap ISNULL if the sheet needs 0.',
    () => `
<h2>Finance three</h2>
${sql(`SELECT COUNT(*) AS orders,
       ISNULL(SUM(total_amount), 0) AS revenue,
       AVG(CAST(total_amount AS decimal(12,2))) AS avg_order
FROM Orders
WHERE status = 'Shipped';`)}`),

  r('order-by', 'ORDER BY', 11,
    'ORDER BY in SQL Server',
    'The only way a result has an order. TOP without it is random.',
    'How ORDER BY works in SQL Server, including multiple columns and why SELECT * plus TOP is meaningless without it.',
    'SQL Server does not promise order unless you say ORDER BY. “Looks sorted” today is not a contract.',
    () => `
<h2>Biggest first, then newest</h2>
${sql(`SELECT TOP (10) order_id, order_date, total_amount
FROM Orders
ORDER BY total_amount DESC, order_date DESC;`)}
<p>Second column is the tie-break. See <a href="/tsql/top">TOP</a>.</p>`),

  r('where', 'WHERE', 3,
    'WHERE in SQL Server: keep some rows',
    'Filter before you total. Quotes around text. No quotes around numbers.',
    'How WHERE works in SQL Server, with text versus number filters and the quote mistake.',
    'WHERE keeps rows that match. Text takes quotes. Numbers do not. Dates are safer as a range than as a string you hope converts.',
    () => `
<h2>Text and money</h2>
${sql(`SELECT order_id, status, total_amount
FROM Orders
WHERE status = 'Shipped'
  AND total_amount > 50
ORDER BY total_amount DESC;`)}
<div class="mistake"><b>Quotes on a number, none on text</b>
<p>${c('status = Processing')} can look like a column. ${c("total_amount = '50'")} often still works via conversion and then one day it does not. Match the type.</p></div>`),

  r('aliases', 'Aliases', 9,
    'Table and column aliases in SQL Server',
    'AS name. o.order_id. Give every function a header.',
    'How to alias tables and columns in SQL Server so joins stay readable and ISNULL keeps its header.',
    'A column alias is the header in the grid. A table alias is the short name in a join. Miss the column alias on ISNULL and you get “(No column name)”.',
    () => `
<h2>Readable join</h2>
${sql(`SELECT o.order_id,
       c.first_name + ' ' + c.last_name AS customer,
       ISNULL(c.phone, 'No phone') AS phone
FROM Orders o
JOIN Customers c ON c.customer_id = o.customer_id;`)}
<p>${c('AS')} is optional. Use it. ${c('customer =')} at the front (equals alias) is an old style. Stick to ${c('AS')}.</p>`),

  g('second-highest', 'Second highest', 39,
    'Second highest value in SQL Server',
    'The interview one. OFFSET, ROW_NUMBER, or a subquery.',
    'How to get the second highest value in SQL Server, the way an interview and a real report both ask.',
    '“Second biggest order” is a ranking problem. OFFSET 1 FETCH 1 is the short version. ROW_NUMBER is the one you can extend to fifth, or per customer.',
    () => `
<h2>One number</h2>
${sql(`SELECT DISTINCT total_amount
FROM Orders
ORDER BY total_amount DESC
OFFSET 1 ROW FETCH NEXT 1 ROW ONLY;`)}
<h2>The whole row</h2>
${sql(`WITH ranked AS (
  SELECT order_id, customer_id, total_amount,
         DENSE_RANK() OVER (ORDER BY total_amount DESC) AS rnk
  FROM Orders
)
SELECT order_id, customer_id, total_amount
FROM ranked
WHERE rnk = 2;`)}
<p>DENSE_RANK so a tie for first still gives you a second place. ROW_NUMBER would skip one of the tied firsts and call the next row 2.</p>`),
];
