// Pages are served no-cache so a deploy shows up. The browser then reloads
// on Back instead of keeping the old scroll. Remember it, and let ← Back
// use the history stack when the previous page is on this site.

const KEY = 'worksql.scroll';

function here() {
  return location.pathname + location.search;
}

function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ path: here(), y: Math.round(window.scrollY) }));
  } catch { /* private mode */ }
}

function restore() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const { path, y } = JSON.parse(raw);
    if (path !== here() || typeof y !== 'number') return;
    history.scrollRestoration = 'manual';
    const go = () => window.scrollTo(0, y);
    go();
    requestAnimationFrame(go);
  } catch { /* fine */ }
}

function cameBack(e) {
  if (e && e.persisted) return true;
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (nav) return nav.type === 'back_forward';
  return performance.navigation && performance.navigation.type === 2;
}

function sameOrigin(href) {
  try {
    return new URL(href, location.href).origin === location.origin;
  } catch {
    return false;
  }
}

function bindBack(a) {
  a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const ref = document.referrer;
    if (!ref || !sameOrigin(ref)) return;
    const from = new URL(ref);
    if (from.pathname === location.pathname && from.search === location.search) return;
    e.preventDefault();
    history.back();
  });
}

addEventListener('pagehide', save);
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});
addEventListener('pageshow', (e) => {
  if (cameBack(e)) restore();
});
document.querySelectorAll('[data-back]').forEach(bindBack);
