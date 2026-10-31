// SQL Server built-ins, implemented for the sandbox engine.

const pad = (n, w = 2) => String(n).padStart(w, '0');

function parseDate(v) {
  if (v == null) return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?$/);
  if (!m) throw new Error(`Conversion failed when converting date and/or time from character string '${v}'.`);
  const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0), +((m[7] || '0').slice(0, 3).padEnd(3, '0')));
  return { d, hasTime: m[4] !== undefined };
}

function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDateTime(d) {
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

const PARTS = {
  year: 'year', yy: 'year', yyyy: 'year',
  quarter: 'quarter', qq: 'quarter', q: 'quarter',
  month: 'month', mm: 'month', m: 'month',
  dayofyear: 'dayofyear', dy: 'dayofyear', y: 'dayofyear',
  day: 'day', dd: 'day', d: 'day',
  week: 'week', wk: 'week', ww: 'week',
  weekday: 'weekday', dw: 'weekday', w: 'weekday',
  hour: 'hour', hh: 'hour',
  minute: 'minute', mi: 'minute', n: 'minute',
  second: 'second', ss: 'second', s: 'second',
};

function part(p) {
  const key = PARTS[String(p).toLowerCase()];
  if (!key) throw new Error(`'${p}' is not a recognized datepart option.`);
  return key;
}

function dateadd(p, n, v) {
  const parsed = parseDate(v);
  if (!parsed) return null;
  const d = new Date(parsed.d);
  n = Math.trunc(Number(n));
  switch (part(p)) {
    case 'year': d.setFullYear(d.getFullYear() + n); break;
    case 'quarter': d.setMonth(d.getMonth() + 3 * n); break;
    case 'month': d.setMonth(d.getMonth() + n); break;
    case 'week': d.setDate(d.getDate() + 7 * n); break;
    case 'hour': d.setHours(d.getHours() + n); break;
    case 'minute': d.setMinutes(d.getMinutes() + n); break;
    case 'second': d.setSeconds(d.getSeconds() + n); break;
    default: d.setDate(d.getDate() + n);
  }
  return parsed.hasTime ? fmtDateTime(d) : fmtDate(d);
}

function datediff(p, a, b) {
  const x = parseDate(a); const y = parseDate(b);
  if (!x || !y) return null;
  const A = x.d; const B = y.d;
  const dayNum = (d) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  switch (part(p)) {
    case 'year': return B.getFullYear() - A.getFullYear();
    case 'quarter': return (B.getFullYear() - A.getFullYear()) * 4 + Math.floor(B.getMonth() / 3) - Math.floor(A.getMonth() / 3);
    case 'month': return (B.getFullYear() - A.getFullYear()) * 12 + B.getMonth() - A.getMonth();
    case 'week': return Math.floor((dayNum(B) + 4) / 7) - Math.floor((dayNum(A) + 4) / 7);
    case 'hour': return (dayNum(B) - dayNum(A)) * 24 + B.getHours() - A.getHours();
    case 'minute': return ((dayNum(B) - dayNum(A)) * 24 + B.getHours() - A.getHours()) * 60 + B.getMinutes() - A.getMinutes();
    case 'second': return Math.floor((B - A) / 1000);
    default: return dayNum(B) - dayNum(A);
  }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function datepart(p, v) {
  const x = parseDate(v);
  if (!x) return null;
  const d = x.d;
  switch (part(p)) {
    case 'year': return d.getFullYear();
    case 'quarter': return Math.floor(d.getMonth() / 3) + 1;
    case 'month': return d.getMonth() + 1;
    case 'dayofyear': return datediff('day', `${d.getFullYear()}-01-01`, fmtDate(d)) + 1;
    case 'week': return Math.floor((datediff('day', `${d.getFullYear()}-01-01`, fmtDate(d)) + new Date(d.getFullYear(), 0, 1).getDay()) / 7) + 1;
    case 'weekday': return d.getDay() + 1;
    case 'hour': return d.getHours();
    case 'minute': return d.getMinutes();
    case 'second': return d.getSeconds();
    default: return d.getDate();
  }
}

function datename(p, v) {
  const x = parseDate(v);
  if (!x) return null;
  const key = part(p);
  if (key === 'weekday') return DAYS[x.d.getDay()];
  if (key === 'month') return MONTHS[x.d.getMonth()];
  return String(datepart(p, v));
}

function datetrunc(p, v) {
  const x = parseDate(v);
  if (!x) return null;
  const d = x.d;
  switch (part(p)) {
    case 'year': return fmtDate(new Date(d.getFullYear(), 0, 1));
    case 'quarter': return fmtDate(new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1));
    case 'month': return fmtDate(new Date(d.getFullYear(), d.getMonth(), 1));
    case 'week': return fmtDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()));
    default: return fmtDate(d);
  }
}

const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

// FORMAT(date, 'yyyy-MM') and friends. Covers the date patterns people use for report grain.
function format(v, pattern) {
  if (v == null) return null;
  if (typeof v === 'number') {
    if (/^N(\d)?$/i.test(pattern)) return v.toLocaleString('en-GB', { minimumFractionDigits: +(pattern[1] ?? 2), maximumFractionDigits: +(pattern[1] ?? 2) });
    throw new Error(`FORMAT pattern '${pattern}' is not supported in this sandbox yet.`);
  }
  const d = parseDate(v).d;
  return String(pattern).replace(/yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|mm|ss/g, (t) => ({
    yyyy: d.getFullYear(), yy: String(d.getFullYear()).slice(2), MMMM: MONTHS[d.getMonth()], MMM: SHORT_MONTHS[d.getMonth()],
    MM: pad(d.getMonth() + 1), M: d.getMonth() + 1, dddd: DAYS[d.getDay()], ddd: DAYS[d.getDay()].slice(0, 3),
    dd: pad(d.getDate()), d: d.getDate(), HH: pad(d.getHours()), mm: pad(d.getMinutes()), ss: pad(d.getSeconds()),
  }[t]));
}

function cast(v, type) {
  if (v == null) return null;
  const t = type.replace(/\s+/g, '');
  if (t === 'date') return fmtDate(parseDate(v).d);
  if (/^(datetime|datetime2|smalldatetime)/.test(t)) return fmtDateTime(parseDate(v).d);
  if (/^(int|bigint|smallint|tinyint|bit)$/.test(t)) {
    const n = Number(v);
    if (Number.isNaN(n)) throw new Error(`Conversion failed when converting the varchar value '${v}' to data type int.`);
    return Math.trunc(n);
  }
  if (/^(decimal|numeric|money|smallmoney|float|real)/.test(t)) {
    const n = Number(v);
    if (Number.isNaN(n)) throw new Error(`Error converting data type varchar to ${t}.`);
    const scale = t.match(/^(?:decimal|numeric)\(\d+,(\d+)\)/);
    if (scale) return Number(n.toFixed(+scale[1]));
    if (/money/.test(t)) return Number(n.toFixed(4));
    return n;
  }
  if (/char|text/.test(t)) {
    const len = t.match(/\((\d+)\)/);
    const s = String(v);
    return len ? s.slice(0, +len[1]) : s;
  }
  throw new Error(`Type ${type} is not supported in this sandbox yet.`);
}

function register(db, now) {
  const fn = (name, impl) => db.function(name, { deterministic: false }, impl);
  fn('T_GETDATE', () => fmtDateTime(now()));
  fn('T_DATEADD', dateadd);
  fn('T_DATEDIFF', datediff);
  fn('T_DATEPART', datepart);
  fn('T_DATENAME', datename);
  fn('T_DATETRUNC', datetrunc);
  fn('T_DATEFROMPARTS', (y, m, d) => (y == null || m == null || d == null ? null : fmtDate(new Date(y, m - 1, d))));
  fn('T_EOMONTH', (v) => { const x = parseDate(v); return x ? fmtDate(new Date(x.d.getFullYear(), x.d.getMonth() + 1, 0)) : null; });
  fn('T_FORMAT', format);
  fn('T_YEAR', (v) => datepart('year', v));
  fn('T_MONTH', (v) => datepart('month', v));
  fn('T_DAY', (v) => datepart('day', v));
  fn('T_CAST', cast);
  fn('T_LEN', (v) => (v == null ? null : String(v).replace(/ +$/, '').length));
  fn('T_LEFT', (v, n) => (v == null ? null : String(v).slice(0, Math.max(0, n))));
  fn('T_RIGHT', (v, n) => (v == null ? null : n <= 0 ? '' : String(v).slice(-n)));
  fn('T_CHARINDEX', (needle, hay) => (hay == null || needle == null ? null : String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) + 1));
}

module.exports = { register, fmtDate };
