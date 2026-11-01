// Single source of truth for pricing. The pricing page and checkout both read from here.
// Amounts are in pence (GBP), the way payment providers expect them.

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    summary: 'Monday Basics: 5 habits, taught step by step',
    features: ['Monday: 10 tickets, walkthroughs plus reps', 'Real T-SQL, marked strictly', 'Daily streak'],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 999,
    interval: 'month',
    summary: 'The whole working week: 36 more tickets',
    features: ['Six more days of tickets, about six a day', 'Walkthrough first, then reps, for every new idea', 'Cancel any time'],
    cta: 'Go monthly',
    // Stripe price ID ("price_..."), from the Stripe dashboard. Kept in the environment so test and live keys can differ.
    providerPriceId: process.env.STRIPE_PRICE_MONTHLY || null,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 7900,
    interval: 'year',
    summary: 'Equivalent to £6.58/month. Save 34% compared with monthly billing.',
    features: ['Everything in Monthly', 'Save 34% compared with monthly billing', 'New weeks of tickets included as they land'],
    cta: 'Go yearly',
    recommended: true,
    providerPriceId: process.env.STRIPE_PRICE_YEARLY || null,
  },
  {
    // Hidden until the manager view exists.
    id: 'team',
    name: 'Team',
    price: 7900,
    interval: 'year',
    perSeat: true,
    minSeats: 5,
    hidden: true,
    summary: 'Per person, per year, 5+ seats',
    features: ['See who is practising', 'Custom lessons on your table names', 'Still our sandbox, never your production'],
    cta: 'Buy seats',
    providerPriceId: null,
  },
];

module.exports = { plans };
