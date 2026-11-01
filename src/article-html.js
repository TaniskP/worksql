const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sql = (s) => `<pre><code>${esc(s.trim())}</code></pre>`;
const c = (s) => `<code>${esc(s)}</code>`;
const crumbBack = (href) => `<a class="crumb-back" href="${esc(href)}" data-back>← Back</a>`;
module.exports = { esc, sql, c, crumbBack };
