// One crawlable page per Pandas call → T-SQL.
const p = (slug, name, title, short, description, lede, sample, tsql, note) =>
  ({ slug, name, title, short, description, lede, sample, tsql, note });

module.exports = [
  p('merge', 'merge', 'Pandas merge to SQL Server JOIN',
    'how="left" is LEFT JOIN. on= is the ON clause.',
    'Convert pandas merge to T-SQL JOIN. left/right/inner/outer map to the join type.',
    'merge is a join. The how= argument is the only word that changes.',
    `orders.merge(customers, how="left", on="customer_id")`,
    `SELECT o.*, c.first_name, c.last_name
FROM Orders o
LEFT JOIN Customers c ON c.customer_id = o.customer_id;`,
    'suffixes=_x/_y are table aliases plus explicit column lists. SELECT * after a merge is how you get two customer_id columns.'),
  p('join', 'join', 'Pandas DataFrame.join to SQL JOIN',
    'join aligns on the index. In SQL the index is just another key.',
    'Translate df.join to SQL Server JOIN. Reset the index in your head: that column is the ON.',
    'Pandas join is merge on the index. SQL has no index in that sense. Name the key.',
    `orders.join(customers.set_index("customer_id"), on="customer_id")`,
    `SELECT o.*, c.email
FROM Orders o
LEFT JOIN Customers c ON c.customer_id = o.customer_id;`,
    'how="inner" (the default for join is left, for merge is inner). Read the call.'),
  p('concat', 'concat', 'Pandas concat to UNION ALL',
    'Stacking frames is UNION ALL. Aligning columns by name is the SELECT list.',
    'Convert pandas concat to SQL Server UNION ALL. axis=0 stacks rows; axis=1 is a JOIN.',
    'concat([a,b]) is UNION ALL. Missing columns become NULL. Names must match or you list them.',
    `pd.concat([uk, ie], ignore_index=True)`,
    `SELECT customer_id, email, 'UK' AS region FROM CustomersUk
UNION ALL
SELECT customer_id, email, 'IE' FROM CustomersIe;`,
    'UNION without ALL drops duplicates. Pandas concat does not. Most days you want ALL.'),
  p('groupby', 'groupby', 'Pandas groupby to SQL GROUP BY',
    'groupby("col").agg(...) is GROUP BY col plus aggregates.',
    'Translate pandas groupby to SQL Server GROUP BY. Named agg becomes aliases.',
    'Every column you keep that is not aggregated goes in the GROUP BY. SQL Server will shout if you forget.',
    `orders.groupby("customer_id").agg(sales=("total_amount","sum"), n=("order_id","count"))`,
    `SELECT customer_id,
       SUM(total_amount) AS sales,
       COUNT(order_id) AS n
FROM Orders
GROUP BY customer_id;`,
    'as_index=False is just “customer_id stays a column,” which it already is in SQL.'),
  p('agg', 'agg', 'Pandas agg to SQL aggregates',
    'agg(["sum","mean"]) is SUM and AVG in the same SELECT.',
    'Convert pandas agg to T-SQL SUM, AVG, COUNT, MIN, MAX.',
    'Several stats on one column are several functions, not a second pass.',
    `orders["total_amount"].agg(["sum", "mean", "count"])`,
    `SELECT SUM(total_amount) AS sum_amount,
       AVG(total_amount) AS mean_amount,
       COUNT(total_amount) AS count_amount
FROM Orders;`,
    'count in pandas skips NA. COUNT(col) does the same. COUNT(*) counts the row.'),
  p('pivot', 'pivot', 'Pandas pivot to SQL PIVOT',
    'index / columns / values is the PIVOT shape.',
    'Translate pandas pivot to SQL Server PIVOT. You must name the output columns.',
    'Pandas will invent columns from the data. T-SQL PIVOT wants the list in the IN (...).',
    `orders.pivot(index="customer_id", columns="status", values="total_amount")`,
    `SELECT customer_id, [Shipped], [Cancelled], [Processing]
FROM (
  SELECT customer_id, status, total_amount FROM Orders
) s
PIVOT (SUM(total_amount) FOR status IN ([Shipped], [Cancelled], [Processing])) p;`,
    'Unknown statuses: dynamic PIVOT, or see /tools/pivot.'),
  p('pivot-table', 'pivot_table', 'Pandas pivot_table to GROUP BY / PIVOT',
    'pivot_table is GROUP BY plus an optional PIVOT. aggfunc=sum is SUM.',
    'Convert pandas pivot_table to T-SQL. Margins=True is GROUPING SETS or a UNION of totals.',
    'Most pivot_tables at work are a GROUP BY that someone formatted wide. Start narrow, then PIVOT.',
    `orders.pivot_table(index="customer_id", columns="status", values="total_amount", aggfunc="sum", fill_value=0)`,
    `SELECT customer_id,
       SUM(CASE WHEN status = 'Shipped' THEN total_amount ELSE 0 END) AS Shipped,
       SUM(CASE WHEN status = 'Cancelled' THEN total_amount ELSE 0 END) AS Cancelled
FROM Orders
GROUP BY customer_id;`,
    'fill_value=0 is ELSE 0. ISNULL after a PIVOT also works.'),
  p('fillna', 'fillna', 'Pandas fillna to ISNULL / COALESCE',
    'fillna(0) is ISNULL(col, 0). fillna(method="ffill") is harder.',
    'Translate pandas fillna to SQL Server ISNULL or COALESCE. Forward-fill needs LAG and a window.',
    'A constant fill is ISNULL. Filling from another column is COALESCE(a, b).',
    `orders["phone"].fillna("")
orders["region"].fillna(orders["country"])`,
    `ISNULL(phone, '')
COALESCE(region, country)`,
    'ffill is LAST_VALUE with IGNORE NULLS on 2022+, or a messy self-join on older boxes.'),
  p('dropna', 'dropna', 'Pandas dropna to WHERE IS NOT NULL',
    'dropna() is WHERE col IS NOT NULL. how="any" is several ANDs.',
    'Convert pandas dropna to T-SQL filters. subset=["email"] is WHERE email IS NOT NULL.',
    'Dropping blank strings is a second test. SQL NULL and \'\' are not the same.',
    `customers.dropna(subset=["email"])`,
    `SELECT * FROM Customers
WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> '';`,
    'how="all" is WHERE NOT (a IS NULL AND b IS NULL).'),
  p('drop-duplicates', 'drop_duplicates', 'Pandas drop_duplicates to DISTINCT / ROW_NUMBER',
    'keep="first" is ROW_NUMBER = 1. A unique list is DISTINCT.',
    'Translate pandas drop_duplicates to SQL Server. DISTINCT for a unique list; ROW_NUMBER to keep one full row.',
    'DISTINCT collapses to the columns you list. If you need the rest of the row, number it.',
    `customers.drop_duplicates(subset=["email"], keep="first")`,
    `SELECT *
FROM (
  SELECT c.*, ROW_NUMBER() OVER (PARTITION BY email ORDER BY customer_id) AS rn
  FROM Customers c
) x
WHERE rn = 1;`,
    'keep=False (drop every duplicate) is a HAVING COUNT(*) = 1 join.'),
  p('loc', 'loc', 'Pandas loc to SQL WHERE',
    'loc[mask, cols] is SELECT cols WHERE mask.',
    'Convert pandas loc filters to T-SQL WHERE. Boolean masks become AND/OR.',
    'loc is not a join. It is a filter and a column list.',
    `orders.loc[orders["total_amount"] > 100, ["order_id", "email"]]`,
    `SELECT order_id, email
FROM Orders
WHERE total_amount > 100;`,
    'loc[:, "a":"f"] is a column range in the sheet. In SQL you name the columns.'),
  p('iloc', 'iloc', 'Pandas iloc to TOP / OFFSET FETCH',
    'iloc[:10] is TOP 10. iloc[10:20] is OFFSET 10 FETCH NEXT 10.',
    'Translate pandas iloc row slices to SQL Server TOP and OFFSET FETCH. Order must be explicit.',
    'iloc is positional. SQL has no stable position without ORDER BY. Write the order.',
    `orders.iloc[:10]
orders.iloc[10:20]`,
    `SELECT TOP 10 * FROM Orders ORDER BY order_id;
SELECT * FROM Orders ORDER BY order_id
OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY;`,
    'iloc[:, 0:3] is the first three columns — name them. Do not rely on ordinals.'),
  p('query', 'query', 'Pandas query to SQL WHERE',
    'query("a > 1 and b == \'x\'") is WHERE a > 1 AND b = \'x\'.',
    'Convert pandas query strings to T-SQL WHERE clauses.',
    'query is a WHERE you typed as a string. SQL is that string, with = not ==.',
    `orders.query("status == 'Shipped' and total_amount > 50")`,
    `SELECT * FROM Orders
WHERE status = 'Shipped' AND total_amount > 50;`,
    'in ["A","B"] is IN (\'A\', \'B\'). not in is NOT IN, watching NULLs.'),
  p('sort-values', 'sort_values', 'Pandas sort_values to ORDER BY',
    'ascending=False is DESC. Two columns are two ORDER BY keys.',
    'Translate pandas sort_values to SQL Server ORDER BY.',
    'na_position is NULLS — SQL Server sorts NULL first on ASC. Call it out if the sheet did not.',
    `orders.sort_values(["status", "total_amount"], ascending=[True, False])`,
    `SELECT * FROM Orders
ORDER BY status ASC, total_amount DESC;`,
    'sort_values does not change the table. ORDER BY does not either, unless you SELECT INTO.'),
  p('rename', 'rename', 'Pandas rename to column aliases',
    'rename(columns={"a":"b"}) is SELECT a AS b.',
    'Convert pandas rename to T-SQL aliases. A lasting rename is sp_rename, which is a migration.',
    'Most renames in a notebook are aliases. Do not rename the table column for a report heading.',
    `orders.rename(columns={"total_amount": "sales"})`,
    `SELECT order_id, total_amount AS sales FROM Orders;`,
    'A real rename: EXEC sp_rename \'Orders.total_amount\', \'sales\', \'COLUMN\'; — not for a Thursday report.'),
  p('astype', 'astype', 'Pandas astype to CAST / TRY_CONVERT',
    'astype("int64") is CAST or TRY_CONVERT. Dirty text needs TRY.',
    'Translate pandas astype to SQL Server CAST, CONVERT, TRY_CONVERT.',
    'astype fails the series on junk. TRY_CONVERT fails the cell. Prefer TRY on client files.',
    `orders["customer_id"].astype("int64")`,
    `TRY_CONVERT(int, customer_id)`,
    'datetime64 is TRY_CONVERT(datetime2, col). date is CAST(... AS date) after it parsed.'),
  p('apply', 'apply', 'Pandas apply to CASE / a scalar function',
    'apply(lambda r: ...) is usually a CASE. Rarely a function.',
    'Convert pandas apply lambdas to T-SQL CASE WHEN. Row-wise apply is a scan dressed as Python.',
    'If the lambda is if/else, it is CASE. If it calls a library, do it in the app after the SELECT.',
    `orders["tier"] = orders["total_amount"].apply(lambda x: "A" if x > 10000 else "B")`,
    `CASE WHEN total_amount > 10000 THEN 'A' ELSE 'B' END AS tier`,
    'apply axis=1 over a million rows is why the notebook timed out. SQL CASE will not.'),
  p('value-counts', 'value_counts', 'Pandas value_counts to GROUP BY COUNT',
    'value_counts() is GROUP BY col, COUNT(*), ORDER BY n DESC.',
    'Translate pandas value_counts to SQL Server. dropna=False is a GROUP BY that keeps NULL.',
    'The frequency table is the first report people ask for.',
    `orders["status"].value_counts()`,
    `SELECT status, COUNT(*) AS n
FROM Orders
GROUP BY status
ORDER BY n DESC;`,
    'normalize=True is COUNT(*) * 1.0 / SUM(COUNT(*)) OVER ().'),
  p('nunique', 'nunique', 'Pandas nunique to COUNT DISTINCT',
    'nunique() is COUNT(DISTINCT col).',
    'Convert pandas nunique to SQL Server COUNT(DISTINCT). Grouped nunique is the same, with GROUP BY.',
    'How many different customers ordered? COUNT(DISTINCT customer_id).',
    `orders["customer_id"].nunique()
orders.groupby("status")["customer_id"].nunique()`,
    `SELECT COUNT(DISTINCT customer_id) FROM Orders;
SELECT status, COUNT(DISTINCT customer_id) AS customers
FROM Orders
GROUP BY status;`,
    'COUNT(DISTINCT) ignores NULL. pandas nunique drops NA by default too.'),
  p('head', 'head', 'Pandas head to TOP',
    'head(n) is SELECT TOP n. You still need ORDER BY.',
    'Translate pandas head to SQL Server TOP. Without ORDER BY the n rows are not “the first.”',
    'head(5) in a notebook is whatever order the frame happened to have. SQL will invent one if you do not.',
    `orders.head(5)`,
    `SELECT TOP 5 * FROM Orders ORDER BY order_date DESC;`,
    'head after a sort is TOP after ORDER BY. Write both.'),
  p('tail', 'tail', 'Pandas tail to TOP of a reversed order',
    'tail(n) is TOP n with the opposite ORDER BY, or OFFSET to the end.',
    'Convert pandas tail to T-SQL. Flip the sort, or count and OFFSET.',
    'The last 5 orders by date is TOP 5 ORDER BY order_date DESC — then sort again if you need them ascending.',
    `orders.sort_values("order_date").tail(5)`,
    `SELECT TOP 5 * FROM Orders ORDER BY order_date DESC;`,
    'OFFSET (COUNT(*)-5) needs a second query or a window. TOP of a DESC is enough for a peek.'),
  p('reset-index', 'reset_index', 'Pandas reset_index — usually nothing in SQL',
    'reset_index() turns an index into a column. SQL columns already are.',
    'What pandas reset_index means in T-SQL: aliases, or you already selected the key.',
    'The index is a pandas habit. GROUP BY keys are already columns. You do not reset them.',
    `g.reset_index()`,
    `SELECT customer_id, SUM(total_amount) AS sales
FROM Orders
GROUP BY customer_id;`,
    'A row number column is ROW_NUMBER() OVER (ORDER BY ...), not an index.'),
  p('assign', 'assign', 'Pandas assign to SELECT list expressions',
    'assign(x=...) is a computed column in the SELECT.',
    'Translate pandas assign to T-SQL expressions and aliases.',
    'New columns are expressions. They do not persist unless you ALTER TABLE or SELECT INTO.',
    `orders.assign(gbp=orders.total_amount * 1.0, ym=orders.order_date.dt.to_period("M"))`,
    `SELECT order_id,
       total_amount * 1.0 AS gbp,
       CONVERT(char(7), order_date, 120) AS ym
FROM Orders;`,
    'Chained assign is more columns, still one SELECT.'),
  p('where', 'where', 'Pandas where to CASE',
    'where(cond, other) keeps the value when cond, else other. That is CASE.',
    'Convert pandas where / mask to SQL Server CASE WHEN.',
    'where keeps the original when the test is true. mask is the opposite.',
    `orders["total_amount"].where(orders["status"] == "Shipped", 0)`,
    `CASE WHEN status = 'Shipped' THEN total_amount ELSE 0 END`,
    'mask(cond, 0) is CASE WHEN cond THEN 0 ELSE total_amount END.'),
  p('replace', 'replace', 'Pandas replace to REPLACE / CASE / UPDATE',
    'replace("a","b") on a string is REPLACE(). A dict of values is CASE.',
    'Translate pandas replace to T-SQL REPLACE, CASE, or an UPDATE.',
    'A dict {\'Shipped\':\'S\'} is CASE. A substring is REPLACE. A table of mappings is a JOIN.',
    `orders["status"].replace({"Shipped": "S", "Cancelled": "X"})`,
    `CASE status
  WHEN 'Shipped' THEN 'S'
  WHEN 'Cancelled' THEN 'X'
  ELSE status
END`,
    'regex=True is PATINDEX / REPLACE loops. Usually you wanted LIKE in a WHERE, not a mutate.'),
  p('str-contains', 'str.contains', 'Pandas str.contains to LIKE / PATINDEX',
    'str.contains("x") is LIKE \'%x%\'. regex=True is PATINDEX or a real CLR — prefer LIKE.',
    'Convert pandas str.contains to SQL Server LIKE. Leading % will not seek.',
    'Contains is the expensive LIKE. Starts-with is the cheap one.',
    `customers[customers["email"].str.contains("harbour", case=False, na=False)]`,
    `SELECT * FROM Customers
WHERE email LIKE '%harbour%';`,
    'na=False is AND email IS NOT NULL. case=False needs a CI collation or LOWER — LOWER is not SARGable.'),
  p('dt-to-period', 'dt.to_period', 'Pandas to_period to CONVERT / DATEPART',
    'to_period("M") is CONVERT(char(7), d, 120). to_period("Q") is year plus quarter.',
    'Translate pandas dt.to_period to SQL Server month and quarter buckets.',
    'A period is a grain. Write the grain as an expression and GROUP BY it.',
    `orders["order_date"].dt.to_period("M")`,
    `CONVERT(char(7), order_date, 120) AS ym
-- quarter
CONCAT(DATEPART(year, order_date), '-Q', DATEPART(quarter, order_date))`,
    'Fiscal quarters: /tools/fiscal-year.'),
  p('to-sql', 'to_sql', 'Pandas to_sql to INSERT / staging table',
    'to_sql writes rows. In SQL Server that is a staging table plus INSERT or BULK INSERT.',
    'What pandas to_sql becomes on SQL Server: a proper load, not a row-by-row insert from Python if you can help it.',
    'if_exists="replace" drops the table. Do not point that at something named Customers.',
    `df.to_sql("OrdersStage", engine, if_exists="append", index=False)`,
    `INSERT INTO OrdersStage (order_id, customer_id, total_amount)
SELECT order_id, customer_id, total_amount FROM #incoming;`,
    'A million rows: bcp, BULK INSERT, or SqlBulkCopy. to_sql method="multi" is still the app talking too much.'),
];
