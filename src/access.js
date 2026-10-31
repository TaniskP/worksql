// Who can run which tickets. Monday is free for everyone; every other day needs a paid member's cookie.
function canRun(lesson, who) {
  return Boolean(lesson && (lesson.free || (who && who.paid)));
}

// Local development only: the "unlock paid lessons" toggle. Never in production, and only from this machine.
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
function devUnlockAllowed(req) {
  return process.env.NODE_ENV !== 'production' && LOOPBACK.has(req.socket.remoteAddress);
}

module.exports = { canRun, devUnlockAllowed, DEV_EMAIL: 'dev@worksql.local' };
