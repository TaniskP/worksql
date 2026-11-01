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
assert.ok(home.includes('Realistic data requests from colleagues: read the email, write the T-SQL, get feedback'), 'hero explains the product quickly');
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
assert.ok(!home.includes('toLocaleTimeString'), 'no live clock fighting the calm hero');

// First screen: the Harbour & Co desk, one headline in one colour, Clock in beside Guided lessons.
const hero = home.slice(home.indexOf('class="hero-body"'), home.indexOf('</section>'));
assert.ok(hero.includes('Harbour &amp; Co · 09:14 · 1 new message'), 'fixed 09:14 desk eyebrow');
assert.ok(hero.includes('A ticket lands.') && !hero.includes('Harvey'), 'calm concrete headline');
assert.ok(!hero.includes('class="blue"') && !hero.includes('hero-points') && !hero.includes('hero-search'), 'no split headline, feature row or search in the hero');
assert.strictEqual((hero.match(/href="\/work\?go=1"/g) || []).length, 1, 'one Clock in, straight past the arrival screen');
assert.ok(/class="hero-ctas"[\s\S]*href="\/lessons" class="btn btn-ghost/.test(hero), 'Guided lessons as a button beside Clock in');

// Order: demo, week, library, then the shorter SEO prose, then the close.
const at = (id) => home.indexOf(`id="${id}"`);
assert.ok(at('shift') < at('guides') && at('guides') < at('tsql') && at('tsql') < at('practise') && at('practise') < at('start'), 'demo, library, prose, close');
const prose = home.slice(at('practise'), at('start'));
for (const href of ['/guides', '/tools', '/convert', '/interview']) assert.ok(prose.includes(`href="${href}"`), `prose links to ${href}`);
assert.ok(home.includes('<div class="eyebrow">How a shift works</div>'), 'demo eyebrow');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'app.css'), 'utf8');
assert.ok(css.includes('.spot-card[hidden]') && css.includes('display: none'), 'filtered cards can actually hide');

const { plans } = require('../src/plans');
const yearly = plans.find((p) => p.id === 'yearly');
assert.ok(yearly.summary.includes('£6.58') && yearly.summary.includes('34%'), 'yearly savings match £79');

console.log(`lookup: ${items.length} items, homepage journey ok`);
