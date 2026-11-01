// Shared public header links. Keep this list identical in the static HTML pages.
const items = [
  ['/guides', 'Guides'],
  ['/tools', 'Free tools'],
  ['/convert', 'Convert'],
  ['/interview', 'Interview'],
  ['/lessons', 'Lessons'],
  ['/pricing', 'Pricing'],
];

const links = (active) => items.map(([href, label]) => {
  const on = active === href || (active && href !== '/' && active.startsWith(href));
  return `<a href="${href}"${on ? ' aria-current="page"' : ''}>${label}</a>`;
}).join('');

function activeOf(canonical) {
  if (!canonical) return '';
  let p = canonical;
  try { p = new URL(canonical).pathname; } catch { /* path already */ }
  if (p.startsWith('/excel-to-sql') || p.startsWith('/pandas-to-sql') || p.startsWith('/sql-translator') || p === '/convert') return '/convert';
  if (p.startsWith('/interview')) return '/interview';
  if (p.startsWith('/tools')) return '/tools';
  if (p.startsWith('/guides')) return '/guides';
  if (p.startsWith('/lessons') || p.startsWith('/lesson')) return '/lessons';
  if (p.startsWith('/pricing')) return '/pricing';
  return p;
}

function navInner(canonical) {
  const a = links(activeOf(canonical));
  return `<div class="nav-links">${a}</div>
      <details class="nav-more"><summary>Menu</summary><div class="nav-more-list">${a}</div></details>`;
}

const htmlLinks = items.map(([href, label]) => `          <a href="${href}">${label}</a>`).join('\n');

module.exports = { items, navInner, htmlLinks };
