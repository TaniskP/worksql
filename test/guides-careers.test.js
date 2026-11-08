// Real-life guides, the step-through widgets, and the data careers section.
const assert = require('node:assert');
const { joinDemo, slides, table } = require('../src/article-html');
const { articles, renderArticle, renderGuides, sitemapPaths } = require('../src/articles');
const enrich = require('../src/enrich');
const { careers, renderCareer, renderCareers, careerPaths, CATS } = require('../src/careers');
const { navInner } = require('../src/nav');

// ---------- the join stepper does the join correctly ----------
const L = { name: 'Customers', cols: ['id', 'name'], rows: [[1, 'Amy'], [2, 'Ben'], [3, 'Cara']] };
const R = { name: 'Orders', cols: ['order_id', 'cust'], rows: [[10, 1], [11, 1], [12, 3], [13, 9]] };
const parse = (html) => JSON.parse(html.match(/data-join="([^"]+)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const resultRows = (html) => (html.split('jd-result')[1].match(/<tr><td/g) || []).length;
const demo = (type) => joinDemo({ left: L, right: R, on: ['id', 'cust'], type, pick: ['l.name', 'r.order_id'] });

assert.strictEqual(resultRows(demo('inner')), 3, 'inner: Amy twice, Cara once');
assert.strictEqual(resultRows(demo('left')), 4, 'left: plus Ben with NULLs');
assert.strictEqual(resultRows(demo('anti')), 1, 'anti: only Ben');
assert.strictEqual(resultRows(demo('full')), 5, 'full: plus the orphan order 13');
const full = parse(demo('full'));
assert.strictEqual(full.steps.length, 4, 'one step per left row, plus one for unmatched right rows');
assert.deepStrictEqual(full.steps[0].r, [0, 1], 'Amy matches orders 10 and 11');
assert.deepStrictEqual(full.steps[3].r, [3], 'the last step is the orphan order');
assert.ok(demo('left').includes('<td class="null">NULL</td>'), 'missing matches render as NULL');
assert.ok(slides([{ title: 'a', html: table('t', ['x'], [[1]]) }, { title: 'b', html: '' }]).includes('data-n="2"'));

// ---------- guides ----------
const real = articles.filter((a) => a.date === '2026-11-08');
assert.strictEqual(real.length, 50, `50 real-life guides (${real.length})`);
for (const a of real) {
  const html = renderArticle(a, null, 'https://worksql.com');
  assert.ok(html.includes('class="plain"'), `${a.slug} opens in plain English`);
  assert.ok(html.includes('class="ask-card"'), `${a.slug} starts from a real request`);
  assert.ok(html.includes('/js/tables.js'), `${a.slug} loads the widgets`);
  assert.ok(a.title.length <= 90 && a.description.length <= 170, `${a.slug} title/description lengths`);
}
for (const slug of Object.keys(enrich)) {
  const a = articles.find((x) => x.slug === slug);
  assert.ok(a, `enrichment ${slug} has a page`);
  assert.ok(renderArticle(a, null, 'https://worksql.com').includes('class="plain"'), `${slug} gets its plain-English opener`);
}
assert.ok(Object.keys(enrich).length >= 30, 'existing pages enriched');
const joinsWithStepper = ['inner-join', 'left-join', 'left-join-is-null', 'right-join', 'full-outer-join', 'self-join', 'join-doubled-my-totals'];
for (const slug of joinsWithStepper) assert.ok(enrich[slug]().includes('data-join='), `${slug} has a join stepper`);
const guidesPage = renderGuides('https://worksql.com');
assert.ok(guidesPage.includes('Reporting') && guidesPage.includes('Cleaning'), 'new topics on the guides page');
assert.ok(sitemapPaths().includes('/guides/aged-debt-report'));

// ---------- careers ----------
assert.strictEqual(careers.length, 50, `50 career guides (${careers.length})`);
assert.strictEqual(new Set(careers.map((a) => a.slug)).size, 50, 'career slugs unique');
for (const cat of CATS) assert.ok(careers.some((a) => a.cat === cat), `${cat} has guides`);
for (const a of careers) {
  const html = renderCareer(a, 'https://worksql.com');
  assert.ok(html.includes(`rel="canonical" href="https://worksql.com/careers/${a.slug}"`), `${a.slug} canonical`);
  assert.ok((html.match(/<h2>/g) || []).length >= 3, `${a.slug} has real sections`);
  const words = (a.lede + ' ' + a.body() + ' ' + a.faq.flat().join(' ')).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  assert.ok(words >= 200, `${a.slug} is not a thin page (${words} words of its own)`);
  assert.strictEqual(a.faq.length, 3, `${a.slug} has its FAQ`);
  assert.ok(html.includes('"@type":"FAQPage"'), `${a.slug} has FAQ structured data`);
}
assert.ok(renderCareers('https://worksql.com').includes('Land your first data job'));
assert.strictEqual(careerPaths().length, 51, 'hub plus 50 pages in the sitemap');
assert.ok(navInner('https://worksql.com/careers').includes('href="/careers"'), 'Data careers is in the menu');

console.log(`guides-careers: ${real.length} real-life guides, ${Object.keys(enrich).length} enriched pages, ${careers.length} career guides ok`);
