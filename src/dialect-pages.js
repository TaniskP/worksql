// Dialect → T-SQL landing pages. Client rewrites live in /js/hubs.js.
const d = (slug, name, from, title, short, description, lede, sample, maps, note) =>
  ({ slug, name, from, title, short, description, lede, sample, maps, note });

module.exports = [
  d('mysql-to-tsql', 'MySQL → T-SQL', 'MySQL',
    'MySQL to SQL Server translator',
    'LIMIT, IFNULL, NOW, GROUP_CONCAT → TOP, ISNULL, GETDATE, STRING_AGG.',
    'Convert MySQL SQL to SQL Server T-SQL. LIMIT, IFNULL, backticks, GROUP_CONCAT and DATE_ADD, in the browser.',
    'Client sent a MySQL dump. SQL Server wants TOP, ISNULL, and brackets. Paste the query; we rewrite the usual functions.',
    `SELECT id, IFNULL(email,''), NOW()
FROM \`orders\`
WHERE created >= DATE_ADD(CURDATE(), INTERVAL -7 DAY)
ORDER BY id DESC
LIMIT 20;`,
    [
      ['LIMIT n', 'TOP n or OFFSET FETCH'],
      ['IFNULL(a,b)', 'ISNULL(a, b)'],
      ['NOW() / CURDATE()', 'GETDATE() / CAST(GETDATE() AS date)'],
      ['DATE_ADD(d, INTERVAL n DAY)', 'DATEADD(day, n, d)'],
      ['GROUP_CONCAT(x)', 'STRING_AGG(x, \',\')'],
      ['IF(a,b,c)', 'IIF(a, b, c) or CASE'],
      ['backticks', '[brackets]'],
      ['AUTO_INCREMENT', 'IDENTITY(1,1)'],
    ],
    'LIMIT with a comma (LIMIT 10, 20) is OFFSET 10 FETCH NEXT 20. TOP cannot do that alone.'),
  d('postgresql-to-tsql', 'PostgreSQL → T-SQL', 'PostgreSQL',
    'PostgreSQL to SQL Server translator',
    'LIMIT, ILIKE, ::type, ||, FILTER, DATE_TRUNC → T-SQL.',
    'Convert PostgreSQL to SQL Server T-SQL. ILIKE, casts, string concat, LIMIT and DATE_TRUNC.',
    'Postgres people type ::int and ||. SQL Server types CAST and CONCAT.',
    `SELECT id, email::text, first_name || ' ' || last_name
FROM orders
WHERE email ILIKE '%harbour%'
ORDER BY created DESC
LIMIT 20 OFFSET 10;`,
    [
      ['LIMIT / OFFSET', 'OFFSET n ROWS FETCH NEXT m ROWS ONLY'],
      ['ILIKE', 'LIKE on a CI collation'],
      ['a::type', 'CAST(a AS type)'],
      ['a || b', 'CONCAT(a, b)'],
      ['DATE_TRUNC(\'month\', d)', 'DATEFROMPARTS(YEAR(d), MONTH(d), 1)'],
      ['FILTER (WHERE …)', 'SUM(CASE WHEN … THEN x END)'],
      ['BOOLEAN / TRUE', 'bit / 1'],
      ['SERIAL', 'INT IDENTITY(1,1)'],
      ['GENERATE_SERIES', 'recursive CTE or a tally'],
    ],
    'RETURNING is OUTPUT INSERTED. ILIKE on a CS column needs a CI collation, not LOWER(col).'),
  d('oracle-to-tsql', 'Oracle → T-SQL', 'Oracle',
    'Oracle to SQL Server translator',
    'NVL, DECODE, SYSDATE, ROWNUM, VARCHAR2, LISTAGG → T-SQL.',
    'Convert Oracle SQL to SQL Server. NVL, DECODE, FROM DUAL, ROWNUM and LISTAGG.',
    'Oracle writes NVL and FROM DUAL. SQL Server writes ISNULL and omits the dummy table.',
    `SELECT NVL(email,'none'), DECODE(status,'A','Active','X')
FROM orders
WHERE ROWNUM <= 10
  AND created >= SYSDATE - 7;`,
    [
      ['NVL(a,b)', 'ISNULL(a, b)'],
      ['NVL2(a,b,c)', 'CASE WHEN a IS NOT NULL THEN b ELSE c END'],
      ['DECODE', 'CASE'],
      ['SYSDATE', 'GETDATE()'],
      ['FROM DUAL', '(drop it)'],
      ['ROWNUM <= n', 'TOP n'],
      ['VARCHAR2 / NUMBER', 'nvarchar / decimal'],
      ['|| concat', 'CONCAT'],
      ['TO_DATE / TO_CHAR', 'CONVERT / FORMAT'],
      ['LISTAGG', 'STRING_AGG'],
      ['MINUS', 'EXCEPT'],
      ['CONNECT BY', 'recursive CTE'],
    ],
    'ROWNUM before ORDER BY is not TOP after ORDER BY. Wrap, or use ROW_NUMBER.'),
  d('snowflake-to-tsql', 'Snowflake → T-SQL', 'Snowflake',
    'Snowflake to SQL Server translator',
    'QUALIFY, VARIANT, ILIKE, LIMIT, LISTAGG → T-SQL windows and OPENJSON.',
    'Convert Snowflake SQL to SQL Server T-SQL. QUALIFY becomes a subquery, VARIANT becomes OPENJSON.',
    'Snowflake QUALIFY filters a window in one clause. SQL Server needs a derived table.',
    `SELECT customer_id, amount,
       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day DESC) rn
FROM orders
QUALIFY rn = 1
LIMIT 100;`,
    [
      ['QUALIFY', 'subquery + WHERE on the window column'],
      ['LIMIT', 'TOP / OFFSET FETCH'],
      ['ILIKE', 'LIKE (CI)'],
      ['IFF(a,b,c)', 'IIF(a, b, c)'],
      ['NVL / IFNULL', 'ISNULL'],
      ['LISTAGG', 'STRING_AGG'],
      ['TO_VARCHAR', 'CONVERT(varchar, …)'],
      ['VARIANT / PARSE_JSON', 'OPENJSON … WITH'],
      ['::type', 'CAST'],
    ],
    'QUALIFY rn = 1 is the “latest per customer” pattern. See /interview/latest-per-customer.'),
  d('sqlite-to-tsql', 'SQLite → T-SQL', 'SQLite',
    'SQLite to SQL Server translator',
    'LIMIT, IFNULL, ||, date(\'now\'), AUTOINCREMENT → T-SQL.',
    'Convert SQLite SQL to SQL Server. LIMIT, || concat, date(\'now\') and backticks.',
    'SQLite is loose. SQL Server wants types, TOP, and CONCAT.',
    `SELECT id, IFNULL(email,''), first || ' ' || last
FROM orders
WHERE day >= date('now','-7 day')
LIMIT 10;`,
    [
      ['LIMIT', 'TOP / OFFSET FETCH'],
      ['IFNULL', 'ISNULL'],
      ['||', 'CONCAT'],
      ['date(\'now\')', 'CAST(GETDATE() AS date)'],
      ['date(d, \'+7 day\')', 'DATEADD(day, 7, d)'],
      ['AUTOINCREMENT', 'IDENTITY'],
      ['INTEGER PRIMARY KEY', 'int IDENTITY PRIMARY KEY'],
    ],
    'SQLite affinity is not a type. Pick int, decimal, nvarchar when you land on SQL Server.'),
  d('bigquery-to-tsql', 'BigQuery → T-SQL', 'BigQuery',
    'BigQuery to SQL Server translator',
    'LIMIT, IFNULL, ||, SAFE_CAST, QUALIFY, backticks → T-SQL.',
    'Convert BigQuery Standard SQL to SQL Server. SAFE_CAST, QUALIFY, STRUCT and backticks.',
    'BigQuery project.dataset.table becomes [schema].[table]. SAFE_CAST is TRY_CAST.',
    `SELECT id, IFNULL(email,''), SAFE_CAST(x AS INT64)
FROM \`proj.dataset.orders\`
WHERE day >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day DESC) = 1
LIMIT 50;`,
    [
      ['LIMIT', 'TOP / OFFSET FETCH'],
      ['SAFE_CAST / SAFE_CONVERT', 'TRY_CAST / TRY_CONVERT'],
      ['IFNULL / COALESCE', 'ISNULL / COALESCE'],
      ['CURRENT_DATE()', 'CAST(GETDATE() AS date)'],
      ['DATE_SUB / DATE_ADD', 'DATEADD'],
      ['QUALIFY', 'subquery'],
      ['INT64 / FLOAT64 / STRING', 'bigint / float / nvarchar'],
      ['backticks', '[brackets]'],
      ['|| / CONCAT', 'CONCAT'],
    ],
    'ARRAY and STRUCT become a child table or OPENJSON. Do not flatten those with REPLACE.'),
  d('tsql-to-mysql', 'T-SQL → MySQL', 'SQL Server',
    'SQL Server to MySQL translator',
    'TOP, ISNULL, GETDATE, STRING_AGG → LIMIT, IFNULL, NOW, GROUP_CONCAT.',
    'Convert T-SQL to MySQL. TOP becomes LIMIT, brackets become backticks.',
    'The other direction. Useful when the analyst lives in SSMS and the client lives on RDS MySQL.',
    `SELECT TOP 20 customer_id, ISNULL(email,''), GETDATE()
FROM [Orders]
WHERE order_date >= DATEADD(day, -7, CAST(GETDATE() AS date))
ORDER BY order_id DESC;`,
    [
      ['TOP n', 'LIMIT n'],
      ['OFFSET FETCH', 'LIMIT offset, count'],
      ['ISNULL', 'IFNULL'],
      ['GETDATE()', 'NOW()'],
      ['DATEADD(day, n, d)', 'DATE_ADD(d, INTERVAL n DAY)'],
      ['STRING_AGG', 'GROUP_CONCAT'],
      ['IIF', 'IF'],
      ['[brackets]', 'backticks'],
      ['IDENTITY', 'AUTO_INCREMENT'],
    ],
    'nvarchar becomes varchar with a utf8mb4 charset. bit becomes tinyint(1).'),
  d('tsql-to-postgresql', 'T-SQL → PostgreSQL', 'SQL Server',
    'SQL Server to PostgreSQL translator',
    'TOP, ISNULL, GETDATE, + concat → LIMIT, COALESCE, now(), ||.',
    'Convert T-SQL to PostgreSQL. TOP, ISNULL and CONVERT styles.',
    'Postgres wants LIMIT and ||. CONVERT(style) has no twin — use to_char.',
    `SELECT TOP 10 customer_id, ISNULL(email,''), GETDATE()
FROM Orders
WHERE order_date >= DATEADD(month, -1, GETDATE());`,
    [
      ['TOP n', 'LIMIT n'],
      ['ISNULL', 'COALESCE'],
      ['GETDATE()', 'now()'],
      ['DATEADD(unit, n, d)', 'd + interval'],
      ['CONCAT / +', '|| or CONCAT'],
      ['CONVERT(varchar, d, 23)', 'to_char(d, \'YYYY-MM-DD\')'],
      ['STRING_AGG', 'string_agg'],
      ['[brackets]', '"quotes" or lowercase'],
      ['IDENTITY', 'GENERATED … AS IDENTITY'],
    ],
    'BIT is boolean. nvarchar is text. OFFSET FETCH already looks like Postgres.'),
];
