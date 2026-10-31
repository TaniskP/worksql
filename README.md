# WorkSQL

SQL Server, five minutes. You write the query. We tell you if it's right.

## Run it

Needs Node 22.13+ (uses the built-in `node:sqlite`, no npm install).

```bash
npm start
```

Open http://localhost:3000. `npm test` checks every lesson's answer, the data properties lessons rely on,
and the sloppy queries that must fail.

## What's in it

- **40 lessons, 3 paths.** Monday Basics (free, 10): five habits, each a step-by-step walkthrough then a rep.
  Reports People Ask For (paid, 16) and Analyst Toolkit (paid, 14): CASE, LEFT JOIN, self-join, EXISTS,
  revenue by month, CTEs, ROW_NUMBER, running totals, RANK, LAG, messy data, fix-a-colleague's-query, interview pack.
- **Harbour & Co**: Customers, Orders, OrderLines, Products, Returns, Staff. Deliberately messy (stray spaces,
  a capitalised email, duplicate customers). Dates are relative to today.
- **Strict marking**: exact columns in order, correct headers, a real ORDER BY when asked, and SQL Server's
  GROUP BY rule (SQLite would let bad GROUP BYs through; the sandbox refuses them like SQL Server does).

## Code

- `src/lessons.js`: paths and lessons. Each has a reference `solution`; walkthroughs have `steps`.
- `src/grade.js`, `src/check.js`: run a step and explain what's wrong.
- `src/tsql.js`, `src/sqlfuncs.js`: T-SQL translation and built-ins (TOP, brackets, ISNULL, GETDATE, DATEADD,
  CONVERT, FORMAT, DATEFROMPARTS, EOMONTH, DATETRUNC, LEFT/RIGHT/LEN, `dbo.`).
- `src/seed.js`: the company. `src/plans.js`: prices. `src/payments.js`: checkout, with Stripe steps in the header.

## Work mode, reference pages, nudges

- `/work`: clock in to an SSMS-style window. It fills in as you go: mail first, the query window when you open one, results after
  the first run, the reply button after a run that worked. First visit is one Clock in button and Monday starts with James's
  date ticket; the day picker appears once a ticket is closed. The guided tour is on the ? Tour button, not automatic.
- `/tsql` and `/tsql/<slug>`: server-rendered T-SQL reference pages (`src/articles.js`), plus `/sitemap.xml` and `/robots.txt`.
  Set `SITE_URL` in production so canonical links and sitemap URLs use the real domain.
- "Still waiting" emails (`src/nudges.js`): learners opt in on the lessons page or at clock-out. After 24 quiet hours
  (`NUDGE_AFTER_HOURS`) they get one email naming the colleague who's waiting. Subscribers are kept in `data/nudges.json`.
  Until an email provider is wired in `src/email.js`, emails are written to `outbox/` instead of sent.
- The week: `SCHEDULE` in `src/lessons.js` puts 46 tickets on 7 working days (Monday free, then six days of six).
  Lesson IDs are stable; order comes from the schedule. CASE, LEFT JOIN, CTE and ROW_NUMBER each get a walkthrough, then two reps.
- The reviewer: every mark is a short note from the senior DBA. Set their first name (and yours) in `src/site.js`
  or with `REVIEWER_NAME` / `FOUNDER_NAME`; it shows on every mark and in work mode.
  In work mode, tickets read as plain emails; the spec lands as SQL comments when the query window opens, and the
  reviewer's steps, held-back notes and Kwame's one-line pointers sit in a strip above the editor.
- Hints come in two steps and never give the query. First-time concepts in the paid paths (GROUP BY, CASE, LEFT JOIN, CTE,
  ROW_NUMBER) are walkthroughs.

- Homepage demo (`public/js/demo.js`): nine animated scenes, one ticket from inbox to reply, running the real queries.
  Synthesised sounds are off until the visitor turns them on. Editors have column suggestions (Ctrl+Space, or `alias.`).

## Not done yet

- Email: no provider wired, so nudges land in `outbox/`. The founder quote on the homepage is signed "The founder of WorkSQL"; put your name on it.
- Payments: pay buttons only appear once `payments.live()` is true (Stripe key + price IDs). Until then pricing says "Not on sale yet".
- Accounts: progress, streak and plan live in localStorage. The paywall is client-side only.
- On localhost, the lessons page has a dev-only "unlock paid lessons" toggle for testing.
