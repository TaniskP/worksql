// First-visit cookie notice, in the same style as cvonpoint.com: a slim navy bar along the bottom.
// WorkSQL only uses storage the site needs (progress in this browser, the paid sign-in cookie), so there's
// nothing to switch off today. The choice is still recorded, so anything optional added later can check
// window.worksqlConsent() first and listen for the "worksql:consent" event.

const KEY = 'worksql.consent';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

function save(choice) {
  try { localStorage.setItem(KEY, JSON.stringify({ choice, at: new Date().toISOString() })); } catch { /* private mode: ask again next visit */ }
  window.dispatchEvent(new CustomEvent('worksql:consent', { detail: { choice } }));
}

// 'all', 'essential', or null if they haven't chosen yet.
window.worksqlConsent = () => (read() || {}).choice || null;

const X = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

function show({ expanded = false } = {}) {
  document.getElementById('cookie-bar')?.remove();
  const bar = document.createElement('div');
  bar.id = 'cookie-bar';
  bar.className = 'cookie-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Cookie notice');
  bar.innerHTML = `
    <div class="cookie-inner">
      <button type="button" class="cookie-x" aria-label="Close cookie notice" data-c="close">${X}</button>
      <div class="cookie-copy">
        <p>WorkSQL uses a small amount of storage so the site works: your progress and settings stay in this browser, and a sign-in cookie is set only if you pay. Payments go through Stripe, which sets its own cookies on its checkout page. We do not use analytics, advertising cookies or tracking pixels. <a href="/privacy#cookies">Cookie Policy</a></p>
        <ul class="cookie-prefs" ${expanded ? '' : 'hidden'}>
          <li><b>Essential</b> - always on. The <code>wsql</code> sign-in cookie after checkout, and Stripe on its own checkout page.</li>
          <li><b>Preferences</b> - kept on your device. Progress, streak, drafts and settings like the inbox ping.</li>
          <li><b>Analytics</b> - not used.</li>
          <li><b>Advertising</b> - not used. No ad or tracking pixels.</li>
        </ul>
      </div>
      <div class="cookie-btns">
        <button type="button" data-c="prefs" aria-expanded="${expanded}">${expanded ? 'Hide Preferences' : 'Manage Preferences'}</button>
        <button type="button" data-c="all">Accept All</button>
        <button type="button" data-c="essential">Reject Non-Essential</button>
      </div>
    </div>`;
  document.body.appendChild(bar);
  requestAnimationFrame(() => bar.classList.add('in'));

  const close = () => { bar.classList.remove('in'); setTimeout(() => bar.remove(), 300); };
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    const act = b.dataset.c;
    if (act === 'prefs') {
      const list = bar.querySelector('.cookie-prefs');
      list.hidden = !list.hidden;
      b.textContent = list.hidden ? 'Manage Preferences' : 'Hide Preferences';
      b.setAttribute('aria-expanded', String(!list.hidden));
      return;
    }
    // Closing with the X counts as essential only: closing isn't agreeing to anything.
    save(act === 'all' ? 'all' : 'essential');
    close();
  });
}

if (!read()) show();

// Any [data-cookie-settings] link (privacy page, footer) reopens the bar with the details showing.
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-cookie-settings]')) return;
  e.preventDefault();
  show({ expanded: true });
});
