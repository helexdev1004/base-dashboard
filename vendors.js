'use strict';

/* =========================================================
   Base · Vendors
   Vendors list (#/vendors), the vendor form (#/vendors/new,
   #/vendors/<id>) and Vendor groups (#/vendor-groups).
   Uses helpers from script.js and project.js.
   ========================================================= */

const VENDORS_PAGE_SIZE = 10;
const VENDOR_PANELS = PANELS.map((p) => `${p.name} panel`);
const URL_RE = /^https?:\/\/\S+$/i;

// Where a vendor's respondents are sent back for each outcome.
const VENDOR_URL_FIELDS = [
  ['c1', 'Complete URL (C1)'], ['s1', 'Screenout URL (S1)'], ['s2', 'Screenout URL (S2)'],
  ['q1', 'Quota full URL (Q1)'], ['q2', 'Quota full in screener (Q2)'], ['dup1', 'Duplicate URL (DUP1)'],
  ['dup2', 'Duplicate in Base URL (DUP2)'], ['dup3', 'Exclude in group URL (DUP3)'], ['geo1', 'GeoIp fail URL (GEO1)'],
  ['qfail1', 'Quality fail URL (QFAIL1)'], ['qfail2', 'Quality fail in screener URL (QFAIL2)'],
  ['dev1', 'Wrong device URL (DEV1)'], ['ex1', 'Forbidden IP URL (EX1)'], ['ex2', 'Excluded URL (EX2)'],
];

const vendorGroups = [];   // { id, name, createdAt }
const vendorRegistry = []; // { id, name, groupId, panel, api, liveLink, urls, createdAt }

const groupName = (id) => vendorGroups.find((g) => g.id === id)?.name ?? '—';
const groupVendorCount = (id) => vendorRegistry.filter((v) => v.groupId === id).length;

function vendorUrls(name) {
  const host = `${slugify(name) || 'vendor'}.example.com`;
  return Object.fromEntries(VENDOR_URL_FIELDS.map(([key]) => [key, `https://${host}/return?status=${key.toUpperCase()}&rid={RID}`]));
}

/* ---------- Sample data ---------- */
(function seedVendors() {
  const r = seeded(4242);
  const at = (iso) => new Date(iso).getTime();
  [
    ['Main Frame', '2022-03-01T10:12:08'], ['Cint', '2022-04-11T09:30:41'], ['Nordic Panels', '2022-06-14T15:02:11'],
    ['Iberia Sample', '2022-09-02T11:47:30'], ['DACH Direct', '2022-11-21T08:15:52'], ['CEE Partners', '2023-01-17T13:22:05'],
    ['LatAm Network', '2023-03-08T16:40:19'], ['APAC Sample', '2023-05-25T10:05:44'], ['Benelux Panel', '2023-07-12T09:58:13'],
    ['UK Direct', '2023-09-04T14:31:27'], ['France Terrain', '2023-11-29T11:11:11'], ['Italia Campione', '2024-01-23T15:45:36'],
    ['Polska Panel', '2024-03-14T08:20:48'], ['Balkan Reach', '2024-05-06T12:37:02'], ['B2B Specialists', '2024-07-18T17:03:29'],
    ['Healthcare Panels', '2024-09-10T10:44:58'], ['Gen Z Recruit', '2024-12-02T13:16:21'], ['Mobile First', '2025-02-19T09:27:40'],
    ['Opinion Network', '2025-05-07T16:52:33'], ['Survey Exchange', '2025-08-26T11:38:05'],
    ['Xhuljeta', '2025-11-13T16:49:17'], ['Szinapszis', '2026-02-20T17:44:59'],
    ['Main Frame dynamic recruit', '2026-06-19T00:42:43'], ['Alliance', '2026-06-24T17:04:10'],
  ].forEach(([name, iso], i) => vendorGroups.push({ id: i + 1, name, createdAt: at(iso) }));
  const groupId = (name) => vendorGroups.find((g) => g.name === name).id;

  // The vendors from the reference design, plus the ones used in project sample data.
  // [id, name, group, panel, api, created]
  const known = new Map([
    [1, 'Gavenze', 'Main Frame', 'Gavenze panel', false, '2022-03-07T11:20:14'],
    [2, 'Aparteko - mainframe', 'Main Frame', '', false, '2022-04-11T10:02:37'],
    [4, 'Cint', 'Cint', '', false, '2022-04-11T12:40:09'],
    [5, 'Lucid', 'Cint', '', false, '2022-04-11T12:44:51'],
    [7, 'Panelwise', 'Nordic Panels', 'Panelwise panel', false, '2022-06-20T09:10:03'],
    [11, 'Northfield Sample', 'UK Direct', 'Northfield Sample panel', false, '2022-08-30T14:25:19'],
    [15, 'Gavenze test only', 'Main Frame', '', false, '2022-12-05T09:15:42'],
    [18, 'Opinion Bridge', 'Opinion Network', '', true, '2023-03-02T10:48:27'],
    [21, 'SurveyHub Direct', 'Survey Exchange', '', false, '2023-05-16T16:02:55'],
    [23, 'Aparteko - mainframe1', 'Main Frame', '', false, '2023-08-25T14:10:31'],
    [27, 'Aparteko - mainframe2', 'Main Frame', '', false, '2023-09-25T14:12:08'],
    [31, 'Quickpoll Panels', 'Mobile First', '', false, '2023-12-12T11:31:46'],
    [39, 'API - Make Opinion', 'Alliance', '', true, '2024-04-24T10:00:12'],
    [47, 'Prime Sample', 'Main Frame', '', false, '2024-11-01T13:30:20'],
    [49, 'Andata', 'Main Frame', '', false, '2025-04-02T08:45:57'],
    [52, 'Xhuljeta', 'Xhuljeta', '', false, '2025-11-14T09:05:33'],
    [55, 'Szinapszis', 'Szinapszis', '', false, '2026-02-21T10:20:14'],
  ].map((k) => [k[0], k]));

  const prefixes = ['Atlas', 'Summit', 'Pioneer', 'Vertex', 'Harbor', 'Beacon', 'Crescent', 'Horizon', 'Keystone', 'Lighthouse',
    'Northstar', 'Orbit', 'Pulse', 'Quantum', 'Redwood', 'Silverline', 'Tandem', 'Unity', 'Willow', 'Cobalt', 'Juniper', 'Sterling'];
  const suffixes = ['Sample', 'Panel', 'Research', 'Insights', 'Direct', 'Recruit'];
  const special = new Set(['Xhuljeta', 'Szinapszis', 'Main Frame dynamic recruit', 'Alliance']);
  const general = vendorGroups.filter((g) => !special.has(g.name));
  const gaps = new Set([3, 9, 13, 26, 34, 44, 53]); // deleted vendors keep their ids
  const used = new Set([...known.values()].map((k) => k[1]));
  const first = at('2022-04-15T09:00:00');
  const last = at('2026-09-30T18:00:00');

  for (let id = 1; id <= 58; id++) {
    if (gaps.has(id)) continue;
    const k = known.get(id);
    let name;
    let group;
    let panel;
    let api;
    let createdAt;
    if (k) {
      [, name, group, panel, api] = k;
      createdAt = at(k[5]);
    } else {
      do { name = `${r.pick(prefixes)} ${r.pick(suffixes)}`; } while (used.has(name));
      group = r.chance(0.45) ? 'Main Frame' : r.pick(general).name;
      panel = r.chance(0.12) ? r.pick(VENDOR_PANELS) : '';
      api = r.chance(0.12);
      createdAt = first + (id / 58) * (last - first) + r.between(-20, 20) * DAY;
    }
    used.add(name);
    vendorRegistry.push({
      id, name, groupId: groupId(group), panel, api, createdAt,
      liveLink: `{LIVE_LINK}?vid=${id}&rid={RID}`,
      urls: vendorUrls(name),
    });
  }
}());

const sortTh = (key, label, state, attr) => {
  const on = state.sortKey === key;
  const dir = state.sortDir === 'asc' ? 'up' : 'down';
  return `
    <th aria-sort="${on ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}">
      <button type="button" class="th-sort" data-${attr}="${key}">${label}${on ? ` <i class="bi bi-caret-${dir}-fill"></i>` : ''}</button>
    </th>`;
};

/* ---------- Vendors list ---------- */
const vl = { search: '', panel: '', sortKey: 'id', sortDir: 'asc', page: 1, mounted: false, flashId: null };
const VL_SORTERS = {
  id: (v) => v.id,
  name: (v) => v.name.toLowerCase(),
  group: (v) => groupName(v.groupId).toLowerCase(),
  panel: (v) => v.panel.toLowerCase(),
  created: (v) => v.createdAt,
};

function visibleVendors() {
  const q = vl.search.trim().toLowerCase();
  const get = VL_SORTERS[vl.sortKey];
  const dir = vl.sortDir === 'asc' ? 1 : -1;
  return vendorRegistry
    .filter((v) => !vl.panel || v.panel === vl.panel)
    .filter((v) => !q || `${v.id} ${v.name} ${groupName(v.groupId)} ${v.panel}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x < y) return -dir;
      if (x > y) return dir;
      return a.id - b.id;
    });
}

function renderVendorsList() {
  document.title = 'Vendors · Base';
  const root = $('#vendorsView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Vendors</h1>
      <p class="page-sub">Sample suppliers that can be added to projects.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <a class="btn btn-ghost btn-sm-h" href="#/vendors/new"><i class="bi bi-plus-circle"></i> New Vendor</a>
        <button type="button" class="btn btn-export btn-sm-h ms-auto" data-vl-action="export"><i class="bi bi-download"></i> Export stats</button>
      </div>
      <div class="list-filters">
        ${searchGroupHtml('vendors', 'Search vendors…', vl.search)}
        <select class="form-select pv-filter" data-vl-filter aria-label="Filter on panel">
          <option value="">All panels</option>
          ${optionsHtml(VENDOR_PANELS.map((p) => [p, p]), vl.panel)}
        </select>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table">
          <thead id="vlHead"></thead>
          <tbody id="vlRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="vlFooter"></div>
    </section>`;
  if (!vl.mounted) {
    root.addEventListener('click', onVendorsClick);
    root.addEventListener('input', onVendorsInput);
    root.addEventListener('change', onVendorsChange);
    vl.mounted = true;
  }
  renderVendorRows();
}

function renderVendorRows() {
  const list = visibleVendors();
  const { rows, page, pages, start } = paginate(list, vl.page, VENDORS_PAGE_SIZE);
  vl.page = page;
  $('#vlHead').innerHTML = `
    <tr>
      ${sortTh('id', 'ID', vl, 'vl-sort')}${sortTh('name', 'Vendor name', vl, 'vl-sort')}
      ${sortTh('group', 'Vendor group', vl, 'vl-sort')}${sortTh('panel', 'Panel', vl, 'vl-sort')}
      <th>API</th>${sortTh('created', 'Created', vl, 'vl-sort')}
    </tr>`;
  $('#vlRows').innerHTML = rows.length
    ? rows.map((v) => `
        <tr class="row-link${v.id === vl.flashId ? ' row-flash' : ''}" data-href="#/vendors/${v.id}">
          <td class="col-id">${v.id}</td>
          <td><a class="cell-link" href="#/vendors/${v.id}">${escapeHtml(v.name)}</a></td>
          <td>${escapeHtml(groupName(v.groupId))}</td>
          <td>${v.panel ? escapeHtml(v.panel) : '<span class="zero">—</span>'}</td>
          <td>${v.api ? '<i class="bi bi-check-circle api-yes" role="img" title="Connected through API" aria-label="API"></i>' : ''}</td>
          <td class="t-muted">${fmtDate(v.createdAt)}</td>
        </tr>`).join('')
    : emptyRow(6, 'No vendors found', vl.search || vl.panel ? 'Try a different search or panel.' : 'Add a vendor to get started.');
  vl.flashId = null;
  $('#vlFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> vendors` : 'No vendors to show'}</span>
    <nav aria-label="Vendor pages">${pagerHtml(page, pages, 'vl-page')}</nav>`;
}

function onVendorsClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-vl-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      vl.page = Number(pageBtn.dataset.vlPage);
      renderVendorRows();
    }
    return;
  }
  const sort = t.closest('[data-vl-sort]');
  if (sort) {
    const key = sort.dataset.vlSort;
    vl.sortDir = vl.sortKey === key && vl.sortDir === 'asc' ? 'desc' : 'asc';
    vl.sortKey = key;
    vl.page = 1;
    renderVendorRows();
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="vendors"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    vl.search = '';
    vl.page = 1;
    $('[data-search="vendors"]').value = '';
    renderVendorRows();
    return;
  }
  if (t.closest('[data-vl-action="export"]')) {
    exportVendorStats();
    return;
  }
  const row = t.closest('tr[data-href]');
  if (row && !t.closest('a, button')) location.hash = row.dataset.href;
}

function onVendorsInput(e) {
  if (e.target.dataset.search !== 'vendors') return;
  vl.search = e.target.value;
  vl.page = 1;
  renderVendorRows();
}

function onVendorsChange(e) {
  if (!e.target.matches('[data-vl-filter]')) return;
  vl.panel = e.target.value;
  vl.page = 1;
  renderVendorRows();
}

// Per-vendor totals across every project the vendor works on.
function exportVendorStats() {
  const totals = new Map();
  projects.forEach((p) => {
    ensureDetail(p).vendors.forEach((v) => {
      const t = totals.get(v.name) || { projects: 0, ...emptyStats() };
      t.projects += 1;
      addStats(t, v.stats);
      totals.set(v.name, t);
    });
  });
  const list = visibleVendors();
  downloadCsv(`vendor-stats-${today()}.csv`, [
    ['ID', 'Vendor name', 'Vendor group', 'Panel', 'API', 'Created', 'Projects', ...VENDOR_COLS.map(([, label]) => label)],
    ...list.map((v) => {
      const s = totals.get(v.name) || { projects: 0, ...emptyStats() };
      return [v.id, v.name, groupName(v.groupId), v.panel, v.api ? 'Yes' : 'No', fmtDate(v.createdAt), s.projects, ...VENDOR_COLS.map(([key]) => s[key])];
    }),
  ]);
  showToast(`Exported stats for ${plural(list.length, 'vendor')}.`);
}

/* ---------- Vendor form ---------- */
const vendorForm = { routeId: null, dirty: false };

function renderVendorForm(id) {
  const v = id === 'new' ? null : vendorRegistry.find((x) => x.id === Number(id));
  const root = $('#vendorFormView');
  if (id !== 'new' && !v) {
    history.replaceState(null, '', '#/vendors');
    showToast("That vendor couldn't be found.", 'info');
    showPage('vendors');
    return;
  }
  Object.assign(vendorForm, { routeId: id, dirty: false });
  document.title = `${v ? v.name : 'New vendor'} · Base`;
  const groupOpts = [['', 'Select group…'], ...[...vendorGroups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => [g.id, g.name])];
  const panelOpts = [['', 'No panel'], ...VENDOR_PANELS.map((p) => [p, p])];

  root.innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/vendors" title="Back to vendors" aria-label="Back to vendors"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">${v ? escapeHtml(v.name) : 'New vendor'}</h1>
        <p class="page-sub">${v ? `Vendor #${v.id} · created ${fmtDate(v.createdAt)}` : 'Add a sample supplier. It can then be added to any project.'}</p>
      </div>
    </header>

    <form id="vendorForm" class="vendor-form" novalidate autocomplete="off">
      <section class="pv-card">
        <div class="pv-card-head">
          <h2 class="pv-card-title">Vendor</h2>
          <span class="dirty-flag" id="vfDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
        </div>
        <div class="hf-rows">
          <div class="hf-row">
            <label class="form-label" for="vfName">Name</label>
            <div class="hf-field hf-md">
              <input class="form-control" id="vfName" name="name" required maxlength="80" value="${v ? escapeHtml(v.name) : ''}">
              <div class="invalid-feedback" id="vfNameFeedback">Enter a vendor name.</div>
            </div>
          </div>
          <div class="hf-row">
            <label class="form-label" for="vfGroup">Vendor group</label>
            <div class="hf-field hf-sm">
              <select class="form-select" id="vfGroup" name="group" required>${optionsHtml(groupOpts, v ? v.groupId : '')}</select>
              <div class="invalid-feedback">Select a vendor group.</div>
            </div>
          </div>
          <div class="hf-row">
            <label class="form-label" for="vfLiveLink">Live link format</label>
            <div class="hf-field hf-md">
              <input class="form-control mono" id="vfLiveLink" name="liveLink" maxlength="300" spellcheck="false"
                     value="${v ? escapeHtml(v.liveLink) : ''}" placeholder="e.g. {LIVE_LINK}?vid=12&rid={RID}">
              <div class="field-help">How the survey link is built for this vendor's respondents.</div>
            </div>
          </div>
          <div class="hf-row">
            <label class="form-label" for="vfPanel">Panel</label>
            <div class="hf-field hf-md">
              <select class="form-select" id="vfPanel" name="panel">${optionsHtml(panelOpts, v ? v.panel : '')}</select>
            </div>
          </div>
          <div class="hf-row">
            <span class="form-label" id="vfApiLabel">API</span>
            <div class="hf-field">
              <div class="form-check form-switch m-0">
                <input class="form-check-input" type="checkbox" role="switch" id="vfApi" name="api" ${v && v.api ? 'checked' : ''}>
                <label class="form-check-label" for="vfApi">Respondents arrive through this vendor's API</label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="pv-card">
        <div class="pv-card-head">
          <div>
            <h2 class="pv-card-title">Redirect URLs</h2>
            <p class="pv-card-sub">Where respondents are sent back to the vendor for each outcome. Use {RID} where the vendor's respondent ID goes.</p>
          </div>
        </div>
        <div class="hf-rows">
          ${VENDOR_URL_FIELDS.map(([key, label]) => `
            <div class="hf-row">
              <label class="form-label" for="vfUrl-${key}">${label}</label>
              <div class="hf-field">
                <input class="form-control mono" id="vfUrl-${key}" name="url-${key}" maxlength="500" spellcheck="false"
                       value="${v ? escapeHtml(v.urls[key] ?? '') : ''}" placeholder="https://…">
                <div class="invalid-feedback">Enter a full URL starting with http:// or https://.</div>
              </div>
            </div>`).join('')}
        </div>
      </section>

      <div class="form-actions-bar">
        <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> ${v ? 'Save' : 'Create vendor'}</button>
        <button type="button" class="btn btn-ghost" data-vf-action="cancel">Cancel</button>
        ${v ? '<button type="button" class="btn btn-ghost text-danger-soft ms-auto" data-vf-action="delete"><i class="bi bi-trash3"></i> Delete vendor</button>' : ''}
      </div>
    </form>`;

  const form = $('#vendorForm');
  form.addEventListener('input', markVendorDirty);
  form.addEventListener('change', markVendorDirty);
  form.addEventListener('submit', saveVendor);
  form.addEventListener('click', onVendorFormClick);
  if (!v) $('#vfName').focus();
}

function markVendorDirty() {
  if (vendorForm.dirty) return;
  vendorForm.dirty = true;
  $('#vfDirty').hidden = false;
}

function saveVendor(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const v = vendorForm.routeId === 'new' ? null : vendorRegistry.find((x) => x.id === Number(vendorForm.routeId));
  const name = form.elements.name.value.trim();
  const taken = vendorRegistry.some((x) => x !== v && x.name.toLowerCase() === name.toLowerCase());
  form.elements.name.setCustomValidity(taken ? 'taken' : '');
  $('#vfNameFeedback').textContent = taken ? 'Another vendor already has this name.' : 'Enter a vendor name.';
  VENDOR_URL_FIELDS.forEach(([key]) => {
    const input = form.elements[`url-${key}`];
    const value = input.value.trim();
    input.setCustomValidity(value && !URL_RE.test(value) ? 'invalid' : '');
  });
  form.classList.add('was-validated');
  if (!form.checkValidity()) {
    form.querySelector(':invalid')?.focus();
    return;
  }

  const data = {
    name,
    groupId: Number(form.elements.group.value),
    liveLink: form.elements.liveLink.value.trim(),
    panel: form.elements.panel.value,
    api: form.elements.api.checked,
    urls: Object.fromEntries(VENDOR_URL_FIELDS.map(([key]) => [key, form.elements[`url-${key}`].value.trim()])),
  };
  let saved;
  if (v) {
    // Projects refer to vendors by name, so a rename carries over to them.
    if (v.name !== name) {
      projects.forEach((p) => p.detail?.vendors.forEach((pv2) => { if (pv2.name === v.name) pv2.name = name; }));
    }
    saved = Object.assign(v, data);
  } else {
    saved = { id: Math.max(0, ...vendorRegistry.map((x) => x.id)) + 1, createdAt: Date.now(), ...data };
    vendorRegistry.push(saved);
    Object.assign(vl, { search: '', panel: '', sortKey: 'id', sortDir: 'desc', page: 1 }); // newest first, so it's in view
  }
  vl.flashId = saved.id;
  vendorForm.dirty = false;
  location.hash = '#/vendors';
  showToast(v ? `${saved.name} saved.` : `${saved.name} created.`);
}

function onVendorFormClick(e) {
  const el = e.target.closest('[data-vf-action]');
  if (!el) return;
  if (el.dataset.vfAction === 'cancel') {
    vendorForm.dirty = false;
    location.hash = '#/vendors';
  } else if (el.dataset.vfAction === 'delete' && confirmClick(el, 'Click again to delete')) {
    const v = vendorRegistry.find((x) => x.id === Number(vendorForm.routeId));
    vendorRegistry.splice(vendorRegistry.indexOf(v), 1);
    vendorForm.dirty = false;
    location.hash = '#/vendors';
    showToast(`${v.name} deleted.`, 'info');
  }
}

/* ---------- Vendor groups ---------- */
const vg = { search: '', page: 1, mounted: false, flashId: null };

function renderVendorGroups() {
  document.title = 'Vendor groups · Base';
  const root = $('#vendorGroupsView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Vendor groups</h1>
      <p class="page-sub">Vendors that belong together, such as one supplier's different sources.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-vg-action="new"><i class="bi bi-plus-circle"></i> New Group</button>
      </div>
      <div class="list-filters">${searchGroupHtml('groups', 'Search groups…', vg.search)}</div>
      <div class="table-responsive">
        <table class="pv-table list-table">
          <thead><tr><th>Name</th><th>Vendors</th><th>Created</th></tr></thead>
          <tbody id="vgRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="vgFooter"></div>
    </section>`;
  if (!vg.mounted) {
    root.addEventListener('click', onGroupsClick);
    root.addEventListener('input', onGroupsInput);
    vg.mounted = true;
  }
  renderGroupRows();
}

function visibleGroups() {
  const q = vg.search.trim().toLowerCase();
  return vendorGroups.filter((g) => !q || g.name.toLowerCase().includes(q)).sort((a, b) => a.createdAt - b.createdAt);
}

function renderGroupRows() {
  const list = visibleGroups();
  const { rows, page, pages, start } = paginate(list, vg.page, VENDORS_PAGE_SIZE);
  vg.page = page;
  $('#vgRows').innerHTML = rows.length
    ? rows.map((g) => `
        <tr class="row-link${g.id === vg.flashId ? ' row-flash' : ''}" data-group="${g.id}">
          <td><button type="button" class="cell-link" data-group-open="${g.id}">${escapeHtml(g.name)}</button></td>
          <td>${fmtInt(groupVendorCount(g.id))}</td>
          <td class="t-muted">${fmtDateTime(g.createdAt)}</td>
        </tr>`).join('')
    : emptyRow(3, 'No groups found', vg.search ? 'Try a different search.' : 'Create a group to organise your vendors.');
  vg.flashId = null;
  $('#vgFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> groups` : 'No groups to show'}</span>
    <nav aria-label="Group pages">${pagerHtml(page, pages, 'vg-page')}</nav>`;
}

function onGroupsClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-vg-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      vg.page = Number(pageBtn.dataset.vgPage);
      renderGroupRows();
    }
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="groups"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    vg.search = '';
    vg.page = 1;
    $('[data-search="groups"]').value = '';
    renderGroupRows();
    return;
  }
  if (t.closest('[data-vg-action="new"]')) {
    openGroupModal(null);
    return;
  }
  const row = t.closest('tr[data-group]');
  if (row) openGroupModal(vendorGroups.find((g) => g.id === Number(row.dataset.group)));
}

function onGroupsInput(e) {
  if (e.target.dataset.search !== 'groups') return;
  vg.search = e.target.value;
  vg.page = 1;
  renderGroupRows();
}

function openGroupModal(group) {
  const members = group ? vendorRegistry.filter((v) => v.groupId === group.id) : [];
  openFormModal({
    title: group ? 'Edit group' : 'New group',
    subtitle: group ? `Created ${fmtDateTime(group.createdAt)}` : 'Vendors are added to a group from the vendor form.',
    body: `
      <label class="form-label" for="vgName">Name</label>
      <input class="form-control" id="vgName" name="name" required maxlength="60" value="${group ? escapeHtml(group.name) : ''}">
      <div class="invalid-feedback" id="vgNameFeedback">Enter a group name.</div>
      ${group ? `
        <div class="form-label mt-3">Vendors in this group (${members.length})</div>
        ${members.length
          ? `<div class="vg-chips">${members.map((v) => `<a class="vg-chip" href="#/vendors/${v.id}">${escapeHtml(v.name)}</a>`).join('')}</div>`
          : `<p class="field-help m-0">No vendors yet, so the group can be deleted.</p>
             <button type="button" class="btn btn-ghost btn-sm-h text-danger-soft mt-2" data-vg-delete><i class="bi bi-trash3"></i> Delete group</button>`}` : ''}`,
    submitLabel: group ? '<i class="bi bi-check2"></i> Save' : '<i class="bi bi-plus-lg"></i> Create group',
    onSubmit: (form) => {
      const input = form.elements.name;
      const name = input.value.trim();
      if (vendorGroups.some((g) => g !== group && g.name.toLowerCase() === name.toLowerCase())) {
        input.setCustomValidity('taken');
        $('#vgNameFeedback').textContent = 'Another group already has this name.';
        form.classList.add('was-validated');
        input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
        return false;
      }
      if (group) {
        group.name = name;
        vg.flashId = group.id;
        showToast(`Group renamed to ${name}.`);
      } else {
        const created = { id: Math.max(0, ...vendorGroups.map((g) => g.id)) + 1, name, createdAt: Date.now() };
        vendorGroups.push(created);
        Object.assign(vg, { search: '', page: Infinity, flashId: created.id }); // newest is on the last page
        showToast(`Group ${name} created.`);
      }
      renderGroupRows();
      return true;
    },
  });

  // Vendor links close the modal; an empty group can be deleted from here.
  $('#pvModalBody').onclick = (e) => {
    if (e.target.closest('.vg-chip')) {
      bootstrap.Modal.getInstance('#pvModal').hide();
      return;
    }
    const del = e.target.closest('[data-vg-delete]');
    if (del && confirmClick(del, 'Click again to delete')) {
      vendorGroups.splice(vendorGroups.indexOf(group), 1);
      bootstrap.Modal.getInstance('#pvModal').hide();
      renderGroupRows();
      showToast(`Group ${group.name} deleted.`, 'info');
    }
  };
}
