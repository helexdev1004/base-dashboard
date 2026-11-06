'use strict';

// Placeholder page for menu items that are not built yet.

// key is one of SOON_PAGES (app/router.js)
function renderSoon(key) {
  const [title, icon] = SOON_PAGES[key];
  document.title = `${title} · Base`;
  $('#soonView').innerHTML = `
    <header class="page-head">
      <h1 class="page-title">${title}</h1>
    </header>
    <section class="pv-card soon-card">
      <span class="soon-icon" aria-hidden="true"><i class="bi ${icon}"></i></span>
      <h2 class="soon-title">Coming soon</h2>
      <p class="soon-text">This section isn't available yet. It will open here once it's built.</p>
      <a class="btn btn-ghost" href="#/"><i class="bi bi-arrow-left"></i> Back to projects</a>
    </section>`;
}
