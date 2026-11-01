// Extra in-browser T-SQL tools (architecture, aggregation, cleaning, speed, security, QoL).
const t = (slug, name, title, short, description, lede, about, widget, group) =>
  ({ slug, name, title, short, description, lede, about, widget, group });

const copy = (id) => `<button class="btn btn-ghost" type="button" data-copy="${id}">Copy</button>`;

module.exports = [
  t('schema-diagram', 'Schema → diagram',
    'CREATE TABLE to ER diagram (Mermaid)',
    'Paste CREATE TABLE. Get a live table diagram and Mermaid you can export.',
    'Free SQL Server schema to ER diagram tool. Paste CREATE TABLE T-SQL, see tables and keys, copy Mermaid.js.',
    'Paste the CREATE TABLE script. We draw the tables in the browser and give you Mermaid you can drop into docs.',
    `<p>No server, no database connection. A light parse of CREATE TABLE and REFERENCES. Odd scripts may miss a column; check the list.</p>`,
    `<div class="tool" data-tool="schema">
      <label>CREATE TABLE script</label>
      <textarea id="sch-in" rows="10" spellcheck="false">CREATE TABLE Customers (
  customer_id int PRIMARY KEY,
  email nvarchar(200) NOT NULL
);
CREATE TABLE Orders (
  order_id int PRIMARY KEY,
  customer_id int REFERENCES Customers(customer_id),
  total_amount decimal(12,2)
);</textarea>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="sch-run">Draw</button> ${copy('sch-out')}</div>
      <div id="sch-vis" class="er-vis"></div>
      <label>Mermaid</label>
      <textarea id="sch-out" rows="8" readonly spellcheck="false"></textarea>
    </div>`, 'Architecture'),

  t('data-type', 'Data type picker',
    'SQL Server data type selector',
    'Answer a few questions. Get INT, DECIMAL, NVARCHAR or the rest.',
    'Interactive SQL Server data type decision tool. Decimals, string length, Unicode — outputs INT, BIGINT, DECIMAL, VARCHAR, NVARCHAR.',
    'The wrong type truncates or wastes pages. Answer the questions; we name the type SQL Server should use.',
    `<p>Related: <a href="/tsql/varchar-vs-nvarchar">varchar vs nvarchar</a>, <a href="/tsql/int-decimal-money">int vs decimal</a>.</p>`,
    `<div class="tool" data-tool="dtype">
      <label>What are you storing?
        <select id="dtp-kind"><option value="number">A number</option><option value="text">Text</option><option value="when">A date or time</option><option value="flag">Yes / no</option><option value="id">An identifier</option></select></label>
      <div id="dtp-extra"></div>
      <pre class="tool-out"><code id="dtp-out"></code></pre>
    </div>`, 'Architecture'),

  t('schema-diff', 'Schema diff → ALTER',
    'SQL Server schema diff and ALTER TABLE generator',
    'Paste two CREATE TABLE scripts. See added, dropped, changed columns and the ALTER.',
    'Free T-SQL schema comparator. Diff two table definitions and generate ALTER TABLE ADD / ALTER / DROP COLUMN.',
    'Two versions of a table. We highlight what changed and write the ALTER TABLE to move A toward B. Read it before you run it on anything real.',
    `<p>WorkSQL does not run DDL. This is a draft. Backup first. Dropping a column loses data.</p>`,
    `<div class="tool" data-tool="diff">
      <div class="tool-row">
        <label>Current table<textarea id="df-a" rows="8" spellcheck="false">CREATE TABLE Customers (customer_id int, email nvarchar(100), phone nvarchar(20));</textarea></label>
        <label>New table<textarea id="df-b" rows="8" spellcheck="false">CREATE TABLE Customers (customer_id int, email nvarchar(200), created_at date);</textarea></label>
      </div>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="df-run">Compare</button> ${copy('df-out')}</div>
      <pre class="tool-out"><code id="df-out"></code></pre>
    </div>`, 'Architecture'),

  t('key-evaluator', 'Key evaluator',
    'Primary key vs composite key vs UUID',
    'Describe the columns. Get a recommendation: identity, composite, or uniqueidentifier.',
    'Interactive SQL Server key design checklist. Identity int, composite key, or UUID — with the reason.',
    'A key is how you join. The wrong one makes every query wider or every insert slower.',
    `<p>Related: <a href="/tsql/uniqueidentifier">uniqueidentifier</a>, <a href="/tsql/foreign-key">foreign keys</a>.</p>`,
    `<div class="tool" data-tool="keyev">
      <label><input type="checkbox" id="ky-natural"> We already have a stable business code (invoice number, ISO country)</label>
      <label><input type="checkbox" id="ky-multi"> Uniqueness needs two or more columns together</label>
      <label><input type="checkbox" id="ky-merge"> Rows are created on more than one machine / we merge databases</label>
      <label><input type="checkbox" id="ky-wide"> Those business columns are long or change when the business does</label>
      <pre class="tool-out"><code id="ky-out"></code></pre>
    </div>`, 'Architecture'),

  t('naming', 'Name sanitizer',
    'SQL Server naming convention enforcer',
    'Messy labels in. PascalCase, snake_case or [Bracketed] out.',
    'Rename messy table and column names to PascalCase, snake_case or SQL Server [bracket] style.',
    'Spaces, symbols and reserved words break scripts. This sanitizes a name into a style your team can agree on.',
    `<p>Pick one style and keep it. Mixing Pascal and snake in one database is how reviews stall.</p>`,
    `<div class="tool" data-tool="naming">
      <label>Messy name <input id="nm-in" value="Customer Email Address!"></label>
      <label>Style <select id="nm-style"><option value="snake">snake_case</option><option value="pascal">PascalCase</option><option value="camel">camelCase</option><option value="bracket">[SQL Server]</option></select></label>
      <pre class="tool-out"><code id="nm-out"></code></pre>
    </div>`, 'Architecture'),

  t('case-builder', 'CASE WHEN builder',
    'SQL CASE WHEN conditional builder',
    'Type if/then rules. Copy a nested CASE block.',
    'Interactive T-SQL CASE WHEN builder. Define rules like sales > 10000 then Tier 1 and copy the CASE.',
    'CASE is if-then-else for a column. Build the bands here so the edges stay visible.',
    `<p>Related: <a href="/tsql/case-when">CASE WHEN</a>.</p>`,
    `<div class="tool" data-tool="caseb">
      <label>Column or expression <input id="cs-col" value="total_amount"></label>
      <label>Alias <input id="cs-as" value="tier"></label>
      <div id="cs-rows"></div>
      <div class="tool-actions"><button class="btn btn-ghost" type="button" id="cs-add">Add rule</button> ${copy('cs-out')}</div>
      <label>ELSE <input id="cs-else" value="Other"></label>
      <pre class="tool-out"><code id="cs-out"></code></pre>
    </div>`, 'Aggregation'),

  t('cohort', 'Cohort buckets',
    'Cohort analysis date bucket generator',
    'Column + weekly / monthly / quarter. Copy the DATEPART grain.',
    'Generate SQL Server DATEPART / DATENAME cohort buckets: weekly, monthly or fiscal quarters from a date column.',
    'Cohorts are “who signed up in the same bucket.” The grain is the hard part. Pick it; we write the expression.',
    `<p>Related: <a href="/tsql/group-by-month">group by month</a>, <a href="/tools/fiscal-year">fiscal year</a>.</p>`,
    `<div class="tool" data-tool="cohort">
      <label>Date column <input id="ch-col" value="signup_date"></label>
      <label>Bucket <select id="ch-freq"><option value="week">Weekly</option><option value="month" selected>Monthly</option><option value="quarter">Calendar quarter</option><option value="year">Year</option></select></label>
      <pre class="tool-out"><code id="ch-out"></code></pre>
    </div>`, 'Aggregation'),

  t('fiscal-year', 'Fiscal year',
    'Fiscal year and quarter T-SQL builder',
    'Year starts in October? Pick the month. Get FY and FQ.',
    'SQL Server fiscal year query builder. Choose the start month and copy fiscal year and fiscal quarter expressions.',
    'The calendar year is not always the year finance uses. Pick the first month of their year.',
    `<p>October start means 31 Oct 2026 is still FY2026 if you treat October as month 1 — check with finance which year-label they print on the 1st of that month.</p>`,
    `<div class="tool" data-tool="fiscal">
      <label>Date column <input id="fy-col" value="order_date"></label>
      <label>Fiscal year starts <select id="fy-m">${['January','February','March','April','May','June','July','August','September','October','November','December'].map((n, i) => `<option value="${i + 1}"${i === 9 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <pre class="tool-out"><code id="fy-out"></code></pre>
    </div>`, 'Aggregation'),

  t('concat-wizard', 'Concat wizard',
    'SQL string concatenation wizard',
    'SQL Server CONCAT / +, or || for others. NULL-safe.',
    'Generate null-safe string concatenation for SQL Server (CONCAT / +) and other engines (||).',
    'Plus dies when a part is NULL. CONCAT does not. Pick the engine and the columns.',
    `<p>Related: <a href="/tsql/concat">CONCAT</a>.</p>`,
    `<div class="tool" data-tool="concat">
      <label>Engine <select id="cc-eng"><option value="tsql">SQL Server (CONCAT)</option><option value="plus">SQL Server (+)</option><option value="pipe">PostgreSQL / SQLite (||)</option></select></label>
      <label>Columns, one per line<textarea id="cc-cols" rows="4">first_name
last_name
email</textarea></label>
      <label>Separator <input id="cc-sep" value=" "></label>
      <pre class="tool-out"><code id="cc-out"></code></pre>
    </div>`, 'Aggregation'),

  t('pivot', 'PIVOT blueprint',
    'Dynamic PIVOT table T-SQL blueprint',
    'Row header, pivot column, value. A template you can finish.',
    'SQL Server PIVOT and dynamic PIVOT template generator. Type the source, pivot column and aggregate.',
    'PIVOT is easy to forget. This writes the static version and a dynamic skeleton that reads distinct values.',
    `<p>Dynamic SQL is powerful and easy to get wrong. Parameterise. Do not concatenate user text into the IN list without quoting.</p>`,
    `<div class="tool" data-tool="pivot">
      <label>Source (table or CTE) <input id="pv-src" value="Orders"></label>
      <label>Row (stays a column) <input id="pv-row" value="customer_id"></label>
      <label>Pivot column <input id="pv-col" value="status"></label>
      <label>Value to SUM <input id="pv-val" value="total_amount"></label>
      <label>Known values, comma separated <input id="pv-vals" value="Shipped, Cancelled, Processing"></label>
      <pre class="tool-out"><code id="pv-out"></code></pre>
    </div>`, 'Aggregation'),

  t('csv-insert', 'CSV → INSERT',
    'CSV to SQL INSERT converter',
    'Paste a sheet. Get INSERT INTO … VALUES rows.',
    'Convert CSV or Excel paste to SQL Server INSERT INTO statements in the browser. No upload.',
    'First row is headers. The rest become VALUES. Quotes in a cell are doubled.',
    `<p>Related: <a href="/tools/mock-data">mock INSERT builder</a>.</p>`,
    `<div class="tool" data-tool="csv">
      <label>Table <input id="cv-table" value="Customers"></label>
      <label>CSV (header row first)</label>
      <textarea id="cv-in" rows="8" spellcheck="false">first_name,last_name,email
Amy,Nair,amy@harbour.example
Tom,Gallagher,tom@harbour.example</textarea>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="cv-run">Convert</button> ${copy('cv-out')}</div>
      <pre class="tool-out"><code id="cv-out"></code></pre>
    </div>`, 'Cleaning'),

  t('json-openjson', 'JSON → OPENJSON',
    'JSON to SQL Server OPENJSON flattener',
    'Paste a JSON object. Get OPENJSON … WITH types.',
    'Turn a JSON object into a SQL Server OPENJSON query with a typed WITH clause.',
    'APIs arrive as JSON. OPENJSON with WITH is how SQL Server turns that into columns. We guess types from the sample.',
    `<p>Arrays of objects need CROSS APPLY OPENJSON. Nested objects are flattened with a path. Check the types before you ship.</p>`,
    `<div class="tool" data-tool="json">
      <label>JSON sample</label>
      <textarea id="jn-in" rows="8" spellcheck="false">{
  "order_id": 15,
  "email": "amy@harbour.example",
  "total": 90.5,
  "shipped": true
}</textarea>
      <label>JSON column / variable <input id="jn-src" value="@json"></label>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="jn-run">Build</button> ${copy('jn-out')}</div>
      <pre class="tool-out"><code id="jn-out"></code></pre>
    </div>`, 'Cleaning'),

  t('null-empty', 'NULL vs blank filter',
    'NULL vs empty string query builder',
    'Pick how “missing” was stored. Copy the WHERE.',
    'Build SQL Server filters for IS NULL, empty string, and LEN() > 0 depending on how the data was captured.',
    'Missing is sometimes NULL, sometimes \'\', sometimes both. The filter has to match how it was typed in.',
    `<p>Related: <a href="/tsql/null-vs-blank">NULL vs blank</a>.</p>`,
    `<div class="tool" data-tool="nulle">
      <label>Column <input id="ne-col" value="phone"></label>
      <label>Keep rows that are
        <select id="ne-mode">
          <option value="missing">Missing (NULL or blank)</option>
          <option value="present">Present (has text)</option>
          <option value="nullonly">NULL only</option>
          <option value="blankonly">Blank only</option>
        </select></label>
      <pre class="tool-out"><code id="ne-out"></code></pre>
    </div>`, 'Cleaning'),

  t('dupes', 'Duplicate finder',
    'Duplicate row finder (GROUP BY HAVING)',
    'Table + unique columns. Copy the hunt query.',
    'Generate a SQL Server GROUP BY HAVING COUNT(*) > 1 query to find duplicate emails or keys.',
    'Tell us what should be unique. We write the GROUP BY that finds collisions, then the rows.',
    `<p>Related: <a href="/guides/find-duplicate-customers">find duplicate customers</a>.</p>`,
    `<div class="tool" data-tool="dupes">
      <label>Table <input id="du-table" value="Customers"></label>
      <label>Columns that should be unique <input id="du-cols" value="email"></label>
      <pre class="tool-out"><code id="du-out"></code></pre>
    </div>`, 'Cleaning'),

  t('convert-styles', 'CONVERT styles',
    'SQL Server CONVERT date style picker',
    'Click 103, 120, 23. Copy CONVERT(varchar, GETDATE(), n).',
    'Interactive SQL Server CONVERT style codes: 103 British date, 120 ODBC, 23 ISO. Click and copy.',
    'CAST cannot take a style number. CONVERT can. Finance in the UK wants 103. ISO wants 23.',
    `<p>Related: <a href="/tsql/cast-convert">CAST and CONVERT</a>.</p>`,
    `<div class="tool" data-tool="styles">
      <label>Expression <input id="st-expr" value="GETDATE()"></label>
      <div class="chip-row" id="st-chips"></div>
      <pre class="tool-out"><code id="st-out"></code></pre>
    </div>`, 'Cleaning'),

  t('join-venn', 'JOIN Venn',
    'SQL JOIN Venn diagram inspector',
    'Click inner, left, right, full, cross. See the rows and the SQL.',
    'Interactive SQL JOIN Venn diagram for INNER, LEFT, RIGHT, FULL OUTER and CROSS JOIN with sample rows and T-SQL.',
    'The picture is the join. Click a region. We show which sample rows survive and the template.',
    `<p>At work, write LEFT not RIGHT. See <a href="/guides/right-join">RIGHT JOIN</a>.</p>`,
    `<div class="tool" data-tool="venn">
      <div class="chip-row">
        <button type="button" class="btn btn-ghost" data-join="inner">Inner</button>
        <button type="button" class="btn btn-ghost" data-join="left">Left</button>
        <button type="button" class="btn btn-ghost" data-join="right">Right</button>
        <button type="button" class="btn btn-ghost" data-join="full">Full outer</button>
        <button type="button" class="btn btn-ghost" data-join="cross">Cross</button>
      </div>
      <div id="vn-vis" class="venn-vis"></div>
      <pre class="tool-out"><code id="vn-out"></code></pre>
    </div>`, 'Speed'),

  t('index-advisor', 'Index advisor',
    'CREATE INDEX blueprint from WHERE and JOIN',
    'Paste the filters. Get a starting CREATE INDEX.',
    'SQL Server index advisor checklist. Enter WHERE and JOIN columns and get CREATE INDEX blueprints.',
    'This is a starting point, not a DBA. Equality columns first, then the range, then includes for the SELECT list.',
    `<p>Too many indexes slow writes. Look at the actual plan before you sprinkle these on production.</p>`,
    `<div class="tool" data-tool="index">
      <label>Table <input id="ix-table" value="Orders"></label>
      <label>WHERE / JOIN columns (equality first) <input id="ix-eq" value="customer_id, status"></label>
      <label>Range / ORDER BY columns <input id="ix-range" value="order_date"></label>
      <label>SELECT columns to INCLUDE <input id="ix-inc" value="total_amount"></label>
      <pre class="tool-out"><code id="ix-out"></code></pre>
    </div>`, 'Speed'),

  t('sargable', 'SARGable rewrite',
    'SARGable query audit for SQL Server',
    'Paste a WHERE. We flag YEAR(column) and rewrite the range.',
    'Rewrite non-SARGable SQL Server predicates like WHERE YEAR(OrderDate) = 2026 into a range the index can use.',
    'If you wrap the column in a function, SQL Server often cannot use the index. Compare the column to a range instead.',
    `<p>Related: <a href="/guides/convert-datetime-to-date">datetime to date</a>.</p>`,
    `<div class="tool" data-tool="sarg">
      <label>WHERE clause (or a whole query)</label>
      <textarea id="sg-in" rows="5" spellcheck="false">WHERE YEAR(order_date) = 2026 AND MONTH(order_date) = 10</textarea>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="sg-run">Audit</button> ${copy('sg-out')}</div>
      <pre class="tool-out"><code id="sg-out"></code></pre>
    </div>`, 'Speed'),

  t('like-perf', 'LIKE performance',
    'Wildcard LIKE performance estimator',
    'Prefix % vs suffix %. What the index can use.',
    'SQL Server LIKE performance guide: why LIKE \'%text\' cannot seek, and alternatives for contains-search.',
    'LIKE \'Smith%\' can seek. LIKE \'%Smith\' cannot. That is the whole estimator.',
    `<p>Related: <a href="/tsql/like">LIKE</a>.</p>`,
    `<div class="tool" data-tool="likeperf">
      <label>Column <input id="lp-col" value="last_name"></label>
      <label>Search text <input id="lp-q" value="Ash"></label>
      <label>Pattern <select id="lp-pat"><option value="prefix">Starts with (Ash%)</option><option value="suffix">Ends with (%Ash)</option><option value="contains">Contains (%Ash%)</option></select></label>
      <pre class="tool-out"><code id="lp-out"></code></pre>
    </div>`, 'Speed'),

  t('cte-vs-temp', 'CTE vs #temp',
    'CTE vs temporary table selector',
    'Four questions. WITH or #temp.',
    'Choose a SQL Server CTE or #temp table from dataset size, reuse, and indexing needs.',
    'A CTE is a name for this statement. A #temp can be indexed and reused in the batch. Four questions.',
    `<p>Related: <a href="/tsql/temp-table">temp tables</a>, <a href="/guides/cte-for-reports">CTEs</a>.</p>`,
    `<div class="tool" data-tool="ctevs">
      <label>Will you use the result more than once in the batch? <select id="ct-reuse"><option value="no">No</option><option value="yes">Yes</option></select></label>
      <label>Rough rows in the intermediate set <select id="ct-size"><option value="small">Thousands or less</option><option value="big">Hundreds of thousands+</option></select></label>
      <label>Need an index or stats on that set? <select id="ct-ix"><option value="no">No</option><option value="yes">Yes</option></select></label>
      <label>Recursion (walk a manager tree)? <select id="ct-rec"><option value="no">No</option><option value="yes">Yes</option></select></label>
      <pre class="tool-out"><code id="ct-out"></code></pre>
    </div>`, 'Speed'),

  t('masking', 'Data masking',
    'SQL Server dynamic data masking blueprint',
    'Email, card, default. Copy ALTER TABLE … ADD MASKED.',
    'Generate SQL Server dynamic data masking (DDM) T-SQL for email, partial, and default masks.',
    'Masking hides a column from non-privileged users. It is not encryption. Admins still see the real value.',
    `<p>This is a draft for a DBA to review. Masking is not a substitute for RLS if Client A must not see Client B’s rows.</p>`,
    `<div class="tool" data-tool="mask">
      <label>Table <input id="ms-table" value="Customers"></label>
      <label>Column <input id="ms-col" value="email"></label>
      <label>Function <select id="ms-fn"><option value="email">email()</option><option value="partial">partial(1,"XXXX",2)</option><option value="default">default()</option><option value="random">random(1,9999)</option></select></label>
      <pre class="tool-out"><code id="ms-out"></code></pre>
    </div>`, 'Security'),

  t('anonymize', 'Anonymize PII',
    'Data anonymization HASHBYTES script',
    'Columns in. SHA2-256 updates out. For a test copy, not production login.',
    'Generate SQL Server HASHBYTES SHA2-256 scripts to anonymize PII columns in a test database.',
    'Test environments should not hold real emails. Hashing is one-way. You cannot log those people in afterwards.',
    `<p>Run this on a <em>copy</em>. Take a backup. Salting is better if two equal emails must not match — this version is a simple hash for a demo dump.</p>`,
    `<div class="tool" data-tool="anon">
      <label>Table <input id="an-table" value="Customers"></label>
      <label>PII columns, one per line<textarea id="an-cols" rows="4">email
phone
first_name</textarea></label>
      <pre class="tool-out"><code id="an-out"></code></pre>
    </div>`, 'Security'),

  t('rls', 'Row-level security',
    'SQL Server row-level security (RLS) generator',
    'Tenant column in. Predicate function and policy out.',
    'Generate SQL Server RLS security predicate and policy so one tenant cannot read another tenant’s rows.',
    'RLS filters every query on that table. Client A’s SELECT does not return Client B. You still need to set the session context.',
    `<p>Test with two users before you call it done. A missed dbo bypass is the usual hole.</p>`,
    `<div class="tool" data-tool="rls">
      <label>Table <input id="rl-table" value="Orders"></label>
      <label>Tenant column <input id="rl-col" value="customer_id"></label>
      <label>Session key <input id="rl-key" value="TenantId"></label>
      <pre class="tool-out"><code id="rl-out"></code></pre>
    </div>`, 'Security'),

  t('audit-trigger', 'Audit trigger',
    'AFTER UPDATE/DELETE audit trail trigger',
    'Table + watched columns. A log-table trigger draft.',
    'Generate a SQL Server AFTER UPDATE, DELETE trigger that writes old values to an audit table.',
    'Triggers log what changed. They also slow writes. Watch only the columns you need.',
    `<p>Draft only. Name collisions, existing triggers, and recursive updates need a DBA. WorkSQL will not run this.</p>`,
    `<div class="tool" data-tool="audit">
      <label>Table <input id="au-table" value="Customers"></label>
      <label>Key column <input id="au-key" value="customer_id"></label>
      <label>Columns to watch <input id="au-cols" value="email, phone"></label>
      <pre class="tool-out"><code id="au-out"></code></pre>
    </div>`, 'Security'),

  t('sqli', 'Injection checker',
    'SQL injection pattern checker (training)',
    'Paste app code that builds SQL. We flag string concatenation and show parameters.',
    'Training tool: scan pasted backend SQL concatenation for injection risks and show a parameterized rewrite. Not an exploit kit.',
    'If the SQL is glued together with user text, a stranger can change the sentence. Parameters keep data as data. This looks for obvious glue. It is not a pentest.',
    `<p>We do not write payloads. If this flags your code, use parameters or an ORM. Related habit: never concatenate a filter you did not write.</p>`,
    `<div class="tool" data-tool="sqli">
      <label>Backend snippet (your code)</label>
      <textarea id="si-in" rows="7" spellcheck="false">const sql = "SELECT * FROM Customers WHERE email = '" + req.query.email + "'";</textarea>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="si-run">Check</button></div>
      <pre class="tool-out"><code id="si-out"></code></pre>
    </div>`, 'Security'),

  t('excel-sql', 'Excel → SQL',
    'Excel formula to T-SQL converter',
    'VLOOKUP, IF, CONCATENATE → JOIN, CASE, CONCAT.',
    'Convert common Excel formulas (VLOOKUP, IF, CONCATENATE, SUMIF) to T-SQL equivalents.',
    'The spreadsheet is the spec. SQL is the same idea on a table.',
    `<p>Related: <a href="/guides/left-join">LEFT JOIN</a>, <a href="/tsql/case-when">CASE</a>.</p>`,
    `<div class="tool" data-tool="excel">
      <label>Excel formula</label>
      <input id="xl-in" value="=IF(A2>10000,\"Tier 1\",\"Other\")">
      <pre class="tool-out"><code id="xl-out"></code></pre>
    </div>`, 'Quality of life'),

  t('tally', 'Calendar / tally CTE',
    'Date range filler (recursive CTE)',
    'From / to dates. A calendar table query.',
    'Build a SQL Server recursive CTE that fills every date (or number) between two bounds.',
    'Reports need every day, including days with no orders. A tally / calendar CTE fills the gaps.',
    `<p>Recursive CTEs have a default 100-step cap. We set MAXRECURSION for a year of days. Do not point this at a million years.</p>`,
    `<div class="tool" data-tool="tally">
      <label>Start <input id="tl-from" value="2026-01-01"></label>
      <label>End <input id="tl-to" value="2026-12-31"></label>
      <label>Grain <select id="tl-g"><option value="day">Days</option><option value="n">Numbers 1..N</option></select></label>
      <pre class="tool-out"><code id="tl-out"></code></pre>
    </div>`, 'Quality of life'),

  t('conn-string', 'Connection string',
    'SQL Server connection string constructor',
    'Server, database, auth, port. .NET, Python, Node, SSMS.',
    'Build SQL Server connection strings for ADO.NET, Python, Node.js and SSMS from one form.',
    'One typo in Encrypt or TrustServerCertificate and the app fails only in production. Fill the form once.',
    `<p>Do not paste production passwords into a public PC. This runs locally in your browser; treat the output like a secret.</p>`,
    `<div class="tool" data-tool="conn">
      <div class="tool-row">
        <label>Server <input id="cn-server" value="localhost"></label>
        <label>Database <input id="cn-db" value="Harbour"></label>
        <label>Port <input id="cn-port" value="1433"></label>
      </div>
      <label>Auth <select id="cn-auth"><option value="sql">SQL login</option><option value="windows">Windows / Integrated</option></select></label>
      <div class="tool-row" id="cn-sql">
        <label>User <input id="cn-user" value="app_user"></label>
        <label>Password <input id="cn-pass" value="••••••••" type="password"></label>
      </div>
      <label><input type="checkbox" id="cn-enc" checked> Encrypt</label>
      <label><input type="checkbox" id="cn-trust"> Trust server certificate</label>
      <pre class="tool-out"><code id="cn-out"></code></pre>
    </div>`, 'Quality of life'),

  t('batcher', 'Script batcher',
    'SQL script splitter (GO batches)',
    'Long INSERT list. Split every N rows or inject GO.',
    'Split a long T-SQL script into GO batches so SSMS does not time out on a huge INSERT.',
    'SSMS and some tools choke on a 40,000-row INSERT. Batch it.',
    `<p>GO is an SSMS batch splitter, not T-SQL. Do not put GO inside a stored procedure.</p>`,
    `<div class="tool" data-tool="batch">
      <label>Script</label>
      <textarea id="bt-in" rows="7" spellcheck="false">INSERT INTO X(a) VALUES (1);
INSERT INTO X(a) VALUES (2);
INSERT INTO X(a) VALUES (3);</textarea>
      <label>Statements per batch <input id="bt-n" type="number" value="2" min="1"></label>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="bt-run">Split</button> ${copy('bt-out')}</div>
      <pre class="tool-out"><code id="bt-out"></code></pre>
    </div>`, 'Quality of life'),

  t('in-list', 'List → IN ()',
    'Excel list to SQL IN clause',
    'Paste a column of ids or emails. Get IN (\'a\', \'b\').',
    'Convert a pasted Excel column of IDs or emails into a SQL Server WHERE col IN (...) list.',
    'Copy the column from the sheet. We quote, escape, and comma-separate.',
    `<p>Related: <a href="/tsql/in-list">IN</a>. Thousands of values: a temp table is kinder than a giant IN.</p>`,
    `<div class="tool" data-tool="inlist">
      <label>Column <input id="in-col" value="email"></label>
      <label>Paste list (one per line or comma)</label>
      <textarea id="in-raw" rows="7" spellcheck="false">amy@harbour.example
tom@harbour.example
becky@harbour.example</textarea>
      <label><input type="checkbox" id="in-num"> These are numbers (no quotes)</label>
      <pre class="tool-out"><code id="in-out"></code></pre>
    </div>`, 'Quality of life'),
];
