// Crawlable comparison hubs: Excel → T-SQL, Pandas → T-SQL, dialects, interview prompts.
const { page } = require('./articles');
const { esc, sql } = require('./article-html');
const { catalogSearch, searchBits } = require('./search');
const excel = require('./excel-pages');
const pandas = require('./pandas-pages');
const dialects = require('./dialect-pages');
const interview = require('./interview-pages');

const copy = (id) => `<button class="btn btn-ghost" type="button" data-copy="${id}">Copy</button>`;

function cards(items, hrefOf) {
  return `<div class="ref-links">${items.map((it) => `<a class="ref-link" href="${hrefOf(it)}" data-search="${searchBits(it.name + ' ' + it.short + ' ' + it.slug + ' ' + (it.title || ''))}"><b>${esc(it.name)}</b><span>${esc(it.short)}</span></a>`).join('')}</div>`;
}

function promo() {
  return `<section class="try">
    <h2>Then write it on a ticket</h2>
    <p>Monday is free. A colleague asks, you type, we mark it.</p>
    <a class="btn btn-primary" href="/work">Clock in free</a>
  </section>`;
}

function jsonData(obj) {
  return `<script type="application/json" id="hub-data">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

function renderConvert(origin) {
  const body = `<article class="article">
    <div class="crumb"><a href="/tools">Tools</a> › Convert</div>
    <h1>Excel, Pandas, and SQL dialect converters</h1>
    <p class="lede">One URL per function, method, or dialect. Paste in the browser. We do not upload it. Then write the same idea on a Harbour &amp; Co ticket.</p>
    ${catalogSearch({ placeholder: 'VLOOKUP, groupby, LIMIT, QUALIFY…', total: excel.length + pandas.length + dialects.length, noun: 'converters' })}
    <h2>Excel → T-SQL</h2>
    <p>VLOOKUP is a JOIN. IF is CASE. ${excel.length} function pages.</p>
    ${cards(excel, (it) => `/excel-to-sql/${it.slug}`)}
    <h2>Pandas → T-SQL</h2>
    <p>merge is JOIN. groupby is GROUP BY. fillna is ISNULL. ${pandas.length} method pages.</p>
    ${cards(pandas, (it) => `/pandas-to-sql/${it.slug}`)}
    <h2>SQL dialects</h2>
    <p>LIMIT, IFNULL, NVL, QUALIFY — rewritten for SQL Server, and two the other way.</p>
    ${cards(dialects, (it) => `/sql-translator/${it.slug}`)}
    <h2>Interview prompts</h2>
    <p>Top N per group, running totals, anti-joins. Draft in the box. Reveal a worked answer.</p>
    <p><a class="btn btn-ghost" href="/interview">SQL interview sandbox</a></p>
    ${promo()}
  </article>`;
  return page({ title: 'Excel, Pandas, and SQL dialect converters | WorkSQL', description: 'Free Excel to T-SQL, Pandas to SQL Server, and MySQL / PostgreSQL / Oracle / Snowflake translators. One page per function. Runs in the browser.', body, canonical: origin && `${origin}/convert` });
}

function renderExcelIndex(origin) {
  const body = `<article class="article">
    <div class="crumb"><a href="/convert">Convert</a> › Excel → T-SQL</div>
    <h1>Excel to T-SQL translation hub</h1>
    <p class="lede">Paste a formula on the function’s page. JavaScript writes the T-SQL — JOIN, CASE, STRING_AGG. ${excel.length} pages. Nothing is uploaded.</p>
    ${catalogSearch({ placeholder: 'VLOOKUP, IFERROR, COUNTIF, SUMPRODUCT…', total: excel.length, noun: 'functions' })}
    ${cards(excel, (it) => `/excel-to-sql/${it.slug}`)}
    ${promo()}
  </article>`;
  return page({ title: 'Excel to T-SQL: VLOOKUP, IF, COUNTIF, SUMPRODUCT | WorkSQL', description: 'Translate Excel formulas to SQL Server. VLOOKUP → LEFT JOIN, IF → CASE, COUNTIF → SUM(CASE). One crawlable page per function.', body, canonical: origin && `${origin}/excel-to-sql` });
}

function renderExcelPage(it, origin) {
  const others = excel.filter((x) => x !== it).slice(0, 8);
  const body = `<article class="article">
    <div class="crumb"><a href="/excel-to-sql">Excel → T-SQL</a> › ${esc(it.name)}</div>
    <h1>${esc(it.title)}</h1>
    <p class="lede">${esc(it.lede)}</p>
    <div class="tool" data-hub="excel">
      <label>Excel formula</label>
      <textarea id="hub-in" rows="4" spellcheck="false">${esc(it.sample)}</textarea>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="hub-run">Translate</button> ${copy('hub-out')}</div>
      <label>T-SQL</label>
      <pre class="tool-out"><code id="hub-out">${esc(it.tsql)}</code></pre>
    </div>
    ${jsonData({ kind: 'excel', slug: it.slug, tsql: it.tsql })}
    <p>${esc(it.note)}</p>
    <h2>Canonical translation</h2>
    ${sql(it.tsql)}
    ${promo()}
    <div class="related">More Excel → SQL: ${others.map((x) => `<a href="/excel-to-sql/${x.slug}">${esc(x.name)}</a>`).join('')}</div>
  </article>
  <script type="module" src="/js/tools.js"></script>
  <script type="module" src="/js/hubs.js"></script>`;
  return page({ title: `${it.title} | WorkSQL`, description: it.description, body, canonical: origin && `${origin}/excel-to-sql/${it.slug}` });
}

function renderPandasIndex(origin) {
  const body = `<article class="article">
    <div class="crumb"><a href="/convert">Convert</a> › Pandas → T-SQL</div>
    <h1>Pandas to SQL Server translation hub</h1>
    <p class="lede">Notebook habits, written as T-SQL. merge, groupby, fillna, drop_duplicates, loc. ${pandas.length} pages. Runs in the browser.</p>
    ${catalogSearch({ placeholder: 'merge, groupby, fillna, drop_duplicates…', total: pandas.length, noun: 'methods' })}
    ${cards(pandas, (it) => `/pandas-to-sql/${it.slug}`)}
    ${promo()}
  </article>`;
  return page({ title: 'Pandas to SQL Server: merge, groupby, fillna | WorkSQL', description: 'Translate Pandas to T-SQL. merge → JOIN, groupby → GROUP BY, fillna → ISNULL, drop_duplicates → ROW_NUMBER. One page per method.', body, canonical: origin && `${origin}/pandas-to-sql` });
}

function renderPandasPage(it, origin) {
  const others = pandas.filter((x) => x !== it).slice(0, 8);
  const body = `<article class="article">
    <div class="crumb"><a href="/pandas-to-sql">Pandas → T-SQL</a> › ${esc(it.name)}</div>
    <h1>${esc(it.title)}</h1>
    <p class="lede">${esc(it.lede)}</p>
    <div class="tool" data-hub="pandas">
      <label>Pandas</label>
      <textarea id="hub-in" rows="5" spellcheck="false">${esc(it.sample)}</textarea>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="hub-run">Translate</button> ${copy('hub-out')}</div>
      <label>T-SQL</label>
      <pre class="tool-out"><code id="hub-out">${esc(it.tsql)}</code></pre>
    </div>
    ${jsonData({ kind: 'pandas', slug: it.slug, tsql: it.tsql })}
    <p>${esc(it.note)}</p>
    <h2>Canonical translation</h2>
    ${sql(it.tsql)}
    ${promo()}
    <div class="related">More Pandas → SQL: ${others.map((x) => `<a href="/pandas-to-sql/${x.slug}">${esc(x.name)}</a>`).join('')}</div>
  </article>
  <script type="module" src="/js/tools.js"></script>
  <script type="module" src="/js/hubs.js"></script>`;
  return page({ title: `${it.title} | WorkSQL`, description: it.description, body, canonical: origin && `${origin}/pandas-to-sql/${it.slug}` });
}

function renderDialectIndex(origin) {
  const body = `<article class="article">
    <div class="crumb"><a href="/convert">Convert</a> › SQL translator</div>
    <h1>SQL dialect cross-translator</h1>
    <p class="lede">MySQL LIMIT, Postgres ILIKE, Oracle NVL, Snowflake QUALIFY — rewritten for SQL Server. Two pages go the other way. Paste; we swap the usual functions.</p>
    ${catalogSearch({ placeholder: 'LIMIT, IFNULL, NVL, QUALIFY, ILIKE…', total: dialects.length, noun: 'dialects' })}
    ${cards(dialects, (it) => `/sql-translator/${it.slug}`)}
    ${promo()}
  </article>`;
  return page({ title: 'SQL dialect translator: MySQL, Postgres, Oracle, Snowflake to T-SQL | WorkSQL', description: 'Convert MySQL, PostgreSQL, Oracle, Snowflake and BigQuery SQL to SQL Server. LIMIT → TOP, IFNULL → ISNULL, QUALIFY → subquery. In the browser.', body, canonical: origin && `${origin}/sql-translator` });
}

function renderDialectPage(it, origin) {
  const others = dialects.filter((x) => x !== it);
  const rows = it.maps.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('');
  const body = `<article class="article">
    <div class="crumb"><a href="/sql-translator">SQL translator</a> › ${esc(it.name)}</div>
    <h1>${esc(it.title)}</h1>
    <p class="lede">${esc(it.lede)}</p>
    <div class="tool" data-hub="dialect" data-pair="${esc(it.slug)}">
      <label>${esc(it.from)} SQL</label>
      <textarea id="hub-in" rows="8" spellcheck="false">${esc(it.sample)}</textarea>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="hub-run">Translate</button> ${copy('hub-out')}</div>
      <label>Output</label>
      <pre class="tool-out"><code id="hub-out"></code></pre>
    </div>
    ${jsonData({ kind: 'dialect', slug: it.slug })}
    <h2>Usual swaps</h2>
    <div class="grid-wrap"><table class="tool-grid"><thead><tr><th>${esc(it.from)}</th><th>SQL Server</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p>${esc(it.note)}</p>
    ${promo()}
    <div class="related">More dialects: ${others.map((x) => `<a href="/sql-translator/${x.slug}">${esc(x.name)}</a>`).join('')}</div>
  </article>
  <script type="module" src="/js/tools.js"></script>
  <script type="module" src="/js/hubs.js"></script>`;
  return page({ title: `${it.title} | WorkSQL`, description: it.description, body, canonical: origin && `${origin}/sql-translator/${it.slug}` });
}

function renderInterviewIndex(origin) {
  const body = `<article class="article">
    <div class="crumb"><a href="/tools">Tools</a> › Interview</div>
    <h1>SQL interview sandbox</h1>
    <p class="lede">${interview.length} prompts the desk actually uses: top N per group, running totals, anti-joins, the LEFT JOIN WHERE trap. Draft T-SQL in the box. Reveal a worked answer. We do not run it here — Monday on Harbour &amp; Co does.</p>
    ${catalogSearch({ placeholder: 'Top N, running total, anti-join, median…', total: interview.length, noun: 'prompts' })}
    ${cards(interview, (it) => `/interview/${it.slug}`)}
    ${promo()}
  </article>`;
  return page({ title: 'SQL interview questions with a T-SQL editor | WorkSQL', description: 'Free SQL interview practice: top N per group, running totals, duplicates, gaps and islands, median, recursive CTE. Draft T-SQL, reveal a worked answer.', body, canonical: origin && `${origin}/interview` });
}

function renderInterviewPage(it, origin) {
  const others = interview.filter((x) => x !== it).slice(0, 8);
  const body = `<article class="article">
    <div class="crumb"><a href="/interview">Interview</a> › ${esc(it.name)}</div>
    <h1>${esc(it.title)}</h1>
    <p class="lede">${esc(it.lede)}</p>
    <div class="tool" data-hub="interview">
      <p><b>Prompt.</b> ${esc(it.prompt)}</p>
      <p class="muted-note">Hint: ${esc(it.hint)}</p>
      <label>Your T-SQL</label>
      <textarea id="iv-in" rows="10" spellcheck="false" placeholder="SELECT …"></textarea>
      <div class="tool-actions"><button class="btn btn-primary" type="button" id="iv-reveal">Reveal a worked answer</button> ${copy('iv-out')}</div>
      <pre class="tool-out" id="iv-box" hidden><code id="iv-out">${esc(it.answer)}</code></pre>
    </div>
    <p>${esc(it.note)}</p>
    ${promo()}
    <div class="related">More prompts: ${others.map((x) => `<a href="/interview/${x.slug}">${esc(x.name)}</a>`).join('')}</div>
  </article>
  <script type="module" src="/js/tools.js"></script>
  <script type="module" src="/js/hubs.js"></script>`;
  return page({ title: `${it.title} | WorkSQL`, description: it.description, body, canonical: origin && `${origin}/interview/${it.slug}` });
}

function hubPaths() {
  return [
    '/convert',
    '/excel-to-sql', ...excel.map((it) => `/excel-to-sql/${it.slug}`),
    '/pandas-to-sql', ...pandas.map((it) => `/pandas-to-sql/${it.slug}`),
    '/sql-translator', ...dialects.map((it) => `/sql-translator/${it.slug}`),
    '/interview', ...interview.map((it) => `/interview/${it.slug}`),
  ];
}

function matchHub(p, origin) {
  if (p === '/convert') return renderConvert(origin);
  if (p === '/excel-to-sql') return renderExcelIndex(origin);
  if (p === '/pandas-to-sql') return renderPandasIndex(origin);
  if (p === '/sql-translator') return renderDialectIndex(origin);
  if (p === '/interview') return renderInterviewIndex(origin);
  let m = p.match(/^\/excel-to-sql\/([a-z0-9-]+)$/);
  if (m) {
    const it = excel.find((x) => x.slug === m[1]);
    return it && renderExcelPage(it, origin);
  }
  m = p.match(/^\/pandas-to-sql\/([a-z0-9-]+)$/);
  if (m) {
    const it = pandas.find((x) => x.slug === m[1]);
    return it && renderPandasPage(it, origin);
  }
  m = p.match(/^\/sql-translator\/([a-z0-9-]+)$/);
  if (m) {
    const it = dialects.find((x) => x.slug === m[1]);
    return it && renderDialectPage(it, origin);
  }
  m = p.match(/^\/interview\/([a-z0-9-]+)$/);
  if (m) {
    const it = interview.find((x) => x.slug === m[1]);
    return it && renderInterviewPage(it, origin);
  }
  return null;
}

module.exports = {
  excel, pandas, dialects, interview,
  renderConvert, renderExcelIndex, renderPandasIndex, renderDialectIndex, renderInterviewIndex,
  matchHub, hubPaths,
};
