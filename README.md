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
  the first run, the reply button after a run that worked. First visit is one Clock in button and Monday starts with Harvey's
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

## Payments: checkout is the login

No passwords, no magic links, no accounts product:

1. They pay on Stripe Checkout, which collects their email (`POST /api/checkout`).
2. Stripe calls the webhook (`POST /api/webhooks/payments`); the signed event saves that email as a paid member in
   `data/members.json`. Later subscription events keep it current, so a cancelled or failed subscription locks again.
3. Stripe sends them back to `/welcome?session_id=...`; the server confirms the session with Stripe (it never trusts the
   URL alone) and sets a signed, HttpOnly cookie.
4. That cookie unlocks Tuesday onwards. `/api/run` refuses paid tickets with a 402 without it, so it's enforced on the
   server, not just hidden in the page. Paid members get a Manage subscription button (Stripe's billing portal) and Sign out.
5. Cleared cookies: **Already paid?** on Pricing. They type the checkout email. The server emails a 15-minute link
   (never unlocks from the form). Opening the link sets the cookie. Same reply whether or not that email has paid.

Code: `src/payments.js` (the flow), `src/stripe.js` (REST calls and webhook signature checks, no SDK),
`src/members.js`, `src/session.js` (the cookie), `src/access.js` (who can run what).

### Set it up

1. Copy `.env.example` to `.env` and fill it in. `npm start` reads it.
2. In Stripe (test mode first): create a product with a monthly £9.99 and a yearly £79 recurring price; put their
   `price_...` IDs in `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY`, and the secret key in `STRIPE_SECRET_KEY`.
3. Webhook: locally, run `stripe listen --forward-to localhost:3000/api/webhooks/payments` and use the `whsec_...` it prints.
   In production, add an endpoint for `https://your-site/api/webhooks/payments` with the events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated` and
   `customer.subscription.deleted`.
4. Turn on the customer portal in Stripe (Settings > Billing > Customer portal) for the Manage subscription button.
5. Production: set `COOKIE_SECRET`, `SITE_URL` (https) and `NODE_ENV=production`. The pay buttons appear once the key and
   both price IDs are set; until then pricing says "Not on sale yet".

Test card: `4242 4242 4242 4242`, any future date, any CVC.

## Not done yet

- Email: restore links and nudges use Resend when `EMAIL_API_KEY` and `EMAIL_FROM` are set; otherwise they land in `outbox/`.
- Progress and streaks still live in the browser's localStorage, not on the server.
- Members are kept in a JSON file, which is fine for one server; move to a database before running more than one.
- On localhost (not in production), the lessons page has a dev-only toggle that makes the browser a paid member without Stripe.
