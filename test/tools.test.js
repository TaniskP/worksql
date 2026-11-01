const assert = require('node:assert');
const { tools, renderTools, renderTool, toolPaths } = require('../src/tools');

assert.ok(tools.length >= 43, `${tools.length} tools`);
assert.strictEqual(new Set(tools.map((t) => t.slug)).size, tools.length, 'unique slugs');
const paths = toolPaths();
assert.ok(paths.includes('/tools/formatter'));
assert.ok(paths.includes('/tools/schema-diagram'));
assert.ok(paths.includes('/tools/in-list'));
assert.ok(paths.includes('/tools/sargable'));
const index = renderTools('https://worksql.com');
assert.ok(index.includes('rel="canonical" href="https://worksql.com/tools"'));
assert.ok(index.includes('Architecture'));
assert.ok(index.includes('Aggregation'));
assert.ok(index.includes('Cleaning'));
assert.ok(index.includes('Speed'));
assert.ok(index.includes('Security'));
assert.ok(index.includes('Quality of life'));
assert.ok(index.includes('/tools/schema-diagram'));
assert.ok(index.includes('/tools/in-list'));
for (const t of tools) {
  const html = renderTool(t, 'https://worksql.com');
  assert.ok(html.includes('data-tool='), t.slug);
  assert.ok(html.includes('/js/tools.js'), t.slug);
  assert.ok(html.includes('/js/tools-more.js'), t.slug);
  assert.ok(html.includes('/js/enterprise.js'), t.slug);
  assert.ok(html.includes('Clock in free'), t.slug);
  assert.ok(html.includes(`href="https://worksql.com/tools/${t.slug}"`), t.slug);
}
console.log(`tools: ${tools.length} pages ok`);
