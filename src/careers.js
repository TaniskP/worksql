// Data careers: landing a first data job and growing in it. Rendered on the server like the guides.
const { esc, crumbBack } = require('./article-html');
const { page } = require('./articles');
const { searchBits, catalogIcon } = require('./search');

const CATS = ['Getting started', 'CV and portfolio', 'Applications', 'Interviews', 'First job', 'Growing'];
const CAT_BLURB = {
  'Getting started': 'Which roles use SQL, what to learn first, and routes in without a data job yet.',
  'CV and portfolio': 'Show evidence, not keywords: CV lines, projects, GitHub and LinkedIn.',
  Applications: 'Where to look, how to read adverts, take-home tests and following up.',
  Interviews: 'SQL questions, live coding, STAR answers, case studies and salary.',
  'First job': 'Your first weeks: clarifying requests, checking numbers, working safely.',
  Growing: 'From junior to mid-level: performance, pay and what to learn next.',
};

const FAQ = require('./careers-faq');

const careers = [...require('./careers-start'), ...require('./careers-work')]
  .map((a) => ({ ...a, date: '2026-11-08', faq: FAQ[a.slug] || [] }));

const faqHtml = (faq) => (faq.length ? `<h2>Questions people ask</h2>
<div class="faq-list">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>` : '');

const pathOf = (a) => `/careers/${a.slug}`;

function renderCareer(a, origin) {
  const same = careers.filter((x) => x !== a && x.cat === a.cat);
  const i = careers.indexOf(a);
  const next = careers[(i + 1) % careers.length];
  const related = [...same.slice(0, 5), ...(same.includes(next) ? [] : [next])];
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: a.title, description: a.description, datePublished: a.date, dateModified: a.date,
    articleSection: a.cat,
    author: { '@type': 'Organization', name: 'WorkSQL' },
    publisher: { '@type': 'Organization', name: 'WorkSQL', url: origin || 'https://worksql.com' },
    mainEntityOfPage: origin ? `${origin}${pathOf(a)}` : undefined,
  };
  const body = `<article class="article">
    <div class="crumb">${crumbBack('/careers')}<a href="/careers">Data careers</a> › ${esc(a.cat)}</div>
    <h1>${esc(a.title)}</h1>
    <p class="lede">${esc(a.lede)}</p>
    ${a.body()}
    ${faqHtml(a.faq)}
    <section class="try">
      <h2>Practise the work, not just the syntax</h2>
      <p>WorkSQL gives you the requests a junior analyst actually gets: a colleague emails, you write the SQL, a senior DBA checks it before it goes. Monday is free, in SQL Server, PostgreSQL or MySQL.</p>
      <a class="btn btn-primary" href="/work">Clock in free</a>
      <a class="btn btn-ghost" href="/work?mock=1" style="margin-left:8px">Take a mock interview shift</a>
    </section>
    <div class="related">More in ${esc(a.cat)}: ${related.map((x) => `<a href="${pathOf(x)}">${esc(x.title.replace(/\s*\(.*\)$/, '').replace(/:.*$/, ''))}</a>`).join('')}</div>
    <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
    ${a.faq.length ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: a.faq.map(([q, ans]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: ans } })),
  }).replace(/</g, '\\u003c')}</script>` : ''}
  </article>`;
  return page({ title: `${a.title} | WorkSQL`, description: a.description, body, canonical: origin && `${origin}${pathOf(a)}` });
}

function renderCareers(origin) {
  const sections = CATS.map((cat) => {
    const list = careers.filter((a) => a.cat === cat);
    const id = cat.toLowerCase().replace(/[^a-z]+/g, '-');
    return `<section class="g-sec" data-topic="${esc(cat)}" id="${id}">
      <header class="g-sec-head">
        <span class="g-sec-ico" aria-hidden="true">${catalogIcon('Careers')}</span>
        <div class="g-sec-copy">
          <h2>${esc(cat)} <span>${list.length} guides</span></h2>
          <p>${esc(CAT_BLURB[cat])}</p>
        </div>
      </header>
      <div class="g-grid">${list.map((a) => `<a class="g-item ref-link" href="${pathOf(a)}" data-search="${searchBits([a.title, a.short, cat].join(' '))}">
        <b>${esc(a.title)} <span aria-hidden="true">→</span></b><span>${esc(a.short)}</span></a>`).join('')}</div>
    </section>`;
  }).join('');
  const body = `<div class="g-page">
    <section class="g-hero">
      <div class="g-hero-inner">
        <p class="lib-back">${crumbBack('/')}</p>
        <div class="eyebrow">Data careers</div>
        <h1>Land your first data job</h1>
        <p class="g-lede">${careers.length} practical guides for getting into data and SQL work: what to learn, how to show it, how to interview, and how to do well once you are in.</p>
        <form class="lib-search g-search" role="search">
          <label class="visually-hidden" for="q">Search career guides</label>
          <input id="q" name="q" type="search" placeholder="Search… e.g. CV, take-home test, first week" autocomplete="off">
          <button class="btn btn-primary" type="submit">Search</button>
        </form>
      </div>
    </section>
    <div class="g-body">
      <nav class="g-tabs" aria-label="Sections">${CATS.map((cat) => `<a class="g-tab" href="#${cat.toLowerCase().replace(/[^a-z]+/g, '-')}">${esc(cat)}</a>`).join('')}</nav>
      <p class="guide-count g-count" id="catalog-count" hidden></p>
      <div id="guides">${sections}</div>
    </div>
  </div>
  <script>
    (function () {
      const box = document.getElementById('q');
      const count = document.getElementById('catalog-count');
      const apply = () => {
        const s = (box.value || '').trim().toLowerCase();
        let n = 0;
        for (const el of document.querySelectorAll('.ref-link[data-search]')) {
          el.hidden = !!s && !el.getAttribute('data-search').includes(s);
          if (!el.hidden) n++;
        }
        for (const sec of document.querySelectorAll('.g-sec')) sec.hidden = ![...sec.querySelectorAll('.ref-link')].some((c) => !c.hidden);
        count.hidden = !s;
        count.textContent = n + ' of ${careers.length} guides';
      };
      box.addEventListener('input', apply);
      box.form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
    })();
  </script>`;
  return page({
    title: 'Data careers: how to land your first data analyst job | WorkSQL',
    description: 'Practical guides for getting a junior data analyst or SQL job: skills employers want, CV and portfolio, applications, interview questions, and your first weeks.',
    body, canonical: origin && `${origin}/careers`, shell: 'guides',
  });
}

const careerPaths = () => ['/careers', ...careers.map(pathOf)];

module.exports = { careers, renderCareer, renderCareers, careerPaths, pathOf, CATS };
