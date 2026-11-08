// Plain-English openers and step-through examples for the existing reference and guide pages.
// Shown right under each page's lede. Every page uses the same tiny dataset, so a reader who has
// met Amy, Ben, Cara and Dev on one page recognises them on the next.
const { c, table, plain, joinDemo, slides } = require('./article-html');

const CUSTOMERS = {
  name: 'Customers', cols: ['customer_id', 'first_name', 'city'],
  rows: [[1001, 'Amy', 'Leeds'], [1002, 'Ben', 'York'], [1003, 'Cara', 'Leeds'], [1004, 'Dev', 'Hull']],
};
// Order 5004 belongs to customer 1009, who was deleted: the orphan that RIGHT and FULL joins show up.
const ORDERS = {
  name: 'Orders', cols: ['order_id', 'customer_id', 'total'],
  rows: [[5001, 1001, 40], [5002, 1001, 25], [5003, 1003, 60], [5004, 1009, 15]],
};
const per = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const orderSay = (verb) => (l, n) => (n ? `${l[1]} (customer ${l[0]}) has ${per(n, 'order')}, so ${l[1]} ${n === 1 ? 'appears once' : `appears ${n} times`}.` : `${l[1]} has no orders. ${verb}`);

const SALES = [['Leeds', 40], ['Leeds', 25], ['York', 30], ['Leeds', 60], ['Hull', 15]];

module.exports = {
  // ================= joins =================
  'inner-join': () => `${plain('You have two lists that share an ID. INNER JOIN lines them up and keeps only the people who appear in both: customers who have at least one order. Anyone missing from either side is left out.')}
${joinDemo({ title: 'Step through it: Customers INNER JOIN Orders', left: CUSTOMERS, right: ORDERS, on: ['customer_id', 'customer_id'], type: 'inner',
    pick: ['l.first_name', 'l.city', 'r.order_id', 'r.total'], say: orderSay('INNER JOIN leaves them out.') })}`,

  'left-join': () => `${plain('Start with the whole left list and keep every row of it. Where the right list has a match, fill in the details; where it does not, leave the gaps empty (NULL). “Every customer, plus their orders if they have any.”')}
${joinDemo({ title: 'Step through it: Customers LEFT JOIN Orders', left: CUSTOMERS, right: ORDERS, on: ['customer_id', 'customer_id'], type: 'left',
    pick: ['l.first_name', 'l.city', 'r.order_id', 'r.total'], say: orderSay('LEFT JOIN keeps them anyway, with NULL order columns.') })}`,

  'left-join-is-null': () => `${plain('To find who is missing, do a LEFT JOIN and keep only the rows where the right side came back empty. Those are the customers who never placed an order: the people a marketing team wants to email.')}
${joinDemo({ title: 'Step through it: who has never ordered?', left: CUSTOMERS, right: ORDERS, on: ['customer_id', 'customer_id'], type: 'anti',
    pick: ['l.customer_id', 'l.first_name', 'l.city'], say: (l, n) => (n ? `${l[1]} has ${per(n, 'order')}, so WHERE o.order_id IS NULL filters ${l[1]} out.` : `${l[1]} has no orders: the joined order_id is NULL, so ${l[1]} stays.`) })}`,

  'right-join': () => `${plain('RIGHT JOIN is LEFT JOIN facing the other way: keep every row of the second table. Most people rewrite it as a LEFT JOIN with the tables swapped, which reads more naturally. Here: every order, with the customer’s name if we still know who they are.')}
${joinDemo({ title: 'Customers RIGHT JOIN Orders, written as Orders LEFT JOIN Customers', left: ORDERS, right: CUSTOMERS, on: ['customer_id', 'customer_id'], type: 'left',
    pick: ['l.order_id', 'l.total', 'r.first_name'], say: (l, n) => (n ? `Order ${l[0]} belongs to customer ${l[1]}, who is in Customers.` : `Order ${l[0]} points at customer ${l[1]}, who is not in Customers any more. The order stays; the name is NULL.`) })}`,

  'full-outer-join': () => `${plain('FULL OUTER JOIN keeps everything from both sides: matches lined up, plus the leftovers from each list with blanks where the other side has nothing. It is the join for reconciling two lists, like “what is in the warehouse system but not in finance, and the other way round”.')}
${joinDemo({ title: 'Step through it: Customers FULL OUTER JOIN Orders', left: CUSTOMERS, right: ORDERS, on: ['customer_id', 'customer_id'], type: 'full',
    pick: ['l.first_name', 'r.order_id', 'r.customer_id', 'r.total'], say: orderSay('FULL OUTER JOIN keeps them, with NULLs on the right.') })}`,

  'cross-join': () => `${plain('CROSS JOIN pairs every row on the left with every row on the right. Three T-shirt sizes and two colours make six products. It has no ON clause, so be careful: 10,000 rows crossed with 10,000 rows is 100 million.')}
${slides([
    { title: 'Two short lists', html: `<div class="jd-tables">${table('Sizes', ['size'], [['S'], ['M'], ['L']])}${table('Colours', ['colour'], [['Navy'], ['Grey']])}</div>` },
    { title: 'Every size with every colour: 3 × 2 = 6 rows', note: c('SELECT s.size, k.colour FROM Sizes s CROSS JOIN Colours k;'), html: table('Result', ['size', 'colour'], [['S', 'Navy'], ['S', 'Grey'], ['M', 'Navy'], ['M', 'Grey'], ['L', 'Navy'], ['L', 'Grey']]) },
  ], { title: 'Building a product list with CROSS JOIN' })}`,

  'self-join': () => `${plain('A self-join is a table joined to itself. The staff list has a manager_id that points at another row in the same staff list, so you join Staff to Staff to put each person’s manager’s name next to theirs.')}
${joinDemo({ title: 'Step through it: each person and their manager',
    left: { name: 'Staff (as e)', cols: ['staff_id', 'name', 'manager_id'], rows: [[1, 'Sandra', null], [2, 'Harvey', 1], [3, 'Amy', 1], [4, 'Tom', 2]] },
    right: { name: 'Staff (as m)', cols: ['staff_id', 'name', 'manager_id'], rows: [[1, 'Sandra', null], [2, 'Harvey', 1], [3, 'Amy', 1], [4, 'Tom', 2]] },
    on: ['manager_id', 'staff_id'], type: 'left', pick: ['l.name', 'r.name'], label: ['employee', 'manager'],
    say: (l, n) => (n ? `${l[1]}’s manager_id is ${l[2]}, which is a row in the same table.` : `${l[1]} has no manager_id (she runs the company). LEFT JOIN keeps her with a NULL manager.`) })}`,

  'join-doubled-my-totals': () => `${plain('If one order has three lines, joining orders to their lines gives three rows for that order. The order’s total is copied onto each one, so adding up the totals counts the same money three times. Add up the lines first, or sum the column that really lives at line level.')}
${joinDemo({ title: 'Watch the £100 order turn into £300',
    left: { name: 'Orders', cols: ['order_id', 'total'], rows: [[7001, 100], [7002, 50]] },
    right: { name: 'OrderLines', cols: ['line_id', 'order_id', 'amount'], rows: [[1, 7001, 30], [2, 7001, 30], [3, 7001, 40], [4, 7002, 50]] },
    on: ['order_id', 'order_id'], type: 'inner', pick: ['l.order_id', 'l.total', 'r.line_id', 'r.amount'],
    say: (l, n) => `Order ${l[0]} has ${per(n, 'line')}, so its total of £${l[1]} is copied onto ${per(n, 'row')}.` })}
<p>${c('SUM(o.total)')} over that result says £350. The real figure is £150. ${c('SUM(l.amount)')} gives the right £150, because amount belongs to each line.</p>`,

  'update-join': () => `${plain('Sometimes the new values live in another table: a supplier sends a new price list. UPDATE … FROM … JOIN copies each new price onto the matching product, and leaves products that are not on the list alone.')}
${slides([
    { title: 'Before: our products, and the supplier’s new prices', html: `<div class="jd-tables">${table('Products', ['product_id', 'name', 'price'], [[11, 'Mug', 6.5], [12, 'Tea towel', 4], [13, 'Apron', 12]])}${table('NewPrices', ['product_id', 'new_price'], [[11, 7], [13, 13.5]])}</div>` },
    { title: 'After the UPDATE with a JOIN', note: `Products 11 and 13 changed. 12 had no row in NewPrices, so the INNER JOIN never touched it.`, html: table('Products', ['product_id', 'name', 'price'], [[11, 'Mug', 7], [12, 'Tea towel', 4], [13, 'Apron', 13.5]]) },
  ], { title: 'Updating prices from a supplier list' })}`,

  // ================= grouping =================
  'group-by': () => `${plain('GROUP BY squashes many rows into one row per group, then lets you count or add up what was squashed. “Sales by city” means: put every sale into a pile per city, then total each pile.')}
${slides([
    { title: 'Every sale, one row each', html: table('Sales', ['city', 'total'], SALES) },
    { title: 'Sorted into piles by city', note: 'This is what GROUP BY city does behind the scenes.', html: table('Sales, grouped', ['city', 'total'], [['Hull', 15], ['Leeds', 40], ['Leeds', 25], ['Leeds', 60], ['York', 30]]) },
    { title: 'One row per pile', note: c('SELECT city, COUNT(*) AS sales, SUM(total) AS revenue FROM Sales GROUP BY city;'), html: table('Result', ['city', 'sales', 'revenue'], [['Hull', 1, 15], ['Leeds', 3, 125], ['York', 1, 30]]) },
  ], { title: 'GROUP BY, one step at a time' })}`,

  'group-by-month': () => `${plain('“Revenue by month” means: work out which month each order falls in, then group by that month. The trick is turning a full date into its month first, so the 3rd and the 28th land in the same pile.')}
${slides([
    { title: 'Orders with full dates', html: table('Orders', ['order_date', 'total'], [['2026-09-03', 40], ['2026-09-28', 25], ['2026-10-02', 60], ['2026-10-15', 30], ['2026-10-31', 15]]) },
    { title: 'Each date becomes the first of its month', note: c('DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1) AS month'), html: table('Orders', ['order_date', 'month', 'total'], [['2026-09-03', '2026-09-01', 40], ['2026-09-28', '2026-09-01', 25], ['2026-10-02', '2026-10-01', 60], ['2026-10-15', '2026-10-01', 30], ['2026-10-31', '2026-10-01', 15]]) },
    { title: 'Grouped by that month', html: table('Result', ['month', 'orders', 'revenue'], [['2026-09-01', 2, 65], ['2026-10-01', 3, 105]]) },
  ], { title: 'From dates to months' })}`,

  'where-vs-having': () => `${plain('WHERE throws rows out before they are grouped. HAVING throws whole groups out after they are added up. “Leeds and York only” is a WHERE. “Cities that made more than £100” is a HAVING, because you cannot know a city’s total until you have added it up.')}
${slides([
    { title: 'Start: every sale', html: table('Sales', ['city', 'total'], SALES) },
    { title: 'WHERE city <> \'Hull\' removes rows', html: table('After WHERE', ['city', 'total'], [['Leeds', 40], ['Leeds', 25], ['York', 30], ['Leeds', 60]]) },
    { title: 'GROUP BY city adds up what is left', html: table('Groups', ['city', 'revenue'], [['Leeds', 125], ['York', 30]]) },
    { title: 'HAVING SUM(total) > 100 removes groups', html: table('Result', ['city', 'revenue'], [['Leeds', 125]]) },
  ], { title: 'WHERE first, HAVING last' })}`,

  having: () => `${plain('HAVING is a filter on the totals. Group first, add up, and only then keep the groups that pass: “customers who have spent more than £50 in total”.')}
${slides([
    { title: 'Orders per customer', html: table('Orders', ['customer_id', 'total'], [[1001, 40], [1001, 25], [1003, 60], [1002, 30]]) },
    { title: 'Totals per customer', html: table('Grouped', ['customer_id', 'spent'], [[1001, 65], [1002, 30], [1003, 60]]) },
    { title: 'HAVING SUM(total) > 50', html: table('Result', ['customer_id', 'spent'], [[1001, 65], [1003, 60]]) },
  ], { title: 'Keeping only the big spenders' })}`,

  'count-vs-count-distinct': () => `${plain('COUNT(*) counts rows. COUNT(DISTINCT customer_id) counts different people. Five orders from three customers is 5 orders but 3 customers: managers usually want the second when they say “how many customers ordered?”.')}
${table('Orders this week', ['order_id', 'customer_id'], [[5001, 1001], [5002, 1001], [5003, 1003], [5005, 1002], [5006, 1003]])}
${table('Result', ['COUNT(*)', 'COUNT(DISTINCT customer_id)'], [[5, 3]])}`,

  count: () => `${plain('COUNT(*) counts every row. COUNT(phone) counts only the rows where phone is filled in. The gap between the two is how many phone numbers are missing.')}
${table('Customers', ['first_name', 'phone'], [['Amy', '07700 900111'], ['Ben', null], ['Cara', '07700 900333'], ['Dev', null]])}
${table('Result', ['COUNT(*)', 'COUNT(phone)', 'missing'], [[4, 2, 2]])}`,

  'sum-avg': () => `${plain('SUM adds the numbers up. AVG adds them up and divides by how many there are, but it skips blanks (NULL) entirely. So one missing rating does not count as a zero; it simply is not in the average.')}
${table('Ratings', ['review_id', 'stars'], [[1, 4], [2, 5], [3, null], [4, 3]])}
${table('Result', ['SUM(stars)', 'AVG(stars)', 'AVG(ISNULL(stars, 0))'], [[12, 4, 3]])}
<p>${c('AVG(stars)')} is 12 ÷ 3 = 4. Treat the blank as zero and it is 12 ÷ 4 = 3. Decide which one the person asking actually means.</p>`,

  distinct: () => `${plain('DISTINCT removes duplicate rows from the result, so each different value shows once. “Which cities do we have customers in?” is a DISTINCT, not a GROUP BY, because there is nothing to add up.')}
${slides([
    { title: 'Every customer’s city', html: table('Customers', ['first_name', 'city'], [['Amy', 'Leeds'], ['Ben', 'York'], ['Cara', 'Leeds'], ['Dev', 'Hull']]) },
    { title: 'SELECT DISTINCT city', html: table('Result', ['city'], [['Hull'], ['Leeds'], ['York']]) },
  ])}`,

  'invalid-in-the-select-list': () => `${plain('Once rows are grouped by city, each city is one row. If you also ask for first_name, SQL Server cannot know which of the three Leeds names to show, so it refuses. Either group by the name too, or wrap it in something that picks one (MIN, MAX, STRING_AGG).')}
${slides([
    { title: 'Leeds has three customers', html: table('Customers in Leeds', ['city', 'first_name'], [['Leeds', 'Amy'], ['Leeds', 'Cara'], ['Leeds', 'Esme']]) },
    { title: 'GROUP BY city makes one row. Which name goes in it?', note: `${c('SELECT city, first_name … GROUP BY city')} fails with error 8120. ${c('STRING_AGG(first_name, \', \')')} answers the question instead:`, html: table('Result', ['city', 'names'], [['Leeds', 'Amy, Cara, Esme']]) },
  ])}`,

  // ================= windows =================
  'row-number': () => `${plain('ROW_NUMBER gives each row a position, 1, 2, 3, counted inside each group you choose. Number each customer’s orders newest first, keep the rows numbered 1, and you have every customer’s latest order.')}
${slides([
    { title: 'All orders', html: table('Orders', ['customer_id', 'order_date', 'total'], [[1001, '2026-10-02', 40], [1001, '2026-10-20', 25], [1003, '2026-09-15', 60], [1003, '2026-10-30', 18]]) },
    { title: 'Numbered within each customer, newest first', note: c('ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn'), html: table('Numbered', ['customer_id', 'order_date', 'total', 'rn'], [[1001, '2026-10-20', 25, 1], [1001, '2026-10-02', 40, 2], [1003, '2026-10-30', 18, 1], [1003, '2026-09-15', 60, 2]]) },
    { title: 'Keep rn = 1: each customer’s latest order', html: table('Result', ['customer_id', 'order_date', 'total'], [[1001, '2026-10-20', 25], [1003, '2026-10-30', 18]]) },
  ], { title: 'Latest order per customer' })}`,

  rank: () => `${plain('All three number rows in order. They only differ on ties. ROW_NUMBER never repeats a number. RANK gives tied rows the same number, then skips. DENSE_RANK gives the same number and does not skip. For “top 3 salespeople” with a tie, the choice changes who makes the list.')}
${table('Sales this month, three ways to number them', ['name', 'sales', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'], [['Priya', 9200, 1, 1, 1], ['Tom', 8100, 2, 2, 2], ['Jade', 8100, 3, 2, 2], ['Omar', 7400, 4, 4, 3], ['Lou', 6900, 5, 5, 4]])}`,

  lag: () => `${plain('LAG looks at the row before this one. Put this month’s revenue next to last month’s and you can work out the change without joining the table to itself.')}
${table('Revenue by month', ['month', 'revenue', 'LAG(revenue)', 'change'], [['2026-07', 8200, null, null], ['2026-08', 9100, 8200, 900], ['2026-09', 8700, 9100, -400], ['2026-10', 10400, 8700, 1700]])}
<p>The first month has nothing before it, so LAG returns NULL. ${c('LAG(revenue, 1, 0)')} would give 0 instead, but a zero there would make July look like a +£8,200 month.</p>`,

  'running-total': () => `${plain('A running total adds each day’s sales to everything before it, so the last row is the month so far. It is what a “are we on track for target?” chart is drawn from.')}
${table('Daily sales', ['day', 'sales', 'running_total'], [['Mon 3', 1200, 1200], ['Tue 4', 900, 2100], ['Wed 5', 1500, 3600], ['Thu 6', 700, 4300], ['Fri 7', 1800, 6100]])}`,

  'offset-fetch': () => `${plain('OFFSET skips a number of rows and FETCH takes the next few. It is how a website shows “page 2 of results”: skip the first ten, take the next ten. Always sort first, or page 2 can repeat rows from page 1.')}
${slides([
    { title: 'Page 1: OFFSET 0 ROWS FETCH NEXT 3 ROWS ONLY', html: table('Orders, newest first', ['order_id', 'order_date'], [[5010, '2026-10-31'], [5009, '2026-10-30'], [5008, '2026-10-30']]) },
    { title: 'Page 2: OFFSET 3 ROWS FETCH NEXT 3 ROWS ONLY', html: table('Orders, newest first', ['order_id', 'order_date'], [[5007, '2026-10-29'], [5006, '2026-10-28'], [5005, '2026-10-27']]) },
  ], { title: 'Paging through results' })}`,

  // ================= at work =================
  'find-duplicate-customers': () => `${plain('Duplicates are rows that should be one person but appear twice, usually because someone signed up again. Group by the thing that should be unique (the email, lower-cased and trimmed) and look for groups with more than one row.')}
${slides([
    { title: 'The customer list', html: table('Customers', ['customer_id', 'email'], [[1001, 'amy@mail.com'], [1017, 'Amy@Mail.com '], [1002, 'ben@mail.com'], [1033, 'cara@mail.com'], [1040, 'cara@mail.com']]) },
    { title: 'Grouped by the cleaned email, kept where count > 1', note: c('GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1'), html: table('Duplicates', ['email', 'copies', 'ids'], [['amy@mail.com', 2, '1001, 1017'], ['cara@mail.com', 2, '1033, 1040']]) },
  ], { title: 'Spotting the same person twice' })}`,

  'second-highest': () => `${plain('“Second highest” is ambiguous when two people tie for first. Decide whether a tie counts as one place or two, then use DENSE_RANK (ties share a place) or ROW_NUMBER (they do not).')}
${table('Salaries', ['name', 'salary', 'DENSE_RANK'], [['Ava', 62000, 1], ['Sam', 62000, 1], ['Kai', 58000, 2], ['Mo', 51000, 3]])}
<p>With DENSE_RANK the second-highest salary is £58,000 (Kai). A naive ${c('TOP 1 … WHERE salary < MAX(salary)')} gives the same here; ${c('OFFSET 1 ROW')} on a plain sort would wrongly return Sam’s £62,000.</p>`,

  'why-select-star-fails': () => `${plain('SELECT * returns every column, including ones nobody asked for. When the person pastes it into their sheet, the columns are in the wrong place and their formulas break. Name the columns they asked for, in the order they asked.')}
${slides([
    { title: 'SELECT * FROM Customers', html: table('What you sent', ['customer_id', 'first_name', 'last_name', 'email', 'phone', 'city', 'created_date', 'marketing_opt_in'], [[1001, 'Amy', 'Nair', 'amy@mail.com', '07700 900111', 'Leeds', '2025-03-02', 1]]) },
    { title: 'What they asked for: name and email', html: table('What they wanted', ['first_name', 'last_name', 'email'], [['Amy', 'Nair', 'amy@mail.com']]) },
  ])}`,

  'cte-for-reports': () => `${plain('A CTE is a named step. Write “first, work out each customer’s total” as one step, give it a name, then use that name in the next query as if it were a table. Reports read top to bottom, the way you think about them.')}
${slides([
    { title: 'Step 1, named spend: total per customer', note: c('WITH spend AS (SELECT customer_id, SUM(total) AS spent FROM Orders GROUP BY customer_id)'), html: table('spend', ['customer_id', 'spent'], [[1001, 65], [1002, 30], [1003, 60]]) },
    { title: 'Step 2: use it like a table', note: c("SELECT c.first_name, s.spent FROM spend s JOIN Customers c ON … WHERE s.spent > 50"), html: table('Result', ['first_name', 'spent'], [['Amy', 65], ['Cara', 60]]) },
  ], { title: 'A two-step report' })}`,

  // ================= dates =================
  'last-week-orders': () => `${plain('“Last week” means the whole Monday-to-Sunday week that just finished, not “the past seven days from right now”. If today is Thursday 30 October, last week is Monday 20 to Sunday 26. Thursday 23 counts; this Monday does not.')}
${table('Orders, checked against Mon 20 – Sun 26 Oct', ['order_id', 'order_date', 'in last week?'], [[5101, '2025-10-19 16:20', 'No (the Sunday before)'], [5102, '2025-10-20 09:05', 'Yes'], [5103, '2025-10-23 13:40', 'Yes'], [5104, '2025-10-26 23:58', 'Yes'], [5105, '2025-10-27 08:10', 'No (this week)'], [5106, '2025-10-30 09:14', 'No (today)']])}`,

  'yesterday-sales': () => `${plain('Yesterday is everything from midnight yesterday up to, but not including, midnight today. Using “up to but not including” means an order at 23:59:59 is in and one at 00:00:00 today is not, with no gap and no overlap.')}
${table('Orders, if today is Friday 31 October', ['order_id', 'order_date', 'yesterday?'], [[5201, '2025-10-29 23:59', 'No'], [5202, '2025-10-30 00:00', 'Yes'], [5203, '2025-10-30 18:45', 'Yes'], [5204, '2025-10-30 23:59', 'Yes'], [5205, '2025-10-31 00:00', 'No']])}`,

  'between-dates-inclusive': () => `${plain('BETWEEN \'2026-10-01\' AND \'2026-10-31\' stops at the very first moment of the 31st. Any order later that day, even at 00:01, is missed. Use “on or after the 1st, and before the 1st of next month” instead.')}
${table('Orders on the last day of the month', ['order_date', 'BETWEEN … \'2026-10-31\'', '>= 1 Oct AND < 1 Nov'], [['2026-10-31 00:00', 'In', 'In'], ['2026-10-31 00:01', 'Missed', 'In'], ['2026-10-31 14:30', 'Missed', 'In'], ['2026-10-31 23:59', 'Missed', 'In']])}`,

  // ================= everyday functions =================
  isnull: () => `${plain('ISNULL swaps a blank for something you choose. A report that shows “No phone” reads better than an empty cell, and a sum that treats a missing discount as 0 does not go blank.')}
${table('Customers', ['first_name', 'phone', 'ISNULL(phone, \'No phone\')'], [['Amy', '07700 900111', '07700 900111'], ['Ben', null, 'No phone'], ['Cara', '07700 900333', '07700 900333']])}`,

  coalesce: () => `${plain('COALESCE goes along a list and returns the first value that is not blank. “Use the mobile; if there is none, the work number; if there is none, say so.”')}
${table('Contacts', ['name', 'mobile', 'work_phone', 'COALESCE(mobile, work_phone, \'none\')'], [['Amy', '07700 900111', null, '07700 900111'], ['Ben', null, '0113 496 0000', '0113 496 0000'], ['Dev', null, null, 'none']])}`,

  'case-when': () => `${plain('CASE is an IF for each row: check the conditions in order and return the label for the first one that is true. It turns a number into a word a manager can put on a slide.')}
${table('Orders, banded', ['order_id', 'total', 'CASE … AS band'], [[5001, 18, 'Small'], [5002, 64, 'Medium'], [5003, 240, 'Large'], [5004, 50, 'Medium']])}
<p>The rule used: under £50 is Small, £50 up to £150 is Medium, anything else is Large. Order 5004 is exactly £50, so where you put the “equal to” decides its band.</p>`,

  exists: () => `${plain('EXISTS asks a yes/no question about each row: “does this customer have any orders?” Unlike a JOIN, it never repeats a customer who has several orders. You get each customer once.')}
${slides([
    { title: 'With INNER JOIN: Amy appears twice', html: table('Customers JOIN Orders', ['first_name', 'order_id'], [['Amy', 5001], ['Amy', 5002], ['Cara', 5003]]) },
    { title: 'With WHERE EXISTS: each customer once', note: c('WHERE EXISTS (SELECT 1 FROM Orders o WHERE o.customer_id = c.customer_id)'), html: table('Result', ['first_name'], [['Amy'], ['Cara']]) },
  ])}`,

  union: () => `${plain('UNION stacks two lists on top of each other and removes repeats. UNION ALL stacks them and keeps everything. Use UNION ALL when the repeats matter (two separate sales of the same thing) or when you know there can be none: it is also faster.')}
${slides([
    { title: 'Two mailing lists', html: `<div class="jd-tables">${table('Newsletter', ['email'], [['amy@mail.com'], ['ben@mail.com']])}${table('Event sign-ups', ['email'], [['ben@mail.com'], ['dev@mail.com']])}</div>` },
    { title: 'UNION: Ben once', html: table('Result', ['email'], [['amy@mail.com'], ['ben@mail.com'], ['dev@mail.com']]) },
    { title: 'UNION ALL: Ben twice', html: table('Result', ['email'], [['amy@mail.com'], ['ben@mail.com'], ['ben@mail.com'], ['dev@mail.com']]) },
  ])}`,

  subquery: () => `${plain('A subquery is a query inside a query. Work out one number first (the average order), then use it to filter: “show me the orders bigger than average”.')}
${slides([
    { title: 'The inner query: SELECT AVG(total) FROM Orders', html: `${table('Orders', ['order_id', 'total'], [[5001, 40], [5002, 25], [5003, 60], [5004, 15]])}${table('Inner result', ['AVG(total)'], [[35]])}` },
    { title: 'The outer query: WHERE total > (that 35)', html: table('Result', ['order_id', 'total'], [[5001, 40], [5003, 60]]) },
  ])}`,

  'in-list': () => `${plain('IN is a short way of writing “this OR this OR this”. WHERE city IN (\'Leeds\', \'York\') keeps any row whose city is on the list.')}
${table('Customers WHERE city IN (\'Leeds\', \'York\')', ['first_name', 'city', 'kept?'], [['Amy', 'Leeds', 'Yes'], ['Ben', 'York', 'Yes'], ['Cara', 'Leeds', 'Yes'], ['Dev', 'Hull', 'No']])}`,
};
