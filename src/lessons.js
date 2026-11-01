// Every lesson is a ticket from someone at Harbour & Co.
//
// solution  - the reference query; its result is the expected answer.
// orderBy   - expected sort key when order matters (checked by key, so ties are fine).
// steps     - walkthroughs: earlier steps teach in pieces, the last step ({ final: true }) is the real ticket.
//             A step can expect an error on purpose (expectError) or only need to run (loose).
// starter   - text already in the editor (used for "fix your colleague's query" tickets).
// diagnose  - lesson-specific explanation of a wrong answer, in the sender's voice.


const P = {
  james: { name: 'Harvey Rowe', role: 'Sales Manager' },
  amy: { name: 'Amy Nair', role: 'Finance Lead' },
  tom: { name: 'Tom Gallagher', role: 'Warehouse Lead' },
  becky: { name: 'Becky Ashworth', role: 'Support' },
  kwame: { name: 'Kwame Asante', role: 'Data Analyst' },
  sandra: { name: 'Sandra Okafor', role: 'Managing Director' },
  interview: { name: 'Interview panel', role: 'Data Analyst role' },
};

// The working week. Day 1 is free; every paid day is about six tickets, so a five-minute habit lasts a month.
const days = [
  { id: 1, week: 1, name: 'Monday', title: 'Query basics', blurb: 'Five habits every SSMS user needs. Each one taught step by step, then done again on your own.' },
  { id: 2, week: 1, name: 'Tuesday', title: 'Totals and grouping', blurb: 'TOP, COUNT and SUM, GROUP BY, HAVING. The numbers people ask for first.' },
  { id: 3, week: 1, name: 'Wednesday', title: 'CASE and monthly reports', blurb: 'CASE for a slide, size bands, revenue by month, best sellers.' },
  { id: 4, week: 1, name: 'Thursday', title: 'Missing rows and joins', blurb: 'LEFT JOIN, the ON-versus-WHERE trap, self-joins, EXISTS.' },
  { id: 5, week: 1, name: 'Friday', title: 'Clean-up and fixes', blurb: 'Messy names, duplicates, and three colleagues’ broken queries.' },
  { id: 6, week: 2, name: 'Monday', title: 'CTEs and latest records', blurb: 'Name a query and reuse it. ROW_NUMBER for the latest row per customer.' },
  { id: 7, week: 2, name: 'Tuesday', title: 'Windows and review', blurb: 'Running totals, RANK, LAG, percent of total, and an interview pair.' },
];

// The same advice in each stack's words, for diagnose(): say(ctx, tsql, postgres, mysql).
const say = (ctx, tsql, postgres, mysql) => ({ postgres, mysql }[ctx.dialect] || tsql);

const LAST_7 = 'order_date >= DATEADD(day, -7, CAST(GETDATE() AS date)) AND order_date < CAST(GETDATE() AS date)';
const LAST_30 = 'order_date >= DATEADD(day, -30, CAST(GETDATE() AS date)) AND order_date < CAST(GETDATE() AS date)';

const lessons = [
  // ======================= Path 1: Monday Basics (free) =======================
  {
    id: 1, kind: 'Walkthrough', topic: 'Name the columns', blurb: 'Kill SELECT * before it kills your report.', minutes: 4,
    table: 'Customers', from: P.amy, time: '08:52',
    title: 'Can I get a customer contact list? Just first name, last name and email.',
    bullets: ['Use the Customers table.', 'Columns: first_name, last_name, email. Nothing else.'],
    steps: [
      { text: 'Every query starts the same way. Type SELECT * FROM Customers and run it.', solution: 'SELECT * FROM Customers',
        done: 'That’s everything: eight columns. Amy asked for three. * is fine for a peek, never for something you send.' },
      { final: true, text: 'Now swap the * for the three columns, separated by commas: first_name, last_name, email.' },
    ],
    solution: 'SELECT first_name, last_name, email FROM Customers',
    thanks: 'Perfect, that pastes straight into the mail merge.',
    hints: ['Name each column you need after SELECT, separated by commas.', 'The three names are in the ticket. Check the Customers tab for spelling.'],
  },
  {
    id: 2, kind: 'Rep', topic: 'Name the columns', blurb: 'Same habit, no hand-holding.', minutes: 3,
    table: 'Staff', from: P.tom, time: '09:05',
    title: 'Fire drill at 11. I need the staff list for the register: first name, last name and team.',
    bullets: ['Use the Staff table.', 'Columns: first_name, last_name, team.'],
    solution: 'SELECT first_name, last_name, team FROM Staff',
    thanks: 'Cheers, printing it now.',
    hints: ['Same shape as the contact list, different table.', 'Look at the Staff tab for the exact column names.'],
  },
  {
    id: 3, kind: 'Walkthrough', topic: 'WHERE and quotes', blurb: 'Filter rows. Learn the quote mistake once.', minutes: 5,
    table: 'Orders', from: P.tom, time: '09:20',
    title: 'Which orders are still Processing? I need order_id, order_date and total_amount.',
    bullets: ['Use the Orders table.', 'Columns: order_id, order_date, total_amount.', 'Only orders where status is Processing.'],
    steps: [
      { text: 'Start with the columns: SELECT order_id, order_date, total_amount FROM Orders. Run it.',
        solution: 'SELECT order_id, order_date, total_amount FROM Orders',
        done: 'That’s every order Harbour & Co has ever taken. Now we filter.' },
      { text: 'Add WHERE status = Processing on a new line. Leave the quotes off on purpose, and run it.',
        expectError: /Invalid column name 'Processing'/i,
        done: 'That’s the classic. Without quotes, SQL Server thinks Processing is a column name. Text always goes in single quotes.' },
      { final: true, text: "Now put the quotes in: WHERE status = 'Processing'." },
    ],
    solution: "SELECT order_id, order_date, total_amount FROM Orders WHERE status = 'Processing'",
    thanks: 'Three to pack. Thanks.',
    hints: ['Text values need single quotes around them.', 'Without quotes, SQL Server reads Processing as a column name.'],
    diagnose({ extra }) {
      if (extra.length) return { headline: 'Some of these aren’t Processing.', detail: "Filter with WHERE status = 'Processing'." };
    },
  },
  {
    id: 4, kind: 'Rep', topic: 'WHERE and quotes', blurb: 'Filter on text, on your own.', minutes: 3,
    table: 'Customers', from: P.becky, time: '09:41',
    title: 'Courier’s doing Leeds tomorrow. Which customers are in Leeds?',
    bullets: ['Use the Customers table.', 'Columns: customer_id, first_name, last_name, phone.', 'Only customers whose city is Leeds.'],
    solution: "SELECT customer_id, first_name, last_name, phone FROM Customers WHERE city = 'Leeds'",
    thanks: 'Great, I’ll ring round.',
    hints: ['Filter with WHERE on the city column.', 'Leeds is text, so it goes in single quotes.'],
  },
  {
    id: 5, kind: 'Walkthrough', topic: 'Last week (GETDATE)', blurb: 'The date filter everyone gets wrong once.', minutes: 6,
    table: 'Orders', from: P.james, time: '09:14',
    title: 'Need last week’s orders over £50 for the 10am. Don’t include today. Newest first.',
    bullets: ['Only orders from the last 7 days, not including today.', 'Only orders where total_amount is over 50.',
      'Columns: order_id, customer_id, order_date, total_amount.', 'Newest first.'],
    steps: [
      { text: 'First, see what time SQL Server thinks it is: SELECT GETDATE() AS now', loose: ['now'],
        solution: 'SELECT GETDATE() AS now',
        done: 'That’s right now, to the millisecond. CAST(GETDATE() AS date) chops it back to midnight today.' },
      { text: `Get last week, without today: SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE ${LAST_7.replace(' AND', '\nAND')}`,
        solution: `SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE ${LAST_7}`,
        done: '>= midnight 7 days ago, < midnight today. That pair is the pattern for any date range. Now the £50 bit.' },
      { final: true, text: 'Add AND total_amount > 50, then ORDER BY order_date DESC.' },
    ],
    solution: `SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE ${LAST_7} AND total_amount > 50 ORDER BY order_date DESC`,
    orderBy: [{ col: 'order_date', desc: true }],
    thanks: 'That’s the slide sorted. Cheers.',
    hints: ['A date range has two ends: midnight 7 days ago, and midnight today.', 'CAST(GETDATE() AS date) is midnight today. DATEADD(day, -7, ...) moves a date back a week.'],
    diagnose(ctx) {
      const { extra, missing, today, col } = ctx;
      const d = col('order_date'); const t = col('total_amount');
      if (d >= 0 && extra.some((r) => String(r[d]).slice(0, 10) === today)) {
        return { headline: 'You’ve included today.', detail: 'Last 7 days is yesterday back, not today.' };
      }
      if (t >= 0 && extra.some((r) => Number(r[t]) <= 50)) return { headline: 'Some of these are £50 or less.', detail: 'Add AND total_amount > 50.' };
      if (extra.length) {
        return { headline: 'Some of these are older than last week.', detail: `Start the range at ${say(ctx, 'DATEADD(day, -7, CAST(GETDATE() AS date))', "CURRENT_DATE - INTERVAL '7 days'", 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)')}.` };
      }
      if (missing.length) return { headline: 'You’re missing some of last week’s orders.', detail: 'Check where your range starts.' };
    },
  },
  {
    id: 6, kind: 'Rep', topic: 'Last week (GETDATE)', blurb: 'A different range, same pattern.', minutes: 4,
    table: 'Orders', from: P.james, time: '13:30',
    title: 'Which orders over £100 came in over the last 30 days? Not today. Biggest first.',
    bullets: ['Last 30 days, not including today.', 'Only total_amount over 100.', 'Columns: order_id, order_date, total_amount.', 'Biggest total first.'],
    solution: 'SELECT order_id, order_date, total_amount FROM Orders WHERE order_date >= DATEADD(day, -30, CAST(GETDATE() AS date)) AND order_date < CAST(GETDATE() AS date) AND total_amount > 100 ORDER BY total_amount DESC',
    orderBy: [{ col: 'total_amount', desc: true }],
    thanks: 'Good, those are the ones I’ll chase for reviews.',
    hints: ['Same pattern as last week’s orders, a different number of days.', 'This one is sorted by amount, not date. Biggest first means DESC.'],
    diagnose({ extra, today, col }) {
      const d = col('order_date');
      if (d >= 0 && extra.some((r) => String(r[d]).slice(0, 10) === today)) return { headline: 'Today’s crept in again.', detail: 'Yesterday back, not today.' };
    },
  },
  {
    id: 7, kind: 'Walkthrough', topic: 'ISNULL', blurb: 'NULL isn’t blank. Give it a word.', minutes: 4,
    table: 'Customers', from: P.becky, time: '10:02',
    title: 'Support is phoning customers. Blank phone numbers confuse the team. Can it say No phone instead?',
    bullets: ['Use the Customers table.', 'Columns: customer_id, first_name, last_name, phone.', "Where phone is missing, show 'No phone'."],
    steps: [
      { text: 'Run SELECT customer_id, first_name, last_name, phone FROM Customers and spot the NULLs.',
        solution: 'SELECT customer_id, first_name, last_name, phone FROM Customers',
        done: 'NULL means nobody filled it in. It isn’t an empty string, and support can’t dial it.' },
      { final: true, text: "Wrap the column: ISNULL(phone, 'No phone') AS phone. The AS keeps the header." },
    ],
    solution: "SELECT customer_id, first_name, last_name, ISNULL(phone, 'No phone') AS phone FROM Customers",
    thanks: 'Much better. Thanks.',
    hints: ['NULL needs swapping for a word. There’s a function made for exactly that.', 'Wrapping a column in a function loses its header. AS gives it back.'],
    diagnose(ctx) {
      if (ctx.user.rows.some((r) => r.some((v) => v === null))) return { headline: 'Some phone numbers still say NULL.', detail: `Wrap the column: ${say(ctx, 'ISNULL', 'COALESCE', 'IFNULL')}(phone, 'No phone') AS phone.` };
    },
  },
  {
    id: 8, kind: 'Rep', topic: 'ISNULL', blurb: 'Fill the gaps on your own.', minutes: 3,
    table: 'Customers', from: P.amy, time: '11:15',
    title: 'Invoice run. Some customers aren’t companies, and the template breaks on blanks.',
    bullets: ['Columns: customer_id, company_name, email.', "Where company_name is missing, show 'Individual'."],
    solution: "SELECT customer_id, ISNULL(company_name, 'Individual') AS company_name, email FROM Customers",
    thanks: 'Template’s happy. Thanks.',
    hints: ['Same function as the phone list.', 'Give the column its name back with AS.'],
    diagnose(ctx) {
      if (ctx.user.rows.some((r) => r.some((v) => v === null))) return { headline: 'There are still NULLs in there.', detail: `Use ${say(ctx, 'ISNULL', 'COALESCE', 'IFNULL')}(company_name, 'Individual').` };
    },
  },
  {
    id: 9, kind: 'Walkthrough', topic: 'A first JOIN', blurb: 'Names instead of IDs, line by line.', minutes: 6,
    table: 'Customers', from: P.james, time: '14:05',
    title: 'Can you resend last week’s orders with the customer’s name instead of their ID? Newest first.',
    bullets: ['Last 7 days, not today. All amounts this time.', 'Columns: order_id, customer_name, order_date, total_amount.',
      "customer_name is first_name + ' ' + last_name.", 'Newest first.'],
    steps: [
      { text: 'The query below is already typed. The o after Orders is an alias, a short name for the table. Run it as it is.',
        starter: `SELECT o.order_id, o.customer_id, o.order_date, o.total_amount\nFROM Orders o\nWHERE o.order_date >= DATEADD(day, -7, CAST(GETDATE() AS date))\n  AND o.order_date < CAST(GETDATE() AS date)`,
        solution: `SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE ${LAST_7}`,
        done: 'Last week with IDs. Harvey doesn’t know who 1021 is. Customers does.' },
      { text: "Under FROM Orders o, add: JOIN Customers c ON c.customer_id = o.customer_id. Then swap o.customer_id for c.first_name + ' ' + c.last_name AS customer_name.",
        solution: `SELECT o.order_id, c.first_name + ' ' + c.last_name AS customer_name, o.order_date, o.total_amount FROM Orders o JOIN Customers c ON c.customer_id = o.customer_id WHERE o.${LAST_7.replace(' AND order_date', ' AND o.order_date')}`,
        done: 'The ON line is the whole trick: it says which customer row belongs to which order.' },
      { final: true, text: 'Last bit: ORDER BY o.order_date DESC.' },
    ],
    solution: `SELECT o.order_id, c.first_name + ' ' + c.last_name AS customer_name, o.order_date, o.total_amount FROM Orders o JOIN Customers c ON c.customer_id = o.customer_id WHERE o.${LAST_7.replace(' AND order_date', ' AND o.order_date')} ORDER BY o.order_date DESC`,
    orderBy: [{ col: 'order_date', desc: true }],
    thanks: 'Names! Thank you.',
    hints: ['The name lives in Customers, the order in Orders. Join them on the column they share.', 'The ON line says which customer row belongs to which order.'],
    diagnose({ user, expected }) {
      if (user.rows.length > expected.rows.length) return { headline: 'That join is multiplying the orders.', detail: 'Check the ON line: customer to customer.' };
    },
  },
  {
    id: 10, kind: 'Rep', topic: 'A first JOIN', blurb: 'Join product names onto order lines.', minutes: 4,
    table: 'OrderLines', from: P.tom, time: '15:20',
    title: 'Picking list for order 10484, please. I need product names, not product IDs.',
    bullets: ['Use OrderLines and Products.', 'Only order_id 10484.', 'Columns: product_name, quantity.'],
    solution: 'SELECT p.product_name, ol.quantity FROM OrderLines ol JOIN Products p ON p.product_id = ol.product_id WHERE ol.order_id = 10484',
    thanks: 'Lovely. That one’s going out today.',
    hints: ['Product names live in Products. OrderLines only has product_id.', 'Join on product_id, then filter to the one order.'],
  },

  // ======================= Path 2: Reports People Ask For =======================
  {
    id: 11, kind: 'Ticket', topic: 'TOP', blurb: 'The 5 biggest orders ever.', minutes: 4,
    table: 'Orders', from: P.sandra, time: '08:30',
    title: 'Board pack: our 5 biggest orders ever. Order, customer, amount.',
    bullets: ['Columns: order_id, customer_id, total_amount.', 'Just the top 5, biggest first.'],
    solution: 'SELECT TOP 5 order_id, customer_id, total_amount FROM Orders ORDER BY total_amount DESC',
    orderBy: [{ col: 'total_amount', desc: true }],
    thanks: 'Good. Two of those are the Brightside account, interesting.',
    hints: ['TOP takes the first N rows after sorting. What should you sort by?', 'TOP goes straight after SELECT. Biggest first means DESC.'],
    diagnose(ctx) {
      const { user } = ctx;
      if (user.rows.length > 5) return { headline: 'Five rows, not all of them.', detail: say(ctx, 'Put TOP 5 straight after SELECT.', 'Put LIMIT 5 at the end.', 'Put LIMIT 5 at the end.') };
      if (user.rows.length === 5) return { headline: 'Five rows, but not the biggest five.', detail: `${say(ctx, 'TOP', 'LIMIT', 'LIMIT')} takes the first rows after sorting. Sort by total_amount DESC.` };
    },
  },
  {
    id: 12, kind: 'Ticket', topic: 'TOP + ORDER BY', blurb: 'Newest customers for the welcome call.', minutes: 4,
    table: 'Customers', from: P.becky, time: '09:10',
    title: 'Who are our 10 newest customers? I do a welcome call on Fridays.',
    bullets: ['Columns: customer_id, first_name, last_name, created_date.', 'The 10 most recently created, newest first.'],
    solution: 'SELECT TOP 10 customer_id, first_name, last_name, created_date FROM Customers ORDER BY created_date DESC',
    orderBy: [{ col: 'created_date', desc: true }],
    thanks: 'Perfect, Friday’s list sorted.',
    hints: ['Newest means sorted by created_date, latest first.', 'Same shape as the biggest-orders ticket.'],
  },
  {
    id: 13, kind: 'Ticket', topic: 'COUNT, SUM, AVG', blurb: 'Three numbers for finance.', minutes: 5,
    table: 'Orders', from: P.amy, time: '10:00',
    title: 'Three numbers for shipped orders, all time: how many, total revenue, average order.',
    bullets: ["Only status 'Shipped'.", 'Columns: order_count, revenue, avg_order.', 'One row.'],
    solution: "SELECT COUNT(*) AS order_count, SUM(total_amount) AS revenue, AVG(total_amount) AS avg_order FROM Orders WHERE status = 'Shipped'",
    thanks: 'Matches the ledger. Nice.',
    hints: ['Three aggregate functions, one row: a count, a total, an average.', 'Only Shipped orders count. Name each column with AS.'],
    diagnose() { return { headline: 'Those numbers don’t match the ledger.', detail: "Cancelled and Processing orders don’t count. Filter to status = 'Shipped'." }; },
  },
  {
    id: 14, kind: 'Walkthrough', topic: 'GROUP BY', blurb: 'Orders and revenue by status, step by step.', minutes: 5,
    table: 'Orders', from: P.tom, time: '08:45',
    title: 'For the ops meeting: how many orders and how much revenue in each status?',
    bullets: ['One row per status.', 'Columns: status, order_count, revenue.'],
    steps: [
      { text: 'Count every order first: SELECT COUNT(*) AS order_count FROM Orders',
        solution: 'SELECT COUNT(*) AS order_count FROM Orders',
        done: 'One number for the whole table. Tom wants it split by status.' },
      { text: 'Put status in front of the count (SELECT status, COUNT(*) AS order_count FROM Orders) and run it. It fails on purpose.',
        expectError: /status' is invalid in the select list/i,
        done: 'SQL Server has one total and many statuses, and doesn’t know which to show. GROUP BY tells it to make one row per status.' },
      { final: true, text: 'Add GROUP BY status at the end. Then add the revenue column: SUM(total_amount) AS revenue.' },
    ],
    solution: 'SELECT status, COUNT(*) AS order_count, SUM(total_amount) AS revenue FROM Orders GROUP BY status',
    thanks: 'Cheers. Cancelled is higher than I thought.',
    hints: ['Anything not inside COUNT or SUM has to be in GROUP BY.', 'One row per status means grouping by status.'],
  },
  {
    id: 15, kind: 'Ticket', topic: 'GROUP BY + JOIN', blurb: 'Revenue by product category.', minutes: 6,
    table: 'Products', from: P.sandra, time: '11:30',
    title: 'Which category makes us the most money? Coffee, Tea, Kitchen or Office.',
    bullets: ['Use OrderLines and Products. Line revenue is quantity * unit_price.', 'Columns: category, revenue.', 'Biggest first.'],
    solution: 'SELECT p.category, SUM(ol.quantity * ol.unit_price) AS revenue FROM OrderLines ol JOIN Products p ON p.product_id = ol.product_id GROUP BY p.category ORDER BY revenue DESC',
    orderBy: [{ col: 'revenue', desc: true }],
    thanks: 'Kitchen. I knew it. Thanks.',
    hints: ['Category is on Products. Quantity and price are on OrderLines.', 'Line revenue is quantity * unit_price. Total it per category, then sort.'],
  },
  {
    id: 16, kind: 'Ticket', topic: 'HAVING', blurb: 'Customers who’ve spent over £1,000.', minutes: 5,
    table: 'Orders', from: P.james, time: '16:10',
    title: 'Christmas hampers go to anyone who’s spent more than £1,000 with us. Who qualifies?',
    bullets: ['Group orders by customer_id.', 'Columns: customer_id, total_spent.', 'Only over £1,000, biggest spender first.'],
    solution: 'SELECT customer_id, SUM(total_amount) AS total_spent FROM Orders GROUP BY customer_id HAVING SUM(total_amount) > 1000 ORDER BY total_spent DESC',
    orderBy: [{ col: 'total_spent', desc: true }],
    thanks: 'Hampers ordered.',
    hints: ['WHERE runs before grouping, so it can’t see totals. Another clause filters after.', 'That clause goes after GROUP BY and can use SUM().'],
    diagnose({ extra }) {
      if (extra.length) return { headline: 'Some of these spent £1,000 or less.', detail: 'Add HAVING SUM(total_amount) > 1000 after GROUP BY.' };
    },
  },
  {
    id: 17, kind: 'Walkthrough', topic: 'CASE', blurb: 'Label orders Small, Medium or Large, step by step.', minutes: 6,
    table: 'Orders', from: P.james, time: '09:00',
    title: 'For a slide: label last month’s orders Small, Medium or Large.',
    bullets: ['Last 30 days, not today.', 'Small is under £50. Medium is £50 to £150. Large is over £150.',
      'Columns: order_id, total_amount, size.', 'Biggest first.'],
    steps: [
      { text: 'Get the orders first: order_id and total_amount from Orders, last 30 days, not today. You know this range from Monday.',
        solution: `SELECT order_id, total_amount FROM Orders WHERE ${LAST_30}`,
        done: 'That’s last month. Now each one needs a label.' },
      { text: "Add a third column: CASE WHEN total_amount < 50 THEN 'Small' ELSE 'Other' END AS size",
        solution: `SELECT order_id, total_amount, CASE WHEN total_amount < 50 THEN 'Small' ELSE 'Other' END AS size FROM Orders WHERE ${LAST_30}`,
        done: 'CASE checks each WHEN in order and stops at the first true one. ELSE catches everything left.' },
      { final: true, text: 'Add a WHEN for Medium before the ELSE, make the ELSE Large, and sort biggest first. Mind the edges: £50 and £150 are Medium.' },
    ],
    solution: "SELECT order_id, total_amount, CASE WHEN total_amount < 50 THEN 'Small' WHEN total_amount <= 150 THEN 'Medium' ELSE 'Large' END AS size FROM Orders WHERE order_date >= DATEADD(day, -30, CAST(GETDATE() AS date)) AND order_date < CAST(GETDATE() AS date) ORDER BY total_amount DESC",
    orderBy: [{ col: 'total_amount', desc: true }],
    thanks: 'That’s exactly the colours I wanted.',
    hints: ['CASE checks each WHEN in order and stops at the first true one.', 'Exactly £50 and exactly £150 are both Medium. Check your < and <=.'],
    diagnose({ extra, missing, col }) {
      const s = col('size');
      if (s >= 0 && extra.length && missing.length) return { headline: 'Some labels are wrong. Check the edges.', detail: 'Exactly £50 and exactly £150 are both Medium.' };
    },
  },
  {
    id: 18, kind: 'Rep', topic: 'CASE + GROUP BY', blurb: 'How many orders in each size band.', minutes: 6,
    table: 'Orders', from: P.james, time: '09:40',
    title: 'Same bands, all orders ever: how many Small, Medium and Large?',
    bullets: ['Small under £50, Medium £50 to £150, Large over £150.', 'Columns: size, order_count.'],
    solution: "SELECT CASE WHEN total_amount < 50 THEN 'Small' WHEN total_amount <= 150 THEN 'Medium' ELSE 'Large' END AS size, COUNT(*) AS order_count FROM Orders GROUP BY CASE WHEN total_amount < 50 THEN 'Small' WHEN total_amount <= 150 THEN 'Medium' ELSE 'Large' END",
    thanks: 'Mostly Medium. Makes sense.',
    hints: ['SQL Server won’t let you GROUP BY an alias.', 'Repeat the whole CASE in GROUP BY, or build the label in a CTE first.'],
    tip: 'Grouping by the alias (GROUP BY size) fails in SQL Server. Repeat the expression.',
  },
  {
    id: 19, kind: 'Walkthrough', topic: 'LEFT JOIN', blurb: 'Customers who have never ordered, step by step.', minutes: 6,
    table: 'Customers', from: P.becky, time: '10:20',
    title: 'Who signed up but never ordered? I want to send them a nudge.',
    bullets: ['Customers with no orders at all.', 'Columns: customer_id, first_name, last_name, email.'],
    steps: [
      { text: 'Try the join you know: SELECT c.customer_id, o.order_id FROM Customers c JOIN Orders o ON o.customer_id = c.customer_id',
        solution: 'SELECT c.customer_id, o.order_id FROM Customers c JOIN Orders o ON o.customer_id = c.customer_id',
        done: 'Every row here has an order. The customers Becky wants have quietly vanished.' },
      { text: 'Change JOIN to LEFT JOIN and run it again. Look for NULL in order_id.',
        solution: 'SELECT c.customer_id, o.order_id FROM Customers c LEFT JOIN Orders o ON o.customer_id = c.customer_id',
        done: 'LEFT JOIN keeps every customer. If there’s no order, the Orders columns come back NULL.' },
      { final: true, text: 'Keep only the customers whose order_id is NULL (IS NULL, not = NULL), and swap the columns for what Becky asked for.' },
    ],
    solution: 'SELECT c.customer_id, c.first_name, c.last_name, c.email FROM Customers c LEFT JOIN Orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL',
    thanks: 'Six nudges going out.',
    hints: ['An inner JOIN drops customers with no orders. You need the join that keeps them.', 'After that join, customers with no orders have NULL in every Orders column.'],
    diagnose({ user, expected }) {
      if (!user.rows.length) return { headline: 'Nothing came back. An inner JOIN only keeps customers who HAVE ordered.', detail: 'Use LEFT JOIN and keep the rows where o.order_id IS NULL.' };
      if (user.rows.length > expected.rows.length) return { headline: 'These people have ordered.', detail: 'After the LEFT JOIN, keep only WHERE o.order_id IS NULL.' };
    },
  },
  {
    id: 20, kind: 'Ticket', topic: 'Self-join', blurb: 'Each person and their manager.', minutes: 6,
    table: 'Staff', from: P.sandra, time: '12:00',
    title: 'Org chart refresh: everyone and who they report to.',
    bullets: ['Join Staff to itself on manager_id.', 'Columns: employee, manager. Full names (first + space + last).',
      "Include me. I report to nobody: show 'No manager'."],
    solution: "SELECT e.first_name + ' ' + e.last_name AS employee, ISNULL(m.first_name + ' ' + m.last_name, 'No manager') AS manager FROM Staff e LEFT JOIN Staff m ON m.staff_id = e.manager_id",
    thanks: 'Good, that matches the chart on the wall.',
    hints: ['Staff appears twice: once as the employee, once as the manager. Give each copy its own alias.', 'Sandra has no manager, so an inner join loses her. And a NULL manager needs a word.'],
    diagnose({ user, expected }) {
      if (user.rows.length < expected.rows.length) return { headline: 'You’ve left me off the chart.', detail: 'An inner join drops anyone with no manager. Use LEFT JOIN.' };
    },
  },
  {
    id: 21, kind: 'Ticket', topic: 'EXISTS', blurb: 'Customers with a cancelled order.', minutes: 5,
    table: 'Orders', from: P.becky, time: '14:30',
    title: 'Which customers have had at least one cancelled order? One row each, please.',
    bullets: ['Columns: customer_id, first_name, last_name.', 'Each customer once, even if they cancelled twice.'],
    solution: "SELECT c.customer_id, c.first_name, c.last_name FROM Customers c WHERE EXISTS (SELECT 1 FROM Orders o WHERE o.customer_id = c.customer_id AND o.status = 'Cancelled')",
    thanks: 'Thanks. I’ll check in with them.',
    hints: ['A JOIN repeats a customer once per cancelled order. You want each customer once.', 'EXISTS asks “is there at least one matching row?” and returns each customer once.'],
    diagnose({ user, expected }) {
      if (user.rows.length > expected.rows.length) return { headline: 'Same customer twice.', detail: 'The join repeats them once per cancelled order. EXISTS gives one row each.' };
    },
  },
  {
    id: 22, kind: 'Ticket', topic: 'NOT EXISTS', blurb: 'Products that have never sold.', minutes: 4,
    table: 'Products', from: P.tom, time: '11:05',
    title: 'Shelf space review: which products have never been on an order?',
    bullets: ['Use Products and OrderLines.', 'Columns: product_id, product_name.'],
    solution: 'SELECT p.product_id, p.product_name FROM Products p WHERE NOT EXISTS (SELECT 1 FROM OrderLines ol WHERE ol.product_id = p.product_id)',
    thanks: 'The Matcha set. I told them.',
    hints: ['The opposite of last ticket.', 'Match the subquery to the outer product on product_id.'],
  },
  {
    id: 23, kind: 'Ticket', topic: 'Revenue by month', blurb: 'CONVERT to month grain for Amy.', minutes: 6,
    table: 'Orders', from: P.amy, time: '09:30',
    title: 'Monthly revenue for the finance pack, shipped orders only. Oldest month first.',
    bullets: ["Only status 'Shipped'.", "Columns: month (text like 2026-03), revenue.", 'Oldest month first.'],
    solution: "SELECT CONVERT(char(7), order_date, 120) AS month, SUM(total_amount) AS revenue FROM Orders WHERE status = 'Shipped' GROUP BY CONVERT(char(7), order_date, 120) ORDER BY month",
    orderBy: [{ col: 'month', desc: false }],
    thanks: 'Into the pack it goes.',
    hints: ['Group by the month, not the day. Turn the date into text like 2026-03.', 'CONVERT style 120 is yyyy-mm-dd. A char(7) only has room for the year and month.'],
    tip: 'Style 120 is yyyy-mm-dd. char(7) keeps the first 7 characters: the month.',
  },
  {
    id: 24, kind: 'Ticket', topic: 'Shipped vs cancelled', blurb: 'Two counts side by side, per month.', minutes: 6,
    table: 'Orders', from: P.tom, time: '15:00',
    title: 'Per month: how many orders shipped and how many were cancelled? Side by side.',
    bullets: ['Columns: month (like 2026-03), shipped, cancelled.', 'One row per month, oldest first.'],
    solution: "SELECT CONVERT(char(7), order_date, 120) AS month, SUM(CASE WHEN status = 'Shipped' THEN 1 ELSE 0 END) AS shipped, SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled FROM Orders GROUP BY CONVERT(char(7), order_date, 120) ORDER BY month",
    orderBy: [{ col: 'month', desc: false }],
    thanks: 'That’s the chart for Thursday.',
    hints: ['One row per month, two counts side by side. Count conditionally.', 'SUM a CASE that gives 1 for the status you want and 0 otherwise.'],
  },
  {
    id: 25, kind: 'Ticket', topic: 'Top products', blurb: 'Best sellers in the last 90 days.', minutes: 6,
    table: 'Products', from: P.sandra, time: '10:45',
    title: 'Top 5 products by revenue over the last 90 days. Leave out cancelled orders.',
    bullets: ['Last 90 days, not today. Ignore Cancelled orders.', 'Revenue is quantity * unit_price from OrderLines.',
      'Columns: product_name, revenue.', 'Top 5, biggest first.'],
    solution: "SELECT TOP 5 p.product_name, SUM(ol.quantity * ol.unit_price) AS revenue FROM OrderLines ol JOIN Orders o ON o.order_id = ol.order_id JOIN Products p ON p.product_id = ol.product_id WHERE o.order_date >= DATEADD(day, -90, CAST(GETDATE() AS date)) AND o.order_date < CAST(GETDATE() AS date) AND o.status <> 'Cancelled' GROUP BY p.product_name ORDER BY revenue DESC",
    orderBy: [{ col: 'revenue', desc: true }],
    thanks: 'Machines and grinders. Good.',
    hints: ['Three tables: OrderLines for revenue, Orders for date and status, Products for the name.', 'Filter, group by product, sort by revenue, then take the top 5.'],
  },
  {
    id: 26, kind: 'Ticket', topic: 'Subquery', blurb: 'Orders above our average order value.', minutes: 5,
    table: 'Orders', from: P.kwame, time: '13:15',
    title: 'Which orders beat our average order value? Biggest first.',
    bullets: ['Columns: order_id, customer_id, total_amount.', 'Only orders above AVG(total_amount) across all orders.'],
    solution: 'SELECT order_id, customer_id, total_amount FROM Orders WHERE total_amount > (SELECT AVG(total_amount) FROM Orders) ORDER BY total_amount DESC',
    orderBy: [{ col: 'total_amount', desc: true }],
    thanks: 'Thanks, that feeds my segment model.',
    hints: ['Compare each order with one number: the average of all orders.', 'A subquery in WHERE can work that number out.'],
  },

  // ======================= Path 3: Analyst Toolkit =======================
  {
    id: 27, kind: 'Ticket', topic: 'Messy names', blurb: 'Trim, lowercase, de-duplicate.', minutes: 6,
    table: 'Customers', from: P.amy, time: '09:05',
    title: 'Mailing list for the newsletter. Some names have stray spaces and emails have capitals. Clean it, no duplicates.',
    bullets: ['Columns: first_name, last_name, email.', 'Trim spaces from all three. Email in lower case.', 'No duplicate rows.'],
    solution: 'SELECT DISTINCT LTRIM(RTRIM(first_name)) AS first_name, LTRIM(RTRIM(last_name)) AS last_name, LOWER(LTRIM(RTRIM(email))) AS email FROM Customers',
    thanks: 'Clean. The mail tool stopped complaining.',
    hints: ['Spaces at either end and capital letters make the same person look different.', 'Trim both ends, lower-case the email, then remove duplicate rows.'],
    diagnose({ user, expected }) {
      if (user.rows.length > expected.rows.length) return { headline: 'There are still duplicates in there.', detail: 'Once the spaces are trimmed, some rows are the same person. SELECT DISTINCT.' };
      return { headline: 'Some names or emails still aren’t clean.', detail: 'Trim all three columns, and LOWER() the email.' };
    },
  },
  {
    id: 28, kind: 'Ticket', topic: 'Duplicate records', blurb: 'Find people entered twice.', minutes: 5,
    table: 'Customers', from: P.becky, time: '11:40',
    title: 'I think some customers are on the system twice. Which emails belong to more than one record?',
    bullets: ['Treat emails as the same if they only differ by case or spaces.', 'Columns: email (cleaned, lower case), records.'],
    solution: 'SELECT LOWER(LTRIM(RTRIM(email))) AS email, COUNT(*) AS records FROM Customers GROUP BY LOWER(LTRIM(RTRIM(email))) HAVING COUNT(*) > 1',
    thanks: 'Two to merge. Good catch.',
    hints: ['Clean the email first, then count how many records share it.', 'Keep only the groups with more than one record.'],
  },
  {
    id: 29, kind: 'Walkthrough', topic: 'CTE', blurb: 'Last order date per customer, step by step.', minutes: 7,
    table: 'Orders', from: P.james, time: '10:10',
    title: 'When did each customer last order? Names, not IDs. Most recent first.',
    bullets: ['Only customers who have ordered.', "Columns: customer_name (first + ' ' + last), last_order_date.", 'Most recent first.'],
    steps: [
      { text: 'Answer it with IDs first: each customer_id and their MAX(order_date) AS last_order_date, grouped by customer.',
        solution: 'SELECT customer_id, MAX(order_date) AS last_order_date FROM Orders GROUP BY customer_id',
        done: 'Right answer, wrong labels. Harvey doesn’t know who 1014 is. Next, name this query so you can join to it.' },
      { final: true, text: 'Wrap it: WITH last_orders AS ( your query ) then SELECT from last_orders, join Customers for the name, newest first.' },
    ],
    solution: "WITH last_orders AS (SELECT customer_id, MAX(order_date) AS last_order_date FROM Orders GROUP BY customer_id) SELECT c.first_name + ' ' + c.last_name AS customer_name, l.last_order_date FROM last_orders l JOIN Customers c ON c.customer_id = l.customer_id ORDER BY l.last_order_date DESC",
    orderBy: [{ col: 'last_order_date', desc: true }],
    thanks: 'Great. The ones at the bottom get a call.',
    hints: ['Work out each customer’s last order date first, then put names on it.', 'A CTE lets you name that first query and join to it.'],
    tip: 'A CTE is a named subquery at the top. It keeps long queries readable.',
  },
  {
    id: 30, kind: 'Walkthrough', topic: 'ROW_NUMBER', blurb: 'Each customer’s latest order, step by step.', minutes: 8,
    table: 'Orders', from: P.kwame, time: '14:00',
    title: 'For each customer, their single latest order: id, date and amount.',
    bullets: ['Columns: customer_id, order_id, order_date, total_amount.', 'One row per customer who has ordered.',
      'If two orders share a date, take the higher order_id.', 'Sort by customer_id.'],
    steps: [
      { text: 'Number each customer’s orders, newest first: SELECT customer_id, order_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) AS rn FROM Orders',
        solution: 'SELECT customer_id, order_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) AS rn FROM Orders',
        done: 'Each customer’s orders count 1, 2, 3… from the newest. PARTITION BY restarts the count for every customer.' },
      { text: 'Now add WHERE rn = 1 to that same query and run it. It fails on purpose.',
        expectError: /Invalid column name 'rn'/i,
        done: 'SQL Server works out WHERE before SELECT, so rn doesn’t exist yet. Put the numbered query in a CTE and filter outside it.' },
      { final: true, text: 'WITH ranked AS ( the numbered query, plus total_amount ) then SELECT the four columns FROM ranked WHERE rn = 1, sorted by customer_id.' },
    ],
    solution: 'WITH ranked AS (SELECT customer_id, order_id, order_date, total_amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) AS rn FROM Orders) SELECT customer_id, order_id, order_date, total_amount FROM ranked WHERE rn = 1 ORDER BY customer_id',
    orderBy: [{ col: 'customer_id', desc: false }],
    thanks: 'That’s the one I always get wrong with MAX. Thanks.',
    hints: ['MAX gives you a date, not the whole row. Number each customer’s orders instead.', 'You can’t filter a window function in the same WHERE. Filter outside a CTE.'],
    diagnose({ user, expected }) {
      if (user.rows.length > expected.rows.length) return { headline: 'Some customers have more than one row.', detail: 'Number each customer’s orders with ROW_NUMBER and keep rn = 1.' };
    },
  },
  {
    id: 31, kind: 'Ticket', topic: 'Returns vs sales', blurb: 'Units sold and returned per product.', minutes: 7,
    table: 'Returns', from: P.tom, time: '09:50',
    title: 'Which products come back most? Units sold next to units returned, per product.',
    bullets: ['Columns: product_name, units_sold, units_returned.', 'Products that have sold at least once. Show 0 returned, not NULL.',
      'Most returned first.'],
    solution: 'WITH sold AS (SELECT product_id, SUM(quantity) AS units_sold FROM OrderLines GROUP BY product_id), returned AS (SELECT product_id, SUM(quantity) AS units_returned FROM Returns GROUP BY product_id) SELECT p.product_name, s.units_sold, ISNULL(r.units_returned, 0) AS units_returned FROM sold s JOIN Products p ON p.product_id = s.product_id LEFT JOIN returned r ON r.product_id = s.product_id ORDER BY units_returned DESC',
    orderBy: [{ col: 'units_returned', desc: true }],
    thanks: 'Grinders again. I’ll talk to Northfold.',
    hints: ['Joining lines straight to returns multiplies rows. Total each table on its own first.', 'Products with no returns still need a row, with 0 rather than NULL.'],
    diagnose({ extra, col }) {
      const s = col('units_sold');
      if (s >= 0 && extra.length) return { headline: 'Some units_sold numbers are inflated.', detail: 'Joining lines to returns repeats rows. Total each table on its own, then join the totals.' };
    },
  },
  {
    id: 32, kind: 'Ticket', topic: 'Running total', blurb: 'Daily revenue with a running total.', minutes: 7,
    table: 'Orders', from: P.amy, time: '17:05',
    title: 'Daily revenue for the last 14 days, not today, with a running total.',
    bullets: ['One row per day that had orders.', 'Columns: order_day, revenue, running_total.', 'Oldest day first.'],
    solution: 'WITH daily AS (SELECT order_date AS order_day, SUM(total_amount) AS revenue FROM Orders WHERE order_date >= DATEADD(day, -14, CAST(GETDATE() AS date)) AND order_date < CAST(GETDATE() AS date) GROUP BY order_date) SELECT order_day, revenue, SUM(revenue) OVER (ORDER BY order_day) AS running_total FROM daily ORDER BY order_day',
    orderBy: [{ col: 'order_day', desc: false }],
    thanks: 'Exactly what the dashboard needs.',
    hints: ['First total each day, then add up as you go.', 'SUM can run as a window: OVER (ORDER BY the day).'],
  },
  {
    id: 33, kind: 'Ticket', topic: 'RANK', blurb: 'Rank products within each category.', minutes: 7,
    table: 'Products', from: P.sandra, time: '08:15',
    title: 'Rank products by revenue inside each category. I want to see who’s top in each.',
    bullets: ['Revenue is quantity * unit_price from OrderLines.', 'Columns: category, product_name, revenue, rank_in_category.',
      'Sort by category, then rank.'],
    solution: 'SELECT p.category, p.product_name, SUM(ol.quantity * ol.unit_price) AS revenue, RANK() OVER (PARTITION BY p.category ORDER BY SUM(ol.quantity * ol.unit_price) DESC) AS rank_in_category FROM OrderLines ol JOIN Products p ON p.product_id = ol.product_id GROUP BY p.category, p.product_name ORDER BY p.category, rank_in_category',
    orderBy: [{ col: 'category', desc: false }, { col: 'rank_in_category', desc: false }],
    thanks: 'Useful. Office is closer than I thought.',
    hints: ['The ranking restarts in each category.', 'PARTITION BY restarts a window function for each group.'],
  },
  {
    id: 34, kind: 'Ticket', topic: 'LAG', blurb: 'Month-over-month change.', minutes: 7,
    table: 'Orders', from: P.amy, time: '10:30',
    title: 'Monthly revenue with the change from the month before. Leave out cancelled orders.',
    bullets: ["Ignore Cancelled orders.", 'Columns: month (like 2026-03), revenue, change.',
      'change is this month minus last month. The first month has no change (NULL).', 'Oldest first.'],
    solution: "WITH monthly AS (SELECT CONVERT(char(7), order_date, 120) AS month, SUM(total_amount) AS revenue FROM Orders WHERE status <> 'Cancelled' GROUP BY CONVERT(char(7), order_date, 120)) SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month) AS change FROM monthly ORDER BY month",
    orderBy: [{ col: 'month', desc: false }],
    thanks: 'Saves me an Excel step every month.',
    hints: ['Monthly totals first, then compare each month with the one before.', 'LAG looks back one row in the order you give it.'],
  },
  {
    id: 35, kind: 'Ticket', topic: 'Percent of total', blurb: 'Each category’s share of revenue.', minutes: 6,
    table: 'Products', from: P.sandra, time: '16:20',
    title: 'What share of revenue does each category bring in? As a percentage.',
    bullets: ['Revenue is quantity * unit_price from OrderLines.', 'Columns: category, revenue, pct_of_total.',
      'pct_of_total rounded to 1 decimal place (e.g. 41.3).', 'Biggest first.'],
    solution: 'SELECT p.category, SUM(ol.quantity * ol.unit_price) AS revenue, ROUND(100.0 * SUM(ol.quantity * ol.unit_price) / SUM(SUM(ol.quantity * ol.unit_price)) OVER (), 1) AS pct_of_total FROM OrderLines ol JOIN Products p ON p.product_id = ol.product_id GROUP BY p.category ORDER BY revenue DESC',
    orderBy: [{ col: 'revenue', desc: true }],
    thanks: 'Pie chart done.',
    hints: ['Each category’s revenue divided by the grand total, times 100.', 'A window SUM with an empty OVER () sees every group at once.'],
  },
  {
    id: 36, kind: 'Fix it', topic: 'Doubled totals', blurb: 'Your colleague’s spend report is inflated.', minutes: 6,
    table: 'Orders', from: P.kwame, time: '11:00',
    title: 'My top-10 spenders query gives numbers way higher than finance’s. Can you see why?',
    bullets: ["Columns: customer_name (first + ' ' + last), total_spent.", 'Top 10 by total_spent, biggest first.', 'Fix the query in the editor.'],
    starter: `SELECT TOP 10 c.first_name + ' ' + c.last_name AS customer_name,\n       SUM(o.total_amount) AS total_spent\nFROM Customers c\nJOIN Orders o ON o.customer_id = c.customer_id\nJOIN OrderLines ol ON ol.order_id = o.order_id\nGROUP BY c.first_name, c.last_name\nORDER BY total_spent DESC`,
    solution: "SELECT TOP 10 c.first_name + ' ' + c.last_name AS customer_name, SUM(o.total_amount) AS total_spent FROM Customers c JOIN Orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.first_name, c.last_name ORDER BY total_spent DESC",
    orderBy: [{ col: 'total_spent', desc: true }],
    thanks: 'The OrderLines join. Of course. Thank you.',
    hints: ['Count how many rows each order turns into after the joins.', 'Does anything in the report actually need OrderLines?'],
    diagnose() { return { headline: 'That join is multiplying the order.', detail: 'One row per line, so each total gets counted again.' }; },
  },
  {
    id: 37, kind: 'Fix it', topic: 'Yesterday, not today', blurb: 'A date filter that leaks today.', minutes: 4,
    table: 'Orders', from: P.james, time: '08:40',
    title: 'My “yesterday’s orders” query keeps showing this morning’s orders too. Fix it?',
    bullets: ['Only orders dated yesterday.', 'Columns: order_id, total_amount.', 'Fix the query in the editor.'],
    starter: 'SELECT order_id, total_amount\nFROM Orders\nWHERE order_date >= DATEADD(day, -1, CAST(GETDATE() AS date))',
    solution: 'SELECT order_id, total_amount FROM Orders WHERE order_date >= DATEADD(day, -1, CAST(GETDATE() AS date)) AND order_date < CAST(GETDATE() AS date)',
    thanks: 'Ah, the end of the range. Cheers.',
    hints: ['A range needs two ends. Where does this one stop?', 'Add an upper bound: before midnight today.'],
  },
  {
    id: 38, kind: 'Fix it', topic: 'GROUP BY error', blurb: 'A query SQL Server refuses to run.', minutes: 4,
    table: 'Orders', from: P.tom, time: '13:55',
    title: 'This errors and I don’t get why. I just want orders per status.',
    bullets: ['Columns: status, order_count.', 'Fix the query in the editor.'],
    starter: 'SELECT status, COUNT(*) AS order_count\nFROM Orders',
    solution: 'SELECT status, COUNT(*) AS order_count FROM Orders GROUP BY status',
    thanks: 'So that’s what that error means.',
    hints: ['Read the error. It names the column SQL Server is unhappy about.', 'Every column not inside COUNT has to be in GROUP BY.'],
  },
  {
    id: 39, kind: 'Interview', topic: 'Second highest', blurb: 'The classic interview question.', minutes: 5,
    table: 'Orders', from: P.interview, time: '14:00',
    title: 'Without using TOP: what is the second-highest order value?',
    bullets: ['Column: second_highest.', 'One row. Don’t use TOP.'],
    solution: 'SELECT MAX(total_amount) AS second_highest FROM Orders WHERE total_amount < (SELECT MAX(total_amount) FROM Orders)',
    noTop: true,
    thanks: 'Good. Next question.',
    hints: ['The second highest is the biggest value that’s below the biggest value.', 'MAX, with a WHERE that compares against a subquery.'],
  },
  {
    id: 40, kind: 'Interview', topic: 'Monday review', blurb: 'Top 3 sellers, last 30 days.', minutes: 8,
    table: 'Staff', from: P.sandra, time: '08:00',
    title: 'Monday morning: who were our top 3 sellers over the last 30 days?',
    bullets: ['Join Orders to Staff on staff_id. Last 30 days, not today.', "Columns: staff_name (first + ' ' + last), revenue.", 'Top 3, biggest first.'],
    solution: "SELECT TOP 3 s.first_name + ' ' + s.last_name AS staff_name, SUM(o.total_amount) AS revenue FROM Orders o JOIN Staff s ON o.staff_id = s.staff_id WHERE o.order_date >= DATEADD(day, -30, CAST(GETDATE() AS date)) AND o.order_date < CAST(GETDATE() AS date) GROUP BY s.first_name, s.last_name ORDER BY revenue DESC",
    orderBy: [{ col: 'revenue', desc: true }],
    thanks: 'Shout-outs in the all-hands. Thanks.',
    hints: ['Join, filter to the last 30 days, total per person, take the top 3.', 'Group by the name columns and sort by revenue before TOP picks.'],
  },

  // ======================= Reps after the walkthroughs =======================
  {
    id: 41, kind: 'Rep', topic: 'CASE', blurb: 'Price bands for the shelf labels.', minutes: 4,
    table: 'Products', from: P.tom, time: '11:20',
    title: 'New shelf labels: every product with a price band. Budget, Standard or Premium.',
    bullets: ['Budget is under £15. Standard is £15 to £50. Premium is over £50.', 'Columns: product_name, unit_price, price_band.', 'Most expensive first.'],
    solution: "SELECT product_name, unit_price, CASE WHEN unit_price < 15 THEN 'Budget' WHEN unit_price <= 50 THEN 'Standard' ELSE 'Premium' END AS price_band FROM Products ORDER BY unit_price DESC",
    orderBy: [{ col: 'unit_price', desc: true }],
    thanks: 'Printing them now.',
    hints: ['Same shape as the order sizes. Different column, different words.', 'Three bands means two WHENs and an ELSE.'],
  },
  {
    id: 42, kind: 'Rep', topic: 'LEFT JOIN', blurb: 'Products nobody has sent back.', minutes: 4,
    table: 'Returns', from: P.tom, time: '14:10',
    title: 'Which products have never been returned? Supplier review on Friday.',
    bullets: ['Use Products and Returns.', 'Columns: product_id, product_name.'],
    solution: 'SELECT p.product_id, p.product_name FROM Products p LEFT JOIN Returns r ON r.product_id = p.product_id WHERE r.return_id IS NULL',
    thanks: 'Good list to take to the suppliers.',
    hints: ['Same shape as customers who never ordered.', 'Keep every product, then keep the ones where the Returns side came back NULL.'],
    diagnose({ user, expected }) {
      if (user.rows.length > expected.rows.length) return { headline: 'Some of these have been returned, or appear twice.', detail: 'After the LEFT JOIN, keep only rows where a Returns column IS NULL.' };
    },
  },
  {
    id: 43, kind: 'Rep', topic: 'LEFT JOIN', blurb: 'Staff with no orders this month. Mind the ON.', minutes: 6,
    table: 'Staff', from: P.sandra, time: '16:30',
    title: 'Who on the team hasn’t taken an order in the last 30 days? Everyone, not just sales.',
    bullets: ['Every staff member with no orders in the last 30 days, not including today.', 'Columns: first_name, last_name, role.'],
    solution: 'SELECT s.first_name, s.last_name, s.role FROM Staff s LEFT JOIN Orders o ON o.staff_id = s.staff_id AND o.order_date >= DATEADD(day, -30, CAST(GETDATE() AS date)) AND o.order_date < CAST(GETDATE() AS date) WHERE o.order_id IS NULL',
    thanks: 'Mostly the people who don’t sell, which is fine. Thanks.',
    hints: ['Same shape as customers who never ordered, with a date range on the orders.', 'Where the date range goes matters. In WHERE, it throws away the NULL rows you’re looking for.'],
    diagnose({ user }) {
      if (!user.rows.length) return { headline: 'Nothing back. The date filter is in WHERE.', detail: 'That turns your LEFT JOIN back into an inner join. Move the date range into the ON.' };
    },
  },
  {
    id: 44, kind: 'Rep', topic: 'CTE', blurb: 'Customers whose average order is over £150.', minutes: 5,
    table: 'Orders', from: P.james, time: '11:45',
    title: 'Who are our big-basket customers? Average order over £150.',
    bullets: ["Columns: customer_name (first + ' ' + last), avg_order.", 'Only customers whose average order is over £150.', 'Biggest average first.'],
    solution: "WITH averages AS (SELECT customer_id, AVG(total_amount) AS avg_order FROM Orders GROUP BY customer_id) SELECT c.first_name + ' ' + c.last_name AS customer_name, a.avg_order FROM averages a JOIN Customers c ON c.customer_id = a.customer_id WHERE a.avg_order > 150 ORDER BY a.avg_order DESC",
    orderBy: [{ col: 'avg_order', desc: true }],
    thanks: 'They’re getting the trade catalogue.',
    hints: ['Work out each customer’s average in a CTE first.', 'Then join the names on and filter the averages.'],
  },
  {
    id: 45, kind: 'Rep', topic: 'CTE', blurb: 'Products selling above average.', minutes: 5,
    table: 'OrderLines', from: P.amy, time: '15:15',
    title: 'Which products sell more units than the average product? It’s for the stock budget.',
    bullets: ['Units sold per product, from OrderLines.', 'Only products above the average of those totals.', 'Columns: product_name, units_sold. Most first.'],
    solution: 'WITH sold AS (SELECT product_id, SUM(quantity) AS units_sold FROM OrderLines GROUP BY product_id) SELECT p.product_name, s.units_sold FROM sold s JOIN Products p ON p.product_id = s.product_id WHERE s.units_sold > (SELECT AVG(units_sold) FROM sold) ORDER BY s.units_sold DESC',
    orderBy: [{ col: 'units_sold', desc: true }],
    thanks: 'That’s the reorder list sorted.',
    hints: ['Total units per product in a CTE.', 'You can use a CTE twice: once for the rows, once inside a subquery for the average.'],
  },
  {
    id: 46, kind: 'Rep', topic: 'ROW_NUMBER', blurb: 'Each customer’s biggest order.', minutes: 5,
    table: 'Orders', from: P.becky, time: '10:40',
    title: 'Thank-you cards: each customer’s single biggest order.',
    bullets: ['Columns: customer_id, order_id, total_amount.', 'One row per customer who has ordered. If two tie, take the higher order_id.', 'Sort by customer_id.'],
    solution: 'WITH ranked AS (SELECT customer_id, order_id, total_amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total_amount DESC, order_id DESC) AS rn FROM Orders) SELECT customer_id, order_id, total_amount FROM ranked WHERE rn = 1 ORDER BY customer_id',
    orderBy: [{ col: 'customer_id', desc: false }],
    thanks: 'Cards go out tomorrow.',
    hints: ['Same shape as the latest order, numbered by a different column.', 'Biggest first inside each customer, keep number 1.'],
  },
];

// Which tickets land on which day, in order. IDs are stable so saved progress survives reordering.
const SCHEDULE = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  2: [11, 12, 13, 14, 15, 16],
  3: [17, 41, 18, 24, 23, 25],
  4: [19, 42, 43, 20, 21, 22],
  5: [26, 27, 28, 37, 38, 36],
  6: [29, 44, 45, 31, 30, 46],
  7: [32, 33, 34, 35, 39, 40],
};
const byId = new Map(lessons.map((l) => [l.id, l]));
const ordered = Object.entries(SCHEDULE).flatMap(([day, ids]) => ids.map((id) => Object.assign(byId.get(id), { day: Number(day) })));
if (ordered.length !== lessons.length) throw new Error('Every lesson must be scheduled exactly once');
ordered.forEach((l, i) => { l.n = i + 1; l.free = l.day === 1; l.next = ordered[i + 1] ? ordered[i + 1].id : null; });
lessons.splice(0, lessons.length, ...ordered);
const FREE_LESSONS = lessons.filter((l) => l.free).length;

// The step a learner is on, with lesson defaults filled in for the final ticket.
const { forStack, dayForStack } = require('./lessons-stacks');

function stepSpec(lesson, i) {
  const steps = lesson.steps || [{ final: true }];
  const step = steps[Math.min(Math.max(0, i | 0), steps.length - 1)];
  if (!step.final) return step;
  return { ...step, solution: lesson.solution, orderBy: lesson.orderBy, diagnose: lesson.diagnose, noTop: lesson.noTop };
}

function nextInfo(l) {
  const next = l.next && byId.get(l.next);
  return next ? { id: next.id, free: next.free, day: next.day } : null;
}

function publicLesson(l) {
  return {
    id: l.id, n: l.n, day: l.day, kind: l.kind, topic: l.topic, blurb: l.blurb, minutes: l.minutes, table: l.table,
    from: l.from, time: l.time, title: l.title, bullets: l.bullets, hints: l.hints, tip: l.tip || null,
    thanks: l.thanks, starter: l.starter || null, free: l.free, next: nextInfo(l),
    steps: (l.steps || []).map((s) => ({ text: s.text, starter: s.starter || null, done: s.done || null, final: !!s.final })),
  };
}

// Catalogue entry for locked lessons: enough to see what you are buying, not the answers.
function listing(l) {
  return { id: l.id, n: l.n, day: l.day, kind: l.kind, topic: l.topic, blurb: l.blurb, minutes: l.minutes, from: l.from.name, free: l.free };
}

// The next ticket a learner would see, in schedule order, given what they've closed.
function nextOpen(completedIds) {
  const done = new Set((completedIds || []).map(Number));
  return lessons.find((l) => !done.has(l.id)) || lessons[lessons.length - 1];
}

// The catalogue and lessons as one stack reads them.
const stackDays = (dialect) => days.map((d) => dayForStack(d, dialect));
const lessonFor = (l, dialect) => forStack(l, dialect);

module.exports = { lessons, days, stepSpec, publicLesson, listing, nextOpen, FREE_LESSONS, lessonFor, stackDays };
