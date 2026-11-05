'use strict';

/* =========================================================
   Base · Framework
   Clients who order sample themselves: their accounts (#/fw-accounts),
   the projects they sent (#/fw-projects, read-only), the CPI ratecards
   (#/fw-ratecards) and the market feasibilities (#/fw-feasibilities).
   Uses helpers from script.js, project.js, vendors.js, panels.js and users.js.
   ========================================================= */

const FW_PAGE_SIZE = 10;
const FW_PACKAGES = ['redirector', 'marketplace'];
const FW_CLIENTS = ['Main Frame', 'Main Frame Turkey', ...CLIENTS];
const FW_DEVICES = ['Desktop/laptop', 'Tablets', 'Mobile phones'];
const FW_IR = ['90-100%', '80-89%', '70-79%', '60-69%', '50-59%', '40-49%', '30-39%', '20-29%', '15-19%', '10-14%', '5-9%', '1-4%'];
const FW_LOI = ['1-5 min', '6-10 min', '11-15 min', '16-20 min', '21-25 min', '26-30 min', '31-35 min', '36- min'];
// Survey lengths clients order by; each matches a ratecard row (1-10 min is priced like 6-10 min).
const FW_TARGET_LOI = ['1-10 min', '11-15 min', '16-20 min', '21-25 min', '26-30 min', '31-35 min', '36- min'];
const FW_CURRENCIES = [['eur', '€'], ['usd', '$'], ['gbp', '£']];
const FW_MARKETS = [
  'Argentina', 'Australia', 'Austria', 'Belgium', 'Bolivia', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia',
  'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Guatemala',
  'Honduras', 'Hong Kong', 'Hungary', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Latvia',
  'Lebanon', 'Lithuania', 'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Panama', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Romania', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain',
  'Sweden', 'Switzerland', 'Taiwan', 'Thailand', 'Tunisia', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'Uruguay', 'Venezuela', 'Vietnam',
];

// CPI in euro per LOI row and incidence band, for a market priced at factor 1 (Norway on Ratecard01).
const FW_BASE_CPI = [
  [3.5, 4.5, 4.5, 5.1, 5.9, 6.9, 7.9, 9.5, 11.3, 14, 24, 36],
  [3.5, 4.5, 4.5, 5.1, 5.9, 6.9, 7.9, 9.5, 11.3, 14, 24, 36],
  [4.4, 5.1, 5.1, 5.7, 6.5, 7.5, 8.5, 10.1, 11.9, 14.4, 25, 36.6],
  [5, 5.7, 5.7, 6.3, 7.1, 8.1, 9.1, 10.7, 12.5, 14.8, 26, 37.2],
  [6, 6.7, 6.7, 7.3, 8.1, 9.1, 10.1, 11.7, 13.5, 15.8, 27, 37.8],
  [7, 7.7, 7.7, 8.3, 9.1, 10.1, 11.1, 12.7, 14.5, 16.8, 28, 38.8],
  [8, 8.7, 8.7, 9.3, 10.1, 11.1, 12.1, 13.7, 15.5, 17.8, 29, 39.8],
  [9, 9.7, 9.7, 10.3, 11.1, 12.1, 13.1, 14.7, 16.5, 18.8, 30, 40.8],
];
// Dollar and pound prices follow the euro price (worked out in cents to avoid rounding drift).
const fromEur = (eur, rate) => Math.round((Math.round(eur * 100) * rate) / 100) / 100;
function cpiGrid(factor) {
  const eur = FW_BASE_CPI.map((row) => row.map((v) => Math.round(v * factor * 10) / 10));
  return { eur, usd: eur.map((row) => row.map((v) => fromEur(v, 110))), gbp: eur.map((row) => row.map((v) => fromEur(v, 85))) };
}
const emptyCpiGrid = () => Object.fromEntries(FW_CURRENCIES.map(([cur]) => [cur, FW_LOI.map(() => FW_IR.map(() => 0))]));

/* ---------- Sample data ---------- */
const fwAccounts = [];   // { id, name, initials, color, email, client, packages, enabled, lastLoginAt }
const fwProjects = [];   // { id, accountId, name, jn, po, createdAt, status: draft|active|closed, targets }
const fwRatecards = [];  // { id, name, markets: [{ id, countries, factor, cpi|null }] }
const fwFeasibilities = []; // { market, value|null }

const fwAccount = (id) => fwAccounts.find((a) => a.id === id);
const fwEmail = (handle, client) => `${handle}@${slugify(client)}.example.com`;

(function seedFramework() {
  const r = seeded(6060);
  const at = (iso) => new Date(iso).getTime();

  // [id, name, initials, colour, client, email name, packages, enabled, last login]
  [
    [38, 'Aysen Ataseven', 'AA', '#b42318', 'Main Frame Turkey', 'mfturkiye', ['marketplace'], true, '2026-09-22T14:56:00'],
    [37, 'Main Frame PM team', 'MF', '#111111', 'Main Frame', 'mfpmteam', ['redirector', 'marketplace'], true, '2026-11-04T09:12:00'],
    [35, 'Kemal Demir', 'KD', '#3b74f2', 'Main Frame Turkey', 'kemal.demir', ['marketplace'], true, '2026-10-30T16:41:00'],
    [33, 'Hannah Lewis', 'HL', '#2f7d32', 'Northwind Research', 'hannah.lewis', ['marketplace'], true, '2026-11-03T11:05:00'],
    [31, 'Pieter Janssens', 'PJ', '#8a3b1e', 'Bluepeak Insights', 'pieter.janssens', ['redirector'], true, '2026-10-21T08:47:00'],
    [28, 'Sofia Romano', 'SR', '#c9b458', 'Kestrel Analytics', 'sofia.romano', ['marketplace'], true, '2026-10-12T13:30:00'],
    [26, 'Lukas Weber', 'LW', '#3fb6cc', 'Meridian Panels', 'lukas.weber', ['redirector', 'marketplace'], true, '2026-09-02T10:18:00'],
    [22, 'Emma Clarke', 'EC', '#d9382c', 'Orbit Consumer Lab', 'emma.clarke', ['marketplace'], false, '2026-04-17T15:22:00'],
    [19, 'Marta Nowak', 'MN', '#6d28d9', 'Vantage Media Group', 'marta.nowak', ['marketplace'], true, '2026-10-28T12:02:00'],
    [15, 'Jonas Berg', 'JB', '#0f766e', 'Cobalt Strategy', 'jonas.berg', ['redirector'], true, '2026-08-14T09:55:00'],
    [12, 'Ines Duarte', 'ID', '#be185d', 'Northwind Research', 'ines.duarte', ['marketplace'], true, '2026-07-30T17:40:00'],
    [7, 'Test account', 'TA', '#64748b', 'Main Frame', 'fw.test', ['redirector', 'marketplace'], true, '2025-03-21T09:49:00'],
  ].forEach(([id, name, initials, color, client, handle, packages, enabled, login]) => {
    fwAccounts.push({ id, name, initials, color, client, email: fwEmail(handle, client), packages, enabled, lastLoginAt: at(login) });
  });

  // Ratecard01 is the one in the reference design; the others get a few markets each.
  const marketsOf = (groups) => groups.map(([id, countries, factor]) => ({ id, countries, factor, cpi: null }));
  fwRatecards.push({ id: 13, name: 'Dynamic', markets: [] });
  fwRatecards.push({
    id: 14,
    name: 'Ratecard01',
    markets: marketsOf([
      [1, ['Argentina', 'Brazil', 'Chile', 'Colombia', 'Mexico', 'Peru', 'Uruguay'], 0.85],
      [2, ['Bulgaria', 'Czech Republic', 'Greece', 'Hungary', 'Poland', 'Portugal', 'Romania', 'Serbia', 'Slovakia', 'Spain', 'Turkey', 'Ukraine'], 0.7],
      [3, ['Belgium', 'Bolivia', 'Croatia', 'Dominican Republic', 'Ecuador', 'Guatemala', 'Honduras', 'Kenya', 'Malaysia', 'Netherlands', 'Panama', 'Philippines', 'Venezuela'], 0.9],
      [4, ['Estonia', 'Latvia', 'Slovenia', 'Taiwan'], 0.8],
      [5, ['Austria'], 1],
      [6, ['Hong Kong', 'Singapore', 'South Korea'], 1.15],
      [7, ['Egypt', 'Jordan', 'Lebanon', 'Lithuania', 'Morocco', 'Saudi Arabia', 'South Africa', 'Tunisia', 'United Arab Emirates'], 1.1],
      [8, ['Denmark', 'Finland', 'Ireland', 'Sweden'], 1.05],
      [9, ['New Zealand', 'Switzerland'], 1.1],
      [10, ['Norway'], 1],
      [11, ['Kazakhstan'], 1.2],
      [41, ['China'], 1.3],
    ]),
  });
  let nextMarketId = 12;
  for (let n = 2; n <= 9; n++) {
    const pool = shuffle(FW_MARKETS, r.next);
    const groups = [];
    for (let g = 0, used = 0; g < r.int(3, 6); g++) {
      const size = r.int(1, 5);
      if (nextMarketId === 41) nextMarketId += 1;
      groups.push([nextMarketId++, pool.slice(used, used + size).sort(), Math.round(r.between(0.7, 1.3) * 100) / 100]);
      used += size;
    }
    fwRatecards.push({ id: 13 + n, name: `Ratecard${pad2(n)}`, markets: marketsOf(groups) });
  }
  fwRatecards.find((x) => x.name === 'Dynamic').markets = marketsOf([[nextMarketId++, ['United Kingdom', 'United States'], 1.2], [nextMarketId++, ['France', 'Germany', 'Italy'], 1.1]]);

  // Projects clients sent through the framework. Drafts are counted on the account but not listed.
  const names = ['Brand health wave 2', 'Banking NPS Q3', 'Retail footfall study', 'EV attitudes', 'Gaming habits Gen Z', 'Coffee concept test',
    'Telecom churn drivers', 'Insurance switching', 'Holiday travel pulse', 'Pet owners U&A', 'Streaming habits', 'Skincare claims test',
    'B2B decision makers', 'Ad recall', 'Food delivery usage', 'Smart home owners', 'FMCG tracker', 'Packaging test'];
  const turkeyNames = ['Ad recall Turkey', 'FMCG tracker Turkey', 'Banking NPS Turkey'];
  const devicesSets = [FW_DEVICES, FW_DEVICES, ['Desktop/laptop', 'Mobile phones'], ['Mobile phones']];
  const start = at('2025-03-17T12:52:00');
  const end = Date.now() - 2 * DAY;
  const known = [
    [1, 7, 'test', '12345', '9876', '2025-03-17T12:52:00', 'active', [['Bulgaria', 100, 0, 0], ['Hungary', 1111, 2, 4]]],
    [2, 37, 'Test project', '999', '999', '2025-03-21T09:49:00', 'active', [['Bulgaria', 100, 0, 0], ['Hungary', 1111, 2, 4]]],
    [3, 31, 'Bluepeak Insights - Belgium Project', 'AA3029', 'AA3029', '2025-03-21T15:37:00', 'active', [['Belgium', 300, 1, 1]]],
  ];
  const makeTarget = (id, country, completes, loi, ir, delivered) => ({
    id,
    country,
    completes,
    delivered,
    loi,
    ir,
    devices: r.pick(devicesSets),
    pii: r.chance(0.15),
    cpi: targetCpi(country, loi, ir),
    quotas: [['Male', 18, 99], ['Female', 18, 99]].map(([gender, from, to]) => ({ gender, from, to, requested: Math.round(completes / 2) })),
    info: r.pick(['Nat rep on age and gender.', 'Soft quotas on region.', 'Category users only: screener question Q3.', 'test', '']),
    testLink: `https://survey.example.com/t/${token(10, r.next)}?id=xxxx`,
    liveLink: `https://survey.example.com/s/${token(10, r.next)}?id=xxxx`,
    baseProjectId: r.chance(0.5) ? r.pick(projects).id : null,
  });
  known.forEach(([id, accountId, name, jn, po, iso, status, targets]) => {
    fwProjects.push({
      id, accountId, name, jn, po, createdAt: at(iso), status,
      // As in the reference design: all devices, no PII, a short note.
      targets: targets.map(([country, completes, loi, ir], i) => ({
        ...makeTarget(i + 1, country, completes, loi, ir, 0), devices: FW_DEVICES, pii: false, info: 'test',
      })),
    });
  });
  const accountsWithWork = fwAccounts.filter((a) => a.id !== 7);
  for (let id = 4; id <= 26; id++) {
    const account = r.pick(accountsWithWork);
    const createdAt = start + ((id - 3) / 24) * (end - start) + r.between(-5, 5) * DAY;
    const age = Date.now() - createdAt;
    const status = age > 200 * DAY ? (r.chance(0.9) ? 'closed' : 'active') : age < 20 * DAY && r.chance(0.3) ? 'draft' : r.chance(0.75) ? 'active' : 'closed';
    const country = () => (account.client === 'Main Frame Turkey' ? 'Turkey' : r.pick(FW_MARKETS));
    const targets = Array.from({ length: r.int(1, 3) }, (_, i) => {
      const completes = r.pick([50, 100, 150, 200, 250, 300, 400, 500, 1000]);
      const delivered = status === 'closed' ? completes : status === 'draft' ? 0 : Math.round(completes * r.between(0.1, 0.95));
      return makeTarget(i + 1, country(), completes, r.int(0, 4), r.int(0, 6), delivered);
    });
    const number = String(r.int(10000, 34999));
    fwProjects.push({
      id, accountId: account.id, status, createdAt: Math.round(createdAt), targets,
      name: account.client === 'Main Frame Turkey' ? r.pick(turkeyNames) : r.pick(names),
      jn: number, po: r.chance(0.7) ? number : `PO-${r.int(1000, 9999)}`,
    });
  }

  // Feasibility per market (two from the reference design, the rest sample).
  const fixed = { Argentina: 5796, Australia: 3831 };
  [...FW_MARKETS].sort().slice(0, 48).forEach((market) => {
    fwFeasibilities.push({ market, value: fixed[market] ?? Math.round(r.between(400, 60000) / (r.chance(0.3) ? 4 : 1)) });
  });
}());

// CPI of a target from Ratecard01: the market's prices for its survey length and incidence band.
function targetCpi(country, loi, ir) {
  const market = fwRatecards.find((x) => x.name === 'Ratecard01')?.markets.find((m) => m.countries.includes(country));
  return Math.round(FW_BASE_CPI[loi + 1][ir] * (market?.factor ?? 1) * 10) / 10;
}

const fwCompletes = (p) => p.targets.reduce((s, t) => s + t.delivered, 0);
const targetTitle = (t) => `${t.country} - ${t.completes} LOI: ${FW_TARGET_LOI[t.loi]} IR: ${FW_IR[t.ir].replace('%', ' %')}`;
function fwCounts(account) {
  const list = fwProjects.filter((p) => p.accountId === account.id);
  return Object.fromEntries(['draft', 'active', 'closed'].map((s) => [s, list.filter((p) => p.status === s).length]));
}

// Panelists of every panel in a market who fit a quota (markets outside the panels' countries have none).
function fwAvailable(country, q) {
  const code = WORLD_COUNTRIES.find((c) => c.name === country)?.code;
  const share = demographicShare(q.gender, Number(q.from), Number(q.to));
  if (!code || !share) return 0;
  return Math.floor(PANEL_INFO.reduce((sum, panel) => sum + activeMembersIn(panel.code, code), 0) * share);
}

const fwSegHtml = (name, labelledBy, opts, value, disabled = false) => `
  <div class="segmented seg-field" role="group" aria-labelledby="${labelledBy}" data-fw-seg="${name}">
    ${opts.map(([v, label]) => `<button type="button" data-value="${v}" class="${v === value ? 'active' : ''}" aria-pressed="${v === value}" ${disabled ? 'disabled' : ''}>${label}</button>`).join('')}
  </div>`;
const pickSeg = (btn) => $$('button', btn.parentElement).forEach((b) => {
  b.classList.toggle('active', b === btn);
  b.setAttribute('aria-pressed', String(b === btn));
});

/* ---------- FW - Accounts ---------- */
const fwa = { search: '', client: '', sortKey: 'id', sortDir: 'desc', page: 1, mounted: false, flashId: null };
const FWA_SORTERS = {
  id: (a) => a.id,
  name: (a) => a.name.toLowerCase(),
  client: (a) => a.client.toLowerCase(),
  login: (a) => a.lastLoginAt || 0,
};

function visibleFwAccounts() {
  const q = fwa.search.trim().toLowerCase();
  const get = FWA_SORTERS[fwa.sortKey];
  const dir = fwa.sortDir === 'asc' ? 1 : -1;
  return fwAccounts
    .filter((a) => !fwa.client || a.client === fwa.client)
    .filter((a) => !q || `${a.id} ${a.name} ${a.initials} ${a.email} ${a.client}`.toLowerCase().includes(q))
    .sort((a, b) => (get(a) < get(b) ? -dir : get(a) > get(b) ? dir : b.id - a.id));
}

function renderFwAccounts() {
  document.title = 'FW - Accounts · Base';
  const root = $('#fwAccountsView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">FW - Accounts</h1>
      <p class="page-sub">Client logins for the framework: who can order sample, for which client, and with which packages.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <a class="btn btn-ghost btn-sm-h" href="#/fw-accounts/new"><i class="bi bi-plus-circle"></i> New Account</a>
      </div>
      <div class="list-filters">
        ${searchGroupHtml('fw-accounts', 'Search accounts…', fwa.search)}
        <select class="form-select pv-filter" data-fwa-filter aria-label="Filter on client">
          <option value="">All clients</option>
          ${optionsHtml([...new Set(fwAccounts.map((a) => a.client))].sort().map((c) => [c, c]), fwa.client)}
        </select>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table fwa-table">
          <thead id="fwaHead"></thead>
          <tbody id="fwaRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="fwaFooter"></div>
    </section>`;
  if (!fwa.mounted) {
    root.addEventListener('click', onFwAccountsClick);
    root.addEventListener('input', (e) => {
      if (e.target.dataset.search !== 'fw-accounts') return;
      fwa.search = e.target.value;
      fwa.page = 1;
      renderFwAccountRows();
    });
    root.addEventListener('change', (e) => {
      if (!e.target.matches('[data-fwa-filter]')) return;
      fwa.client = e.target.value;
      fwa.page = 1;
      renderFwAccountRows();
    });
    fwa.mounted = true;
  }
  renderFwAccountRows();
}

function renderFwAccountRows() {
  const list = visibleFwAccounts();
  const { rows, page, pages, start } = paginate(list, fwa.page, FW_PAGE_SIZE);
  fwa.page = page;
  $('#fwaHead').innerHTML = `
    <tr>
      ${sortTh('id', 'ID', fwa, 'fwa-sort')}${sortTh('name', 'Name', fwa, 'fwa-sort')}<th>Initials</th><th>Email</th>${sortTh('client', 'Client', fwa, 'fwa-sort')}
      <th class="t-num">Draft</th><th class="t-num">Live</th><th class="t-num">Closed</th><th>Status</th>${sortTh('login', 'Last login', fwa, 'fwa-sort')}
    </tr>`;
  $('#fwaRows').innerHTML = rows.length
    ? rows.map((a) => {
        const c = fwCounts(a);
        return `
          <tr class="row-link${a.id === fwa.flashId ? ' row-flash' : ''}" data-href="#/fw-accounts/${a.id}">
            <td class="col-id">${a.id}</td>
            <td><a class="cell-link" href="#/fw-accounts/${a.id}">${escapeHtml(a.name)}</a></td>
            <td>${userBadgeHtml(a)}</td>
            <td class="t-muted-2">${escapeHtml(a.email)}</td>
            <td>${escapeHtml(a.client)}</td>
            <td class="t-num${c.draft ? '' : ' zero'}">${c.draft}</td>
            <td class="t-num${c.active ? '' : ' zero'}">${c.active}</td>
            <td class="t-num${c.closed ? '' : ' zero'}">${c.closed}</td>
            <td>${a.enabled
              ? '<i class="bi bi-person-check user-on" role="img" title="Enabled" aria-label="Enabled"></i>'
              : '<i class="bi bi-person-slash user-off" role="img" title="Disabled" aria-label="Disabled"></i>'}</td>
            <td class="t-muted">${fmtLogin(a.lastLoginAt)}</td>
          </tr>`;
      }).join('')
    : emptyRow(10, 'No accounts found', fwa.search || fwa.client ? 'Try a different search or client.' : 'Add an account to let a client order sample.');
  fwa.flashId = null;
  $('#fwaFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> accounts` : 'No accounts to show'}</span>
    <nav aria-label="Account pages">${pagerHtml(page, pages, 'fwa-page')}</nav>`;
}

function onFwAccountsClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-fwa-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      fwa.page = Number(pageBtn.dataset.fwaPage);
      renderFwAccountRows();
    }
    return;
  }
  const sort = t.closest('[data-fwa-sort]');
  if (sort) {
    const key = sort.dataset.fwaSort;
    fwa.sortDir = fwa.sortKey === key && fwa.sortDir === 'asc' ? 'desc' : 'asc';
    fwa.sortKey = key;
    fwa.page = 1;
    renderFwAccountRows();
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="fw-accounts"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    fwa.search = '';
    fwa.page = 1;
    $('[data-search="fw-accounts"]').value = '';
    renderFwAccountRows();
    return;
  }
  const row = t.closest('tr[data-href]');
  if (row && !t.closest('a, button')) location.hash = row.dataset.href;
}

/* Account form */
const fwAccountForm = { routeId: null, dirty: false, hash: '', label: 'on this account' };
formGuards['fw-account'] = fwAccountForm;

function renderFwAccount(id) {
  const a = id === 'new' ? null : fwAccount(Number(id));
  if (id !== 'new' && !a) {
    history.replaceState(null, '', '#/fw-accounts');
    showToast("That account couldn't be found.", 'info');
    showPage('fw-accounts');
    return;
  }
  Object.assign(fwAccountForm, { routeId: id, dirty: false, hash: `#/fw-accounts/${id}` });
  document.title = `${a ? a.name : 'New account'} · Base`;
  const v = a || { name: '', client: '', email: '', packages: [], enabled: true, initials: '', color: '#111111' };
  const c = a ? fwCounts(a) : null;
  $('#fwAccountView').innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/fw-accounts" title="Back to accounts" aria-label="Back to accounts"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">Framework - Account</h1>
        <p class="page-sub">${a ? `${escapeHtml(a.name)} · account #${a.id} · ${c.draft} draft, ${c.active} live, ${c.closed} closed · last login ${fmtLogin(a.lastLoginAt)}` : 'Give a client a login to order sample through the framework.'}</p>
      </div>
    </header>
    <form id="fwAccountForm" class="vendor-form" novalidate autocomplete="off">
      <section class="pv-card">
        <div class="pv-card-head">
          <h2 class="pv-card-title">Account</h2>
          <span class="dirty-flag" id="fwaDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
        </div>
        <div class="fwa-grid">
          <div class="uf-row">
            <label class="form-label" for="fwaName">Name</label>
            <div><input class="form-control" id="fwaName" name="name" required maxlength="80" value="${escapeHtml(v.name)}">
              <div class="invalid-feedback">Enter a name.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaClient">Client</label>
            <div><div id="fwaClientBox"></div><div class="invalid-feedback" id="fwaClientMsg">Select a client.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaEmail">Email</label>
            <div><input class="form-control" type="email" id="fwaEmail" name="email" required maxlength="120" value="${escapeHtml(v.email)}">
              <div class="invalid-feedback" id="fwaEmailFeedback">Enter a valid email address.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaPassword">Password</label>
            <div><input class="form-control" type="password" id="fwaPassword" name="password" minlength="8" maxlength="100" autocomplete="new-password"
                        ${a ? 'placeholder="••••••••••••" aria-describedby="fwaPasswordHelp"' : 'required'}>
              ${a ? '<div class="field-help" id="fwaPasswordHelp">Leave empty to keep the current password.</div>' : ''}
              <div class="invalid-feedback">Use at least 8 characters.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaPackagesInput">Packages</label>
            <div><div id="fwaPackages"></div></div>
          </div>
          <div class="uf-row">
            <span class="form-label" id="fwaStatusLabel">Status</span>
            ${fwSegHtml('enabled', 'fwaStatusLabel', [['1', 'Enabled'], ['0', 'Disabled']], v.enabled ? '1' : '0')}
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaInitials">Initials</label>
            <div><input class="form-control uf-initials" id="fwaInitials" name="initials" required maxlength="3" pattern="[A-Za-z]{1,3}" value="${escapeHtml(v.initials)}">
              <div class="invalid-feedback" id="fwaInitialsFeedback">Enter 1–3 letters.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaColor">Color</label>
            <div class="uf-color"><input class="form-control form-control-color" type="color" id="fwaColor" name="color" value="${v.color}" title="Badge colour">
              <span id="fwaBadge">${userBadgeHtml({ name: v.name, initials: v.initials || 'AB', color: v.color })}</span></div>
          </div>
        </div>
        <div class="pv-form-actions">
          <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> ${a ? 'Save' : 'Create account'}</button>
          <button type="button" class="btn btn-ghost" data-fwa-action="cancel">Cancel</button>
        </div>
      </section>
    </form>`;

  const markDirty = () => {
    if (fwAccountForm.dirty) return;
    fwAccountForm.dirty = true;
    $('#fwaDirty').hidden = false;
  };
  createComboBox($('#fwaClientBox'), {
    id: 'fwaClient',
    options: FW_CLIENTS.map((c2) => ({ value: c2, label: c2 })),
    value: v.client,
    placeholder: 'Select client...',
    onChange: (value) => {
      $('#fwaClient').setCustomValidity(value ? '' : 'Select a client.');
      markDirty();
    },
  });
  $('#fwaClient').setCustomValidity(v.client ? '' : 'Select a client.');
  const packages = createMultiSelect($('#fwaPackages'), {
    id: 'fwaPackagesInput',
    options: FW_PACKAGES.map((p) => ({ value: p, label: p })),
    selected: v.packages,
    placeholder: 'Select packages...',
    onChange: markDirty,
  });
  const form = $('#fwAccountForm');
  form.addEventListener('input', (e) => {
    if (e.target.classList.contains('ms-input') || e.target.classList.contains('combo-input')) return;
    markDirty();
    if (e.target.id === 'fwaColor' || e.target.id === 'fwaInitials' || e.target.id === 'fwaName') {
      $('#fwaBadge').innerHTML = userBadgeHtml({ name: $('#fwaName').value, initials: $('#fwaInitials').value.trim().toUpperCase() || 'AB', color: $('#fwaColor').value });
    }
  });
  form.addEventListener('click', (e) => {
    const seg = e.target.closest('[data-fw-seg] button');
    if (seg) {
      pickSeg(seg);
      markDirty();
      return;
    }
    if (e.target.closest('[data-fwa-action="cancel"]')) {
      fwAccountForm.dirty = false;
      location.hash = '#/fw-accounts';
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim();
    const initials = form.elements.initials.value.trim().toUpperCase();
    const clash = fwAccounts.find((x) => x !== a && x.email.toLowerCase() === email.toLowerCase());
    form.elements.email.setCustomValidity(clash ? 'taken' : '');
    $('#fwaEmailFeedback').textContent = clash ? `${clash.name} already uses this email.` : 'Enter a valid email address.';
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      form.querySelector(':invalid')?.focus();
      return;
    }
    const data = {
      name: form.elements.name.value.trim(),
      client: $('#fwaClient').value,
      email,
      packages: packages.getValue(),
      enabled: $('[data-fw-seg="enabled"] .active').dataset.value === '1',
      initials,
      color: form.elements.color.value,
    };
    let saved;
    if (a) {
      saved = Object.assign(a, data);
    } else {
      saved = { id: Math.max(0, ...fwAccounts.map((x) => x.id)) + 1, lastLoginAt: null, ...data };
      fwAccounts.push(saved);
      Object.assign(fwa, { search: '', client: '', sortKey: 'id', sortDir: 'desc', page: 1 });
    }
    fwa.flashId = saved.id;
    fwAccountForm.dirty = false;
    location.hash = '#/fw-accounts';
    showToast(a ? `${saved.name} saved.` : `${saved.name} added.`);
  });
  if (!a) $('#fwaName').focus();
}

/* ---------- FW - Active/Closed ---------- */
const fwp = { tab: 'active', search: '', sortDir: 'desc', page: 1, mounted: false };

function visibleFwProjects() {
  const q = fwp.search.trim().toLowerCase();
  return fwProjects
    .filter((p) => p.status === fwp.tab)
    .filter((p) => {
      if (!q) return true;
      const a = fwAccount(p.accountId);
      return `${p.id} ${p.name} ${p.jn} ${p.po} ${a.client} ${a.email}`.toLowerCase().includes(q);
    })
    .sort((a, b) => (fwp.sortDir === 'desc' ? b.id - a.id : a.id - b.id));
}

function renderFwProjects() {
  document.title = 'FW - Active/Closed · Base';
  const root = $('#fwProjectsView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">FW - Active/Closed</h1>
      <p class="page-sub">Projects clients ordered through the framework. Open one to see what was ordered.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-tabs fw-tabs" role="tablist" aria-label="Project status">
        ${[['active', 'Active'], ['closed', 'Closed']].map(([tab, label]) => `
          <button type="button" class="pv-tab${fwp.tab === tab ? ' active' : ''}" role="tab" data-fwp-tab="${tab}" aria-selected="${fwp.tab === tab}" tabindex="${fwp.tab === tab ? 0 : -1}">
            ${label} <span class="fw-tab-count">${fwProjects.filter((p) => p.status === tab).length}</span></button>`).join('')}
      </div>
      <div class="list-filters">${searchGroupHtml('fw-projects', 'Search projects…', fwp.search)}</div>
      <div class="table-responsive">
        <table class="pv-table list-table fwp-table">
          <thead id="fwpHead"></thead>
          <tbody id="fwpRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="fwpFooter"></div>
    </section>`;
  if (!fwp.mounted) {
    root.addEventListener('click', onFwProjectsClick);
    root.addEventListener('input', (e) => {
      if (e.target.dataset.search !== 'fw-projects') return;
      fwp.search = e.target.value;
      fwp.page = 1;
      renderFwProjectRows();
    });
    fwp.mounted = true;
  }
  renderFwProjectRows();
}

function renderFwProjectRows() {
  const list = visibleFwProjects();
  const { rows, page, pages, start } = paginate(list, fwp.page, FW_PAGE_SIZE);
  fwp.page = page;
  const desc = fwp.sortDir === 'desc';
  $('#fwpHead').innerHTML = `
    <tr>
      <th aria-sort="${desc ? 'descending' : 'ascending'}"><button type="button" class="th-sort" data-fwp-action="sort">ID <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button></th>
      <th>Client</th><th>Project name</th><th class="t-num">Completes</th><th>JN</th><th>PO</th><th>Created</th><th>Email</th>
    </tr>`;
  $('#fwpRows').innerHTML = rows.length
    ? rows.map((p) => {
        const a = fwAccount(p.accountId);
        const done = fwCompletes(p);
        return `
          <tr class="row-link" data-href="#/fw-projects/${p.id}">
            <td class="col-id">${p.id}</td>
            <td>${escapeHtml(a.client)}</td>
            <td><a class="cell-link" href="#/fw-projects/${p.id}">${escapeHtml(p.name)}</a></td>
            <td class="t-num${done ? '' : ' zero'}">${fmtInt(done)}</td>
            <td class="mono-sm">${escapeHtml(p.jn)}</td>
            <td class="mono-sm">${escapeHtml(p.po)}</td>
            <td class="t-muted">${fmtStamp(p.createdAt)}</td>
            <td class="t-muted-2">${escapeHtml(a.email)}</td>
          </tr>`;
      }).join('')
    : emptyRow(8, `No ${fwp.tab} projects found`, fwp.search ? 'Try a different search.' : `${fwp.tab === 'active' ? 'Active' : 'Closed'} framework projects show up here.`);
  $('#fwpFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> projects` : 'No projects to show'}</span>
    <nav aria-label="Project pages">${pagerHtml(page, pages, 'fwp-page')}</nav>`;
}

function onFwProjectsClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-fwp-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      fwp.page = Number(pageBtn.dataset.fwpPage);
      renderFwProjectRows();
    }
    return;
  }
  const tab = t.closest('[data-fwp-tab]');
  if (tab) {
    Object.assign(fwp, { tab: tab.dataset.fwpTab, page: 1 });
    renderFwProjects();
    $(`[data-fwp-tab="${fwp.tab}"]`).focus();
    return;
  }
  if (t.closest('[data-fwp-action="sort"]')) {
    fwp.sortDir = fwp.sortDir === 'desc' ? 'asc' : 'desc';
    renderFwProjectRows();
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="fw-projects"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    fwp.search = '';
    fwp.page = 1;
    $('[data-search="fw-projects"]').value = '';
    renderFwProjectRows();
    return;
  }
  const row = t.closest('tr[data-href]');
  if (row && !t.closest('a, button')) location.hash = row.dataset.href;
}

/* A framework project: what the client ordered. Read-only, except linking a target to a BASE project. */
const fwd = { id: null, open: new Set() };

function renderFwProject(id, tab = 'overview') {
  const p = fwProjects.find((x) => x.id === Number(id));
  if (!p || p.status === 'draft') {
    history.replaceState(null, '', '#/fw-projects');
    showToast("That project couldn't be found.", 'info');
    showPage('fw-projects');
    return;
  }
  if (fwd.id !== p.id) Object.assign(fwd, { id: p.id, open: new Set() });
  const a = fwAccount(p.accountId);
  const active = tab === 'targets' ? 'targets' : 'overview';
  fwp.tab = p.status; // back to the right list
  document.title = `${p.name} · Base`;
  const root = $('#fwProjectView');
  root.innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/fw-projects" title="Back to projects" aria-label="Back to projects"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">${escapeHtml(p.name)}</h1>
        <p class="page-sub">#${p.id} · ${escapeHtml(a.client)} · ${escapeHtml(a.email)} · ${p.status} · created ${fmtStamp(p.createdAt)}</p>
      </div>
    </header>
    <section class="pv-card fwd-card">
      <div class="pv-tabs fw-tabs" role="tablist" aria-label="Project">
        ${[['overview', 'Overview'], ['targets', 'Targets']].map(([key, label]) => `
          <a class="pv-tab${key === active ? ' active' : ''}" role="tab" href="#/fw-projects/${p.id}/${key}" aria-selected="${key === active}"
             ${key === active ? 'aria-current="page"' : ''}>${label}${key === 'targets' ? ` <span class="fw-tab-count">${p.targets.length}</span>` : ''}</a>`).join('')}
      </div>
      <div class="fwd-body" role="tabpanel">
        ${active === 'overview' ? `
          <div class="fwd-overview">
            <div class="uf-row">
              <label class="form-label" for="fwdName">Project name</label>
              <input class="form-control" id="fwdName" value="${escapeHtml(p.name)}" readonly>
            </div>
            <div class="uf-row">
              <label class="form-label" for="fwdJn">Job number</label>
              <input class="form-control fwd-short" id="fwdJn" value="${escapeHtml(p.jn)}" readonly>
            </div>
            <div class="uf-row">
              <label class="form-label" for="fwdPo">PO</label>
              <input class="form-control fwd-short" id="fwdPo" value="${escapeHtml(p.po)}" readonly>
            </div>
          </div>`
        : `<div class="fwt-list">${p.targets.map((t) => targetHtml(p, t)).join('')}</div>`}
        <div class="fwd-actions">
          <a class="btn btn-ghost" href="#/fw-projects">Cancel</a>
          <div class="form-check m-0">
            <input class="form-check-input" type="checkbox" id="fwdTerms" checked disabled>
            <label class="form-check-label" for="fwdTerms">I agree to the terms and conditions</label>
          </div>
        </div>
      </div>
    </section>`;
  if (active === 'targets') {
    p.targets.forEach((t) => {
      if (!fwd.open.has(t.id)) return;
      createComboBox($(`#fwtBase-${t.id}`), {
        id: `fwtBaseInput-${t.id}`,
        options: projects.map((x) => ({ value: String(x.id), label: `#${x.jobNo} ${x.name}`, hint: x.country.name })),
        value: t.baseProjectId ? String(t.baseProjectId) : '',
        placeholder: 'Select project...',
        onChange: (value) => {
          t.baseProjectId = value ? Number(value) : null;
          const linked = projects.find((x) => x.id === t.baseProjectId);
          showToast(linked ? `${t.country} target linked to #${linked.jobNo} ${linked.name}.` : `${t.country} target unlinked.`, linked ? 'success' : 'info');
        },
      });
    });
  }
  root.onclick = (e) => {
    const head = e.target.closest('[data-fwt]');
    if (!head) return;
    const tid = Number(head.dataset.fwt);
    if (fwd.open.has(tid)) fwd.open.delete(tid);
    else fwd.open.add(tid);
    renderFwProject(p.id, 'targets');
    $(`[data-fwt="${tid}"]`).focus();
  };
}

function targetHtml(p, t) {
  const open = fwd.open.has(t.id);
  const head = `
    <button type="button" class="fwt-head" data-fwt="${t.id}" aria-expanded="${open}" aria-controls="fwt-${t.id}">
      <span>${escapeHtml(targetTitle(t))}</span><i class="bi bi-chevron-down"></i>
    </button>`;
  if (!open) return `<div class="fwt-item">${head}</div>`;
  const avail = t.quotas.map((q) => fwAvailable(t.country, q));
  const sum = (list) => list.reduce((s, n) => s + n, 0);
  const f = (id) => `fwt${t.id}-${id}`;
  return `
    <div class="fwt-item open">
      ${head}
      <div class="fwt-body" id="fwt-${t.id}">
        <div class="fwt-grid">
          <div class="fwt-field"><label class="form-label" for="${f('country')}">Country</label>
            <select class="form-select" id="${f('country')}" disabled><option>${escapeHtml(t.country)}</option></select></div>
          <div class="fwt-field"><label class="form-label" for="${f('completes')}">Completes</label>
            <input class="form-control" id="${f('completes')}" value="${t.completes}" readonly></div>
          <div class="fwt-field fwt-wide"><span class="form-label" id="${f('devices')}">Allowed devices</span>
            <div class="fwt-chips" role="list" aria-labelledby="${f('devices')}">${t.devices.map((d) => `<span class="ms-chip" role="listitem">${d}</span>`).join('')}</div></div>
          <div class="fwt-field"><span class="form-label" id="${f('pii')}">PII collection</span>
            ${fwSegHtml('pii', f('pii'), [['1', 'Yes'], ['0', 'No']], t.pii ? '1' : '0', true)}</div>
          <div class="fwt-field"><label class="form-label" for="${f('ir')}">Incidence rate</label>
            <select class="form-select" id="${f('ir')}" disabled><option>${FW_IR[t.ir]}</option></select></div>
          <div class="fwt-field"><label class="form-label" for="${f('loi')}">Survey length</label>
            <select class="form-select" id="${f('loi')}" disabled><option>${FW_TARGET_LOI[t.loi]}</option></select></div>
          <div class="fwt-field"><label class="form-label" for="${f('cpi')}">CPI</label>
            <div class="input-group"><span class="input-group-text">EUR</span><input class="form-control" id="${f('cpi')}" value="${t.cpi}" readonly></div></div>
        </div>
        <div class="cf-sub">Quotas</div>
        <div class="cf-samples">
          <table class="cf-sample-table fwt-quotas">
            <thead><tr><th>Gender</th><th>Age</th><th>Requested</th><th>Available</th></tr></thead>
            <tbody>
              ${t.quotas.map((q, i) => `
                <tr>
                  <td><select class="form-select" disabled aria-label="Quota ${i + 1}, gender"><option>${q.gender}</option></select></td>
                  <td><div class="cf-range"><input class="form-control" value="${q.from}" readonly aria-label="Quota ${i + 1}, age from"><span>-</span><input class="form-control" value="${q.to}" readonly aria-label="Quota ${i + 1}, age to"></div></td>
                  <td><input class="form-control cf-req" value="${q.requested}" readonly aria-label="Quota ${i + 1}, requested"></td>
                  <td><span class="cf-pill ${avail[i] >= q.requested ? 'is-ok' : 'is-short'}">${fmtInt(avail[i])}</span></td>
                </tr>`).join('')}
            </tbody>
            <tfoot><tr><td>Total</td><td></td><td><span class="cf-pill is-total">${fmtInt(sum(t.quotas.map((q) => q.requested)))}</span></td><td><span class="cf-pill is-total">${fmtInt(sum(avail))}</span></td></tr></tfoot>
          </table>
        </div>
        <div class="fwt-field fwt-block"><label class="form-label" for="${f('info')}">Target and quota information</label>
          <textarea class="form-control" id="${f('info')}" rows="3" readonly aria-describedby="${f('infoHelp')}">${escapeHtml(t.info)}</textarea>
          <div class="field-help" id="${f('infoHelp')}">Describe your requirements for the specific quota</div></div>
        <div class="uf-row fwt-row"><label class="form-label" for="${f('test')}">Test link</label>
          <input class="form-control mono" id="${f('test')}" value="${escapeHtml(t.testLink)}" readonly></div>
        <div class="uf-row fwt-row"><label class="form-label" for="${f('live')}">Live link</label>
          <input class="form-control mono" id="${f('live')}" value="${escapeHtml(t.liveLink)}" readonly></div>
        <div class="uf-row fwt-row"><label class="form-label" for="fwtBaseInput-${t.id}">BASE project</label>
          <div class="fwt-base"><div id="fwtBase-${t.id}"></div></div></div>
      </div>
    </div>`;
}

/* ---------- FW - Ratecard ---------- */
const fwr = { page: 1, sortDir: 'desc', mounted: false, flashId: null };

function renderFwRatecards() {
  document.title = 'FW - Ratecard · Base';
  const root = $('#fwRatecardsView');
  const desc = fwr.sortDir === 'desc';
  const list = [...fwRatecards].sort((a, b) => (desc ? b.id - a.id : a.id - b.id));
  const { rows, page, pages, start } = paginate(list, fwr.page, FW_PAGE_SIZE);
  fwr.page = page;
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">FW - Ratecard</h1>
      <p class="page-sub">CPI price lists for framework clients, per market, survey length and incidence rate.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <a class="btn btn-ghost btn-sm-h" href="#/fw-ratecards/new"><i class="bi bi-plus-circle"></i> New Ratecard</a>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table fwr-table">
          <thead><tr>
            <th aria-sort="${desc ? 'descending' : 'ascending'}"><button type="button" class="th-sort" data-fwr-action="sort">ID <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button></th>
            <th>Name</th><th class="t-num">Markets</th><th class="t-num">Countries</th>
          </tr></thead>
          <tbody>
            ${rows.map((rc) => `
              <tr class="row-link${rc.id === fwr.flashId ? ' row-flash' : ''}" data-href="#/fw-ratecards/${rc.id}">
                <td class="col-id">${rc.id}</td>
                <td><a class="cell-link" href="#/fw-ratecards/${rc.id}">${escapeHtml(rc.name)}</a></td>
                <td class="t-num">${rc.markets.length}</td>
                <td class="t-num">${rc.markets.reduce((s, m) => s + m.countries.length, 0)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span class="page-info">Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> ratecards</span>
        <nav aria-label="Ratecard pages">${pagerHtml(page, pages, 'fwr-page')}</nav>
      </div>
    </section>`;
  fwr.flashId = null;
  if (!fwr.mounted) {
    root.addEventListener('click', (e) => {
      const pageBtn = e.target.closest('[data-fwr-page]');
      if (pageBtn) {
        if (!pageBtn.disabled) {
          fwr.page = Number(pageBtn.dataset.fwrPage);
          renderFwRatecards();
        }
        return;
      }
      if (e.target.closest('[data-fwr-action="sort"]')) {
        fwr.sortDir = fwr.sortDir === 'desc' ? 'asc' : 'desc';
        renderFwRatecards();
        return;
      }
      const row = e.target.closest('tr[data-href]');
      if (row && !e.target.closest('a, button')) location.hash = row.dataset.href;
    });
    fwr.mounted = true;
  }
}

/* One ratecard: its name and markets. */
const fwRatecardForm = { routeId: null, dirty: false, hash: '', label: 'on this ratecard' };
formGuards['fw-ratecard'] = fwRatecardForm;
const fwm = { search: '', sortDir: 'desc', page: 1 };

function renderFwRatecard(id) {
  const rc = id === 'new' ? null : fwRatecards.find((x) => x.id === Number(id));
  if (id !== 'new' && !rc) {
    history.replaceState(null, '', '#/fw-ratecards');
    showToast("That ratecard couldn't be found.", 'info');
    showPage('fw-ratecards');
    return;
  }
  if (fwRatecardForm.routeId !== id) Object.assign(fwm, { search: '', sortDir: 'desc', page: 1 });
  Object.assign(fwRatecardForm, { routeId: id, dirty: false, hash: `#/fw-ratecards/${id}` });
  document.title = `${rc ? rc.name : 'New ratecard'} · Base`;
  const root = $('#fwRatecardView');
  root.innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/fw-ratecards" title="Back to ratecards" aria-label="Back to ratecards"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">Ratecard</h1>
        <p class="page-sub">${rc ? `${escapeHtml(rc.name)} · ratecard #${rc.id} · ${plural(rc.markets.length, 'market')}` : 'Name the ratecard, then add its markets.'}</p>
      </div>
    </header>
    <section class="pv-card">
      <form id="fwrForm" novalidate autocomplete="off">
        <div class="uf-row fwr-name">
          <label class="form-label" for="fwrName">Name</label>
          <div><input class="form-control" id="fwrName" name="name" required maxlength="60" value="${rc ? escapeHtml(rc.name) : ''}">
            <div class="invalid-feedback" id="fwrNameFeedback">Enter a name.</div></div>
        </div>
        <div class="pv-form-actions">
          <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> ${rc ? 'Save' : 'Create ratecard'}</button>
          <button type="button" class="btn btn-ghost" data-fwr-action="cancel">Cancel</button>
          <span class="dirty-flag" id="fwrDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
        </div>
      </form>
    </section>
    ${rc ? `
      <section class="pv-card flush">
        <div class="pv-toolbar">
          <button type="button" class="btn btn-ghost btn-sm-h" data-fwr-action="new-market"><i class="bi bi-plus-circle"></i> New Market</button>
        </div>
        <div class="list-filters">${searchGroupHtml('fw-markets', 'Search markets…', fwm.search)}</div>
        <div class="table-responsive">
          <table class="pv-table list-table fwm-table">
            <thead id="fwmHead"></thead>
            <tbody id="fwmRows"></tbody>
          </table>
        </div>
        <div class="table-footer" id="fwmFooter"></div>
      </section>` : ''}`;
  if (rc) renderFwMarketRows(rc);

  const form = $('#fwrForm');
  form.addEventListener('input', () => {
    if (fwRatecardForm.dirty) return;
    fwRatecardForm.dirty = true;
    $('#fwrDirty').hidden = false;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.elements.name;
    const name = input.value.trim();
    const clash = fwRatecards.some((x) => x !== rc && x.name.toLowerCase() === name.toLowerCase());
    input.setCustomValidity(clash ? 'taken' : '');
    $('#fwrNameFeedback').textContent = clash ? 'Another ratecard already has this name.' : 'Enter a name.';
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      input.focus();
      return;
    }
    fwRatecardForm.dirty = false;
    if (rc) {
      rc.name = name;
      fwr.flashId = rc.id;
      showToast(`${name} saved.`);
      renderFwRatecard(String(rc.id));
      return;
    }
    const created = { id: Math.max(0, ...fwRatecards.map((x) => x.id)) + 1, name, markets: [] };
    fwRatecards.push(created);
    fwr.flashId = created.id;
    location.hash = `#/fw-ratecards/${created.id}`;
    showToast(`${name} created. Add its markets with New Market.`);
  });
  root.onclick = (e) => {
    const t = e.target;
    if (t.closest('[data-fwr-action="cancel"]')) {
      fwRatecardForm.dirty = false;
      location.hash = '#/fw-ratecards';
      return;
    }
    if (!rc) return;
    if (t.closest('[data-fwr-action="new-market"]')) {
      openMarketModal(rc, null);
      return;
    }
    const pageBtn = t.closest('[data-fwm-page]');
    if (pageBtn) {
      if (!pageBtn.disabled) {
        fwm.page = Number(pageBtn.dataset.fwmPage);
        renderFwMarketRows(rc);
      }
      return;
    }
    if (t.closest('[data-fwm-action="sort"]')) {
      fwm.sortDir = fwm.sortDir === 'desc' ? 'asc' : 'desc';
      renderFwMarketRows(rc);
      return;
    }
    if (t.closest('[data-search-go]')) {
      $('[data-search="fw-markets"]').focus();
      return;
    }
    if (t.closest('[data-search-clear]')) {
      fwm.search = '';
      fwm.page = 1;
      $('[data-search="fw-markets"]').value = '';
      renderFwMarketRows(rc);
      return;
    }
    const row = t.closest('tr[data-market]');
    if (row) openMarketModal(rc, rc.markets.find((m) => m.id === Number(row.dataset.market)));
  };
  root.oninput = (e) => {
    if (e.target.dataset.search !== 'fw-markets') return;
    fwm.search = e.target.value;
    fwm.page = 1;
    renderFwMarketRows(rc);
  };
  if (!rc) $('#fwrName').focus();
}

function renderFwMarketRows(rc, flashId = null) {
  const q = fwm.search.trim().toLowerCase();
  const desc = fwm.sortDir === 'desc';
  const list = rc.markets
    .filter((m) => !q || `${m.id} ${m.countries.join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => (desc ? b.id - a.id : a.id - b.id));
  const { rows, page, pages, start } = paginate(list, fwm.page, FW_PAGE_SIZE);
  fwm.page = page;
  $('#fwmHead').innerHTML = `
    <tr>
      <th aria-sort="${desc ? 'descending' : 'ascending'}"><button type="button" class="th-sort" data-fwm-action="sort">ID <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button></th>
      <th>Markets</th>
    </tr>`;
  $('#fwmRows').innerHTML = rows.length
    ? rows.map((m) => `
        <tr class="row-link${m.id === flashId ? ' row-flash' : ''}" data-market="${m.id}">
          <td class="col-id">${m.id}</td>
          <td class="fwm-countries"><button type="button" class="cell-link fwm-link">${escapeHtml(m.countries.join(', '))}</button></td>
        </tr>`).join('')
    : emptyRow(2, q ? 'No markets found' : 'No markets yet', q ? 'Try a different search.' : 'Add a market with New Market to price it.');
  $('#fwmFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> markets` : 'No markets to show'}</span>
    <nav aria-label="Market pages">${pagerHtml(page, pages, 'fwm-page')}</nav>`;
}

// Ratecard details: the markets this price list covers and the CPI per survey length and incidence rate.
function openMarketModal(rc, market) {
  const grid = market ? market.cpi || cpiGrid(market.factor) : emptyCpiGrid();
  openFormModal({
    title: 'Ratecard details',
    subtitle: `${rc.name} · ${market ? `market #${market.id}` : 'new market'}`,
    wide: 'xl',
    body: `
      <div class="rc-import">
        <div class="input-group">
          <input class="form-control" type="file" id="rcFile" accept=".xlsx,.xls" aria-describedby="rcFileHelp">
          <button type="button" class="btn btn-import" id="rcImport" disabled><i class="bi bi-upload"></i> Import</button>
        </div>
        <div class="field-help" id="rcFileHelp">Select XLSX file to import CPI data</div>
      </div>
      <label class="form-label mt-3" for="rcMarketsInput">Market</label>
      <div id="rcMarkets"></div>
      <div class="invalid-feedback" id="rcMarketsFeedback">Select at least one market.</div>
      <div class="rc-wrap">
        <table class="rc-grid">
          <thead>
            <tr><th class="rc-corner"></th><th class="rc-ir-title" colspan="${FW_IR.length}">Incidence Rate</th></tr>
            <tr><th class="rc-loi-head">LOI</th>${FW_IR.map((ir) => `<th>${ir}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${FW_LOI.map((loi, r) => `
              <tr>
                <th class="rc-loi" scope="row">${loi}</th>
                ${FW_IR.map((ir, c) => `
                  <td><div class="rc-cell">
                    ${FW_CURRENCIES.map(([cur, sign]) => `
                      <label class="rc-price"><span aria-hidden="true">${sign}</span><input type="number" min="0" step="0.01" inputmode="decimal"
                        data-cur="${cur}" data-r="${r}" data-c="${c}" value="${grid[cur][r][c]}" aria-label="${loi}, ${ir}, ${cur.toUpperCase()}"></label>`).join('')}
                  </div></td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`,
    submitLabel: '<i class="bi bi-check2"></i> Save',
    onSubmit: () => {
      const countries = picker.getValue();
      const taken = countries.filter((c) => rc.markets.some((m) => m !== market && m.countries.includes(c)));
      const msg = $('#rcMarketsFeedback');
      msg.textContent = !countries.length ? 'Select at least one market.' : `Already priced in another market of this ratecard: ${taken.join(', ')}.`;
      const bad = !countries.length || taken.length > 0;
      picker.setInvalid(bad);
      msg.classList.toggle('d-block', bad);
      if (bad) {
        $('#rcMarketsInput').focus();
        return false;
      }
      const cpi = emptyCpiGrid();
      $$('#pvModalBody .rc-price input').forEach((input) => {
        cpi[input.dataset.cur][Number(input.dataset.r)][Number(input.dataset.c)] = Number(input.value) || 0;
      });
      let saved = market;
      if (market) {
        Object.assign(market, { countries, cpi });
      } else {
        const id = Math.max(0, ...fwRatecards.flatMap((x) => x.markets.map((m) => m.id))) + 1;
        saved = { id, countries, factor: 1, cpi };
        rc.markets.push(saved);
        fwm.page = 1;
      }
      if (currentView === 'fw-ratecard') {
        renderFwMarketRows(rc, saved.id);
        $('#fwRatecardView .page-sub').textContent = `${rc.name} · ratecard #${rc.id} · ${plural(rc.markets.length, 'market')}`;
      }
      showToast(market ? `${countries.join(', ')} saved.` : `Market ${countries.join(', ')} added to ${rc.name}.`);
      return true;
    },
  });
  const picker = createMultiSelect($('#rcMarkets'), {
    id: 'rcMarketsInput',
    options: FW_MARKETS.map((m) => ({ value: m, label: m })),
    selected: market ? market.countries : [],
    placeholder: 'Select...',
    onChange: (value) => {
      if (!value.length) return;
      picker.setInvalid(false);
      $('#rcMarketsFeedback').classList.remove('d-block');
    },
  });
  const body = $('#pvModalBody');
  body.onchange = (e) => {
    if (e.target.id === 'rcFile') $('#rcImport').disabled = !e.target.files.length;
  };
  body.onclick = (e) => {
    if (!e.target.closest('#rcImport')) return;
    const file = $('#rcFile').files[0];
    showToast(`Importing CPI data from ${file.name} isn't connected yet in this preview. Type the prices in the grid instead.`, 'info');
  };
}

/* ---------- FW - Feasibilities ---------- */
const fwf = { search: '', sortKey: 'market', sortDir: 'asc', page: 1, mounted: false, flashMarket: null };

function visibleFwFeasibilities() {
  const q = fwf.search.trim().toLowerCase();
  const dir = fwf.sortDir === 'asc' ? 1 : -1;
  return fwFeasibilities
    .filter((f) => !q || f.market.toLowerCase().includes(q))
    .sort((a, b) => (fwf.sortKey === 'market' ? a.market.localeCompare(b.market) * dir : ((a.value ?? -1) - (b.value ?? -1)) * dir || a.market.localeCompare(b.market)));
}

function renderFwFeasibilities() {
  document.title = 'FW - Feasibilities · Base';
  const root = $('#fwFeasibilitiesView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">FW - Feasibilities</h1>
      <p class="page-sub">How many completes each market can deliver, shown to framework clients when they order.</p>
    </header>
    <div class="tr-note" role="note">
      <i class="bi bi-info-circle"></i>
      <span>Total market feasibility based on suggested CPIs, age range 18-69, 100% incidence rate on gen pop and device agnostic script (all devices allowed)</span>
    </div>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-fwf-action="new"><i class="bi bi-plus-circle"></i> New Feasibility</button>
      </div>
      <div class="list-filters">
        ${searchGroupHtml('fw-feasibilities', 'Search markets…', fwf.search)}
        <div class="fwf-io">
          <input type="file" id="fwfFile" accept=".csv,.txt,.xlsx,.xls" hidden>
          <button type="button" class="btn btn-import btn-sm-h" data-fwf-action="import" title="CSV or Excel file with a market and a feasibility column"><i class="bi bi-upload"></i> Import</button>
          <button type="button" class="btn btn-export btn-sm-h" data-fwf-action="export"><i class="bi bi-download"></i> Export</button>
        </div>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table fwf-table">
          <thead id="fwfHead"></thead>
          <tbody id="fwfRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="fwfFooter"></div>
    </section>`;
  if (!fwf.mounted) {
    root.addEventListener('click', onFwFeasibilitiesClick);
    root.addEventListener('input', (e) => {
      if (e.target.dataset.search !== 'fw-feasibilities') return;
      fwf.search = e.target.value;
      fwf.page = 1;
      renderFwFeasibilityRows();
    });
    root.addEventListener('change', (e) => {
      if (e.target.id === 'fwfFile' && e.target.files.length) importFwFeasibilities(e.target);
    });
    fwf.mounted = true;
  }
  renderFwFeasibilityRows();
}

function renderFwFeasibilityRows() {
  const list = visibleFwFeasibilities();
  const { rows, page, pages, start } = paginate(list, fwf.page, FW_PAGE_SIZE);
  fwf.page = page;
  $('#fwfHead').innerHTML = `<tr>${sortTh('market', 'Market', fwf, 'fwf-sort')}${sortTh('value', 'Feasibility', fwf, 'fwf-sort')}</tr>`;
  $('#fwfRows').innerHTML = rows.length
    ? rows.map((f) => `
        <tr class="${f.market === fwf.flashMarket ? 'row-flash' : ''}">
          <td>${escapeHtml(f.market)}</td>
          <td class="fwf-value">${f.value == null ? '<span class="zero" title="Import feasibility data to fill this in">—</span>' : fmtInt(f.value)}</td>
        </tr>`).join('')
    : emptyRow(2, 'No markets found', fwf.search ? 'Try a different search.' : 'Add a market with New Feasibility.');
  fwf.flashMarket = null;
  $('#fwfFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> markets` : 'No markets to show'}</span>
    <nav aria-label="Feasibility pages">${pagerHtml(page, pages, 'fwf-page')}</nav>`;
}

function onFwFeasibilitiesClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-fwf-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      fwf.page = Number(pageBtn.dataset.fwfPage);
      renderFwFeasibilityRows();
    }
    return;
  }
  const sort = t.closest('[data-fwf-sort]');
  if (sort) {
    const key = sort.dataset.fwfSort;
    fwf.sortDir = fwf.sortKey === key && fwf.sortDir === 'asc' ? 'desc' : 'asc';
    fwf.sortKey = key;
    fwf.page = 1;
    renderFwFeasibilityRows();
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="fw-feasibilities"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    fwf.search = '';
    fwf.page = 1;
    $('[data-search="fw-feasibilities"]').value = '';
    renderFwFeasibilityRows();
    return;
  }
  const action = t.closest('[data-fwf-action]')?.dataset.fwfAction;
  if (action === 'new') openFeasibilityModal();
  else if (action === 'import') $('#fwfFile').click();
  else if (action === 'export') {
    const list = visibleFwFeasibilities();
    downloadCsv(`fw-feasibilities-${today()}.csv`, [['Market', 'Feasibility'], ...list.map((f) => [f.market, f.value ?? ''])]);
    showToast(`Exported ${plural(list.length, 'market')}.`);
  }
}

// New Feasibility: just the market. The number comes in with Import.
function openFeasibilityModal() {
  const listed = new Set(fwFeasibilities.map((f) => f.market));
  openFormModal({
    title: 'Feasibility',
    subtitle: 'Add a market. Its feasibility is filled in with Import.',
    body: `
      <label class="form-label" for="fwfMarket">Market</label>
      <div id="fwfMarketBox"></div>
      <div class="invalid-feedback">Select a market.</div>`,
    submitLabel: '<i class="bi bi-check2"></i> Save',
    onSubmit: () => {
      const market = $('#fwfMarket').value;
      fwFeasibilities.push({ market, value: null });
      Object.assign(fwf, { search: '', sortKey: 'market', sortDir: 'asc' });
      fwf.page = Math.floor(visibleFwFeasibilities().findIndex((f) => f.market === market) / FW_PAGE_SIZE) + 1;
      fwf.flashMarket = market;
      if (currentView === 'fw-feasibilities') renderFwFeasibilities();
      showToast(`${market} added. Import feasibility data to fill in its number.`);
      return true;
    },
  });
  createComboBox($('#fwfMarketBox'), {
    id: 'fwfMarket',
    options: FW_MARKETS.filter((m) => !listed.has(m)).map((m) => ({ value: m, label: m })),
    placeholder: 'Select...',
    onChange: (value) => $('#fwfMarket').setCustomValidity(value ? '' : 'Select a market.'),
  });
  $('#fwfMarket').setCustomValidity('Select a market.');
}

// Import: a CSV or Excel file with a market column and a feasibility column (header row optional).
async function importFwFeasibilities(input) {
  const file = input.files[0];
  input.value = '';
  try {
    const rows = await readTableFile(file);
    const known = new Map(FW_MARKETS.map((m) => [m.toLowerCase(), m]));
    let updated = 0;
    let added = 0;
    let skipped = 0;
    rows.forEach(([name = '', value = '']) => {
      const market = known.get(String(name).trim().toLowerCase());
      const n = Number(String(value).replace(/[\s,]/g, ''));
      if (!market || !Number.isFinite(n) || n < 0) {
        if (!/^market$/i.test(String(name).trim())) skipped += 1;
        return;
      }
      const row = fwFeasibilities.find((f) => f.market === market);
      if (row) {
        row.value = Math.round(n);
        updated += 1;
      } else {
        fwFeasibilities.push({ market, value: Math.round(n) });
        added += 1;
      }
    });
    renderFwFeasibilityRows();
    const parts = [updated && `${plural(updated, 'market')} updated`, added && `${plural(added, 'market')} added`, skipped && `${plural(skipped, 'row')} skipped`].filter(Boolean);
    showToast(parts.length ? `Imported ${file.name}: ${parts.join(', ')}.` : `Nothing to import in ${file.name}.`, updated || added ? 'success' : 'info');
  } catch (err) {
    showToast(err.message || `Couldn't read ${file.name}.`, 'info');
  }
}
