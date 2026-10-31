// Payment placeholder. Every route that takes money goes through here, so wiring a
// provider later means filling in these functions and nothing else.
//
// To wire Stripe later:
//   1. npm install stripe, set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.
//   2. Put each plan's price ID in src/plans.js (providerPriceId).
//   3. createCheckout: stripe.checkout.sessions.create({ mode: 'subscription', line_items: [{ price, quantity: seats }], ... })
//      and return { url: session.url }.
//   4. handleWebhook: verify the signature, then mark the account as paid on
//      checkout.session.completed / customer.subscription.deleted.

const { plans } = require('./plans');

const configured = () => Boolean(process.env.STRIPE_SECRET_KEY);

// The site only shows pay buttons when this is true: a key, and a price ID on every visible paid plan.
const live = () => configured() && plans.filter((p) => !p.hidden && p.price > 0).every((p) => p.providerPriceId);

async function createCheckout({ planId, seats = 1 }) {
  const plan = plans.find((p) => p.id === planId);
  if (!plan || plan.price === 0) return { status: 400, body: { error: 'Unknown paid plan.' } };
  if (plan.perSeat && seats < plan.minSeats) {
    return { status: 400, body: { error: `Team plans start at ${plan.minSeats} seats.` } };
  }
  if (!configured() || !plan.providerPriceId) {
    return {
      status: 501,
      body: {
        error: 'payments_not_configured',
        message: plan.comingSoon
          ? 'Team plans are coming later. We will be in touch.'
          : 'Payments are not switched on yet. You can keep going with the free lessons.',
        plan: { id: plan.id, name: plan.name, price: plan.price, interval: plan.interval, seats: plan.perSeat ? seats : 1 },
      },
    };
  }
  // Provider call goes here.
  return { status: 501, body: { error: 'payments_not_configured' } };
}

async function handleWebhook() {
  return { status: 501, body: { error: 'payments_not_configured' } };
}

module.exports = { createCheckout, handleWebhook, configured, live };
