'use strict';

/* =========================================================
   Base · Survey Projects dashboard
   ========================================================= */

/* ---------- Reference data ---------- */
const COUNTRIES = [
  { code: 'fr', name: 'France' },
  { code: 'hu', name: 'Hungary' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'de', name: 'Germany' },
  { code: 'es', name: 'Spain' },
  { code: 'it', name: 'Italy' },
  { code: 'pl', name: 'Poland' },
  { code: 'nl', name: 'Netherlands' },
  { code: 'us', name: 'United States' },
  { code: 'se', name: 'Sweden' },
  { code: 'be', name: 'Belgium' },
  { code: 'cz', name: 'Czech Republic' },
  { code: 'ro', name: 'Romania' },
  { code: 'pt', name: 'Portugal' },
];

const CLIENTS = [
  'Northwind Research',
  'Bluepeak Insights',
  'Kestrel Analytics',
  'Meridian Panels',
  'Orbit Consumer Lab',
  'Vantage Media Group',
  'Cobalt Strategy',
];

const PMS = [
  { initials: 'RG', name: 'Ruth Gallagher' },
  { initials: 'AL', name: 'Adam Lindqvist' },
  { initials: 'MK', name: 'Mia Kovács' },
  { initials: 'JS', name: 'Jonas Schmidt' },
  { initials: 'TD', name: 'Tara Dubois' },
];

// The first few topics mirror the reference designs; the rest are sample data.
const PRESET_TOPICS = [
  { name: 'Test concepts assurance auto', country: 'fr' },
  { name: 'HelloOmnibus 2026-Oct', country: 'fr' },
  { name: 'The impact of influencers', country: 'hu' },
  { name: "Men's basketball followers", country: 'hu' },
  { name: 'Employed individuals', country: 'hu' },
  { name: 'SurveyR', country: 'gb' },
];

const TOPICS = [
  'Grocery delivery habits', 'Electric vehicle purchase intent', 'Streaming service churn drivers',
  'Banking app satisfaction', 'Pet food brand tracker', 'Holiday travel planning',
  'Smart home device usage', 'Coffee shop loyalty', 'Sustainable packaging attitudes',
  'Mobile gaming spend', 'Fitness tracker adoption', 'Skincare routine U&A',
  'B2B IT decision makers', 'Fast food menu test', 'Home insurance switching',
  'Craft beer preferences', 'Parents of toddlers', 'Online fashion returns',
  'Public transport commuters', 'Energy supplier perceptions', 'Podcast listening habits',
  'Plant-based dairy trial', 'Small business owners pulse', 'Ad recall wave 3',
  'Premium chocolate packaging test', 'Healthcare professionals panel', 'Gen Z social media',
  'Retirement planning attitudes', 'Car rental experience', 'Luxury watch buyers',
  'Back to school spending', 'Mattress purchase journey', 'Telecom NPS tracker',
  'Frozen meals concept screen', 'Home improvement DIYers', 'Sports betting attitudes',
];

const PAGE_SIZE = 20;
const TOTAL_PROJECTS = 88;
const LIVE_PROJECTS = 55;
const COLLAPSE_KEY = 'base.sidebarCollapsed';
const THEME_KEY = 'base.theme';
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Seeded PRNG so the sample data is the same on every load.
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261015);
const rand = (min, max) => min + rng() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtPct = (n) => `${n.toFixed(1)}%`;
const ratio = (a, b) => (b ? (a / b) * 100 : 0);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function relativeTime(ts) {
  const mins = Math.max(0, Math.round((Date.now() - ts) / MINUTE));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function freshness(ts) {
  const mins = (Date.now() - ts) / MINUTE;
  if (mins < 60) return 'fresh';
  if (mins < 1440) return 'warm';
  return 'stale';
}

/* ---------- Sample data ---------- */
function makeMetrics(base, live, now) {
  const eb = randInt(40, 900);
  const ec = Math.round(eb * rand(0.55, 0.85));
  const c1 = Math.round(ec * rand(0.04, 0.3));
  const s1 = Math.round((ec - c1) * rand(0.35, 0.8));
  const q1 = Math.round((ec - c1 - s1) * rand(0, 0.7));
  const s2 = rng() < 0.65 ? 0 : Math.round((ec - c1 - s1 - q1) * rand(0.2, 0.9));
  const q2 = rng() < 0.8 ? 0 : randInt(1, 25);
  const dupsA = rng() < 0.3 ? 0 : randInt(1, 130);
  const qfA = rng() < 0.5 ? 0 : randInt(1, 6);
  const loiBid = pick([5, 7, 8, 10, 12, 15, 20]);

  const minsAgo = live
    ? (rng() < 0.8 ? randInt(1, 120) : randInt(121, 1800))
    : randInt(2, 75) * 1440 + randInt(0, 1439);
  const lastEntryAt = now - minsAgo * MINUTE;
  const lastCompleteAt = c1 ? lastEntryAt - randInt(0, live ? 240 : 2880) * MINUTE : null;

  const activeToday = live && minsAgo < 1440;
  const c24h = activeToday ? Math.round(c1 * rand(0.03, 0.2)) : 0;
  const eb24h = activeToday ? Math.max(c24h, Math.round(eb * rand(0.05, 0.2))) : 0;
  const inLast30 = live || (lastCompleteAt && now - lastCompleteAt <= 30 * DAY);

  return {
    ...base,
    status: live ? 'Live' : 'Closed',
    eb, ec, c1, s1, q1, s2, q2,
    ir: c1 ? Math.max(1, Math.round(ratio(c1, c1 + s1 + s2))) : 0,
    conv: c1 ? Math.max(1, Math.round(ratio(c1, eb))) : 0,
    loiBid,
    loiReal: c1 ? +(loiBid * rand(0.85, 1.35)).toFixed(2) : null,
    drops: Math.round(eb * rand(0.02, 0.1)),
    dupsA,
    dupsB: Math.round(dupsA * rand(0.15, 0.6)),
    qfA,
    qfB: Math.round(qfA * rand(0, 0.7)),
    others: rng() < 0.3 ? 0 : randInt(1, 20),
    lastEntryAt,
    lastCompleteAt,
    c24h,
    eb24h,
    c30: inLast30 ? c1 : 0,
    eb30: inLast30 ? eb : 0,
  };
}

function buildProjects() {
  const now = Date.now();
  const countryByCode = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
  const bases = [];
  let id = 8650;
  let jobNo = 33732;

  for (let i = 0; i < TOTAL_PROJECTS; i++) {
    if (i > 0) {
      id -= randInt(1, 3);
      jobNo -= rng() < 0.7 ? randInt(1, 40) : randInt(200, 900);
    }
    const preset = PRESET_TOPICS[i];
    const topicIndex = i - PRESET_TOPICS.length;
    const wave = Math.floor(topicIndex / TOPICS.length);
    bases.push({
      id,
      jobNo,
      name: preset ? preset.name : TOPICS[topicIndex % TOPICS.length] + (wave ? ` W${wave + 1}` : ''),
      country: preset ? countryByCode[preset.country] : pick(COUNTRIES),
      client: pick(CLIENTS),
      pm: i < 6 ? PMS[0] : pick(PMS),
    });
  }

  // Newer projects are more likely to still be live.
  const liveIds = new Set(
    bases
      .map((b, i) => ({ id: b.id, score: i + rng() * 30 }))
      .sort((a, b) => a.score - b.score)
      .slice(0, LIVE_PROJECTS)
      .map((s) => s.id)
  );

  const list = bases.map((b) => makeMetrics(b, liveIds.has(b.id), now));

  // Row 1 matches the reference design exactly.
  const first = list.find((p) => p.id === 8650);
  if (first.status !== 'Live') {
    const swap = list.find((p) => p.status === 'Live' && p.id !== 8650);
    swap.status = 'Closed';
  }
  Object.assign(first, {
    status: 'Live', c1: 55, ir: 11, conv: 10, loiBid: 10, loiReal: 11,
    eb: 472, ec: 333, s1: 280, q1: 115, s2: 0, q2: 0, drops: 31,
    dupsA: 126, dupsB: 55, qfA: 1, qfB: 0, others: 15, c30: 55, eb30: 472,
    lastEntryAt: now - 6 * MINUTE, lastCompleteAt: now - 14 * MINUTE,
  });

  return list;
}

let projects = buildProjects();

/* ---------- State ---------- */
const state = {
  status: 'Live',
  search: '',
  filters: { country: '', client: '', pm: '', activity: '' },
  sortKey: 'id',
  sortDir: 'desc',
  page: 1,
};

const SORTERS = {
  id: (p) => p.id,
  name: (p) => p.name.toLowerCase(),
  pm: (p) => p.pm.initials,
  status: (p) => p.status,
  c1: (p) => p.c1,
  ir: (p) => p.ir,
  loi: (p) => p.loiBid,
  eb: (p) => p.eb,
  s1: (p) => p.s1,
  s2: (p) => p.s2,
  drops: (p) => p.drops,
  dups: (p) => p.dupsA,
  qfails: (p) => p.qfA,
  others: (p) => p.others,
  activity: (p) => p.lastEntryAt || 0,
};
const TEXT_SORTS = new Set(['name', 'pm', 'status']);

const FILTER_LABELS = {
  country: 'Country',
  client: 'Client',
  pm: 'PM',
  activity: 'Last entry',
};
const ACTIVITY_LABELS = {
  hour: 'Within the last hour',
  day: 'Within the last 24 hours',
  idle: 'No entries for 24+ hours',
};

/* ---------- KPI cards ---------- */
const KPI_CONFIG = [
  // Accents come from the active theme (--kpi-1 … --kpi-5 in style.css).
  { key: 'live', title: 'Projects Currently Live', sub: '', icon: 'bi-broadcast', accent: 'var(--kpi-1)', type: 'int' },
  { key: 'c30', title: 'Completes', sub: 'past 30 days', icon: 'bi-check2-circle', accent: 'var(--kpi-2)', type: 'int' },
  { key: 'c24', title: 'Completes', sub: 'past 24 hours', icon: 'bi-clock-history', accent: 'var(--kpi-3)', type: 'int' },
  { key: 'conv30', title: 'Conversion', sub: 'past 30 days', icon: 'bi-arrow-repeat', accent: 'var(--kpi-4)', type: 'pct' },
  { key: 'conv24', title: 'Conversion', sub: 'past 24 hours', icon: 'bi-lightning-charge', accent: 'var(--kpi-5)', type: 'pct' },
];

function computeKpis() {
  const sum = (key) => projects.reduce((total, p) => total + (p[key] || 0), 0);
  return {
    live: projects.filter((p) => p.status === 'Live').length,
    c30: sum('c30'),
    c24: sum('c24h'),
    conv30: ratio(sum('c30'), sum('eb30')),
    conv24: ratio(sum('c24h'), sum('eb24h')),
  };
}

// 14 days of history ending at today's value (synthetic, but stable per load).
const kpiSeries = {};
function seriesFor(key, end) {
  if (!kpiSeries[key]) {
    const out = [end];
    let v = end;
    for (let i = 1; i < 14; i++) {
      v = v / (1 + 0.02 + (rng() - 0.5) * 0.24);
      out.unshift(v);
    }
    kpiSeries[key] = out;
  }
  kpiSeries[key][kpiSeries[key].length - 1] = end;
  return kpiSeries[key];
}

function sparklineSvg(values, id) {
  const w = 120;
  const h = 60;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2.5),
  ]);

  // Catmull-Rom → cubic Bézier for a smooth wave.
  let line = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    line += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const area = `${line} L${w},${h} L0,${h} Z`;

  return `
    <svg class="kpi-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--accent); stop-opacity: .55" />
          <stop offset="1" style="stop-color: var(--accent); stop-opacity: 0" />
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#${id})" />
      <path d="${line}" fill="none" style="stroke: var(--accent)" stroke-width="1.8" vector-effect="non-scaling-stroke" />
    </svg>`;
}

function deltaHtml(series, type) {
  const now = series[series.length - 1];
  const prev = series[series.length - 8];
  const diff = type === 'pct' ? now - prev : ratio(now - prev, prev);
  if (!Number.isFinite(diff) || Math.abs(diff) < 0.05) return '';
  const up = diff >= 0;
  const text = type === 'pct' ? `${Math.abs(diff).toFixed(1)} pts` : `${Math.abs(Math.round(diff))}%`;
  return `<span class="kpi-delta ${up ? 'up' : 'down'}" title="Compared with 7 days ago">
            <i class="bi bi-arrow-${up ? 'up' : 'down'}-short"></i>${text}
          </span>`;
}

function formatKpi(value, type) {
  return type === 'pct' ? fmtPct(value) : fmtInt(value);
}

function renderKpis(animate = false) {
  const values = computeKpis();
  $('#kpiGrid').innerHTML = KPI_CONFIG.map((cfg) => {
    const series = seriesFor(cfg.key, values[cfg.key]);
    return `
      <article class="kpi-card" style="--accent:${cfg.accent}">
        <div class="kpi-head">
          <span class="kpi-icon"><i class="bi ${cfg.icon}"></i></span>
          <div class="kpi-label">
            <span class="kpi-title">${cfg.title}</span>
            ${cfg.sub ? `<span class="kpi-sub">${cfg.sub}</span>` : ''}
          </div>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value" data-value="${values[cfg.key]}" data-type="${cfg.type}">
            ${formatKpi(animate ? 0 : values[cfg.key], cfg.type)}
          </span>
          ${deltaHtml(series, cfg.type)}
        </div>
        ${sparklineSvg(series, `spark-${cfg.key}`)}
      </article>`;
  }).join('');

  if (animate) countUp($$('.kpi-value'));
}

function countUp(els) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => { el.textContent = formatKpi(+el.dataset.value, el.dataset.type); });
    return;
  }
  const start = performance.now();
  const duration = 900;
  const step = (t) => {
    const k = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    els.forEach((el) => { el.textContent = formatKpi(+el.dataset.value * eased, el.dataset.type); });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Filtering & sorting ---------- */
function matchesActivity(p, mode) {
  if (!mode) return true;
  const age = p.lastEntryAt ? Date.now() - p.lastEntryAt : Infinity;
  if (mode === 'hour') return age <= 60 * MINUTE;
  if (mode === 'day') return age <= DAY;
  return age > DAY;
}

function getVisibleProjects() {
  const q = state.search.trim().toLowerCase();
  const { country, client, pm, activity } = state.filters;

  const rows = projects.filter((p) => {
    if (p.status !== state.status) return false;
    if (country && p.country.code !== country) return false;
    if (client && p.client !== client) return false;
    if (pm && p.pm.initials !== pm) return false;
    if (!matchesActivity(p, activity)) return false;
    if (!q) return true;
    const haystack = `${p.id} #${p.jobNo} ${p.name} ${p.country.name} ${p.client} ${p.pm.name} ${p.pm.initials}`.toLowerCase();
    return haystack.includes(q);
  });

  const get = SORTERS[state.sortKey];
  const dir = state.sortDir === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return b.id - a.id;
  });
  return rows;
}

/* ---------- Table ---------- */
const stack = (top, bottom) => `<span class="stack"><span>${top}</span><span>${bottom}</span></span>`;
const numCls = (n) => (n === 0 ? ' num-zero' : '');
const cellNum = (n) => `<span class="${numCls(n).trim()}">${fmtInt(n)}</span>`;

function activityHtml(p) {
  if (!p.lastEntryAt) return '<span class="act-none">No entries yet</span>';
  const line = (label, ts) => ts
    ? `<div><span class="act-label">${label}:</span> <span class="act-time ${freshness(ts)}">${relativeTime(ts)}</span></div>`
    : `<div><span class="act-label">${label}:</span> <span class="act-none">none yet</span></div>`;
  return line('Last entry', p.lastEntryAt) + line('Last complete', p.lastCompleteAt);
}

function rowHtml(p) {
  const status = p.status === 'Live'
    ? '<span class="status-badge status-live">Live</span>'
    : '<span class="status-badge status-closed">Closed</span>';
  const loiReal = p.loiReal == null ? '<span class="num-zero">—</span>' : `${p.loiReal.toFixed(2)}<small>real</small>`;

  return `
    <tr data-id="${p.id}">
      <td class="col-id">${p.id}</td>
      <td>
        <div class="pname" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
        <div class="pmeta">
          <span class="job">#${p.jobNo}</span>
          <span class="fi fi-${p.country.code}"></span>
          <span class="country">${p.country.name.toUpperCase()}</span>
        </div>
      </td>
      <td class="activity">${activityHtml(p)}</td>
      <td class="text-center"><span class="pm-badge" title="${escapeHtml(p.pm.name)}">${p.pm.initials}</span></td>
      <td class="text-center">${status}</td>
      <td class="num num-strong${numCls(p.c1)}">${fmtInt(p.c1)}</td>
      <td class="num">${stack(`${p.ir}%`, `${p.conv}%`)}</td>
      <td class="num">${stack(`${p.loiBid.toFixed(2)}<small>bid</small>`, loiReal)}</td>
      <td class="num">${stack(fmtInt(p.eb), fmtInt(p.ec))}</td>
      <td class="num">${stack(cellNum(p.s1), cellNum(p.q1))}</td>
      <td class="num">${stack(cellNum(p.s2), cellNum(p.q2))}</td>
      <td class="num">${cellNum(p.drops)}</td>
      <td class="num">${stack(cellNum(p.dupsA), cellNum(p.dupsB))}</td>
      <td class="num">${stack(cellNum(p.qfA), cellNum(p.qfB))}</td>
      <td class="num">${cellNum(p.others)}</td>
    </tr>`;
}

function emptyRowHtml() {
  const hasFilters = state.search || Object.values(state.filters).some(Boolean);
  return `
    <tr class="empty-state">
      <td colspan="15">
        <i class="bi bi-inboxes"></i>
        <div class="empty-title">No ${state.status.toLowerCase()} projects found</div>
        <div class="empty-text">${hasFilters ? 'Try a different search term or clear the filters.' : 'New projects will appear here.'}</div>
      </td>
    </tr>`;
}

function renderTable() {
  const rows = getVisibleProjects();
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  $('#projectTbody').innerHTML = pageRows.length ? pageRows.map(rowHtml).join('') : emptyRowHtml();

  $('#pageInfo').innerHTML = rows.length
    ? `Showing <strong>${start + 1}–${start + pageRows.length}</strong> of <strong>${rows.length}</strong> ${state.status.toLowerCase()} projects`
    : 'No projects to show';

  renderPagination(pages);
  renderSortHeaders();
}

function pageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => set.add(p));
  const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

function renderPagination(pages) {
  const cur = state.page;
  const items = pageList(cur, pages).map((p) => (p === '…'
    ? '<li><span class="ellipsis">…</span></li>'
    : `<li><button type="button" data-page="${p}" class="${p === cur ? 'active' : ''}" ${p === cur ? 'aria-current="page"' : ''}>${p}</button></li>`));

  $('#pagination').innerHTML = `
    <li><button type="button" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''} aria-label="Previous page"><i class="bi bi-chevron-left"></i></button></li>
    ${items.join('')}
    <li><button type="button" data-page="${cur + 1}" ${cur === pages ? 'disabled' : ''} aria-label="Next page"><i class="bi bi-chevron-right"></i></button></li>`;
}

function renderSortHeaders() {
  $$('.project-table th[data-sort]').forEach((th) => {
    const active = th.dataset.sort === state.sortKey;
    th.classList.toggle('is-sorted', active);
    th.setAttribute('aria-sort', active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
    const icon = $('.sort-icon', th);
    icon.className = `bi sort-icon ${active ? (state.sortDir === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down') : 'bi-chevron-expand'}`;
  });
}

/* ---------- Filters ---------- */
function fillSelect(select, options) {
  select.insertAdjacentHTML('beforeend', options
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join(''));
}

function filterDisplayValue(key, value) {
  if (key === 'country') return COUNTRIES.find((c) => c.code === value)?.name ?? value;
  if (key === 'pm') return PMS.find((p) => p.initials === value)?.name ?? value;
  if (key === 'activity') return ACTIVITY_LABELS[value];
  return value;
}

function syncFilterUi() {
  const active = Object.entries(state.filters).filter(([, v]) => v);
  const badge = $('#filterCount');
  badge.textContent = active.length;
  badge.classList.toggle('d-none', active.length === 0);

  $('#activeFilters').innerHTML = active.length
    ? active.map(([key, value]) => `
        <span class="filter-chip">
          <span class="chip-key">${FILTER_LABELS[key]}:</span> ${escapeHtml(filterDisplayValue(key, value))}
          <button type="button" data-clear="${key}" aria-label="Remove ${FILTER_LABELS[key]} filter"><i class="bi bi-x"></i></button>
        </span>`).join('') + '<button type="button" class="clear-filters" data-clear="all">Clear all</button>'
    : '';

  $('#fCountry').value = state.filters.country;
  $('#fClient').value = state.filters.client;
  $('#fPm').value = state.filters.pm;
  $('#fActivity').value = state.filters.activity;
}

function applyFilters(next) {
  state.filters = { ...state.filters, ...next };
  state.page = 1;
  syncFilterUi();
  renderTable();
}

/* ---------- Export ---------- */
function exportCsv() {
  const rows = getVisibleProjects();
  if (!rows.length) {
    showToast('There are no projects to export.', 'info');
    return;
  }
  const header = [
    'ID', 'Job number', 'Project name', 'Country', 'Client', 'PM', 'Status', 'C1', 'IR %', 'CONV %',
    'LOI bid', 'LOI real', 'EB', 'EC', 'S1', 'Q1', 'S2', 'Q2', 'Drops', 'Dups 1', 'Dups 2',
    'QFails 1', 'QFails 2', 'Others', 'Last entry', 'Last complete',
  ];
  const iso = (ts) => (ts ? new Date(ts).toISOString() : '');
  const lines = rows.map((p) => [
    p.id, p.jobNo, p.name, p.country.name, p.client, p.pm.name, p.status, p.c1, p.ir, p.conv,
    p.loiBid, p.loiReal ?? '', p.eb, p.ec, p.s1, p.q1, p.s2, p.q2, p.drops, p.dupsA, p.dupsB,
    p.qfA, p.qfB, p.others, iso(p.lastEntryAt), iso(p.lastCompleteAt),
  ]);
  const csv = [header, ...lines]
    .map((cols) => cols.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `base-projects-${state.status.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast(`Exported ${rows.length} ${state.status.toLowerCase()} project${rows.length === 1 ? '' : 's'}.`);
}

/* ---------- Toasts ---------- */
function showToast(message, tone = 'success') {
  const icon = tone === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill';
  const el = document.createElement('div');
  el.className = `toast app-toast toast-${tone}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <div class="d-flex align-items-center gap-2 px-3 py-2">
      <i class="bi ${icon} toast-icon"></i>
      <div class="flex-grow-1">${escapeHtml(message)}</div>
      <button type="button" class="btn-close ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  $('#toastStack').append(el);
  el.addEventListener('hidden.bs.toast', () => el.remove());
  new bootstrap.Toast(el, { delay: 3200 }).show();
}

/* ---------- New project ---------- */
function nextJobNo() {
  return Math.max(...projects.map((p) => p.jobNo)) + 1;
}

function createProject() {
  const now = Date.now();
  const project = {
    id: Math.max(...projects.map((p) => p.id)) + 1,
    jobNo: nextJobNo(),
    name: $('#npName').value.trim(),
    country: COUNTRIES.find((c) => c.code === $('#npCountry').value),
    client: $('#npClient').value,
    pm: PMS.find((p) => p.initials === $('#npPm').value),
    status: 'Live',
    eb: 0, ec: 0, c1: 0, s1: 0, q1: 0, s2: 0, q2: 0,
    ir: 0, conv: 0,
    loiBid: Number($('#npLoi').value),
    loiReal: null,
    drops: 0, dupsA: 0, dupsB: 0, qfA: 0, qfB: 0, others: 0,
    lastEntryAt: null, lastCompleteAt: null,
    c24h: 0, eb24h: 0, c30: 0, eb30: 0,
    createdAt: now,
  };
  projects.unshift(project);

  // Show the new project: Live tab, no search/filters, newest first.
  state.status = 'Live';
  state.search = '';
  state.sortKey = 'id';
  state.sortDir = 'desc';
  state.page = 1;
  $('#searchInput').value = '';
  syncStatusButtons();
  applyFilters({ country: '', client: '', pm: '', activity: '' });
  renderKpis();

  const row = $(`#projectTbody tr[data-id="${project.id}"]`);
  if (row) {
    row.classList.add('row-flash');
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  showToast(`Project #${project.jobNo} "${project.name}" created.`);
}

/* ---------- Status toggle ---------- */
function syncStatusButtons() {
  $$('.segmented [data-status]').forEach((btn) => {
    const on = btn.dataset.status === state.status;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

/* ---------- Themes ---------- */
// Ids and modes must match the inline script in index.html; colours live in style.css.
// preview = [page, sidebar, header, card, accent] for the mini dashboard in the picker.
const THEMES = [
  { id: 'midnight', name: 'Midnight', desc: 'Deep navy with a violet glow', mode: 'dark',
    preview: ['#06070f', '#0b0d1b', '#121638', '#1f234c', '#6d5cff'] },
  { id: 'ocean', name: 'Ocean', desc: 'Deep sea blues with cyan', mode: 'dark',
    preview: ['#071a26', '#0a2738', '#0b2f45', '#0e3b54', '#06b6d4'] },
  { id: 'forest', name: 'Forest', desc: 'Deep greens with emerald', mode: 'dark',
    preview: ['#08140f', '#0d2018', '#0f2a1f', '#163a2b', '#10b981'] },
  { id: 'sunset', name: 'Sunset', desc: 'Plum with pink-to-orange', mode: 'dark',
    preview: ['#1a0b1f', '#2a1030', '#3a1238', '#4a1848', 'linear-gradient(90deg, #ec4899, #f97316)'] },
  { id: 'daylight', name: 'Daylight', desc: 'Clean white with indigo', mode: 'light',
    preview: ['#f3f5fb', '#ffffff', '#ffffff', '#dfe3f3', '#5b4bff'] },
  { id: 'arctic', name: 'Arctic', desc: 'Ice blue with a teal sidebar', mode: 'light',
    preview: ['#edf3f7', '#0e2a3b', '#ffffff', '#d5e3ea', '#0891b2'] },
  { id: 'sand', name: 'Sand', desc: 'Warm cream with terracotta', mode: 'light',
    preview: ['#f6f1e9', '#fbf7f1', '#fffdf9', '#e8dccb', '#c2410c'] },
  { id: 'rose', name: 'Rose', desc: 'Soft blush with magenta', mode: 'light',
    preview: ['#fdf2f6', '#fff7fa', '#ffffff', '#f6d5e2', '#db2777'] },
];

function saveTheme(id) {
  try { localStorage.setItem(THEME_KEY, id); } catch { /* storage unavailable */ }
}

function renderThemeOptions() {
  $('#themeOptions').innerHTML = THEMES.map((t) => {
    const [bg, side, top, card, accent] = t.preview;
    return `
      <button type="button" class="dropdown-item theme-tile" role="menuitemradio" aria-checked="false"
              data-theme-id="${t.id}" title="${t.desc}">
        <span class="theme-preview" style="--p-bg:${bg};--p-side:${side};--p-top:${top};--p-card:${card};--p-accent:${accent}" aria-hidden="true">
          <span class="tp-side"></span>
          <span class="tp-top"></span>
          <span class="tp-body">
            <span class="tp-cards"><span></span><span></span></span>
            <span class="tp-accent"></span>
          </span>
        </span>
        <span class="theme-tile-name">${t.name}<i class="bi bi-check-circle-fill" aria-hidden="true"></i></span>
      </button>`;
  }).join('');
}

function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-bs-theme', theme.mode);
  $('meta[name="theme-color"]').setAttribute('content', theme.preview[0]);
  $('#themeLabel').textContent = theme.name;
  $$('#themeOptions [data-theme-id]').forEach((btn) => {
    btn.setAttribute('aria-checked', String(btn.dataset.themeId === theme.id));
  });
  return theme;
}

/* ---------- Sidebar ---------- */
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

/* ---------- Wire up ---------- */
function init() {
  // Selects
  const countryOpts = COUNTRIES.map((c) => [c.code, c.name]).sort((a, b) => a[1].localeCompare(b[1]));
  const clientOpts = [...CLIENTS].sort().map((c) => [c, c]);
  const pmOpts = PMS.map((p) => [p.initials, `${p.name} (${p.initials})`]);
  fillSelect($('#fCountry'), countryOpts);
  fillSelect($('#fClient'), clientOpts);
  fillSelect($('#fPm'), pmOpts);
  fillSelect($('#npCountry'), countryOpts);
  fillSelect($('#npClient'), clientOpts);
  fillSelect($('#npPm'), pmOpts);

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
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('no-transition')));

  $('#sidebarToggle').addEventListener('click', () => {
    if (desktopMq.matches) setCollapsed(!document.body.classList.contains('sidebar-collapsed'));
    else setMobileOpen(false);
  });
  $('#mobileMenuBtn').addEventListener('click', () => setMobileOpen(true));
  $('#sidebarBackdrop').addEventListener('click', () => setMobileOpen(false));
  desktopMq.addEventListener('change', () => { setMobileOpen(false); syncNavTips(); });

  $('#sideNav').addEventListener('click', (e) => {
    const link = e.target.closest('.nav-link');
    if (!link) return;
    e.preventDefault();
    if (!link.classList.contains('active')) {
      showToast(`${$('span', link).textContent} isn't part of this preview.`, 'info');
    }
    setMobileOpen(false);
  });

  $$('.profile-menu .dropdown-item').forEach((item) => item.addEventListener('click', (e) => e.preventDefault()));

  // Search
  let searchTimer;
  $('#searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.search = e.target.value;
      state.page = 1;
      renderTable();
    }, 150);
  });

  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest('input, textarea, select, [contenteditable="true"]');
    if (e.key === '/' && !typing && !document.querySelector('.modal.show, .offcanvas.show')) {
      e.preventDefault();
      $('#searchInput').focus();
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

  // Sorting
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

  // Pagination
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

  // Export
  $('#exportBtn').addEventListener('click', exportCsv);

  // New project
  const modalEl = $('#newProjectModal');
  const form = $('#newProjectForm');
  modalEl.addEventListener('show.bs.modal', () => { $('#npJob').value = `#${nextJobNo()}`; });
  modalEl.addEventListener('shown.bs.modal', () => $('#npName').focus());
  modalEl.addEventListener('hidden.bs.modal', () => { form.reset(); form.classList.remove('was-validated'); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      form.querySelector(':invalid')?.focus();
      return;
    }
    createProject();
    bootstrap.Modal.getInstance(modalEl).hide();
  });

  // First paint
  syncStatusButtons();
  syncFilterUi();
  renderKpis(true);
  renderTable();

  // Keep "x minutes ago" current.
  setInterval(renderTable, MINUTE);
}

document.addEventListener('DOMContentLoaded', init);
