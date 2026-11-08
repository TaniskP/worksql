// Shared public header and footer. Keep the static HTML pages in step with navInner / footerInner.
const items = [
  ['/lessons', 'Guided lessons'],
  ['/pricing', 'Pricing'],
];

const resources = [
  ['/guides', 'Guides'],
  ['/tsql', 'T-SQL reference'],
  ['/tools', 'Free tools'],
  ['/convert', 'Convert'],
  ['/interview', 'Interview'],
  ['/careers', 'Data careers'],
];

const footerItems = [
  ['/work', 'Workplace practice'],
  ['/lessons', 'Guided lessons'],
  ['/guides', 'Guides'],
  ['/tsql', 'T-SQL reference'],
  ['/pricing', 'Pricing'],
  ['/support', 'Support'],
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
];

function isOn(href, active) {
  return active === href || (active && href !== '/' && active.startsWith(href));
}

const link = (href, label, active) => `<a href="${href}"${isOn(href, active) ? ' aria-current="page"' : ''}>${label}</a>`;

function activeOf(canonical) {
  if (!canonical) return '';
  let p = canonical;
  try { p = new URL(canonical).pathname; } catch { /* path already */ }
  if (p.startsWith('/excel-to-sql') || p.startsWith('/pandas-to-sql') || p.startsWith('/sql-translator') || p === '/convert') return '/convert';
  if (p.startsWith('/interview')) return '/interview';
  if (p.startsWith('/careers')) return '/careers';
  if (p.startsWith('/tools')) return '/tools';
  if (p.startsWith('/guides')) return '/guides';
  if (p.startsWith('/tsql')) return '/tsql';
  if (p.startsWith('/lessons') || p.startsWith('/lesson')) return '/lessons';
  if (p.startsWith('/pricing')) return '/pricing';
  if (p.startsWith('/support') || p.startsWith('/privacy') || p.startsWith('/terms')) return p;
  return p;
}

function resourceMenu(active, searchId) {
  const on = resources.some(([href]) => isOn(href, active));
  return `<details class="nav-res"${on ? ' data-on' : ''}>
        <summary>Resources</summary>
        <div class="nav-res-list">
          <form class="nav-res-find" action="/guides" method="get" role="search">
            <label class="visually-hidden" for="${searchId}">Search tools and guides</label>
            <input id="${searchId}" name="q" type="search" placeholder="Search tools and guides…" autocomplete="off">
          </form>
          ${resources.map(([href, label]) => link(href, label, active)).join('')}
        </div>
      </details>`;
}

function navInner(canonical) {
  const a = activeOf(canonical);
  const top = `${link('/lessons', 'Guided lessons', a)}${resourceMenu(a, 'nav-q')}${link('/pricing', 'Pricing', a)}`;
  const more = [
    link('/lessons', 'Guided lessons', a),
    ...resources.map(([href, label]) => link(href, label, a)),
    link('/pricing', 'Pricing', a),
  ].join('');
  return `<div class="nav-links">${top}</div>
      <details class="nav-more"><summary>Menu</summary><div class="nav-more-list">${more}</div></details>`;
}

function footerInner() {
  return `<div class="inner"><span>WorkSQL · SQL Server, five minutes.</span><div class="links">${footerItems.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</div></div>`;
}

const htmlLinks = items.map(([href, label]) => `          <a href="${href}">${label}</a>`).join('\n');

module.exports = { items, resources, footerItems, navInner, footerInner, htmlLinks };
