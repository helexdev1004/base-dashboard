'use strict';

// Start-up: wires the shell and the project list. initProjectView then routes to the page in the URL.

function init() {
  // More filters dropdowns
  const countryOpts = COUNTRIES.map((c) => [c.code, c.name]).sort((a, b) => a[1].localeCompare(b[1]));
  const clientOpts = [...CLIENTS].sort().map((c) => [c, c]);
  const pmOpts = PMS.map((p) => [p.initials, `${p.name} (${p.initials})`]);
  fillSelect($('#fCountry'), countryOpts);
  fillSelect($('#fClient'), clientOpts);
  fillSelect($('#fPm'), pmOpts);

  // Theme (the inline script in <head> already applied the saved one)
  renderThemeOptions();
  applyTheme(document.documentElement.getAttribute('data-theme'));
  $('#themeOptions').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-id]');
    if (!btn) return;
    saveTheme(applyTheme(btn.dataset.themeId).id);
  });

  // Sidebar
  navTips = $$('#sideNav .nav-link').map((el) => new bootstrap.Tooltip(el, {
    title: $('span', el).textContent,
    placement: 'right',
    trigger: 'hover focus',
    customClass: 'nav-tip',
  }));
  setCollapsed(readCollapsed());
  // Wait two frames so the saved collapsed state doesn't animate in on load.
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('no-transition')));

  $('#sidebarToggle').addEventListener('click', () => {
    if (desktopMq.matches) setCollapsed(!document.body.classList.contains('sidebar-collapsed'));
    else setMobileOpen(false);
  });
  $('#mobileMenuBtn').addEventListener('click', () => setMobileOpen(true));
  $('#sidebarBackdrop').addEventListener('click', () => setMobileOpen(false));
  desktopMq.addEventListener('change', () => { setMobileOpen(false); syncNavTips(); });

  $('#sideNav').addEventListener('click', (e) => {
    const toggle = e.target.closest('.nav-toggle');
    if (toggle) {
      setNavGroupOpen(toggle, toggle.getAttribute('aria-expanded') !== 'true');
      return;
    }
    if (e.target.closest('.nav-link')) setMobileOpen(false); // the link itself changes the URL
  });

  // Personal statistics is a real link. Sign out isn't wired up yet, so its click is swallowed.
  $$('.profile-menu .dropdown-item:not([data-profile-link])').forEach((item) => item.addEventListener('click', (e) => e.preventDefault()));

  // Search: MFJN, MFPO, and free text (name or any other field)
  const SEARCH_FIELDS = { searchJob: 'searchJob', searchPo: 'searchPo', searchInput: 'search' };
  let searchTimer;
  Object.entries(SEARCH_FIELDS).forEach(([id, key]) => {
    $(`#${id}`).addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state[key] = e.target.value;
        state.page = 1;
        renderTable();
      }, 150);
    });
  });

  document.addEventListener('keydown', (e) => {
    const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]');
    if (e.key === '/' && !typing && currentView === 'list' && !document.querySelector('.modal.show, .offcanvas.show')) {
      e.preventDefault();
      $('#searchJob').focus(); // Tab moves on to MFPO and the name search
    }
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) setMobileOpen(false);
  });

  // Live / Closed
  $('.segmented').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-status]');
    if (!btn || btn.dataset.status === state.status) return;
    state.status = btn.dataset.status;
    state.page = 1;
    syncStatusButtons();
    renderTable();
  });

  // Sorting. Text columns start A-Z, number columns start highest first.
  $('.project-table thead').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const key = th.dataset.sort;
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = key;
      state.sortDir = TEXT_SORTS.has(key) ? 'asc' : 'desc';
    }
    state.page = 1;
    renderTable();
  });

  // Open a project from anywhere on its row (the name itself is a link).
  $('#projectTbody').addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    const row = e.target.closest('tr[data-id]');
    if (row) location.hash = `#/project/${row.dataset.id}`;
  });

  $('#pagination').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    state.page = Number(btn.dataset.page);
    renderTable();
    $('.table-panel').scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  // More filters
  const filtersCanvas = bootstrap.Offcanvas.getOrCreateInstance('#filtersCanvas');
  $('#applyFilters').addEventListener('click', () => {
    applyFilters({
      country: $('#fCountry').value,
      client: $('#fClient').value,
      pm: $('#fPm').value,
      activity: $('#fActivity').value,
    });
    filtersCanvas.hide();
  });
  $('#resetFilters').addEventListener('click', () => {
    applyFilters({ country: '', client: '', pm: '', activity: '' });
  });
  // Discard unapplied edits when the panel closes.
  $('#filtersCanvas').addEventListener('hidden.bs.offcanvas', syncFilterUi);

  $('#activeFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-clear]');
    if (!btn) return;
    const key = btn.dataset.clear;
    applyFilters(key === 'all'
      ? { country: '', client: '', pm: '', activity: '' }
      : { [key]: '' });
  });

  $('#exportBtn').addEventListener('click', exportCsv);

  // My projects only flips the button for now, the list isn't filtered.
  $('#mineBtn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('active', on);
    $('i', btn).className = on ? 'bi bi-person-check-fill' : 'bi bi-person';
  });

  // Hourly/Daily switch for the Progress column (past 24 hours or past 14 days)
  $('#sparkMode').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-spark]');
    if (!btn || btn.dataset.spark === state.sparkMode) return;
    state.sparkMode = btn.dataset.spark;
    $$('#sparkMode [data-spark]').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $('.project-table th.col-spark').title = state.sparkMode === 'daily' ? 'Completes per day, past 14 days' : 'Completes per hour, past 24 hours';
    renderTable();
  });

  // Refresh just redraws; there's no server to fetch from.
  $('#refreshBtn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    btn.classList.remove('spinning');
    void btn.offsetWidth; // force a reflow so the spin restarts on repeat clicks
    btn.classList.add('spinning');
    renderKpis();
    renderTable();
  });

  initSparkTips();

  // First paint
  syncStatusButtons();
  syncFilterUi();
  renderKpis(true);
  renderTable();

  // Keep "x minutes ago" current.
  setInterval(renderTable, MINUTE);
}

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('DOMContentLoaded', initProjectView);
