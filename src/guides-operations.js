// Real-life guides: deliveries, bookings, clinics, schools, libraries, gyms and sales teams.
const { sql, c, table, joinDemo, slides, guide } = require('./article-html');

module.exports = [
  guide({
    slug: 'late-deliveries-by-courier', name: 'Late deliveries by courier', topic: 'Dates',
    title: 'Late deliveries by courier in SQL, including ones not delivered yet',
    short: 'Delivered after the promised date, or still out past it.',
    description: 'Calculate the late delivery rate per courier in SQL Server, counting parcels still not delivered after their promised date as late.',
    lede: 'A parcel is late if it arrived after the promised date, or if the promised date has passed and it still has not arrived. The second kind is easy to miss, and it is the one customers phone about.',
    ask: { who: 'Tom Gallagher', role: 'Warehouse Lead', text: 'Which courier was worst for late deliveries in October? Percentages, and count the ones that still haven’t turned up.' },
    plain: 'For each parcel, decide late or not: arrived after the promised day, or never arrived and the promised day is gone. Then count, per courier, how many parcels were late out of how many were sent.',
    html: () => `
${table('A few October shipments', ['shipment', 'courier', 'promised_date', 'delivered_date', 'late?'], [['S1', 'FastShip', '2026-10-06', '2026-10-06', 'No'], ['S2', 'FastShip', '2026-10-09', '2026-10-12', 'Yes'], ['S3', 'ParcelCo', '2026-10-14', '2026-10-13', 'No'], ['S4', 'ParcelCo', '2026-10-20', null, 'Yes, still not here'], ['S5', 'ParcelCo', '2026-10-22', '2026-10-24', 'Yes']])}
<h2>The query</h2>
${sql(`SELECT s.courier,
       COUNT(*)        AS shipments,
       SUM(v.is_late)  AS late,
       CAST(100.0 * SUM(v.is_late) / COUNT(*) AS decimal(5,1)) AS late_pct
FROM Shipments s
CROSS APPLY (VALUES (
  CASE WHEN s.delivered_date > s.promised_date
         OR (s.delivered_date IS NULL AND s.promised_date < CAST(GETDATE() AS date))
       THEN 1 ELSE 0 END
)) AS v(is_late)
WHERE s.dispatched_date >= '2026-10-01' AND s.dispatched_date < '2026-11-01'
GROUP BY s.courier
ORDER BY late_pct DESC;`)}
${table('Result (all October shipments)', ['courier', 'shipments', 'late', 'late_pct'], [['ParcelCo', 5, 2, '40.0'], ['FastShip', 4, 1, '25.0'], ['Roadrunner', 3, 0, '0.0']])}
<div class="mistake"><b>Only checking delivered_date &gt; promised_date</b>
<p>For S4, delivered_date is NULL, and NULL &gt; anything is not true. Without the second condition the parcel that never arrived counts as on time, and ParcelCo looks twice as good as it is.</p></div>`,
  }),

  guide({
    slug: 'working-days-to-dispatch', name: 'Working days to dispatch', topic: 'Dates',
    title: 'Working days between two dates in SQL Server (order to dispatch)',
    short: 'Calendar days minus two for every weekend crossed.',
    description: 'Count working days between an order date and a dispatch date in SQL Server by taking weekends out of DATEDIFF, and when you need a calendar table instead.',
    lede: 'An order placed on Friday and sent on Monday is three calendar days but one working day. DATEDIFF(week, …) counts the weekends crossed, so you can take two days off for each.',
    ask: { who: 'Tom Gallagher', role: 'Warehouse Lead', text: 'What’s our average time from order to dispatch in working days? Weekends make the calendar-day number look awful.' },
    plain: 'Count the days between order and dispatch. Every time the gap crosses a weekend, take two days off. Friday to Monday crosses one weekend: 3 − 2 = 1 working day.',
    html: () => `
<h2>The query</h2>
${sql(`SELECT order_id, order_date, dispatch_date,
       DATEDIFF(day, order_date, dispatch_date) AS calendar_days,
       DATEDIFF(day, order_date, dispatch_date)
         - 2 * DATEDIFF(week, order_date, dispatch_date) AS working_days
FROM Orders
WHERE dispatch_date IS NOT NULL
  AND order_date >= '2026-10-01' AND order_date < '2026-11-01';`)}
${table('Result', ['order_id', 'order_date', 'dispatch_date', 'calendar_days', 'working_days'], [[801, '2026-10-23 (Fri)', '2026-10-26 (Mon)', 3, 1], [802, '2026-10-26 (Mon)', '2026-10-27 (Tue)', 1, 1], [803, '2026-10-28 (Wed)', '2026-10-28 (Wed)', 0, 0], [804, '2026-10-29 (Thu)', '2026-11-02 (Mon)', 4, 2]])}
<p>Average: 2.0 calendar days, 1.0 working day. Wrap the expression in ${c('AVG(1.0 * …)')} to get those.</p>
<h2>Why DATEDIFF(week, …) works</h2>
<p>${c('DATEDIFF(week, a, b)')} counts how many Saturday-to-Sunday boundaries lie between the two dates, whatever your ${c('DATEFIRST')} setting. Each one is a weekend, so two days come off.</p>
<div class="mistake"><b>Weekend orders and bank holidays</b>
<p>The shortcut assumes both dates are weekdays. An order placed on Saturday, or a bank holiday in the middle, needs a calendar table with an is_working_day column: count the working days in it between the two dates.</p></div>`,
  }),

  guide({
    slug: 'appointment-no-show-rate', name: 'Appointment no-show rate', topic: 'Aggregates',
    title: 'Appointment no-show rate in SQL (leave cancellations out)',
    short: 'No-shows ÷ (attended + no-shows), per clinic.',
    description: 'Calculate the no-show rate per clinic in SQL Server from appointment statuses, excluding cancelled appointments from the denominator.',
    lede: 'A no-show rate answers “of the people who were meant to turn up, how many didn’t?” Cancelled appointments were never meant to turn up, so they stay out of the sum.',
    ask: { who: 'Dr Imran Khan', role: 'Practice Manager', text: 'What was the no-show rate at each clinic in October? I want to decide where to start sending text reminders.' },
    plain: 'Count the appointments where the patient came and the ones where they did not come. Cancellations are left out, because the slot was freed in time. No-shows divided by (came + did not come) is the rate.',
    html: () => `
${table('October appointments by status', ['clinic', 'Attended', 'No show', 'Cancelled'], [['Leeds', 40, 6, 4], ['York', 30, 2, 8]])}
<h2>The query</h2>
${sql(`SELECT clinic,
       SUM(CASE WHEN status = 'Attended' THEN 1 ELSE 0 END) AS attended,
       SUM(CASE WHEN status = 'No show'  THEN 1 ELSE 0 END) AS no_shows,
       CAST(100.0 * SUM(CASE WHEN status = 'No show' THEN 1 ELSE 0 END)
            / NULLIF(SUM(CASE WHEN status IN ('Attended', 'No show') THEN 1 ELSE 0 END), 0)
            AS decimal(5,1)) AS no_show_pct
FROM Appointments
WHERE appt_date >= '2026-10-01' AND appt_date < '2026-11-01'
GROUP BY clinic
ORDER BY no_show_pct DESC;`)}
${table('Result', ['clinic', 'attended', 'no_shows', 'no_show_pct'], [['Leeds', 40, 6, '13.0'], ['York', 30, 2, '6.3']])}
<div class="mistake"><b>Dividing by every booking</b>
<p>6 ÷ 50 for Leeds is 12.0%, because the 4 cancellations quietly join the bottom of the fraction. The more cancellations a clinic has, the better its no-show rate looks, which is the opposite of useful.</p></div>`,
  }),

  guide({
    slug: 'double-booked-rooms', name: 'Double-booked rooms', topic: 'Joins',
    title: 'Find overlapping bookings in SQL (double-booked rooms)',
    short: 'Two bookings overlap when each starts before the other ends.',
    description: 'Find double-booked meeting rooms or overlapping appointments in SQL Server with a self-join and the start-before-end overlap test.',
    lede: 'Two time slots overlap when the first starts before the second ends and the second starts before the first ends. Join the bookings table to itself and test exactly that.',
    ask: { who: 'Gemma Hall', role: 'Office Manager', text: 'People keep turning up to rooms that are already in use. Can you find any double bookings this week?' },
    plain: 'Compare every booking with every other booking for the same room. If one starts before the other has finished, and the other starts before the first has finished, they clash. Back-to-back bookings (one ends at 10:30, the next starts at 10:30) do not clash.',
    html: () => `
${table('Bookings', ['booking', 'room', 'starts', 'ends'], [['B1', 'Room A', '09:00', '10:00'], ['B2', 'Room A', '09:30', '10:30'], ['B3', 'Room A', '10:30', '11:00'], ['B4', 'Room B', '13:00', '14:00'], ['B5', 'Room B', '13:00', '13:30']])}
<h2>The query</h2>
${sql(`SELECT a.room, a.booking_id AS booking_1, b.booking_id AS booking_2,
       a.starts_at AS starts_1, a.ends_at AS ends_1,
       b.starts_at AS starts_2, b.ends_at AS ends_2
FROM Bookings a
JOIN Bookings b
  ON b.room       = a.room
 AND b.booking_id > a.booking_id
 AND a.starts_at  < b.ends_at
 AND b.starts_at  < a.ends_at
WHERE a.status <> 'Cancelled' AND b.status <> 'Cancelled'
ORDER BY a.room, a.starts_at;`)}
${table('Result', ['room', 'booking_1', 'booking_2', 'starts_1', 'ends_1', 'starts_2', 'ends_2'], [['Room A', 'B1', 'B2', '09:00', '10:00', '09:30', '10:30'], ['Room B', 'B4', 'B5', '13:00', '14:00', '13:00', '13:30']])}
<p>B2 and B3 meet at 10:30 but do not overlap: “B3 starts before B2 ends” is 10:30 &lt; 10:30, which is false. That is why the test uses &lt;, not &lt;=.</p>
<div class="mistake"><b>Checking only whether the start falls inside</b>
<p>${c('b.starts_at BETWEEN a.starts_at AND a.ends_at')} misses a booking that starts earlier and runs right through the other one. The two-sided test catches every kind of overlap.</p></div>`,
  }),

  guide({
    slug: 'hotel-occupancy-per-night', name: 'Hotel occupancy per night', topic: 'Dates',
    title: 'Occupancy per night from check-in and check-out dates in SQL',
    short: 'A list of nights, joined to bookings that cover each one.',
    description: 'Turn hotel or holiday-let bookings into nightly occupancy in SQL Server with a list of nights and a check_in <= night < check_out join.',
    lede: 'Bookings are stored as ranges: check in, check out. Occupancy is per night, so you need a row for each night and then count the bookings that cover it.',
    ask: { who: 'Sofia Romano', role: 'Hotel Manager', text: 'What was occupancy each night at the start of November? We have 10 rooms.' },
    plain: 'Write down each night you care about. A booking covers a night if the guest checked in on or before that night and checks out after it. The night they check out is not a night they stay. Count bookings per night and divide by 10 rooms.',
    html: () => `
${table('Bookings', ['room', 'check_in', 'check_out', 'nights stayed'], [['R1', 'Nov 1', 'Nov 3', 'Nov 1, 2'], ['R2', 'Nov 1', 'Nov 2', 'Nov 1'], ['R3', 'Nov 2', 'Nov 5', 'Nov 2, 3, 4'], ['R4', 'Nov 3', 'Nov 4', 'Nov 3'], ['R5', 'Nov 2', 'Nov 3', 'Nov 2']])}
<h2>The query</h2>
${sql(`WITH nights AS (
  SELECT CAST('2026-11-01' AS date) AS night
  UNION ALL
  SELECT DATEADD(day, 1, night) FROM nights WHERE night < '2026-11-04'
)
SELECT n.night,
       COUNT(b.booking_id) AS rooms_sold,
       CAST(100.0 * COUNT(b.booking_id) / 10 AS decimal(5,1)) AS occupancy_pct
FROM nights n
LEFT JOIN Bookings b
  ON b.check_in  <= n.night
 AND b.check_out >  n.night
 AND b.status <> 'Cancelled'
GROUP BY n.night
ORDER BY n.night;`)}
${table('Result', ['night', 'rooms_sold', 'occupancy_pct'], [['2026-11-01', 2, '20.0'], ['2026-11-02', 3, '30.0'], ['2026-11-03', 2, '20.0'], ['2026-11-04', 1, '10.0']])}
<p>The ${c('nights')} CTE calls itself to make one row per date. For anything longer than about 100 days, add ${c('OPTION (MAXRECURSION 0)')} or, better, keep a permanent calendar table.</p>
<div class="mistake"><b>check_out &gt;= night</b>
<p>That counts the morning a guest leaves as a night they stayed, so every booking gets one night too many and occupancy looks higher than it was.</p></div>`,
  }),

  guide({
    slug: 'sales-vs-target', name: 'Sales vs target', topic: 'Joins',
    title: 'Sales against target per rep in SQL (with FULL OUTER JOIN)',
    short: 'Targets and actuals side by side, including people missing from one.',
    description: 'Compare each sales rep’s actual sales with their monthly target in SQL Server, keeping reps with no sales and sellers with no target using FULL OUTER JOIN.',
    lede: 'Targets and sales live in different tables, and they do not always line up. A rep can have a target and no sales, and a new starter can have sales and no target yet. FULL OUTER JOIN keeps both.',
    ask: { who: 'Harvey Rowe', role: 'Sales Manager', text: 'How did everyone do against October target? Percentage of target please, and don’t leave anyone off.' },
    plain: 'Put each rep’s target next to what they actually sold. Divide sold by target for the percentage. Someone with a target and no sales shows 0%. Someone who sold but has no target yet shows up too, with a blank percentage, so nobody is left off.',
    html: () => `
${joinDemo({ title: 'Step through it: targets FULL OUTER JOIN actual sales',
    left: { name: 'targets (Oct)', cols: ['rep', 'target'], rows: [['Priya', 10000], ['Tom', 8000], ['Jade', 8000]] },
    right: { name: 'actual (Oct)', cols: ['rep', 'sales'], rows: [['Priya', 11200], ['Tom', 6000], ['Omar', 3000]] },
    on: ['rep', 'rep'], type: 'full', pick: ['l.rep', 'l.target', 'r.rep', 'r.sales'], label: ['target_rep', 'target', 'sales_rep', 'sales'],
    say: (l, n) => (n ? `${l[0]} has a target and sales.` : `${l[0]} has a target but no sales this month.`) })}
<h2>The query</h2>
${sql(`WITH actual AS (
  SELECT rep, SUM(total) AS sales
  FROM Orders
  WHERE order_date >= '2026-10-01' AND order_date < '2026-11-01'
  GROUP BY rep
), targets AS (
  SELECT rep, target
  FROM SalesTargets
  WHERE target_month = '2026-10-01'
)
SELECT COALESCE(t.rep, a.rep) AS rep,
       t.target,
       ISNULL(a.sales, 0)     AS sales,
       CAST(100.0 * ISNULL(a.sales, 0) / NULLIF(t.target, 0) AS decimal(6,1)) AS attainment_pct
FROM targets t
FULL OUTER JOIN actual a ON a.rep = t.rep
ORDER BY attainment_pct DESC;`)}
${table('Result', ['rep', 'target', 'sales', 'attainment_pct'], [['Priya', 10000, 11200, '112.0'], ['Tom', 8000, 6000, '75.0'], ['Jade', 8000, 0, '0.0'], ['Omar', null, 3000, null]])}
<div class="mistake"><b>A LEFT JOIN from either side drops someone</b>
<p>From targets, Omar disappears. From sales, Jade disappears, and Jade is the person the manager most needs to see. ${c('COALESCE(t.rep, a.rep)')} gives every row a name whichever side it came from.</p></div>`,
  }),

  guide({
    slug: 'contracts-expiring-soon', name: 'Contracts expiring soon', topic: 'Dates',
    title: 'Contracts ending in the next 90 days in SQL',
    short: 'End date from today up to 90 days ahead, with days left.',
    description: 'List customer contracts or subscriptions that end in the next 90 days in SQL Server, with days remaining and whether they auto-renew.',
    lede: 'Account managers need the renewals coming up, early enough to do something about them. That is a date range starting today and ending 90 days from now.',
    ask: { who: 'Olivia Grant', role: 'Account Manager', text: 'Which contracts are up for renewal in the next three months? Soonest first, and tell me which ones auto-renew.' },
    plain: 'Keep the contracts whose end date is between today and 90 days from today. Work out how many days each one has left. Contracts that have already ended are a different list.',
    html: () => `
${table('Contracts (today is 8 November 2026)', ['contract', 'customer', 'end_date', 'auto_renew', 'in the list?'], [['C1', 'Acme', '2026-11-30', 'No', 'Yes, 22 days'], ['C2', 'Brightside', '2027-01-15', 'No', 'Yes, 68 days'], ['C3', 'Corley', '2027-04-01', 'No', 'No, 144 days'], ['C4', 'Dune', '2026-10-31', 'No', 'No, already ended'], ['C5', 'Elm & Co', '2026-12-10', 'Yes', 'Yes, 32 days']])}
<h2>The query</h2>
${sql(`DECLARE @today date = CAST(GETDATE() AS date);

SELECT contract_id, customer_name, end_date, auto_renew,
       DATEDIFF(day, @today, end_date) AS days_left
FROM Contracts
WHERE end_date >= @today
  AND end_date <  DATEADD(day, 90, @today)
ORDER BY end_date;`)}
${table('Result', ['contract_id', 'customer_name', 'end_date', 'auto_renew', 'days_left'], [['C1', 'Acme', '2026-11-30', 'No', 22], ['C5', 'Elm & Co', '2026-12-10', 'Yes', 32], ['C2', 'Brightside', '2027-01-15', 'No', 68]])}
<div class="mistake"><b>“Next three months” or “next 90 days”?</b>
<p>They are not the same: three calendar months from today might end on 8 February, while 90 days ends on 6 February. Use ${c('DATEADD(month, 3, @today)')} if the request says months, and say in the email which one you used.</p></div>`,
  }),

  guide({
    slug: 'pupils-below-attendance', name: 'Pupils below 90% attendance', topic: 'Aggregates',
    title: 'Pupils below 90% attendance in SQL',
    short: 'Present sessions ÷ possible sessions, kept with HAVING.',
    description: 'Calculate each pupil’s attendance percentage in SQL Server from session marks and list those below 90%, allowing for pupils who joined part-way through term.',
    lede: 'Schools record attendance per session (morning and afternoon). A pupil’s attendance is sessions present divided by sessions they could have attended, and pupils below 90% are usually flagged.',
    ask: { who: 'Mrs Clarke', role: 'Head of Year 9', text: 'Can I have every pupil in Year 9 below 90% attendance this half-term, lowest first, with their form?' },
    plain: 'For each pupil, count the sessions they were present at and the sessions they could have been at. Divide one by the other. Keep the pupils under 90%. Someone who joined late is measured only on the sessions since they joined.',
    html: () => `
${table('Sessions this half-term', ['pupil', 'form', 'present', 'possible', 'attendance'], [['Aisha', '9B', 38, 40, '95.0%'], ['Ben', '9A', 34, 40, '85.0%'], ['Chloe', '9A', 36, 40, '90.0%'], ['Daniel', '9C', 30, 38, '78.9% (joined late)']])}
<h2>The query</h2>
${sql(`SELECT p.pupil_name, p.form,
       SUM(CASE WHEN a.mark = 'Present' THEN 1 ELSE 0 END) AS present,
       COUNT(*) AS possible,
       CAST(100.0 * SUM(CASE WHEN a.mark = 'Present' THEN 1 ELSE 0 END) / COUNT(*)
            AS decimal(5,1)) AS attendance_pct
FROM Attendance a
JOIN Pupils p ON p.pupil_id = a.pupil_id
WHERE p.year_group = 9
  AND a.session_date >= '2026-09-03' AND a.session_date < '2026-10-24'
GROUP BY p.pupil_name, p.form
HAVING 100.0 * SUM(CASE WHEN a.mark = 'Present' THEN 1 ELSE 0 END) / COUNT(*) < 90
ORDER BY attendance_pct;`)}
${table('Result', ['pupil_name', 'form', 'present', 'possible', 'attendance_pct'], [['Daniel', '9C', 30, 38, '78.9'], ['Ben', '9A', 34, 40, '85.0']])}
<p>Chloe is exactly 90.0%, so “below 90” leaves her out. If the policy is “90% or below”, change the HAVING to ${c('<= 90')}.</p>
<div class="mistake"><b>Mark codes are more than present or absent</b>
<p>Late before registers close, educational visits and approved sport usually count as present. Check how your school’s codes map before you send names to a head of year.</p></div>`,
  }),

  guide({
    slug: 'library-overdue-fines', name: 'Library overdue fines', topic: 'Dates',
    title: 'Overdue loans and capped fines in SQL',
    short: 'Days overdue × daily rate, capped with CASE.',
    description: 'List overdue library loans in SQL Server with days overdue and a per-day fine capped at a maximum, using CROSS APPLY to avoid repeating the calculation.',
    lede: 'An overdue loan is one that has not come back and is past its due date. The fine is a daily rate times the days overdue, up to a maximum.',
    ask: { who: 'Peter Wilde', role: 'Library Assistant', text: 'Can you list everything overdue with the fine so far? It’s 20p a day, but never more than £5 per book.' },
    plain: 'Find loans that have not been returned and whose due date has passed. Count the days since the due date. Multiply by 20p. If that comes to more than £5, charge £5.',
    html: () => `
${table('Loans (today is 8 November 2026)', ['loan', 'title', 'due_date', 'returned_date', 'overdue?'], [['L1', 'The Hobbit', '2026-11-01', null, 'Yes, 7 days'], ['L2', 'Atlas of Britain', '2026-09-20', null, 'Yes, 49 days'], ['L3', 'Small Island', '2026-11-10', null, 'No, not due yet'], ['L4', 'Wolf Hall', '2026-10-30', '2026-11-02', 'No, returned']])}
<h2>The query</h2>
${sql(`SELECT l.loan_id, m.member_name, b.title, l.due_date,
       d.days_overdue,
       CAST(CASE WHEN d.days_overdue * 0.20 > 5.00 THEN 5.00
                 ELSE d.days_overdue * 0.20 END AS decimal(5,2)) AS fine
FROM Loans l
JOIN Members m ON m.member_id = l.member_id
JOIN Books   b ON b.book_id   = l.book_id
CROSS APPLY (VALUES (DATEDIFF(day, l.due_date, CAST(GETDATE() AS date)))) AS d(days_overdue)
WHERE l.returned_date IS NULL
  AND l.due_date < CAST(GETDATE() AS date)
ORDER BY d.days_overdue DESC;`)}
${table('Result', ['loan_id', 'title', 'due_date', 'days_overdue', 'fine'], [['L2', 'Atlas of Britain', '2026-09-20', 49, '5.00'], ['L1', 'The Hobbit', '2026-11-01', 7, '1.40']])}
<p>49 days at 20p would be £9.80, so the cap brings it down to £5.00. CROSS APPLY names the day count once, so the fine and the column both use the same number.</p>
<div class="mistake"><b>Charging for days the library was shut</b>
<p>Most libraries do not fine for closed days. If yours does not, you need a calendar of opening days and count those between the due date and today.</p></div>`,
  }),

  guide({
    slug: 'members-who-rejoined', name: 'Members who rejoined', topic: 'Window',
    title: 'Members who left and came back (win-backs) in SQL',
    short: 'LAG the previous membership’s end date; a long gap is a win-back.',
    description: 'Find gym or subscription members who lapsed and rejoined in SQL Server by comparing each membership’s start with the previous one’s end using LAG.',
    lede: 'A renewal starts the day after the old membership ends. A win-back starts weeks or months later. Put each membership next to the one before it and measure the gap.',
    ask: { who: 'Jess Turner', role: 'Gym Manager', text: 'How many members came back this year after letting their membership lapse? I want to know if the win-back offer is working.' },
    plain: 'Line up each member’s memberships in date order. For each one, look at when the previous one ended. A gap of a day or so is just a renewal. A gap of more than a week means they left and came back.',
    html: () => `
${slides([
    { title: 'Memberships, with the previous end date alongside', html: table('Memberships', ['member', 'start_date', 'end_date', 'prev_end', 'gap_days'], [['Amy', '2026-01-01', '2026-03-31', null, null], ['Amy', '2026-06-01', null, '2026-03-31', 62], ['Ben', '2026-02-01', '2026-04-30', null, null], ['Ben', '2026-05-01', '2026-07-31', '2026-04-30', 1], ['Cara', '2026-03-15', null, null, null]]) },
    { title: 'Gaps over 7 days: the win-backs', html: table('Result', ['member', 'left_on', 'came_back_on', 'gap_days'], [['Amy', '2026-03-31', '2026-06-01', 62]]) },
  ])}
<h2>The query</h2>
${sql(`WITH lined_up AS (
  SELECT member_id, start_date, end_date,
         LAG(end_date) OVER (PARTITION BY member_id ORDER BY start_date) AS prev_end
  FROM Memberships
)
SELECT member_id,
       prev_end   AS left_on,
       start_date AS came_back_on,
       DATEDIFF(day, prev_end, start_date) AS gap_days
FROM lined_up
WHERE prev_end IS NOT NULL
  AND DATEDIFF(day, prev_end, start_date) > 7
  AND start_date >= '2026-01-01'
ORDER BY came_back_on;`)}
<div class="mistake"><b>Choosing the gap</b>
<p>Ben’s second membership started the day after the first ended: a renewal, gap 1. Card payments that fail and retry can leave gaps of a few days, which is why the cut-off is a week, not a day. Agree the number with whoever runs the offer.</p></div>`,
  }),
];
