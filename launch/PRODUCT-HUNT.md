# Product Hunt launch kit

Everything for launch day that isn't code. The code side (progress board, saved progress, mock shift, rate limits, /health, /admin, share tags) is in the repo.

## 1. Settings in production (do these first)

| Setting | Why | Check |
|---|---|---|
| `EMAIL_API_KEY` + `EMAIL_FROM` (Resend) | Without these, no email leaves the server: restore links, "email me my progress" and nudges all land in `./outbox` instead. | `/health` shows `"email": true` |
| `SITE_URL=https://…` | Links in emails and the share image's address. | Share a link in Slack: the preview card shows |
| `COOKIE_SECRET`, `NODE_ENV=production` | Already needed. | |
| `STRIPE_*` live keys + webhook | Payments. | `/health` shows `"payments": true` |
| `SUPPORT_EMAIL` | Shown on /support. Use an inbox you'll watch all day. | /support shows it |
| `ADMIN_TOKEN` | Opens `/admin`. | /admin opens with it |
| `BACKUP_DIR` | Daily copy of `data/` (members, progress). Point it off the box. | `/health` → `lastBackup` |
| `LAUNCH_CODE`, `LAUNCH_OFFER` | Optional. Create the promotion code in Stripe first (Product catalogue → Coupons → Promotion codes). Checkout already accepts codes. | Shows on /pricing and the paywall |
| `REVIEWER_NAME`, `FOUNDER_NAME` | So marks say a real first name, not "Senior DBA". | |

## 2. Cold-visitor dry run (on production, the day before)

Do it twice: once on a laptop, once on a phone. Use a private window each time.

- [ ] Homepage loads. Pick PostgreSQL: the demo switches to PostgreSQL SQL.
- [ ] Clock in free → name → stack → sample ticket → on shift. Close Harvey's ticket.
- [ ] Send one wrong answer on purpose: it's held back with a note.
- [ ] Clock out → "Don't lose today" → email yourself the link. The email arrives (check spam).
- [ ] Open the link **on the other device**: /progress shows the same tickets.
- [ ] Finish Monday's free tickets. Tuesday's paywall lists the six tickets and the price.
- [ ] Repeat clock-in for SQL Server and MySQL (one ticket each is enough).
- [ ] Pay with a real card (refund it after in Stripe). You land on lessons, unlocked.
- [ ] Clear cookies → Pricing → Already paid → email → link → unlocked again, and progress is back.
- [ ] On a second device, open the restore link: paid **and** progress are there.
- [ ] Take a mock shift from the homepage link. The score saves to /progress.
- [ ] /progress: share card downloads, Markdown export opens, "Save as PDF" prints only the log.
- [ ] `/health` is `ok: true`; `/admin` shows today's clock-ins counting up.
- [ ] Phone: homepage, pricing, progress and guided lessons all fit with no sideways scroll. (Work mode asks for a bigger screen. That's expected.)

## 3. Assets

- **Share image**: `public/img/og.png` (1200×630). Source `launch/og-card.html`. Re-render with `npm run og-image`.
- **Gallery shots**: `launch/shots/` (2880×1800). Re-take with `npm start`, then `node launch/screenshots.js http://localhost:3000 tsql`. Swap in `postgres` or `mysql` for those stacks. Suggested order:
  1. `02-query.png`: the inbox, the query, the rows
  2. `03-held-back.png`: the senior DBA holding back `SELECT *`
  3. `04-sent.png`: sent, and Becky replies
  4. `05-progress.png`: the week board and the learning log
  5. `06-paywall.png`: Tuesday's inbox
  6. `01-home.png`
- **Thumbnail**: the WorkSQL database logo on navy (`#0b1733`), 240×240.

### Loom script (60–90 seconds)

1. **0–10s, the hook.** Show the homepage. "Every SQL course teaches you SELECT. None of them hand you Harvey from Sales at 9am asking for last week's orders."
2. **10–35s, a ticket.** Clock in. Harvey's email lands. Write the query, press F5, look at the rows.
3. **35–50s, the catch.** Send it with today's orders still in. The senior DBA holds it back and says why (read the note out). Fix it, send, and Harvey says thanks.
4. **50–65s, the week.** Open /progress: Monday 10/10, the streak, the log of what you got wrong.
5. **65–80s, the stacks.** Switch to PostgreSQL: same ticket, PostgreSQL's own functions and errors.
6. **80–90s, the close.** "Ten tickets free, no sign-up. worksql.com."

## 4. Copy

**Name:** WorkSQL

**Tagline (60 characters max):** SQL practice that looks like your Monday inbox
Other options:
- Real SQL tickets from colleagues, marked by a senior DBA
- A ticket lands. You write the query.

**Dad test:** "It's like a flight simulator for the SQL part of an office job. A colleague emails a question, you write the query, a senior DBA checks it before it goes."

**Description (260 characters max):**
Practise SQL the way work asks for it. Colleagues email requests ("last week's orders over £50, newest first"). You write the query in SQL Server, PostgreSQL or MySQL, and a senior DBA marks it strictly before it's sent. 10 tickets free, no sign-up.

**Topics:** Developer Tools, Education, Productivity, SQL

### First maker comment

> Hi Product Hunt 👋
>
> I built WorkSQL for people who use SQL at work but never had someone sit next to them while they learned it: analysts, support leads, ops, finance, new devs.
>
> **Why it isn't LeetCode:** puzzle sites ask "find the second highest salary". Work asks "can you get me last week's orders over £50 for the 10am, and don't include today". The hard part is the date range, the column names someone expects, and the ORDER BY they forgot to mention. That's what this marks.
>
> **How it works:** you clock in at Harbour & Co, a fake company with messy, realistic tables. Tickets land in your inbox from Harvey in Sales, Amy in Finance and Tom in the warehouse. You write the query in a studio that feels like SSMS. A senior DBA (my dad, who has done this for a living for decades) wrote the marking notes: `SELECT *` gets held back, and so do extra columns or today's orders slipping into "last week".
>
> **Stacks:** SQL Server, PostgreSQL or MySQL. Same tickets; the functions, quoting, errors and marking follow your stack.
>
> **What's free:** all of Monday, 10 tickets, no sign-up. The rest of the week (36 more tickets: GROUP BY, CASE, joins, CTEs, window functions) is £9.99 a month or £79 a year. [If there's a launch code: Code PRODUCTHUNT takes 20% off your first month.]
>
> **New this week:** a progress board with the learning log of every held-back send, saved progress that follows you between devices, a timed mock shift for interviews, and a share card when you close a day.
>
> Every reply here gets read. What should Tuesday's inbox teach next?

**If someone asks for AI:** "Deliberately no AI writing the query: the whole point is that you do. Hints come from Kwame, a colleague who points but won't write it for you."

## 5. Launch-day runbook

- **00:01 PT:** post goes live. Post the first comment at once.
- Keep `/admin` open in a tab. It refreshes every 30s.
- **Something slow?** Set the status line in /admin ("Sandbox slow, investigating."). It shows on every page and on /support. Clear it when fixed.
- **Server restarted?** People mid-query see "The sandbox restarted. Run it again." Progress is safe in their browser.
- **Rate limits** (per IP, per minute): 120 runs, 60 marks, 10 checkouts, 6 emails an hour. Tune them in `src/guard.js` if a whole office shows up.
- Reply to every comment within the hour. Check SUPPORT_EMAIL every hour.
- End of day: note clock-ins → tickets closed → checkouts → paid from /admin, and run `npm run backup`.

## 6. Not before launch

Celebrity side quests, Postgres/MySQL reference encyclopedias, AI that writes the query, social login, mobile apps, leaderboards with strangers, user-made tickets, and Oracle or Snowflake.
