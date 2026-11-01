// Shared catalog search form. Cards need data-search. The script hides empty group headings.
const { esc } = require('./article-html');

function searchBits(s) {
  return esc(String(s || '').toLowerCase());
}

function catalogSearch({ id = 'q', placeholder, countId = 'catalog-count', total, noun = 'pages' }) {
  const ph = esc(placeholder);
  return `<form class="guide-search" role="search">
    <label class="visually-hidden" for="${id}">Search</label>
    <input id="${id}" name="q" type="search" placeholder="${ph}" autocomplete="off">
  </form>
  <p class="guide-count" id="${countId}">${total} ${noun}</p>
  <script>
    (function () {
      const box = document.getElementById(${JSON.stringify(id)});
      const count = document.getElementById(${JSON.stringify(countId)});
      const total = ${Number(total)};
      const noun = ${JSON.stringify(noun)};
      const apply = () => {
        const cards = [...document.querySelectorAll('.ref-link[data-search]')];
        const s = (box.value || '').trim().toLowerCase();
        let n = 0;
        for (const el of cards) {
          const on = !s || (el.getAttribute('data-search') || '').includes(s);
          el.hidden = !on;
          if (on) n++;
        }
        for (const h of document.querySelectorAll('article h2')) {
          let el = h.nextElementSibling;
          while (el && el.tagName === 'P') el = el.nextElementSibling;
          if (!el || !el.classList.contains('ref-links')) continue;
          const any = [...el.querySelectorAll('.ref-link')].some((c) => !c.hidden);
          h.hidden = !!(s && !any);
          el.hidden = !!(s && !any);
          let p = h.nextElementSibling;
          while (p && p.tagName === 'P') { p.hidden = !!(s && !any); p = p.nextElementSibling; }
        }
        count.textContent = s ? n + ' of ' + total + ' ' + noun : total + ' ' + noun;
      };
      box.addEventListener('input', apply);
      const boot = () => {
        const start = new URLSearchParams(location.search).get('q');
        if (start) box.value = start;
        if (box.value) apply();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
      else boot();
    })();
  </script>`;
}

module.exports = { catalogSearch, searchBits };
