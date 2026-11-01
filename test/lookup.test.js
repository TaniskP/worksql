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
assert.ok(home.includes('one short workplace task'), 'hero explains the product quickly');
assert.ok(home.includes('10 free tickets · No sign-up · Start any day'), 'free offer is explicit');
assert.ok(home.includes('Read the request. Write the query.'), 'pre-demo is short');
assert.ok(!home.includes('id="find"') && !home.includes('hero-search'), 'hero search moved out of the first screen');
assert.ok(home.includes('nav-res') && home.includes('Search tools and guides'), 'resources menu holds search');
assert.ok(home.includes('spot-grid') && home.includes('/guides/last-week-orders') && !home.includes('id="guide-links"'), 'homepage featured guides');
assert.ok(home.includes('ref-desk') && home.includes('/tsql/getdate') && !home.includes('id="ref-grid"'), 'homepage compact T-SQL example');
assert.ok(home.includes('Your first task is waiting'), 'closing invitation');
assert.ok(!home.includes('Then it stops') && !home.includes('id="plans"'), 'homepage has no pricing wall');
assert.ok(home.includes('href="/pricing"'), 'pricing stays in the nav');
assert.ok(home.includes('Workplace practice') && home.includes('Guided lessons'), 'two starting routes named');
assert.ok(home.includes('09:14') && !home.includes('toLocaleTimeString'), 'hero clock matches the request due by ten');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'app.css'), 'utf8');
assert.ok(css.includes('.spot-card[hidden]') && css.includes('display: none'), 'filtered cards can actually hide');

const { plans } = require('../src/plans');
const yearly = plans.find((p) => p.id === 'yearly');
assert.ok(yearly.summary.includes('£6.58') && yearly.summary.includes('34%'), 'yearly savings match £79');

console.log(`lookup: ${items.length} items, homepage journey ok`);
