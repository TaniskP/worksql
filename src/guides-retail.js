// Real-life guides: shops and online retail. Each one starts from the message someone actually sends.
const { sql, c, table, joinDemo, slides, guide } = require('./article-html');

module.exports = [
  guide({
    slug: 'abandoned-baskets', name: 'Abandoned baskets', topic: 'Joins',
    title: 'Find abandoned baskets in SQL: carts that never became orders',
    short: 'Baskets with no order: a LEFT JOIN that keeps the misses.',
    description: 'Find abandoned shopping baskets in SQL Server with LEFT JOIN … IS NULL, skip carts still being filled, and avoid the NOT IN trap.',
    lede: 'An abandoned basket is a basket with no order attached. You find it the same way you find any “thing without a match”: LEFT JOIN to the orders and keep the rows where nothing came back.',
    ask: { who: 'Priya Shah', role: 'Ecommerce Manager', text: 'Can I get yesterday’s abandoned baskets for the “you left something behind” email? Only ones that are properly abandoned, not people still shopping.' },
    plain: 'Every basket either turned into an order or it did not. List the baskets, look each one up in the orders, and keep the ones that are not there. Leave out baskets from the last hour: those people may still be at the till.',
    html: () => `
<h2>The two tables</h2>
${joinDemo({ title: 'Step through it: which baskets never became an order?',
    left: { name: 'Baskets', cols: ['basket_id', 'customer', 'created_at', 'items'], rows: [[301, 'Amy', '2026-11-07 10:02', 3], [302, 'Ben', '2026-11-07 11:15', 1], [303, 'Cara', '2026-11-07 09:40', 2], [304, 'Dev', '2026-11-07 20:05', 4]] },
    right: { name: 'Orders', cols: ['order_id', 'basket_id'], rows: [[9001, 301], [9002, 303]] },
    on: ['basket_id', 'basket_id'], type: 'anti', pick: ['l.basket_id', 'l.customer', 'l.items'],
    say: (l, n) => (n ? `Basket ${l[0]} (${l[1]}) became an order, so it is not abandoned.` : `Basket ${l[0]} (${l[1]}) has no order. Abandoned.`) })}
<h2>The query</h2>
${sql(`SELECT b.basket_id, b.customer_id, b.created_at, b.items
FROM Baskets b
LEFT JOIN Orders o ON o.basket_id = b.basket_id
WHERE o.order_id IS NULL
  AND b.created_at >= DATEADD(day, -1, CAST(GETDATE() AS date))
  AND b.created_at <  CAST(GETDATE() AS date)
  AND b.items > 0
ORDER BY b.items DESC;`)}
<p>The date filter keeps it to yesterday, whole day. Because yesterday is finished, nobody in the list can still be shopping. If you run it for today, add ${c('AND b.created_at < DATEADD(hour, -1, GETDATE())')} instead.</p>
<div class="mistake"><b>NOT IN and a single NULL</b>
<p>${c('WHERE basket_id NOT IN (SELECT basket_id FROM Orders)')} looks the same, but if any order has a NULL basket_id (phone orders often do) the whole query returns nothing. LEFT JOIN … IS NULL and NOT EXISTS do not have that problem.</p></div>`,
  }),

  guide({
    slug: 'products-bought-together', name: 'Products bought together', topic: 'Joins',
    title: 'Which products are bought together? Basket analysis in SQL',
    short: 'Join order lines to themselves to count pairs.',
    description: 'Count which products appear in the same order with a self-join in SQL Server, without counting each pair twice.',
    lede: 'To find pairs that sell together, join the order lines table to itself on the order number. Each pair of lines in the same order becomes one row, and then you count the pairs.',
    ask: { who: 'Marcus Lee', role: 'Merchandiser', text: 'What sells together? I want to put the right things next to each other on the homepage.' },
    plain: 'Look inside each order and write down every pair of different products in it. Then count how many orders each pair turned up in. The pairs with the highest counts are the ones customers buy together.',
    html: () => `
${slides([
    { title: 'Order lines', html: table('OrderLines', ['order_id', 'product'], [[1, 'Tea'], [1, 'Mug'], [2, 'Tea'], [2, 'Biscuits'], [3, 'Tea'], [3, 'Mug'], [3, 'Biscuits'], [4, 'Mug']]) },
    { title: 'Every pair inside each order (a.product < b.product)', note: 'Order 3 has three products, so it makes three pairs. Order 4 has one product, so it makes none.', html: table('Pairs', ['order_id', 'product_a', 'product_b'], [[1, 'Mug', 'Tea'], [2, 'Biscuits', 'Tea'], [3, 'Biscuits', 'Mug'], [3, 'Biscuits', 'Tea'], [3, 'Mug', 'Tea']]) },
    { title: 'Counted', html: table('Result', ['product_a', 'product_b', 'orders_together'], [['Biscuits', 'Tea', 2], ['Mug', 'Tea', 2], ['Biscuits', 'Mug', 1]]) },
  ], { title: 'From order lines to pairs' })}
<h2>The query</h2>
${sql(`SELECT a.product AS product_a,
       b.product AS product_b,
       COUNT(*)  AS orders_together
FROM OrderLines a
JOIN OrderLines b
  ON b.order_id = a.order_id
 AND a.product < b.product
GROUP BY a.product, b.product
ORDER BY orders_together DESC;`)}
<h2>Why a.product &lt; b.product</h2>
<p>With ${c('a.product <> b.product')} every pair appears twice (Mug–Tea and Tea–Mug), so every count doubles. “Less than” keeps exactly one of the two, in alphabetical order.</p>
<div class="mistake"><b>Popular products pair with everything</b>
<p>Tea is in most orders, so it tops every pair list. Before you move shelves, compare the pair count with how often each product sells on its own.</p></div>`,
  }),

  guide({
    slug: 'first-order-channel', name: 'First order channel', topic: 'Window',
    title: 'Which channel brought each customer in? First order per customer in SQL',
    short: 'ROW_NUMBER the orders, keep number 1, then count channels.',
    description: 'Find each customer’s first order and the marketing channel it came from with ROW_NUMBER in SQL Server, then count new customers per channel.',
    lede: 'Marketing want to credit the channel that first brought a customer in, not the one they used last. Number each customer’s orders oldest first and keep the first one.',
    ask: { who: 'Hannah Okoro', role: 'Marketing Lead', text: 'How many new customers did each channel bring in this year? Count each person once, on their first order.' },
    plain: 'Line up each customer’s orders from oldest to newest and look only at the first. That order’s channel is where they came from. Then count how many customers each channel brought.',
    html: () => `
${slides([
    { title: 'All orders', html: table('Orders', ['customer', 'order_date', 'channel'], [['Amy', '2026-03-02', 'Instagram'], ['Amy', '2026-05-10', 'Email'], ['Ben', '2026-04-01', 'Email'], ['Ben', '2026-04-11', 'Google'], ['Cara', '2026-06-20', 'Google'], ['Dev', '2026-07-01', 'Google']]) },
    { title: 'Numbered, oldest first', html: table('Numbered', ['customer', 'order_date', 'channel', 'rn'], [['Amy', '2026-03-02', 'Instagram', 1], ['Amy', '2026-05-10', 'Email', 2], ['Ben', '2026-04-01', 'Email', 1], ['Ben', '2026-04-11', 'Google', 2], ['Cara', '2026-06-20', 'Google', 1], ['Dev', '2026-07-01', 'Google', 1]]) },
    { title: 'rn = 1, counted by channel', html: table('Result', ['channel', 'new_customers'], [['Google', 2], ['Email', 1], ['Instagram', 1]]) },
  ])}
<h2>The query</h2>
${sql(`WITH numbered AS (
  SELECT customer_id, channel,
         ROW_NUMBER() OVER (PARTITION BY customer_id
                            ORDER BY order_date, order_id) AS rn
  FROM Orders
)
SELECT channel, COUNT(*) AS new_customers
FROM numbered
WHERE rn = 1
GROUP BY channel
ORDER BY new_customers DESC;`)}
<p>${c('order_id')} in the ORDER BY breaks ties when a customer placed two orders on their first day, so the answer is the same every time you run it.</p>
<div class="mistake"><b>MIN(order_date) with channel in the GROUP BY</b>
<p>${c('SELECT customer_id, channel, MIN(order_date) … GROUP BY customer_id, channel')} returns one row per customer <em>per channel</em>, so Amy is counted for Instagram and Email. You need the whole first row, which is what ROW_NUMBER gives you.</p></div>`,
  }),

  guide({
    slug: 'repeat-customer-rate', name: 'Repeat customer rate', topic: 'Reporting',
    title: 'Repeat customer rate in SQL: what share of customers came back?',
    short: 'Count orders per customer, then count the 2+ ones.',
    description: 'Work out the repeat purchase rate in SQL Server: customers with two or more orders as a percentage of all customers, without integer division.',
    lede: 'Repeat rate is “customers who ordered at least twice” divided by “customers who ordered at all”. Count per customer first, then count the customers.',
    ask: { who: 'Sandra Okafor', role: 'Managing Director', text: 'What percentage of our customers come back for a second order? I want one number for the board.' },
    plain: 'Count how many orders each customer has placed. Of everyone who has bought at least once, how many have bought twice or more? Divide the second number by the first.',
    html: () => `
${slides([
    { title: 'Orders per customer', html: table('per_customer', ['customer', 'orders'], [['Amy', 3], ['Ben', 1], ['Cara', 2], ['Dev', 1], ['Esme', 1]]) },
    { title: 'Two of the five came back', html: table('Result', ['customers', 'repeat_customers', 'repeat_rate_pct'], [[5, 2, '40.0']]) },
  ])}
<h2>The query</h2>
${sql(`WITH per_customer AS (
  SELECT customer_id, COUNT(*) AS orders
  FROM Orders
  WHERE status <> 'Cancelled'
  GROUP BY customer_id
)
SELECT COUNT(*) AS customers,
       SUM(CASE WHEN orders >= 2 THEN 1 ELSE 0 END) AS repeat_customers,
       CAST(100.0 * SUM(CASE WHEN orders >= 2 THEN 1 ELSE 0 END) / COUNT(*)
            AS decimal(5,1)) AS repeat_rate_pct
FROM per_customer;`)}
<div class="mistake"><b>2 / 5 * 100 = 0</b>
<p>Both numbers are integers, so SQL Server does integer division: 2 / 5 is 0, and 0 × 100 is still 0. Multiplying by ${c('100.0')} first turns it into a decimal sum and gives 40.0.</p></div>
<p>Say which period you used. “40% of everyone who has ever bought” and “40% of this year’s new customers bought again within 90 days” are different numbers, and the board will compare them.</p>`,
  }),

  guide({
    slug: 'average-order-value', name: 'Average order value', topic: 'Aggregates',
    title: 'Average order value in SQL (and why AVG of the lines is wrong)',
    short: 'Add up each order first, then average the orders.',
    description: 'Calculate average order value and items per order in SQL Server correctly, by totalling each order before averaging.',
    lede: 'Average order value is total revenue divided by the number of orders. If you take AVG over the order lines instead, you get the average line, which is a smaller and wrong number.',
    ask: { who: 'Amy Nair', role: 'Finance Lead', text: 'What was our average order value last month, and how many items is a typical order?' },
    plain: 'Add up each order to get its total. Then take the average of those totals. Averaging the individual lines tells you what a typical line is worth, not a typical order.',
    html: () => `
${slides([
    { title: 'Order lines', html: table('OrderLines', ['order_id', 'amount'], [[1, 18], [1, 12], [2, 12], [3, 15], [3, 15], [3, 15]]) },
    { title: 'Each order totalled', html: table('orders', ['order_id', 'order_total', 'items'], [[1, 30, 2], [2, 12, 1], [3, 45, 3]]) },
    { title: 'Averaged', note: `${c('AVG(amount)')} over the lines would say 14.50: the average line, not the average order.`, html: table('Result', ['orders', 'revenue', 'avg_order_value', 'avg_items'], [[3, 87, '29.00', '2.00']]) },
  ])}
<h2>The query</h2>
${sql(`WITH orders AS (
  SELECT order_id,
         SUM(amount) AS order_total,
         COUNT(*)    AS items
  FROM OrderLines
  GROUP BY order_id
)
SELECT COUNT(*)                                   AS orders,
       SUM(order_total)                           AS revenue,
       CAST(AVG(order_total) AS decimal(10,2))    AS avg_order_value,
       CAST(AVG(1.0 * items) AS decimal(10,2))    AS avg_items
FROM orders;`)}
<div class="mistake"><b>AVG of a whole-number column</b>
<p>${c('AVG(items)')} on an int column rounds down: 2.5 items becomes 2. ${c('AVG(1.0 * items)')} keeps the decimals.</p></div>`,
  }),

  guide({
    slug: 'return-rate-by-product', name: 'Return rate by product', topic: 'Joins',
    title: 'Return rate by product in SQL: units returned ÷ units sold',
    short: 'Total sales and returns separately, then LEFT JOIN.',
    description: 'Calculate the return rate per product in SQL Server without doubling totals: aggregate sales and returns separately, then join.',
    lede: 'A return rate needs two totals per product: how many sold and how many came back. Add each up on its own first, then put them side by side.',
    ask: { who: 'Tom Gallagher', role: 'Warehouse Lead', text: 'Which products get sent back the most? As a percentage, so the big sellers do not look worse than they are.' },
    plain: 'For each product, count how many were sold and how many were returned. Divide returned by sold. A product that was never returned still belongs in the list, with a rate of zero.',
    html: () => `
${joinDemo({ title: 'Step through it: putting sales and returns side by side',
    left: { name: 'sold', cols: ['product', 'units_sold'], rows: [['Kettle', 40], ['Toaster', 25], ['Blender', 10]] },
    right: { name: 'returned', cols: ['product', 'units_returned'], rows: [['Kettle', 2], ['Blender', 3]] },
    on: ['product', 'product'], type: 'left', pick: ['l.product', 'l.units_sold', 'r.units_returned'],
    say: (l, n) => (n ? `${l[0]} has returns, so the count comes across.` : `${l[0]} has never been returned. LEFT JOIN keeps it, with NULL returns that ISNULL turns into 0.`) })}
<h2>The query</h2>
${sql(`WITH sold AS (
  SELECT product_id, SUM(quantity) AS units_sold
  FROM OrderLines
  GROUP BY product_id
), returned AS (
  SELECT product_id, SUM(quantity) AS units_returned
  FROM Returns
  GROUP BY product_id
)
SELECT p.product_name,
       s.units_sold,
       ISNULL(r.units_returned, 0) AS units_returned,
       CAST(100.0 * ISNULL(r.units_returned, 0) / s.units_sold AS decimal(5,1)) AS return_rate_pct
FROM sold s
JOIN Products p      ON p.product_id = s.product_id
LEFT JOIN returned r ON r.product_id = s.product_id
ORDER BY return_rate_pct DESC;`)}
${table('Result', ['product_name', 'units_sold', 'units_returned', 'return_rate_pct'], [['Blender', 10, 3, '30.0'], ['Kettle', 40, 2, '5.0'], ['Toaster', 25, 0, '0.0']])}
<div class="mistake"><b>Joining the raw tables</b>
<p>OrderLines joined straight to Returns matches every sale of a kettle with every return of a kettle. Forty sales and two returns become eighty rows, and both totals are wrong. Always total each side first.</p></div>`,
  }),

  guide({
    slug: 'best-seller-per-category', name: 'Best seller per category', topic: 'Window',
    title: 'Best-selling product in each category with SQL',
    short: 'Rank inside each category, keep rank 1.',
    description: 'Find the top product in every category in SQL Server with ROW_NUMBER or RANK over revenue, and decide what happens on a tie.',
    lede: 'TOP 1 gives you the single best product overall. For the best one in each category, rank the products within their category and keep the first.',
    ask: { who: 'Marcus Lee', role: 'Merchandiser', text: 'What’s the number one product in each category this quarter? One line per category please.' },
    plain: 'Add up revenue per product. Then, inside each category, sort the products from highest to lowest and keep only the top one.',
    html: () => `
${slides([
    { title: 'Revenue per product', html: table('revenue', ['category', 'product', 'revenue'], [['Kitchen', 'Kettle', 4200], ['Kitchen', 'Toaster', 3100], ['Garden', 'Hose', 900], ['Garden', 'Trowel', 1300], ['Bathroom', 'Towel', 2200]]) },
    { title: 'Ranked within each category', html: table('ranked', ['category', 'product', 'revenue', 'rn'], [['Bathroom', 'Towel', 2200, 1], ['Garden', 'Trowel', 1300, 1], ['Garden', 'Hose', 900, 2], ['Kitchen', 'Kettle', 4200, 1], ['Kitchen', 'Toaster', 3100, 2]]) },
    { title: 'rn = 1', html: table('Result', ['category', 'product', 'revenue'], [['Bathroom', 'Towel', 2200], ['Garden', 'Trowel', 1300], ['Kitchen', 'Kettle', 4200]]) },
  ])}
<h2>The query</h2>
${sql(`WITH revenue AS (
  SELECT p.category, p.product_name,
         SUM(ol.quantity * ol.unit_price) AS revenue
  FROM OrderLines ol
  JOIN Products p ON p.product_id = ol.product_id
  GROUP BY p.category, p.product_name
), ranked AS (
  SELECT category, product_name, revenue,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY revenue DESC) AS rn
  FROM revenue
)
SELECT category, product_name, revenue
FROM ranked
WHERE rn = 1
ORDER BY category;`)}
<div class="mistake"><b>Two products tie for first</b>
<p>ROW_NUMBER picks one of them at random. If a tie should show both, use ${c('RANK()')} instead, and say so in the email so nobody thinks a row was duplicated.</p></div>`,
  }),

  guide({
    slug: 'price-on-date-of-sale', name: 'Price on the date of sale', topic: 'Dates',
    title: 'Look up the price that applied on the day of each sale in SQL',
    short: 'Join on the product and a date range, not just the product.',
    description: 'Join sales to a price history table in SQL Server using valid_from and valid_to, so each sale gets the price that applied that day.',
    lede: 'When prices change, a price history table keeps every version with the dates it applied. To price a sale, match the product and the date range the sale falls in.',
    ask: { who: 'Amy Nair', role: 'Finance Lead', text: 'Can you show each mug sale this year with the list price at the time? We changed it in June and the report is using today’s price for everything.' },
    plain: 'Each price row says “from this date, until that date”. A sale belongs to the price row whose date range it falls inside. The current price has no end date yet.',
    html: () => `
<h2>The data</h2>
<div class="jd-tables">
${table('PriceHistory', ['product', 'price', 'valid_from', 'valid_to'], [['Mug', '6.00', '2026-01-01', '2026-06-01'], ['Mug', '6.50', '2026-06-01', null]])}
${table('Sales', ['sale_id', 'product', 'sale_date'], [[1, 'Mug', '2026-03-14'], [2, 'Mug', '2026-06-01'], [3, 'Mug', '2026-09-09']])}
</div>
<h2>The query</h2>
${sql(`SELECT s.sale_id, s.sale_date, ph.price
FROM Sales s
JOIN PriceHistory ph
  ON ph.product_id = s.product_id
 AND s.sale_date >= ph.valid_from
 AND (s.sale_date < ph.valid_to OR ph.valid_to IS NULL)
ORDER BY s.sale_date;`)}
${table('Result', ['sale_id', 'sale_date', 'price'], [[1, '2026-03-14', '6.00'], [2, '2026-06-01', '6.50'], [3, '2026-09-09', '6.50']])}
<p>Sale 2 is on the change-over day. Because the old price runs <em>up to but not including</em> 1 June and the new one starts <em>on</em> 1 June, it matches exactly one row.</p>
<div class="mistake"><b>Joining on product only, or BETWEEN</b>
<p>On product alone, every sale matches both prices and the row count doubles. With ${c('BETWEEN valid_from AND valid_to')}, sale 2 matches both rows because both ends include 1 June.</p></div>`,
  }),

  guide({
    slug: 'lapsed-customers', name: 'Lapsed customers', topic: 'Reporting',
    title: 'Find lapsed customers in SQL: no order in the last 90 days',
    short: 'Group per customer, then filter on MAX(order_date) with HAVING.',
    description: 'List customers who used to buy but have not ordered in 90 days in SQL Server, with days since their last order, using MAX and HAVING.',
    lede: 'A lapsed customer is one whose most recent order is older than your cut-off. The key is “most recent”: you filter on each customer’s latest order, not on any old order.',
    ask: { who: 'Hannah Okoro', role: 'Marketing Lead', text: 'Who hasn’t ordered for three months? We want to send a “we miss you” offer. Please include how long it has been.' },
    plain: 'Find each customer’s latest order date. If that date is more than 90 days ago, they have lapsed. Someone who ordered last week is not lapsed, even if they also ordered a year ago.',
    html: () => `
${table('Latest order per customer (today is 8 November 2026)', ['customer', 'last_order', 'days_since', 'lapsed?'], [['Amy', '2026-10-30', 9, 'No'], ['Ben', '2026-06-02', 159, 'Yes'], ['Cara', '2026-08-20', 80, 'No'], ['Dev', '2025-09-01', 433, 'Yes']])}
<h2>The query</h2>
${sql(`SELECT c.customer_id, c.first_name, c.email,
       MAX(o.order_date) AS last_order,
       DATEDIFF(day, MAX(o.order_date), CAST(GETDATE() AS date)) AS days_since
FROM Customers c
JOIN Orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.first_name, c.email
HAVING MAX(o.order_date) < DATEADD(day, -90, CAST(GETDATE() AS date))
ORDER BY days_since;`)}
<div class="mistake"><b>WHERE order_date &lt; 90 days ago</b>
<p>That keeps any customer with <em>an</em> old order, including Amy, who also ordered nine days ago. The test has to be on the latest order, which only exists after grouping, so it goes in HAVING.</p></div>
<p>Marketing may also want to leave out people who have unsubscribed or who only ever bought once. Ask before you add those filters, and say in the email which ones you used.</p>`,
  }),

  guide({
    slug: 'stock-reorder-report', name: 'Stock reorder report', topic: 'At work',
    title: 'Stock reorder report in SQL: what needs ordering today?',
    short: 'Stock plus what is already on order, against the reorder level.',
    description: 'Build a reorder list in SQL Server: products where stock plus open purchase orders falls below the reorder level, with ISNULL for nothing on order.',
    lede: 'Products need reordering when what you have plus what is already coming is below the reorder level. Leave out the “already coming” part and you order the same stock twice.',
    ask: { who: 'Tom Gallagher', role: 'Warehouse Lead', text: 'What do I need to order today? Don’t include stuff that’s already on a purchase order, I did those on Monday.' },
    plain: 'For each product, add the stock on the shelf to the stock already on order. If that is still under the reorder level, it goes on the list, with how many short it is.',
    html: () => `
${joinDemo({ title: 'Step through it: stock, and what is already on order',
    left: { name: 'Products', cols: ['product', 'stock', 'reorder_level'], rows: [['Kettle', 4, 10], ['Toaster', 3, 8], ['Mug', 40, 25], ['Hose', 0, 5]] },
    right: { name: 'open_po', cols: ['product', 'on_order'], rows: [['Toaster', 12]] },
    on: ['product', 'product'], type: 'left', pick: ['l.product', 'l.stock', 'r.on_order', 'l.reorder_level'],
    say: (l, n) => (n ? `${l[0]} already has stock on order.` : `${l[0]} has nothing on order: on_order comes back NULL.`) })}
<h2>The query</h2>
${sql(`WITH open_po AS (
  SELECT product_id, SUM(quantity) AS on_order
  FROM PurchaseOrderLines
  WHERE status = 'Open'
  GROUP BY product_id
)
SELECT p.product_name, p.stock,
       ISNULL(po.on_order, 0) AS on_order,
       p.reorder_level,
       p.reorder_level - (p.stock + ISNULL(po.on_order, 0)) AS shortfall
FROM Products p
LEFT JOIN open_po po ON po.product_id = p.product_id
WHERE p.discontinued = 0
  AND p.stock + ISNULL(po.on_order, 0) < p.reorder_level
ORDER BY shortfall DESC;`)}
${table('Result', ['product_name', 'stock', 'on_order', 'reorder_level', 'shortfall'], [['Kettle', 4, 0, 10, 6], ['Hose', 0, 0, 5, 5]])}
<div class="mistake"><b>stock + NULL is NULL</b>
<p>Without ISNULL, the hose (nothing on order) gives ${c('0 + NULL')}, which is NULL, and NULL &lt; 5 is not true. The product with no stock at all quietly drops off the list.</p></div>`,
  }),
];
