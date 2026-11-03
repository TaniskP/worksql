// Crawlable comparison hubs: Excel → T-SQL, Pandas → T-SQL, dialects, interview prompts.
const { page } = require('./articles');
const { esc, sql, crumbBack } = require('./article-html');
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

const CONVERT_SECTIONS = [
  {
    id: 'Excel',
    title: 'Excel → T-SQL',
    blurb: 'Excel functions, rewritten for SQL Server.',
    href: '/excel-to-sql',
    logo: '/img/excel_logo.png',
    logoAlt: 'Excel',
    featured: ['vlookup', 'if', 'sumifs'],
    items: () => excel,
    hrefOf: (it) => `/excel-to-sql/${it.slug}`,
  },
  {
    id: 'Pandas',
    title: 'Pandas → T-SQL',
    blurb: 'Common pandas methods, rewritten for SQL Server.',
    href: '/pandas-to-sql',
    logo: '/img/python_logo.png',
    logoAlt: 'Python',
    featured: ['merge', 'groupby', 'drop-duplicates'],
    items: () => pandas,
    hrefOf: (it) => `/pandas-to-sql/${it.slug}`,
  },
  {
    id: 'SQL dialects',
    title: 'SQL dialects',
    blurb: 'Rewrite common syntax between SQL Server and other databases.',
    href: '/sql-translator',
    icon: 'db',
    featured: ['mysql-to-tsql', 'oracle-to-tsql', 'tsql-to-postgresql'],
    items: () => dialects,
    hrefOf: (it) => `/sql-translator/${it.slug}`,
  },
];

const DB_ICO = '<svg viewBox="0 0 32 32" fill="none" width="28" height="28"><ellipse cx="16" cy="7" rx="11" ry="4" fill="#1f5eff"/><path d="M5 7v18c0 2.2 4.9 4 11 4s11-1.8 11-4V7c0 2.2-4.9 4-11 4S5 9.2 5 7Z" fill="#1f5eff" opacity=".75"/></svg>';
const CODE_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><path d="M8 6l-5 6 5 6M16 6l5 6-5 6"/></svg>';
const BAG_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

function featuredConvert(sec) {
  const list = sec.items();
  const bySlug = new Map(list.map((it) => [it.slug, it]));
  const out = [];
  for (const slug of sec.featured) {
    const it = bySlug.get(slug);
    if (it) out.push(it);
  }
  for (const it of list) {
    if (out.length >= 3) break;
    if (!out.includes(it)) out.push(it);
  }
  return out.slice(0, 3);
}

function renderConvert(origin) {
  const total = excel.length + pandas.length + dialects.length;
  const tabs = `<div class="g-tabs" id="catalog-chips" role="tablist">
    <button type="button" class="g-tab" data-chip="All" aria-pressed="true">All (${total})</button>
    ${CONVERT_SECTIONS.map((s) => `<button type="button" class="g-tab" data-chip="${esc(s.id)}" aria-pressed="false">${esc(s.id === 'SQL dialects' ? 'SQL dialects' : s.id)} (${s.items().length})</button>`).join('')}
    <button type="button" class="g-tab" data-chip="Interview" aria-pressed="false">Interview (1)</button>
  </div>`;

  const sections = CONVERT_SECTIONS.map((sec) => {
    const list = sec.items();
    const featured = featuredConvert(sec);
    const ordered = featured.concat(list.filter((it) => !featured.includes(it)));
    const logo = sec.logo
      ? `<img class="g-sec-logo" src="${esc(sec.logo)}" alt="${esc(sec.logoAlt)}" width="40" height="40">`
      : `<span class="g-sec-ico" aria-hidden="true">${DB_ICO}</span>`;
    const cardsHtml = ordered.map((it, i) => {
      const more = i >= 3 ? ' g-more' : '';
      const search = searchBits([it.name, it.short, it.slug, it.title || '', sec.id].join(' '));
      return `<a class="g-item ref-link${more}" href="${esc(sec.hrefOf(it))}" data-search="${search}" data-cat="${esc(sec.id)}">
        <b>${esc(it.name)} <span aria-hidden="true">→</span></b>
        <span>${esc(it.short)}</span>
      </a>`;
    }).join('');
    return `<section class="g-sec" data-topic="${esc(sec.id)}">
      <header class="g-sec-head g-sec-head-tools">
        ${logo}
        <div class="g-sec-copy">
          <h2>${esc(sec.title)} <span>${list.length} converter${list.length === 1 ? '' : 's'}</span></h2>
          <p>${esc(sec.blurb)}</p>
        </div>
        <div class="g-sec-aside">
          <a class="g-viewall" href="${esc(sec.href)}">View all ${list.length} →</a>
        </div>
      </header>
      <div class="g-grid">${cardsHtml}</div>
    </section>`;
  }).join('');

  const foot = `<div class="g-dual" data-topic="Interview">
    <aside class="g-cta">
      <span class="g-cta-ico" aria-hidden="true">${CODE_ICO}</span>
      <h2>Interview prompts</h2>
      <p>Top N per group, running totals, anti-joins. Draft T-SQL in the box. Reveal a worked answer.</p>
      <a class="btn btn-ghost" href="/interview">SQL interview sandbox →</a>
    </aside>
    <aside class="g-cta g-cta-strong">
      <span class="g-cta-ico" aria-hidden="true">${BAG_ICO}</span>
      <h2>Then write it on a ticket</h2>
      <p>10 free tickets. A colleague asks, you type, we mark it.</p>
      <a class="btn btn-primary" href="/work">Clock in free →</a>
    </aside>
  </div>`;

  const body = `<div class="g-page">
    <section class="g-hero">
      <div class="g-hero-inner">
        <div class="crumb g-crumb">${crumbBack('/tools')}<a href="/tools">Tools</a> › Convert</div>
        <h1>Excel, Pandas, and SQL dialect converters</h1>
        <p class="g-lede">One URL per function, method, or dialect. Paste in the browser. We do not upload it. Then write the same idea on a Harbour &amp; Co ticket.</p>
        <form class="lib-search g-search" role="search">
          <label class="visually-hidden" for="q">Search converters</label>
          <input id="q" name="q" type="search" placeholder="Search converters… e.g. VLOOKUP, merge, LIMIT, QUALIFY" autocomplete="off">
          <button class="btn btn-primary" type="submit">Search</button>
        </form>
      </div>
    </section>
    <div class="g-body">
      ${tabs}
      <p class="guide-count g-count" id="catalog-count" hidden>${total} converters</p>
      <div id="convert">${sections}</div>
      ${foot}
    </div>
  </div>
  <script>
    (function () {
      const box = document.getElementById('q');
      const count = document.getElementById('catalog-count');
      const chips = document.getElementById('catalog-chips');
      const total = ${total};
      const apply = () => {
        const cards = [...document.querySelectorAll('#convert .ref-link[data-search]')];
        const s = (box.value || '').trim().toLowerCase();
        const chip = chips && [...chips.querySelectorAll('.g-tab')].find((b) => b.getAttribute('aria-pressed') === 'true');
        const cat = chip && chip.getAttribute('data-chip');
        const want = cat && cat !== 'All' ? cat : '';
        const searching = !!s;
        const interviewOnly = want === 'Interview';
        let n = 0;
        for (const el of cards) {
          const text = !s || (el.getAttribute('data-search') || '').includes(s);
          const topic = !want || want === 'Interview' || el.getAttribute('data-cat') === want;
          const preview = !want && !searching && el.classList.contains('g-more');
          const on = !interviewOnly && text && topic && !preview;
          el.hidden = !on;
          if (!interviewOnly && text && topic) n++;
        }
        for (const sec of document.querySelectorAll('#convert .g-sec')) {
          if (interviewOnly) { sec.hidden = true; continue; }
          const topic = sec.getAttribute('data-topic');
          const matchTopic = !want || topic === want;
          const any = [...sec.querySelectorAll('.ref-link')].some((c) => !c.hidden);
          sec.hidden = !(matchTopic && any);
        }
        const dual = document.querySelector('.g-dual');
        if (dual) {
          dual.hidden = false;
          dual.classList.toggle('g-dual-only', interviewOnly);
        }
        if (count) {
          count.hidden = !(s || (want && want !== 'All' && want !== 'Interview'));
          count.textContent = interviewOnly ? 'Interview sandbox' : ((s || want) ? n + ' of ' + total + ' converters' : total + ' converters');
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
  return page({ title: 'Excel, Pandas, and SQL dialect converters | WorkSQL', description: 'Free Excel to T-SQL, Pandas to SQL Server, and MySQL / PostgreSQL / Oracle / Snowflake translators. One page per function. Runs in the browser.', body, canonical: origin && `${origin}/convert`, shell: 'tools' });
}

function renderExcelIndex(origin) {
  const body = `<article class="article">
    <div class="crumb">${crumbBack('/convert')}<a href="/convert">Convert</a> › Excel → T-SQL</div>
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
    <div class="crumb">${crumbBack('/excel-to-sql')}<a href="/excel-to-sql">Excel → T-SQL</a> › ${esc(it.name)}</div>
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
    <div class="crumb">${crumbBack('/convert')}<a href="/convert">Convert</a> › Pandas → T-SQL</div>
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
    <div class="crumb">${crumbBack('/pandas-to-sql')}<a href="/pandas-to-sql">Pandas → T-SQL</a> › ${esc(it.name)}</div>
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
    <div class="crumb">${crumbBack('/convert')}<a href="/convert">Convert</a> › SQL translator</div>
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
    <div class="crumb">${crumbBack('/sql-translator')}<a href="/sql-translator">SQL translator</a> › ${esc(it.name)}</div>
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
  const total = interview.length;
  const cardsHtml = interview.map((it) => {
    const search = searchBits([it.name, it.short, it.slug, it.title || '', it.prompt || ''].join(' '));
    return `<a class="iv-card ref-link" href="/interview/${esc(it.slug)}" data-search="${search}">
      <b>${esc(it.name)}</b>
      <span>${esc(it.short)}</span>
      <em class="g-arrow" aria-hidden="true">→</em>
    </a>`;
  }).join('');

  const body = `<div class="g-page">
    <section class="g-hero">
      <div class="g-hero-inner">
        <div class="crumb g-crumb">${crumbBack('/tools')}<a href="/tools">Tools</a> › Interview</div>
        <h1>SQL interview sandbox</h1>
        <p class="g-lede">${total} prompts the desk actually uses: top N per group, running totals, anti-joins, the LEFT JOIN WHERE trap. Draft T-SQL in the box. Reveal a worked answer. We do not run it here — Monday on Harbour &amp; Co does.</p>
        <form class="lib-search g-search" role="search">
          <label class="visually-hidden" for="q">Search prompts</label>
          <input id="q" name="q" type="search" placeholder="Search prompts… e.g. top N, running total, anti-join" autocomplete="off">
          <button class="btn btn-primary" type="submit">Search</button>
        </form>
        <div class="iv-mock">
          <div><b>Interview tomorrow?</b> Take a timed mock shift: real tickets, no walkthroughs, marked strictly, with a score at the end.</div>
          <a class="btn btn-primary" href="/work?mock=1">Start a mock shift <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
    <div class="g-body">
      <div class="iv-meta">
        <p class="guide-count" id="catalog-count">${total} prompts</p>
        <div class="iv-view" role="group" aria-label="Layout">
          <button type="button" class="iv-view-btn" data-view="grid" aria-pressed="true">Grid</button>
          <button type="button" class="iv-view-btn" data-view="list" aria-pressed="false">List</button>
        </div>
      </div>
      <div class="iv-grid" id="interview">${cardsHtml}</div>
      <aside class="iv-foot">
        <div>
          <h2>Then write it on a ticket</h2>
          <p>10 free tickets. A colleague asks, you type, we mark it.</p>
        </div>
        <a class="btn btn-primary btn-lg" href="/work">Clock in free <span aria-hidden="true">→</span></a>
      </aside>
    </div>
  </div>
  <script>
    (function () {
      const box = document.getElementById('q');
      const count = document.getElementById('catalog-count');
      const grid = document.getElementById('interview');
      const total = ${total};
      const apply = () => {
        const cards = [...grid.querySelectorAll('.ref-link[data-search]')];
        const s = (box.value || '').trim().toLowerCase();
        let n = 0;
        for (const el of cards) {
          const on = !s || (el.getAttribute('data-search') || '').includes(s);
          el.hidden = !on;
          if (on) n++;
        }
        count.textContent = s ? n + ' of ' + total + ' prompts' : total + ' prompts';
      };
      box.addEventListener('input', apply);
      box.form && box.form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
      document.querySelector('.iv-view').addEventListener('click', (e) => {
        const b = e.target.closest('.iv-view-btn');
        if (!b) return;
        for (const x of document.querySelectorAll('.iv-view-btn')) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        }
        grid.classList.toggle('iv-grid-list', b.getAttribute('data-view') === 'list');
      });
      const boot = () => {
        const q = new URLSearchParams(location.search).get('q');
        if (q) { box.value = q; apply(); }
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else boot();
    })();
  </script>`;
  return page({ title: 'SQL interview questions with a T-SQL editor | WorkSQL', description: 'Free SQL interview practice: top N per group, running totals, duplicates, gaps and islands, median, recursive CTE. Draft T-SQL, reveal a worked answer.', body, canonical: origin && `${origin}/interview`, shell: 'tools' });
}

function renderInterviewPage(it, origin) {
  const others = interview.filter((x) => x !== it).slice(0, 8);
  const body = `<article class="article">
    <div class="crumb">${crumbBack('/interview')}<a href="/interview">Interview</a> › ${esc(it.name)}</div>
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
