// Shared catalog search. Cards need data-search (and data-cat if chips are used).
const { esc } = require('./article-html');

function searchBits(s) {
  return esc(String(s || '').toLowerCase());
}

const ICONS = {
  All: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  'At work': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  Joins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/></svg>',
  Dates: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  Window: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V5M4 19h16"/><path d="M7 15l3-6 3 4 3-8 3 6"/></svg>',
  Aggregates: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h16M7 20V10M12 20V4M17 20v-7"/></svg>',
  Types: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 20V4h5a4 4 0 0 1 0 8H8"/><path d="M14 20l3-16h1"/></svg>',
  Functions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4c-3 2-3 14 0 16M16 4c3 2 3 14 0 16M9 12h6"/></svg>',
  Hubs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 5v2M12 17v2M5 12h2M17 12h2M7.2 7.2l1.4 1.4M15.4 15.4l1.4 1.4M16.8 7.2l-1.4 1.4M8.6 15.4l-1.4 1.4"/></svg>',
  Everyday: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z"/></svg>',
  Architecture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10l8-6 8 6v10"/><path d="M10 20v-6h4v6"/></svg>',
  Aggregation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h16M7 20V10M12 20V4M17 20v-7"/></svg>',
  Cleaning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M7 7l1 13h8l1-13M9 7V5h6v2"/></svg>',
  Speed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="13" r="8"/><path d="M12 13l4-5"/></svg>',
  Security: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/></svg>',
  'Quality of life': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5"/></svg>',
};

function catalogIcon(cat) {
  return ICONS[cat] || ICONS.All;
}

function catalogCard({ href, name, short, extra, cat }) {
  const search = searchBits([name, short, extra, cat].filter(Boolean).join(' '));
  return `<a class="lib-card ref-link" href="${esc(href)}" data-search="${search}" data-cat="${esc(cat)}">
    <span class="lib-ico" aria-hidden="true">${catalogIcon(cat)}</span>
    <span class="lib-cat">${esc(cat)}</span>
    <b>${esc(name)}</b>
    <span class="lib-short">${esc(short)}</span>
  </a>`;
}

function catalogSearch({ id = 'q', placeholder, countId = 'catalog-count', total, noun = 'pages', variant = 'plain', chips = [] }) {
  const ph = esc(placeholder);
  const chipRow = chips.length
    ? `<div class="lib-chips" id="catalog-chips">${chips.map((c, i) => {
      const key = typeof c === 'string' ? c : c.id;
      const label = typeof c === 'string' ? c : c.label;
      return `<button type="button" class="lib-chip" data-chip="${esc(key)}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(label)}</button>`;
    }).join('')}</div>`
    : '';
  const form = variant === 'lib'
    ? `<form class="lib-search" role="search">
    <label class="visually-hidden" for="${id}">Search</label>
    <input id="${id}" name="q" type="search" placeholder="${ph}" autocomplete="off">
    <button class="btn btn-primary" type="submit">Search</button>
  </form>
  ${chipRow}
  <div class="lib-meta"><p class="guide-count" id="${countId}">${total} ${noun}</p></div>`
    : `<form class="guide-search" role="search">
    <label class="visually-hidden" for="${id}">Search</label>
    <input id="${id}" name="q" type="search" placeholder="${ph}" autocomplete="off">
  </form>
  ${chipRow}
  <p class="guide-count" id="${countId}">${total} ${noun}</p>`;

  return `${form}
  <script>
    (function () {
      const box = document.getElementById(${JSON.stringify(id)});
      const count = document.getElementById(${JSON.stringify(countId)});
      const chips = document.getElementById('catalog-chips');
      const total = ${Number(total)};
      const noun = ${JSON.stringify(noun)};
      const apply = () => {
        const cards = [...document.querySelectorAll('.ref-link[data-search]')];
        const s = (box.value || '').trim().toLowerCase();
        const chip = chips && [...chips.querySelectorAll('.lib-chip')].find((b) => b.getAttribute('aria-pressed') === 'true');
        const cat = chip && chip.getAttribute('data-chip');
        const want = cat && cat !== 'All' ? cat : '';
        let n = 0;
        for (const el of cards) {
          const text = !s || (el.getAttribute('data-search') || '').includes(s);
          const topic = !want || el.getAttribute('data-cat') === want;
          const on = text && topic;
          el.hidden = !on;
          if (on) n++;
        }
        for (const h of document.querySelectorAll('article h2')) {
          let el = h.nextElementSibling;
          while (el && el.tagName === 'P') el = el.nextElementSibling;
          if (!el || !el.classList.contains('ref-links')) continue;
          const any = [...el.querySelectorAll('.ref-link')].some((c) => !c.hidden);
          const hide = !!(!any && (s || want));
          h.hidden = hide;
          el.hidden = hide;
          let p = h.nextElementSibling;
          while (p && p.tagName === 'P') { p.hidden = hide; p = p.nextElementSibling; }
        }
        count.textContent = (s || want) ? n + ' of ' + total + ' ' + noun : total + ' ' + noun;
      };
      box.addEventListener('input', apply);
      box.form && box.form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
      if (chips) {
        chips.addEventListener('click', (e) => {
          const b = e.target.closest('.lib-chip');
          if (!b) return;
          for (const x of chips.querySelectorAll('.lib-chip')) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
          const url = new URL(location.href);
          const key = b.getAttribute('data-chip');
          if (!key || key === 'All') url.searchParams.delete('topic');
          else url.searchParams.set('topic', key);
          history.replaceState(null, '', url);
          apply();
        });
      }
      const boot = () => {
        const start = new URLSearchParams(location.search);
        const q = start.get('q');
        if (q) box.value = q;
        const topic = start.get('topic');
        if (topic && chips) {
          for (const x of chips.querySelectorAll('.lib-chip')) {
            x.setAttribute('aria-pressed', x.getAttribute('data-chip') === topic ? 'true' : 'false');
          }
        }
        if (box.value || topic) apply();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else boot();
    })();
  </script>`;
}

module.exports = { catalogSearch, searchBits, catalogCard, catalogIcon };
