// Rate limits for a traffic spike. In memory, per connection: enough for one server on launch day.
// Each bucket is a sliding window: at most `max` calls per `windowMs` from one IP.

const LIMITS = {
  query: [120, 60_000],     // Execute / Parse: two a second, so an office behind one IP isn't blocked
  run: [60, 60_000],        // marking a ticket
  checkout: [10, 60_000],
  write: [120, 60_000],     // progress saves, counts, waitlist
  email: [6, 60 * 60_000],  // anything that sends an email
};

const hits = new Map();

const ipOf = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

// True when this call is allowed. Records it either way, so a hammering client stays blocked.
function allow(req, bucket) {
  const [max, windowMs] = LIMITS[bucket];
  const key = `${bucket}:${ipOf(req)}`;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length <= max;
}

// Forget idle connections so the map doesn't grow all day.
setInterval(() => {
  const now = Date.now();
  for (const [key, list] of hits) if (!list.length || now - list[list.length - 1] > 60 * 60_000) hits.delete(key);
}, 10 * 60_000).unref();

module.exports = { allow, ipOf, LIMITS, _reset: () => hits.clear() };
