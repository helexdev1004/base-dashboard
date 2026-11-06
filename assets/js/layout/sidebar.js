'use strict';

// Sidebar: collapse/expand, the mobile drawer, menu groups and tooltips.

const COLLAPSE_KEY = 'base.sidebarCollapsed';

function setNavGroupOpen(toggle, open) {
  toggle.setAttribute('aria-expanded', String(open));
  $(`#${toggle.getAttribute('aria-controls')}`).hidden = !open;
}

const desktopMq = window.matchMedia('(min-width: 992px)');
let navTips = [];

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}
function saveCollapsed(value) {
  try { localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0'); } catch { /* storage unavailable */ }
}

function syncNavTips() {
  const on = document.body.classList.contains('sidebar-collapsed') && desktopMq.matches;
  navTips.forEach((tip) => {
    if (on) tip.enable();
    else { tip.hide(); tip.disable(); }
  });
}

function setCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  $('#sidebarToggle').setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  saveCollapsed(collapsed);
  syncNavTips();
}

function setMobileOpen(open) {
  document.body.classList.toggle('sidebar-open', open);
}
