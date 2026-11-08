// Data careers: getting started, CV and portfolio, applications. Practical, specific, no invented statistics.
const { sql, c } = require('./article-html');

const say = (t) => `<div class="say-this"><b>Say it like this</b><p>${t}</p></div>`;
const check = (items) => `<ul class="checklist">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

module.exports = [
  // ================= getting started =================
  {
    slug: 'become-a-data-analyst-with-no-experience', cat: 'Getting started',
    title: 'How to become a data analyst with no experience',
    short: 'Learn the SQL work asks for, prove it with two projects, apply sideways.',
    description: 'A realistic route into a first data analyst job with no experience: what to learn, how to prove it, and which jobs to apply for first.',
    lede: 'Nobody hires a junior analyst for knowing every function. They hire someone who can take a vague request, pull the right rows, and send something a manager can use. That is learnable, and you can show it without a previous data job.',
    body: () => `
<h2>Learn the 20% that does 80% of the work</h2>
<p>Most analyst SQL is SELECT with named columns, WHERE with dates, JOINs, GROUP BY, CASE, and the odd window function. Get those solid before anything fancy. If you can answer “last week’s orders over £50, newest first, without today’s” correctly first time, you are ahead of many applicants.</p>
<h2>Prove it with work, not certificates</h2>
<p>Two small projects beat ten course badges. Pick public data close to the jobs you want (council spending for public sector, retail data for e-commerce), ask three business questions, answer them in SQL, and write up what you found in plain English. See <a href="/careers/sql-portfolio-projects">portfolio projects that get interviews</a>.</p>
<h2>Apply sideways, not just straight in</h2>
<p>“Data analyst” is the most competitive title. Reporting analyst, MI analyst, operations analyst, CRM executive and junior BI developer all use SQL daily and get fewer applicants. Internal moves are even easier: the team that already knows you is the one most likely to give you a chance.</p>
${check(['Comfortable with joins, grouping and dates in one dialect', 'Two projects with a short write-up each', 'A CV that leads with what you did with data, not job duties', 'Ten applications a week to sideways titles, tracked in a sheet'])}
<div class="mistake"><b>Waiting until you feel ready</b>
<p>Juniors are expected to learn on the job. Apply once you can do the everyday queries without looking them up; the rest comes from real tickets.</p></div>`,
  },
  {
    slug: 'sql-skills-employers-ask-for', cat: 'Getting started',
    title: 'The SQL skills employers actually ask for in junior data jobs',
    short: 'Joins, grouping, dates, CASE, and knowing when a number looks wrong.',
    description: 'What SQL a junior analyst really needs for work: the query patterns that come up every week, and the habits interviewers check for.',
    lede: 'Job adverts list everything from “advanced SQL” to stored procedures. In practice the first year is a handful of patterns used over and over, plus the judgement to notice when a result cannot be right.',
    body: () => `
<h2>The patterns that come up every week</h2>
${check(['Filtering by date ranges without including today by accident (<a href="/guides/last-week-orders">last week’s orders</a>)', 'INNER and LEFT JOIN, and knowing which one a request needs', 'GROUP BY with COUNT, SUM and AVG, and HAVING for filtering totals', 'CASE to turn numbers into labels people can read', 'Finding duplicates and missing matches', 'ROW_NUMBER for “latest per customer” type questions'])}
<h2>The habits that matter as much as the syntax</h2>
<p>Naming the columns that were asked for instead of <a href="/guides/why-select-star-fails">SELECT *</a>. Checking the row count makes sense. Spotting when a join has <a href="/guides/join-doubled-my-totals">doubled a total</a>. Writing the date range in the email so nobody has to ask.</p>
<h2>What can wait</h2>
<p>Writing stored procedures, designing tables, query tuning and recursive CTEs are worth learning eventually, but few junior roles expect them on day one. If an advert lists them, it is often a wish list.</p>
${sql(`-- If you can write this without looking anything up, you are ready to apply.
SELECT c.region, COUNT(DISTINCT o.customer_id) AS customers, SUM(o.total) AS revenue
FROM Orders o
JOIN Customers c ON c.customer_id = o.customer_id
WHERE o.order_date >= '2026-10-01' AND o.order_date < '2026-11-01'
GROUP BY c.region
HAVING SUM(o.total) > 1000
ORDER BY revenue DESC;`)}`,
  },
  {
    slug: 'data-analyst-vs-engineer-vs-scientist', cat: 'Getting started',
    title: 'Data analyst vs data engineer vs data scientist: which one uses SQL how?',
    short: 'Analysts answer questions, engineers move data, scientists model it.',
    description: 'The difference between data analyst, data engineer and data scientist roles explained by what each one does with SQL day to day.',
    lede: 'All three use SQL, but for different jobs. Knowing the difference helps you aim your learning and your CV at the role you actually want.',
    body: () => `
<h2>Data analyst</h2>
<p>Answers business questions. “How many customers did we lose last quarter?” SQL is the main tool: reading data, joining, grouping, and turning results into something a manager can use. Spreadsheets and a dashboard tool sit alongside it.</p>
<h2>Data engineer</h2>
<p>Builds the pipes that move data from systems into a warehouse, and keeps them running. More SQL that creates and changes tables, scheduled jobs, and usually Python. Cares about whether last night’s load ran and whether the tables are fast.</p>
<h2>Data scientist</h2>
<p>Builds models: forecasts, recommendations, predictions. Uses SQL to pull the data out, then mostly works in Python or R. Many “data scientist” jobs in smaller firms are really analyst jobs with a nicer title.</p>
<h2>Which to aim for first</h2>
<p>Analyst roles have the most junior openings and the lowest barrier, and the skills carry over to both of the others. Plenty of engineers and scientists started as analysts who got curious about where the data came from, or what it could predict.</p>
${check(['Like explaining numbers to people? Analyst.', 'Like building things that run on their own? Engineer.', 'Like statistics and experiments? Scientist, after some analyst experience.'])}`,
  },
  {
    slug: 'how-long-to-learn-sql-for-a-job', cat: 'Getting started',
    title: 'How long does it take to learn SQL well enough for a job?',
    short: 'Weeks for the basics, a few months of practice to be confident.',
    description: 'A realistic timeline for learning SQL for a junior data job, and how to spend the time so you are ready for interviews and real requests.',
    lede: 'The syntax for everyday queries is small and you can cover it in a few weeks. Being job-ready takes longer, because the hard part is turning a vague request into the right query, and that comes from practice.',
    body: () => `
<h2>A realistic plan, about 30 minutes a day</h2>
${check(['<b>Weeks 1–2:</b> SELECT, WHERE, ORDER BY, TOP or LIMIT. Dates and NULLs.', '<b>Weeks 3–4:</b> JOINs (inner and left), GROUP BY, HAVING, COUNT DISTINCT.', '<b>Weeks 5–6:</b> CASE, subqueries, CTEs. Finding duplicates and gaps.', '<b>Weeks 7–8:</b> ROW_NUMBER, RANK, LAG, running totals.', '<b>From then on:</b> realistic requests, a project, and interview-style questions.'])}
<h2>Practice beats watching</h2>
<p>Videos make SQL feel easy because someone else is typing. You only find out what you do not know when you write it yourself and it comes back wrong. Spend most of your time writing queries against data, and checking the results.</p>
<h2>How you know you are ready</h2>
<p>You can take a request in plain English, ask one or two clarifying questions, write the query without searching for syntax, and spot when the number looks wrong. That is the bar for most junior roles.</p>
<div class="mistake"><b>Learning three dialects at once</b>
<p>Pick the one your target jobs use most and get good at it. Moving from SQL Server to PostgreSQL later takes days, not months. See <a href="/careers/which-sql-dialect-to-learn-first">which dialect to learn first</a>.</p></div>`,
  },
  {
    slug: 'excel-to-sql-career-switch', cat: 'Getting started',
    title: 'From Excel power user to SQL analyst: making the switch',
    short: 'Your VLOOKUPs and pivots are joins and GROUP BYs. Say so.',
    description: 'How Excel users can move into SQL-based data roles: mapping spreadsheet skills to SQL, what to learn first, and how to describe the experience on a CV.',
    lede: 'If you live in pivot tables and VLOOKUPs, you already think like an analyst. SQL is the same ideas written down, and it works on data far too big for a spreadsheet.',
    body: () => `
<h2>What you already know, in SQL words</h2>
${check([`VLOOKUP or XLOOKUP is a JOIN (<a href="/excel-to-sql/vlookup">VLOOKUP to SQL</a>)`, 'A pivot table is GROUP BY with SUM or COUNT', 'Filters are WHERE; slicers on totals are HAVING', 'IF and IFS are CASE WHEN', 'Remove duplicates is DISTINCT or GROUP BY'])}
<h2>What is genuinely new</h2>
<p>SQL works on whole columns, not cells, so there is no dragging a formula down. You describe the result you want and the database works out how. And mistakes are quieter: a join that doubles your rows does not turn a cell red. Learn to check row counts.</p>
<h2>On your CV</h2>
${say('Built the weekly sales report in Excel from three system exports, using lookups and pivots; rebuilt it in SQL so it runs in seconds and covers two years of data.')}
<p>That one line tells an employer you understand the business problem and the tool. If you have not rebuilt anything in SQL yet, do it: it is the best portfolio project an Excel user can have.</p>`,
  },
  {
    slug: 'do-you-need-a-degree-for-data', cat: 'Getting started',
    title: 'Do you need a degree to get a data analyst job?',
    short: 'Often no. You need evidence you can do the work.',
    description: 'Whether a degree is required for junior data analyst roles, which employers care, and how to compete without one.',
    lede: 'Some employers, especially large graduate schemes, filter on degrees. Many others do not, and say so. What all of them want is evidence that you can turn data into answers.',
    body: () => `
<h2>Where a degree matters</h2>
<p>Graduate schemes, some financial firms and some public sector grades list a degree as a requirement. You can still apply to their non-graduate roles, apprenticeships, or move in later from another team.</p>
<h2>Where it matters less</h2>
<p>Smaller companies, agencies, retailers, charities and operations teams usually care whether you can do the job. Apprenticeships in data analysis are a real route in and pay you to learn.</p>
<h2>How to compete without one</h2>
${check(['A portfolio with real questions answered, not just tutorials repeated', 'Data work in your current job, however small, written up with numbers', 'An internal move: offer to help the reporting team with a backlog', 'Applying to roles that say “or equivalent experience”'])}
${say('I don’t have a degree in this, but here is a report I rebuilt in SQL that saved my team two hours a week. Happy to walk you through it.')}`,
  },
  {
    slug: 'which-sql-dialect-to-learn-first', cat: 'Getting started',
    title: 'SQL Server, PostgreSQL or MySQL: which should you learn first?',
    short: 'The one in the job adverts you want. The basics are 90% the same.',
    description: 'How to choose between SQL Server, PostgreSQL and MySQL when learning SQL for a job, and how much changes when you switch later.',
    lede: 'The core of SQL is shared by all three. What differs is a handful of functions and habits: TOP versus LIMIT, GETDATE versus now(), square brackets versus double quotes. Pick one and switch later without fear.',
    body: () => `
<h2>Let the job adverts decide</h2>
<p>Search for the jobs you want in your area and count which database they name. Corporate and finance roles often use SQL Server. Tech companies and start-ups lean towards PostgreSQL. Web and e-commerce teams often have MySQL. Cloud warehouses like BigQuery and Snowflake have their own flavour, close to PostgreSQL.</p>
<h2>What actually changes between them</h2>
${sql(`-- SQL Server             -- PostgreSQL / MySQL
SELECT TOP 10 ...          SELECT ... LIMIT 10
GETDATE()                  now() / NOW()
ISNULL(x, 0)               COALESCE(x, 0)   -- works in all three
DATEADD(day, -7, d)        d - INTERVAL '7 days'`)}
<p>Everything else (joins, grouping, CASE, window functions) reads almost the same. The <a href="/sql-translator">SQL dialect translator</a> shows the differences side by side.</p>
<h2>On your CV</h2>
<p>Write the one you know best, and “comfortable switching to PostgreSQL/MySQL”. Employers know the move is small. Practising the same tickets in two stacks is an easy way to make that line true.</p>`,
  },
  {
    slug: 'moving-into-data-from-your-current-job', cat: 'Getting started',
    title: 'Moving into data from your current job (the internal route)',
    short: 'Solve a reporting problem for your own team first.',
    description: 'How to move into a data role inside your current company: finding a reporting problem, getting database access, and making the move official.',
    lede: 'The easiest data job to get is the one in the company you already work for. They know you, you know the business, and every team has a report that someone dreads making.',
    body: () => `
<h2>Find the painful report</h2>
<p>Every team has a spreadsheet someone rebuilds by hand each week. Offer to automate it. Even if you start with exports, rebuilding it properly shows you can do the work.</p>
<h2>Ask for read access</h2>
${say('I’m learning SQL and I’d like to build the weekly report straight from the database. Could I have read-only access to the reporting copy, so I can’t change anything?')}
<p>“Read-only” and “reporting copy” are the words that get a yes from IT. Never ask for access to the live system you could break.</p>
<h2>Make it official</h2>
<p>After a couple of months of reports people rely on, talk to your manager and the data team lead together. Ask about a secondment, a split role, or the next junior opening. You arrive with business knowledge and proof, which most external applicants do not have.</p>
<div class="mistake"><b>Doing it all in secret</b>
<p>Tell your manager what you are building. A report nobody knows you made does not help your case, and a data team that discovers an unofficial report later may not be pleased.</p></div>`,
  },
  {
    slug: 'jobs-that-use-sql-every-day', cat: 'Getting started',
    title: 'Jobs that use SQL every day (that are not called “data analyst”)',
    short: 'Reporting, MI, BI, CRM, operations, finance systems, QA.',
    description: 'Job titles that use SQL daily beyond data analyst, with what each role does, so junior applicants can widen their search.',
    lede: 'Searching only for “data analyst” means competing with everyone. Plenty of roles use SQL just as much, often with fewer applicants and more on-the-job training.',
    body: () => `
<h2>Titles worth searching</h2>
${check(['<b>Reporting analyst / MI analyst:</b> builds the regular reports a business runs on.', '<b>Junior BI developer:</b> builds dashboards and the queries behind them.', '<b>CRM or marketing analyst:</b> customer lists, campaign results, segments.', '<b>Operations analyst:</b> stock, deliveries, staffing, service levels.', '<b>Finance systems analyst:</b> reconciliations, month-end reports, ledger data.', '<b>Product analyst:</b> how people use an app or website.', '<b>Support engineer / application support:</b> investigating issues in the data behind a system.', '<b>QA / test analyst:</b> checking a system stored the right data.'])}
<h2>How to read these adverts</h2>
<p>If the advert mentions SQL, reports, dashboards or “working with data” in the duties, it is a data job, whatever the title says. These roles are often the quickest route into a dedicated analyst job later, because you build a record of real data work.</p>`,
  },

  // ================= CV and portfolio =================
  {
    slug: 'data-analyst-cv-sql-skills', cat: 'CV and portfolio',
    title: 'How to write the SQL skills section of a data analyst CV',
    short: 'Show what you did with SQL, not a list of keywords.',
    description: 'How to present SQL skills on a junior data analyst CV: what to list, how to show evidence, and the phrases that make recruiters skip you.',
    lede: 'A line that says “SQL (advanced)” tells a recruiter nothing. A line that says what you used SQL to do, and what changed because of it, tells them almost everything.',
    body: () => `
<h2>Skills line: short and honest</h2>
${say('SQL (SQL Server; comfortable with PostgreSQL): joins, aggregation, CTEs, window functions. Excel (pivots, lookups). Power BI (basic).')}
<p>Name the dialect. List what you can actually do in an interview without looking it up. Leave out what you have only watched a video about.</p>
<h2>Evidence in your experience or projects</h2>
${check(['Built a weekly churn report in SQL used by the retention team', 'Found duplicate customer records (3% of the base) using GROUP BY and HAVING, and worked with support to merge them', 'Rebuilt a manual Excel report as a SQL query, cutting it from two hours to two minutes'])}
<p>Each bullet: what you did, with what, and what changed. Numbers help, but only true ones.</p>
<div class="mistake"><b>Skill bars and percentages</b>
<p>“SQL ████████░░ 80%” means nothing and invites the question “what is the 20% you can’t do?”. Plain text with evidence reads better and survives the automated filters.</p></div>`,
  },
  {
    slug: 'cv-bullet-points-with-numbers', cat: 'CV and portfolio',
    title: 'Writing CV bullet points with numbers (when you are junior)',
    short: 'Action, tool, result. Count time saved, rows checked, people helped.',
    description: 'How junior data applicants can write CV bullet points with measurable results, even without big projects, using time saved, accuracy and reach.',
    lede: 'Hiring managers skim. A bullet with a number in it gets read. You do not need big numbers; you need true ones that show the work mattered to someone.',
    body: () => `
<h2>The shape of a good bullet</h2>
${say('Automated the monthly stock report with a SQL query, saving the warehouse team about three hours a month and removing copy-paste errors.')}
<p>Action (automated), tool (SQL), result (time saved, errors gone).</p>
<h2>Numbers you probably have</h2>
${check(['Time saved: “from a day to an hour”', 'Volume: “checked 40,000 orders for duplicates”', 'Frequency: “weekly report used by 6 managers”', 'Accuracy: “found a £12k mismatch between two systems”', 'Speed: “turned around ad hoc requests same day”'])}
<h2>If you really have no numbers</h2>
<p>Use scope instead: who used it, how often, what decision it fed. “Used in the weekly sales meeting” is evidence too.</p>
<div class="mistake"><b>Made-up precision</b>
<p>“Improved efficiency by 37.4%” invites a question you cannot answer. Round, honest numbers you can explain in an interview are stronger.</p></div>`,
  },
  {
    slug: 'sql-portfolio-projects', cat: 'CV and portfolio',
    title: 'SQL portfolio projects that actually get you interviews',
    short: 'Real questions, messy data, a short write-up. Not another Titanic.',
    description: 'Ideas and structure for SQL portfolio projects that impress hiring managers: business questions, messy public data, clear write-ups.',
    lede: 'Hiring managers have seen the same tutorial datasets hundreds of times. What stands out is a project that starts with a question a business would ask and shows how you got from messy data to an answer.',
    body: () => `
<h2>Project ideas with real questions</h2>
${check(['<b>Local council spending:</b> which suppliers get the most, and how did that change year on year?', '<b>Public transport or cycle hire data:</b> busiest stations by hour, and where bikes pile up.', '<b>Food hygiene ratings:</b> which areas and business types score lowest?', '<b>Your own bank export (anonymised):</b> monthly spend by category, with a running total.', '<b>An online shop dataset:</b> repeat customer rate, top product per category, abandoned baskets.'])}
<h2>The structure that works</h2>
${check(['The question, in one sentence', 'The data: where it came from and what was wrong with it', 'Two or three queries that answer it, with short comments', 'The answer in plain English, with one chart or table', 'What you would do next with more time'])}
<h2>Show the cleaning</h2>
<p>Real data is messy. Showing how you handled duplicates, blanks and inconsistent labels (see <a href="/guides/map-messy-categories">mapping messy categories</a>) is more impressive than a perfect result from a perfect dataset.</p>
<div class="mistake"><b>Code with no conclusion</b>
<p>A folder of queries with no answer at the end shows you can type SQL. A paragraph that says what you found, and what a business should do about it, shows you can do the job.</p></div>`,
  },
  {
    slug: 'github-portfolio-for-data-analysts', cat: 'CV and portfolio',
    title: 'Setting up a GitHub portfolio as a data analyst',
    short: 'One tidy README per project. Results first, code second.',
    description: 'How to structure a GitHub portfolio for junior data analyst applications: README layout, folder structure, and what reviewers actually open.',
    lede: 'Most reviewers spend a minute or two on your GitHub. They read the README and maybe open one query. Make that minute count.',
    body: () => `
<h2>A pinned repository per project</h2>
<p>Pin your two or three best projects to your profile. Give each one a name that says what it is: “council-spending-analysis”, not “project2-final-v3”.</p>
<h2>README first, results at the top</h2>
${sql(`# Leeds council spending 2023–2026

**Question:** Which suppliers received the most, and what changed?
**Answer:** Three suppliers took X% of spend in 2025, up from Y% in 2023...

## Data
Source, date downloaded, rows, what I cleaned.

## Queries
- 01_clean.sql   — fix supplier names, remove duplicate rows
- 02_top_suppliers.sql
- 03_year_on_year.sql`)}
<h2>Small touches that matter</h2>
${check(['Queries formatted consistently (the <a href="/tools/formatter">formatter</a> helps)', 'Comments that explain why, not what', 'A screenshot of the final table or chart in the README', 'No passwords, connection strings or personal data, ever'])}`,
  },
  {
    slug: 'linkedin-profile-for-data-jobs', cat: 'CV and portfolio',
    title: 'LinkedIn for junior data jobs: headline, about, and posts',
    short: 'Say the job you want in the headline. Show work in the featured section.',
    description: 'How to set up a LinkedIn profile that recruiters find for junior data analyst roles: headline wording, about section, featured projects and posting.',
    lede: 'Recruiters search LinkedIn for titles and skills. If your headline says your old job, you will not come up when they search for analysts.',
    body: () => `
<h2>Headline</h2>
${say('Aspiring Data Analyst | SQL (SQL Server, PostgreSQL), Excel, Power BI | Ex-retail operations')}
<p>The job you want, the tools, and the background that makes you different. Retail, nursing, logistics and finance experience are all selling points for analyst roles in those fields.</p>
<h2>About section</h2>
<p>Three short paragraphs: what you do now, what data work you have done, what you are looking for. Mention a specific project and link it.</p>
<h2>Featured</h2>
<p>Pin your best project write-up and, if you have one, a share card or certificate from practice you have actually done. Visual items get clicked.</p>
<h2>Posting without cringing</h2>
<p>One short post a fortnight about something you learned is enough: “Today I learned why BETWEEN misses most of the last day on a datetime column.” Practical, specific posts get seen by people who hire.</p>`,
  },
  {
    slug: 'cover-letter-junior-data-analyst', cat: 'CV and portfolio',
    title: 'Cover letter for a junior data analyst job (with an example)',
    short: 'Three paragraphs: why them, proof you can do it, what you want next.',
    description: 'How to write a short cover letter for junior data analyst roles that gets read, with a structure and example paragraphs.',
    lede: 'Most cover letters repeat the CV. A good one connects your evidence to their advert in a few sentences, and is short enough to be read in full.',
    body: () => `
<h2>Paragraph 1: why this job</h2>
${say('I’m applying for the Junior Reporting Analyst role because your team builds the stock and delivery reports for the stores, which is the side of retail I’ve worked in for four years.')}
<h2>Paragraph 2: proof</h2>
${say('In my current role I rebuilt our weekly availability report in SQL, joining store stock to deliveries, which cut it from half a day to ten minutes. I’ve also completed a portfolio project on late deliveries by courier, linked below.')}
<h2>Paragraph 3: what happens next</h2>
${say('I’d welcome the chance to talk about how I could help with your reporting backlog. Thank you for reading.')}
<div class="mistake"><b>“I am passionate about data”</b>
<p>Everyone writes it, and it proves nothing. Replace it with one thing you did with data. That shows the passion without saying it.</p></div>`,
  },
  {
    slug: 'explaining-a-career-gap', cat: 'CV and portfolio',
    title: 'Explaining a career gap when applying for data jobs',
    short: 'One honest line, then what you did to get ready.',
    description: 'How to handle a career gap on a data analyst CV and in interviews: wording, what to include, and how to turn the time into evidence.',
    lede: 'Gaps are common: caring, illness, redundancy, travel, retraining. Employers mostly want to know that you are ready now. One honest line and some recent evidence does that.',
    body: () => `
<h2>On the CV</h2>
${say('2024–2025: Career break (family caring). Completed SQL training and two portfolio projects, linked below.')}
<p>You do not owe anyone detail. A short reason and what you did with the time is enough.</p>
<h2>In the interview</h2>
${say('I took a year out to care for a family member. Towards the end I started learning SQL properly. Here’s the project I’m proudest of.')}
<p>Then move on to the work. Interviewers follow your lead: if you spend ten seconds on the gap and two minutes on the project, so will they.</p>
<h2>Make recent work visible</h2>
<p>Dated GitHub commits, a recent project write-up, or a streak of practice show you are current. Recency matters more than the length of the gap.</p>`,
  },
  {
    slug: 'sql-certifications-worth-it', cat: 'CV and portfolio',
    title: 'Are SQL certifications worth it for getting a job?',
    short: 'Sometimes for structure. Rarely as proof on their own.',
    description: 'Whether SQL and data certifications help junior candidates get hired, which kinds count for more, and what to do instead or as well.',
    lede: 'A certificate shows you finished a course. Employers want to know whether you can do the job. Certifications help most when they come with something you built.',
    body: () => `
<h2>When they help</h2>
${check(['Vendor certifications for a tool the job names (for example a Microsoft data certification for a Power BI role)', 'Getting past automated filters that look for keywords', 'Giving your learning a structure and a deadline'])}
<h2>When they do not</h2>
<p>A long list of short course badges can read as lots of watching and little doing. Two to three relevant ones are plenty.</p>
<h2>What counts more</h2>
<p>A project with a question, messy data and an answer. Data work in your current job. Being able to write a correct query in the interview. If you have limited time, spend it there first.</p>`,
  },
  {
    slug: 'turning-coursework-into-portfolio', cat: 'CV and portfolio',
    title: 'Turning course exercises into a real portfolio project',
    short: 'Change the dataset, ask your own question, write the answer.',
    description: 'How to turn bootcamp or course exercises into portfolio projects that stand out: new data, your own question, and a business-style write-up.',
    lede: 'Hiring managers recognise the standard course projects. You can still use what you learned in them. Change the data and the question, and the project becomes yours.',
    body: () => `
<h2>Three changes that make it yours</h2>
${check(['<b>Different data:</b> same technique, a dataset from your town, your old industry or a hobby.', '<b>Your own question:</b> not “explore the data” but “which stores lose the most stock to returns?”', '<b>A conclusion:</b> what you found and what someone should do about it.'])}
<h2>Add one thing the course did not cover</h2>
<p>A data cleaning step, a <a href="/guides/year-over-year-growth">year-over-year comparison</a>, a <a href="/guides/cohort-retention">cohort table</a>. One extra technique applied properly shows you can go beyond the tutorial.</p>
<h2>Say where it started</h2>
${say('This began as an exercise from my course; I rebuilt it on 2025 data for my area and added a cohort analysis.')}
<p>Honesty about the starting point plus clear extra work reads well. Pretending a course project is original does not, if the interviewer has seen it before.</p>`,
  },

  // ================= applications =================
  {
    slug: 'where-to-find-junior-data-jobs', cat: 'Applications',
    title: 'Where to find junior data jobs (beyond the big job boards)',
    short: 'Company sites, public sector portals, apprenticeships, your own employer.',
    description: 'Where junior data analyst and reporting jobs are advertised beyond the main job boards, and how to search them efficiently.',
    lede: 'The big boards are where everyone looks. Many junior data roles are also posted on company careers pages, public sector portals and apprenticeship sites, where there is less competition.',
    body: () => `
<h2>Places to check weekly</h2>
${check(['Careers pages of large local employers: hospitals, councils, universities, retailers, logistics firms', 'Public sector job portals for your country', 'Apprenticeship listings for data analysis or business intelligence', 'Your own company’s internal vacancies', 'Recruitment agencies that specialise in data and technology'])}
<h2>Search for duties, not just titles</h2>
<p>Search for “SQL” plus “report” or “dashboard”, not only “data analyst”. You will find MI analysts, reporting officers and operations analysts that the title search misses. See <a href="/careers/jobs-that-use-sql-every-day">jobs that use SQL every day</a>.</p>
<h2>Track everything</h2>
<p>A simple sheet with company, role, date applied, contact and outcome. After a few weeks it shows which kinds of roles reply to you, so you can focus there.</p>`,
  },
  {
    slug: 'reading-a-data-job-description', cat: 'Applications',
    title: 'How to read a data job description (and what it really means)',
    short: 'Separate the must-haves from the wish list.',
    description: 'How to decode junior data analyst job descriptions: essential vs desirable skills, red flags, and what common phrases mean in practice.',
    lede: 'Job descriptions are often written by several people and padded with wishes. Learn to spot what the job really involves, and you will apply to more roles you can actually get.',
    body: () => `
<h2>Find the real job in the duties</h2>
<p>The duties list tells you what you will do all week. “Produce weekly sales reports”, “respond to ad hoc data requests”, “maintain dashboards” is a reporting role, whatever the title.</p>
<h2>Common phrases, translated</h2>
${check(['“Advanced SQL”: often joins, grouping and window functions; ask in the interview', '“Fast-paced environment”: lots of urgent requests', '“Stakeholder management”: explaining numbers to non-technical people', '“Self-starter”: not much training; ask about support', '“Python desirable”: you can get the job without it'])}
<h2>Red flags</h2>
<p>One junior expected to own the whole data warehouse, the dashboards and the data science. No mention of who you would learn from. A salary far below other analyst roles in the same area. Ask about these before accepting.</p>`,
  },
  {
    slug: 'applying-without-every-requirement', cat: 'Applications',
    title: 'Should you apply if you don’t meet every requirement?',
    short: 'Yes, if you meet most of the essentials.',
    description: 'When to apply for a data job that lists skills you do not have, how to address the gaps, and which requirements are truly essential.',
    lede: 'Adverts list the perfect candidate, who rarely applies. If you meet most of the essential criteria and can show you learn quickly, apply.',
    body: () => `
<h2>A quick rule</h2>
<p>If you meet most of the essential criteria and some of the desirable ones, apply. Gaps in desirable skills almost never rule you out on their own.</p>
<h2>Address one gap directly</h2>
${say('The role mentions Power BI. I haven’t used it at work yet, but I’ve built two dashboards in it for my portfolio this month, linked here.')}
<p>Name the gap and show you have started closing it. That reads as initiative, not weakness.</p>
<h2>When to hold back</h2>
<p>If a must-have is a legal or professional requirement (a specific qualification, security clearance), or the core of the role is something you have never touched, put that application lower down your list.</p>`,
  },
  {
    slug: 'how-many-applications-junior-data', cat: 'Applications',
    title: 'How many applications does it take to get a junior data job?',
    short: 'More than you think. Track replies and adjust what is not working.',
    description: 'What to expect from a junior data job search, how to measure what is working, and when to change your CV or targeting.',
    lede: 'Junior data roles get a lot of applicants, so a long search is normal and says little about you. What matters is noticing which part of the process is stuck, and fixing that part.',
    body: () => `
<h2>Measure each stage</h2>
${check(['Applications sent', 'Replies or screening calls', 'Technical tests or first interviews', 'Final interviews', 'Offers'])}
<h2>Fix the stage that is stuck</h2>
<p><b>No replies:</b> your CV or targeting. Lead with data evidence, apply to sideways titles. <b>Replies but failing tests:</b> practise timed SQL on realistic requests. <b>Interviews but no offers:</b> work on explaining your thinking and your projects out loud.</p>
<h2>Quality and quantity together</h2>
<p>A tailored first paragraph and the right three bullets at the top of your CV take ten minutes per application. That is worth more than fifty identical clicks.</p>
<div class="mistake"><b>Taking silence personally</b>
<p>Many applications get no reply at all, often because the role was filled internally or paused. Keep going and keep tracking.</p></div>`,
  },
  {
    slug: 'take-home-sql-test-tips', cat: 'Applications',
    title: 'Take-home SQL test tips: how to stand out',
    short: 'Answer the question, show your checks, explain your assumptions.',
    description: 'How to approach a take-home SQL or data test for an analyst job: reading the brief, stating assumptions, checking results and presenting the answer.',
    lede: 'Take-home tests are marked on more than correct SQL. Reviewers look for whether you read the brief carefully, made sensible assumptions, checked your numbers and explained them clearly.',
    body: () => `
<h2>Before writing anything</h2>
${check(['Read the brief twice and underline each question', 'Look at the data: row counts, blanks, duplicates, date ranges', 'Write down every assumption you make, as you make it'])}
<h2>While you work</h2>
${sql(`-- Assumption: "last month" means October 2026, whole days.
-- Assumption: cancelled orders are excluded from revenue.
-- Check: 1,204 orders in October before filtering; 1,151 after removing cancelled.
SELECT ...`)}
<p>Comments like these show the reviewer how you think, and stop them marking you down for an assumption they would have made differently.</p>
<h2>The answer</h2>
<p>Lead with the answer in plain English, then the supporting table, then the SQL. Mention one thing you noticed that they did not ask about (“about 4% of orders have no region”). That shows the curiosity they are hiring for.</p>
<div class="mistake"><b>Spending ten hours on a three-hour test</b>
<p>If they say three hours, a reasonable, clearly explained answer in three hours beats a perfect one that took all weekend. Say what you would do next with more time.</p></div>`,
  },
  {
    slug: 'recruiters-and-agencies-data-jobs', cat: 'Applications',
    title: 'Working with recruiters and agencies for data roles',
    short: 'Useful for access and feedback. Be clear about what you want.',
    description: 'How junior candidates can work with recruitment agencies for data analyst jobs: what agencies do, questions to ask, and how to stay in control.',
    lede: 'Agencies can get you in front of roles that are not advertised elsewhere, and give feedback companies would not. They are paid by the employer, so be clear about what you want.',
    body: () => `
<h2>Questions to ask a recruiter</h2>
${check(['What is the role, the team size, and who would I learn from?', 'Which database and tools do they use?', 'Why is the role open?', 'What is the salary range?', 'Can you send me feedback after each stage?'])}
<h2>Stay in control</h2>
<p>Ask a recruiter to tell you before they send your CV anywhere. Two agencies submitting you for the same job can count against you. Keep your own list of where you have been put forward.</p>
<h2>Make it easy for them</h2>
${say('I’m looking for junior reporting or analyst roles using SQL, ideally in retail or logistics, within an hour of Leeds. My CV and portfolio link are attached.')}`,
  },
  {
    slug: 'following-up-after-applying', cat: 'Applications',
    title: 'Following up after a data job application (without being annoying)',
    short: 'One polite note after a week or two, with one new piece of evidence.',
    description: 'When and how to follow up on a data analyst job application or interview, with short example messages.',
    lede: 'A short, specific follow-up can move your application to the top of the pile. More than one or two starts to work against you.',
    body: () => `
<h2>After applying</h2>
<p>If you have a contact name, a single note after a week or two is fine. Add something useful, not just “any update?”.</p>
${say('I applied for the Reporting Analyst role last week. Since then I’ve finished a project on delivery delays by courier, which seems close to your team’s work: link here. Happy to talk whenever suits.')}
<h2>After an interview</h2>
<p>A short thank-you the same or next day, mentioning one thing you discussed. If they gave a decision date and it has passed, one polite check-in is reasonable.</p>
<h2>After a rejection</h2>
${say('Thanks for letting me know. If you have a moment, I’d really value one or two points I could work on for next time.')}
<p>Many will not reply, but some will, and that feedback is gold. See <a href="/careers/handling-rejection-and-feedback">handling rejection</a>.</p>`,
  },
];
