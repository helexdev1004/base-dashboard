'use strict';

// Framework sample data: accounts, projects, ratecards and feasibilities.

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
// Dollar and pound prices follow the euro price. rate is a percentage (110 = x1.10), and the maths is done in cents so it doesn't drift.
const fromEur = (eur, rate) => Math.round((Math.round(eur * 100) * rate) / 100) / 100;
function cpiGrid(factor) {
  const eur = FW_BASE_CPI.map((row) => row.map((v) => Math.round(v * factor * 10) / 10));
  return { eur, usd: eur.map((row) => row.map((v) => fromEur(v, 110))), gbp: eur.map((row) => row.map((v) => fromEur(v, 85))) };
}
const emptyCpiGrid = () => Object.fromEntries(FW_CURRENCIES.map(([cur]) => [cur, FW_LOI.map(() => FW_IR.map(() => 0))]));

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

  // Ratecard01 has the full market list (targetCpi reads it); the others get a few random markets each.
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
      if (nextMarketId === 41) nextMarketId += 1; // 41 is China on Ratecard01
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
      // Fixed: all devices, no PII, info 'test'.
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

  // Feasibility per market. Argentina and Australia are fixed, the rest random.
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
