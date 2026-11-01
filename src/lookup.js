// One list for the homepage find box: guides, T-SQL pages, tools, converters, interview prompts.
const { articles, listing: articleListing } = require('./articles');
const { tools } = require('./tools');
const { excel, pandas, dialects, interview } = require('./hubs');

function item(kind, name, short, href, extra) {
  return { kind, name, short, href, search: [kind, name, short, href, extra].filter(Boolean).join(' ').toLowerCase() };
}

function lookup() {
  const out = [
    item('Tools', 'Free T-SQL tools', 'Formatter, dates, schema, PIVOT, SARGable, masking.', '/tools', 'free tools catalog'),
    item('Convert', 'Excel, Pandas, and SQL dialects', 'VLOOKUP, groupby, MySQL LIMIT → T-SQL.', '/convert', 'translator hub'),
    item('Interview', 'SQL interview sandbox', 'Top N per group, running totals, anti-joins.', '/interview', 'practice prompts'),
    item('Guides', 'SQL Server guides', 'Last week, LEFT JOIN, SELECT *.', '/guides', 'workplace'),
    item('T-SQL', 'T-SQL reference', 'GETDATE, DATEADD, CASE, ROW_NUMBER.', '/tsql', 'functions'),
  ];
  for (const a of articles) {
    const row = articleListing(a);
    out.push(item(row.kind === 'guide' ? 'Guide' : 'T-SQL', row.name, row.short, row.href, a.slug + ' ' + a.title));
  }
  for (const t of tools) {
    out.push(item('Tool', t.name, t.short, `/tools/${t.slug}`, t.slug + ' ' + (t.group || '') + ' ' + t.title));
  }
  for (const it of excel) out.push(item('Excel → SQL', it.name, it.short, `/excel-to-sql/${it.slug}`, it.title));
  for (const it of pandas) out.push(item('Pandas → SQL', it.name, it.short, `/pandas-to-sql/${it.slug}`, it.title));
  for (const it of dialects) out.push(item('Dialect', it.name, it.short, `/sql-translator/${it.slug}`, it.title));
  for (const it of interview) out.push(item('Interview', it.name, it.short, `/interview/${it.slug}`, it.title));
  return out;
}

module.exports = { lookup };
