const assert = require('node:assert');
const { articles, pathOf, sitemapPaths, renderArticle, renderGuides, renderIndex, listing } = require('../src/articles');
const { lessons } = require('../src/lessons');

const slugs = articles.map((a) => a.slug);
assert.strictEqual(new Set(slugs).size, slugs.length, 'slugs are unique');
assert.ok(articles.length >= 50, `${articles.length} articles`);
assert.ok(articles.filter((a) => a.kind === 'guide').length >= 15, 'enough workplace guides');
assert.ok(articles.some((a) => a.slug === 'left-join') && articles.some((a) => a.slug === 'right-join'));
assert.ok(articles.some((a) => a.slug === 'datediff-age'));

for (const a of articles) {
  assert.ok(a.title && a.description && a.lede && a.short && a.slug);
  const html = a.body();
  assert.ok(html.includes('<h2>') && html.includes('<pre>'), `${a.slug} has a heading and SQL`);
  const page = renderArticle(a, lessons.find((l) => l.id === a.lesson), 'https://worksql.com');
  assert.ok(page.includes(`rel="canonical" href="https://worksql.com${pathOf(a)}"`), `${a.slug} canonical`);
  assert.ok(listing(a).href === pathOf(a));
}

assert.ok(sitemapPaths().includes('/guides') && sitemapPaths().includes('/guides/last-week-orders'));
assert.ok(renderGuides('https://worksql.com').includes('last-week-orders'));
assert.ok(renderGuides('https://worksql.com').includes('data-search=') && renderGuides('https://worksql.com').includes('id="q"'));
assert.ok(renderIndex('https://worksql.com').includes('/tsql/getdate'));
assert.ok(renderIndex('https://worksql.com').includes('data-search='));
console.log(`articles: ${articles.length} pages ok`);
