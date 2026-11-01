// The same tickets in PostgreSQL and MySQL. Same tables, same stories, same expected rows.
// Lessons are written in T-SQL in lessons.js. Anything here replaces that field for the stack;
// steps are merged by position. Fields that are already plain SQL carry over unchanged,
// and "SQL Server" in carried-over text becomes the stack's name.

const IDIOM = {
  postgres: {
    name: 'PostgreSQL',
    today: 'CURRENT_DATE',
    now: 'now()',
    ago: (n) => `CURRENT_DATE - INTERVAL '${n} ${n === 1 ? 'day' : 'days'}'`,
    full: (a = '') => `${a}first_name || ' ' || ${a}last_name`,
    ifnull: 'COALESCE',
    month: (c) => `to_char(${c}, 'YYYY-MM')`,
    joinText: "||",
  },
  mysql: {
    name: 'MySQL',
    today: 'CURDATE()',
    now: 'NOW()',
    ago: (n) => `DATE_SUB(CURDATE(), INTERVAL ${n} DAY)`,
    full: (a = '') => `CONCAT(${a}first_name, ' ', ${a}last_name)`,
    ifnull: 'IFNULL',
    month: (c) => `DATE_FORMAT(${c}, '%Y-%m')`,
    joinText: 'CONCAT',
  },
};

function build(d) {
  const I = IDIOM[d];
  const range = (n, a = '') => `${a}order_date >= ${I.ago(n)} AND ${a}order_date < ${I.today}`;
  const pg = d === 'postgres';
  const fullName = pg ? "first_name || ' ' || last_name" : "CONCAT(first_name, ' ', last_name)";

  return {
    days: {
      1: { blurb: `Five habits every ${I.name} user needs. Each one taught step by step, then done again on your own.` },
      2: { blurb: 'LIMIT, COUNT and SUM, GROUP BY, HAVING. The numbers people ask for first.' },
    },
    lessons: {
      3: {
        steps: { 1: {
          expectError: pg ? /column "processing" does not exist/i : /Unknown column 'Processing'/i,
          done: `That’s the classic. Without quotes, ${I.name} thinks Processing is a column name. Text always goes in single quotes.`,
        } },
      },
      5: {
        topic: `Last week (${pg ? 'CURRENT_DATE' : 'CURDATE'})`,
        steps: {
          0: {
            text: `First, see what time ${I.name} thinks it is: SELECT ${I.now} AS now`,
            solution: `SELECT ${I.now} AS now`,
            looseFix: `Add AS now after ${I.now}.`,
            done: `That’s right now, to the millisecond. ${I.today} is today’s date with no time: midnight.`,
          },
          1: {
            text: `Get last week, without today: SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE ${range(7).replace(' AND', '\nAND')}`,
            solution: `SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE ${range(7)}`,
          },
        },
        solution: `SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE ${range(7)} AND total_amount > 50 ORDER BY order_date DESC`,
        hints: ['A date range has two ends: midnight 7 days ago, and midnight today.',
          pg ? "CURRENT_DATE is midnight today. Taking away INTERVAL '7 days' moves it back a week."
            : 'CURDATE() is midnight today. DATE_SUB(CURDATE(), INTERVAL 7 DAY) moves it back a week.'],
      },
      6: {
        topic: `Last week (${pg ? 'CURRENT_DATE' : 'CURDATE'})`,
        solution: `SELECT order_id, order_date, total_amount FROM Orders WHERE ${range(30)} AND total_amount > 100 ORDER BY total_amount DESC`,
      },
      7: {
        topic: I.ifnull,
        steps: { 1: { text: `Wrap the column: ${I.ifnull}(phone, 'No phone') AS phone. The AS keeps the header.` } },
        solution: `SELECT customer_id, first_name, last_name, ${I.ifnull}(phone, 'No phone') AS phone FROM Customers`,
      },
      8: {
        topic: I.ifnull,
        solution: `SELECT customer_id, ${I.ifnull}(company_name, 'Individual') AS company_name, email FROM Customers`,
      },
      9: {
        bullets: ['Last 7 days, not today. All amounts this time.', 'Columns: order_id, customer_name, order_date, total_amount.',
          `customer_name is ${fullName}.`, 'Newest first.'],
        steps: {
          0: {
            starter: `SELECT o.order_id, o.customer_id, o.order_date, o.total_amount\nFROM Orders o\nWHERE o.order_date >= ${I.ago(7)}\n  AND o.order_date < ${I.today}`,
            solution: `SELECT order_id, customer_id, order_date, total_amount FROM Orders WHERE ${range(7)}`,
          },
          1: {
            text: `Under FROM Orders o, add: JOIN Customers c ON c.customer_id = o.customer_id. Then swap o.customer_id for ${I.full('c.')} AS customer_name.`,
            solution: `SELECT o.order_id, ${I.full('c.')} AS customer_name, o.order_date, o.total_amount FROM Orders o JOIN Customers c ON c.customer_id = o.customer_id WHERE ${range(7, 'o.')}`,
          },
        },
        solution: `SELECT o.order_id, ${I.full('c.')} AS customer_name, o.order_date, o.total_amount FROM Orders o JOIN Customers c ON c.customer_id = o.customer_id WHERE ${range(7, 'o.')} ORDER BY o.order_date DESC`,
      },

      11: {
        topic: 'LIMIT',
        solution: 'SELECT order_id, customer_id, total_amount FROM Orders ORDER BY total_amount DESC LIMIT 5',
        hints: ['LIMIT keeps the first N rows after sorting. What should you sort by?', 'LIMIT goes at the very end, after ORDER BY. Biggest first means DESC.'],
      },
      12: {
        topic: 'LIMIT + ORDER BY',
        solution: 'SELECT customer_id, first_name, last_name, created_date FROM Customers ORDER BY created_date DESC LIMIT 10',
      },
      14: {
        steps: { 1: {
          expectError: pg ? /column "orders\.status" must appear in the GROUP BY clause/i : /nonaggregated column 'harbour\.Orders\.status'/i,
        } },
      },
      17: {
        steps: {
          0: { solution: `SELECT order_id, total_amount FROM Orders WHERE ${range(30)}` },
          1: { solution: `SELECT order_id, total_amount, CASE WHEN total_amount < 50 THEN 'Small' ELSE 'Other' END AS size FROM Orders WHERE ${range(30)}` },
        },
        solution: `SELECT order_id, total_amount, CASE WHEN total_amount < 50 THEN 'Small' WHEN total_amount <= 150 THEN 'Medium' ELSE 'Large' END AS size FROM Orders WHERE ${range(30)} ORDER BY total_amount DESC`,
      },
      18: {
        solution: "SELECT CASE WHEN total_amount < 50 THEN 'Small' WHEN total_amount <= 150 THEN 'Medium' ELSE 'Large' END AS size, COUNT(*) AS order_count FROM Orders GROUP BY size",
        hints: ['Build the label with CASE, then count per label.', `${I.name} lets you GROUP BY the alias: GROUP BY size.`],
        tip: `In ${I.name}, GROUP BY size (the alias) or GROUP BY 1 both work. Repeating the whole CASE works too.`,
      },
      20: {
        bullets: ['Join Staff to itself on manager_id.', 'Columns: employee, manager. Full names (first name, a space, last name).',
          "Include me. I report to nobody: show 'No manager'."],
        solution: `SELECT ${I.full('e.')} AS employee, ${I.ifnull}(${I.full('m.')}, 'No manager') AS manager FROM Staff e LEFT JOIN Staff m ON m.staff_id = e.manager_id`,
      },
      23: {
        blurb: `${pg ? 'to_char' : 'DATE_FORMAT'} to month grain for Amy.`,
        solution: `SELECT ${I.month('order_date')} AS month, SUM(total_amount) AS revenue FROM Orders WHERE status = 'Shipped' GROUP BY ${I.month('order_date')} ORDER BY month`,
        hints: ['Group by the month, not the day. Turn the date into text like 2026-03.',
          pg ? "to_char(order_date, 'YYYY-MM') gives the year and month as text." : "DATE_FORMAT(order_date, '%Y-%m') gives the year and month as text."],
        tip: pg ? "'YYYY-MM' is the year, a dash and the two-digit month." : "%Y is the four-digit year, %m the two-digit month.",
      },
      24: {
        solution: `SELECT ${I.month('order_date')} AS month, SUM(CASE WHEN status = 'Shipped' THEN 1 ELSE 0 END) AS shipped, SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled FROM Orders GROUP BY ${I.month('order_date')} ORDER BY month`,
      },
      25: {
        solution: `SELECT p.product_name, SUM(ol.quantity * ol.unit_price) AS revenue FROM OrderLines ol JOIN Orders o ON o.order_id = ol.order_id JOIN Products p ON p.product_id = ol.product_id WHERE ${range(90, 'o.')} AND o.status <> 'Cancelled' GROUP BY p.product_name ORDER BY revenue DESC LIMIT 5`,
      },
      29: {
        bullets: ['Only customers who have ordered.', 'Columns: customer_name (first name, a space, last name), last_order_date.', 'Most recent first.'],
        solution: `WITH last_orders AS (SELECT customer_id, MAX(order_date) AS last_order_date FROM Orders GROUP BY customer_id) SELECT ${I.full('c.')} AS customer_name, l.last_order_date FROM last_orders l JOIN Customers c ON c.customer_id = l.customer_id ORDER BY l.last_order_date DESC`,
      },
      30: {
        steps: { 1: { expectError: pg ? /column "rn" does not exist/i : /Unknown column 'rn' in 'where clause'/i } },
      },
      31: {
        solution: `WITH sold AS (SELECT product_id, SUM(quantity) AS units_sold FROM OrderLines GROUP BY product_id), returned AS (SELECT product_id, SUM(quantity) AS units_returned FROM Returns GROUP BY product_id) SELECT p.product_name, s.units_sold, ${I.ifnull}(r.units_returned, 0) AS units_returned FROM sold s JOIN Products p ON p.product_id = s.product_id LEFT JOIN returned r ON r.product_id = s.product_id ORDER BY units_returned DESC`,
      },
      32: {
        solution: `WITH daily AS (SELECT order_date AS order_day, SUM(total_amount) AS revenue FROM Orders WHERE ${range(14)} GROUP BY order_date) SELECT order_day, revenue, SUM(revenue) OVER (ORDER BY order_day) AS running_total FROM daily ORDER BY order_day`,
      },
      34: {
        solution: `WITH monthly AS (SELECT ${I.month('order_date')} AS month, SUM(total_amount) AS revenue FROM Orders WHERE status <> 'Cancelled' GROUP BY ${I.month('order_date')}) SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month) AS change FROM monthly ORDER BY month`,
      },
      36: {
        bullets: ['Columns: customer_name (first name, a space, last name), total_spent.', 'Top 10 by total_spent, biggest first.', 'Fix the query in the editor.'],
        starter: `SELECT ${I.full('c.')} AS customer_name,\n       SUM(o.total_amount) AS total_spent\nFROM Customers c\nJOIN Orders o ON o.customer_id = c.customer_id\nJOIN OrderLines ol ON ol.order_id = o.order_id\nGROUP BY c.first_name, c.last_name\nORDER BY total_spent DESC\nLIMIT 10`,
        solution: `SELECT ${I.full('c.')} AS customer_name, SUM(o.total_amount) AS total_spent FROM Customers c JOIN Orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.first_name, c.last_name ORDER BY total_spent DESC LIMIT 10`,
      },
      37: {
        starter: `SELECT order_id, total_amount\nFROM Orders\nWHERE order_date >= ${I.ago(1)}`,
        solution: `SELECT order_id, total_amount FROM Orders WHERE ${range(1)}`,
      },
      39: {
        title: 'Without using LIMIT: what is the second-highest order value?',
        bullets: ['Column: second_highest.', 'One row. Don’t use LIMIT.'],
      },
      40: {
        bullets: ['Join Orders to Staff on staff_id. Last 30 days, not today.', 'Columns: staff_name (first name, a space, last name), revenue.', 'Top 3, biggest first.'],
        solution: `SELECT ${I.full('s.')} AS staff_name, SUM(o.total_amount) AS revenue FROM Orders o JOIN Staff s ON o.staff_id = s.staff_id WHERE ${range(30, 'o.')} GROUP BY s.first_name, s.last_name ORDER BY revenue DESC LIMIT 3`,
        hints: ['Join, filter to the last 30 days, total per person, take the top 3.', 'Group by the name columns, sort by revenue, then LIMIT 3.'],
      },
      43: {
        solution: `SELECT s.first_name, s.last_name, s.role FROM Staff s LEFT JOIN Orders o ON o.staff_id = s.staff_id AND ${range(30, 'o.')} WHERE o.order_id IS NULL`,
      },
      44: {
        bullets: ['Columns: customer_name (first name, a space, last name), avg_order.', 'Only customers whose average order is over £150.', 'Biggest average first.'],
        solution: `WITH averages AS (SELECT customer_id, AVG(total_amount) AS avg_order FROM Orders GROUP BY customer_id) SELECT ${I.full('c.')} AS customer_name, a.avg_order FROM averages a JOIN Customers c ON c.customer_id = a.customer_id WHERE a.avg_order > 150 ORDER BY a.avg_order DESC`,
      },
    },
  };
}

const STACKS = { postgres: build('postgres'), mysql: build('mysql') };

// Swap "SQL Server" for the stack's name in carried-over text.
function rename(v, name) {
  if (typeof v === 'string') return v.replace(/SQL Server/g, name).replace(/\bSSMS\b/g, name);
  if (Array.isArray(v)) return v.map((x) => rename(x, name));
  return v;
}
const TEXT_FIELDS = ['topic', 'blurb', 'title', 'bullets', 'hints', 'tip', 'thanks'];

// A lesson as it reads in one stack. T-SQL returns the lesson itself.
function forStack(lesson, dialect) {
  const stack = STACKS[dialect];
  if (!stack) return lesson;
  const name = IDIOM[dialect].name;
  const o = stack.lessons[lesson.id] || {};
  const out = { ...lesson, dialect };
  for (const f of TEXT_FIELDS) if (lesson[f] != null) out[f] = rename(lesson[f], name);
  const { steps: stepOver, ...rest } = o;
  Object.assign(out, rest);
  if (lesson.steps) {
    out.steps = lesson.steps.map((s, i) => {
      const base = { ...s, text: rename(s.text, name), done: rename(s.done, name) };
      return { ...base, ...((stepOver && stepOver[i]) || {}) };
    });
  }
  return out;
}

function dayForStack(day, dialect) {
  const stack = STACKS[dialect];
  if (!stack) return day;
  return { ...day, blurb: rename(day.blurb, IDIOM[dialect].name), ...(stack.days[day.id] || {}) };
}

module.exports = { forStack, dayForStack, IDIOM };
