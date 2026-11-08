// Data careers: interviews, the first job, and growing beyond junior.
const { sql, c } = require('./article-html');

const say = (t) => `<div class="say-this"><b>Say it like this</b><p>${t}</p></div>`;
const check = (items) => `<ul class="checklist">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

module.exports = [
  // ================= interviews =================
  {
    slug: 'sql-interview-questions-junior', cat: 'Interviews',
    title: 'SQL interview questions for junior analysts (and what they are testing)',
    short: 'Joins, grouping, NULLs, duplicates, latest-per-group. Know why, not just how.',
    description: 'The SQL questions junior data analyst interviews ask most, what each one is really testing, and how to answer well.',
    lede: 'Junior SQL interviews come back to the same handful of ideas. Each question is testing whether you understand one thing that causes wrong numbers at work.',
    body: () => `
<h2>The usual questions</h2>
${check(['<b>“Customers who never ordered.”</b> Testing: LEFT JOIN … IS NULL or NOT EXISTS (<a href="/tsql/left-join-is-null">guide</a>).', '<b>“Total sales by month.”</b> Testing: grouping by a date part (<a href="/tsql/group-by-month">guide</a>).', '<b>“WHERE vs HAVING?”</b> Testing: rows before grouping, groups after (<a href="/guides/where-vs-having">guide</a>).', '<b>“Find duplicate emails.”</b> Testing: GROUP BY … HAVING COUNT(*) &gt; 1.', '<b>“Second highest salary.”</b> Testing: ties, DENSE_RANK (<a href="/guides/second-highest">guide</a>).', '<b>“Latest order per customer.”</b> Testing: ROW_NUMBER with PARTITION BY.', '<b>“COUNT(*) vs COUNT(column)?”</b> Testing: NULLs.'])}
<h2>Answer in three parts</h2>
<p>Say what you understand the question to mean, write the query, then say how you would check it. The check is the part most candidates skip, and the part interviewers remember.</p>
${sql(`-- Latest order per customer
WITH ranked AS (
  SELECT customer_id, order_id, order_date,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn
  FROM Orders
)
SELECT customer_id, order_id, order_date FROM ranked WHERE rn = 1;
-- Check: one row per customer. COUNT(*) here = COUNT(DISTINCT customer_id) in Orders.`)}`,
  },
  {
    slug: 'live-sql-coding-interview-tips', cat: 'Interviews',
    title: 'Live SQL coding interview tips: what to do with the clock running',
    short: 'Clarify, sketch the shape of the result, build it in steps, check it.',
    description: 'How to handle a live SQL coding interview: clarifying the question, building the query step by step, narrating, and checking results under pressure.',
    lede: 'Live coding feels harder than it is because someone is watching. Interviewers mostly want to see how you approach a problem, and a steady, step-by-step process looks better than a fast guess.',
    body: () => `
<h2>A process to fall back on</h2>
${check(['<b>Clarify:</b> “Should cancelled orders be included? Does last month mean October?”', '<b>Describe the result:</b> “So one row per region, with a count and a total.”', '<b>Start small:</b> SELECT from one table with the filter, and run it.', '<b>Add one thing at a time:</b> the join, then the grouping, running after each step.', '<b>Check:</b> does the row count make sense? Does a total match a quick sum?'])}
<h2>Talk while you type</h2>
${say('I’m going to start with just the October orders so I can see what the data looks like, then join to customers for the region.')}
<p>You do not need to narrate every key press. A sentence before each step is enough to show your thinking.</p>
<div class="mistake"><b>Writing the whole query before running anything</b>
<p>If a 25-line query errors, you will be debugging under pressure. Five lines that run, then ten, then fifteen, keeps you in control.</p></div>`,
  },
  {
    slug: 'explain-a-join-in-an-interview', cat: 'Interviews',
    title: 'How to explain a JOIN in an interview (simply)',
    short: 'Two lists, a shared ID, and what happens to rows with no match.',
    description: 'A clear way to explain INNER, LEFT and FULL OUTER JOIN in a data interview, with a plain-English example and the follow-up questions to expect.',
    lede: '“Explain the difference between an inner and a left join” is asked in almost every junior interview. A short, concrete answer with an example beats a textbook definition.',
    body: () => `
<h2>An answer that works</h2>
${say('A join lines up two tables on a shared ID, like customers and their orders. An inner join only keeps customers who have at least one order. A left join keeps every customer, and where they have no orders the order columns are NULL. I’d use a left join for “every customer and their orders if any”, and a left join with WHERE order_id IS NULL to find customers who never ordered.')}
<h2>Follow-ups to expect</h2>
${check(['“What if a customer has three orders?” They appear three times.', '“Why might a total double after a join?” One-to-many: <a href="/guides/join-doubled-my-totals">totals copied onto each line</a>.', '“What does a filter in WHERE do to a left join?” It can turn it into an inner join.', '“When would you use a full outer join?” Reconciling two lists.'])}
<p>Want to see one step by step? The <a href="/guides/left-join">LEFT JOIN guide</a> lets you walk through it a row at a time, which is also a good way to rehearse the explanation.</p>`,
  },
  {
    slug: 'talking-through-your-sql', cat: 'Interviews',
    title: 'Talking through your thinking in a SQL interview',
    short: 'Say the question back, say your plan, say your check.',
    description: 'How to narrate your approach in a technical data interview so the interviewer can follow and credit your reasoning, even if the query is not perfect.',
    lede: 'Interviewers cannot give credit for thinking they cannot hear. A few sentences at the right moments turn a half-finished query into evidence you would have got there.',
    body: () => `
<h2>Three moments to speak</h2>
${say('<b>Before:</b> “So you want each region’s revenue for last month, only shipped orders, biggest first. Is that right?”')}
${say('<b>During:</b> “I’m grouping by region now. I’ll use SUM on the order total, not the lines, so nothing gets double-counted.”')}
${say('<b>After:</b> “To check, I’d compare the grand total with a simple SUM over the same month without grouping.”')}
<h2>When you are unsure</h2>
<p>Say what you would look up and why: “I’d check whether this column includes VAT.” That is exactly what you would do at work, and interviewers know it.</p>
<div class="mistake"><b>Long silences</b>
<p>Thinking quietly is fine for a few seconds. After that, say what you are considering, even if it is “I’m deciding between a subquery and a window function”.</p></div>`,
  },
  {
    slug: 'star-answers-data-analyst', cat: 'Interviews',
    title: 'STAR answers for data analyst interviews (with examples)',
    short: 'Situation, task, action, result. Put the numbers in the result.',
    description: 'How to use the STAR method for competency questions in data analyst interviews, with worked examples about finding errors, deadlines and explaining data.',
    lede: 'Competency questions like “tell me about a time you found an error” are easier with a structure. STAR keeps you short and makes sure you end with a result.',
    body: () => `
<h2>“Tell me about a time you found a mistake in data”</h2>
${say('<b>Situation:</b> Our monthly sales report didn’t match finance’s figure. <b>Task:</b> I was asked to find out why. <b>Action:</b> I compared the two at order level and found our report joined orders to order lines, so orders with several lines were counted several times. <b>Result:</b> I fixed the query to total each order first, the numbers matched, and I added a row-count check to the report.')}
<h2>“Tell me about a tight deadline”</h2>
${say('<b>Situation:</b> A director needed customer numbers for a board meeting the next morning. <b>Task:</b> Pull and check them that afternoon. <b>Action:</b> I agreed the exact definition first, wrote the query, checked it against last quarter’s published number, and sent it with the date range in the subject. <b>Result:</b> It went into the pack unchanged, and the director asked for the same format each quarter.')}
<h2>Prepare four or five stories</h2>
<p>An error you found, a deadline, explaining data to a non-technical person, a disagreement about numbers, and something you learned quickly. Most questions fit one of them.</p>`,
  },
  {
    slug: 'questions-to-ask-data-interview', cat: 'Interviews',
    title: 'Questions to ask at the end of a data analyst interview',
    short: 'Ask about the data, the requests, and who you would learn from.',
    description: 'Good questions to ask interviewers at the end of a data analyst interview, and what the answers tell you about the job.',
    lede: 'The questions you ask show how you think about the job. They are also your chance to find out whether this is a team you will learn in.',
    body: () => `
<h2>About the work</h2>
${check(['What does a typical week of requests look like?', 'Which database and reporting tools do you use?', 'What is the biggest data headache the team has right now?', 'How do you check numbers before they go to senior people?'])}
<h2>About learning</h2>
${check(['Who would I go to with a question in my first month?', 'Is there code review, or a senior who looks over queries?', 'What did the last person in this role go on to do?'])}
<h2>About success</h2>
${say('What would you want me to have done by the end of my first three months?')}
<p>The answer tells you what they really need, and gives you a chance to say how you would do it.</p>`,
  },
  {
    slug: 'case-study-interview-data-analyst', cat: 'Interviews',
    title: 'Data analyst case study interviews: how to structure your answer',
    short: 'Clarify the goal, list the data, define the metric, then the query.',
    description: 'How to approach a data analyst case study interview, such as investigating a drop in sales, with a clear structure and example questions.',
    lede: 'Case studies like “sales dropped 10% last month, how would you investigate?” test how you break a vague problem into questions data can answer.',
    body: () => `
<h2>A structure that works</h2>
${check(['<b>Check it is real:</b> same definition, same date range, data complete, no system change?', '<b>Split it up:</b> by region, channel, product, new vs returning customers.', '<b>Find where the drop lives:</b> one region, or everywhere?', '<b>Look for causes:</b> prices, stock-outs, a campaign that ended, a website issue.', '<b>Recommend:</b> what to look at next, or what to do.'])}
<h2>Show one query</h2>
${sql(`-- Is the drop everywhere, or in one channel?
SELECT channel,
       SUM(CASE WHEN order_date >= '2026-10-01' AND order_date < '2026-11-01' THEN total END) AS oct,
       SUM(CASE WHEN order_date >= '2026-09-01' AND order_date < '2026-10-01' THEN total END) AS sep
FROM Orders
GROUP BY channel;`)}
<div class="mistake"><b>Jumping to a cause</b>
<p>“It’s probably the weather” before checking the data is complete is the classic miss. Checking the number is right comes first, every time.</p></div>`,
  },
  {
    slug: 'stuck-in-a-sql-interview', cat: 'Interviews',
    title: 'What to do when you get stuck in a SQL interview',
    short: 'Say where you are stuck, solve a smaller version, ask one good question.',
    description: 'Practical steps for recovering when you get stuck during a live SQL interview, with phrases to use and ways to keep making progress.',
    lede: 'Everyone gets stuck sometimes. How you get unstuck is part of what is being assessed, and interviewers often help a candidate who is clearly reasoning.',
    body: () => `
<h2>Name the problem</h2>
${say('I’ve got one row per order but I need one per customer. I think I need to group, but I’m not sure how to keep the latest date.')}
<p>Saying exactly where you are stuck often unsticks you, and it gives the interviewer something to nudge.</p>
<h2>Solve a smaller version</h2>
<p>Drop the hard part and get the rest working: the right rows first, then the grouping, then the tricky column. A working partial answer scores better than a broken complete one.</p>
<h2>Ask one targeted question</h2>
${say('Would it be OK if I used a window function here, or would you like it with GROUP BY only?')}
<div class="mistake"><b>Going quiet and deleting everything</b>
<p>Keep what works. Comment out what does not. Interviewers can only credit what they can see.</p></div>`,
  },
  {
    slug: 'window-functions-interview-questions', cat: 'Interviews',
    title: 'Window function interview questions (ROW_NUMBER, RANK, LAG)',
    short: 'Latest per group, top N per group, change from last period, running totals.',
    description: 'The window function questions that come up in data analyst interviews, with short example answers using ROW_NUMBER, RANK, LAG and SUM OVER.',
    lede: 'Window functions separate confident juniors from beginners in interviews. Four patterns cover most questions.',
    body: () => `
<h2>Top N per group</h2>
${sql(`-- Top 2 products by revenue in each category
SELECT category, product_name, revenue
FROM (
  SELECT category, product_name, revenue,
         DENSE_RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rk
  FROM ProductRevenue
) t
WHERE rk <= 2;`)}
<h2>Change from last period</h2>
${sql(`SELECT month, revenue,
       revenue - LAG(revenue) OVER (ORDER BY month) AS change
FROM MonthlyRevenue;`)}
<h2>Running total</h2>
${sql(`SELECT order_date, total,
       SUM(total) OVER (ORDER BY order_date, order_id
                        ROWS UNBOUNDED PRECEDING) AS running_total
FROM Orders;`)}
<h2>The follow-up they always ask</h2>
<p>“What is the difference between ROW_NUMBER, RANK and DENSE_RANK?” It is all about ties. See the <a href="/tsql/rank">table that shows all three</a>, then say which one fits the question and why.</p>`,
  },
  {
    slug: 'explaining-a-project-you-built', cat: 'Interviews',
    title: 'How to explain a portfolio project in an interview',
    short: 'Question, data, approach, answer, what you would do next: two minutes.',
    description: 'How to present a SQL or data portfolio project in an interview in two minutes, and how to handle the follow-up questions.',
    lede: '“Tell me about a project” is an invitation to show how you work. A tight two-minute version, with detail ready for follow-ups, works best.',
    body: () => `
<h2>The two-minute version</h2>
${say('I wanted to know which couriers were causing late deliveries for an online shop. The data was 18 months of shipments with promised and actual dates, but about 5% had no delivery date. I counted those as late if the promised date had passed, grouped by courier and month, and found one courier was late twice as often in winter. If I took it further, I’d add the cost of each late parcel.')}
<h2>Have the detail ready</h2>
${check(['The trickiest query, and why it was tricky', 'One data problem and how you handled it', 'One thing you would do differently', 'How you checked the result was right'])}
<div class="mistake"><b>Starting with the tools</b>
<p>“I used SQL Server and Power BI and…” loses people. Start with the question and the answer; mention tools when they ask how.</p></div>`,
  },
  {
    slug: 'salary-questions-data-interviews', cat: 'Interviews',
    title: 'Handling salary questions in data job interviews',
    short: 'Research the range, give a range, and talk about the whole package.',
    description: 'How junior data candidates can handle salary expectation questions and negotiate an offer, without quoting numbers they cannot back up.',
    lede: 'Salary questions feel awkward, especially for a first data job. Some research and a prepared sentence make them routine.',
    body: () => `
<h2>Research first</h2>
<p>Look at advertised salaries for similar titles in your area and sector, and ask recruiters what they see. Public sector roles usually publish pay bands; use them as a reference point.</p>
<h2>When asked for your expectations</h2>
${say('From what I’ve seen for similar junior analyst roles locally, I’m expecting something in the range of the advertised band. I’m flexible for the right training and progression.')}
<h2>When you get an offer</h2>
<p>Thank them, ask for it in writing, and take a day. If you ask for more, give one reason (another offer, a skill they wanted, the local market) and a specific number. Training budget, flexible working and a review after six months are worth asking about too.</p>
<div class="mistake"><b>Accepting on the call</b>
<p>Saying “thank you, can I come back to you tomorrow?” is normal and expected. Nobody withdraws a junior offer for that.</p></div>`,
  },
  {
    slug: 'handling-rejection-and-feedback', cat: 'Interviews',
    title: 'Handling rejection when applying for data jobs',
    short: 'Ask for feedback, change one thing, keep a steady pace.',
    description: 'How to deal with rejections during a junior data job search: getting useful feedback, spotting patterns and keeping momentum.',
    lede: 'Most junior data applicants collect a lot of rejections before an offer. Each one is information, if you treat it as data.',
    body: () => `
<h2>Ask for one or two points</h2>
${say('Thank you for letting me know. If you have time, I’d really value one or two things I could improve for my next interview.')}
<h2>Look for patterns</h2>
<p>Keep a note of each stage you reach and any feedback. Three “technical test” rejections in a row point to timed practice. Three after final interviews point to how you talk about your work.</p>
<h2>Change one thing at a time</h2>
<p>New CV, new portfolio and new targeting all at once makes it impossible to tell what helped. Change the weakest stage first.</p>
<h2>Keep a steady rhythm</h2>
<p>Set a weekly target you can keep (applications, practice, one project improvement) rather than bursts followed by burnout.</p>`,
  },

  // ================= first job =================
  {
    slug: 'first-week-as-a-data-analyst', cat: 'First job',
    title: 'Your first week as a data analyst: what to do',
    short: 'Learn the tables, the people and the regular reports. Ask lots.',
    description: 'What to focus on in your first week in a junior data analyst job: understanding the data, meeting the people who ask for reports, and setting up safely.',
    lede: 'Nobody expects much output in week one. They do expect you to start learning where the data is, what it means, and who relies on it.',
    body: () => `
<h2>A first-week checklist</h2>
${check(['Get read access, and confirm it is read-only', 'Find the five tables everything uses (orders, customers, products…)', 'Ask for the list of regular reports and who receives them', 'Meet two or three people who send the most requests', 'Rerun last month’s main report and check you get the same numbers', 'Start a notes file: table names, odd columns, who knows what'])}
<h2>Questions worth asking</h2>
${say('Which numbers do senior people look at every week? Where have the numbers been wrong before?')}
<p>The second question tells you where the traps are, and saves you from walking into them.</p>`,
  },
  {
    slug: 'clarifying-a-data-request', cat: 'First job',
    title: 'Asking good questions about a data request',
    short: 'Period, definition, format, deadline, and what it is for.',
    description: 'The clarifying questions to ask before writing SQL for a data request, so you deliver the right numbers the first time.',
    lede: 'Most wrong reports come from a question nobody asked. Two minutes of clarifying saves an afternoon of redoing.',
    body: () => `
<h2>The five questions</h2>
${check(['<b>Period:</b> “Last month” as in October, or the last 30 days? Including today?', '<b>Definition:</b> Does “customers” include ones who cancelled? Revenue with or without VAT?', '<b>Shape:</b> One row per what? Which columns?', '<b>Deadline:</b> When do you need it, and is a rough number sooner useful?', '<b>Purpose:</b> What decision is it for? (Often changes the answer.)'])}
${say('Happy to. Quick check: by “last month” do you mean 1–31 October, and should cancelled orders be left out?')}
<h2>Write the answers down</h2>
<p>Put them in the reply with the results: “October 2026, shipped orders only, excluding VAT.” If someone questions the number later, the definition travels with it. See <a href="/guides/email-the-numbers">emailing the numbers</a>.</p>`,
  },
  {
    slug: 'checking-your-numbers', cat: 'First job',
    title: 'Checking your numbers before you send them',
    short: 'Row counts, totals, a known figure, and a common-sense look.',
    description: 'Simple checks junior analysts can run on SQL results before sending them: row counts, reconciling totals, comparing with known numbers and sense checks.',
    lede: 'The query ran, so it must be right? Not necessarily. A few quick checks catch most mistakes before anyone else sees them.',
    body: () => `
<h2>Four quick checks</h2>
${check(['<b>Row count:</b> is it roughly what you expected? Did a join multiply rows?', '<b>Totals:</b> does the grouped total match a simple SUM over the same filter?', '<b>A known number:</b> compare with last month’s report or a figure finance published.', '<b>Common sense:</b> negative quantities? Dates in the future? One customer with 90% of revenue?'])}
${sql(`-- The grouped report should add up to the ungrouped total
SELECT SUM(total) FROM Orders
WHERE order_date >= '2026-10-01' AND order_date < '2026-11-01'
  AND status <> 'Cancelled';`)}
<div class="mistake"><b>Checking only when the number looks odd</b>
<p>The dangerous mistakes look plausible. Make the checks a habit for every report that goes to someone senior.</p></div>`,
  },
  {
    slug: 'working-with-production-safely', cat: 'First job',
    title: 'Working with a live (production) database safely',
    short: 'Read-only where possible, WHERE before UPDATE, transactions, no NOLOCK habits.',
    description: 'Safety habits for junior analysts with access to live databases: read-only access, testing in transactions, avoiding heavy queries at peak times.',
    lede: 'Most analysts only read data, but even reading can slow down a live system, and anyone with write access can do real damage with one missing WHERE.',
    body: () => `
<h2>Habits that keep you safe</h2>
${check(['Ask for read-only access, or a reporting copy, wherever possible', 'Check which server and database you are connected to before running anything', 'Avoid huge queries on the live system at busy times', 'Use TOP or LIMIT while exploring a big table'])}
<h2>If you must change data</h2>
${sql(`BEGIN TRANSACTION;

UPDATE Customers
SET city = 'Leeds'
WHERE customer_id = 1017;     -- check: 1 row affected?

-- If the row count is right:  COMMIT;
-- If not:                     ROLLBACK;`)}
<p>Write the WHERE first, run it as a SELECT to see which rows it hits, then change it to an UPDATE inside a transaction.</p>
<div class="mistake"><b>Copying WITH (NOLOCK) everywhere</b>
<p>It can return rows twice or not at all. If someone suggests it to make a report faster, read <a href="/tsql/nolock">what NOLOCK really does</a> first.</p></div>`,
  },
  {
    slug: 'documenting-your-queries', cat: 'First job',
    title: 'Documenting your SQL so future you (and others) understand it',
    short: 'A header comment, named CTEs, and why-comments on the tricky bits.',
    description: 'Simple ways to document SQL queries at work: header comments, readable CTE names, explaining business rules, and saving queries where others can find them.',
    lede: 'In six months someone will ask how you got a number. A few comments today mean you can answer in a minute instead of rebuilding it from scratch.',
    body: () => `
<h2>A header on every saved query</h2>
${sql(`/*
  Purpose:  Monthly repeat customer rate for the board pack
  Asked by: Sandra Okafor
  Rules:    Cancelled orders excluded. A repeat customer has 2+ orders ever.
  Last checked against finance: Oct 2026
*/`)}
<h2>Name the steps</h2>
<p>CTEs called ${c('per_customer')} and ${c('repeaters')} explain themselves. CTEs called ${c('t1')} and ${c('x')} do not.</p>
<h2>Comment the why, not the what</h2>
${sql(`-- Finance count an order in the month it shipped, not when it was placed.
WHERE shipped_date >= '2026-10-01' AND shipped_date < '2026-11-01'`)}
<p>Keep the file somewhere shared (a team folder or a repository), not only on your laptop.</p>`,
  },
  {
    slug: 'prioritising-data-requests', cat: 'First job',
    title: 'Saying “not yet” to data requests: prioritising as a junior',
    short: 'Ask for the deadline and the decision, offer a quick version, involve your manager.',
    description: 'How junior analysts can manage competing data requests politely: asking about deadlines, offering a rough version, and escalating priorities.',
    lede: 'Once people learn you can get numbers, requests pile up. Prioritising is part of the job, and saying “not yet” politely is a skill.',
    body: () => `
<h2>Ask two questions</h2>
${say('When do you need this, and what will it be used for? I want to make sure it gets the right amount of time.')}
<p>A “today” for a board meeting outranks a “today” that turns out to mean “whenever”.</p>
<h2>Offer a quick version</h2>
${say('I can send a rough count this afternoon and the full breakdown on Thursday. Would that work?')}
<h2>When two people both say urgent</h2>
<p>Do not choose between two senior people yourself. Tell your manager what is on your list and ask them to set the order. That is their job, and it protects you.</p>`,
  },
  {
    slug: 'presenting-numbers-to-managers', cat: 'First job',
    title: 'Presenting numbers to non-technical managers',
    short: 'Answer first, one chart, what it means, what to do.',
    description: 'How junior analysts can present data to non-technical managers: leading with the answer, choosing one clear chart, and explaining caveats simply.',
    lede: 'Managers want the answer and what it means for them. The query, the joins and the clever bits are for the appendix, if at all.',
    body: () => `
<h2>Lead with the answer</h2>
${say('Returns are up 18% on last month, almost all from one product: the new blender. The other categories are flat.')}
<h2>One chart, labelled in plain words</h2>
<p>A bar chart with clear labels beats a dashboard with twelve tiles. Title the chart with the point it makes: “Blender returns doubled in October”.</p>
<h2>Caveats in one line</h2>
${say('This counts returns by the date they came back, so some October returns are September sales.')}
<h2>End with what to do</h2>
<p>Suggest a next step, even a small one: “Worth checking with the supplier whether something changed in this batch.”</p>`,
  },
  {
    slug: 'when-your-numbers-dont-match', cat: 'First job',
    title: 'When your numbers don’t match someone else’s',
    short: 'Compare definitions first, then filters, then rows.',
    description: 'How to reconcile two different numbers for the same metric at work: comparing definitions, date ranges, filters and row-level data.',
    lede: 'Two reports, two numbers, one awkward meeting. Most differences come from definitions, not mistakes. Work through them in order and the answer usually turns up quickly.',
    body: () => `
<h2>Check in this order</h2>
${check(['<b>Definition:</b> orders placed or shipped? With VAT? Including cancelled?', '<b>Date range:</b> calendar month, or 30 days? Time zone? Today included?', '<b>Filters:</b> test accounts, internal orders, a region left out?', '<b>Source:</b> same table, or a copy refreshed at a different time?', '<b>Rows:</b> compare the two lists row by row and look at what is in one but not the other.'])}
${sql(`-- What is in my list but not theirs (both loaded into tables)?
SELECT order_id FROM MyReport
EXCEPT
SELECT order_id FROM TheirReport;`)}
<h2>Talk about it calmly</h2>
${say('I think we’re counting slightly different things. Mine uses shipped date and excludes cancellations. Could we agree which one the report should use?')}`,
  },
  {
    slug: 'imposter-syndrome-junior-data', cat: 'First job',
    title: 'Imposter syndrome as a junior data analyst',
    short: 'Everyone looks things up. Keep a list of what you have learned.',
    description: 'Practical ways for junior data analysts to deal with imposter syndrome: normalising looking things up, tracking progress, and asking for help.',
    lede: 'Feeling like you do not know enough is very common in a first data job. It usually means you are noticing how much there is to learn, which is a good sign.',
    body: () => `
<h2>Everyone looks things up</h2>
<p>Senior analysts search for syntax every day. Knowing what to search for, and checking the result, is the real skill.</p>
<h2>Keep a “learned this” list</h2>
<p>One line a day: “Learned that BETWEEN on datetime misses the last day.” After a month, reading it back is the best answer to “I don’t know anything”.</p>
<h2>Ask early</h2>
${say('I’ve spent 20 minutes on this join and I think I’m missing something about the data. Have you got five minutes?')}
<p>Asking after a real attempt, with a specific question, is what good colleagues do. Struggling alone for a day is not braver, just slower.</p>`,
  },

  // ================= growing =================
  {
    slug: 'junior-to-mid-level-analyst', cat: 'Growing',
    title: 'From junior to mid-level data analyst: what changes',
    short: 'Less “how do I write this”, more “what should we be asking”.',
    description: 'What separates a mid-level data analyst from a junior: owning problems end to end, shaping questions, and improving the team’s data.',
    lede: 'Juniors answer the questions they are given. Mid-level analysts shape the question, own the answer end to end, and leave the data a bit better than they found it.',
    body: () => `
<h2>Signs you are ready to move up</h2>
${check(['You challenge vague requests and suggest a better metric', 'People ask for you by name for certain areas', 'You fix the root cause of a data problem, not just your report', 'You review other people’s queries and catch mistakes', 'You can explain technical limits to managers without jargon'])}
<h2>Skills to build next</h2>
<p>Data modelling (why tables are shaped the way they are), performance basics, a dashboard tool to a high standard, and possibly Python for automation. Pick the one your team most needs.</p>
<h2>Make it visible</h2>
<p>Keep a list of problems you solved and their impact. Bring it to your review. Promotions go to people whose impact is easy to see.</p>`,
  },
  {
    slug: 'sql-performance-basics', cat: 'Growing',
    title: 'SQL performance basics every analyst should know',
    short: 'Filter early, avoid functions on indexed columns, select only what you need.',
    description: 'Simple SQL performance habits for analysts: sargable filters, selecting fewer columns, checking row counts, and when to ask a DBA.',
    lede: 'You do not need to be a DBA to stop writing slow queries. A few habits make most analyst queries faster and kinder to shared servers.',
    body: () => `
<h2>Filter on the bare column</h2>
${sql(`-- Slow: a function on the column can stop SQL Server using an index
WHERE YEAR(order_date) = 2026

-- Fast: a range on the bare column
WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'`)}
<h2>Other habits</h2>
${check(['Name the columns you need instead of SELECT *', 'Filter before joining big tables where you can (a CTE or subquery)', 'Use EXISTS for “has any” questions instead of joining and DISTINCT', 'Test on a small date range first, then widen it'])}
<p>The <a href="/tools">SARGable checker</a> spots the first pattern for you.</p>
<div class="mistake"><b>Adding indexes yourself</b>
<p>If a report is slow every day, tell whoever looks after the database and show them the query. Indexes help some queries and slow down others; it is their call.</p></div>`,
  },
  {
    slug: 'getting-a-pay-rise-in-data', cat: 'Growing',
    title: 'Getting a pay rise as a data analyst',
    short: 'Evidence of impact, market comparison, a clear ask at the right time.',
    description: 'How data analysts can prepare for a pay rise conversation: collecting evidence of impact, comparing with the market, and timing the request.',
    lede: 'Analysts have an advantage in pay conversations: you are used to building a case with evidence. Do the same for yourself.',
    body: () => `
<h2>Collect the evidence</h2>
${check(['Reports you built that people rely on, and how often', 'Time saved by automating something (hours a month)', 'Errors you found and what they would have cost', 'New responsibilities since your salary was set'])}
<h2>Know the market</h2>
<p>Compare advertised salaries for your title and experience in your area. Recruiters will tell you what they are seeing if you ask.</p>
<h2>Time it and ask clearly</h2>
${say('Since my last review I’ve taken over the weekly sales reporting and automated the stock report, which saves the warehouse team around three hours a month. Similar roles locally are advertised above my current salary. I’d like to talk about moving to [specific figure].')}
<p>Budgets are often set before annual reviews, so raise it a couple of months ahead, not on the day.</p>`,
  },
  {
    slug: 'learn-python-after-sql', cat: 'Growing',
    title: 'Should you learn Python after SQL?',
    short: 'Yes, if you keep repeating the same steps or need things SQL is bad at.',
    description: 'When it makes sense for a SQL analyst to learn Python, what to learn first, and how the two work together at work.',
    lede: 'SQL is the best tool for getting answers out of a database. Python is useful for everything around it: automating the steps, cleaning messy files, and statistics.',
    body: () => `
<h2>Signs you would benefit</h2>
${check(['You run the same query and paste it into the same spreadsheet every week', 'You clean the same messy CSV by hand every month', 'You are asked for forecasts or statistics', 'Your team’s job adverts list Python as essential'])}
<h2>What to learn first</h2>
<p>pandas for tables (it maps closely to SQL: see <a href="/pandas-to-sql">pandas to SQL</a>), reading from a database, and writing results to Excel. That alone automates most repetitive reporting.</p>
<h2>Do not drop SQL</h2>
<p>Even in Python-heavy jobs, the data usually comes out of a database with SQL. Being very good at SQL remains one of the most useful skills an analyst can have.</p>`,
  },
];
