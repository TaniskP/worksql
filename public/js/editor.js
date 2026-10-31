// The query editor: a textarea over a highlighted <pre>, with line numbers.
// Used by lessons and by work mode.
import { esc } from '/js/common.js';

const KEYWORDS = new Set(('SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN INNER LEFT RIGHT FULL OUTER CROSS ORDER BY GROUP HAVING TOP DISTINCT ' +
  'ASC DESC BETWEEN LIKE CASE WHEN THEN ELSE END UNION ALL EXISTS WITH OVER PARTITION PERCENT TIES USE GO').split(' '));
const FUNCS = new Set(('GETDATE DATEADD DATEDIFF DATEPART DATENAME DATETRUNC DATEFROMPARTS EOMONTH FORMAT ISNULL COALESCE COUNT SUM AVG MIN MAX ' +
  'CAST CONVERT LEN LEFT RIGHT UPPER LOWER LTRIM RTRIM TRIM ROUND YEAR MONTH DAY CONCAT SUBSTRING REPLACE CHARINDEX IIF SYSDATETIME ABS ' +
  'ROW_NUMBER RANK DENSE_RANK LAG LEAD NTILE').split(' '));

export function highlight(sql) {
  const re = /(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:[^']|'')*'?)|(\[[^\]\n]*\]?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
  let out = ''; let last = 0; let m;
  while ((m = re.exec(sql))) {
    out += esc(sql.slice(last, m.index));
    const [tok, com, str, br, num, word] = m;
    if (com) out += `<span class="com">${esc(com)}</span>`;
    else if (str) out += `<span class="str">${esc(str)}</span>`;
    else if (br) out += `<span class="br">${esc(br)}</span>`;
    else if (num) out += `<span class="num-t">${num}</span>`;
    else if (KEYWORDS.has(word.toUpperCase())) out += `<span class="kw">${word}</span>`;
    else if (FUNCS.has(word.toUpperCase()) && sql[re.lastIndex] === '(') out += `<span class="fn">${word}</span>`;
    else out += esc(tok);
    last = re.lastIndex;
  }
  return out + esc(sql.slice(last)) + '\n';
}

// root must contain .gutter, .code > pre, .code > textarea (and optionally .ghost).
// keys: { 'F5': fn, 'Ctrl+Enter': fn, ... } - handled before the browser sees them.
// schema: { TableName: ['col', ...] } turns on column suggestions (Ctrl+Space, or after "alias.").
export function attachEditor(root, { onChange, keys = {}, minLines = 9, lineHeight = 21, fixedHeight = false, schema = null } = {}) {
  const ta = root.querySelector('textarea');
  const pre = root.querySelector('pre');
  const gutter = root.querySelector('.gutter');
  const ghost = root.querySelector('.ghost');
  const complete = schema ? autocomplete(ta, schema, lineHeight) : null;

  function paint() {
    pre.innerHTML = highlight(ta.value);
    const lines = Math.max(minLines, ta.value.split('\n').length);
    gutter.innerHTML = Array.from({ length: lines }, (_, i) => `<div>${i + 1}</div>`).join('');
    if (!fixedHeight) root.style.height = `${lines * lineHeight + 26}px`;
    if (ghost) ghost.hidden = ta.value.split('\n')[0].length > 40;
  }

  ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; complete && complete.close(); });
  ta.addEventListener('input', (e) => { paint(); onChange && onChange(ta.value); complete && complete.onInput(e); });
  ta.addEventListener('blur', () => complete && setTimeout(complete.close, 120));
  ta.addEventListener('keydown', (e) => {
    if (complete && complete.onKey(e)) return;
    const combo = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key.length === 1 ? e.key.toUpperCase() : e.key}`;
    if (keys[combo]) { e.preventDefault(); keys[combo](); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  });

  return {
    get value() { return ta.value; },
    // What SSMS would execute: the highlighted text if there is any, otherwise everything.
    get selectedOrAll() {
      const s = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      return s.trim() ? s : ta.value;
    },
    set(text, { silent = false } = {}) {
      ta.value = text;
      paint();
      if (!silent && onChange) onChange(text);
    },
    insert(text) {
      ta.focus();
      ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input'));
    },
    focus(end = true) {
      ta.focus();
      if (end) ta.setSelectionRange(ta.value.length, ta.value.length);
    },
    paint,
  };
}

// Column and table suggestions, like IntelliSense: Ctrl+Space anywhere, or automatically after "o.".
function autocomplete(ta, schema, lineHeight) {
  const box = document.createElement('ul');
  box.className = 'complete';
  box.hidden = true;
  ta.parentElement.appendChild(box);
  const tables = Object.keys(schema);
  const lower = (s) => s.toLowerCase();
  let items = []; let sel = 0; let start = 0;

  // "FROM Orders o", "JOIN dbo.Customers AS c" -> { o: 'Orders', c: 'Customers' }
  function aliases() {
    const map = {};
    const re = /\b(?:from|join)\s+(?:\[?\w+\]?\.)*\[?(\w+)\]?(?:\s+(?:as\s+)?(\w+))?/gi;
    let m;
    while ((m = re.exec(ta.value))) {
      const t = tables.find((x) => lower(x) === lower(m[1]));
      if (!t) continue;
      map[lower(t)] = t;
      if (m[2] && !/^(on|where|join|inner|left|right|group|order|with)$/i.test(m[2])) map[lower(m[2])] = t;
    }
    return map;
  }

  function candidates(before) {
    const q = before.match(/(\w+)\.(\w*)$/);
    if (q) {
      const t = aliases()[lower(q[1])];
      if (!t) return null;
      start = ta.selectionStart - q[2].length;
      return schema[t].filter((c) => lower(c).startsWith(lower(q[2]))).map((c) => ({ label: c, detail: t, insert: /\s/.test(c) ? `[${c}]` : c }));
    }
    const w = before.match(/(\w*)$/)[1];
    start = ta.selectionStart - w.length;
    const cols = [...new Set(Object.values(schema).flat())].map((c) => ({ label: c, detail: 'column', insert: /\s/.test(c) ? `[${c}]` : c }));
    return [...tables.map((t) => ({ label: t, detail: 'table', insert: t })), ...cols].filter((x) => lower(x.label).startsWith(lower(w)));
  }

  function position() {
    const before = ta.value.slice(0, start);
    const line = before.split('\n').length - 1;
    const col = before.length - before.lastIndexOf('\n') - 1;
    const cs = getComputedStyle(ta);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
    const cw = ctx.measureText('M').width;
    box.style.top = `${parseFloat(cs.paddingTop) + (line + 1) * lineHeight - ta.scrollTop}px`;
    box.style.left = `${parseFloat(cs.paddingLeft) + col * cw - ta.scrollLeft}px`;
  }

  function open() {
    const found = candidates(ta.value.slice(0, ta.selectionStart));
    if (!found || !found.length) return close();
    items = found.slice(0, 8);
    sel = 0;
    render();
    position();
    box.hidden = false;
  }
  function close() { box.hidden = true; items = []; }
  function render() {
    box.innerHTML = items.map((it, i) => `<li class="${i === sel ? 'sel' : ''}" data-i="${i}"><span>${esc(it.label)}</span><em>${esc(it.detail)}</em></li>`).join('');
  }
  function accept(i = sel) {
    const it = items[i];
    if (!it) return;
    ta.setRangeText(it.insert, start, ta.selectionStart, 'end');
    close();
    ta.dispatchEvent(new Event('input'));
  }
  box.addEventListener('mousedown', (e) => { const li = e.target.closest('li'); if (li) { e.preventDefault(); accept(Number(li.dataset.i)); } });

  return {
    close,
    onInput(e) {
      if (e && e.inputType && e.inputType.startsWith('insert') && ta.value[ta.selectionStart - 1] === '.') return open();
      if (!box.hidden) open();
    },
    onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === ' ') { e.preventDefault(); open(); return true; }
      if (box.hidden) return false;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        render();
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); accept(); return true; }
      if (e.key === 'Escape') { e.preventDefault(); close(); return true; }
      return false;
    },
  };
}
