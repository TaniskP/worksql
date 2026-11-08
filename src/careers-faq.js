// Questions people search for alongside each career guide. Rendered as an FAQ section and FAQPage data.
module.exports = {
  'become-a-data-analyst-with-no-experience': [
    ['Can I become a data analyst without any data experience?', 'Yes. Many analysts came from retail, admin, finance, healthcare or customer service. What replaces experience is evidence: a couple of projects that answer real questions with SQL, and any data work you have done in your current role, however small. Write those up clearly and lead your CV with them.'],
    ['What should I learn first?', 'SQL first, because almost every analyst job uses it and it is the fastest way to answer questions from company data. Then a spreadsheet tool to a good standard, then one dashboard tool. Python can come later unless the adverts you want list it as essential.'],
    ['Which entry-level titles are easiest to get?', 'Reporting analyst, MI analyst, operations analyst, CRM or marketing executive with reporting duties, and junior BI developer. They use SQL heavily but attract fewer applicants than “data analyst”, and they lead naturally into analyst roles later.'],
  ],
  'sql-skills-employers-ask-for': [
    ['What does “advanced SQL” mean in a junior job advert?', 'Usually comfortable joins, grouping, subqueries or CTEs, and window functions like ROW_NUMBER. Rarely stored procedures or query tuning. If unsure, ask in the interview what a typical query looks like; the answer tells you the real level.'],
    ['Do I need to know how to create tables?', 'For most analyst roles, no. You will mostly read data. Knowing what a primary key and a foreign key are helps you join correctly, but designing schemas is usually an engineer’s or DBA’s job.'],
    ['How do interviewers test SQL skills?', 'Live questions on a shared screen, a timed online test, or a take-home exercise. All of them check the same everyday patterns: filtering by dates, joining, grouping, finding duplicates or missing matches, and ranking within groups.'],
  ],
  'data-analyst-vs-engineer-vs-scientist': [
    ['Which data role is best for beginners?', 'Data analyst roles have the most entry-level openings and need the least specialist knowledge. They also build the business understanding and SQL skills that engineers and scientists rely on, so they make a good first step whichever way you go later.'],
    ['Do data engineers use more SQL than analysts?', 'Different SQL. Analysts write lots of queries that read and summarise data. Engineers write SQL that creates, loads and transforms tables, often inside scheduled pipelines, and spend more time on Python, orchestration tools and performance.'],
    ['Can a data analyst become a data scientist?', 'Yes, and many do. The usual path is adding statistics and Python, then taking on forecasting or experiment analysis in an analyst role before moving titles. Strong SQL and business sense remain an advantage throughout.'],
  ],
  'how-long-to-learn-sql-for-a-job': [
    ['Can I learn SQL in a month?', 'You can learn the everyday syntax in a month of steady practice. Being comfortable turning vague requests into correct queries, and spotting wrong results, usually takes a few more months of regular practice on realistic problems.'],
    ['How much should I practise each day?', 'Little and often works better than long weekend sessions. Around 30 minutes of writing queries yourself, most days, builds the habit and the memory. Watching tutorials counts for much less than typing and checking your own answers.'],
    ['How do I know I’m job-ready?', 'When you can take a plain-English request, ask a clarifying question or two, write the query without searching for syntax, and check the result makes sense. If you can do that for joins, grouping and dates, start applying.'],
  ],
  'excel-to-sql-career-switch': [
    ['Is SQL harder than Excel?', 'Different rather than harder. SQL has less to click and more to type, and it works on whole columns at once. People who already think in pivots and lookups usually find the logic familiar within a few weeks.'],
    ['Will I still use Excel in a SQL job?', 'Almost certainly. Results often go to managers as spreadsheets, and quick checks are easy in Excel. SQL does the heavy lifting on large data; Excel stays useful for the last mile.'],
    ['How do I show Excel experience as data experience?', 'Describe the problem and the outcome, not the formulas: which report you built, how many rows, who used it, and what time it saved. Then show the same report rebuilt in SQL as a portfolio piece.'],
  ],
  'do-you-need-a-degree-for-data': [
    ['Do graduate schemes require a degree?', 'Most do, by definition. Plenty of non-graduate analyst roles, apprenticeships and internal moves do not. Check each advert for “or equivalent experience”, which usually means they will consider strong evidence instead.'],
    ['Is a data apprenticeship worth it?', 'For many people, yes: you are paid, trained on real company data, and finish with experience employers recognise. Look for programmes in data analysis or business intelligence and check what tools they teach.'],
    ['Will not having a degree hold me back later?', 'Less as you gain experience. After a year or two in a data role, employers look mainly at what you have delivered. A strong record of reports and analysis people relied on counts for more than qualifications.'],
  ],
  'which-sql-dialect-to-learn-first': [
    ['Is T-SQL the same as SQL?', 'T-SQL is Microsoft SQL Server’s version of SQL. The core is standard SQL; T-SQL adds its own functions (GETDATE, ISNULL, TOP) and features. Learning T-SQL teaches you SQL, with a few extras to swap when you move to another database.'],
    ['Is PostgreSQL better for jobs than MySQL?', 'Neither is better for your career on its own. Check which one appears in the adverts you want. Many cloud warehouses behave more like PostgreSQL, which makes it a sensible choice if you have no preference.'],
    ['How long does it take to switch dialects?', 'Days of practice. You learn the different date functions, how to limit rows, and quoting rules. The thinking (joins, grouping, window functions) carries straight over.'],
  ],
  'moving-into-data-from-your-current-job': [
    ['How do I ask for database access at work?', 'Ask for read-only access to a reporting copy, and explain the report you want to build and why. Read-only access to a copy is low risk, which makes it much easier for IT or the data team to approve.'],
    ['What if my company has no data team?', 'Then you may be the data team. Start with exports and spreadsheets, automate what you can, and make a case for database access with the time you have already saved. That story is excellent for future applications too.'],
    ['Should I tell my manager I want a data role?', 'Usually yes. Managers who know your goal can give you data tasks, introduce you to the right people, and support a move. Frame it around the value you are already adding to the team.'],
  ],
  'jobs-that-use-sql-every-day': [
    ['Do business analysts use SQL?', 'Many do, especially in data-heavy companies, but some business analyst roles are mostly about requirements and process. Read the duties: mentions of reports, data extraction or SQL mean you will use it regularly.'],
    ['Is application support a good route into data?', 'It can be. Support engineers often investigate problems by querying the database behind a system, which builds strong practical SQL. Moving to a reporting or analyst role from there is a common step.'],
    ['What is an MI analyst?', 'MI stands for management information. MI analysts produce the regular reports managers use to run the business: sales, stock, staffing, service levels. It is very SQL-heavy and a solid entry route.'],
  ],
  'data-analyst-cv-sql-skills': [
    ['Should I put SQL proficiency levels on my CV?', 'Avoid vague levels like “advanced” or star ratings. List what you can do (joins, aggregation, window functions) and show it in a bullet with an outcome. Interviewers will test the level anyway.'],
    ['How many tools should I list?', 'The ones you could use comfortably in an interview tomorrow. A short, honest list reads better than a long one that falls apart on the first question.'],
    ['Where should the skills section go?', 'Near the top for junior roles, under a short profile, so a recruiter scanning for SQL sees it immediately. Put the evidence in your experience and projects sections underneath.'],
  ],
  'cv-bullet-points-with-numbers': [
    ['What if I don’t know the exact numbers?', 'Use a careful estimate you can explain, such as “about three hours a week”. Avoid false precision. If you cannot estimate at all, describe the scope: who used it and how often.'],
    ['How many bullets per job?', 'Three to five for recent roles, fewer for older ones. Put the most data-related bullet first, even if it was a small part of the job.'],
    ['Should every bullet have a number?', 'No. Aim for most of them to show a result. A bullet that explains a clear change, like removing a manual step, works even without a figure.'],
  ],
  'sql-portfolio-projects': [
    ['How many portfolio projects do I need?', 'Two or three good ones are enough. Each should start with a question, show how you handled messy data, and end with a clear answer. Quality and clarity matter much more than quantity.'],
    ['Where can I find datasets for SQL projects?', 'Government open data portals, local council spending data, transport and bike-hire data, public health data and sample business datasets. Pick something close to the industry you want to work in.'],
    ['Should I put my portfolio on GitHub?', 'GitHub works well, but a simple web page or a well-formatted document is fine too. What matters is that a reviewer can see the question, the answer and the key queries in a couple of minutes.'],
  ],
  'github-portfolio-for-data-analysts': [
    ['Do recruiters actually look at GitHub?', 'Some do, especially hiring managers for technical roles. Many will only read the README. Make sure that page alone explains the project and the result.'],
    ['Should I upload the data too?', 'Only if it is small and its licence allows it. Otherwise link to the source and explain how to download it. Never upload personal or confidential data.'],
    ['How should I name SQL files?', 'Number them in the order they run and say what they do, like 01_clean_suppliers.sql and 02_top_suppliers.sql. A reviewer can then follow your steps without opening each file.'],
  ],
  'linkedin-profile-for-data-jobs': [
    ['Should I write “Aspiring Data Analyst” in my headline?', 'It is fine and widely used. Adding your tools and your background makes it stronger, because recruiters search for skills and your previous industry is part of your value.'],
    ['How often should I post?', 'Once every week or two is plenty. Short, specific posts about something you learned or built are better than general motivation posts.'],
    ['Should I message hiring managers directly?', 'A short, polite message mentioning a specific role and one relevant piece of work is reasonable. Do not send long CV-style messages or chase repeatedly.'],
  ],
  'cover-letter-junior-data-analyst': [
    ['Are cover letters still read?', 'Some employers skip them, others read them closely, especially for junior roles with many similar CVs. A short, specific letter costs little and can make the difference.'],
    ['How long should a cover letter be?', 'Three short paragraphs, comfortably under a page. If it would not fit on a phone screen with a little scrolling, it is probably too long.'],
    ['Can I reuse the same cover letter?', 'Reuse the structure and your proof paragraph, but rewrite the first paragraph for each employer. That opening is where generic letters give themselves away.'],
  ],
  'explaining-a-career-gap': [
    ['Do I have to explain a career gap?', 'You do not have to give personal detail. A short neutral reason, like caring responsibilities, health or travel, is enough. Focus the conversation on what you are ready to do now.'],
    ['Will a gap stop me getting a data job?', 'Rarely on its own. Recent evidence, such as current projects or courses, shows you are up to date and usually matters more than the gap itself.'],
    ['How do I show I’m up to date?', 'Recent dated work: a project from the last few months, recent practice, or a short write-up of something you learned recently. Recency is the point.'],
  ],
  'sql-certifications-worth-it': [
    ['Which SQL certifications do employers recognise?', 'Vendor certifications for tools they use, such as Microsoft or cloud provider data certifications, are the most recognised. General course certificates are better treated as learning than as proof.'],
    ['Should I list online course certificates?', 'List a few relevant ones in a short section. If you have many, choose the two or three most related to the job rather than listing them all.'],
    ['Is a certification better than a project?', 'For most junior analyst roles a good project shows more, because it proves you can apply the skills to a real question. Doing both is ideal if you have time.'],
  ],
  'turning-coursework-into-portfolio': [
    ['Is it OK to use a course project in my portfolio?', 'Yes, if you are honest about where it started and you have added your own work: a different dataset, your own question, and a conclusion.'],
    ['How do I make a project look original?', 'Ask a question nobody in the course asked, use data from your area or industry, and include a cleaning step and a clear recommendation at the end.'],
    ['How much should I change?', 'Enough that you can talk for a few minutes about decisions you made yourself. If every step came from the tutorial, keep going until some did not.'],
  ],
  'where-to-find-junior-data-jobs': [
    ['Are there junior data jobs that are not advertised?', 'Some roles are filled internally, through referrals or through agencies before they reach public boards. Networking, agencies and internal moves help you reach those.'],
    ['Should I apply to jobs in other cities?', 'If you can commute or the role is remote or hybrid, yes. Check the working pattern carefully, as some “remote” roles expect regular office days.'],
    ['How do I set up job alerts well?', 'Create several alerts for different titles and keywords (SQL, reporting, MI, BI) rather than one for “data analyst”. Review them weekly and drop the ones that send only irrelevant roles.'],
  ],
  'reading-a-data-job-description': [
    ['What is the difference between essential and desirable?', 'Essential criteria are what the shortlisting will check. Desirable ones help you stand out but rarely rule you out. Focus your application on the essentials.'],
    ['What does “stakeholder management” mean in data jobs?', 'Working with the people who ask for and use your reports: understanding what they need, agreeing definitions and deadlines, and explaining results in plain language.'],
    ['How can I tell if a role has good training?', 'Look for mentions of a team, a senior analyst or a manager you would report to. Ask in the interview who you would learn from and how work is reviewed.'],
  ],
  'applying-without-every-requirement': [
    ['How many requirements should I meet before applying?', 'Most of the essential ones and some of the desirable ones is a reasonable bar. Use the cover letter or a CV line to show you are closing any gap.'],
    ['Should I mention what I don’t know?', 'Briefly, and with what you are doing about it. Interviewers respect honesty about gaps much more than discovering them under questioning.'],
    ['Do employers really hire people who miss requirements?', 'Often, especially for junior roles where the ideal candidate on paper may not exist or may not apply. Strong evidence of learning quickly goes a long way.'],
  ],
  'how-many-applications-junior-data': [
    ['Is it normal to get no replies?', 'Yes, many applications get no response. Track your numbers so you can tell whether it is a general market issue or something in your CV or targeting.'],
    ['Should I apply to jobs I’m overqualified for?', 'Sometimes, if they use SQL and build your experience. Be ready to explain why the role interests you so it does not look like a temporary stop.'],
    ['When should I change my CV?', 'If you are sending many applications and getting very few replies over several weeks, the CV or targeting is the likely issue. Change one thing at a time so you can tell what helped.'],
  ],
  'take-home-sql-test-tips': [
    ['Can I use the internet during a take-home test?', 'Usually yes, unless told otherwise. Looking up syntax is normal. Do not copy whole answers, and do not ask anyone else to do it for you.'],
    ['How should I present the results?', 'Start with the answers in plain English, then tables or charts, then the SQL. Make it easy to read in a few minutes.'],
    ['What if I can’t finish?', 'Submit what you have, clearly state what is complete, and explain how you would finish the rest. A clear partial answer beats a rushed, messy one.'],
  ],
  'recruiters-and-agencies-data-jobs': [
    ['Do recruiters charge candidates?', 'Reputable recruitment agencies are paid by the employer, not by you. Be wary of anyone asking you to pay to be put forward for jobs.'],
    ['Should I work with several agencies?', 'You can, but keep your own list of where you have been submitted, and ask each recruiter to check with you before sending your CV.'],
    ['What makes a recruiter take a junior candidate seriously?', 'A clear target (role, location, salary range), a tidy CV and a portfolio link. It helps them match you quickly to the right roles.'],
  ],
  'following-up-after-applying': [
    ['How long should I wait before following up?', 'About a week or two after applying if you have a contact, or just after the decision date they gave you at interview.'],
    ['Is it OK to follow up more than once?', 'Once, maybe twice with a long gap, is fine. After that, move on and focus on other applications.'],
    ['Should I send a thank-you email after an interview?', 'Yes, a short one. Mention something specific from the conversation and restate your interest in one line.'],
  ],
  'sql-interview-questions-junior': [
    ['What SQL questions are asked in a junior data analyst interview?', 'Commonly: customers with no orders, totals by month, WHERE versus HAVING, finding duplicates, second highest value, latest record per customer, and COUNT(*) versus COUNT(column).'],
    ['Will I have to write SQL on a whiteboard?', 'Sometimes, though shared screens and online editors are more common now. Either way, explaining your approach matters as much as perfect syntax.'],
    ['How should I practise for SQL interviews?', 'Write queries yourself against realistic data, against a timer, and say your reasoning out loud. Then check your results the way you would at work.'],
  ],
  'live-sql-coding-interview-tips': [
    ['Is it OK to ask questions during a live coding test?', 'Yes, and it is expected. Clarifying requirements is part of the job. Ask early, before you start writing.'],
    ['What if I make a syntax error?', 'Read the error out loud, fix it, and carry on. Interviewers expect small errors; how calmly you handle them is part of what they see.'],
    ['Should I optimise my query?', 'First make it correct and readable. Mention possible improvements afterwards if there is time. Most junior interviews care more about correctness than speed.'],
  ],
  'explain-a-join-in-an-interview': [
    ['What is the difference between INNER JOIN and LEFT JOIN?', 'INNER JOIN keeps only rows with a match in both tables. LEFT JOIN keeps every row from the left table and fills the right side with NULL when there is no match.'],
    ['When would you use a FULL OUTER JOIN?', 'When comparing two lists and you need everything from both, such as reconciling two systems or comparing targets with actual sales.'],
    ['Why can a join increase the number of rows?', 'When one row on one side matches several rows on the other, such as an order with many lines. Each match becomes a row, so totals can double if you sum the wrong column.'],
  ],
  'talking-through-your-sql': [
    ['How much should I talk during a SQL interview?', 'Enough to share your plan and key decisions: a sentence before each step and a short summary at the end. You do not need to narrate every keystroke.'],
    ['What if I realise I made a mistake?', 'Say so and fix it. Spotting and correcting your own mistake is a strong signal of the checking habits employers want.'],
    ['Is it OK to say I don’t know?', 'Yes, followed by how you would find out. That mirrors real work and is better than guessing confidently.'],
  ],
  'star-answers-data-analyst': [
    ['What does STAR stand for?', 'Situation, Task, Action, Result. It keeps answers to competency questions short, structured and focused on what you did and what changed.'],
    ['Can I use examples from non-data jobs?', 'Yes. Spotting a stock error, improving a rota or explaining figures to customers all show analytical thinking. Bring out the data side of the story.'],
    ['How long should a STAR answer be?', 'Around one to two minutes. Spend most of the time on the action and the result.'],
  ],
  'questions-to-ask-data-interview': [
    ['How many questions should I ask at the end of an interview?', 'Two or three thoughtful ones is plenty. Choose questions whose answers you genuinely want to know.'],
    ['Is it OK to ask about training?', 'Yes. For junior roles it is a sensible question and shows you want to grow. Ask who you would learn from and how work is reviewed.'],
    ['Should I ask about salary at the end of an interview?', 'Usually wait until they raise it or until there is an offer, unless the recruiter has said it is fine to ask earlier.'],
  ],
  'case-study-interview-data-analyst': [
    ['What is a data analyst case study interview?', 'A scenario such as a drop in sales or a new feature launch, where you explain how you would investigate with data. Sometimes you also write queries or build a quick analysis.'],
    ['Do I need the exact right answer?', 'Rarely. Interviewers want a clear, logical approach: checking the data, breaking the problem down, and suggesting sensible next steps.'],
    ['How should I start my answer?', 'Clarify the goal and the metric, and check whether the change is real before looking for causes.'],
  ],
  'stuck-in-a-sql-interview': [
    ['What should I do if my mind goes blank?', 'Pause, restate the question in your own words, and start with the simplest query that returns some of the right rows. Building from there often brings the rest back.'],
    ['Can I ask for a hint?', 'Yes, as a specific question. Asking whether a certain approach is allowed or sensible shows you are thinking, not giving up.'],
    ['Does getting stuck mean I failed?', 'Not necessarily. Interviewers often care more about how you recover and reason than about a perfect answer.'],
  ],
  'window-functions-interview-questions': [
    ['What is a window function in SQL?', 'A calculation across a set of rows related to the current row, without collapsing them into one. Examples are ROW_NUMBER, RANK, LAG and running totals with SUM OVER.'],
    ['What is the difference between ROW_NUMBER, RANK and DENSE_RANK?', 'They differ on ties. ROW_NUMBER never repeats. RANK repeats on ties and then skips numbers. DENSE_RANK repeats on ties without skipping.'],
    ['When should I use PARTITION BY?', 'When the calculation should restart for each group, such as numbering each customer’s orders separately or finding the top product in each category.'],
  ],
  'explaining-a-project-you-built': [
    ['How long should I talk about my project?', 'About two minutes for the overview, then let the interviewer ask questions. Have more detail ready but do not deliver it all at once.'],
    ['What if my project is small?', 'Small is fine if it is clear. Explain the question, your approach and what you found. A tidy small project beats a sprawling unfinished one.'],
    ['Should I show code during the interview?', 'If they ask, yes. Have one key query ready to share and be able to explain each part of it.'],
  ],
  'salary-questions-data-interviews': [
    ['Should I give a salary number first?', 'If asked directly, giving a researched range is fine. If you can, ask what the budgeted range is for the role first.'],
    ['Can juniors negotiate salary?', 'Yes, politely and with a reason. Even if the base salary cannot move, training, flexible working or an early review sometimes can.'],
    ['How do I research salaries for data jobs?', 'Compare advertised salaries for similar titles in your area and sector, check published pay bands for public sector roles, and ask recruiters what they are seeing.'],
  ],
  'handling-rejection-and-feedback': [
    ['Should I ask for feedback after a rejection?', 'Yes, politely and briefly. Not everyone will respond, but useful feedback is valuable and asking shows maturity.'],
    ['How do I stay motivated during a long job search?', 'Set small weekly goals you control, track progress, and keep improving one skill or project at a time. Progress you can see helps with the setbacks you cannot control.'],
    ['Can I reapply to the same company?', 'Usually yes, after some time or for a different role, especially if you have improved since. Mention what has changed.'],
  ],
  'first-week-as-a-data-analyst': [
    ['What should I do in my first week as a data analyst?', 'Get safe access set up, learn the key tables and regular reports, meet the people who request data most often, and start notes about how things work.'],
    ['Is it OK to ask lots of questions?', 'Yes, especially early on. Batch smaller questions together and write the answers down so you only ask once.'],
    ['How soon will I be expected to produce reports?', 'It varies, but simple requests often arrive within the first couple of weeks. Rerunning existing reports early is a good way to learn the data quickly.'],
  ],
  'clarifying-a-data-request': [
    ['What questions should I ask before writing a report?', 'The period, the definition of each measure, the shape of the result, the deadline and the purpose. Each one can change the query.'],
    ['What if the person doesn’t know what they want?', 'Offer a simple first version with your assumptions written down and ask whether it is heading in the right direction.'],
    ['Should I write down the definitions I used?', 'Yes. Include them in the email with the results so the numbers can be understood and repeated later.'],
  ],
  'checking-your-numbers': [
    ['How do I check a SQL query is correct?', 'Check row counts, compare totals with a simple sum, match a known published number and look for impossible values like future dates or negative quantities.'],
    ['What if my number is different from last month’s report?', 'Compare definitions and filters first. Many differences come from a changed rule or a different date range rather than an error.'],
    ['Should I check every report?', 'At least quickly. The checks take minutes and stop wrong numbers reaching senior people.'],
  ],
  'working-with-production-safely': [
    ['Should analysts have write access to production databases?', 'Usually not. Read-only access to a reporting copy is safer for everyone. If you must change data, follow your team’s process and use transactions.'],
    ['How do I avoid slowing down a live database?', 'Filter early, avoid huge unfiltered queries at busy times, select only the columns you need and test on small date ranges first.'],
    ['What should I do if I run a bad UPDATE?', 'If you used a transaction, roll it back. If not, tell your manager or the database owner immediately. Speed matters for recovery.'],
  ],
  'documenting-your-queries': [
    ['What should I include in a SQL query comment?', 'The purpose, who asked, the business rules used and when it was last checked. Add comments on any line where the reason is not obvious.'],
    ['Where should I save my SQL queries?', 'In a shared, backed-up location the team uses, such as a shared folder or a version-controlled repository, not only on your own laptop.'],
    ['Is it worth documenting one-off queries?', 'A short header is worth it. One-off requests often come back months later, and the comment saves you rebuilding them.'],
  ],
  'prioritising-data-requests': [
    ['How do I handle too many data requests?', 'Ask for deadlines and purpose, offer quick versions where possible, and ask your manager to set priorities when requests conflict.'],
    ['Is it OK to push back on deadlines?', 'Yes, politely and with an alternative. Explaining what you can deliver and when is better than missing a deadline silently.'],
    ['Should I keep a list of requests?', 'Yes. A simple list with requester, deadline and status makes it easy to show your workload and agree priorities.'],
  ],
  'presenting-numbers-to-managers': [
    ['How do I explain data to non-technical people?', 'Lead with the answer, use one clear chart, avoid jargon and finish with what it means and what to do next.'],
    ['Should I show my SQL in a presentation?', 'Rarely. Keep it available if someone asks, but most managers want the result and its meaning.'],
    ['How do I mention limitations without undermining the result?', 'In one plain sentence, ideally with how big the effect is. Clear caveats increase trust rather than reduce it.'],
  ],
  'when-your-numbers-dont-match': [
    ['Why do two reports show different numbers?', 'Usually different definitions, date ranges, filters or data refresh times. Genuine query errors are less common than differences in what is being counted.'],
    ['How do I compare two lists in SQL?', 'Use EXCEPT, or a FULL OUTER JOIN on the ID with a check for NULL on either side, to see which rows appear in only one list.'],
    ['Who decides which number is right?', 'Usually the person who owns the metric or report. Your job is to explain the difference clearly so they can choose the definition.'],
  ],
  'imposter-syndrome-junior-data': [
    ['Is it normal to feel out of my depth as a junior analyst?', 'Very. Data work has a lot to learn, and noticing that is a sign you are paying attention. It usually eases as you build a record of finished work.'],
    ['Do senior analysts look things up?', 'All the time. Knowing what to search for and checking the answer is part of the job at every level.'],
    ['When should I ask for help?', 'After a genuine attempt, with a specific question. That respects others’ time and stops you losing a whole day.'],
  ],
  'junior-to-mid-level-analyst': [
    ['How long does it take to go from junior to mid-level analyst?', 'It varies by company and person. The move usually follows taking on more ownership and complexity rather than a fixed amount of time.'],
    ['What skills do mid-level analysts need?', 'Shaping questions, owning work end to end, explaining limits clearly, reviewing others’ work and improving data quality, plus deeper skills in at least one tool.'],
    ['How do I show I’m ready for promotion?', 'Keep a record of problems you solved and their impact, and discuss it with your manager before review time.'],
  ],
  'sql-performance-basics': [
    ['Why is my SQL query slow?', 'Common reasons are scanning large tables without useful filters, functions on filtered columns, unnecessary columns or joins, and missing indexes.'],
    ['What does SARGable mean?', 'A filter the database can use an index for, usually because it compares the bare column with a value or range rather than wrapping the column in a function.'],
    ['Should analysts create indexes?', 'Usually not without the database owner. Explain the slow query and let them decide, since indexes affect everyone using the table.'],
  ],
  'getting-a-pay-rise-in-data': [
    ['When should I ask for a pay rise?', 'Ahead of budget or review cycles, and after you have taken on more responsibility or delivered clear results.'],
    ['What evidence helps most?', 'Concrete results such as time saved, errors prevented, new responsibilities, and comparisons with similar roles in the market.'],
    ['What if the answer is no?', 'Ask what would need to change and by when, and agree to revisit. Get it in writing if you can.'],
  ],
  'learn-python-after-sql': [
    ['Do data analysts need Python?', 'Not always. Many analyst roles are SQL and spreadsheets with a dashboard tool. Python becomes valuable when you need automation, complex cleaning or statistics.'],
    ['What Python should a SQL analyst learn first?', 'pandas for working with tables, connecting to a database, and exporting results. That covers a lot of everyday automation.'],
    ['Is SQL or Python more important for data jobs?', 'For analyst roles, SQL usually matters more because most company data lives in databases. Python adds reach once SQL is solid.'],
  ],
};
