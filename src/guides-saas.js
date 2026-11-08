// Real-life guides: software products, customer support and marketing.
const { sql, c, table, joinDemo, slides, guide } = require('./article-html');

module.exports = [
  guide({
    slug: 'monthly-active-users', name: 'Monthly active users', topic: 'Reporting',
    title: 'Monthly active users (MAU) in SQL',
    short: 'COUNT(DISTINCT user_id) per month, not COUNT(*).',
    description: 'Count monthly active users in SQL Server from an events table with COUNT(DISTINCT), grouped by month, and why monthly figures do not add up to a yearly one.',
    lede: 'Monthly active users is the number of different people who did anything in a month. The word that matters is “different”: one person with 200 clicks is still one user.',
    ask: { who: 'Noah Clarke', role: 'Product Manager', text: 'What’s our MAU for each month this year? Just the number of people who used it, not page views.' },
    plain: 'Put every event into the month it happened in. In each month, count how many different people appear, no matter how many times each one shows up.',
    html: () => `
${slides([
    { title: 'Events', html: table('Events', ['user_id', 'event_time'], [['u1', '2026-09-02 08:10'], ['u2', '2026-09-02 09:30'], ['u1', '2026-09-15 17:45'], ['u3', '2026-09-28 12:00'], ['u1', '2026-10-01 08:05'], ['u4', '2026-10-07 14:20'], ['u4', '2026-10-21 19:02']]) },
    { title: 'Different people per month', note: 'September has 4 events but 3 people. October has 3 events but 2 people.', html: table('Result', ['month', 'active_users'], [['2026-09-01', 3], ['2026-10-01', 2]]) },
  ])}
<h2>The query</h2>
${sql(`SELECT DATEFROMPARTS(YEAR(event_time), MONTH(event_time), 1) AS month,
       COUNT(DISTINCT user_id) AS active_users
FROM Events
WHERE event_time >= '2026-01-01' AND event_time < '2027-01-01'
GROUP BY DATEFROMPARTS(YEAR(event_time), MONTH(event_time), 1)
ORDER BY month;`)}
<div class="mistake"><b>Adding months together</b>
<p>u1 was active in September and October. Add the two months and u1 counts twice. “How many people used it this year” is its own query: ${c('COUNT(DISTINCT user_id)')} over the whole year.</p></div>
<p>Agree what counts as “active” first. Logging in? Opening a page? Doing the main thing the product is for? Background events like automatic syncs should usually be left out.</p>`,
  }),

  guide({
    slug: 'cohort-retention', name: 'Cohort retention', topic: 'Reporting',
    title: 'Cohort retention table in SQL: who is still here a month later?',
    short: 'Group users by sign-up month, then check later months’ activity.',
    description: 'Build a monthly cohort retention table in SQL Server: users grouped by sign-up month, with the percentage active one and two months later.',
    lede: 'A cohort is everyone who signed up in the same month. Retention asks: of that group, what share was still active one month later, two months later, and so on.',
    ask: { who: 'Noah Clarke', role: 'Product Manager', text: 'Are people sticking around? Can you do the classic cohort table: sign-up month down the side, month 1 and month 2 retention across.' },
    plain: 'Put users into groups by the month they signed up. For each group, check how many of them did something in the following month, and in the month after that. Divide by the size of the group.',
    html: () => `
${slides([
    { title: 'Who signed up when, and when they were active', html: `<div class="jd-tables">${table('Users', ['user', 'signed_up'], [['A', 'Aug'], ['B', 'Aug'], ['C', 'Aug'], ['D', 'Aug'], ['E', 'Sep'], ['F', 'Sep']])}${table('Active in', ['user', 'months active'], [['A', 'Aug, Sep, Oct'], ['B', 'Aug, Sep, Oct'], ['C', 'Aug, Sep'], ['D', 'Aug'], ['E', 'Sep, Oct'], ['F', 'Sep']])}</div>` },
    { title: 'The cohort table', note: 'August: 3 of 4 came back in September, 2 of 4 in October. September’s month 2 is November, which has not finished, so leave it blank in the report.', html: table('Result', ['cohort', 'cohort_size', 'month_1_pct', 'month_2_pct'], [['2026-08-01', 4, '75.0', '50.0'], ['2026-09-01', 2, '50.0', '(not yet)']]) },
  ], { title: 'Building a cohort table' })}
<h2>The query</h2>
${sql(`WITH users AS (
  SELECT user_id, DATEFROMPARTS(YEAR(signup_date), MONTH(signup_date), 1) AS cohort
  FROM Users
), activity AS (
  SELECT DISTINCT user_id, DATEFROMPARTS(YEAR(event_time), MONTH(event_time), 1) AS active_month
  FROM Events
), months AS (
  SELECT u.cohort, u.user_id, DATEDIFF(month, u.cohort, a.active_month) AS months_after
  FROM users u
  JOIN activity a ON a.user_id = u.user_id
)
SELECT u.cohort,
       COUNT(DISTINCT u.user_id) AS cohort_size,
       CAST(100.0 * COUNT(DISTINCT CASE WHEN m.months_after = 1 THEN m.user_id END)
            / COUNT(DISTINCT u.user_id) AS decimal(5,1)) AS month_1_pct,
       CAST(100.0 * COUNT(DISTINCT CASE WHEN m.months_after = 2 THEN m.user_id END)
            / COUNT(DISTINCT u.user_id) AS decimal(5,1)) AS month_2_pct
FROM users u
LEFT JOIN months m ON m.user_id = u.user_id
GROUP BY u.cohort
ORDER BY u.cohort;`)}
<div class="mistake"><b>Months that have not happened yet</b>
<p>The query returns 0.0 for September’s month 2, because nobody can be active in a month that is not over. A zero there looks like everyone left. Blank out cells for unfinished months before the table goes in a slide.</p></div>`,
  }),

  guide({
    slug: 'monthly-recurring-revenue', name: 'Monthly recurring revenue', topic: 'Reporting',
    title: 'Monthly recurring revenue (MRR) in SQL',
    short: 'Active subscriptions on a date, yearly plans divided by 12.',
    description: 'Calculate MRR in SQL Server from a subscriptions table: subscriptions active on a date, with yearly plans converted to a monthly amount.',
    lede: 'MRR is what your active subscriptions are worth in a normal month. Monthly plans count at their price; yearly plans count at a twelfth of theirs, whenever the money actually arrived.',
    ask: { who: 'Sandra Okafor', role: 'Managing Director', text: 'What’s our MRR today? The finance number jumps around every time someone pays annually.' },
    plain: 'Find every subscription that is running today: it has started and has not ended. Monthly plans add their price. Yearly plans add their price divided by 12. The total is MRR.',
    html: () => `
${table('Subscriptions (today is 8 November 2026)', ['customer', 'billing_period', 'price', 'start_date', 'end_date', 'counts?'], [['Acme', 'monthly', 49, '2025-03-01', null, '49'], ['Brightside', 'yearly', 948, '2026-02-10', null, '948 ÷ 12 = 79'], ['Corley', 'monthly', 99, '2026-01-05', '2026-10-15', 'No, cancelled'], ['Dune', 'monthly', 29, '2026-11-20', null, 'No, not started']])}
<h2>The query</h2>
${sql(`DECLARE @asof date = CAST(GETDATE() AS date);

SELECT CAST(SUM(CASE billing_period
                  WHEN 'yearly' THEN price / 12.0
                  ELSE price
                END) AS decimal(12,2)) AS mrr,
       COUNT(*) AS paying_customers
FROM Subscriptions
WHERE start_date <= @asof
  AND (end_date IS NULL OR end_date > @asof);`)}
${table('Result', ['mrr', 'paying_customers'], [['128.00', 2]])}
<div class="mistake"><b>Using payments instead of subscriptions</b>
<p>Brightside paid £948 in February. If you add up payments by month, February looks huge and the other eleven months show nothing from them. MRR comes from what is running, not from what was paid that month.</p></div>`,
  }),

  guide({
    slug: 'trial-conversion-rate', name: 'Trial conversion rate', topic: 'Joins',
    title: 'Free trial to paid conversion rate in SQL',
    short: 'Trials LEFT JOIN subscriptions started within 30 days.',
    description: 'Measure trial-to-paid conversion in SQL Server: trials started in a month, and how many became a paid subscription within 30 days.',
    lede: 'Conversion rate is the share of trials that turned into a paying subscription within a set window, usually the trial length plus a little. The window belongs in the join.',
    ask: { who: 'Noah Clarke', role: 'Product Manager', text: 'Of the people who started a trial in October, how many paid within 30 days?' },
    plain: 'Take everyone who started a trial in October. For each one, check whether they started paying within 30 days of starting the trial. Converted people divided by all trials is the conversion rate.',
    html: () => `
${table('October trials, checked against paid subscriptions', ['user', 'trial_start', 'paid_start', 'days later', 'converted?'], [['u1', '2026-10-02', '2026-10-12', 10, 'Yes'], ['u2', '2026-10-05', null, null, 'No'], ['u3', '2026-10-09', '2026-11-23', 45, 'No (too late)'], ['u4', '2026-10-20', '2026-10-23', 3, 'Yes']])}
<h2>The query</h2>
${sql(`SELECT COUNT(*)          AS trials,
       COUNT(s.user_id)  AS converted,
       CAST(100.0 * COUNT(s.user_id) / COUNT(*) AS decimal(5,1)) AS conversion_pct
FROM Trials t
LEFT JOIN Subscriptions s
  ON s.user_id     = t.user_id
 AND s.start_date >= t.trial_start
 AND s.start_date <  DATEADD(day, 30, t.trial_start)
WHERE t.trial_start >= '2026-10-01'
  AND t.trial_start <  '2026-11-01';`)}
${table('Result', ['trials', 'converted', 'conversion_pct'], [[4, 2, '50.0']])}
<div class="mistake"><b>Measuring a month that is not over</b>
<p>u4 started on 20 October, so their 30 days run to 19 November. Run this on 8 November and late October trials have not had their full chance. Either wait, or report only trials whose window has closed.</p></div>
<p>If someone can have two subscriptions in the window (an upgrade, say), they would be counted twice. Use ${c('COUNT(DISTINCT s.user_id)')} if that can happen in your data.</p>`,
  }),

  guide({
    slug: 'feature-adoption', name: 'Feature adoption', topic: 'Joins',
    title: 'Feature adoption rate in SQL: who used it in the last 30 days?',
    short: 'Distinct users of the feature, LEFT JOINed to all active accounts.',
    description: 'Measure what share of active accounts used a feature in the last 30 days in SQL Server, and avoid error 130 from SUM over EXISTS.',
    lede: 'Feature adoption is “accounts that used the feature” over “accounts that could have”. Build the list of users first, then join it to all active accounts.',
    ask: { who: 'Noah Clarke', role: 'Product Manager', text: 'How many active customers used the new CSV export in the last 30 days? As a percentage please.' },
    plain: 'Make a list of every account that used the export at least once in the last 30 days. Then go through all active accounts and tick the ones on that list. Ticked divided by all is the adoption rate.',
    html: () => `
${joinDemo({ title: 'Step through it: active accounts, ticked if they used export',
    left: { name: 'Accounts (active)', cols: ['account_id', 'name'], rows: [[1, 'Acme'], [2, 'Brightside'], [3, 'Corley'], [4, 'Dune'], [5, 'Elm & Co']] },
    right: { name: 'used_export', cols: ['account_id'], rows: [[2], [4]] },
    on: ['account_id', 'account_id'], type: 'left', pick: ['l.name', 'r.account_id'], label: ['account', 'used_export_id'],
    say: (l, n) => (n ? `${l[1]} used the export.` : `${l[1]} did not use it: NULL, so COUNT skips them.`) })}
<h2>The query</h2>
${sql(`WITH used_export AS (
  SELECT DISTINCT account_id
  FROM Events
  WHERE event_name = 'export_csv'
    AND event_time >= DATEADD(day, -30, CAST(GETDATE() AS date))
)
SELECT COUNT(*)            AS active_accounts,
       COUNT(u.account_id) AS used_export,
       CAST(100.0 * COUNT(u.account_id) / COUNT(*) AS decimal(5,1)) AS adoption_pct
FROM Accounts a
LEFT JOIN used_export u ON u.account_id = a.account_id
WHERE a.status = 'Active';`)}
${table('Result', ['active_accounts', 'used_export', 'adoption_pct'], [[5, 2, '40.0']])}
<div class="mistake"><b>SUM(CASE WHEN EXISTS (…) THEN 1 END)</b>
<p>It reads naturally, but SQL Server stops with error 130: “Cannot perform an aggregate function on an expression containing an aggregate or a subquery.” Build the list first, as above, and count the matches. The ${c('DISTINCT')} matters too: without it, an account that exported ten times joins ten times.</p></div>`,
  }),

  guide({
    slug: 'support-sla-breaches', name: 'Support SLA breaches', topic: 'Dates',
    title: 'Support tickets that breached their response SLA, in SQL',
    short: 'Minutes to first response against a target per priority.',
    description: 'Find support tickets that missed their first-response target in SQL Server, including tickets with no response yet, using DATEDIFF in minutes and an SLA lookup.',
    lede: 'Each priority has a response target. A ticket breaches when the time from opening to first response is longer than its target, and a ticket that has had no response at all is still running up the clock.',
    ask: { who: 'Becky Ashworth', role: 'Support Lead', text: 'Which tickets have missed their response SLA today? Include ones nobody has picked up yet, those are the ones I need to see.' },
    plain: 'Work out how long each ticket waited for its first reply. If nobody has replied, count up to now. Compare that with the target for its priority: one hour for High, four for Normal, a day for Low.',
    html: () => `
${table('Tickets today (now is 17:00)', ['ticket', 'priority', 'created_at', 'first_response_at', 'waited', 'target'], [['T1', 'High', '09:00', '09:40', '40 min', '60 min'], ['T2', 'High', '10:00', '11:30', '90 min', '60 min'], ['T3', 'Normal', '11:00', '14:10', '190 min', '240 min'], ['T4', 'Normal', '12:00', null, '300 min so far', '240 min'], ['T5', 'Low', '08:00', '16:30', '510 min', '1,440 min']])}
<h2>The query</h2>
${sql(`SELECT t.ticket_id, t.priority, t.created_at, t.first_response_at,
       DATEDIFF(minute, t.created_at, COALESCE(t.first_response_at, GETDATE())) AS minutes_waiting,
       s.response_hours * 60 AS sla_minutes
FROM Tickets t
JOIN SlaTargets s ON s.priority = t.priority
WHERE DATEDIFF(minute, t.created_at, COALESCE(t.first_response_at, GETDATE()))
      > s.response_hours * 60
ORDER BY minutes_waiting DESC;`)}
${table('Result', ['ticket_id', 'priority', 'first_response_at', 'minutes_waiting', 'sla_minutes'], [['T4', 'Normal', null, 300, 240], ['T2', 'High', '11:30', 90, 60]])}
<div class="mistake"><b>Leaving out tickets with no reply</b>
<p>${c('DATEDIFF(minute, created_at, first_response_at)')} is NULL when there is no reply yet, and NULL &gt; 240 is not true, so T4, the worst one, disappears. ${c('COALESCE(first_response_at, GETDATE())')} keeps the clock running.</p></div>
<p>Many SLAs only count business hours. This version counts clock time; for business hours you need a calendar of opening hours to subtract evenings and weekends.</p>`,
  }),

  guide({
    slug: 'median-response-time', name: 'Median response time', topic: 'Window',
    title: 'Median in SQL Server: response times when the average lies',
    short: 'PERCENTILE_CONT(0.5) WITHIN GROUP … OVER (PARTITION BY …).',
    description: 'Calculate a median per group in SQL Server with PERCENTILE_CONT, and see why one slow ticket makes the average response time misleading.',
    lede: 'One ticket left over a weekend can drag the average response time up for the whole team. The median, the middle value, shows what a typical customer actually waited.',
    ask: { who: 'Becky Ashworth', role: 'Support Lead', text: 'Our average first response says 56 minutes but it doesn’t feel like that. Can you show me average and median per team?' },
    plain: 'Line up every response time from fastest to slowest and pick the one in the middle. That is the median. One very slow reply does not move it much, while it can make the average look terrible.',
    html: () => `
${table('Minutes to first response', ['team', 'responses (minutes)'], [['Billing', '5, 8, 12, 15, 240'], ['Tech', '20, 25, 30, 35']])}
<h2>The query</h2>
${sql(`SELECT DISTINCT team,
       AVG(1.0 * minutes) OVER (PARTITION BY team) AS avg_minutes,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY minutes)
           OVER (PARTITION BY team) AS median_minutes
FROM (
  SELECT team, DATEDIFF(minute, created_at, first_response_at) AS minutes
  FROM Tickets
  WHERE first_response_at IS NOT NULL
) t;`)}
${table('Result', ['team', 'avg_minutes', 'median_minutes'], [['Billing', '56.0', 12], ['Tech', '27.5', 27.5]])}
<p>Billing’s average is 56 because of one 240-minute reply. The median, 12, is what most Billing customers experienced. Tech has no outlier, so its average and median agree. With an even number of values, PERCENTILE_CONT takes the halfway point between the middle two: (25 + 30) ÷ 2 = 27.5.</p>
<div class="mistake"><b>PERCENTILE_CONT needs OVER</b>
<p>In SQL Server it is a window function, not a normal aggregate, so it cannot sit next to GROUP BY on its own. That is why the query uses ${c('OVER (PARTITION BY team)')} with ${c('SELECT DISTINCT')}. And ${c('AVG(1.0 * minutes)')}: AVG of whole numbers rounds 27.5 down to 27.</p></div>`,
  }),

  guide({
    slug: 'calls-by-hour', name: 'Calls by hour of day', topic: 'Aggregates',
    title: 'Call centre volume by hour of day in SQL (including the empty hours)',
    short: 'DATEPART(hour, …), and a list of hours so zeros still show.',
    description: 'Count calls per hour of the day in SQL Server with DATEPART(hour), and LEFT JOIN from a list of hours so hours with no calls show as 0.',
    lede: 'Rotas are planned around the busy hours. Group the calls by the hour they started in, and start from a list of all opening hours so an hour with no calls still appears.',
    ask: { who: 'Becky Ashworth', role: 'Support Lead', text: 'When are we busiest on the phones? Calls per hour for October, I’m redoing the rota.' },
    plain: 'Take the hour each call started in (9 for 09:47) and count the calls in each hour. Start from the full list of opening hours, 8 to 17, so if an hour had no calls at all it shows as zero instead of vanishing.',
    html: () => `
<h2>The query</h2>
${sql(`WITH hours AS (
  SELECT h FROM (VALUES (8),(9),(10),(11),(12),(13),(14),(15),(16),(17)) AS v(h)
)
SELECT hrs.h AS hour_of_day,
       COUNT(c.call_id) AS calls
FROM hours hrs
LEFT JOIN Calls c
  ON DATEPART(hour, c.started_at) = hrs.h
 AND c.started_at >= '2026-10-01'
 AND c.started_at <  '2026-11-01'
GROUP BY hrs.h
ORDER BY hrs.h;`)}
${table('Result', ['hour_of_day', 'calls'], [[8, 12], [9, 41], [10, 38], [11, 25], [12, 30], [13, 44], [14, 22], [15, 0], [16, 19], [17, 6]])}
<p>15:00 shows 0. Grouping the Calls table on its own would have skipped that row, and nobody would have noticed the phone system was down every afternoon that week.</p>
<div class="mistake"><b>Totals are not averages</b>
<p>These are October totals. For a rota you want calls per hour on a typical day: divide by the number of working days, or count per weekday and hour if Mondays are different.</p></div>`,
  }),

  guide({
    slug: 'email-campaign-rates', name: 'Email open and click rates', topic: 'Aggregates',
    title: 'Email campaign open rate, click rate and CTOR in SQL',
    short: 'Count distinct recipients per event type, then divide.',
    description: 'Work out email open rate, click rate and click-to-open rate per campaign in SQL Server from an events table, counting people rather than events.',
    lede: 'Email tools log events: sent, opened, clicked. Rates are about people, so count distinct recipients for each event type, then divide by the number sent.',
    ask: { who: 'Hannah Okoro', role: 'Marketing Lead', text: 'Can you give me open rate, click rate and click-to-open for our two October campaigns? The tool’s dashboard counts every open, not every person.' },
    plain: 'For each campaign, count how many different people were sent it, how many different people opened it and how many different people clicked. Opened ÷ sent is the open rate, clicked ÷ sent the click rate, clicked ÷ opened the click-to-open rate.',
    html: () => `
<h2>The query</h2>
${sql(`WITH people AS (
  SELECT campaign_id,
         COUNT(DISTINCT CASE WHEN event_type = 'sent'  THEN recipient_id END) AS sent,
         COUNT(DISTINCT CASE WHEN event_type = 'open'  THEN recipient_id END) AS opened,
         COUNT(DISTINCT CASE WHEN event_type = 'click' THEN recipient_id END) AS clicked
  FROM EmailEvents
  GROUP BY campaign_id
)
SELECT campaign_id, sent, opened, clicked,
       CAST(100.0 * opened  / sent              AS decimal(5,1)) AS open_rate,
       CAST(100.0 * clicked / sent              AS decimal(5,1)) AS click_rate,
       CAST(100.0 * clicked / NULLIF(opened, 0) AS decimal(5,1)) AS click_to_open
FROM people
ORDER BY campaign_id;`)}
${table('Result', ['campaign_id', 'sent', 'opened', 'clicked', 'open_rate', 'click_rate', 'click_to_open'], [['Oct-A', 1000, 420, 63, '42.0', '6.3', '15.0'], ['Oct-B', 800, 240, 48, '30.0', '6.0', '20.0']])}
<p>${c('NULLIF(opened, 0)')} turns a zero into NULL, so a campaign nobody opened gives a blank instead of a divide-by-zero error that stops the whole query.</p>
<div class="mistake"><b>Opens are not what they were</b>
<p>Some mail apps load images automatically, which records an “open” nobody made. Treat open rate as a rough signal and lean on clicks when comparing campaigns.</p></div>`,
  }),

  guide({
    slug: 'signups-by-source', name: 'Sign-ups by source', topic: 'Cleaning',
    title: 'Sign-ups by source in SQL when the tracking labels are a mess',
    short: 'TRIM, LOWER, NULLIF and a CASE to merge the spellings.',
    description: 'Group sign-ups by UTM source in SQL Server when the labels are inconsistent: fix case and spaces, merge aliases like fb and facebook, and label blanks as unknown.',
    lede: 'Tracking labels get typed by different people: “Google”, “google ”, “fb”, blank. Clean the label first, then group on the cleaned version, or every spelling becomes its own row.',
    ask: { who: 'Hannah Okoro', role: 'Marketing Lead', text: 'Where did October’s sign-ups come from? Last time the report had Facebook three times with different spellings.' },
    plain: 'Tidy each source label before counting: remove stray spaces, make it lower case, and treat empty as unknown. Map known nicknames to one name (fb is facebook). Then count sign-ups per tidied label.',
    html: () => `
${slides([
    { title: 'What the tracking recorded', html: table('Users.utm_source', ['utm_source', 'signups'], [['google', 3], ['Google ', 2], [null, 2], ['', 1], ['facebook', 2], ['fb', 1], ['Newsletter', 1]]) },
    { title: 'After cleaning', html: table('Result', ['source', 'signups'], [['google', 5], ['facebook', 3], ['(unknown)', 3], ['newsletter', 1]]) },
  ])}
<h2>The query</h2>
${sql(`SELECT v.source, COUNT(*) AS signups
FROM Users u
CROSS APPLY (VALUES (
  CASE
    WHEN NULLIF(TRIM(u.utm_source), '') IS NULL        THEN '(unknown)'
    WHEN LOWER(TRIM(u.utm_source)) IN ('fb', 'facebook') THEN 'facebook'
    ELSE LOWER(TRIM(u.utm_source))
  END
)) AS v(source)
WHERE u.signup_date >= '2026-10-01' AND u.signup_date < '2026-11-01'
GROUP BY v.source
ORDER BY signups DESC;`)}
<h2>Why CROSS APPLY (VALUES …)</h2>
<p>It gives the cleaned label a name, ${c('v.source')}, so you can GROUP BY it without copying the whole CASE expression twice. If you do copy it, the two copies must match exactly or SQL Server complains.</p>
<div class="mistake"><b>Fixing it in the report, every month</b>
<p>When the same clean-up keeps coming back, put the mapping in a small table (raw label → clean label) and join to it. Then marketing can add a new alias without anyone editing the query. TRIM needs SQL Server 2017 or later; on older versions use ${c('LTRIM(RTRIM(…))')}.</p></div>`,
  }),
];
