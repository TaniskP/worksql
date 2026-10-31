// Payments, and the login that comes with them. Checkout is the login:
//   1. They pay on Stripe Checkout, which collects their email.
//   2. Stripe calls our webhook; we save that email as a paid member.
//   3. Stripe sends them back to /welcome; we confirm the session and set a signed cookie.
//   4. That cookie unlocks the paid days and paid tickets on /api/run.
// No passwords, no magic links, no accounts product.
//
// Setup (see README): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY,
// COOKIE_SECRET, and SITE_URL in production.

const { plans } = require('./plans');
const { stripe, verifySignature } = require('./stripe');
const members = require('./members');

const configured = () => Boolean(process.env.STRIPE_SECRET_KEY);

// The site only shows pay buttons when this is true: a key, and a price ID on every visible paid plan.
const live = () => configured() && plans.filter((p) => !p.hidden && p.price > 0).every((p) => p.providerPriceId);

async function createCheckout({ planId, origin, email }) {
  const plan = plans.find((p) => p.id === planId);
  if (!plan || plan.price === 0 || plan.hidden) return { status: 400, body: { error: 'Unknown paid plan.' } };
  if (!live()) {
    return { status: 501, body: { error: 'payments_not_configured', message: 'Payments are not switched on yet. You can keep going with the free lessons.' } };
  }
  const session = await stripe.createCheckoutSession({
    mode: 'subscription',
    line_items: [{ price: plan.providerPriceId, quantity: 1 }],
    // Stripe swaps in the real id; /welcome uses it to confirm payment and set the login cookie.
    success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
    allow_promotion_codes: true,
    customer_email: email || undefined, // prefill when we already know it (renewing after a cancel)
    metadata: { plan: plan.id },
    subscription_data: { metadata: { plan: plan.id } },
  });
  return { status: 200, body: { url: session.url } };
}

// The member a completed Checkout Session belongs to, or null if it isn't paid yet.
function memberFromSession(s) {
  const email = (s.customer_details && s.customer_details.email) || s.customer_email;
  const done = s.status === 'complete' && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required');
  if (!done || !email) return null;
  return members.upsert({
    email,
    customerId: typeof s.customer === 'string' ? s.customer : s.customer && s.customer.id,
    subscriptionId: typeof s.subscription === 'string' ? s.subscription : s.subscription && s.subscription.id,
    plan: s.metadata && s.metadata.plan,
    status: 'active',
  });
}

// Back from Checkout: ask Stripe about the session (never trust the URL alone), save the member, return them.
// Works even if the webhook hasn't arrived yet.
async function completeCheckout(sessionId) {
  if (!configured() || !/^cs_[A-Za-z0-9_]+$/.test(String(sessionId || ''))) return null;
  return memberFromSession(await stripe.getCheckoutSession(sessionId));
}

// Stripe → us. rawBody must be the exact bytes Stripe sent, or the signature won't match.
async function handleWebhook(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return { status: 501, body: { error: 'payments_not_configured' } };
  if (!verifySignature(rawBody, signature, secret)) return { status: 400, body: { error: 'bad signature' } };
  const event = JSON.parse(rawBody);
  const obj = event.data && event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      memberFromSession(obj);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // Renewals, failed cards and cancellations: follow Stripe's status (canceled/unpaid lock the paid days).
      members.setStatusBySubscription(obj.id, event.type.endsWith('deleted') ? 'canceled' : obj.status, { customerId: obj.customer });
      break;
    default:
      break; // everything else is acknowledged and ignored
  }
  return { status: 200, body: { received: true } };
}

// "Manage subscription": Stripe's own billing page, for cancelling or changing card.
async function portal(member, origin) {
  if (!configured() || !member || !member.customerId) return null;
  const s = await stripe.createPortalSession({ customer: member.customerId, return_url: `${origin}/lessons` });
  return s.url;
}

module.exports = { createCheckout, completeCheckout, handleWebhook, portal, configured, live, memberFromSession };
