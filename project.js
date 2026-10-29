'use strict';

/* =========================================================
   Base · Project detail
   Opens when a project is clicked (#/project/<id>/<tab>) and doubles as
   the New Project form (#/project/new). Uses the data and helpers from
   script.js (projects, PMS, COUNTRIES, CLIENTS, $, $$, escapeHtml, …).
   ========================================================= */

/* ---------- Reference data ---------- */
const VENDORS = ['Gavenze', 'Panelwise', 'Northfield Sample', 'Opinion Bridge', 'SurveyHub Direct', 'Quickpoll Panels'];
// Panels (Panel management ▸ Panels has the details).
const PANELS = [
  { code: 'GAV', name: 'Gavenze' },
  { code: 'JAF', name: 'Jafenzi' },
  { code: 'ENC', name: 'Encuestat' },
  { code: 'SDD', name: 'Sondage Direct' },
  { code: 'MVD', name: 'Mening Vandaag' },
  { code: 'OPT', name: 'Opinion Today' },
  { code: 'SEP', name: 'Sondaggi & premi' },
];
const PROJECT_TYPES = ['ad hoc', 'tracker', 'omnibus'];
const ENTITY_STATUSES = ['active', 'paused', 'closed'];
const LINK_VARIABLES = ['{MRID}', '{UNIQUE_CODES}', '{CUSTOM_LINK}'];
const SURVEY_GROUP_HELP = 'Respondents that attempted in selected projects are not eligible for this project.';
const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

// Screener / post poll question builder.
const QUESTION_TYPES = ['Single radio', 'Single dropdown', 'Multiple choice', 'Numeric', 'Open text'];
const TYPES_WITHOUT_ANSWERS = new Set(['Numeric', 'Open text']);
// QFAIL2 is a quality fail in the screener (QFAIL1 is reported from the survey itself).
const ANSWER_ACTIONS = [
  ['none', 'No action'], ['S1', 'S1'], ['S2', 'S2'], ['Q2', 'Q2'], ['QFAIL2', 'QFAIL2'], ['Required', 'Required'], ['Qualify', 'Qualify'],
];
const SCREENOUT_ACTIONS = new Set(['S1', 'S2', 'Q2', 'QFAIL2']);
const POLL_STATUSES = [
  ['C1', 'Complete (C1)'], ['S1', 'Screenout (S1)'], ['S2', 'Screenout (S2)'], ['Q1', 'Quota full (Q1)'],
  ['Q2', 'Quota full (Q2)'], ['QFAIL', 'Quality fail'], ['DUP', 'Duplicate'], ['GEO', 'Geo IP fail'],
];

// Library answers are [text, action]; the action defaults to "No action".
// Generic screener questions, used for sample project screeners and to build the per-country Screener Library.
const SCREENER_TEMPLATES = [
  { id: 'age', text: 'How old are you?', type: 'Single dropdown',
    answers: [['Under 18', 'S1'], ['18–24'], ['25–34'], ['35–44'], ['45–54'], ['55–64'], ['65 or older', 'S1']] },
  { id: 'gender', text: 'What is your gender?', type: 'Single radio',
    answers: [['Female'], ['Male'], ['Non-binary'], ['Prefer not to say']] },
  { id: 'region', text: 'Which region do you live in?', type: 'Single dropdown',
    answers: [['Capital region'], ['North'], ['South'], ['East'], ['West']] },
  { id: 'employment', text: 'What is your current employment status?', type: 'Single radio',
    answers: [['Employed full time', 'Qualify'], ['Employed part time', 'Qualify'], ['Self-employed'], ['Unemployed', 'S1'], ['Student', 'S1'], ['Retired', 'S1']] },
  { id: 'education', text: 'What is the highest level of education you have completed?', type: 'Single dropdown',
    answers: [['No formal education'], ['Primary school'], ['Secondary school'], ['Vocational qualification'], ['Bachelor’s degree'], ['Master’s degree'], ['Doctorate']] },
  { id: 'income', text: 'What is your annual household income?', type: 'Single dropdown',
    answers: [['Under €20,000'], ['€20,000–39,999'], ['€40,000–59,999'], ['€60,000–99,999'], ['€100,000 or more'], ['Prefer not to say', 'S2']] },
  { id: 'parent', text: 'Are you a parent of a child under 18?', type: 'Single radio',
    answers: [['Yes', 'Qualify'], ['No', 'S1']] },
  { id: 'car', text: 'Do you own or lease a car?', type: 'Single radio',
    answers: [['Own', 'Qualify'], ['Lease', 'Qualify'], ['Neither', 'S1']] },
  { id: 'industry', text: 'Do you or anyone in your household work in any of these industries?', type: 'Multiple choice',
    answers: [['Market research', 'S1'], ['Advertising or PR', 'S1'], ['Journalism', 'S1'], ['None of these']] },
];

const POLL_LIBRARY = [
  { id: 'rating', text: 'How would you rate this survey overall?', type: 'Single radio', answers: [['Very poor'], ['Poor'], ['Okay'], ['Good'], ['Excellent']] },
  { id: 'length', text: 'How did you find the length of the survey?', type: 'Single radio', answers: [['Too short'], ['About right'], ['Too long']] },
  { id: 'device', text: 'Did the survey work well on your device?', type: 'Single radio', answers: [['Yes'], ['Partly'], ['No']] },
  { id: 'again', text: 'Would you take part in a similar survey again?', type: 'Single radio', answers: [['Yes'], ['Maybe'], ['No']] },
  { id: 'feedback', text: 'Is there anything you would like to tell us about this survey?', type: 'Open text', answers: [] },
];

const TABS = [
  { id: 'main', label: 'Main' },
  { id: 'vendors', label: 'Project vendors' },
  { id: 'progress', label: 'Progress' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'codes', label: 'Unique codes' },
  { id: 'links', label: 'Custom Link' },
  { id: 'ips', label: 'Exclude IPs' },
  { id: 'screener', label: 'Screener' },
  { id: 'poll', label: 'Post Poll' },
];
const TAB_IDS = new Set(TABS.map((t) => t.id));

// [key, label, tooltip] — every response metric a project tracks.
const STAT_COLS = [
  ['eb', 'EB', 'Entry base'], ['ec', 'EC', 'Entry client'], ['incomplete', 'Incomplete'], ['c1', 'C1', 'Completes'],
  ['s1', 'S1', 'Screenouts'], ['s2', 'S2', 'Screenouts'], ['q1', 'Q1', 'Quota fulls'], ['q2', 'Q2', 'Quota fulls'],
  ['dup1', 'DUP1', 'Duplicates'], ['dup2', 'DUP2', 'Duplicates'], ['dup3', 'DUP3', 'Duplicates'],
  ['geo1', 'GEO1'], ['qfail1', 'QFAIL1', 'Quality fails'], ['qfail2', 'QFAIL2', 'Quality fails'],
  ['ex1', 'EX1'], ['ex2', 'EX2'], ['dev1', 'DEV1'], ['noUnique', 'No unique code'],
];
const STAT_KEYS = STAT_COLS.map(([key]) => key);
const colsFor = (keys) => keys.map((k) => STAT_COLS.find(([key]) => key === k));
const VENDOR_COLS = colsFor(['eb', 'ec', 'c1', 's1', 's2', 'q1', 'q2', 'incomplete', 'dup1', 'dup2', 'geo1', 'qfail1', 'qfail2', 'dev1'])
  .map((col) => (col[0] === 'incomplete' ? ['incomplete', 'INC', 'Incomplete'] : col));
const DAILY_COLS = colsFor(['eb', 'ec', 'c1', 's1', 's2', 'q1', 'q2', 'dup1', 'dup2', 'dup3', 'geo1', 'qfail1', 'qfail2', 'ex1', 'ex2', 'dev1']);
const CAMPAIGN_COLS = [
  ['inv', 'INV', 'Invitations sent'], ['eb', 'EB', 'Entry base'], ['ec', 'EC', 'Entry client'], ['rr', 'RR', 'Response rate (EB ÷ INV)'],
  ['c1', 'C1', 'Completes'], ['s1', 'S1'], ['s2', 'S2'], ['q1', 'Q1'], ['q2', 'Q2'], ['inc', 'INC', 'Incomplete'], ['cth', 'CTH'],
];
const CAMPAIGN_KEYS = ['inv', 'eb', 'ec', 'c1', 's1', 's2', 'q1', 'q2', 'inc', 'cth'];

/* ---------- Helpers ---------- */
function seeded(seed) {
  const next = mulberry32(seed);
  const between = (min, max) => min + next() * (max - min);
  return {
    next,
    between,
    int: (min, max) => Math.floor(between(min, max + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
  };
}

const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function token(length, next = Math.random, chars = TOKEN_CHARS) {
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(next() * chars.length)];
  return out;
}

function shuffle(arr, next) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Split an integer total into parts proportional to the weights (largest remainder; parts sum to total).
function splitInt(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - Math.floor(r), i])
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (rest > 0) { out[i] += 1; rest -= 1; } });
  return out;
}

const pad2 = (n) => String(n).padStart(2, '0');
function isoDay(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fmtStamp(ts) {
  const d = new Date(ts);
  return `${isoDay(ts)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const emptyStats = () => Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
function addStats(into, from) {
  STAT_KEYS.forEach((k) => { into[k] += from[k] || 0; });
  return into;
}

const plural = (n, word, many = `${word}s`) => `${fmtInt(n)} ${n === 1 ? word : many}`;
const numCell = (n, cls = '') => `<td class="${cls}${n === 0 ? ' zero' : ''}">${fmtInt(n)}</td>`;
const thCells = (cols, hl = 'c1') => cols
  .map(([key, label, title]) => `<th class="${key === hl ? 'col-hl' : ''}"${title ? ` title="${title}"` : ''}>${label}</th>`)
  .join('');
const optionsHtml = (opts, selected) => opts
  .map(([value, label]) => `<option value="${escapeHtml(value)}"${String(value) === String(selected) ? ' selected' : ''}>${escapeHtml(label)}</option>`)
  .join('');
const emptyRow = (span, title, text) => `
  <tr class="pv-empty"><td colspan="${span}">
    <i class="bi bi-inboxes"></i><div class="empty-title">${title}</div><div class="empty-text">${text}</div>
  </td></tr>`;
const pmNames = (p) => p.pms.map((x) => x.name).join(', ');
const makeLiveLink = (next = Math.random) => `https://fwredirect.com/start/${token(15, next)}/{MRID}`;

function copyText(text, message) {
  navigator.clipboard.writeText(text)
    .then(() => showToast(message))
    .catch(() => showToast('Copy failed — select the text and copy it manually.', 'info'));
}

/* ---------- Per-project detail data ---------- */
// Totals shown inside a project. Most come straight from the list row; the extra
// breakdown (DUP3, GEO1, EX1/2, DEV1, no unique code) lives in project.detail.
function projectStats(p) {
  const d = p.detail;
  return {
    eb: p.eb, ec: p.ec, incomplete: p.drops, c1: p.c1, s1: p.s1, s2: p.s2, q1: p.q1, q2: p.q2,
    dup1: p.dupsA, dup2: p.dupsB, dup3: d.dup3, geo1: d.geo1, qfail1: p.qfA, qfail2: p.qfB,
    ex1: d.ex1, ex2: d.ex2, dev1: d.dev1, noUnique: d.noUnique,
  };
}

function newDetail() {
  return {
    type: 'ad hoc', geoIp: true, blockDupIp: true, surveyGroup: [], notes: '', liveLink: makeLiveLink(),
    dup3: 0, geo1: 0, ex1: 0, ex2: 0, dev1: 0, noUnique: 0,
    days: [], vendors: [], campaigns: [], codes: [], links: [], ips: [],
    screenerActive: true, screener: [], pollActive: false, pollStatuses: ['C1'], poll: [],
  };
}

// A question copied from a library entry, with zeroed answer counts.
function questionFromLibrary(lib, id) {
  return {
    id,
    libId: lib.id,
    text: lib.text,
    type: lib.type,
    answers: lib.answers.map(([text, action = 'none'], i) => ({ id: i + 1, text, action, counts: [0, 0, 0] })),
  };
}

// Sample detail, generated the first time a project is opened (seeded by its id, so it's stable).
function ensureDetail(p) {
  if (p.detail) return p.detail;
  const r = seeded(p.id * 7919 + 17);
  const live = p.status === 'Live';
  const end = p.lastEntryAt || Date.now();
  const dayCount = p.eb ? r.int(3, 7) : 0;
  const days = Array.from({ length: dayCount }, (_, i) => isoDay(end - (dayCount - 1 - i) * DAY));
  // The list's OTHERS column is GEO1 + EX1 + EX2 + DEV1 + no unique code.
  const [geo1, ex1, ex2, dev1, noUnique] = splitInt(p.others,
    [r.between(2, 5), r.between(0, 1), r.between(0, 1), r.between(0, 1), r.between(0, 1.5)]);

  const d = {
    type: r.chance(0.7) ? 'ad hoc' : r.pick(PROJECT_TYPES),
    geoIp: r.chance(0.8),
    blockDupIp: r.chance(0.75),
    surveyGroup: [],
    notes: '',
    liveLink: makeLiveLink(r.next),
    dup3: r.chance(0.7) ? 0 : r.int(1, 5),
    geo1, ex1, ex2, dev1, noUnique,
    days,
    vendors: [], campaigns: [], codes: [], links: [], ips: [],
    screenerActive: r.chance(0.85), screener: [],
    pollActive: r.chance(0.4), pollStatuses: r.chance(0.6) ? ['C1'] : ['C1', 'S1'], poll: [],
  };
  p.detail = d;

  // Vendors share the project's totals; each vendor's totals are spread over the fieldwork days.
  if (p.eb) {
    const count = r.chance(0.55) ? 1 : r.int(2, 3);
    const names = ['Gavenze', ...shuffle(VENDORS.slice(1), r.next)].slice(0, count);
    const weights = names.map(() => r.between(0.35, 1));
    const totals = projectStats(p);
    const parts = names.map(() => emptyStats());
    STAT_KEYS.forEach((k) => splitInt(totals[k], weights).forEach((v, i) => { parts[i][k] = v; }));
    d.vendors = names.map((name, i) => ({
      id: i + 1,
      name,
      status: live ? (r.chance(0.85) ? 'active' : 'paused') : 'closed',
      stats: parts[i],
      daily: spreadOverDays(parts[i], days, live, r),
    }));
  }

  d.campaigns = makeCampaigns(r, end, live);
  if (r.chance(0.5)) d.codes = makePool(r.int(80, 300), p.c1, r, () => token(8, r.next, CODE_CHARS), days, end);
  if (r.chance(0.3)) {
    d.links = makePool(r.int(40, 160), Math.round(p.c1 * 0.8), r,
      () => `https://panel.example.com/r/${token(10, r.next)}`, days, end);
  }
  if (r.chance(0.5)) {
    d.ips = Array.from({ length: r.int(1, 6) }, () => ({
      ip: `${r.int(11, 223)}.${r.int(0, 255)}.${r.int(0, 255)}.${r.chance(0.25) ? '0/24' : r.int(1, 254)}`,
      addedAt: end - r.between(1, 20) * DAY,
    }));
  }
  // Screener: "age" plus a few library questions. Counts per answer are
  // [chose this answer, went on to complete, screened out here].
  const picks = ['age', ...shuffle(SCREENER_TEMPLATES.slice(1).map((q) => q.id), r.next).slice(0, r.int(1, 2))];
  d.screener = picks.map((libId, i) => {
    const q = questionFromLibrary(SCREENER_TEMPLATES.find((l) => l.id === libId), i + 1);
    const chose = splitInt(p.eb, q.answers.map(() => r.between(0.2, 1)));
    const passing = q.answers.map((a, j) => (SCREENOUT_ACTIONS.has(a.action) ? 0 : chose[j]));
    const completed = splitInt(p.c1, passing.some(Boolean) ? passing : passing.map(() => 1));
    q.answers.forEach((a, j) => {
      a.counts = [chose[j], SCREENOUT_ACTIONS.has(a.action) ? 0 : completed[j], SCREENOUT_ACTIONS.has(a.action) ? chose[j] : 0];
    });
    return q;
  });

  // Post poll: answer counts are responses from completes.
  if (d.pollActive) {
    d.poll = shuffle(POLL_LIBRARY.slice(0, 4), r.next).slice(0, r.int(1, 2)).map((lib, i) => {
      const q = questionFromLibrary(lib, i + 1);
      const responses = splitInt(Math.round(p.c1 * r.between(0.5, 0.9)), q.answers.map(() => r.between(0.2, 1)));
      q.answers.forEach((a, j) => { a.counts = [responses[j]]; });
      return q;
    });
  }
  return d;
}

function spreadOverDays(stats, days, live, r) {
  if (!days.length) return [];
  // The last day of a live project is still in progress, so it gets a smaller share.
  const base = days.map((_, i) => (live && i === days.length - 1 ? r.between(0.05, 0.35) : r.between(0.4, 1)));
  const rows = days.map((date) => ({ date, ...emptyStats() }));
  STAT_KEYS.forEach((k) => {
    splitInt(stats[k], base.map((w) => w * r.between(0.75, 1.25))).forEach((v, i) => { rows[i][k] = v; });
  });
  return rows;
}

function campaignStats(r) {
  const inv = r.int(50, 800);
  const eb = Math.round(inv * (r.chance(0.6) ? r.between(0.02, 0.15) : r.between(0.35, 0.85)));
  const ec = Math.round(eb * r.between(0.5, 0.9));
  const c1 = Math.round(ec * r.between(0.2, 0.6));
  const rare = () => (r.chance(0.85) ? 0 : r.int(1, 6));
  return {
    inv, eb, ec, c1, s1: rare(), s2: rare(), q1: rare(),
    q2: Math.round((ec - c1) * r.between(0.5, 1)),
    inc: Math.round((eb - ec) * r.between(0.2, 0.7)),
    cth: r.int(0, 4),
  };
}

function makeCampaigns(r, end, live) {
  const count = r.chance(0.25) ? 0 : r.int(2, 6);
  const list = [];
  let created = end - r.between(3, 6) * DAY;
  for (let i = 1; i <= count; i++) {
    created = Math.min(end, created + r.between(0.2, 1.1) * DAY);
    const stats = campaignStats(r);
    const campaign = {
      id: i,
      name: `Campaign ${pad2(i)}`,
      panel: r.pick(PANELS).code,
      status: !live || (i < count - 2 && r.chance(0.3)) ? 'closed' : 'active',
      created,
      stats,
      segments: [],
    };
    if (stats.inv > 200 && r.chance(0.35)) {
      const names = r.chance(0.5) ? ['Female, 25-65', 'Male, 25-65'] : ['18-34', '35-54', '55+'];
      const weights = names.map(() => r.between(0.6, 1));
      const parts = names.map(() => ({}));
      CAMPAIGN_KEYS.forEach((k) => splitInt(stats[k], weights).forEach((v, j) => { parts[j][k] = v; }));
      campaign.segments = names.map((name, j) => ({ id: j + 1, name, status: campaign.status, created, stats: parts[j] }));
    }
    list.push(campaign);
  }
  return list;
}

function makePool(count, used, r, makeValue, days, end) {
  const seen = new Set();
  const items = [];
  while (items.length < count) {
    const value = makeValue();
    if (seen.has(value)) continue;
    seen.add(value);
    items.push({ value, mrid: null, usedAt: null });
  }
  for (let i = 0; i < Math.min(used, count); i++) {
    items[i].mrid = `MR${r.int(100000, 999999)}`;
    items[i].usedAt = end - r.between(0, Math.max(1, days.length)) * DAY;
  }
  return items;
}

function createProject(v) {
  const p = {
    id: Math.max(...projects.map((x) => x.id)) + 1,
    jobNo: v.jobNo,
    po: v.po,
    name: v.name,
    country: v.country,
    client: v.client,
    pms: v.pms,
    status: v.status,
    eb: 0, ec: 0, c1: 0, s1: 0, q1: 0, s2: 0, q2: 0,
    ir: 0, conv: 0,
    loiBid: v.loiBid,
    loiReal: null,
    drops: 0, dupsA: 0, dupsB: 0, qfA: 0, qfB: 0, others: 0,
    lastEntryAt: null, lastCompleteAt: null,
    c24h: 0, eb24h: 0, cMonth: 0, ebMonth: 0,
    createdAt: Date.now(),
  };
  p.detail = {
    ...newDetail(),
    type: v.type, geoIp: v.geoIp, blockDupIp: v.blockDupIp,
    surveyGroup: v.surveyGroup, notes: v.notes, liveLink: v.liveLink,
  };
  // Library questions marked "Project default" for this country start the screener.
  p.detail.screener = SCREENER_LIBRARY
    .filter((lib) => lib.projectDefault && lib.country === v.country.code.toUpperCase())
    .map((lib, i) => questionFromLibrary(lib, i + 1));
  projects.unshift(p);
  return p;
}

/* ---------- View state ---------- */
const pv = {
  project: null,
  creating: false,
  tab: 'main',
  dirty: false,
  rendered: new Set(),
  draftLink: null,
  pmSelect: null,
  groupSelect: null,
  vendorView: 'chart',
  vendorFilter: '',
  campStatus: 'Live',
  campPanel: '',
  campSort: 'desc',
  expanded: new Set(),
  chartIndex: -1,
  ipDraft: null,         // Exclude IPs edits wait for Save
  unsaved: new Set(),    // tabs other than Main with unsaved edits ('ips', 'screener', 'poll')
};
const UNSAVED_LABELS = { ips: 'Exclude IPs', screener: 'Screener', poll: 'Post Poll' };
let chartObserver = null;

/* ---------- Routing ---------- */
// Every page other than the project list and a project.
const PAGE_RENDERERS = {
  feasibility: () => renderFeasibility(),              // feasibility.js
  exports: () => renderExports(),                      // exports.js
  vendors: () => renderVendorsList(),                  // vendors.js
  'vendor-form': (r) => renderVendorForm(r.id),        // vendors.js
  'vendor-groups': () => renderVendorGroups(),         // vendors.js
  blacklist: () => renderBlacklist(),                  // blacklist.js
  'screener-library': () => renderLibrary(),           // library.js
  'library-form': (r) => renderLibraryForm(r.id),      // library.js
  panels: () => renderPanels(),                        // panels.js
  panel: (r) => renderPanelPage(r.panel),              // panels.js
  panelist: (r) => renderPanelist(r.panel, r.id),      // panels.js
  rewards: () => renderRewards(),                      // rewards.js
  redeem: () => renderRedeem(),                        // rewards.js
  recruiters: () => renderRecruiters(),                // recruiters.js
  recruiter: (r) => renderRecruiter(r.id),             // recruiters.js
  ...Object.fromEntries(Object.keys(SOON_PAGES).map((key) => [key, () => renderSoon(key)])),
};
// Pages opened by a plain #/<name> address.
const SIMPLE_PAGES = [
  'feasibility', 'exports', 'vendors', 'vendor-groups', 'blacklist', 'screener-library', 'panels', 'rewards', 'redeem', 'recruiters',
  ...Object.keys(SOON_PAGES),
];

// [pattern, route] — the first match wins.
const ROUTES = [
  [/^#\/project\/(new|\d+)(?:\/([a-z]+))?$/, (m) => ({ view: 'project', id: m[1], tab: m[2] })],
  [/^#\/vendors\/(new|\d+)$/, (m) => ({ view: 'vendor-form', id: m[1] })],
  [/^#\/screener-library\/(new|\d+)$/, (m) => ({ view: 'library-form', id: m[1] })],
  [/^#\/panels\/([a-z]+)\/(\d+)$/, (m) => ({ view: 'panelist', panel: m[1], id: m[2] })],
  [/^#\/panels\/([a-z]+)$/, (m) => ({ view: 'panel', panel: m[1] })],
  [/^#\/recruiters\/(new|\d+)$/, (m) => ({ view: 'recruiter', id: m[1] })],
  [new RegExp(`^#/(${SIMPLE_PAGES.join('|')})$`), (m) => ({ view: m[1] })],
];

function currentRoute() {
  for (const [pattern, toRoute] of ROUTES) {
    const m = location.hash.match(pattern);
    if (m) return toRoute(m);
  }
  return { view: 'list' };
}

function projectHash(p, tab) {
  return `#/project/${p ? p.id : 'new'}${tab && tab !== 'main' ? `/${tab}` : ''}`;
}

function route() {
  const r = currentRoute();
  const open = currentView === 'project';
  const sameTarget = r.view === 'project' && (r.id === 'new' ? pv.creating : Number(r.id) === pv.project?.id);
  const pending = [pv.dirty && 'Main', ...[...pv.unsaved].map((t) => UNSAVED_LABELS[t])].filter(Boolean);
  if (open && pending.length && !sameTarget) {
    history.replaceState(null, '', projectHash(pv.project, pv.tab));
    showToast(`You have unsaved changes on ${pending.join(', ')}. Save or cancel them first.`, 'info');
    return;
  }
  // Edit pages (vendor, library question, panelist, recruiter) register in formGuards (script.js).
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

function leaveProject() {
  chartObserver?.disconnect();
  Object.assign(pv, { project: null, creating: false, dirty: false, unsaved: new Set(), ipDraft: null });
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

// Menu items without a design yet (SOON_PAGES in script.js) share one placeholder page.
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

function openProject(p, tab) {
  const creating = !p;
  const same = currentView === 'project' && pv.creating === creating && pv.project === p;
  if (!same) {
    if (p) ensureDetail(p);
    Object.assign(pv, {
      project: p, creating, dirty: false, rendered: new Set(), draftLink: null,
      vendorView: 'chart', vendorFilter: '', campStatus: 'Live', campPanel: '', campSort: 'desc',
      expanded: new Set(), chartIndex: -1, ipDraft: null, unsaved: new Set(), ecOnly: false,
    });
    renderShell();
    setView('project');
  }
  selectTab(creating ? 'main' : tab, { updateUrl: false });
}

/* ---------- Shell: header + tabs ---------- */
function renderShell() {
  const locked = pv.creating;
  $('#projectView').innerHTML = `
    <header class="pv-header" id="pvHeader"></header>
    <nav class="pv-tabs" role="tablist" aria-label="Project sections">
      ${TABS.map((t) => `
        <button type="button" class="pv-tab" role="tab" id="tab-${t.id}" data-tab="${t.id}"
                aria-controls="panel-${t.id}" aria-selected="false" tabindex="-1"
                ${locked && t.id !== 'main' ? 'disabled title="Save the project first"' : ''}>${t.label}</button>`).join('')}
    </nav>
    ${TABS.map((t) => `<section class="pv-panel" id="panel-${t.id}" role="tabpanel" aria-labelledby="tab-${t.id}" hidden></section>`).join('')}`;
  renderHeader();
}

function renderHeader() {
  const el = $('#pvHeader');
  const p = pv.project;
  const back = '<a class="pv-back-btn" href="#/" title="Back to projects" aria-label="Back to projects"><i class="bi bi-arrow-left"></i></a>';
  if (!p) {
    el.innerHTML = `
      <div class="pv-title-row">
        ${back}
        <div class="pv-title-block">
          <h1 class="pv-title">New project</h1>
          <div class="pv-meta"><span class="status-badge status-draft">Draft</span><span>Not saved yet</span></div>
        </div>
      </div>`;
    return;
  }
  const status = p.status === 'Live'
    ? '<span class="status-badge status-live">Live</span>'
    : '<span class="status-badge status-closed">Closed</span>';
  const chips = [
    ['Completes', fmtInt(p.c1)],
    ['IR / Conv', `${p.ir}% / ${p.conv}%`],
    ['LOI real', p.loiReal == null ? '—' : `${p.loiReal.toFixed(2)} min`],
    ['Last entry', p.lastEntryAt ? relativeTime(p.lastEntryAt) : '—'],
  ];
  el.innerHTML = `
    <div class="pv-title-row">
      ${back}
      <div class="pv-title-block">
        <h1 class="pv-title">${escapeHtml(p.name)}</h1>
        <div class="pv-meta">
          ${status}
          <span class="pv-job" title="MFJN">#${p.jobNo}</span>
          ${p.po ? `<span class="pv-job" title="MFPO">#${escapeHtml(p.po)}</span>` : ''}
          <span><span class="fi fi-${p.country.code}"></span> ${escapeHtml(p.country.name)}</span>
          <span><i class="bi bi-building"></i> ${escapeHtml(p.client)}</span>
          <span><i class="bi bi-tag"></i> ${escapeHtml(p.detail.type)}</span>
          <span><i class="bi bi-person"></i> ${escapeHtml(pmNames(p))}</span>
        </div>
      </div>
      <div class="pv-quick">
        ${chips.map(([label, value]) => `
          <div class="pv-chip"><span class="pv-chip-label">${label}</span><span class="pv-chip-value">${value}</span></div>`).join('')}
      </div>
    </div>`;
}

const RENDERERS = {
  main: renderMain,
  vendors: renderVendors,
  progress: renderProgress,
  campaigns: renderCampaigns,
  codes: (el) => renderPool(el, 'codes'),
  links: (el) => renderPool(el, 'links'),
  ips: renderIps,
  screener: (el) => renderQuestions(el, 'screener'),
  poll: (el) => renderQuestions(el, 'poll'),
};

function renderPanel(tab) {
  RENDERERS[tab]($(`#panel-${tab}`));
  pv.rendered.add(tab);
}

function selectTab(tab, { updateUrl = true } = {}) {
  pv.tab = tab;
  $$('#projectView .pv-tab').forEach((btn) => {
    const on = btn.dataset.tab === tab;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
  });
  TABS.forEach((t) => { $(`#panel-${t.id}`).hidden = t.id !== tab; });
  if (!pv.rendered.has(tab)) renderPanel(tab);
  if (updateUrl) history.replaceState(null, '', projectHash(pv.project, tab));
  document.title = `${pv.creating ? 'New project' : pv.project.name} · Base`;
}

/* ---------- Main tab ---------- */
function mainValues() {
  const p = pv.project;
  if (!p) {
    pv.draftLink = pv.draftLink || makeLiveLink();
    return {
      name: '', pms: ['RA'], client: '', surveyNo: nextJobNo(), po: '', length: '',
      geoIp: true, blockDupIp: true, country: '', status: 'Live', type: 'ad hoc',
      surveyGroup: [], notes: '', liveLink: pv.draftLink,
    };
  }
  const d = p.detail;
  return {
    name: p.name, pms: p.pms.map((x) => x.initials), client: p.client, surveyNo: p.jobNo, po: p.po,
    length: p.loiBid, geoIp: d.geoIp, blockDupIp: d.blockDupIp, country: p.country.code, status: p.status,
    type: d.type, surveyGroup: d.surveyGroup.map(String), notes: d.notes, liveLink: d.liveLink,
  };
}

const toggleHtml = (field, label, on) => `
  <span class="form-label d-block" id="lbl-${field}">${label}</span>
  <div class="segmented seg-field" role="group" aria-labelledby="lbl-${field}" data-field="${field}">
    <button type="button" data-action="toggle" data-value="1" class="${on ? 'active' : ''}" aria-pressed="${on}">Active</button>
    <button type="button" data-action="toggle" data-value="0" class="${on ? '' : 'active'}" aria-pressed="${!on}">Inactive</button>
  </div>`;

const toggleValue = (field) => $(`#mainForm [data-field="${field}"] .active`)?.dataset.value === '1';

function renderMain(el) {
  const p = pv.project;
  const v = mainValues();
  const countryOpts = [['', 'Select a country'], ...COUNTRIES.map((c) => [c.code, c.name]).sort((a, b) => a[1].localeCompare(b[1]))];
  const clientOpts = [['', 'Select a client'], ...[...CLIENTS].sort().map((c) => [c, c])];

  // Two columns: a compact form on the left (short fields share rows), fieldwork metrics on the right.
  el.innerHTML = `
    <div class="main-layout">
      <form class="pv-card mf-compact" id="mainForm" novalidate autocomplete="off">
        <div class="pv-card-head">
          <div>
            <h2 class="pv-card-title">${p ? 'Project details' : 'Project setup'}</h2>
            ${p ? '' : '<p class="pv-card-sub">Save to create the project. The other tabs unlock once it exists.</p>'}
          </div>
          <span class="dirty-flag" id="dirtyFlag" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
        </div>

        <div class="mf-rows">
          <div class="mf-row">
            <div class="mf-field mf-grow">
              <label class="form-label" for="mfName">Name</label>
              <input class="form-control" id="mfName" required maxlength="100" value="${escapeHtml(v.name)}" placeholder="e.g. Employed individuals">
              <div class="invalid-feedback">Enter a project name.</div>
            </div>
            <div class="mf-field mf-grow mf-grow-lg">
              <label class="form-label" for="mfPm">PM</label>
              <div id="mfPmSelect"></div>
              <div class="invalid-feedback">Pick at least one project manager.</div>
            </div>
          </div>

          <div class="mf-row">
            <div class="mf-field mf-grow">
              <label class="form-label" for="mfClient">Client</label>
              <select class="form-select" id="mfClient" required>${optionsHtml(clientOpts, v.client)}</select>
              <div class="invalid-feedback">Select a client.</div>
            </div>
            <div class="mf-field mf-w-sm">
              <label class="form-label" for="mfSurveyNo">MFJN</label>
              <input class="form-control" id="mfSurveyNo" type="number" min="1" step="1" required value="${v.surveyNo}">
              <div class="invalid-feedback" id="mfSurveyNoFeedback">Enter the MFJN.</div>
            </div>
            <div class="mf-field mf-w-sm">
              <label class="form-label" for="mfPo">MFPO</label>
              <input class="form-control" id="mfPo" maxlength="40" value="${escapeHtml(v.po)}" placeholder="MFPO">
            </div>
          </div>

          <div class="mf-row">
            <div class="mf-field mf-w-md">
              <label class="form-label" for="mfCountry">Country</label>
              <select class="form-select" id="mfCountry" required>${optionsHtml(countryOpts, v.country)}</select>
              <div class="invalid-feedback">Select a country.</div>
            </div>
            <div class="mf-field mf-w-xs">
              <label class="form-label" for="mfLength">Survey length</label>
              <div class="input-group has-validation">
                <input class="form-control" id="mfLength" type="number" min="1" max="90" step="1" required value="${v.length}" placeholder="10">
                <span class="input-group-text">min</span>
                <div class="invalid-feedback">1–90 minutes.</div>
              </div>
            </div>
            <div class="mf-field">${toggleHtml('geoIp', 'Geo IP check', v.geoIp)}</div>
            <div class="mf-field">${toggleHtml('blockDupIp', 'Block duplicated IP', v.blockDupIp)}</div>
          </div>

          <div class="mf-row">
            <div class="mf-field mf-w-sm">
              <label class="form-label" for="mfStatus">Status</label>
              <select class="form-select" id="mfStatus">${optionsHtml([['Live', 'Live'], ['Closed', 'Closed']], v.status)}</select>
            </div>
            <div class="mf-field mf-w-sm">
              <label class="form-label" for="mfType">Type</label>
              <select class="form-select" id="mfType">${optionsHtml(PROJECT_TYPES.map((t) => [t, t]), v.type)}</select>
            </div>
            <div class="mf-field mf-grow">
              <label class="form-label" for="mfGroup">
                Survey group <i class="bi bi-info-circle mf-info" title="${SURVEY_GROUP_HELP}" aria-hidden="true"></i>
              </label>
              <div id="mfGroupSelect"></div>
              <span class="visually-hidden" id="mfGroupHelp">${SURVEY_GROUP_HELP}</span>
            </div>
          </div>

          <div class="mf-field">
            <label class="form-label" for="mfNotes">Notes</label>
            <textarea class="form-control" id="mfNotes" rows="2" maxlength="2000" placeholder="Anything the team should know about this project">${escapeHtml(v.notes)}</textarea>
          </div>

          <div class="mf-field">
            <div class="mf-label-row">
              <label class="form-label" for="mfLink">Live link</label>
              <div class="field-help" role="group" aria-label="Predefined variables">
                Insert variable:
                ${LINK_VARIABLES.map((x) => `<button type="button" class="var-chip" data-action="insert-var" data-value="${x}">${x}</button>`).join('')}
              </div>
            </div>
            <div class="input-group has-validation">
              <input class="form-control mono" id="mfLink" required value="${escapeHtml(v.liveLink)}" spellcheck="false">
              <button class="btn btn-ghost" type="button" data-action="copy-link" title="Copy link" aria-label="Copy live link"><i class="bi bi-clipboard"></i></button>
              <div class="invalid-feedback">Enter a full URL starting with http:// or https://.</div>
            </div>
          </div>
        </div>

        <div class="pv-form-actions">
          <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> ${p ? 'Save' : 'Create project'}</button>
          <button type="button" class="btn btn-ghost" data-action="cancel-main">Cancel</button>
        </div>
      </form>

      <section class="pv-card metrics-card" aria-labelledby="metricsTitle">
        <div class="pv-card-head metrics-head">
          <div class="metrics-head-title">
            <h2 class="pv-card-title" id="metricsTitle">Fieldwork metrics <span class="pv-card-note">all vendors combined</span></h2>
            ${p ? ecToggleHtml() : ''}
          </div>
          ${p ? '<button type="button" class="btn btn-ghost btn-sm-h" data-action="export-main"><i class="bi bi-download"></i> Export data</button>' : ''}
        </div>
        ${p ? metricsHtml(p) : `
          <div class="pv-empty-block">
            <i class="bi bi-bar-chart-line"></i>
            <div class="empty-title">No fieldwork yet</div>
            <div class="empty-text">Metrics appear here once respondents start the survey.</div>
          </div>`}
      </section>
    </div>`;

  pv.pmSelect = createMultiSelect($('#mfPmSelect', el), {
    id: 'mfPm',
    options: PMS.map((x) => ({ value: x.initials, label: x.name })),
    selected: v.pms,
    placeholder: 'Select project managers…',
    onChange: (value) => {
      markDirty();
      if ($('#mainForm').classList.contains('was-validated')) pv.pmSelect.setInvalid(!value.length);
    },
  });
  pv.groupSelect = createMultiSelect($('#mfGroupSelect', el), {
    id: 'mfGroup',
    options: projects.filter((x) => x !== p).map((x) => ({ value: String(x.id), label: `#${x.jobNo} · ${x.name}` })),
    selected: v.surveyGroup,
    placeholder: 'Select projects…',
    describedBy: 'mfGroupHelp',
    onChange: markDirty,
  });
  pv.dirty = false;
}

// Fieldwork metric boxes, one row per group: [key, label, tooltip].
const METRIC_GROUPS = [
  [['c1', 'Completes', 'Completes (C1)'], ['ir', 'Incidence', 'Incidence rate'], ['conv', 'Conversion'], ['lastEntry', 'Last entry']],
  [['loiBid', 'LOI bid (min)', 'Length of interview quoted, in minutes'], ['loiReal', 'LOI actual (min)', 'Actual length of interview so far, in minutes']],
  [['eb', 'Entry base (EB)'], ['ec', 'Entry client (EC)'], ['incomplete', 'Incomplete']],
  [['q1', 'Q1', 'Quota fulls'], ['q2', 'Q2', 'Quota fulls'], ['s1', 'S1', 'Screenouts'], ['s2', 'S2', 'Screenouts']],
  [['dup1', 'DUP1', 'Duplicates'], ['dup2', 'DUP2', 'Duplicates'], ['dup3', 'DUP3', 'Duplicates']],
  [['qfail1', 'QFAIL1', 'Quality fails'], ['qfail2', 'QFAIL2', 'Quality fails'], ['geo1', 'GEO1']],
  [['dev1', 'DEV1'], ['ex1', 'EX1'], ['ex2', 'EX2'], ['noUnique', 'No unique code']],
];

function shortAgo(ts) {
  const mins = Math.max(0, Math.round((Date.now() - ts) / MINUTE));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} d ago`;
}

function metricsHtml(p) {
  const s = projectStats(p);
  const shown = {
    ...Object.fromEntries(STAT_KEYS.map((k) => [k, { text: fmtInt(s[k]), zero: s[k] === 0 }])),
    ir: { text: `${p.ir}%`, zero: !p.ir },
    conv: { text: `${p.conv}%`, zero: !p.conv },
    lastEntry: p.lastEntryAt
      ? { text: shortAgo(p.lastEntryAt), isText: true, note: fmtStamp(p.lastEntryAt) }
      : { text: '—', zero: true },
    loiBid: { text: p.loiBid.toFixed(2) },
    loiReal: p.loiReal == null ? { text: '—', zero: true } : { text: p.loiReal.toFixed(2) },
  };
  return `
    <div class="metric-rows">
      ${METRIC_GROUPS.map((group, i) => `
        <div class="metric-row${i === 0 ? ' is-headline' : ''}">
          ${group.map(([key, label, title]) => {
            const m = shown[key];
            const cls = [key === 'c1' && 'is-key', m.zero && 'is-zero', m.isText && 'is-text'].filter(Boolean).join(' ');
            const tip = [title, m.note].filter(Boolean).join(' · ');
            return `
              <div class="metric-box ${cls}"${tip ? ` title="${tip}"` : ''}>
                <span class="metric-label">${label}</span>
                <span class="metric-value">${m.text}</span>
              </div>`;
          }).join('')}
        </div>`).join('')}
    </div>`;
}

function markDirty() {
  if (pv.dirty) return;
  pv.dirty = true;
  const flag = $('#dirtyFlag');
  if (flag) flag.hidden = false;
}

function saveMain() {
  const form = $('#mainForm');
  const p = pv.project;

  const surveyInput = $('#mfSurveyNo');
  const surveyNo = Number(surveyInput.value);
  const taken = surveyInput.value !== '' && projects.some((x) => x !== p && x.jobNo === surveyNo);
  const takenMsg = 'Already used by another project.';
  surveyInput.setCustomValidity(taken ? takenMsg : '');
  $('#mfSurveyNoFeedback').textContent = taken ? takenMsg : 'Enter the MFJN.';

  const link = $('#mfLink');
  link.setCustomValidity(/^https?:\/\/\S+$/i.test(link.value.trim()) ? '' : 'invalid');

  const pms = pv.pmSelect.getValue();
  pv.pmSelect.setInvalid(!pms.length);
  form.classList.add('was-validated');
  if (!form.checkValidity() || !pms.length) {
    (form.querySelector(':invalid') || $('#mfPm')).focus();
    return;
  }

  const values = {
    name: $('#mfName').value.trim(),
    pms: pms.map((initials) => PMS.find((x) => x.initials === initials)),
    client: $('#mfClient').value,
    jobNo: surveyNo,
    po: $('#mfPo').value.trim(),
    loiBid: Number($('#mfLength').value),
    country: COUNTRIES.find((c) => c.code === $('#mfCountry').value),
    status: $('#mfStatus').value,
    type: $('#mfType').value,
    geoIp: toggleValue('geoIp'),
    blockDupIp: toggleValue('blockDupIp'),
    surveyGroup: pv.groupSelect.getValue().map(Number),
    notes: $('#mfNotes').value.trim(),
    liveLink: link.value.trim(),
  };
  pv.dirty = false;

  if (!p) {
    const created = createProject(values);
    location.hash = projectHash(created, 'main');
    showToast(`Project #${created.jobNo} "${created.name}" created.`);
    return;
  }

  Object.assign(p, {
    name: values.name, pms: values.pms, client: values.client, jobNo: values.jobNo, po: values.po,
    loiBid: values.loiBid, country: values.country, status: values.status,
  });
  Object.assign(p.detail, {
    type: values.type, geoIp: values.geoIp, blockDupIp: values.blockDupIp,
    surveyGroup: values.surveyGroup, notes: values.notes, liveLink: values.liveLink,
  });
  pv.rendered.clear();
  renderHeader();
  renderPanel('main');
  showToast('Changes saved.');
}

function exportMain() {
  const p = pv.project;
  const d = p.detail;
  const stats = projectStats(p);
  const onOff = (b) => (b ? 'Active' : 'Inactive');
  downloadCsv(`project-${p.jobNo}-summary-${today()}.csv`, [
    ['Field', 'Value'],
    ['Name', p.name], ['MFJN', p.jobNo], ['MFPO', p.po], ['Client', p.client],
    ['PM', pmNames(p)], ['Country', p.country.name], ['Status', p.status], ['Type', d.type],
    ['Survey length (min)', p.loiBid], ['Geo IP check', onOff(d.geoIp)], ['Block duplicated IP', onOff(d.blockDupIp)],
    ['Live link', d.liveLink], ['Notes', d.notes],
    [],
    ['Metric', 'Value'],
    ...STAT_COLS.map(([key, label]) => [label, stats[key]]),
  ]);
  showToast('Project summary exported.');
}

/* ---------- Project vendors tab ---------- */
const statusSelectHtml = (kind, id, status, extra = '') => `
  <select class="form-select status-select" data-change="${kind}-status" data-id="${id}" data-status="${status}"${extra} aria-label="Status">
    ${ENTITY_STATUSES.map((s) => `<option value="${s}"${s === status ? ' selected' : ''}>${s}</option>`).join('')}
  </select>`;

function shieldHtml(d) {
  const on = [d.geoIp && 'Geo IP check', d.blockDupIp && 'duplicate IP blocking'].filter(Boolean);
  const [cls, icon] = on.length === 2 ? ['on', 'bi-shield-fill-check'] : on.length ? ['partial', 'bi-shield-fill-exclamation'] : ['off', 'bi-shield-slash'];
  const label = on.length ? `Security checks on: ${on.join(' and ')}` : 'Security checks are off';
  return `<span class="shield ${cls}" role="img" title="${label}" aria-label="${label}"><i class="bi ${icon}"></i></span>`;
}

// Show All / Show EC only (Main tab metrics and Project vendors share it). Only the toggle state for now.
function ecToggleHtml() {
  const btn = (value, label, on) => `
    <button type="button" data-action="ec-toggle" data-value="${value}" class="${on ? 'active' : ''}" aria-pressed="${on}">${label}</button>`;
  return `
    <div class="segmented seg-xs ec-toggle" role="group" aria-label="Entries to show">
      ${btn('all', 'Show All', !pv.ecOnly)}${btn('ec', 'Show EC only', pv.ecOnly)}
    </div>`;
}

// Last entry / last complete per vendor. The busiest vendor matches the project's own times; the others are a little earlier.
function vendorActivity(p, v, busiest) {
  if (!v.stats.eb || !p.lastEntryAt) return { lastEntryAt: null, lastCompleteAt: null };
  if (v === busiest) return { lastEntryAt: p.lastEntryAt, lastCompleteAt: v.stats.c1 ? p.lastCompleteAt : null };
  const r = seeded(p.id * 131 + v.id);
  const lastEntryAt = p.lastEntryAt - r.int(4, 180) * MINUTE;
  const lastCompleteAt = v.stats.c1 && p.lastCompleteAt ? Math.min(lastEntryAt, p.lastCompleteAt - r.int(3, 240) * MINUTE) : null;
  return { lastEntryAt, lastCompleteAt };
}

function renderVendors(el) {
  const d = pv.project.detail;
  const total = d.vendors.reduce((acc, v) => addStats(acc, v.stats), emptyStats());
  const busiest = d.vendors.reduce((best, v) => (!best || v.stats.eb > best.stats.eb ? v : best), null);
  const isChart = pv.vendorView === 'chart';
  const subtitle = d.vendors.length === 1 ? `Daily completes (C1) · ${escapeHtml(d.vendors[0].name)}` : 'Daily completes (C1) by vendor';
  const cells = (stats) => VENDOR_COLS.map(([key]) => numCell(stats[key], key === 'c1' ? 'col-hl' : '')).join('');

  el.innerHTML = `
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-action="add-vendor"><i class="bi bi-plus-lg"></i> Add vendor</button>
        <button type="button" class="icon-btn-sm" data-action="refresh" data-tab="vendors" title="Refresh" aria-label="Refresh"><i class="bi bi-arrow-clockwise"></i></button>
        <span class="pv-toolbar-note">${plural(d.vendors.length, 'vendor')}</span>
        ${ecToggleHtml()}
      </div>
      <div class="table-responsive">
        <table class="pv-table vendor-table">
          <thead><tr>
            <th>Vendor name</th><th><span class="visually-hidden">Export</span></th><th class="col-progress">Progress</th>
            ${thCells(VENDOR_COLS)}<th>Status</th><th><span class="visually-hidden">Security</span></th>
          </tr></thead>
          <tbody>
            ${d.vendors.length ? d.vendors.map((v) => `
              <tr>
                <td class="cell-name">${escapeHtml(v.name)}</td>
                <td><button type="button" class="btn btn-ghost btn-xs" data-action="export-vendor" data-id="${v.id}"><i class="bi bi-download"></i> Export data</button></td>
                <td class="activity col-progress">${activityHtml(vendorActivity(pv.project, v, busiest))}</td>
                ${cells(v.stats)}
                <td>${statusSelectHtml('vendor', v.id, v.status)}</td>
                <td>${shieldHtml(d)}</td>
              </tr>`).join('') : emptyRow(VENDOR_COLS.length + 5, 'No vendors yet', 'Add a vendor to start collecting responses.')}
          </tbody>
          ${d.vendors.length > 1 ? `<tfoot><tr><td>Total</td><td></td><td></td>${cells(total)}<td></td><td></td></tr></tfoot>` : ''}
        </table>
      </div>
    </section>

    <section class="pv-card">
      <div class="pv-card-head">
        <div>
          <h2 class="pv-card-title">Progress over time</h2>
          <p class="pv-card-sub">${subtitle}</p>
        </div>
        <div class="segmented seg-sm" role="group" aria-label="Progress view">
          <button type="button" data-action="vendor-view" data-value="chart" class="${isChart ? 'active' : ''}" aria-pressed="${isChart}">Chart</button>
          <button type="button" data-action="vendor-view" data-value="table" class="${isChart ? '' : 'active'}" aria-pressed="${!isChart}">Table</button>
        </div>
      </div>
      ${isChart
        ? '<div class="chart-wrap" id="progressChart" tabindex="0" role="group" aria-roledescription="chart"></div><div class="chart-legend" id="progressLegend"></div>'
        : dailyTableHtml(d)}
    </section>`;

  chartObserver?.disconnect();
  if (isChart) {
    // Redraw whenever the chart's width changes (window resize, sidebar collapse, tab shown again).
    let timer;
    chartObserver = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(drawProgressChart, 80); });
    chartObserver.observe($('#progressChart'));
    drawProgressChart();
  }
}

function dailyRows(d) {
  const vendors = pv.vendorFilter ? d.vendors.filter((v) => String(v.id) === pv.vendorFilter) : d.vendors;
  return d.days.map((date, i) => vendors.reduce((acc, v) => addStats(acc, v.daily[i] || {}), { date, ...emptyStats() }));
}

function dailyTableHtml(d) {
  const rows = dailyRows(d);
  const total = rows.reduce((acc, r) => addStats(acc, r), emptyStats());
  const cells = (r) => DAILY_COLS.map(([key]) => numCell(r[key], key === 'c1' ? 'col-hl' : '')).join('');
  return `
    <div class="pv-subbar">
      <select class="form-select form-select-sm pv-filter" data-change="vendor-filter" aria-label="Filter vendor">
        <option value="">All vendors</option>
        ${d.vendors.map((v) => `<option value="${v.id}"${String(v.id) === pv.vendorFilter ? ' selected' : ''}>${escapeHtml(v.name)}</option>`).join('')}
      </select>
      <button type="button" class="btn btn-ghost btn-sm-h ms-auto" data-action="export-daily" ${rows.length ? '' : 'disabled'}><i class="bi bi-download"></i> Export data</button>
    </div>
    <div class="table-responsive pv-table-frame">
      <table class="pv-table">
        <thead><tr><th>Date</th>${thCells(DAILY_COLS)}</tr></thead>
        <tbody>
          ${rows.length
            ? rows.map((r) => `<tr><td>${r.date}</td>${cells(r)}</tr>`).join('')
            : emptyRow(DAILY_COLS.length + 1, 'No fieldwork days yet', 'Daily numbers appear once respondents start the survey.')}
        </tbody>
        ${rows.length ? `<tfoot><tr><td>Total</td>${cells(total)}</tr></tfoot>` : ''}
      </table>
    </div>`;
}

function niceScale(max, target = 4) {
  const rough = max / target;
  const mag = 10 ** Math.floor(Math.log10(rough));
  // Counts are whole numbers, so only whole-number steps (2.5 is allowed once it scales to 25, 250, …).
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= rough && Number.isInteger(s)));
  return { step, top: Math.ceil(max / step) * step };
}

// Line chart of daily completes per vendor. Colours follow the vendor (its id), never its rank.
function drawProgressChart() {
  const wrap = $('#progressChart');
  const legend = $('#progressLegend');
  if (!wrap || !wrap.clientWidth) return;
  const d = pv.project.detail;
  const dates = d.days;
  const series = d.vendors.map((v) => ({
    name: v.name,
    color: `var(--series-${((v.id - 1) % 8) + 1})`,
    values: dates.map((_, i) => v.daily[i]?.c1 ?? 0),
  }));

  if (!dates.length || !series.length) {
    wrap.innerHTML = `
      <div class="chart-empty">
        <i class="bi bi-graph-up"></i>
        <div class="empty-title">No activity yet</div>
        <div class="empty-text">The chart fills in once completes start coming in.</div>
      </div>`;
    legend.innerHTML = '';
    return;
  }

  const totals = dates.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0));
  const multi = series.length > 1;
  const W = wrap.clientWidth;
  const H = 300;
  const m = { top: 16, right: 20, bottom: 62, left: 56 };
  const plotH = H - m.top - m.bottom;
  const { step, top: yMax } = niceScale(Math.max(1, ...series.flatMap((s) => s.values)));
  const y = (v) => m.top + plotH - (v / yMax) * plotH;

  // Direct end labels for 2–4 vendors, but only when they don't collide (otherwise legend + tooltip carry it).
  let endLabels = false;
  if (multi && series.length <= 4) {
    const ends = series.map((s) => y(s.values[s.values.length - 1])).sort((a, b) => a - b);
    endLabels = ends.every((v, i) => i === 0 || v - ends[i - 1] >= 14);
    if (endLabels) m.right = 18 + Math.min(120, Math.max(...series.map((s) => s.name.length)) * 6.6);
  }
  const plotW = W - m.left - m.right;
  const inset = dates.length > 1 ? 22 : 0;
  const x = (i) => (dates.length === 1 ? m.left + plotW / 2 : m.left + inset + (i / (dates.length - 1)) * (plotW - inset * 2));
  const labelEvery = Math.max(1, Math.ceil((dates.length * 56) / plotW));

  const ticks = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(v);
  const grid = ticks.map((v) => `
    <line class="ch-grid" x1="${m.left}" x2="${W - m.right}" y1="${y(v)}" y2="${y(v)}"></line>
    <text class="ch-tick" x="${m.left - 10}" y="${y(v) + 4}" text-anchor="end">${fmtInt(v)}</text>`).join('');

  const xAxis = dates.map((date, i) => {
    if (i % labelEvery !== 0 && i !== dates.length - 1) return '';
    const label = fmtInt(totals[i]);
    const w = 14 + label.length * 7;
    return `
      <text class="ch-tick" x="${x(i)}" y="${H - m.bottom + 20}" text-anchor="middle">${dayLabel(date)}</text>
      <g class="ch-total"><rect x="${x(i) - w / 2}" y="${H - m.bottom + 30}" width="${w}" height="18" rx="5"></rect>
      <text x="${x(i)}" y="${H - m.bottom + 43}" text-anchor="middle">${label}</text></g>`;
  }).join('');

  const lines = series.map((s) => {
    const pts = s.values.map((v, i) => [x(i), y(v)]);
    const path = smoothPath(pts);
    const area = !multi && pts.length > 1
      ? `<path class="ch-area" d="${path} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z" style="fill:${s.color}"></path>`
      : '';
    const dots = pts.map(([px, py]) => `<circle class="ch-dot" cx="${px}" cy="${py}" r="4" style="fill:${s.color}"></circle>`).join('');
    return `${area}<path class="ch-line" d="${path}" style="stroke:${s.color}"></path>${dots}`;
  }).join('');

  const labels = endLabels
    ? series.map((s) => `<text class="ch-end" x="${x(dates.length - 1) + 10}" y="${y(s.values[s.values.length - 1]) + 4}">${escapeHtml(s.name)}</text>`).join('')
    : '';

  wrap.setAttribute('aria-label', `Daily completes from ${dates[0]} to ${dates[dates.length - 1]}. Use the left and right arrow keys to read each day.`);
  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-hidden="true">
      ${grid}
      <line class="ch-axis" x1="${m.left}" x2="${W - m.right}" y1="${y(0)}" y2="${y(0)}"></line>
      <text class="ch-tick" transform="translate(14 ${m.top + plotH / 2}) rotate(-90)" text-anchor="middle">Completes (C1)</text>
      ${xAxis}
      <line class="ch-cross" x1="0" x2="0" y1="${m.top}" y2="${y(0)}" visibility="hidden"></line>
      ${lines}
      ${labels}
      <rect class="ch-hit" x="${m.left}" y="${m.top}" width="${plotW}" height="${plotH}"></rect>
    </svg>
    <div class="chart-tooltip" aria-live="polite" hidden></div>`;

  legend.innerHTML = multi
    ? series.map((s) => `<span class="legend-item"><span class="legend-key" style="background:${s.color}"></span>${escapeHtml(s.name)}</span>`).join('')
    : '';

  const hit = $('.ch-hit', wrap);
  const cross = $('.ch-cross', wrap);
  const tip = $('.chart-tooltip', wrap);

  const show = (i) => {
    pv.chartIndex = i;
    cross.setAttribute('x1', x(i));
    cross.setAttribute('x2', x(i));
    cross.setAttribute('visibility', 'visible');
    tip.innerHTML = `
      <div class="tt-date">${dates[i]}</div>
      ${series.map((s) => `
        <div class="tt-row"><span class="tt-val">${fmtInt(s.values[i])}</span><span class="tt-key" style="background:${s.color}"></span><span class="tt-name">${escapeHtml(s.name)}</span></div>`).join('')}
      ${multi ? `<div class="tt-row tt-total"><span class="tt-val">${fmtInt(totals[i])}</span><span class="tt-name">Total</span></div>` : ''}`;
    tip.hidden = false;
    const topY = Math.min(...series.map((s) => y(s.values[i])));
    const left = Math.min(Math.max(x(i), tip.offsetWidth / 2 + 4), W - tip.offsetWidth / 2 - 4);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(topY - 12, tip.offsetHeight + 4)}px`;
  };
  const hide = () => {
    pv.chartIndex = -1;
    cross.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  };
  const nearest = (clientX) => {
    const px = clientX - hit.getBoundingClientRect().left + m.left;
    let best = 0;
    dates.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    return best;
  };

  hit.addEventListener('pointermove', (e) => show(nearest(e.clientX)));
  hit.addEventListener('pointerleave', hide);
  wrap.onblur = hide;
  wrap.onkeydown = (e) => {
    if (e.key === 'Escape') { hide(); return; }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const start = pv.chartIndex < 0 ? (dir > 0 ? -1 : dates.length) : pv.chartIndex;
    show(Math.max(0, Math.min(dates.length - 1, start + dir)));
  };
}

function addVendor() {
  const d = pv.project.detail;
  // Every vendor in the Vendors list (vendors.js) that isn't on this project yet.
  const available = vendorRegistry.map((v) => v.name).sort((a, b) => a.localeCompare(b))
    .filter((name) => !d.vendors.some((v) => v.name === name));
  if (!available.length) {
    showToast('All vendors are already on this project.', 'info');
    return;
  }
  openFormModal({
    title: 'Add vendor',
    subtitle: 'The vendor starts with no responses.',
    body: `
      <label class="form-label" for="mvVendor">Vendor</label>
      <select class="form-select" id="mvVendor" name="vendor" required>${optionsHtml(available.map((n) => [n, n]))}</select>
      <label class="form-label mt-3" for="mvStatus">Status</label>
      <select class="form-select" id="mvStatus" name="status">${optionsHtml([['active', 'active'], ['paused', 'paused']], 'active')}</select>`,
    submitLabel: '<i class="bi bi-plus-lg"></i> Add vendor',
    onSubmit: (form) => {
      const name = form.elements.vendor.value;
      const id = Math.max(0, ...d.vendors.map((v) => v.id)) + 1;
      d.vendors.push({
        id, name, status: form.elements.status.value,
        stats: emptyStats(),
        daily: d.days.map((date) => ({ date, ...emptyStats() })),
      });
      pv.rendered.delete('progress');
      renderPanel('vendors');
      showToast(`${name} added to the project.`);
    },
  });
}

function exportVendor(id) {
  const p = pv.project;
  const v = p.detail.vendors.find((x) => x.id === id);
  downloadCsv(`project-${p.jobNo}-${slugify(v.name)}-daily-${today()}.csv`, [
    ['Date', ...DAILY_COLS.map(([, label]) => label)],
    ...v.daily.map((r) => [r.date, ...DAILY_COLS.map(([key]) => r[key])]),
    ['Total', ...DAILY_COLS.map(([key]) => v.stats[key])],
  ]);
  showToast(`Exported daily data for ${v.name}.`);
}

function exportDaily() {
  const p = pv.project;
  const rows = dailyRows(p.detail);
  const vendor = p.detail.vendors.find((v) => String(v.id) === pv.vendorFilter);
  downloadCsv(`project-${p.jobNo}-${vendor ? slugify(vendor.name) : 'all-vendors'}-daily-${today()}.csv`, [
    ['Date', ...DAILY_COLS.map(([, label]) => label)],
    ...rows.map((r) => [r.date, ...DAILY_COLS.map(([key]) => r[key])]),
  ]);
  showToast('Daily progress exported.');
}

/* ---------- Progress tab ---------- */
function renderProgress(el) {
  const p = pv.project;
  const totals = projectStats(p);
  const tiles = [
    ['Completes (C1)', fmtInt(p.c1), p.cMonth ? `${fmtInt(p.cMonth)} this month` : 'None this month'],
    ['Incidence rate', `${p.ir}%`, ''],
    ['Conversion', `${p.conv}%`, ''],
    ['Length of interview', p.loiReal == null ? '—' : `${p.loiReal.toFixed(2)} min`, `Bid ${p.loiBid.toFixed(2)} min`],
    ['Last complete', p.lastCompleteAt ? relativeTime(p.lastCompleteAt) : '—', p.lastEntryAt ? `Last entry ${relativeTime(p.lastEntryAt)}` : 'No entries yet'],
  ];
  el.innerHTML = `
    <div class="sum-tiles">
      ${tiles.map(([label, value, sub]) => `
        <div class="sum-tile"><div class="sum-label">${label}</div><div class="sum-value">${value}</div>${sub ? `<div class="sum-sub">${sub}</div>` : ''}</div>`).join('')}
    </div>
    <section class="pv-card flush">
      <div class="pv-toolbar"><span class="pv-toolbar-title">Overall progress</span><span class="pv-toolbar-note">All sources combined</span></div>
      <div class="table-responsive">
        <table class="pv-table">
          <thead><tr><th>Vendor name</th>${thCells(VENDOR_COLS)}</tr></thead>
          <tbody><tr><td class="cell-name">Main Frame</td>${VENDOR_COLS.map(([key]) => numCell(totals[key], key === 'c1' ? 'col-hl' : '')).join('')}</tr></tbody>
        </table>
      </div>
    </section>`;
}

/* ---------- Campaigns tab ---------- */
function findCampaign(id, parentId) {
  const list = pv.project.detail.campaigns;
  if (parentId) return list.find((c) => c.id === Number(parentId))?.segments.find((s) => s.id === Number(id));
  return list.find((c) => c.id === Number(id));
}

function mailMenuHtml(c, parent) {
  const ref = `data-id="${c.id}"${parent ? ` data-parent="${parent.id}"` : ''}`;
  return `
    <div class="dropdown">
      <button type="button" class="icon-btn-sm mail-btn" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}'
              aria-expanded="false" aria-label="Email options for ${escapeHtml(c.name)}">
        <i class="bi bi-envelope"></i><i class="bi bi-chevron-down mail-caret"></i>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><button type="button" class="dropdown-item" data-action="camp-mail" data-kind="reminder" ${ref}><i class="bi bi-bell"></i> Send reminder</button></li>
        <li><button type="button" class="dropdown-item" data-action="camp-mail" data-kind="invite" ${ref}><i class="bi bi-send"></i> Invite more panelists</button></li>
      </ul>
    </div>`;
}

function campaignRowHtml(c, parent) {
  const s = c.stats;
  const isSub = Boolean(parent);
  const open = pv.expanded.has(c.id);
  const caret = !isSub && c.segments.length
    ? `<button type="button" class="camp-caret${open ? ' open' : ''}" data-action="camp-toggle" data-id="${c.id}"
               aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Show'} segments of ${escapeHtml(c.name)}"><i class="bi bi-caret-right-fill"></i></button>`
    : '<span class="camp-caret-spacer"></span>';
  const value = (key) => (key === 'rr' ? `<td>${s.inv ? Math.round(ratio(s.eb, s.inv)) : 0}%</td>` : numCell(s[key], key === 'c1' ? 'col-hl' : ''));
  return `
    <tr class="${isSub ? 'camp-sub' : ''}">
      <td><div class="camp-name">${isSub ? '' : caret}<span class="${isSub ? '' : 'cell-name'}">${escapeHtml(c.name)}</span></div></td>
      <td>${isSub ? '' : c.panel}</td>
      ${CAMPAIGN_COLS.map(([key]) => value(key)).join('')}
      <td>${statusSelectHtml('campaign', c.id, c.status, isSub ? ` data-parent="${parent.id}"` : '')}</td>
      <td class="t-muted">${fmtStamp(c.created)}</td>
      <td>
        <div class="row-actions">
          ${mailMenuHtml(c, parent)}
          ${isSub ? '' : `<button type="button" class="icon-btn-sm" data-action="camp-duplicate" data-id="${c.id}" title="Duplicate campaign" aria-label="Duplicate ${escapeHtml(c.name)}"><i class="bi bi-copy"></i></button>`}
        </div>
      </td>
    </tr>`;
}

function renderCampaigns(el) {
  const d = pv.project.detail;
  const live = pv.campStatus === 'Live';
  const desc = pv.campSort === 'desc';
  const list = d.campaigns
    .filter((c) => (c.status === 'closed') !== live)
    .filter((c) => !pv.campPanel || c.panel === pv.campPanel)
    .sort((a, b) => (desc ? b.created - a.created : a.created - b.created));
  const span = CAMPAIGN_COLS.length + 5;

  el.innerHTML = `
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-action="new-campaign"><i class="bi bi-plus-lg"></i> New campaign</button>
        <button type="button" class="icon-btn-sm" data-action="refresh" data-tab="campaigns" title="Refresh" aria-label="Refresh"><i class="bi bi-arrow-clockwise"></i></button>
        <div class="segmented seg-sm" role="group" aria-label="Campaign status">
          <button type="button" data-action="camp-status" data-value="Live" class="${live ? 'active' : ''}" aria-pressed="${live}">Live</button>
          <button type="button" data-action="camp-status" data-value="Closed" class="${live ? '' : 'active'}" aria-pressed="${!live}">Closed</button>
        </div>
        <select class="form-select form-select-sm pv-filter" data-change="camp-panel" aria-label="Filter on panel">
          <option value="">All panels</option>
          ${PANELS.map((x) => `<option value="${x.code}"${x.code === pv.campPanel ? ' selected' : ''}>${x.code} · ${escapeHtml(x.name)}</option>`).join('')}
        </select>
      </div>
      <div class="table-responsive">
        <table class="pv-table camp-table">
          <thead><tr>
            <th>Campaign</th><th>Panel</th>${thCells(CAMPAIGN_COLS)}<th>Status</th>
            <th aria-sort="${desc ? 'descending' : 'ascending'}">
              <button type="button" class="th-sort" data-action="camp-sort">Created <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button>
            </th>
            <th><span class="visually-hidden">Actions</span></th>
          </tr></thead>
          <tbody>
            ${list.length
              ? list.map((c) => campaignRowHtml(c) + (pv.expanded.has(c.id) ? c.segments.map((s) => campaignRowHtml(s, c)).join('') : '')).join('')
              : emptyRow(span, `No ${live ? 'live' : 'closed'} campaigns`, live ? 'Create a campaign to invite panelists.' : 'Closed campaigns show up here.')}
          </tbody>
        </table>
      </div>
    </section>`;
}

function newCampaign() {
  const d = pv.project.detail;
  const nextId = Math.max(0, ...d.campaigns.map((c) => c.id)) + 1;
  openFormModal({
    title: 'New campaign',
    subtitle: 'Invite panelists from one of your panels.',
    body: `
      <div class="row g-3">
        <div class="col-sm-7">
          <label class="form-label" for="mcName">Name</label>
          <input class="form-control" id="mcName" name="name" required maxlength="60" value="Campaign ${pad2(nextId)}">
          <div class="invalid-feedback">Enter a campaign name.</div>
        </div>
        <div class="col-sm-5">
          <label class="form-label" for="mcPanel">Panel</label>
          <select class="form-select" id="mcPanel" name="panel">${optionsHtml(PANELS.map((x) => [x.code, `${x.code} · ${x.name}`]))}</select>
        </div>
        <div class="col-sm-5">
          <label class="form-label" for="mcInv">Invitations</label>
          <input class="form-control" id="mcInv" name="inv" type="number" min="1" max="100000" required value="300">
          <div class="invalid-feedback">Enter 1–100,000 invitations.</div>
        </div>
        <div class="col-12">
          <label class="form-label" for="mcSegments">Segments <span class="text-muted-2">(optional)</span></label>
          <textarea class="form-control" id="mcSegments" name="segments" rows="2" placeholder="One per line, e.g. Female, 25-65"></textarea>
          <div class="field-help">Invitations are split evenly across segments.</div>
        </div>
      </div>`,
    submitLabel: '<i class="bi bi-plus-lg"></i> Create campaign',
    onSubmit: (form) => {
      const inv = Number(form.elements.inv.value);
      const names = form.elements.segments.value.split('\n').map((s) => s.trim()).filter(Boolean);
      const zero = () => Object.fromEntries(CAMPAIGN_KEYS.map((k) => [k, 0]));
      const created = Date.now();
      const split = splitInt(inv, names.map(() => 1));
      d.campaigns.push({
        id: nextId,
        name: form.elements.name.value.trim(),
        panel: form.elements.panel.value,
        status: 'active',
        created,
        stats: { ...zero(), inv },
        segments: names.map((name, i) => ({ id: i + 1, name, status: 'active', created, stats: { ...zero(), inv: split[i] } })),
      });
      pv.campStatus = 'Live';
      renderPanel('campaigns');
      showToast(`${form.elements.name.value.trim()} created.`);
    },
  });
}

/* ---------- File uploads (Unique codes, Custom link, Exclude IPs) ---------- */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const HEADER_RE = /^(unique[\s_-]*)?codes?$|^(custom[\s_-]*)?links?$|^urls?$|^ip(s|[\s_-]*address(es)?)?$|^resp(ondent)?[\s_-]*ids?$/i;
let xlsxLoading = null;

// The spreadsheet reader is only needed for .xlsx files, so it loads the first time one is uploaded.
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  xlsxLoading = xlsxLoading || new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = XLSX_URL;
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => {
      xlsxLoading = null;
      script.remove();
      reject(new Error("Couldn't load the spreadsheet reader. Check your connection and try again."));
    };
    document.head.append(script);
  });
  return xlsxLoading;
}

function firstCsvField(line) {
  const s = line.trim();
  if (!s) return '';
  if (s[0] !== '"') return s.split(/[,;\t]/)[0].trim();
  let out = '';
  for (let i = 1; i < s.length; i++) {
    if (s[i] === '"') {
      if (s[i + 1] !== '"') break; // closing quote
      i += 1; // "" is an escaped quote
    }
    out += s[i];
  }
  return out.trim();
}

// First non-empty value of every row in a CSV or Excel file; a header row is dropped.
async function readFileValues(file) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That file is larger than 5 MB.');
  let values;
  if (/\.xlsx?$/i.test(file.name)) {
    const XLSX = await loadXlsx();
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, blankrows: false });
    values = rows.map((row) => String(row.find((c) => c != null && String(c).trim() !== '') ?? '').trim());
  } else {
    values = (await file.text()).replace(/^﻿/, '').split(/\r?\n/).map(firstCsvField);
  }
  values = values.filter(Boolean);
  if (values.length && HEADER_RE.test(values[0])) values.shift();
  return values;
}

async function withBusyButton(form, task) {
  const btn = form.querySelector('[type="submit"]');
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Working…';
  try {
    await task();
  } catch (err) {
    showToast(err.message || 'Something went wrong reading that file.', 'info');
  } finally {
    btn.disabled = false;
    btn.innerHTML = label;
  }
}

const listNotes = (dupes, invalid) => [
  dupes && `${plural(dupes, 'duplicate')} skipped`,
  invalid && `${fmtInt(invalid)} not valid`,
].filter(Boolean).join(', ');

/* ---------- Unique codes & Custom link tabs ---------- */
const POOL_CFG = {
  codes: {
    noun: 'code', nouns: 'codes', column: 'Code', slug: 'unique-codes',
    variable: '{UNIQUE_CODES}', variableFor: 'the unique codes', showPct: true,
    accept: '.csv,text/csv', fileHelp: 'Select a CSV file to upload, one code per row.',
    valid: (v) => /^[\w-]{3,64}$/.test(v),
  },
  links: {
    noun: 'link', nouns: 'links', column: 'Link', slug: 'custom-links',
    variable: '{CUSTOM_LINK}', variableFor: 'the custom link', showPct: false,
    accept: '.csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    fileHelp: 'Select a CSV or XLSX file to upload, one link per row.',
    valid: (v) => /^https?:\/\/\S+$/i.test(v),
  },
};

function renderPool(el, kind) {
  const cfg = POOL_CFG[kind];
  const items = pv.project.detail[kind];
  const used = items.filter((i) => i.usedAt).length;
  const pct = items.length ? Math.round(ratio(used, items.length)) : 0;
  el.innerHTML = `
    <div class="pv-callout">
      <i class="bi bi-info-circle-fill"></i>
      <span>Variable to use for ${cfg.variableFor}: <strong class="mono">${cfg.variable}</strong></span>
      <button type="button" class="btn btn-ghost btn-xs ms-auto" data-action="copy-var" data-value="${cfg.variable}"><i class="bi bi-clipboard"></i> Copy</button>
    </div>
    <div class="sum-tiles">
      <div class="sum-tile"><div class="sum-label">Total</div><div class="sum-value">${fmtInt(items.length)}</div></div>
      <div class="sum-tile">
        <div class="sum-label">Used</div>
        <div class="sum-value">${fmtInt(used)}${cfg.showPct ? `<span class="sum-pct">${pct}%</span>` : ''}</div>
      </div>
      <div class="sum-tile"><div class="sum-label">Left</div><div class="sum-value">${fmtInt(items.length - used)}</div></div>
    </div>
    <section class="pv-card">
      <form data-form="pool-upload" data-kind="${kind}" novalidate>
        <label class="form-label" for="file-${kind}">Upload ${cfg.nouns}</label>
        <div class="upload-row">
          <input class="form-control" type="file" id="file-${kind}" name="file" accept="${cfg.accept}">
          <button type="submit" class="btn btn-primary-grad"><i class="bi bi-upload"></i> Upload</button>
        </div>
        <div class="field-help">${cfg.fileHelp} Duplicates are skipped.</div>
      </form>
      ${items.length ? `
        <div class="upload-foot">
          <span>Download every ${cfg.noun} with its status and the respondent who used it.</span>
          <button type="button" class="btn btn-ghost btn-sm-h" data-action="pool-export" data-kind="${kind}"><i class="bi bi-download"></i> Download list</button>
        </div>` : ''}
    </section>`;
}

function addToPool(kind, values) {
  const cfg = POOL_CFG[kind];
  const items = pv.project.detail[kind];
  const existing = new Set(items.map((i) => i.value));
  const result = { added: 0, dupes: 0, invalid: 0 };
  values.forEach((value) => {
    if (!cfg.valid(value)) result.invalid += 1;
    else if (existing.has(value)) result.dupes += 1;
    else {
      existing.add(value);
      items.push({ value, mrid: null, usedAt: null });
      result.added += 1;
    }
  });
  return result;
}

async function uploadPool(form) {
  const kind = form.dataset.kind;
  const cfg = POOL_CFG[kind];
  const file = form.elements.file.files[0];
  if (!file) {
    showToast('Choose a file first.', 'info');
    return;
  }
  await withBusyButton(form, async () => {
    const { added, dupes, invalid } = addToPool(kind, await readFileValues(file));
    if (!added && !dupes && !invalid) {
      showToast(`No ${cfg.nouns} found in ${file.name}.`, 'info');
      return;
    }
    renderPanel(kind);
    const notes = listNotes(dupes, invalid);
    showToast(`Uploaded ${plural(added, cfg.noun, cfg.nouns)} from ${file.name}.${notes ? ` (${notes})` : ''}`, added ? 'success' : 'info');
  });
}

function exportPool(kind) {
  const p = pv.project;
  const cfg = POOL_CFG[kind];
  const items = p.detail[kind];
  downloadCsv(`project-${p.jobNo}-${cfg.slug}-${today()}.csv`, [
    [cfg.column, 'Status', 'MRID', 'Used at'],
    ...items.map((i) => [i.value, i.usedAt ? 'Used' : 'Available', i.mrid || '', i.usedAt ? new Date(i.usedAt).toISOString() : '']),
  ]);
  showToast(`Downloaded ${plural(items.length, cfg.noun, cfg.nouns)}.`);
}

/* ---------- Exclude IPs tab ---------- */
// Edits go into a draft list and only apply to the project on Save.
const IPV4 = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\/(3[0-2]|[12]?\d))?$/;
function isValidIp(value) {
  if (IPV4.test(value)) return true;
  const [addr, mask, ...rest] = value.split('/');
  if (rest.length || !addr.includes(':') || !/^[0-9a-f:]+$/i.test(addr)) return false;
  if ((addr.match(/::/g) || []).length > 1 || addr.split(':').length > 8) return false;
  return mask === undefined || (/^\d{1,3}$/.test(mask) && Number(mask) <= 128);
}

function ipsDirty() {
  const saved = pv.project.detail.ips.map((x) => x.ip).join('\n');
  return pv.ipDraft.map((x) => x.ip).join('\n') !== saved;
}

function addIps(values) {
  const known = new Set(pv.ipDraft.map((x) => x.ip));
  const result = { added: 0, dupes: 0, invalid: [] };
  values.forEach((raw) => {
    const ip = raw.trim();
    if (!isValidIp(ip)) result.invalid.push(ip);
    else if (known.has(ip)) result.dupes += 1;
    else {
      known.add(ip);
      pv.ipDraft.unshift({ ip, addedAt: Date.now() });
      result.added += 1;
    }
  });
  return result;
}

function renderIps(el) {
  if (!pv.ipDraft) pv.ipDraft = pv.project.detail.ips.map((x) => ({ ...x }));
  const list = pv.ipDraft;
  const dirty = ipsDirty();
  if (dirty) pv.unsaved.add('ips');
  else pv.unsaved.delete('ips');

  el.innerHTML = `
    <section class="pv-card ips-card">
      <form data-form="ips-file" novalidate>
        <label class="form-label" for="ipFile">Import from a file</label>
        <div class="upload-row">
          <input class="form-control" type="file" id="ipFile" name="file" accept=".csv,text/csv">
          <button type="submit" class="btn btn-ghost">Process</button>
        </div>
        <div class="field-help">Select a CSV file to process, one IP address or range per row.</div>
      </form>

      <form class="ips-add" data-form="ips-add" novalidate>
        <label class="form-label" for="ipInput">Add an address</label>
        <div class="input-group">
          <input class="form-control mono" id="ipInput" name="ip" placeholder="IPv4 or IPv6 address" autocomplete="off" spellcheck="false">
          <button class="btn btn-ghost" type="submit" title="Add address" aria-label="Add address"><i class="bi bi-plus-circle"></i></button>
        </div>
        <div class="field-help">Ranges in CIDR form, such as 198.51.100.0/24, work too.</div>
      </form>

      <div class="ips-table">
        <table class="pv-table">
          <thead><tr><th>IPs</th><th><span class="visually-hidden">Remove</span></th></tr></thead>
          <tbody>
            ${list.length ? list.map((x, i) => `
              <tr>
                <td class="mono">${escapeHtml(x.ip)}${x.ip.includes('/') ? ' <span class="pill pill-muted">range</span>' : ''}</td>
                <td><button type="button" class="icon-btn-sm danger" data-action="ips-remove" data-index="${i}" aria-label="Remove ${escapeHtml(x.ip)}"><i class="bi bi-trash3"></i></button></td>
              </tr>`).join('') : emptyRow(2, 'No excluded IPs', 'Add addresses above or import a CSV file.')}
          </tbody>
        </table>
      </div>

      <div class="pv-form-actions">
        <button type="button" class="btn btn-primary-grad" data-action="ips-save" ${dirty ? '' : 'disabled'}><i class="bi bi-check2"></i> Save</button>
        ${dirty ? `
          <button type="button" class="btn btn-ghost" data-action="ips-discard">Discard changes</button>
          <span class="dirty-flag"><i class="bi bi-circle-fill"></i> Unsaved changes</span>` : ''}
        <span class="pv-toolbar-note ms-auto">${plural(list.length, 'address', 'addresses')} excluded</span>
      </div>
    </section>`;
}

async function processIpFile(form) {
  const file = form.elements.file.files[0];
  if (!file) {
    showToast('Choose a CSV file first.', 'info');
    return;
  }
  await withBusyButton(form, async () => {
    const { added, dupes, invalid } = addIps(await readFileValues(file));
    renderPanel('ips');
    const notes = listNotes(dupes, invalid.length);
    showToast(`Added ${plural(added, 'address', 'addresses')} from ${file.name}.${notes ? ` (${notes})` : ''}${added ? ' Save to apply.' : ''}`, added ? 'success' : 'info');
  });
}

function addOneIp(form) {
  const input = form.elements.ip;
  const ip = input.value.trim();
  if (!ip) {
    input.focus();
    return;
  }
  const { dupes, invalid } = addIps([ip]);
  if (invalid.length) {
    input.classList.add('is-invalid');
    input.focus();
    showToast(`${ip} isn't a valid IPv4 or IPv6 address.`, 'info');
    return;
  }
  if (dupes) {
    input.select();
    showToast(`${ip} is already on the list.`, 'info');
    return;
  }
  renderPanel('ips');
  $('#ipInput').focus();
}

/* ---------- Screener & Post Poll tabs ---------- */
// Each question is its own form: edits stay in the card until its Save button is pressed.
const QUESTION_KINDS = {
  screener: {
    get library() { return SCREENER_LIBRARY; }, // library.js
    statusKey: 'screenerActive', statusLabel: 'Screener status',
    exportLabel: 'Export screener data', slug: 'screener', actions: true,
  },
  poll: {
    library: POLL_LIBRARY, statusKey: 'pollActive', statusLabel: 'Post poll status',
    exportLabel: 'Export poll data', slug: 'post-poll', actions: false,
  },
};

function renderQuestions(el, kind) {
  const cfg = QUESTION_KINDS[kind];
  const d = pv.project.detail;
  const on = d[cfg.statusKey];
  el.innerHTML = `
    <section class="pv-card">
      <div class="q-settings">
        <div class="q-setting">
          <span class="form-label" id="lbl-${kind}-status">${cfg.statusLabel}</span>
          <div class="segmented seg-field" role="group" aria-labelledby="lbl-${kind}-status">
            <button type="button" data-action="q-status" data-kind="${kind}" data-value="1" class="${on ? 'active' : ''}" aria-pressed="${on}">Active</button>
            <button type="button" data-action="q-status" data-kind="${kind}" data-value="0" class="${on ? '' : 'active'}" aria-pressed="${!on}">Inactive</button>
          </div>
        </div>
        ${kind === 'poll' ? `
          <div class="q-setting q-setting-grow">
            <label class="form-label" for="pollStatuses">Show to statuses</label>
            <div id="pollStatusSelect"></div>
          </div>` : ''}
        <button type="button" class="btn btn-ghost btn-sm-h q-export" data-action="q-export" data-kind="${kind}"><i class="bi bi-download"></i> ${cfg.exportLabel}</button>
      </div>
      <div class="q-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-action="q-new" data-kind="${kind}"><i class="bi bi-plus-circle"></i> Add question</button>
        <button type="button" class="btn btn-ghost btn-sm-h" data-action="q-library" data-kind="${kind}"><i class="bi bi-plus-circle"></i> Add Library question</button>
      </div>
    </section>
    <div class="q-cards" id="qCards-${kind}">
      ${d[kind].map((q, i) => questionCardHtml(kind, q, i)).join('')}
    </div>
    <div class="pv-card pv-empty-block" id="qEmpty-${kind}" ${d[kind].length ? 'hidden' : ''}>
      <i class="bi bi-ui-checks"></i>
      <div class="empty-title">No questions yet</div>
      <div class="empty-text">Add a question, or pick one from the library.</div>
    </div>`;

  if (kind === 'poll') {
    createMultiSelect($('#pollStatusSelect', el), {
      id: 'pollStatuses',
      options: POLL_STATUSES.map(([value, label]) => ({ value, label })),
      selected: d.pollStatuses,
      placeholder: 'Select…',
      onChange: (value) => { d.pollStatuses = value; },
    });
  }
}

function questionCardHtml(kind, q, index) {
  const cfg = QUESTION_KINDS[kind];
  const legend = cfg.actions
    ? '<span class="count-badge c-chose">Chose</span><span class="count-badge c-done">Completed</span><span class="count-badge c-out">Screened out</span>'
    : '<span class="count-badge c-chose">Responses</span>';
  return `
    <form class="pv-card q-card" data-form="q-save" data-kind="${kind}" data-id="${q.id}" novalidate>
      <div class="q-row">
        <span class="q-num">${index + 1}</span>
        <label class="q-label" for="qt-${kind}-${q.id}">Question text</label>
        <input class="form-control q-text-input" id="qt-${kind}-${q.id}" name="text" required maxlength="300"
               value="${escapeHtml(q.text)}" placeholder="Type the question">
        <select class="form-select q-type-select" name="type" aria-label="Question type">${optionsHtml(QUESTION_TYPES.map((t) => [t, t]), q.type)}</select>
        <button type="button" class="icon-btn-sm danger" data-action="q-delete" data-kind="${kind}" data-id="${q.id}"
                title="Delete question" aria-label="Delete question ${index + 1}"><i class="bi bi-trash3"></i></button>
      </div>
      <div class="q-save-row">
        <button type="submit" class="btn btn-primary-grad btn-sm-h"><i class="bi bi-check2"></i> Save</button>
        <button type="button" class="btn btn-ghost btn-sm-h q-cancel" data-action="q-cancel" data-kind="${kind}" data-id="${q.id}" ${q.isNew ? '' : 'hidden'}>Cancel</button>
        <span class="dirty-flag q-dirty" ${q.isNew ? '' : 'hidden'}><i class="bi bi-circle-fill"></i> ${q.isNew ? 'Not saved yet' : 'Unsaved changes'}</span>
      </div>
      <div class="ans-block" ${TYPES_WITHOUT_ANSWERS.has(q.type) ? 'hidden' : ''}>
        <div class="ans-toolbar">
          <button type="button" class="btn btn-ghost btn-xs" data-action="ans-add"><i class="bi bi-plus-circle"></i> Add answer</button>
          <span class="ans-legend" aria-hidden="true">${legend}</span>
          <button type="button" class="icon-btn-sm ms-auto" data-action="ans-refresh" title="Refresh counts" aria-label="Refresh counts"><i class="bi bi-arrow-clockwise"></i></button>
        </div>
        <div class="ans-list">${q.answers.map((a) => answerRowHtml(kind, a)).join('')}</div>
      </div>
    </form>`;
}

function answerRowHtml(kind, a) {
  const withActions = QUESTION_KINDS[kind].actions;
  const c = a.counts || [0, 0, 0];
  return `
    <div class="ans-row" data-aid="${a.id ?? ''}">
      <input class="form-control ans-text" name="answer" value="${escapeHtml(a.text)}" maxlength="200" placeholder="Answer text" aria-label="Answer text">
      ${withActions ? `
        <div class="segmented seg-xs ans-actions" role="radiogroup" aria-label="Action for this answer">
          ${ANSWER_ACTIONS.map(([value, label]) => `
            <button type="button" role="radio" data-action="ans-action" data-value="${value}"
                    class="${a.action === value ? 'active' : ''}" aria-checked="${a.action === value}">${label}</button>`).join('')}
        </div>` : ''}
      <div class="ans-counts">
        ${withActions
          ? `<span class="count-badge c-chose" title="Chose this answer">${fmtInt(c[0])}</span>
             <span class="count-badge c-done" title="Went on to complete">${fmtInt(c[1])}</span>
             <span class="count-badge c-out" title="Screened out on this answer">${fmtInt(c[2])}</span>`
          : `<span class="count-badge c-chose" title="Responses">${fmtInt(c[0])}</span>`}
      </div>
      <button type="button" class="icon-btn-sm danger" data-action="ans-remove" aria-label="Remove answer"><i class="bi bi-trash3"></i></button>
    </div>`;
}

const findQuestion = (kind, id) => pv.project.detail[kind].find((q) => q.id === Number(id));

function markCardDirty(card) {
  if (!card.classList.contains('is-dirty')) {
    card.classList.add('is-dirty');
    $('.q-dirty', card).hidden = false;
    $('.q-cancel', card).hidden = false;
  }
  pv.unsaved.add(card.dataset.kind);
}

function syncQuestionsUnsaved(kind) {
  if ($$(`#qCards-${kind} .q-card.is-dirty`).length) pv.unsaved.add(kind);
  else pv.unsaved.delete(kind);
}

function refreshQuestionList(kind) {
  const cards = $$(`#qCards-${kind} .q-card`);
  cards.forEach((card, i) => {
    $('.q-num', card).textContent = i + 1;
    $('[data-action="q-delete"]', card).setAttribute('aria-label', `Delete question ${i + 1}`);
  });
  $(`#qEmpty-${kind}`).hidden = cards.length > 0;
  syncQuestionsUnsaved(kind);
}

function replaceQuestionCard(kind, q) {
  const card = $(`#qCards-${kind} .q-card[data-id="${q.id}"]`);
  card.outerHTML = questionCardHtml(kind, q, pv.project.detail[kind].indexOf(q));
}

function appendQuestionCard(kind, q) {
  $(`#qCards-${kind}`).insertAdjacentHTML('beforeend', questionCardHtml(kind, q, pv.project.detail[kind].length - 1));
  refreshQuestionList(kind);
  const card = $(`#qCards-${kind} .q-card[data-id="${q.id}"]`);
  card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  return card;
}

function saveQuestion(form) {
  const kind = form.dataset.kind;
  const q = findQuestion(kind, form.dataset.id);
  const text = form.elements.text.value.trim();
  const type = form.elements.type.value;
  form.classList.add('was-validated');
  if (!text) {
    form.elements.text.focus();
    showToast('Enter the question text first.', 'info');
    return;
  }
  const rows = $$('.ans-row', form)
    .map((row) => ({ row, text: $('.ans-text', row).value.trim() }))
    .filter((x) => x.text);
  if (!TYPES_WITHOUT_ANSWERS.has(type) && !rows.length) {
    showToast('Add at least one answer.', 'info');
    return;
  }
  const withActions = QUESTION_KINDS[kind].actions;
  let nextId = Math.max(0, ...q.answers.map((a) => a.id)) + 1;
  const answers = rows.map(({ row, text: answerText }) => {
    const existing = q.answers.find((a) => String(a.id) === row.dataset.aid);
    return {
      id: existing ? existing.id : nextId++,
      text: answerText,
      action: withActions ? ($('.ans-actions .active', row)?.dataset.value || 'none') : 'none',
      counts: existing ? existing.counts : (withActions ? [0, 0, 0] : [0]),
    };
  });
  Object.assign(q, { text, type, answers });
  delete q.isNew;
  replaceQuestionCard(kind, q);
  syncQuestionsUnsaved(kind);
  showToast('Question saved.');
}

function removeQuestion(kind, q) {
  const list = pv.project.detail[kind];
  list.splice(list.indexOf(q), 1);
  $(`#qCards-${kind} .q-card[data-id="${q.id}"]`).remove();
  refreshQuestionList(kind);
}

function addLibraryQuestion(kind) {
  const cfg = QUESTION_KINDS[kind];
  const list = pv.project.detail[kind];
  const country = pv.project.country;
  // Screener questions come from the Screener Library for the project's country.
  const pool = kind === 'screener' ? cfg.library.filter((lib) => lib.country === country.code.toUpperCase()) : cfg.library;
  const available = pool.filter((lib) => !list.some((q) => q.libId === lib.id));
  if (!available.length) {
    showToast(kind === 'screener' && !pool.length
      ? `The Screener Library has no questions for ${country.name} yet.`
      : 'Every library question is already on this project.', 'info');
    return;
  }
  openFormModal({
    title: 'Add Library question',
    subtitle: kind === 'screener'
      ? `From the Screener Library for ${country.name}, with its answers and actions.`
      : 'A ready-made post poll question with its answers.',
    body: `
      <label class="form-label" for="mqLibrary">Question</label>
      <select class="form-select" id="mqLibrary" name="question" required>${optionsHtml(available.map((lib) => [lib.id, lib.name || lib.text]))}</select>`,
    submitLabel: '<i class="bi bi-plus-lg"></i> Add question',
    onSubmit: (form) => {
      const lib = cfg.library.find((x) => String(x.id) === form.elements.question.value);
      const q = questionFromLibrary(lib, Math.max(0, ...list.map((x) => x.id)) + 1);
      if (!cfg.actions) q.answers.forEach((a) => { a.counts = [0]; });
      list.push(q);
      appendQuestionCard(kind, q);
      showToast('Library question added.');
    },
  });
}

// Spreadsheet rows for a project's screener or post poll (used by the Exports page).
function questionExportRows(p, kind) {
  const d = ensureDetail(p);
  const cfg = QUESTION_KINDS[kind];
  const saved = d[kind].filter((q) => !q.isNew);
  const head = [
    [cfg.statusLabel, d[cfg.statusKey] ? 'Active' : 'Inactive'],
    ...(kind === 'poll' ? [['Show to statuses', d.pollStatuses.map((s) => POLL_STATUSES.find(([v]) => v === s)?.[1] ?? s).join(', ')]] : []),
    [],
  ];
  const rows = saved.flatMap((q, i) => {
    const answers = TYPES_WITHOUT_ANSWERS.has(q.type) || !q.answers.length ? [null] : q.answers;
    return answers.map((a) => (cfg.actions
      ? [i + 1, q.text, q.type, a?.text ?? '', a ? ANSWER_ACTIONS.find(([v]) => v === a.action)[1] : '', a?.counts[0] ?? '', a?.counts[1] ?? '', a?.counts[2] ?? '']
      : [i + 1, q.text, q.type, a?.text ?? '', a?.counts[0] ?? '']));
  });
  return [
    ['Project', `#${p.jobNo} ${p.name}`],
    ...head,
    cfg.actions
      ? ['#', 'Question', 'Type', 'Answer', 'Action', 'Chose', 'Completed', 'Screened out']
      : ['#', 'Question', 'Type', 'Answer', 'Responses'],
    ...rows,
  ];
}

// Destructive buttons ask once: the first click arms them, a second click within 3 s confirms.
function confirmClick(el, label = 'Delete?') {
  if (el.dataset.armed) return true;
  const original = el.innerHTML;
  el.dataset.armed = '1';
  el.classList.add('is-armed');
  el.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${label}`;
  setTimeout(() => {
    if (!el.isConnected) return;
    delete el.dataset.armed;
    el.classList.remove('is-armed');
    el.innerHTML = original;
  }, 3000);
  return false;
}

/* ---------- Multi-select (PM, Survey group) ---------- */
function createMultiSelect(root, { id, options, selected = [], placeholder = '', describedBy = '', onChange = () => {} }) {
  let value = selected.filter((v) => options.some((o) => o.value === v));
  let open = false;
  let active = -1;
  let filtered = [];

  root.className = 'ms';
  root.innerHTML = `
    <div class="ms-control">
      <span class="ms-chips"></span>
      <input type="text" class="ms-input" id="${id}" role="combobox" aria-expanded="false" aria-autocomplete="list"
             aria-controls="${id}-list" autocomplete="off" spellcheck="false">
    </div>
    <button type="button" class="ms-clear" aria-label="Clear all" hidden><i class="bi bi-x-lg"></i></button>
    <i class="bi bi-chevron-down ms-caret" aria-hidden="true"></i>
    <ul class="ms-menu" id="${id}-list" role="listbox" aria-multiselectable="true" hidden></ul>`;

  const chips = $('.ms-chips', root);
  const input = $('.ms-input', root);
  const menu = $('.ms-menu', root);
  const clear = $('.ms-clear', root);
  const labelOf = (v) => options.find((o) => o.value === v)?.label ?? v;
  if (describedBy) input.setAttribute('aria-describedby', describedBy);

  function renderChips() {
    chips.innerHTML = value.map((v) => `
      <span class="ms-chip">${escapeHtml(labelOf(v))}<button type="button" data-remove="${escapeHtml(v)}" aria-label="Remove ${escapeHtml(labelOf(v))}"><i class="bi bi-x"></i></button></span>`).join('');
    input.placeholder = value.length ? '' : placeholder;
    clear.hidden = !value.length;
  }

  function renderMenu() {
    const q = input.value.trim().toLowerCase();
    filtered = options.filter((o) => !value.includes(o.value) && o.label.toLowerCase().includes(q)).slice(0, 60);
    active = Math.min(active, filtered.length - 1);
    menu.innerHTML = filtered.length
      ? filtered.map((o, i) => `<li role="option" id="${id}-opt-${i}" data-value="${escapeHtml(o.value)}" class="${i === active ? 'active' : ''}" aria-selected="false">${escapeHtml(o.label)}</li>`).join('')
      : `<li class="ms-empty">${q ? 'No matches' : 'Nothing left to add'}</li>`;
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', `${id}-opt-${active}`);
      $(`#${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function setOpen(next) {
    open = next;
    menu.hidden = !open;
    root.classList.toggle('open', open);
    input.setAttribute('aria-expanded', String(open));
    if (open) renderMenu();
  }

  function commit(next) {
    value = next;
    renderChips();
    onChange([...value]);
    if (open) renderMenu();
  }

  // Keep focus in the input while clicking chips, options or the clear button.
  root.addEventListener('mousedown', (e) => {
    if (e.target !== input && e.target.closest('.ms-control, .ms-menu, .ms-clear, .ms-caret')) e.preventDefault();
  });
  root.addEventListener('click', (e) => {
    const option = e.target.closest('.ms-menu li[data-value]');
    const remove = e.target.closest('[data-remove]');
    if (option) {
      input.value = '';
      commit([...value, option.dataset.value]);
    } else if (remove) {
      commit(value.filter((v) => v !== remove.dataset.remove));
    } else if (e.target.closest('.ms-clear')) {
      commit([]);
    }
    input.focus();
    if (!open) setOpen(true);
  });
  input.addEventListener('focus', () => setOpen(true));
  input.addEventListener('blur', () => setOpen(false));
  input.addEventListener('input', () => { active = 0; if (open) renderMenu(); else setOpen(true); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      const n = filtered.length;
      if (n) active = (active + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      renderMenu();
    } else if (e.key === 'Enter') {
      e.preventDefault(); // never submit the surrounding form from here
      if (open && filtered[active]) {
        input.value = '';
        commit([...value, filtered[active].value]);
      }
    } else if (e.key === 'Backspace' && !input.value && value.length) {
      commit(value.slice(0, -1));
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  });

  renderChips();
  return {
    getValue: () => [...value],
    setInvalid: (invalid) => root.classList.toggle('is-invalid', invalid),
  };
}

/* ---------- Form modal ---------- */
let modalSubmit = null;
// Without a submitLabel the modal is read-only: no submit button, and Cancel reads "Close".
function openFormModal({ title, subtitle = '', body, submitLabel, onSubmit, wide = false }) {
  $('#pvModalTitle').textContent = title;
  $('#pvModalSub').textContent = subtitle;
  $('#pvModalBody').innerHTML = body;
  $('#pvModalBody').onclick = null; // callers that need clicks inside the body set this after opening
  $('#pvModalSubmit').innerHTML = submitLabel || '';
  $('#pvModalSubmit').hidden = !submitLabel;
  $('#pvModalCancel').textContent = submitLabel ? 'Cancel' : 'Close';
  $('#pvModal .modal-dialog').classList.toggle('modal-lg', wide);
  $('#pvModalForm').classList.remove('was-validated');
  modalSubmit = onSubmit;
  bootstrap.Modal.getOrCreateInstance('#pvModal').show();
}

/* ---------- Events ---------- */
const ACTIONS = {
  toggle(el) {
    $$('button', el.closest('[data-field]')).forEach((b) => {
      b.classList.toggle('active', b === el);
      b.setAttribute('aria-pressed', String(b === el));
    });
    markDirty();
  },
  'cancel-main'() {
    pv.dirty = false;
    if (pv.creating) location.hash = '#/';
    else renderPanel('main');
  },
  'export-main': exportMain,
  'insert-var'(el) {
    const input = $('#mfLink');
    const start = input.selectionStart ?? input.value.length;
    input.setRangeText(el.dataset.value, start, input.selectionEnd ?? start, 'end');
    input.focus();
    markDirty();
  },
  'copy-link'() { copyText($('#mfLink').value.trim(), 'Live link copied.'); },
  'copy-var'(el) { copyText(el.dataset.value, `${el.dataset.value} copied.`); },
  'add-vendor': addVendor,
  refresh(el) {
    renderPanel(el.dataset.tab);
    showToast('Numbers are up to date.', 'info');
  },
  'export-vendor'(el) { exportVendor(Number(el.dataset.id)); },
  'ec-toggle'(el) {
    pv.ecOnly = el.dataset.value === 'ec';
    $$('#projectView .ec-toggle button').forEach((b) => {
      const on = (b.dataset.value === 'ec') === pv.ecOnly;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  },
  'vendor-view'(el) {
    pv.vendorView = el.dataset.value;
    renderPanel('vendors');
  },
  'export-daily': exportDaily,
  'new-campaign': newCampaign,
  'camp-status'(el) {
    pv.campStatus = el.dataset.value;
    renderPanel('campaigns');
  },
  'camp-sort'() {
    pv.campSort = pv.campSort === 'desc' ? 'asc' : 'desc';
    renderPanel('campaigns');
  },
  'camp-toggle'(el) {
    const id = Number(el.dataset.id);
    if (pv.expanded.has(id)) pv.expanded.delete(id);
    else pv.expanded.add(id);
    renderPanel('campaigns');
  },
  'camp-mail'(el) {
    const c = findCampaign(el.dataset.id, el.dataset.parent);
    const waiting = Math.max(0, c.stats.inv - c.stats.eb);
    showToast(el.dataset.kind === 'reminder'
      ? `Reminder queued for ${plural(waiting, 'panelist')} who haven't started ${c.name}.`
      : `A new invitation batch for ${c.name} is queued.`);
  },
  'camp-duplicate'(el) {
    const d = pv.project.detail;
    const src = findCampaign(el.dataset.id);
    const id = Math.max(0, ...d.campaigns.map((c) => c.id)) + 1;
    const zero = (stats) => ({ ...Object.fromEntries(CAMPAIGN_KEYS.map((k) => [k, 0])), inv: stats.inv });
    const created = Date.now();
    d.campaigns.push({
      id, name: `Campaign ${pad2(id)}`, panel: src.panel, status: 'active', created, stats: zero(src.stats),
      segments: src.segments.map((s) => ({ ...s, status: 'active', created, stats: zero(s.stats) })),
    });
    pv.campStatus = 'Live';
    renderPanel('campaigns');
    showToast(`${src.name} duplicated as Campaign ${pad2(id)}.`);
  },

  // Unique codes / Custom link
  'pool-export'(el) { exportPool(el.dataset.kind); },

  // Exclude IPs (draft until Save)
  'ips-remove'(el) {
    pv.ipDraft.splice(Number(el.dataset.index), 1);
    renderPanel('ips');
  },
  'ips-save'() {
    pv.project.detail.ips = pv.ipDraft.map((x) => ({ ...x }));
    renderPanel('ips');
    showToast(`Exclusion list saved (${plural(pv.ipDraft.length, 'address', 'addresses')}).`);
  },
  'ips-discard'() {
    pv.ipDraft = null;
    renderPanel('ips');
    showToast('Changes discarded.', 'info');
  },

  // Screener / Post poll
  'q-status'(el) {
    const { kind } = el.dataset;
    const cfg = QUESTION_KINDS[kind];
    const on = el.dataset.value === '1';
    pv.project.detail[cfg.statusKey] = on;
    $$('button', el.parentElement).forEach((b) => {
      b.classList.toggle('active', b === el);
      b.setAttribute('aria-pressed', String(b === el));
    });
    showToast(`${kind === 'screener' ? 'Screener' : 'Post poll'} is now ${on ? 'active' : 'inactive'}.`, 'info');
  },
  'q-export'(el) {
    const job = queueExport(pv.project, el.dataset.kind); // exports.js
    showToast(`Preparing ${job.fileName}. You'll find it on the Exports page.`, 'info');
  },
  'q-new'(el) {
    const { kind } = el.dataset;
    const list = pv.project.detail[kind];
    const blank = (id) => ({ id, text: '', action: 'none', counts: QUESTION_KINDS[kind].actions ? [0, 0, 0] : [0] });
    const q = { id: Math.max(0, ...list.map((x) => x.id)) + 1, text: '', type: 'Single dropdown', answers: [blank(1), blank(2)], isNew: true };
    list.push(q);
    const card = appendQuestionCard(kind, q);
    markCardDirty(card);
    card.elements.text.focus();
  },
  'q-library'(el) { addLibraryQuestion(el.dataset.kind); },
  'q-delete'(el) {
    if (!confirmClick(el)) return;
    const { kind, id } = el.dataset;
    removeQuestion(kind, findQuestion(kind, id));
    showToast('Question deleted.', 'info');
  },
  'q-cancel'(el) {
    const { kind, id } = el.dataset;
    const q = findQuestion(kind, id);
    if (q.isNew) removeQuestion(kind, q);
    else {
      replaceQuestionCard(kind, q);
      syncQuestionsUnsaved(kind);
    }
  },
  'ans-add'(el) {
    const card = el.closest('.q-card');
    $('.ans-list', card).insertAdjacentHTML('beforeend', answerRowHtml(card.dataset.kind, { id: null, text: '', action: 'none' }));
    markCardDirty(card);
    $('.ans-row:last-child .ans-text', card).focus();
  },
  'ans-remove'(el) {
    const card = el.closest('.q-card');
    el.closest('.ans-row').remove();
    markCardDirty(card);
  },
  'ans-action'(el) {
    $$('button', el.parentElement).forEach((b) => {
      b.classList.toggle('active', b === el);
      b.setAttribute('aria-checked', String(b === el));
    });
    markCardDirty(el.closest('.q-card'));
  },
  'ans-refresh'() { showToast('Answer counts are up to date.', 'info'); },
};

function onClick(e) {
  const tab = e.target.closest('.pv-tab');
  if (tab) {
    if (!tab.disabled) selectTab(tab.dataset.tab);
    return;
  }
  const el = e.target.closest('[data-action]');
  if (el && !el.disabled && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el, e);
}

function onChange(e) {
  const el = e.target;
  if (el.classList.contains('ms-input') || el.type === 'file') return;
  if (el.closest('#mainForm')) {
    markDirty();
    return;
  }
  const card = el.closest('.q-card');
  if (card) {
    markCardDirty(card);
    if (el.name === 'type') $('.ans-block', card).hidden = TYPES_WITHOUT_ANSWERS.has(el.value);
    return;
  }
  const d = pv.project?.detail;
  switch (el.dataset.change) {
    case 'vendor-status': {
      const v = d.vendors.find((x) => x.id === Number(el.dataset.id));
      v.status = el.value;
      el.dataset.status = el.value;
      showToast(`${v.name} is now ${el.value}.`, 'info');
      break;
    }
    case 'vendor-filter':
      pv.vendorFilter = el.value;
      renderPanel('vendors');
      break;
    case 'campaign-status': {
      const c = findCampaign(el.dataset.id, el.dataset.parent);
      c.status = el.value;
      // Closing or reopening a campaign applies to its segments too.
      if (!el.dataset.parent) c.segments.forEach((s) => { s.status = el.value; });
      renderPanel('campaigns');
      showToast(`${c.name} is now ${el.value}.`, 'info');
      break;
    }
    case 'camp-panel':
      pv.campPanel = el.value;
      renderPanel('campaigns');
      break;
    default:
  }
}

function onInput(e) {
  const el = e.target;
  if (el.classList.contains('ms-input')) return;
  if (el.closest('#mainForm')) markDirty();
  else if (el.closest('.q-card')) markCardDirty(el.closest('.q-card'));
  else if (el.id === 'ipInput') el.classList.remove('is-invalid');
}

function onSubmit(e) {
  const form = e.target;
  if (form.id === 'mainForm') {
    e.preventDefault();
    saveMain();
    return;
  }
  const handlers = {
    'pool-upload': uploadPool,
    'ips-file': processIpFile,
    'ips-add': addOneIp,
    'q-save': saveQuestion,
  };
  const handler = handlers[form.dataset.form];
  if (!handler) return;
  e.preventDefault();
  handler(form);
}

function onTabKeys(e) {
  const tab = e.target.closest('.pv-tab');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const tabs = $$('#projectView .pv-tab:not(:disabled)');
  const i = tabs.indexOf(tab);
  const next = e.key === 'Home' ? tabs[0]
    : e.key === 'End' ? tabs[tabs.length - 1]
      : tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
  e.preventDefault();
  next.focus();
  selectTab(next.dataset.tab);
}

function initProjectView() {
  const root = $('#projectView');
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', onInput);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('keydown', onTabKeys);

  $('#pvModalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      form.querySelector(':invalid')?.focus();
      return;
    }
    if (modalSubmit && modalSubmit(form) !== false) bootstrap.Modal.getInstance('#pvModal').hide();
  });
  $('#pvModal').addEventListener('shown.bs.modal', () => $('#pvModalBody input, #pvModalBody select')?.focus());

  window.addEventListener('hashchange', route);
  route();
}

document.addEventListener('DOMContentLoaded', initProjectView);
