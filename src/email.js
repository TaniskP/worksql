// Outgoing email. Until a provider is configured, every email is written to ./outbox as an .html file
// (and logged), so you can read exactly what would have been sent.
//
// To wire a provider later (Resend shown; any HTTP email API works the same way):
//   1. Set EMAIL_API_KEY and EMAIL_FROM (e.g. "WorkSQL <james@mail.worksql.co>").
//   2. Fill in sendViaProvider below, e.g. POST https://api.resend.com/emails
//      with { from, to, subject, html } and an Authorization: Bearer header.

const fs = require('node:fs');
const path = require('node:path');

const OUTBOX = process.env.OUTBOX_DIR || path.join(__dirname, '..', 'outbox');
const configured = () => Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM);

async function sendViaProvider() {
  // TODO(email): call the provider here and return its message id.
  throw new Error('Email provider not wired yet');
}

async function send({ to, subject, html }) {
  if (configured()) return sendViaProvider({ to, subject, html });
  fs.mkdirSync(OUTBOX, { recursive: true });
  const file = path.join(OUTBOX, `${new Date().toISOString().replace(/[:.]/g, '-')}-${to.replace(/[^a-z0-9@.]/gi, '_')}.html`);
  fs.writeFileSync(file, `<!-- To: ${to} -->\n<!-- Subject: ${subject} -->\n${html}`);
  console.log(`[email] not sent (no provider). Wrote ${path.relative(process.cwd(), file)}: "${subject}" -> ${to}`);
  return { outbox: file };
}

module.exports = { send, configured };
