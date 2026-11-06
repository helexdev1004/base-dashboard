'use strict';

// Views and hash routing. PAGE_RENDERERS maps each page to its render function.

// Menu items that aren't built yet: [title, icon]. They all open the "Coming soon" page.
const SOON_PAGES = {
  clients: ['Clients', 'bi-people'],
  profiling: ['Profiling', 'bi-window-sidebar'],
  'external-surveys': ['External surveys', 'bi-diagram-3'],
};

// view name -> container. Only one is visible at a time; route() picks it.
const VIEWS = {
  ...Object.fromEntries(Object.keys(SOON_PAGES).map((key) => [key, '#soonView'])),
  list: '#listView',
  project: '#projectView',
  feasibility: '#feasibilityView',
  exports: '#exportsView',
  vendors: '#vendorsView',
  'vendor-form': '#vendorFormView',
  'vendor-groups': '#vendorGroupsView',
  blacklist: '#blacklistView',
  'screener-library': '#libraryView',
  'library-form': '#libraryFormView',
  panels: '#panelsView',
  panel: '#panelView',
  panelist: '#panelistView',
  rewards: '#rewardsView',
  redeem: '#redeemView',
  recruiters: '#recruitersView',
  recruiter: '#recruiterView',
  users: '#usersView',
  user: '#userView',
  statistics: '#statisticsView',
  'user-statistics': '#userStatisticsView',
  'my-statistics': '#myStatisticsView',
  translations: '#translationsView',
  'survey-points': '#surveyPointsView',
  'first-surveys': '#firstSurveysView',
  'fw-accounts': '#fwAccountsView',
  'fw-account': '#fwAccountView',
  'fw-projects': '#fwProjectsView',
  'fw-project': '#fwProjectView',
  'fw-ratecards': '#fwRatecardsView',
  'fw-ratecard': '#fwRatecardView',
  'fw-feasibilities': '#fwFeasibilitiesView',
};
// Views that highlight another view's menu item.
const NAV_PARENT = {
  project: 'list', 'vendor-form': 'vendors', 'library-form': 'screener-library',
  panel: 'panels', panelist: 'panels', recruiter: 'recruiters', user: 'users', 'user-statistics': 'statistics',
  'fw-account': 'fw-accounts', 'fw-project': 'fw-projects', 'fw-ratecard': 'fw-ratecards',
};
// Edit pages register { dirty, hash, label } here so the router can stop you leaving with unsaved changes.
const formGuards = {};
let currentView = 'list';
let listScrollY = 0;

function setView(name) {
  if (name === currentView) return;
  if (currentView === 'list') listScrollY = window.scrollY;
  new Set(Object.values(VIEWS)).forEach((sel) => { $(sel).hidden = sel !== VIEWS[name]; }); // some views share a container
  const navView = NAV_PARENT[name] || name;
  $$('#sideNav .nav-link').forEach((link) => {
    const on = link.dataset.view === navView;
    link.classList.toggle('active', on);
    if (on) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  // A group whose page is open is marked and kept expanded.
  $$('#sideNav .nav-group').forEach((group) => {
    const hasActive = Boolean($('.nav-sub .nav-link.active', group));
    group.classList.toggle('has-active', hasActive);
    if (hasActive) setNavGroupOpen($('.nav-toggle', group), true);
  });
  currentView = name;
  window.scrollTo(0, name === 'list' ? listScrollY : 0);
}

// Every page except the project list and the project page, which route() handles itself.
const PAGE_RENDERERS = {
  feasibility: () => renderFeasibility(),
  exports: () => renderExports(),
  vendors: () => renderVendorsList(),
  'vendor-form': (r) => renderVendorForm(r.id),
  'vendor-groups': () => renderVendorGroups(),
  blacklist: () => renderBlacklist(),
  'screener-library': () => renderLibrary(),
  'library-form': (r) => renderLibraryForm(r.id),
  panels: () => renderPanels(),
  panel: (r) => renderPanelPage(r.panel),
  panelist: (r) => renderPanelist(r.panel, r.id),
  rewards: () => renderRewards(),
  redeem: () => renderRedeem(),
  recruiters: () => renderRecruiters(),
  recruiter: (r) => renderRecruiter(r.id),
  users: () => renderUsers(),
  user: (r) => renderUser(r.id),
  statistics: () => renderStatistics(),
  'user-statistics': (r) => renderUserStatistics(r.id),
  'my-statistics': () => renderMyStatistics(),
  translations: () => renderTranslations(),
  'survey-points': () => renderSurveyPoints(),
  'first-surveys': () => renderFirstSurveys(),
  'fw-accounts': () => renderFwAccounts(),
  'fw-account': (r) => renderFwAccount(r.id),
  'fw-projects': () => renderFwProjects(),
  'fw-project': (r) => renderFwProject(r.id, r.tab),
  'fw-ratecards': () => renderFwRatecards(),
  'fw-ratecard': (r) => renderFwRatecard(r.id),
  'fw-feasibilities': () => renderFwFeasibilities(),
  ...Object.fromEntries(Object.keys(SOON_PAGES).map((key) => [key, () => renderSoon(key)])),
};
// Pages opened by a plain #/<name> address.
const SIMPLE_PAGES = [
  'feasibility', 'exports', 'vendors', 'vendor-groups', 'blacklist', 'screener-library', 'panels', 'rewards', 'redeem', 'recruiters',
  'users', 'statistics', 'my-statistics', 'translations', 'survey-points', 'first-surveys',
  'fw-accounts', 'fw-projects', 'fw-ratecards', 'fw-feasibilities',
  ...Object.keys(SOON_PAGES),
];

// [pattern, route]. First match wins, so the plain #/<name> catch-all goes last.
const ROUTES = [
  [/^#\/project\/(new|\d+)(?:\/([a-z]+))?$/, (m) => ({ view: 'project', id: m[1], tab: m[2] })],
  [/^#\/vendors\/(new|\d+)$/, (m) => ({ view: 'vendor-form', id: m[1] })],
  [/^#\/screener-library\/(new|\d+)$/, (m) => ({ view: 'library-form', id: m[1] })],
  [/^#\/panels\/([a-z]+)\/(\d+)$/, (m) => ({ view: 'panelist', panel: m[1], id: m[2] })],
  [/^#\/panels\/([a-z]+)$/, (m) => ({ view: 'panel', panel: m[1] })],
  [/^#\/recruiters\/(new|\d+)$/, (m) => ({ view: 'recruiter', id: m[1] })],
  [/^#\/users\/(new|\d+)$/, (m) => ({ view: 'user', id: m[1] })],
  [/^#\/statistics\/(\d+)$/, (m) => ({ view: 'user-statistics', id: m[1] })],
  [/^#\/fw-accounts\/(new|\d+)$/, (m) => ({ view: 'fw-account', id: m[1] })],
  [/^#\/fw-projects\/(\d+)(?:\/(overview|targets))?$/, (m) => ({ view: 'fw-project', id: m[1], tab: m[2] })],
  [/^#\/fw-ratecards\/(new|\d+)$/, (m) => ({ view: 'fw-ratecard', id: m[1] })],
  [new RegExp(`^#/(${SIMPLE_PAGES.join('|')})$`), (m) => ({ view: m[1] })],
];

function currentRoute() {
  for (const [pattern, toRoute] of ROUTES) {
    const m = location.hash.match(pattern);
    if (m) return toRoute(m);
  }
  return { view: 'list' };
}

function route() {
  const r = currentRoute();
  const open = currentView === 'project';
  const sameTarget = r.view === 'project' && (r.id === 'new' ? pv.creating : Number(r.id) === pv.project?.id);
  const pending = [pv.dirty && 'Main', ...[...pv.unsaved].map((t) => UNSAVED_LABELS[t])].filter(Boolean);
  // Unsaved project tabs: put the old hash back and stay where we are.
  if (open && pending.length && !sameTarget) {
    history.replaceState(null, '', projectHash(pv.project, pv.tab));
    showToast(`You have unsaved changes on ${pending.join(', ')}. Save or cancel them first.`, 'info');
    return;
  }
  // Same for any edit page registered in formGuards.
  const guard = formGuards[currentView];
  if (guard?.dirty && location.hash !== guard.hash) {
    history.replaceState(null, '', guard.hash);
    showToast(`You have unsaved changes ${guard.label}. Save or cancel them first.`, 'info');
    return;
  }
  if (r.view === 'list') {
    showList();
    return;
  }
  if (r.view !== 'project') {
    showPage(r.view, r);
    return;
  }
  if (r.id === 'new') {
    openProject(null, 'main');
    return;
  }
  const p = projects.find((x) => x.id === Number(r.id));
  if (!p) {
    history.replaceState(null, '', '#/');
    showToast("That project couldn't be found.", 'info');
    showList();
    return;
  }
  openProject(p, TAB_IDS.has(r.tab) ? r.tab : 'main');
}

function showList() {
  leaveProject();
  if (currentView === 'list') return; // already showing (e.g. first load)
  setView('list');
  document.title = 'Base · Survey Projects';
  renderKpis();
  renderTable();
}

function showPage(name, r = {}) {
  leaveProject();
  setView(name);
  PAGE_RENDERERS[name](r);
}
