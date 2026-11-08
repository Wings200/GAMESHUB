(() => {
  'use strict';
  let currentLink = null;
  let checkCount = 0;
  async function showDeveloperLink() {
    const check = ++checkCount;
    const nav = document.querySelector('header.site-header nav.nav');
    if (!nav) return;
    try {
      const response = await fetch('/api/dev/maintenance', {credentials: 'same-origin', cache: 'no-store'});
      if (check !== checkCount) return;
      if (!response.ok) {
        if (currentLink) currentLink.remove();
        currentLink = null;
        return;
      }
      const data = await response.json();
      if (check !== checkCount) return;
      if (!data.ok || !data.developer) return;
      if (!currentLink) {
        currentLink = document.createElement('a');
        currentLink.href = '/developer.html';
        currentLink.textContent = 'DEVELOPER';
        currentLink.title = 'Developer Center';
        nav.appendChild(currentLink);
      }
    } catch { if (currentLink) currentLink.remove(); currentLink = null; }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showDeveloperLink, {once: true});
  } else showDeveloperLink();
  window.addEventListener('gameshub-account-change', showDeveloperLink);
})();
