// Heavy-duty in-browser generators. Client: /js/enterprise.js
const t = (slug, name, title, short, description, lede, about, widget, group) =>
  ({ slug, name, title, short, description, lede, about, widget, group });
const copy = (id) => `<button class="btn btn-ghost" type="button" data-copy="${id}">Copy</button>`;

module.exports = [
  t('row-size', 'Row size calculator',
    'SQL Server table size estimator (row bytes)',
    'INT, VARCHAR, DATETIME in. Bytes per row and a million-row estimate out.',
    'SQL Server table size estimator. Enter column types; JavaScript applies Microsoft row-size rules to estimate KB for a million rows.',
    'A row is not the sum of the brochure sizes. Null bitmap, variable offsets, and the 8,060-byte limit all count. Type the columns.',
    `<p>This is a planning estimate, not a DBCC result. Compression, fill factor, and off-row LOB pages change the real file. Related: <a href="/tsql/int-decimal-money">int vs decimal</a>, <a href="/tsql/varchar-vs-nvarchar">varchar vs nvarchar</a>.</p>`,
    `<div class="tool" data-tool="rowsize">
      <label>Columns (type per line, optional name). Examples: int, nvarchar(80), decimal(12,2), datetime2, varchar(255)</label>
      <textarea id="rs-in" rows="8" spellcheck="false">int
int
nvarchar(80)
nvarchar(200)
decimal(12,2)
datetime2
bit
varchar(255)</textarea>
      <div class="tool-row">
        <label>Rows to size <input id="rs-n" type="number" value="1000000"></label>
        <label>Avg fill of variable cols (0–1) <input id="rs-fill" type="number" step="0.1" value="0.6"></label>
      </div>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="rs-run">Estimate</button> ${copy('rs-out')}</div>
      <pre class="tool-out"><code id="rs-out"></code></pre>
    </div>`, 'Architecture'),

  t('datetime-matrix', 'Date format matrix',
    'SQL Server date format codes cheat sheet',
    'Pick in and out. Get CONVERT, TRY_PARSE, or FORMAT.',
    'Interactive SQL Server date format matrix. Style 103, 120, 23 — CONVERT, TRY_PARSE and FORMAT for the pair you pick.',
    'CAST cannot take a style. CONVERT can. FORMAT is pretty and slow in a WHERE. Pick the pair.',
    `<p>Related: <a href="/tools/convert-styles">CONVERT styles</a>, <a href="/tsql/cast-convert">CAST and CONVERT</a>.</p>`,
    `<div class="tool" data-tool="dtmatrix">
      <div class="tool-row">
        <label>Expression <input id="dm-expr" value="order_date"></label>
        <label>Input looks like
          <select id="dm-in">
            <option value="datetime">Already a date/time</option>
            <option value="iso">yyyy-mm-dd text</option>
            <option value="uk">dd/mm/yyyy text</option>
            <option value="us">mm/dd/yyyy text</option>
            <option value="ymd">yyyyMMdd text</option>
          </select></label>
        <label>Want
          <select id="dm-out">
            <option value="23">yyyy-mm-dd (23)</option>
            <option value="103">dd/mm/yyyy (103)</option>
            <option value="101">mm/dd/yyyy (101)</option>
            <option value="120">yyyy-mm-dd hh:mi:ss (120)</option>
            <option value="112">yyyyMMdd (112)</option>
            <option value="date">date type</option>
            <option value="dt2">datetime2</option>
          </select></label>
      </div>
      <pre class="tool-out"><code id="dm-out-sql"></code></pre>
    </div>`, 'Cleaning'),

  t('mock-factory', 'Mock data factory',
    'T-SQL dummy data script (10,000+ rows)',
    'Names, UK postcodes, amounts. A tally CTE, no API.',
    'Generate a T-SQL script that builds 10,000+ dummy customer and order rows with UK names and postcodes via a recursive CTE.',
    'You need a pile of rows and you are not allowed near production. This writes a tally CTE (or a WHILE) of boring, obvious fakes.',
    `<p>Recursive CTEs cap at MAXRECURSION. We set it. Do not ask for a million years of days. Related: <a href="/tools/mock-data">small INSERT builder</a>, <a href="/tools/tally">calendar CTE</a>.</p>`,
    `<div class="tool" data-tool="factory">
      <div class="tool-row">
        <label>Rows <input id="mf-n" type="number" value="10000" min="10" max="100000"></label>
        <label>Shape
          <select id="mf-shape">
            <option value="customers">Customers (UK names, postcodes, email)</option>
            <option value="orders">Orders (customer_id, amount, day)</option>
            <option value="both">Customers then orders</option>
          </select></label>
      </div>
      <label><input type="checkbox" id="mf-loop"> Use a WHILE loop instead of a recursive CTE</label>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="mf-run">Build script</button> ${copy('mf-out')}</div>
      <pre class="tool-out"><code id="mf-out"></code></pre>
    </div>`, 'Quality of life'),

  t('index-rebuild', 'Index rebuild script',
    'T-SQL index reorganize / rebuild automation',
    'Reorg &gt; 10%, rebuild &gt; 30%. Uses sys.dm_db_index_physical_stats.',
    'Generate a SQL Server index maintenance script: reorganize or rebuild from fragmentation thresholds and dm_db_index_physical_stats.',
    'Pick the thresholds the shop already agreed. We write the DMV loop. Read it before you schedule it on production.',
    `<p>Online rebuilds need Enterprise (or a newer SKU that allows it). This is a draft, not Ola Hallengren’s suite. Test on a copy.</p>`,
    `<div class="tool" data-tool="reindex">
      <div class="tool-row">
        <label>Reorganize if fragmentation ≥ <input id="ixr-lo" type="number" value="10"></label>
        <label>Rebuild if fragmentation ≥ <input id="ixr-hi" type="number" value="30"></label>
        <label>Min page count <input id="ixr-pages" type="number" value="1000"></label>
      </div>
      <label><input type="checkbox" id="ixr-online"> Prefer ONLINE = ON (Enterprise)</label>
      <label>Schema filter <input id="ixr-schema" value="dbo"></label>
      <div class="tool-actions">${copy('ixr-out')}</div>
      <pre class="tool-out"><code id="ixr-out"></code></pre>
    </div>`, 'Speed'),

  t('gdpr', 'GDPR / PII wizard',
    'Anonymize and mask PII in SQL Server',
    'Hash, scramble, or MASKED WITH. For a test copy, not a login store.',
    'GDPR-oriented T-SQL: HASHBYTES SHA2-256, character scramble, or dynamic data masking for names, phones, emails, salaries.',
    'Test environments should not hold real emails. Pick a method per column. Run it on a copy.',
    `<p>Hashing is one-way. Masking is not encryption. Related: <a href="/tools/anonymize">HASHBYTES</a>, <a href="/tools/masking">dynamic masking</a>.</p>`,
    `<div class="tool" data-tool="gdpr">
      <label>Table <input id="gd-table" value="Customers"></label>
      <label>Columns (name : kind). Kinds: email, phone, name, salary, id</label>
      <textarea id="gd-cols" rows="5" spellcheck="false">email : email
phone : phone
first_name : name
salary : salary</textarea>
      <label>Method
        <select id="gd-method">
          <option value="hash">HASHBYTES SHA2-256 (test copy)</option>
          <option value="scramble">Scramble letters / last-4 phone</option>
          <option value="mask">Dynamic data masking (live, hides from non-unmask)</option>
        </select></label>
      <div class="tool-actions">${copy('gd-out')}</div>
      <pre class="tool-out"><code id="gd-out"></code></pre>
    </div>`, 'Security'),

  t('schema-auditor', 'Schema auditor',
    'Audit trail trigger for INSERT, UPDATE, DELETE',
    'Table + events. A log table and the trigger.',
    'SQL Server audit trail generator. Choose INSERT/UPDATE/DELETE; get an audit table and AFTER trigger that records who and when.',
    'Triggers log what changed. They also slow writes. Watch the events you need.',
    `<p>Draft only. Related: <a href="/tools/audit-trigger">UPDATE/DELETE blueprint</a>.</p>`,
    `<div class="tool" data-tool="auditor">
      <label>Table <input id="sa-table" value="Customers"></label>
      <label>Key column <input id="sa-key" value="customer_id"></label>
      <label>Columns to snapshot <input id="sa-cols" value="email, phone, status"></label>
      <label><input type="checkbox" id="sa-i" checked> INSERT</label>
      <label><input type="checkbox" id="sa-u" checked> UPDATE</label>
      <label><input type="checkbox" id="sa-d" checked> DELETE</label>
      <div class="tool-actions">${copy('sa-out')}</div>
      <pre class="tool-out"><code id="sa-out"></code></pre>
    </div>`, 'Security'),

  t('csv-merge', 'CSV → MERGE',
    'Excel / CSV to SQL Server MERGE (upsert)',
    'Match on a key. Update the rest. Insert the new ones.',
    'Convert pasted CSV to a SQL Server MERGE upsert. Updates matching keys, inserts rows that do not exist.',
    'INSERT breaks when the email is already there. MERGE is update-or-insert. First row is headers. One key column.',
    `<p>MERGE has held a few locking surprises over the years. For a huge load, a staging table + UPDATE/INSERT pair is kinder. Related: <a href="/tools/csv-insert">CSV INSERT</a>.</p>`,
    `<div class="tool" data-tool="mergecsv">
      <div class="tool-row">
        <label>Target table <input id="mg-table" value="Customers"></label>
        <label>Key column <input id="mg-key" value="email"></label>
      </div>
      <label>CSV (header row first)</label>
      <textarea id="mg-in" rows="8" spellcheck="false">email,first_name,last_name
amy@harbour.example,Amy,Nair
new@harbour.example,Pat,Cole</textarea>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="mg-run">Build MERGE</button> ${copy('mg-out')}</div>
      <pre class="tool-out"><code id="mg-out"></code></pre>
    </div>`, 'Cleaning'),

  t('text-sanitizer', 'Text sanitizer',
    'Strip junk from phones, postcodes, emails (T-SQL)',
    'Spaces, country codes, nested REPLACE / PATINDEX.',
    'Dirty-data T-SQL builder: strip non-digits from phones, spaces from postcodes, extract emails with CHARINDEX.',
    'Client files arrive with +44, spaces, and a sentence where an email should be. Pick the job; we stack REPLACE and PATINDEX.',
    `<p>Related: <a href="/tools/like">regex → LIKE</a>, <a href="/tsql/replace">REPLACE</a>, <a href="/tsql/trim">TRIM</a>.</p>`,
    `<div class="tool" data-tool="sanitize">
      <label>Column <input id="ts-col" value="phone"></label>
      <label>Job
        <select id="ts-job">
          <option value="digits">Keep digits only (phone)</option>
          <option value="uk44">Strip +44 / 0044, keep national number</option>
          <option value="postcode">Remove spaces (UK postcode)</option>
          <option value="email">Extract first email from a blob</option>
          <option value="alnum">Letters and digits only</option>
          <option value="spaces">Collapse whitespace</option>
        </select></label>
      <pre class="tool-out"><code id="ts-out"></code></pre>
    </div>`, 'Cleaning'),
];
