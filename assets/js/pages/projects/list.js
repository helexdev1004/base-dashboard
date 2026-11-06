'use strict';

// Project list: filtering, sorting, the table, filters and CSV export.

const PAGE_SIZE = 20;

const state = {
  status: 'Live',
  search: '',
  searchJob: '', // MFJN
  searchPo: '', // MFPO
  filters: { country: '', client: '', pm: '', activity: '' },
  sortKey: 'id',
  sortDir: 'desc',
  page: 1,
  sparkMode: 'hourly', // Progress chart: 'hourly' (past 24 hours) or 'daily' (past 14 days)
};

const SORTERS = {
  id: (p) => p.id,
  name: (p) => p.name.toLowerCase(),
  pm: (p) => p.pms[0]?.initials ?? '',
  status: (p) => p.status,
  c1: (p) => p.c1,
  ir: (p) => p.ir,
  loi: (p) => p.loiBid,
  eb: (p) => p.eb,
  s1: (p) => p.s1,
  s2: (p) => p.s2,
  drops: (p) => p.drops,
  dups: (p) => p.dupsA + p.dupsB,
  qfails: (p) => p.qfA + p.qfB,
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

function matchesActivity(p, mode) {
  if (!mode) return true;
  const age = p.lastEntryAt ? Date.now() - p.lastEntryAt : Infinity;
  if (mode === 'hour') return age <= 60 * MINUTE;
  if (mode === 'day') return age <= DAY;
  return age > DAY;
}

function getVisibleProjects() {
  const q = state.search.trim().toLowerCase();
  const job = state.searchJob.trim().replace(/^#/, '');
  const po = state.searchPo.trim().replace(/^#/, '').toLowerCase();
  const { country, client, pm, activity } = state.filters;

  const rows = projects.filter((p) => {
    if (p.status !== state.status) return false;
    if (country && p.country.code !== country) return false;
    if (client && p.client !== client) return false;
    if (pm && !p.pms.some((x) => x.initials === pm)) return false;
    if (!matchesActivity(p, activity)) return false;
    if (job && !String(p.jobNo).includes(job)) return false;
    if (po && !String(p.po || '').toLowerCase().includes(po)) return false;
    if (!q) return true;
    const people = p.pms.map((x) => `${x.name} ${x.initials}`).join(' ');
    const haystack = `${p.id} #${p.jobNo} #${p.po} ${p.name} ${p.country.name} ${p.client} ${people}`.toLowerCase();
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

function pmBadgeHtml(p) {
  const [first, ...rest] = p.pms;
  if (!first) return '<span class="num-zero">—</span>';
  const names = escapeHtml(p.pms.map((x) => x.name).join(', '));
  return `<span class="pm-badge" title="${names}">${first.initials}</span>${rest.length ? `<span class="pm-more" title="${names}">+${rest.length}</span>` : ''}`;
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
        <a class="pname" href="#/project/${p.id}" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</a>
        <div class="pmeta">
          <span class="pmeta-ids">
            <span class="job" title="MFJN">#${p.jobNo}</span>
            ${p.po ? `<span class="job" title="MFPO">#${escapeHtml(p.po)}</span>` : ''}
            <span class="fi fi-${p.country.code}"></span><span class="country">${p.country.name.toUpperCase()}</span>
          </span>
          <span class="pmeta-break" aria-hidden="true"></span>
          ${p.client ? `<span class="client" title="Client"><i class="bi bi-building"></i>${escapeHtml(p.client)}</span>` : ''}
        </div>
      </td>
      <td class="col-spark">${sparkHtml(p)}</td>
      <td class="activity">${activityHtml(p)}</td>
      <td class="text-center">${pmBadgeHtml(p)}</td>
      <td class="text-center">${status}</td>
      <td class="num num-strong${numCls(p.c1)}">${fmtInt(p.c1)}</td>
      <td class="num">${stack(`${p.ir}%`, `${p.conv}%`)}</td>
      <td class="num">${stack(`${p.loiBid.toFixed(2)}<small>bid</small>`, loiReal)}</td>
      <td class="num">${stack(fmtInt(p.eb), fmtInt(p.ec))}</td>
      <td class="num">${stack(cellNum(p.s1), cellNum(p.q1))}</td>
      <td class="num">${stack(cellNum(p.s2), cellNum(p.q2))}</td>
      <td class="num">${cellNum(p.drops)}</td>
      <td class="num" title="DUP1 ${fmtInt(p.dupsA)} · DUP2 ${fmtInt(p.dupsB)}">${cellNum(p.dupsA + p.dupsB)}</td>
      <td class="num" title="QFAIL1 ${fmtInt(p.qfA)} · QFAIL2 ${fmtInt(p.qfB)}">${cellNum(p.qfA + p.qfB)}</td>
    </tr>`;
}

function emptyRowHtml() {
  const hasFilters = state.search || state.searchJob || state.searchPo || Object.values(state.filters).some(Boolean);
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

function exportCsv() {
  const rows = getVisibleProjects();
  if (!rows.length) {
    showToast('There are no projects to export.', 'info');
    return;
  }
  const header = [
    'ID', 'MFJN', 'MFPO', 'Project name', 'Country', 'Client', 'PM', 'Status', 'C1', 'IR %', 'CONV %',
    'LOI bid', 'LOI real', 'EB', 'EC', 'S1', 'Q1', 'S2', 'Q2', 'Drops', 'Dups 1', 'Dups 2',
    'QFails 1', 'QFails 2', 'Others', 'Last entry', 'Last complete',
  ];
  const iso = (ts) => (ts ? new Date(ts).toISOString() : '');
  const lines = rows.map((p) => [
    p.id, p.jobNo, p.po, p.name, p.country.name, p.client, p.pms.map((x) => x.name).join(', '), p.status, p.c1, p.ir, p.conv,
    p.loiBid, p.loiReal ?? '', p.eb, p.ec, p.s1, p.q1, p.s2, p.q2, p.drops, p.dupsA, p.dupsB,
    p.qfA, p.qfB, p.others, iso(p.lastEntryAt), iso(p.lastCompleteAt),
  ]);
  downloadCsv(`base-projects-${state.status.toLowerCase()}-${today()}.csv`, [header, ...lines]);
  showToast(`Exported ${rows.length} ${state.status.toLowerCase()} project${rows.length === 1 ? '' : 's'}.`);
}

function syncStatusButtons() {
  $$('.segmented [data-status]').forEach((btn) => {
    const on = btn.dataset.status === state.status;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}
