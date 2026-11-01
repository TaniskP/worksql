const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { tools, renderTools, renderTool } = require('../src/tools');
const { matchHub, hubPaths, excel, pandas, dialects, interview } = require('../src/hubs');
const { renderGuides } = require('../src/articles');
const { items } = require('../src/nav');

const navNeedles = ['>Guides<', '>Free tools<', '>Convert<', '>Interview<'];
function hasNav(html, where) {
  for (const n of navNeedles) assert.ok(html.includes(n), `${where} missing ${n}`);
  assert.ok(html.includes('class="nav-more"'), `${where} missing mobile menu`);
}

const toolsHtml = renderTools('https://worksql.com');
const guidesHtml = renderGuides('https://worksql.com');
const convertHtml = matchHub('/convert', 'https://worksql.com');
hasNav(toolsHtml, '/tools');
hasNav(guidesHtml, '/guides');
hasNav(convertHtml, '/convert');
hasNav(matchHub('/interview', 'https://worksql.com'), '/interview');
assert.ok(toolsHtml.includes('data-search=') && toolsHtml.includes('id="q"') && toolsHtml.includes('DOMContentLoaded'), '/tools catalog search');
assert.ok(toolsHtml.includes('class="lib"') && toolsHtml.includes('lib-card') && toolsHtml.includes('lib-chip'), '/tools library layout');
assert.ok(guidesHtml.includes('data-search=') && guidesHtml.includes('id="q"'), '/guides catalog search');
assert.ok(guidesHtml.includes('class="lib"') && guidesHtml.includes('lib-card') && guidesHtml.includes('lib-chip'), '/guides library layout');
assert.ok(convertHtml.includes('data-search=') && convertHtml.includes('id="q"'), '/convert catalog search');
assert.ok(matchHub('/interview', 'https://worksql.com').includes('id="q"'), '/interview catalog search');
assert.ok(matchHub('/pandas-to-sql', 'https://worksql.com').includes('id="q"'), '/pandas catalog search');
hasNav(matchHub('/excel-to-sql/vlookup', 'https://worksql.com'), '/excel-to-sql/vlookup');
assert.strictEqual(items.length, 6);

const gates = (file) => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', file), 'utf8');
  return [...src.matchAll(/if \(\$\('([^']+)'\)\)/g)].map((m) => m[1]);
};

const allToolHtml = tools.map((t) => renderTool(t, 'https://worksql.com')).join('\n');
hasNav(allToolHtml, 'a tool page');
for (const id of [...gates('tools-more.js'), ...gates('enterprise.js')]) {
  assert.ok(allToolHtml.includes(`id="${id}"`), `tool HTML missing #${id} (JS will never bind)`);
}
for (const id of ['fmt-in', 'fmt-run', 'fmt-out', 'dt-fn', 'mk-run', 'lk-run', 'w-fn', 'w-grid']) {
  assert.ok(allToolHtml.includes(`id="${id}"`), `core tool missing #${id}`);
}

for (const t of tools) {
  const html = renderTool(t, 'https://worksql.com');
  assert.ok(/data-tool="[^"]+"/.test(html), t.slug);
  const copies = [...html.matchAll(/data-copy="([^"]+)"/g)].map((m) => m[1]);
  for (const id of copies) assert.ok(html.includes(`id="${id}"`), `${t.slug} copy target #${id} missing`);
}

for (const p of hubPaths()) {
  const html = matchHub(p, 'https://worksql.com');
  assert.ok(html, p);
  hasNav(html, p);
  if (p === '/convert' || p === '/excel-to-sql' || p === '/pandas-to-sql' || p === '/sql-translator' || p === '/interview') continue;
  if (p.startsWith('/interview/')) {
    assert.ok(html.includes('id="iv-in"') && html.includes('id="iv-reveal"') && html.includes('id="iv-out"'), p);
    continue;
  }
  assert.ok(html.includes('id="hub-in"') && html.includes('id="hub-out"') && html.includes('id="hub-run"'), p);
  assert.ok(html.includes('id="hub-data"'), p);
  const data = html.match(/id="hub-data">([^<]*)/);
  if (data) {
    const meta = JSON.parse(data[1].replace(/\\u003c/g, '<'));
    assert.ok(meta.kind, p);
  }
}

assert.ok(excel.length + pandas.length + dialects.length + interview.length + 5 === hubPaths().length);

console.log(`nav-widgets: ${tools.length} tools, ${hubPaths().length} hubs, nav + ids ok`);
