'use strict';

/* =========================================================
   Base · Project detail
   Opens when a project is clicked (#/project/<id>/<tab>) and doubles as
   the New Project form (#/project/new). Uses the data and helpers from
   script.js (projects, PMS, COUNTRIES, CLIENTS, $, $$, escapeHtml, …).
   ========================================================= */

/* ---------- Reference data ---------- */
const VENDORS = ['Gavenze', 'Panelwise', 'Northfield Sample', 'Opinion Bridge', 'SurveyHub Direct', 'Quickpoll Panels'];
const PANELS = [
  { code: 'GAV', name: 'Gavenze' },
  { code: 'PWS', name: 'Panelwise' },
  { code: 'NFS', name: 'Northfield Sample' },
];
const PROJECT_TYPES = ['ad hoc', 'tracker', 'omnibus'];
const ENTITY_STATUSES = ['active', 'paused', 'closed'];
const LINK_VARIABLES = ['{MRID}', '{UNIQUE_CODES}', '{CUSTOM_LINK}'];
const POLL_TYPES = ['Rating (1–5)', 'Single choice', 'Multiple choice', 'Open text'];

const SCREENER_LIBRARY = [
  { id: 'age', text: 'What is your age?', type: 'Numeric', qualify: '18–65' },
  { id: 'gender', text: 'What is your gender?', type: 'Single choice', qualify: 'Any' },
  { id: 'region', text: 'Which region do you live in?', type: 'Single choice', qualify: 'Any' },
  { id: 'employment', text: 'What is your current employment status?', type: 'Single choice', qualify: 'Employed full or part time' },
  { id: 'income', text: 'What is your annual household income?', type: 'Single choice', qualify: 'Any' },
  { id: 'education', text: 'What is the highest level of education you have completed?', type: 'Single choice', qualify: 'Any' },
  { id: 'parent', text: 'Are you a parent of a child under 18?', type: 'Yes / No', qualify: 'Yes' },
  { id: 'car', text: 'Do you own or lease a car?', type: 'Yes / No', qualify: 'Yes' },
  { id: 'decision', text: 'Are you involved in purchase decisions for your household?', type: 'Yes / No', qualify: 'Yes' },
  { id: 'industry', text: 'Do you or anyone in your household work in market research?', type: 'Yes / No', qualify: 'No' },
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
  ['eb', 'EB'], ['ec', 'EC'], ['incomplete', 'Incomplete'], ['c1', 'C1', 'Completes'],
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
  ['inv', 'INV', 'Invitations sent'], ['eb', 'EB'], ['ec', 'EC'], ['rr', 'RR', 'Response rate (EB ÷ INV)'],
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
    po: '', type: 'ad hoc', geoIp: true, blockDupIp: true, surveyGroup: [], notes: '', liveLink: makeLiveLink(),
    dup3: 0, geo1: 0, ex1: 0, ex2: 0, dev1: 0, noUnique: 0,
    days: [], vendors: [], campaigns: [], codes: [], links: [], ips: [],
    screener: [{ id: 'age', active: true }], poll: [],
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
    po: String(p.jobNo),
    type: r.chance(0.7) ? 'ad hoc' : r.pick(PROJECT_TYPES),
    geoIp: r.chance(0.8),
    blockDupIp: r.chance(0.75),
    surveyGroup: [],
    notes: '',
    liveLink: makeLiveLink(r.next),
    dup3: r.chance(0.7) ? 0 : r.int(1, 5),
    geo1, ex1, ex2, dev1, noUnique,
    days,
    vendors: [], campaigns: [], codes: [], links: [], ips: [], screener: [], poll: [],
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
  const extra = shuffle(SCREENER_LIBRARY.slice(1).map((q) => q.id), r.next).slice(0, r.int(1, 3));
  d.screener = ['age', ...extra].map((id) => ({ id, active: true }));
  if (r.chance(0.4)) {
    d.poll = [{ id: 1, text: 'How would you rate this survey overall?', type: 'Rating (1–5)', active: true }];
    if (r.chance(0.5)) d.poll.push({ id: 2, text: 'Was the length of the survey about right?', type: 'Single choice', active: true });
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
    po: v.po, type: v.type, geoIp: v.geoIp, blockDupIp: v.blockDupIp,
    surveyGroup: v.surveyGroup, notes: v.notes, liveLink: v.liveLink,
  };
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
  search: { codes: '', links: '' },
  chartIndex: -1,
};
let listScrollY = 0;
let chartObserver = null;

/* ---------- Routing ---------- */
function currentRoute() {
  const m = location.hash.match(/^#\/project\/(new|\d+)(?:\/([a-z]+))?$/);
  return m ? { id: m[1], tab: m[2] } : null;
}

function projectHash(p, tab) {
  return `#/project/${p ? p.id : 'new'}${tab && tab !== 'main' ? `/${tab}` : ''}`;
}

function route() {
  const r = currentRoute();
  const open = !$('#projectView').hidden;
  const sameTarget = r && (r.id === 'new' ? pv.creating : Number(r.id) === pv.project?.id);
  if (open && pv.dirty && !sameTarget) {
    history.replaceState(null, '', projectHash(pv.project, pv.tab));
    showToast('You have unsaved changes on the Main tab. Save or cancel them first.', 'info');
    return;
  }
  if (!r) {
    showList();
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
  if ($('#projectView').hidden) return; // the list is already showing (e.g. first load)
  chartObserver?.disconnect();
  $('#projectView').hidden = true;
  $('#listView').hidden = false;
  Object.assign(pv, { project: null, creating: false, dirty: false });
  document.title = 'Base · Survey Projects';
  renderKpis();
  renderTable();
  window.scrollTo(0, listScrollY);
}

function openProject(p, tab) {
  const creating = !p;
  const same = !$('#projectView').hidden && pv.creating === creating && pv.project === p;
  if (!same) {
    if ($('#projectView').hidden) listScrollY = window.scrollY;
    if (p) ensureDetail(p);
    Object.assign(pv, {
      project: p, creating, dirty: false, rendered: new Set(), draftLink: null,
      vendorView: 'chart', vendorFilter: '', campStatus: 'Live', campPanel: '', campSort: 'desc',
      expanded: new Set(), search: { codes: '', links: '' }, chartIndex: -1,
    });
    renderShell();
    $('#listView').hidden = true;
    $('#projectView').hidden = false;
    window.scrollTo(0, 0);
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
  const crumbs = (last) => `
    <div class="pv-crumbs">
      <a class="pv-back" href="#/"><i class="bi bi-arrow-left"></i> Projects</a>
      <span class="sep">/</span><span>${last}</span>
    </div>`;
  if (!p) {
    el.innerHTML = `
      ${crumbs('New project')}
      <div class="pv-title-row">
        <div>
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
    ${crumbs(`#${p.jobNo}`)}
    <div class="pv-title-row">
      <div class="pv-title-block">
        <h1 class="pv-title">${escapeHtml(p.name)}</h1>
        <div class="pv-meta">
          ${status}
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
    name: p.name, pms: p.pms.map((x) => x.initials), client: p.client, surveyNo: p.jobNo, po: d.po,
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

  el.innerHTML = `
    <form class="pv-card" id="mainForm" novalidate autocomplete="off">
      <div class="pv-card-head">
        <div>
          <h2 class="pv-card-title">${p ? 'Project details' : 'Project setup'}</h2>
          <p class="pv-card-sub">${p ? 'Changes apply as soon as you save.' : 'Save to create the project. The other tabs unlock once it exists.'}</p>
        </div>
        <span class="dirty-flag" id="dirtyFlag" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
      </div>

      <div class="row g-3">
        <div class="col-lg-6">
          <label class="form-label" for="mfName">Name</label>
          <input class="form-control" id="mfName" required maxlength="100" value="${escapeHtml(v.name)}" placeholder="e.g. Employed individuals">
          <div class="invalid-feedback">Enter a project name.</div>
        </div>
        <div class="col-lg-6">
          <label class="form-label" for="mfPm">PM</label>
          <div id="mfPmSelect"></div>
          <div class="invalid-feedback">Pick at least one project manager.</div>
        </div>

        <div class="col-md-4">
          <label class="form-label" for="mfClient">Client</label>
          <select class="form-select" id="mfClient" required>${optionsHtml(clientOpts, v.client)}</select>
          <div class="invalid-feedback">Select a client.</div>
        </div>
        <div class="col-md-4">
          <label class="form-label" for="mfSurveyNo">Survey number</label>
          <input class="form-control" id="mfSurveyNo" type="number" min="1" step="1" required value="${v.surveyNo}">
          <div class="invalid-feedback" id="mfSurveyNoFeedback">Enter a survey number.</div>
        </div>
        <div class="col-md-4">
          <label class="form-label" for="mfPo">PO</label>
          <input class="form-control" id="mfPo" maxlength="40" value="${escapeHtml(v.po)}" placeholder="Purchase order number">
        </div>

        <div class="col-md-4">
          <label class="form-label" for="mfLength">Survey length</label>
          <div class="input-group has-validation">
            <input class="form-control" id="mfLength" type="number" min="1" max="90" step="1" required value="${v.length}" placeholder="10">
            <span class="input-group-text">min</span>
            <div class="invalid-feedback">Enter a length between 1 and 90 minutes.</div>
          </div>
        </div>
        <div class="col-md-4">${toggleHtml('geoIp', 'Geo IP check', v.geoIp)}</div>
        <div class="col-md-4">${toggleHtml('blockDupIp', 'Block duplicated IP', v.blockDupIp)}</div>

        <div class="col-md-4">
          <label class="form-label" for="mfCountry">Country</label>
          <select class="form-select" id="mfCountry" required>${optionsHtml(countryOpts, v.country)}</select>
          <div class="invalid-feedback">Select a country.</div>
        </div>
        <div class="col-md-4">
          <label class="form-label" for="mfStatus">Status</label>
          <select class="form-select" id="mfStatus">${optionsHtml([['Live', 'Live'], ['Closed', 'Closed']], v.status)}</select>
        </div>
        <div class="col-md-4">
          <label class="form-label" for="mfType">Type</label>
          <select class="form-select" id="mfType">${optionsHtml(PROJECT_TYPES.map((t) => [t, t]), v.type)}</select>
        </div>

        <div class="col-12">
          <label class="form-label" for="mfGroup">Survey group</label>
          <div id="mfGroupSelect"></div>
          <div class="field-help">Respondents that attempted in selected projects are not eligible for this project.</div>
        </div>

        <div class="col-12">
          <label class="form-label" for="mfNotes">Notes</label>
          <textarea class="form-control" id="mfNotes" rows="3" maxlength="2000" placeholder="Anything the team should know about this project">${escapeHtml(v.notes)}</textarea>
        </div>

        <div class="col-12">
          <label class="form-label" for="mfLink">Live link</label>
          <div class="input-group has-validation">
            <input class="form-control mono" id="mfLink" required value="${escapeHtml(v.liveLink)}" spellcheck="false">
            <button class="btn btn-ghost" type="button" data-action="copy-link" title="Copy link" aria-label="Copy live link"><i class="bi bi-clipboard"></i></button>
            <div class="invalid-feedback">Enter a full URL starting with http:// or https://.</div>
          </div>
          <div class="field-help">
            Predefined variables (click to insert):
            ${LINK_VARIABLES.map((x) => `<button type="button" class="var-chip" data-action="insert-var" data-value="${x}">${x}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="pv-form-actions">
        <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> ${p ? 'Save' : 'Create project'}</button>
        <button type="button" class="btn btn-ghost" data-action="cancel-main">Cancel</button>
        ${p ? '<button type="button" class="btn btn-ghost ms-auto" data-action="export-main"><i class="bi bi-download"></i> Export data</button>' : ''}
      </div>
    </form>

    ${p ? `
      <section class="pv-card">
        <div class="pv-card-head">
          <div>
            <h2 class="pv-card-title">Fieldwork totals</h2>
            <p class="pv-card-sub">All vendors combined. C1 is completes.</p>
          </div>
        </div>
        ${statGridHtml(projectStats(p))}
      </section>` : ''}`;

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
    onChange: markDirty,
  });
  pv.dirty = false;
}

function statGridHtml(stats) {
  return `
    <div class="stat-grid">
      ${STAT_COLS.map(([key, label, title]) => `
        <div class="stat-cell${key === 'c1' ? ' is-key' : ''}${stats[key] === 0 ? ' is-zero' : ''}"${title ? ` title="${title}"` : ''}>
          <div class="stat-label">${label}</div>
          <div class="stat-value">${fmtInt(stats[key])}</div>
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
  const takenMsg = 'That survey number is already used by another project.';
  surveyInput.setCustomValidity(taken ? takenMsg : '');
  $('#mfSurveyNoFeedback').textContent = taken ? takenMsg : 'Enter a survey number.';

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
    name: values.name, pms: values.pms, client: values.client, jobNo: values.jobNo,
    loiBid: values.loiBid, country: values.country, status: values.status,
  });
  Object.assign(p.detail, {
    po: values.po, type: values.type, geoIp: values.geoIp, blockDupIp: values.blockDupIp,
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
    ['Name', p.name], ['Survey number', p.jobNo], ['PO', d.po], ['Client', p.client],
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

function renderVendors(el) {
  const d = pv.project.detail;
  const total = d.vendors.reduce((acc, v) => addStats(acc, v.stats), emptyStats());
  const isChart = pv.vendorView === 'chart';
  const subtitle = d.vendors.length === 1 ? `Daily completes (C1) · ${escapeHtml(d.vendors[0].name)}` : 'Daily completes (C1) by vendor';
  const cells = (stats) => VENDOR_COLS.map(([key]) => numCell(stats[key], key === 'c1' ? 'col-hl' : '')).join('');

  el.innerHTML = `
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-action="add-vendor"><i class="bi bi-plus-lg"></i> Add vendor</button>
        <button type="button" class="icon-btn-sm" data-action="refresh" data-tab="vendors" title="Refresh" aria-label="Refresh"><i class="bi bi-arrow-clockwise"></i></button>
        <span class="pv-toolbar-note">${plural(d.vendors.length, 'vendor')}</span>
      </div>
      <div class="table-responsive">
        <table class="pv-table">
          <thead><tr>
            <th>Vendor name</th><th><span class="visually-hidden">Export</span></th>
            ${thCells(VENDOR_COLS)}<th>Status</th><th><span class="visually-hidden">Security</span></th>
          </tr></thead>
          <tbody>
            ${d.vendors.length ? d.vendors.map((v) => `
              <tr>
                <td class="cell-name">${escapeHtml(v.name)}</td>
                <td><button type="button" class="btn btn-ghost btn-xs" data-action="export-vendor" data-id="${v.id}"><i class="bi bi-download"></i> Export data</button></td>
                ${cells(v.stats)}
                <td>${statusSelectHtml('vendor', v.id, v.status)}</td>
                <td>${shieldHtml(d)}</td>
              </tr>`).join('') : emptyRow(VENDOR_COLS.length + 4, 'No vendors yet', 'Add a vendor to start collecting responses.')}
          </tbody>
          ${d.vendors.length > 1 ? `<tfoot><tr><td>Total</td><td></td>${cells(total)}<td></td><td></td></tr></tfoot>` : ''}
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
  const available = VENDORS.filter((name) => !d.vendors.some((v) => v.name === name));
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

/* ---------- Unique codes & Custom link tabs ---------- */
const POOL_CFG = {
  codes: {
    title: 'Unique codes', noun: 'code', nouns: 'codes', variable: '{UNIQUE_CODES}', valueLabel: 'Code',
    placeholder: 'One code per line', generate: true,
    valid: (v) => /^[\w-]{3,64}$/.test(v), split: /[\s,;]+/,
  },
  links: {
    title: 'Custom links', noun: 'link', nouns: 'links', variable: '{CUSTOM_LINK}', valueLabel: 'Link',
    placeholder: 'One URL per line, e.g. https://…', generate: false,
    valid: (v) => /^https?:\/\/\S+$/i.test(v), split: /\r?\n/,
  },
};
const POOL_LIMIT = 100;

function renderPool(el, kind) {
  const cfg = POOL_CFG[kind];
  el.innerHTML = `
    <div class="sum-tiles" id="poolTiles-${kind}"></div>
    <div class="pv-grid">
      <section class="pv-card">
        <div class="pv-card-head">
          <div>
            <h2 class="pv-card-title">Add ${cfg.nouns}</h2>
            <p class="pv-card-sub">Each respondent gets one unused ${cfg.noun} through <code class="var-inline">${cfg.variable}</code> in the live link.</p>
          </div>
        </div>
        <form data-form="pool-add" data-kind="${kind}" novalidate>
          <label class="form-label" for="poolInput-${kind}">Paste ${cfg.nouns}</label>
          <textarea class="form-control mono" id="poolInput-${kind}" name="values" rows="6" placeholder="${cfg.placeholder}" spellcheck="false"></textarea>
          <div class="pv-inline-actions">
            <button type="submit" class="btn btn-primary-grad btn-sm-h"><i class="bi bi-plus-lg"></i> Add ${cfg.nouns}</button>
          </div>
        </form>
        ${cfg.generate ? `
          <div class="pv-divider"><span>or</span></div>
          <form data-form="pool-generate" data-kind="${kind}" novalidate>
            <label class="form-label" for="poolCount-${kind}">Generate random codes</label>
            <div class="input-group">
              <input class="form-control" type="number" id="poolCount-${kind}" name="count" min="1" max="5000" value="100" required>
              <button class="btn btn-ghost" type="submit">Generate</button>
            </div>
          </form>` : ''}
      </section>
      <section class="pv-card flush">
        <div class="pv-toolbar">
          <div class="search-box pv-search">
            <i class="bi bi-search"></i>
            <input type="search" data-input="pool-search" data-kind="${kind}" value="${escapeHtml(pv.search[kind])}"
                   placeholder="Search ${cfg.nouns} or MRID…" aria-label="Search ${cfg.nouns}">
          </div>
          <button type="button" class="btn btn-ghost btn-sm-h ms-auto" data-action="pool-export" data-kind="${kind}"><i class="bi bi-download"></i> Export</button>
        </div>
        <div class="table-responsive pool-table">
          <table class="pv-table">
            <thead><tr><th>${cfg.valueLabel}</th><th>Status</th><th>MRID</th><th>Used</th><th><span class="visually-hidden">Remove</span></th></tr></thead>
            <tbody id="poolRows-${kind}"></tbody>
          </table>
        </div>
        <div class="pv-table-note" id="poolNote-${kind}" hidden></div>
      </section>
    </div>`;
  updatePool(kind);
}

// Refreshes the counts and rows without re-rendering the panel (keeps focus in the search box).
function updatePool(kind) {
  const cfg = POOL_CFG[kind];
  const items = pv.project.detail[kind];
  const used = items.filter((i) => i.usedAt).length;
  const q = pv.search[kind].trim().toLowerCase();
  const shown = q ? items.filter((i) => i.value.toLowerCase().includes(q) || (i.mrid || '').toLowerCase().includes(q)) : items;

  $(`#poolTiles-${kind}`).innerHTML = [['Total', items.length], ['Used', used], ['Available', items.length - used]]
    .map(([label, n]) => `<div class="sum-tile"><div class="sum-label">${label}</div><div class="sum-value">${fmtInt(n)}</div></div>`).join('');

  $(`#poolRows-${kind}`).innerHTML = shown.length
    ? shown.slice(0, POOL_LIMIT).map((i) => `
        <tr>
          <td class="mono">${escapeHtml(i.value)}</td>
          <td>${i.usedAt ? '<span class="pill pill-used">Used</span>' : '<span class="pill pill-free">Available</span>'}</td>
          <td class="mono">${i.mrid || '<span class="zero">—</span>'}</td>
          <td class="t-muted">${i.usedAt ? relativeTime(i.usedAt) : '—'}</td>
          <td>${i.usedAt ? '' : `<button type="button" class="icon-btn-sm danger" data-action="pool-remove" data-kind="${kind}" data-value="${escapeHtml(i.value)}" aria-label="Remove ${escapeHtml(i.value)}"><i class="bi bi-trash3"></i></button>`}</td>
        </tr>`).join('')
    : emptyRow(5, items.length ? 'No matches' : `No ${cfg.nouns} yet`, items.length ? 'Try a different search.' : `Paste ${cfg.nouns} on the left to get started.`);

  const note = $(`#poolNote-${kind}`);
  note.hidden = shown.length <= POOL_LIMIT;
  note.textContent = `Showing ${POOL_LIMIT} of ${fmtInt(shown.length)} — search to narrow the list.`;
  $(`[data-action="pool-export"][data-kind="${kind}"]`).disabled = !items.length;
}

function addToPool(kind, text) {
  const cfg = POOL_CFG[kind];
  const items = pv.project.detail[kind];
  const existing = new Set(items.map((i) => i.value));
  const result = { added: 0, dupes: 0, invalid: 0 };
  text.split(cfg.split).map((s) => s.trim()).filter(Boolean).forEach((value) => {
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

function generateCodes(count) {
  const items = pv.project.detail.codes;
  const existing = new Set(items.map((i) => i.value));
  let added = 0;
  while (added < count) {
    const value = token(8, Math.random, CODE_CHARS);
    if (existing.has(value)) continue;
    existing.add(value);
    items.push({ value, mrid: null, usedAt: null });
    added += 1;
  }
}

function exportPool(kind) {
  const p = pv.project;
  const cfg = POOL_CFG[kind];
  downloadCsv(`project-${p.jobNo}-${slugify(cfg.title)}-${today()}.csv`, [
    [cfg.valueLabel, 'Status', 'MRID', 'Used at'],
    ...p.detail[kind].map((i) => [i.value, i.usedAt ? 'Used' : 'Available', i.mrid || '', i.usedAt ? new Date(i.usedAt).toISOString() : '']),
  ]);
  showToast(`${cfg.title} exported.`);
}

/* ---------- Exclude IPs tab ---------- */
const IPV4 = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\/(3[0-2]|[12]?\d))?$/;
function isValidIp(value) {
  if (IPV4.test(value)) return true;
  const [addr, mask, ...rest] = value.split('/');
  if (rest.length || !addr.includes(':') || !/^[0-9a-f:]+$/i.test(addr)) return false;
  if ((addr.match(/::/g) || []).length > 1 || addr.split(':').length > 8) return false;
  return mask === undefined || (/^\d{1,3}$/.test(mask) && Number(mask) <= 128);
}

function renderIps(el) {
  const ips = pv.project.detail.ips;
  el.innerHTML = `
    <div class="pv-grid">
      <section class="pv-card">
        <div class="pv-card-head">
          <div>
            <h2 class="pv-card-title">Exclude IP addresses</h2>
            <p class="pv-card-sub">Respondents connecting from these addresses can't enter the survey.</p>
          </div>
        </div>
        <form data-form="ips-add" novalidate>
          <label class="form-label" for="ipInput">IP addresses or ranges</label>
          <textarea class="form-control mono" id="ipInput" name="ips" rows="6" spellcheck="false" placeholder="One per line, e.g. 203.0.113.7 or 198.51.100.0/24"></textarea>
          <div class="field-help">IPv4, IPv6 and CIDR ranges are supported.</div>
          <div class="pv-inline-actions"><button type="submit" class="btn btn-primary-grad btn-sm-h"><i class="bi bi-plus-lg"></i> Add to exclusion list</button></div>
        </form>
      </section>
      <section class="pv-card flush">
        <div class="pv-toolbar">
          <span class="pv-toolbar-title">${plural(ips.length, 'excluded address', 'excluded addresses')}</span>
          <button type="button" class="btn btn-ghost btn-sm-h ms-auto text-danger-soft" data-action="ips-clear" ${ips.length ? '' : 'disabled'}><i class="bi bi-trash3"></i> Clear all</button>
        </div>
        <div class="table-responsive">
          <table class="pv-table">
            <thead><tr><th>IP / range</th><th>Type</th><th>Added</th><th><span class="visually-hidden">Remove</span></th></tr></thead>
            <tbody>
              ${ips.length ? ips.map((x, i) => `
                <tr>
                  <td class="mono">${escapeHtml(x.ip)}</td>
                  <td>${x.ip.includes('/') ? 'Range' : 'Single address'}</td>
                  <td class="t-muted">${relativeTime(x.addedAt)}</td>
                  <td><button type="button" class="icon-btn-sm danger" data-action="ips-remove" data-index="${i}" aria-label="Remove ${escapeHtml(x.ip)}"><i class="bi bi-trash3"></i></button></td>
                </tr>`).join('') : emptyRow(4, 'No exclusions', 'Add addresses on the left to block them.')}
            </tbody>
          </table>
        </div>
      </section>
    </div>`;
}

/* ---------- Screener & Post Poll tabs ---------- */
function renderQuestions(el, kind) {
  const items = pv.project.detail[kind];
  const isScreener = kind === 'screener';
  const resolved = items.map((q) => (isScreener ? { ...SCREENER_LIBRARY.find((l) => l.id === q.id), active: q.active } : q));
  const available = isScreener ? SCREENER_LIBRARY.filter((l) => !items.some((q) => q.id === l.id)) : [];
  const activeCount = items.filter((q) => q.active).length;

  const addForm = isScreener
    ? `
      <select class="form-select" name="question" aria-label="Question from the Screener Library" ${available.length ? '' : 'disabled'}>
        ${available.length ? available.map((l) => `<option value="${l.id}">${escapeHtml(l.text)}</option>`).join('') : '<option>All library questions are added</option>'}
      </select>
      <button type="submit" class="btn btn-primary-grad" ${available.length ? '' : 'disabled'}><i class="bi bi-plus-lg"></i> Add from library</button>`
    : `
      <input class="form-control" name="text" maxlength="200" required placeholder="Question text, e.g. How easy was this survey to complete?" aria-label="Question text">
      <select class="form-select q-type" name="type" aria-label="Answer type">${POLL_TYPES.map((t) => `<option>${t}</option>`).join('')}</select>
      <button type="submit" class="btn btn-primary-grad"><i class="bi bi-plus-lg"></i> Add question</button>`;

  el.innerHTML = `
    <section class="pv-card">
      <div class="pv-card-head">
        <div>
          <h2 class="pv-card-title">${isScreener ? 'Screener questions' : 'Post poll'}</h2>
          <p class="pv-card-sub">${isScreener
            ? 'Asked before the survey, in this order. Respondents who don’t qualify are screened out.'
            : 'Optional questions shown to respondents after they complete the survey.'}</p>
        </div>
        <span class="pv-count">${fmtInt(activeCount)} active</span>
      </div>
      <form class="q-add" data-form="q-add" data-kind="${kind}" novalidate>${addForm}</form>
      ${resolved.length ? `
        <ol class="q-list">
          ${resolved.map((q, i) => `
            <li class="q-item${q.active ? '' : ' is-off'}">
              <span class="q-num">${i + 1}</span>
              <div class="q-text">
                <div class="q-title">${escapeHtml(q.text)}</div>
                <div class="q-meta">${escapeHtml(q.type)}${isScreener ? ` · Qualifies: ${escapeHtml(q.qualify)}` : ''}</div>
              </div>
              <div class="q-actions">
                <div class="form-check form-switch m-0" title="${q.active ? 'Active' : 'Inactive'}">
                  <input class="form-check-input" type="checkbox" role="switch" data-change="q-active" data-kind="${kind}" data-index="${i}" ${q.active ? 'checked' : ''} aria-label="Question ${i + 1} active">
                </div>
                <button type="button" class="icon-btn-sm" data-action="q-move" data-kind="${kind}" data-index="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up"><i class="bi bi-arrow-up"></i></button>
                <button type="button" class="icon-btn-sm" data-action="q-move" data-kind="${kind}" data-index="${i}" data-dir="1" ${i === resolved.length - 1 ? 'disabled' : ''} aria-label="Move down"><i class="bi bi-arrow-down"></i></button>
                <button type="button" class="icon-btn-sm danger" data-action="q-remove" data-kind="${kind}" data-index="${i}" aria-label="Remove question ${i + 1}"><i class="bi bi-trash3"></i></button>
              </div>
            </li>`).join('')}
        </ol>` : `
        <div class="pv-empty-block">
          <i class="bi bi-ui-checks"></i>
          <div class="empty-title">No questions yet</div>
          <div class="empty-text">${isScreener ? 'Add questions from the Screener Library above.' : 'Add a question above to collect feedback after completion.'}</div>
        </div>`}
    </section>`;
}

/* ---------- Multi-select (PM, Survey group) ---------- */
function createMultiSelect(root, { id, options, selected = [], placeholder = '', onChange = () => {} }) {
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
function openFormModal({ title, subtitle = '', body, submitLabel, onSubmit }) {
  $('#pvModalTitle').textContent = title;
  $('#pvModalSub').textContent = subtitle;
  $('#pvModalBody').innerHTML = body;
  $('#pvModalSubmit').innerHTML = submitLabel;
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
  'add-vendor': addVendor,
  refresh(el) {
    renderPanel(el.dataset.tab);
    showToast('Numbers are up to date.', 'info');
  },
  'export-vendor'(el) { exportVendor(Number(el.dataset.id)); },
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
  'pool-export'(el) { exportPool(el.dataset.kind); },
  'pool-remove'(el) {
    const { kind, value } = el.dataset;
    const d = pv.project.detail;
    d[kind] = d[kind].filter((i) => i.value !== value);
    updatePool(kind);
    showToast(`Removed ${value}.`, 'info');
  },
  'ips-remove'(el) {
    const [removed] = pv.project.detail.ips.splice(Number(el.dataset.index), 1);
    renderPanel('ips');
    showToast(`${removed.ip} removed from the exclusion list.`, 'info');
  },
  'ips-clear'(el) {
    // Two-step: the first click arms the button, a second click within 3 s clears the list.
    if (!el.dataset.armed) {
      el.dataset.armed = '1';
      el.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Click again to clear';
      setTimeout(() => { if (el.isConnected) renderPanel('ips'); }, 3000);
      return;
    }
    pv.project.detail.ips = [];
    renderPanel('ips');
    showToast('Exclusion list cleared.', 'info');
  },
  'q-move'(el) {
    const items = pv.project.detail[el.dataset.kind];
    const i = Number(el.dataset.index);
    const j = i + Number(el.dataset.dir);
    [items[i], items[j]] = [items[j], items[i]];
    renderPanel(el.dataset.kind);
  },
  'q-remove'(el) {
    pv.project.detail[el.dataset.kind].splice(Number(el.dataset.index), 1);
    renderPanel(el.dataset.kind);
  },
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
  if (el.classList.contains('ms-input')) return; // typing a filter isn't a change; picks call onChange themselves
  if (el.closest('#mainForm')) {
    markDirty();
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
    case 'q-active':
      d[el.dataset.kind][Number(el.dataset.index)].active = el.checked;
      renderPanel(el.dataset.kind);
      break;
    default:
  }
}

let poolSearchTimer;
function onInput(e) {
  const el = e.target;
  if (el.classList.contains('ms-input')) return;
  if (el.closest('#mainForm')) {
    markDirty();
  } else if (el.dataset.input === 'pool-search') {
    clearTimeout(poolSearchTimer);
    poolSearchTimer = setTimeout(() => {
      pv.search[el.dataset.kind] = el.value;
      updatePool(el.dataset.kind);
    }, 120);
  }
}

function onSubmit(e) {
  const form = e.target;
  if (form.id === 'mainForm') {
    e.preventDefault();
    saveMain();
    return;
  }
  const type = form.dataset.form;
  if (!type) return;
  e.preventDefault();
  const d = pv.project.detail;
  const kind = form.dataset.kind;

  if (type === 'pool-add') {
    const cfg = POOL_CFG[kind];
    const { added, dupes, invalid } = addToPool(kind, form.elements.values.value);
    if (!added && !dupes && !invalid) {
      showToast(`Paste at least one ${cfg.noun} first.`, 'info');
      return;
    }
    form.reset();
    updatePool(kind);
    const notes = [dupes && `${plural(dupes, 'duplicate')} skipped`, invalid && `${fmtInt(invalid)} invalid`].filter(Boolean).join(', ');
    showToast(`Added ${plural(added, cfg.noun, cfg.nouns)}.${notes ? ` (${notes})` : ''}`, added ? 'success' : 'info');
  } else if (type === 'pool-generate') {
    const count = Number(form.elements.count.value);
    if (!form.checkValidity() || !Number.isInteger(count)) {
      form.classList.add('was-validated');
      showToast('Enter a number between 1 and 5,000.', 'info');
      return;
    }
    generateCodes(count);
    updatePool('codes');
    showToast(`Generated ${plural(count, 'code')}.`);
  } else if (type === 'ips-add') {
    const existing = new Set(d.ips.map((x) => x.ip));
    const entries = form.elements.ips.value.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    const invalid = entries.filter((ip) => !isValidIp(ip));
    const fresh = [...new Set(entries.filter((ip) => isValidIp(ip) && !existing.has(ip)))];
    if (!entries.length) {
      showToast('Enter at least one IP address.', 'info');
      return;
    }
    fresh.forEach((ip) => d.ips.unshift({ ip, addedAt: Date.now() }));
    renderPanel('ips');
    if (invalid.length) {
      // Put the rejected entries back so they can be fixed.
      $('#ipInput').value = invalid.join('\n');
      showToast(`Added ${plural(fresh.length, 'address', 'addresses')}. ${plural(invalid.length, 'entry', 'entries')} not valid: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '…' : ''}`, 'info');
    } else {
      showToast(`Added ${plural(fresh.length, 'address', 'addresses')} to the exclusion list.`);
    }
  } else if (type === 'q-add') {
    if (kind === 'screener') {
      const id = form.elements.question.value;
      if (!SCREENER_LIBRARY.some((q) => q.id === id)) return;
      d.screener.push({ id, active: true });
    } else {
      const text = form.elements.text.value.trim();
      if (!text) {
        form.classList.add('was-validated');
        form.elements.text.focus();
        return;
      }
      d.poll.push({ id: Math.max(0, ...d.poll.map((q) => q.id)) + 1, text, type: form.elements.type.value, active: true });
    }
    renderPanel(kind);
  }
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
