// Harbour & Co: the one fake company every lesson runs against.
// A small coffee, kitchen and office supplier. Dates are generated relative to "today"
// so tasks like "last week's orders" always work. The data is deliberately a bit messy
// (stray spaces, a capitalised email, the same person entered twice) because real tables are.

const FIRST = ['James', 'Sarah', 'David', 'Emma', 'Nina', 'Tom', 'Olivia', 'Mohammed', 'Grace', 'Liam', 'Chloe', 'Daniel',
  'Aisha', 'Ben', 'Hannah', 'Ryan', 'Sophie', 'Jack', 'Amelia', 'Ollie', 'Isla', 'Harry', 'Zara', 'George', 'Lucy',
  'Arjun', 'Ellie', 'Sam', 'Megan', 'Noah', 'Ruby', 'Ethan', 'Freya', 'Leo', 'Maya', 'Callum', 'Niamh', 'Kofi', 'Rosa', 'Adam',
  'Imogen', 'Theo', 'Layla', 'Finn', 'Esme', 'Rhys', 'Anya', 'Jude', 'Poppy', 'Omar', 'Tilly', 'Kai', 'Nell', 'Felix'];
const LAST = ['Carter', 'Mills', 'Clarke', 'Wilson', 'Shah', 'Hughes', 'Patel', 'Khan', 'Evans', 'Murphy', 'Walsh', 'Reid',
  'Ali', 'Turner', 'Brooks', 'Doyle', 'Bennett', 'Price', 'Ward', 'Foster', 'Grant', 'Lewis', 'Malik', 'Owen', 'Hart',
  'Singh', 'Fisher', 'Cole', 'Hayes', 'Bell', 'Stone', 'Webb', 'Kerr', 'Byrne', 'Mensah', 'Lowe', 'Quinn', 'Boateng', 'Diaz', 'Frost',
  'Ellis', 'Nash', 'Rahman', 'Pike', 'Vaughan', 'Lloyd', 'Novak', 'Ashby', 'Reeves', 'Farah', 'Holt', 'Tanaka', 'Gill', 'Moss'];
const CITIES = ['Bristol', 'Leeds', 'Manchester', 'London', 'Cardiff', 'Glasgow', 'Norwich', 'Brighton'];
const COMPANIES = ['Brightside Dental', 'Kiln Studio', 'Northgate Lettings', 'Pebble Nursery', 'Quayside Law', 'Rowan Physio',
  'Silverline Print', 'Tidewater Cafe', 'Upland Architects', 'Victoria Vets', 'Willow Accountancy', 'Yard Coworking'];

const STAFF = [
  // staff_id, first, last, role, team, start date, manager
  [11, 'Sandra', 'Okafor', 'Managing Director', 'Leadership', '2012-05-08', null],
  [1, 'James', 'Rowe', 'Sales Manager', 'Sales', '2016-03-14', 11],
  [2, 'Nadia', 'Hassan', 'Account Exec', 'Sales', '2018-09-03', 1],
  [3, 'Chris', 'Upton', 'Account Exec', 'Sales', '2021-01-11', 1],
  [4, 'Ffion', 'Jones', 'Account Exec', 'Sales', '2019-06-24', 1],
  [5, 'Marcus', 'Lee', 'Account Exec', 'Sales', '2023-02-06', 1],
  [6, 'Amy', 'Nair', 'Finance Lead', 'Finance', '2017-11-20', 11],
  [7, 'Tom', 'Gallagher', 'Warehouse Lead', 'Ops', '2015-07-01', 11],
  [8, 'Becky', 'Ashworth', 'Support', 'Ops', '2022-04-19', 7],
  [9, 'Kwame', 'Asante', 'Data Analyst', 'Finance', '2024-01-08', 6],
  [10, 'Holly', 'Drake', 'Account Exec', 'Sales', '2020-10-05', 1],
];

const PRODUCTS = [
  // product_id, name, category, price, supplier, reorder_level, discontinued
  [1, 'Harbour House Blend 1kg', 'Coffee', 18.5, 'Dockside Roasters', 20, 0],
  [2, 'Espresso Dark 1kg', 'Coffee', 21.0, 'Dockside Roasters', 20, 0],
  [3, 'Decaf Swiss Water 500g', 'Coffee', 12.75, 'Dockside Roasters', null, 0],
  [4, 'Breakfast Tea 250 bags', 'Tea', 9.8, 'Kettle & Leaf', 30, 0],
  [5, 'Earl Grey Loose 500g', 'Tea', 14.2, 'Kettle & Leaf', null, 0],
  [6, 'Green Sencha 100 bags', 'Tea', 7.6, 'Kettle & Leaf', 15, 0],
  [7, 'Burr Grinder', 'Kitchen', 89.0, 'Northfold Ltd', 5, 0],
  [8, 'Pour-Over Kettle', 'Kitchen', 54.0, 'Northfold Ltd', 5, 0],
  [9, 'Stoneware Mugs (set of 4)', 'Kitchen', 32.0, 'Northfold Ltd', 10, 0],
  [10, 'Espresso Machine Pro', 'Kitchen', 189.0, 'Northfold Ltd', 2, 0],
  [11, 'Milk Frother', 'Kitchen', 39.5, 'Northfold Ltd', null, 0],
  [12, 'Desk Planner', 'Office', 16.0, 'Paperline', 25, 0],
  [13, 'A4 Notebooks (5 pack)', 'Office', 11.25, 'Paperline', 40, 0],
  [14, 'Gel Pens (12)', 'Office', 6.9, 'Paperline', 50, 0],
  [15, 'Monitor Stand', 'Office', 47.0, 'Paperline', 8, 0],
  [16, 'Cold Brew Kit', 'Kitchen', 28.0, 'Northfold Ltd', null, 1],
  [17, 'Chai Spice 250g', 'Tea', 8.4, 'Kettle & Leaf', null, 0],
  [18, 'Matcha Starter Set', 'Tea', 34.0, 'Kettle & Leaf', 6, 0], // new: never ordered yet
];

// Orders pinned near "today" so the date lessons have clear right and wrong answers.
// Day 7 is deliberately empty so DATEADD(day, -7, GETDATE()) and the date-only form agree.
// The last row becomes order 10484 (today's big order, used in the picking-list lesson).
const RECENT = [
  // days ago, customer, staff, status, lines [product, qty]
  [12, 1009, 3, 'Shipped', [[8, 2], [2, 2]]], // exactly £150.00: the Medium/Large edge in the CASE lessons
  [9, 1008, 5, 'Shipped', [[3, 2], [9, 1]]],
  [8, 1027, 10, 'Shipped', [[8, 1], [5, 2]]],
  [6, 1010, 2, 'Shipped', [[11, 1], [2, 2]]],
  [5, 1011, 4, 'Shipped', [[4, 2], [14, 2]]],
  [4, 1033, 3, 'Shipped', [[15, 1], [12, 1]]],
  [3, 1037, 10, 'Processing', [[10, 1], [8, 1]]],
  [2, 1032, 5, 'Shipped', [[14, 2], [6, 1]]],
  [2, 1005, 4, 'Shipped', [[1, 2], [9, 1]]],
  [1, 1044, 3, 'Shipped', [[12, 2], [14, 1]]],
  [1, 1021, 2, 'Shipped', [[7, 1], [4, 1]]],
  [0, 1019, 3, 'Processing', [[14, 1], [13, 1]]],
  [0, 1003, 2, 'Processing', [[10, 1], [9, 1], [1, 1]]],
];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function daysAgo(today, n) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

const round2 = (n) => Math.round(n * 100) / 100;

function build(db, today = new Date()) {
  const rand = rng(20241031);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  db.exec(`
    CREATE TABLE Customers (
      customer_id INTEGER PRIMARY KEY,
      first_name TEXT COLLATE NOCASE NOT NULL,
      last_name TEXT COLLATE NOCASE NOT NULL,
      email TEXT COLLATE NOCASE,
      phone TEXT COLLATE NOCASE,
      company_name TEXT COLLATE NOCASE,
      city TEXT COLLATE NOCASE,
      created_date TEXT
    );
    CREATE TABLE Staff (
      staff_id INTEGER PRIMARY KEY,
      first_name TEXT COLLATE NOCASE NOT NULL,
      last_name TEXT COLLATE NOCASE NOT NULL,
      role TEXT COLLATE NOCASE,
      team TEXT COLLATE NOCASE,
      "Start Date" TEXT,
      manager_id INTEGER
    );
    CREATE TABLE Products (
      product_id INTEGER PRIMARY KEY,
      product_name TEXT COLLATE NOCASE NOT NULL,
      category TEXT COLLATE NOCASE NOT NULL,
      unit_price REAL NOT NULL,
      supplier TEXT COLLATE NOCASE,
      reorder_level INTEGER,
      discontinued INTEGER NOT NULL
    );
    CREATE TABLE Orders (
      order_id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      staff_id INTEGER,
      order_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT COLLATE NOCASE NOT NULL
    );
    CREATE TABLE OrderLines (
      order_line_id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );
    CREATE TABLE Returns (
      return_id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      return_date TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT COLLATE NOCASE
    );
  `);

  // ---------- customers ----------
  const insC = db.prepare('INSERT INTO Customers VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const usedAgo = new Set();
  const createdAgo = () => {
    let n;
    do { n = 60 + Math.floor(rand() * 1100); } while (usedAgo.has(n));
    usedAgo.add(n);
    return n;
  };
  for (let i = 0; i < 54; i++) {
    const id = 1001 + i;
    let first = FIRST[i];
    let last = LAST[i];
    let email = `${first[0].toLowerCase()}.${last.toLowerCase()}@harbour.co`;
    // Real-world mess.
    if (id === 1007) last += ' ';
    if (id === 1012) first = ' ' + first;
    if (id === 1015) email = 'H.Brooks@Harbour.co';
    const phone = rand() < 0.3 ? null : '07' + String(Math.floor(rand() * 1e9)).padStart(9, '0');
    const company = rand() < 0.45 ? pick(COMPANIES) : null;
    insC.run(id, first, last, email, phone, company, pick(CITIES), daysAgo(today, createdAgo()));
  }
  // Same people entered twice by a busy salesperson, plus brand-new customers with no orders.
  insC.run(1055, 'James ', 'Carter', ' J.Carter@harbour.co', null, null, 'Bristol', daysAgo(today, 41));
  insC.run(1056, 'Sarah', 'Mills', 'S.Mills@harbour.co', '07700900456', 'Kiln Studio', 'Leeds', daysAgo(today, 37));
  insC.run(1057, 'Hugo', 'Barnes', 'h.barnes@harbour.co', '07700900123', 'Harbourside Gym', 'Brighton', daysAgo(today, 29));
  insC.run(1058, 'Saoirse', 'Kelly', 's.kelly@harbour.co', null, null, 'Glasgow', daysAgo(today, 22));
  insC.run(1059, 'Dev', 'Mistry', 'd.mistry@harbour.co', '07700900789', 'Mistry & Sons', 'Leeds', daysAgo(today, 15));
  insC.run(1060, 'Alys', 'Pryce', 'a.pryce@harbour.co', null, null, 'Cardiff', daysAgo(today, 11));

  const insS = db.prepare('INSERT INTO Staff VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const s of STAFF) insS.run(...s);
  const insP = db.prepare('INSERT INTO Products VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const p of PRODUCTS) insP.run(...p);
  const price = Object.fromEntries(PRODUCTS.map((p) => [p[0], p[3]]));

  // ---------- orders and lines ----------
  const orders = [];
  for (let i = 0; i < 380; i++) {
    const ago = 10 + Math.floor(rand() * 410);
    const status = rand() < 0.07 ? 'Cancelled' : 'Shipped';
    const lines = [];
    const n = 1 + Math.floor(rand() * rand() * 4);
    const used = new Set();
    for (let k = 0; k < n; k++) {
      let p;
      do {
        p = 1 + Math.floor(rand() * 17); // 18 (Matcha) has never sold
      } while (used.has(p) || (p === 16 && ago < 180) || (p === 17 && rand() < 0.7));
      used.add(p);
      const qty = p === 10 ? 1 : p >= 12 && p <= 14 ? 1 + Math.floor(rand() * 5) : 1 + Math.floor(rand() * rand() * 3);
      lines.push([p, qty]);
    }
    orders.push([ago, 1001 + Math.floor(rand() * 54), pick([2, 3, 4, 5, 10]), status, lines]);
  }
  // A few big trade orders so TOP has clear winners.
  orders.push([45, 1014, 4, 'Shipped', [[10, 3], [7, 2]]], [72, 1029, 2, 'Shipped', [[10, 2], [8, 3]]],
    [23, 1014, 10, 'Shipped', [[7, 4], [15, 2]]], [97, 1036, 3, 'Shipped', [[10, 2], [11, 1]]],
    [15, 1022, 2, 'Shipped', [[15, 6], [12, 3]]]);
  orders.push(...RECENT);

  // Oldest first so order_id climbs with order_date, like a real identity column.
  const recentSet = new Set(RECENT);
  orders.sort((a, b) => b[0] - a[0] || (recentSet.has(a) ? 1 : 0) - (recentSet.has(b) ? 1 : 0));
  const insO = db.prepare('INSERT INTO Orders VALUES (?, ?, ?, ?, ?, ?)');
  const insL = db.prepare('INSERT INTO OrderLines (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)');
  const insR = db.prepare('INSERT INTO Returns (order_id, product_id, return_date, quantity, reason) VALUES (?, ?, ?, ?, ?)');
  let id = 10484 - orders.length + 1;
  for (const [ago, cust, staff, status, lines] of orders) {
    const total = round2(lines.reduce((s, [p, q]) => s + price[p] * q, 0));
    insO.run(id, cust, staff, daysAgo(today, ago), total, status);
    for (const [p, q] of lines) insL.run(id, p, q, price[p]);
    // About one shipped order in twelve sends something back.
    if (status === 'Shipped' && ago > 20 && rand() < 0.085) {
      const [p, q] = pick(lines);
      insR.run(id, p, Math.max(1, Math.floor(q / 2)), daysAgo(today, ago - 3 - Math.floor(rand() * 12)),
        pick(['Damaged in transit', 'Wrong item', 'Changed mind', 'Faulty']));
    }
    id++;
  }
}

// How the tables look in SQL Server, for Object Explorer: [column, type, nullable, key].
const SCHEMA = {
  Customers: [['customer_id', 'int', false, 'PK'], ['first_name', 'nvarchar(50)', false], ['last_name', 'nvarchar(50)', false],
    ['email', 'nvarchar(255)', true], ['phone', 'varchar(20)', true], ['company_name', 'nvarchar(100)', true],
    ['city', 'nvarchar(50)', true], ['created_date', 'date', true]],
  Orders: [['order_id', 'int', false, 'PK'], ['customer_id', 'int', false, 'FK'], ['staff_id', 'int', true, 'FK'],
    ['order_date', 'date', false], ['total_amount', 'decimal(10,2)', false], ['status', 'varchar(20)', false]],
  OrderLines: [['order_line_id', 'int', false, 'PK'], ['order_id', 'int', false, 'FK'], ['product_id', 'int', false, 'FK'],
    ['quantity', 'int', false], ['unit_price', 'decimal(10,2)', false]],
  Products: [['product_id', 'int', false, 'PK'], ['product_name', 'nvarchar(100)', false], ['category', 'varchar(20)', false],
    ['unit_price', 'decimal(10,2)', false], ['supplier', 'nvarchar(100)', true], ['reorder_level', 'int', true], ['discontinued', 'bit', false]],
  Returns: [['return_id', 'int', false, 'PK'], ['order_id', 'int', false, 'FK'], ['product_id', 'int', false, 'FK'],
    ['return_date', 'date', false], ['quantity', 'int', false], ['reason', 'nvarchar(100)', true]],
  Staff: [['staff_id', 'int', false, 'PK'], ['first_name', 'nvarchar(50)', false], ['last_name', 'nvarchar(50)', false],
    ['role', 'nvarchar(50)', true], ['team', 'varchar(20)', true], ['Start Date', 'date', true], ['manager_id', 'int', true, 'FK']],
};

// What each table holds, in plain English, for people opening a database for the first time.
const TABLE_INFO = {
  Customers: 'Everyone who buys from Harbour & Co. One row per customer: name, email, phone, city.',
  Orders: 'Every order ever placed. One row per order: who ordered, when, how much, and where it’s up to.',
  OrderLines: 'What’s inside each order. One row per product on an order, with the quantity and price.',
  Products: 'Everything Harbour & Co sells: coffee, tea, kitchen and office kit, with prices.',
  Returns: 'Items customers sent back, when, and why.',
  Staff: 'The people who work here, their team, and who manages whom.',
};

module.exports = { build, isoDate, daysAgo, SCHEMA, TABLE_INFO };
