const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { lookup } = require('../src/lookup');
const { tools } = require('../src/tools');
const { articles } = require('../src/articles');
const { excel, pandas, dialects, interview } = require('../src/hubs');

const items = lookup();
assert.ok(items.length >= tools.length + articles.length + excel.length + pandas.length + dialects.length + interview.length);
assert.ok(items.every((it) => it.kind && it.name && it.href && it.search));
assert.ok(items.some((it) => it.href === '/tools/formatter'));
assert.ok(items.some((it) => it.href === '/guides/last-week-orders'));
assert.ok(items.some((it) => it.href === '/excel-to-sql/vlookup'));
assert.ok(items.some((it) => it.href === '/interview'));

const home = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
assert.ok(home.includes('one short job from a colleague'), 'hero glosses ticket at first mention');
assert.ok(home.includes('ticket-what') && home.includes('What a ticket is worth'), 'how-a-shift explains ticket value');
assert.ok(home.includes('id="find"') && home.includes('/api/lookup'), 'homepage find bar');
assert.ok(home.includes('spot-grid') && home.includes('/guides/last-week-orders') && !home.includes('id="guide-links"'), 'homepage featured guides');
assert.ok(home.includes('id="ref-grid"') && home.includes('/tsql/getdate') && !home.includes('id="ref-links"'), 'homepage featured T-SQL');
assert.ok(!home.includes('Then it stops') && !home.includes('id="plans"'), 'homepage has no pricing wall');
assert.ok(home.includes('href="/pricing"'), 'pricing stays in the nav');

console.log(`lookup: ${items.length} items, homepage ticket + find ok`);
