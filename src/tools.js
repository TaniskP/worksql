// Free in-browser T-SQL tools. Pages are rendered on the server so Google can read them.
// The widgets run in public/js/tools.js. Nothing is sent to our server.
const { page } = require('./articles');
const { esc, crumbBack } = require('./article-html');

const extraTools = require('./tools-more');
const enterpriseTools = require('./tools-enterprise');
const { catalogIcon, searchBits } = require('./search');

const GROUP_ORDER = ['Hubs', 'Everyday', 'Architecture', 'Aggregation', 'Cleaning', 'Speed', 'Security', 'Quality of life'];

const GROUP_BLURB = {
  Hubs: 'Converters and the interview sandbox. Paste in the browser; nothing is uploaded.',
  Everyday: 'Format a query, build a date filter, mock a few rows.',
  Architecture: 'Schema diagrams, data types, keys, and ALTER drafts.',
  Aggregation: 'CASE, cohorts, fiscal years, PIVOT blueprints.',
  Cleaning: 'CSV and JSON in, INSERT and OPENJSON out. Find the duplicates.',
  Speed: 'JOINs, indexes, SARGable rewrites, and WHEN LIKE hurts.',
  Security: 'Masking, PII, RLS drafts, and a quick injection check.',
  'Quality of life': 'Calendar CTEs, connection strings, batching, IN-lists.',
};

const GROUP_FEATURED = {
  Hubs: ['/excel-to-sql', '/pandas-to-sql', '/sql-translator'],
  Everyday: ['formatter', 'dates', 'mock-data'],
  Architecture: ['schema-diagram', 'data-type', 'schema-diff'],
  Aggregation: ['case-builder', 'cohort', 'pivot'],
  Cleaning: ['csv-insert', 'json-openjson', 'dupes'],
  Speed: ['join-venn', 'index-advisor', 'sargable'],
  Security: ['masking', 'anonymize', 'rls'],
  'Quality of life': ['tally', 'conn-string', 'batcher'],
};

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

function featuredOf(group, list) {
  const want = GROUP_FEATURED[group] || [];
  const keyOf = (it) => it.key || it.slug || it.href;
  const byKey = new Map(list.map((it) => [keyOf(it), it]));
  const out = [];
  for (const key of want) {
    const it = byKey.get(key);
    if (it) out.push(it);
  }
  for (const it of list) {
    if (out.length >= 3) break;
    if (!out.includes(it)) out.push(it);
  }
  return out.slice(0, 3);
}

function renderTools(origin) {
  const hubs = [
    { key: '/excel-to-sql', href: '/excel-to-sql', name: 'Excel → T-SQL', short: 'VLOOKUP, IF, COUNTIF, SUMPRODUCT. One page per function.', extra: 'excel convert', group: 'Hubs' },
    { key: '/pandas-to-sql', href: '/pandas-to-sql', name: 'Pandas → T-SQL', short: 'merge, groupby, fillna, drop_duplicates, loc.', extra: 'pandas convert', group: 'Hubs' },
    { key: '/sql-translator', href: '/sql-translator', name: 'SQL dialect translator', short: 'MySQL, Postgres, Oracle, Snowflake → SQL Server.', extra: 'mysql limit dialect', group: 'Hubs' },
    { key: '/interview', href: '/interview', name: 'Interview sandbox', short: 'Top N per group, running totals, anti-joins. Draft and reveal.', extra: 'interview sql', group: 'Hubs' },
  ];
  const items = [
    ...hubs,
    ...tools.map((t) => ({
      key: t.slug, href: `/tools/${t.slug}`, name: t.name, short: t.short,
      extra: t.slug + ' ' + (t.group || '') + ' ' + t.title, group: t.group || 'Everyday',
    })),
  ];
  const byGroup = {};
  for (const g of GROUP_ORDER) byGroup[g] = [];
  for (const it of items) {
    const g = it.group;
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(it);
  }
  const groups = GROUP_ORDER.filter((g) => (byGroup[g] || []).length);
  const total = items.length;

  const tabs = `<div class="g-tabs" id="catalog-chips" role="tablist">
    <button type="button" class="g-tab" data-chip="All" aria-pressed="true">All (${total})</button>
    ${groups.map((g) => `<button type="button" class="g-tab" data-chip="${esc(g)}" aria-pressed="false">${esc(g)} (${byGroup[g].length})</button>`).join('')}
  </div>`;

  const sections = groups.map((g) => {
    const list = byGroup[g];
    const featured = featuredOf(g, list);
    const ordered = featured.concat(list.filter((it) => !featured.includes(it)));
    const cards = ordered.map((it, i) => {
      const more = i >= 3 ? ' g-more' : '';
      const search = searchBits([it.name, it.short, it.extra, g].filter(Boolean).join(' '));
      return `<a class="g-item g-item-tool ref-link${more}" href="${esc(it.href)}" data-search="${search}" data-cat="${esc(g)}">
        <b>${esc(it.name)}</b>
        <span>${esc(it.short)}</span>
        <em class="g-arrow" aria-hidden="true">→</em>
      </a>`;
    }).join('');
    return `<section class="g-sec" data-topic="${esc(g)}">
      <header class="g-sec-head g-sec-head-tools">
        <span class="g-sec-ico" aria-hidden="true">${catalogIcon(g)}</span>
        <div class="g-sec-copy">
          <h2>${esc(g)}</h2>
          <p>${esc(GROUP_BLURB[g] || '')}</p>
        </div>
        <div class="g-sec-aside">
          <span class="g-sec-count">${list.length} tool${list.length === 1 ? '' : 's'}</span>
          <button type="button" class="g-viewall" data-topic="${esc(g)}">View all →</button>
        </div>
      </header>
      <div class="g-grid">${cards}</div>
    </section>`;
  }).join('');

  const body = `<div class="g-page">
    <section class="g-hero">
      <div class="g-hero-inner">
        <p class="lib-back">${crumbBack('/')}</p>
        <div class="eyebrow">Free tools</div>
        <h1>Free tools</h1>
        <p class="g-lede">${tools.length} in-browser utilities, plus converters and an interview sandbox. Nothing is uploaded.</p>
        <form class="lib-search g-search" role="search">
          <label class="visually-hidden" for="q">Search tools</label>
          <input id="q" name="q" type="search" placeholder="Search tools… e.g. Formatter, VLOOKUP, SARGable, MERGE, RLS…" autocomplete="off">
          <button class="btn btn-primary" type="submit">Search</button>
        </form>
      </div>
    </section>
    <div class="g-body">
      ${tabs}
      <p class="guide-count g-count" id="catalog-count" hidden>${total} tools</p>
      <div id="tools">${sections}</div>
    </div>
  </div>
  <script>
    (function () {
      const box = document.getElementById('q');
      const count = document.getElementById('catalog-count');
      const chips = document.getElementById('catalog-chips');
      const total = ${total};
      const apply = () => {
        const cards = [...document.querySelectorAll('.ref-link[data-search]')];
        const s = (box.value || '').trim().toLowerCase();
        const chip = chips && [...chips.querySelectorAll('.g-tab')].find((b) => b.getAttribute('aria-pressed') === 'true');
        const cat = chip && chip.getAttribute('data-chip');
        const want = cat && cat !== 'All' ? cat : '';
        const searching = !!s;
        let n = 0;
        for (const el of cards) {
          const text = !s || (el.getAttribute('data-search') || '').includes(s);
          const topic = !want || el.getAttribute('data-cat') === want;
          const preview = !want && !searching && el.classList.contains('g-more');
          const on = text && topic && !preview;
          el.hidden = !on;
          if (text && topic) n++;
        }
        for (const sec of document.querySelectorAll('.g-sec')) {
          const topic = sec.getAttribute('data-topic');
          const matchTopic = !want || topic === want;
          const any = [...sec.querySelectorAll('.ref-link')].some((c) => !c.hidden);
          sec.hidden = !(matchTopic && any);
          const view = sec.querySelector('.g-viewall');
          if (view) view.hidden = !!(want || searching);
        }
        if (count) {
          count.hidden = !(s || want);
          count.textContent = (s || want) ? n + ' of ' + total + ' tools' : total + ' tools';
        }
      };
      box.addEventListener('input', apply);
      box.form && box.form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
      const setTopic = (key) => {
        for (const x of chips.querySelectorAll('.g-tab')) {
          x.setAttribute('aria-pressed', x.getAttribute('data-chip') === key ? 'true' : 'false');
        }
        const url = new URL(location.href);
        if (!key || key === 'All') url.searchParams.delete('topic');
        else url.searchParams.set('topic', key);
        history.replaceState(null, '', url);
        apply();
      };
      if (chips) {
        chips.addEventListener('click', (e) => {
          const b = e.target.closest('.g-tab');
          if (!b) return;
          setTopic(b.getAttribute('data-chip'));
        });
      }
      document.getElementById('tools').addEventListener('click', (e) => {
        const b = e.target.closest('.g-viewall');
        if (!b) return;
        setTopic(b.getAttribute('data-topic'));
        const tab = chips.querySelector('.g-tab[aria-pressed="true"]');
        if (tab) tab.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
      const boot = () => {
        const start = new URLSearchParams(location.search);
        const q = start.get('q');
        if (q) box.value = q;
        const topic = start.get('topic');
        if (topic && chips) setTopic(topic);
        else apply();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else boot();
    })();
  </script>`;
  return page({ title: 'Free T-SQL tools for SQL Server | WorkSQL', description: 'Free in-browser T-SQL tools: formatter, DATEADD, mock INSERTs, schema diagrams, CASE builder, PIVOT, SARGable rewrite, RLS drafts, Excel-to-SQL, IN-list builder.', body, canonical: origin && `${origin}/tools`, shell: 'tools' });
}

function renderTool(tool, origin) {
  const same = tools.filter((x) => x !== tool && x.group === tool.group);
  const rest = tools.filter((x) => x !== tool && x.group !== tool.group);
  const others = same.concat(rest).slice(0, 8);
  const body = `<article class="article">
    <div class="crumb">${crumbBack('/tools')}<a href="/tools">Tools</a> › ${esc(tool.name)}</div>
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
