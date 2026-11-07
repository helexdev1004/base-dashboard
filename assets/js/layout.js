'use strict';

// Shared by every page: the theme picker and the sidebar (collapse, mobile drawer, menu groups, tooltips).

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Theme. The inline script in <head> applies the saved one before first paint;
// the options in the menu carry their own mode and page colour.
const THEME_KEY = 'base.theme';

function applyTheme(id) {
  const options = $$('#themeOptions [data-theme-id]');
  const option = options.find((btn) => btn.dataset.themeId === id) || options[0];
  const root = document.documentElement;
  root.setAttribute('data-theme', option.dataset.themeId);
  root.setAttribute('data-bs-theme', option.dataset.mode);
  $('meta[name="theme-color"]').setAttribute('content', option.dataset.color);
  $('#themeLabel').textContent = option.dataset.name;
  options.forEach((btn) => btn.setAttribute('aria-checked', String(btn === option)));
  return option.dataset.themeId;
}

function saveTheme(id) {
  try { localStorage.setItem(THEME_KEY, id); } catch { /* storage unavailable */ }
}

// Sidebar
const COLLAPSE_KEY = 'base.sidebarCollapsed';
const desktopMq = window.matchMedia('(min-width: 992px)');
let navTips = [];

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
}
function saveCollapsed(value) {
  try { localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0'); } catch { /* storage unavailable */ }
}

// The menu tooltips only show while the sidebar is collapsed to icons.
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

function setNavGroupOpen(toggle, open) {
  toggle.setAttribute('aria-expanded', String(open));
  $(`#${toggle.getAttribute('aria-controls')}`).hidden = !open;
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(document.documentElement.getAttribute('data-theme'));
  $('#themeOptions').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme-id]');
    if (btn) saveTheme(applyTheme(btn.dataset.themeId));
  });

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
    if (toggle) setNavGroupOpen(toggle, toggle.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) setMobileOpen(false);
  });

  // Sign out isn't wired up yet.
  $$('.profile-menu .dropdown-item[href="#"]').forEach((item) => item.addEventListener('click', (e) => e.preventDefault()));
});
