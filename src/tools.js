// Free in-browser T-SQL tools. Pages are rendered on the server so Google can read them.
// The widgets run in public/js/tools.js. Nothing is sent to our server.
const { page } = require('./articles');
const { esc } = require('./article-html');

const extraTools = require('./tools-more');
const enterpriseTools = require('./tools-enterprise');
const { catalogSearch, catalogCard } = require('./search');

const coreTools = [
  {
    slug: 'formatter', name: 'T-SQL formatter',
    title: 'T-SQL formatter: beautify messy SQL Server queries',
    short: 'Paste a one-liner. Get keywords in uppercase and clauses on their own lines.',
    description: 'Free T-SQL beautifier for SQL Server. Paste messy single-line SQL, click Format, copy aligned SELECT / FROM / LEFT JOIN. Runs in your browser.',
    lede: 'Legacy systems cough out one long line. This puts SELECT, FROM and LEFT JOIN on their own lines and uppercases the keywords. It never leaves your browser.',
    about: `<p>Analysts search for “SQL formatter” and “T-SQL beautifier” because SSMS’s own format is fussy and the query arrived as a single line from a ticket or a view definition.</p>
      <p>This one is built for SQL Server: ${esc('TOP')}, ${esc('ISNULL')}, ${esc('GETDATE')}, square brackets, ${esc('GO')}. It is not a full parser. Odd macros can still look odd. For anything you will send, read the result once.</p>
      <p>Related: <a href="/guides/ssms-run-a-query">run a query in SSMS</a>, <a href="/guides/why-select-star-fails">why SELECT * fails</a>.</p>`,
    widget: `<div class="tool" data-tool="formatter">
      <label>Messy T-SQL</label>
      <textarea id="fmt-in" rows="8" spellcheck="false">select o.order_id,c.first_name,c.last_name from Orders o left join Customers c on c.customer_id=o.customer_id where o.order_date>=cast(getdate() as date) and o.total_amount>50 order by o.total_amount desc</textarea>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="fmt-run">Format</button>
        <button class="btn btn-ghost" type="button" data-copy="fmt-out">Copy</button></div>
      <label>Formatted</label>
      <textarea id="fmt-out" rows="12" spellcheck="false" readonly></textarea>
    </div>`,
    group: 'Everyday',
  },
  {
    slug: 'dates', name: 'DATEADD / DATEDIFF',
    title: 'T-SQL DATEADD and DATEDIFF generator',
    short: 'Pick the unit and the dates. Copy the exact SQL Server syntax.',
    description: 'Interactive DATEADD and DATEDIFF generator for SQL Server. Choose days, weeks or years and copy the T-SQL. No more guessing mm vs month.',
    lede: 'SQL Server wants DATEADD(day, -7, GETDATE()), not DATE_SUB. The unit is a word, not a string. This writes the line for you.',
    about: `<p>The arguments swap depending on the function. DATEADD is (unit, number, date). DATEDIFF is (unit, start, end). People search this every week because the muscle memory is MySQL.</p>
      <p>Use ${esc('day')} not ${esc('dd')} if someone else has to read it. For “last week” as a calendar week, the generator is not enough — see <a href="/guides/last-week-orders">last week’s orders</a> and <a href="/tsql/dateadd">DATEADD</a>.</p>`,
    widget: `<div class="tool" data-tool="dates">
      <div class="tool-row">
        <label>Function <select id="dt-fn"><option value="dateadd">DATEADD</option><option value="datediff">DATEDIFF</option></select></label>
        <label>Unit <select id="dt-unit">
          <option value="day">day</option><option value="week">week</option>
          <option value="month">month</option><option value="year">year</option>
          <option value="hour">hour</option><option value="minute">minute</option>
        </select></label>
      </div>
      <div class="tool-row" id="dt-add-fields">
        <label>Number (negative goes back) <input id="dt-n" type="number" value="-7"></label>
        <label>Date expression <input id="dt-date" value="CAST(GETDATE() AS date)"></label>
      </div>
      <div class="tool-row" id="dt-diff-fields" hidden>
        <label>Start date <input id="dt-start" value="order_date"></label>
        <label>End date <input id="dt-end" value="GETDATE()"></label>
      </div>
      <div class="tool-actions"><button class="btn btn-ghost" type="button" data-copy="dt-out">Copy</button></div>
      <pre class="tool-out"><code id="dt-out"></code></pre>
    </div>`,
    group: 'Everyday',
  },
  {
    slug: 'mock-data', name: 'Mock INSERT builder',
    title: 'SQL Server mock data generator: INSERT statements',
    short: 'Column names in. Dummy rows out. Nothing hits a real database.',
    description: 'Free SQL Server mock data generator. Type column names and a row count, get INSERT INTO … VALUES you can paste into SSMS. No company data.',
    lede: 'You need ten rows to test a JOIN and you are not allowed near production. This builds INSERT statements with boring, obvious dummy values.',
    about: `<p>People search “generate mock SQL data” when they want a sandbox, not a leak. These values are fake: sequential ids, Name 1, 2026-01-01 plus a day, 10.00 times the row.</p>
      <p>Guessed types: id → int, anything with date → date, amount/price/total → decimal, otherwise nvarchar. Edit the output if we guessed wrong.</p>
      <p>WorkSQL already has a company you can query without inserts: <a href="/work">Harbour &amp; Co</a>.</p>`,
    widget: `<div class="tool" data-tool="mock">
      <div class="tool-row">
        <label>Table <input id="mk-table" value="Customers"></label>
        <label>Rows <input id="mk-n" type="number" min="1" max="200" value="5"></label>
      </div>
      <label>Columns (name or name:type, comma separated)</label>
      <input id="mk-cols" value="customer_id:int, first_name, last_name, email, created_at:date">
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="mk-run">Generate</button>
        <button class="btn btn-ghost" type="button" data-copy="mk-out">Copy</button></div>
      <pre class="tool-out"><code id="mk-out"></code></pre>
    </div>`,
    group: 'Everyday',
  },
  {
    slug: 'like', name: 'Regex → LIKE',
    title: 'Regex to SQL Server LIKE / PATINDEX translator',
    short: 'Turn a simple regex into LIKE or PATINDEX. Full regex is not SQL.',
    description: 'Translate a simple regex to SQL Server LIKE and PATINDEX. % _ [] [^] — not a full regex engine. For analysts coming from Python or R.',
    lede: 'SQL Server does not speak regex in LIKE. It speaks %, _, [] and [^]. If you think in ^, $ and .*, this writes the LIKE for the simple cases and tells you when it cannot.',
    about: `<p>Python people type ${esc('^[A-Z].*co.uk$')} and expect it to work. In T-SQL that is closer to ${esc("LIKE '[A-Z]%co.uk'")}. Character classes map. Lookaheads, groups and ${esc('\\d')} do not — use PATINDEX for a few of those, or do it in the app.</p>
      <p>A leading ${esc('%')} cannot use a normal index well. See <a href="/tsql/like">LIKE</a>.</p>`,
    widget: `<div class="tool" data-tool="like">
      <label>Regex (simple)</label>
      <input id="lk-in" value="^[A-Z].*@harbour\\.co$">
      <label>Column <input id="lk-col" value="email"></label>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="lk-run">Translate</button>
        <button class="btn btn-ghost" type="button" data-copy="lk-out">Copy</button></div>
      <pre class="tool-out"><code id="lk-out"></code></pre>
      <p class="muted-note" id="lk-note"></p>
    </div>`,
    group: 'Everyday',
  },
  {
    slug: 'windows', name: 'Window preview',
    title: 'SQL window function previewer: PARTITION BY visualizer',
    titleAttr: 'SQL window function previewer',
    short: 'Five rows. Click ROW_NUMBER, RANK or a running SUM and watch the numbers move.',
    description: 'Interactive SQL window function visualizer. See how ROW_NUMBER, RANK and SUM() OVER change when you PARTITION BY or ORDER BY. Five sample rows, in the browser.',
    lede: 'Window functions confuse people because the table does not shrink. This is five rows you can re-rank. No server, no SQL to run — the idea, on a grid.',
    about: `<p>PARTITION BY restarts the numbering. ORDER BY decides who is 1. SUM() OVER keeps every row and adds as it goes. That is the whole lecture. Write it for real on <a href="/tsql/row-number">ROW_NUMBER</a> and <a href="/tsql/running-total">running totals</a>.</p>`,
    widget: `<div class="tool" data-tool="windows">
      <div class="tool-row">
        <label>Function <select id="w-fn">
          <option value="row_number">ROW_NUMBER()</option>
          <option value="rank">RANK()</option>
          <option value="dense_rank">DENSE_RANK()</option>
          <option value="sum">SUM(amount) OVER</option>
        </select></label>
        <label>PARTITION BY <select id="w-part">
          <option value="">(none)</option>
          <option value="customer">customer</option>
        </select></label>
        <label>ORDER BY <select id="w-ord">
          <option value="amount_desc">amount DESC</option>
          <option value="amount_asc">amount ASC</option>
          <option value="day">day</option>
        </select></label>
      </div>
      <pre class="tool-out"><code id="w-sql"></code></pre>
      <div class="grid-wrap"><table class="tool-grid" id="w-grid"></table></div>
    </div>`,
    group: 'Everyday',
  },
];

const tools = coreTools.concat(extraTools, enterpriseTools);

function renderTools(origin) {
  const groups = [];
  for (const t of tools) {
    const g = t.group || 'Everyday';
    if (!groups.includes(g)) groups.push(g);
  }
  const hubs = [
    { href: '/excel-to-sql', name: 'Excel → T-SQL', short: 'VLOOKUP, IF, COUNTIF, SUMPRODUCT. One page per function.', extra: 'excel convert' },
    { href: '/pandas-to-sql', name: 'Pandas → T-SQL', short: 'merge, groupby, fillna, drop_duplicates, loc.', extra: 'pandas convert' },
    { href: '/sql-translator', name: 'SQL dialect translator', short: 'MySQL, Postgres, Oracle, Snowflake → SQL Server.', extra: 'mysql limit dialect' },
    { href: '/interview', name: 'Interview sandbox', short: 'Top N per group, running totals, anti-joins. Draft and reveal.', extra: 'interview sql' },
  ];
  const cards = [
    ...hubs.map((h) => catalogCard({ ...h, cat: 'Hubs' })),
    ...tools.map((t) => catalogCard({
      href: `/tools/${t.slug}`, name: t.name, short: t.short, extra: t.slug + ' ' + (t.group || '') + ' ' + t.title, cat: t.group || 'Everyday',
    })),
  ].join('');
  const total = tools.length + hubs.length;
  const chips = ['All', 'Hubs', ...groups];
  const body = `<div class="lib">
    <header class="lib-head">
      <h1>Free tools</h1>
      <p>${tools.length} in-browser utilities, plus converters and an interview sandbox. Nothing is uploaded.</p>
    </header>
    ${catalogSearch({ placeholder: 'Formatter, VLOOKUP, SARGable, MERGE, RLS…', total, noun: 'tools', variant: 'lib', chips })}
    <div class="lib-grid">${cards}</div>
  </div>`;
  return page({ title: 'Free T-SQL tools for SQL Server | WorkSQL', description: 'Free in-browser T-SQL tools: formatter, DATEADD, mock INSERTs, schema diagrams, CASE builder, PIVOT, SARGable rewrite, RLS drafts, Excel-to-SQL, IN-list builder.', body, canonical: origin && `${origin}/tools`, shell: 'catalog' });
}

function renderTool(tool, origin) {
  const same = tools.filter((x) => x !== tool && x.group === tool.group);
  const rest = tools.filter((x) => x !== tool && x.group !== tool.group);
  const others = same.concat(rest).slice(0, 8);
  const body = `<article class="article">
    <div class="crumb"><a href="/tools">Tools</a> › ${esc(tool.name)}</div>
    <h1>${esc(tool.title)}</h1>
    <p class="lede">${esc(tool.lede)}</p>
    ${tool.widget}
    ${tool.about}
    <section class="try">
      <h2>Learn it on a real ticket</h2>
      <p>Monday is free on WorkSQL. Write the T-SQL yourself. We mark it like a colleague would.</p>
      <a class="btn btn-primary" href="/work">Clock in free</a>
    </section>
    <div class="related">More tools: ${others.map((x) => `<a href="/tools/${x.slug}">${esc(x.name)}</a>`).join('')}</div>
  </article>
  <script type="module" src="/js/tools.js"></script>
  <script type="module" src="/js/tools-more.js"></script>
  <script type="module" src="/js/enterprise.js"></script>`;
  return page({ title: `${tool.title} | WorkSQL`, description: tool.description, body, canonical: origin && `${origin}/tools/${tool.slug}` });
}

const toolPaths = () => ['/tools', ...tools.map((t) => `/tools/${t.slug}`)];

module.exports = { tools, renderTools, renderTool, toolPaths };
