'use strict';

/* =========================================================
   Base · Recruiters
   Sources that bring new panelists in: the list (#/recruiters) and one
   recruiter's sign-ups per country (#/recruiters/<id|new>).
   PR% is the share of active sign-ups that are P2W active.
   Uses helpers from script.js, project.js and vendors.js.
   ========================================================= */

const RECRUITERS_PAGE_SIZE = 10;

// { id, name, createdAt, stats: [{ country, pending, active, p2w }] }
const recruiters = [];

(function seedRecruiters() {
  const r = seeded(5151);
  const codes = WORLD_COUNTRIES.map((c) => c.code).sort();
  const at = (iso) => new Date(iso).getTime();
  // Panel SOS: the first ten countries are the rows in the reference design.
  const sos = new Map([
    ['ar', [35, 33, 0]], ['at', [6, 9, 2]], ['au', [21, 17, 0]], ['be', [466, 1301, 18]], ['bg', [20, 20, 2]],
    ['bo', [46, 23, 0]], ['br', [73, 26, 1]], ['ca', [29, 14, 0]], ['ch', [3, 4, 0]], ['cl', [32, 29, 0]],
  ]);
  const randomStats = (scale) => {
    const active = r.int(0, scale);
    const pending = Math.round(active * r.between(0.3, 1.6)) + r.int(0, 5);
    const p2w = r.chance(0.55) ? 0 : Math.round(active * r.between(0.01, 0.2));
    return { pending, active, p2w };
  };
  [
    ['Panel SOS', '2022-05-03T10:20:00', 1],
    ['Referral program', '2022-04-25T09:00:00', 0.9, 40],
    ['Social ads', '2022-08-16T14:05:00', 0.7, 300],
    ['Search ads', '2022-11-02T11:40:00', 0.6, 220],
    ['Affiliate network', '2023-01-19T16:10:00', 0.5, 160],
    ['Cashback partners', '2023-04-07T08:55:00', 0.45, 120],
    ['Video ads', '2023-09-12T13:30:00', 0.4, 180],
    ['Coupon sites', '2024-02-20T10:00:00', 0.35, 70],
    ['Influencer campaign', '2024-06-04T15:45:00', 0.25, 90],
    ['Email partners', '2024-10-15T09:25:00', 0.3, 60],
    ['Offerwall', '2025-03-11T12:00:00', 0.4, 140],
    ['Display ads', '2025-09-22T10:35:00', 0.3, 50],
  ].forEach(([name, iso, coverage, scale], i) => {
    const stats = name === 'Panel SOS'
      ? codes.filter((country) => country !== 'ae').map((country) => {
          const known = sos.get(country);
          return known ? { country, pending: known[0], active: known[1], p2w: known[2] } : { country, ...randomStats(80) };
        })
      : codes.filter(() => r.chance(coverage)).map((country) => ({ country, ...randomStats(scale) }));
    recruiters.push({ id: i + 1, name, createdAt: at(iso), stats });
  });
}());

const recruiterTotals = (rec) => rec.stats.reduce((t, s) => ({
  pending: t.pending + s.pending, active: t.active + s.active, p2w: t.p2w + s.p2w,
}), { pending: 0, active: 0, p2w: 0 });
const prPct = (p2w, active) => (active ? `${Math.round((p2w / active) * 100)}%` : '—');
const prValue = (p2w, active) => (active ? p2w / active : -1);

/* ---------- List ---------- */
const rcl = { search: '', sortKey: 'id', sortDir: 'asc', page: 1, mounted: false, flashId: null };
const RCL_SORTERS = {
  id: (x) => x.id,
  name: (x) => x.name.toLowerCase(),
  countries: (x) => x.stats.length,
  pending: (x) => recruiterTotals(x).pending,
  active: (x) => recruiterTotals(x).active,
  p2w: (x) => recruiterTotals(x).p2w,
  pr: (x) => { const t = recruiterTotals(x); return prValue(t.p2w, t.active); },
  created: (x) => x.createdAt,
};

function visibleRecruiters() {
  const q = rcl.search.trim().toLowerCase();
  const get = RCL_SORTERS[rcl.sortKey];
  const dir = rcl.sortDir === 'asc' ? 1 : -1;
  return recruiters
    .filter((x) => !q || `${x.id} ${x.name}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x < y) return -dir;
      if (x > y) return dir;
      return a.id - b.id;
    });
}

function renderRecruiters() {
  document.title = 'Recruiters · Base';
  const root = $('#recruitersView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Recruiters</h1>
      <p class="page-sub">Sources that bring new panelists in. Open a recruiter to see its sign-ups per country.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <a class="btn btn-ghost btn-sm-h" href="#/recruiters/new"><i class="bi bi-plus-circle"></i> New Recruiter</a>
      </div>
      <div class="list-filters">${searchGroupHtml('recruiters', 'Search recruiters…', rcl.search)}</div>
      <div class="table-responsive">
        <table class="pv-table list-table rc-table">
          <thead id="rclHead"></thead>
          <tbody id="rclRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="rclFooter"></div>
    </section>`;
  if (!rcl.mounted) {
    root.addEventListener('click', onRecruitersClick);
    root.addEventListener('input', onRecruitersInput);
    rcl.mounted = true;
  }
  renderRecruiterRows();
}

function renderRecruiterRows() {
  const list = visibleRecruiters();
  const { rows, page, pages, start } = paginate(list, rcl.page, RECRUITERS_PAGE_SIZE);
  rcl.page = page;
  $('#rclHead').innerHTML = `
    <tr>
      ${sortTh('id', 'ID', rcl, 'rcl-sort')}${sortTh('name', 'Name', rcl, 'rcl-sort')}${sortTh('countries', 'Countries', rcl, 'rcl-sort')}
      ${sortTh('pending', 'Pending', rcl, 'rcl-sort')}${sortTh('active', 'Active', rcl, 'rcl-sort')}${sortTh('p2w', 'P2W active', rcl, 'rcl-sort')}
      ${sortTh('pr', 'PR%', rcl, 'rcl-sort')}${sortTh('created', 'Created', rcl, 'rcl-sort')}
    </tr>`;
  $('#rclRows').innerHTML = rows.length
    ? rows.map((x) => {
        const t = recruiterTotals(x);
        return `
          <tr class="row-link${x.id === rcl.flashId ? ' row-flash' : ''}" data-href="#/recruiters/${x.id}">
            <td class="col-id">${x.id}</td>
            <td><a class="cell-link" href="#/recruiters/${x.id}">${escapeHtml(x.name)}</a></td>
            <td class="num-l">${fmtInt(x.stats.length)}</td>
            <td class="num-l">${fmtInt(t.pending)}</td>
            <td class="num-l">${fmtInt(t.active)}</td>
            <td class="num-l">${fmtInt(t.p2w)}</td>
            <td class="num-l">${prPct(t.p2w, t.active)}</td>
            <td class="t-muted">${fmtDate(x.createdAt)}</td>
          </tr>`;
      }).join('')
    : emptyRow(8, 'No recruiters found', rcl.search ? 'Try a different search.' : 'Add a recruiter to start tracking sign-ups.');
  rcl.flashId = null;
  $('#rclFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> recruiters` : 'No recruiters to show'}</span>
    <nav aria-label="Recruiter pages">${pagerHtml(page, pages, 'rcl-page')}</nav>`;
}

function onRecruitersClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-rcl-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      rcl.page = Number(pageBtn.dataset.rclPage);
      renderRecruiterRows();
    }
    return;
  }
  const sort = t.closest('[data-rcl-sort]');
  if (sort) {
    const key = sort.dataset.rclSort;
    rcl.sortDir = rcl.sortKey === key && rcl.sortDir === 'asc' ? 'desc' : 'asc';
    rcl.sortKey = key;
    rcl.page = 1;
    renderRecruiterRows();
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="recruiters"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    rcl.search = '';
    rcl.page = 1;
    $('[data-search="recruiters"]').value = '';
    renderRecruiterRows();
    return;
  }
  const row = t.closest('tr[data-href]');
  if (row && !t.closest('a, button')) location.hash = row.dataset.href;
}

function onRecruitersInput(e) {
  if (e.target.dataset.search !== 'recruiters') return;
  rcl.search = e.target.value;
  rcl.page = 1;
  renderRecruiterRows();
}

/* ---------- Recruiter ---------- */
const recruiterForm = { routeId: null, dirty: false, hash: '', label: 'on this recruiter' };
formGuards.recruiter = recruiterForm;
const rcd = { id: null, sortKey: 'code', sortDir: 'asc', page: 1 };
const RCD_SORTERS = {
  code: (s) => s.country,
  country: (s) => countryName(s.country).toLowerCase(),
  pending: (s) => s.pending,
  active: (s) => s.active,
  p2w: (s) => s.p2w,
  pr: (s) => prValue(s.p2w, s.active),
};

function renderRecruiter(id) {
  const rec = id === 'new' ? null : recruiters.find((x) => x.id === Number(id));
  if (id !== 'new' && !rec) {
    history.replaceState(null, '', '#/recruiters');
    showToast("That recruiter couldn't be found.", 'info');
    showPage('recruiters');
    return;
  }
  if (rcd.id !== id) Object.assign(rcd, { id, sortKey: 'code', sortDir: 'asc', page: 1 });
  Object.assign(recruiterForm, { routeId: id, dirty: false, hash: `#/recruiters/${id}` });
  document.title = `${rec ? rec.name : 'New recruiter'} · Base`;

  const root = $('#recruiterView');
  root.innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/recruiters" title="Back to recruiters" aria-label="Back to recruiters"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">Recruiter</h1>
        <p class="page-sub">${rec ? `${escapeHtml(rec.name)} · recruiter #${rec.id} · since ${fmtDate(rec.createdAt)}` : 'Add a source of new panelists. Its sign-ups show up here once they arrive.'}</p>
      </div>
    </header>

    <section class="pv-card">
      <form id="recruiterForm" novalidate autocomplete="off">
        <div class="hf-row rc-name-row">
          <label class="form-label" for="rcName">Name</label>
          <div class="hf-field">
            <input class="form-control" id="rcName" name="name" required maxlength="80" value="${rec ? escapeHtml(rec.name) : ''}">
            <div class="invalid-feedback" id="rcNameFeedback">Enter a name.</div>
          </div>
        </div>
        <div class="pv-form-actions">
          <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> ${rec ? 'Save' : 'Create recruiter'}</button>
          <button type="button" class="btn btn-ghost" data-rc-action="cancel">Cancel</button>
          <span class="dirty-flag" id="rcDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
        </div>
      </form>
    </section>

    <section class="pv-card flush">
      <div class="table-responsive">
        <table class="pv-table list-table rc-table">
          <thead id="rcdHead"></thead>
          <tbody id="rcdRows"></tbody>
          <tfoot id="rcdFoot"></tfoot>
        </table>
      </div>
      <div class="table-footer" id="rcdFooter"></div>
    </section>`;

  const form = $('#recruiterForm');
  form.addEventListener('input', () => {
    if (recruiterForm.dirty) return;
    recruiterForm.dirty = true;
    $('#rcDirty').hidden = false;
  });
  form.addEventListener('submit', saveRecruiter);
  root.onclick = onRecruiterClick;
  renderRecruiterStats();
  if (!rec) $('#rcName').focus();
}

function renderRecruiterStats() {
  const rec = recruiters.find((x) => x.id === Number(rcd.id));
  const stats = rec ? rec.stats : [];
  const get = RCD_SORTERS[rcd.sortKey];
  const dir = rcd.sortDir === 'asc' ? 1 : -1;
  const list = [...stats].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (x < y) return -dir;
    if (x > y) return dir;
    return a.country.localeCompare(b.country);
  });
  const { rows, page, pages, start } = paginate(list, rcd.page, RECRUITERS_PAGE_SIZE);
  rcd.page = page;
  $('#rcdHead').innerHTML = `
    <tr>
      ${sortTh('country', 'Country', rcd, 'rcd-sort')}${sortTh('pending', 'Pending', rcd, 'rcd-sort')}${sortTh('active', 'Active', rcd, 'rcd-sort')}
      ${sortTh('p2w', 'P2W active', rcd, 'rcd-sort')}${sortTh('pr', 'PR%', rcd, 'rcd-sort')}
    </tr>`;
  $('#rcdRows').innerHTML = rows.length
    ? rows.map((s) => `
        <tr>
          <td>${escapeHtml(countryName(s.country))}</td>
          <td class="num-l">${fmtInt(s.pending)}</td>
          <td class="num-l">${fmtInt(s.active)}</td>
          <td class="num-l">${fmtInt(s.p2w)}</td>
          <td class="num-l">${prPct(s.p2w, s.active)}</td>
        </tr>`).join('')
    : emptyRow(5, 'No sign-ups yet', 'Sign-ups per country show up here once this recruiter brings in panelists.');
  const t = recruiterTotals({ stats });
  $('#rcdFoot').innerHTML = stats.length
    ? `<tr><td>All countries (${fmtInt(stats.length)})</td><td class="num-l">${fmtInt(t.pending)}</td><td class="num-l">${fmtInt(t.active)}</td><td class="num-l">${fmtInt(t.p2w)}</td><td class="num-l">${prPct(t.p2w, t.active)}</td></tr>`
    : '';
  $('#rcdFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> countries` : 'No countries yet'}</span>
    <nav aria-label="Country pages">${pagerHtml(page, pages, 'rcd-page')}</nav>`;
}

function onRecruiterClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-rcd-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      rcd.page = Number(pageBtn.dataset.rcdPage);
      renderRecruiterStats();
    }
    return;
  }
  const sort = t.closest('[data-rcd-sort]');
  if (sort) {
    const key = sort.dataset.rcdSort;
    rcd.sortDir = rcd.sortKey === key && rcd.sortDir === 'asc' ? 'desc' : 'asc';
    rcd.sortKey = key;
    rcd.page = 1;
    renderRecruiterStats();
    return;
  }
  if (t.closest('[data-rc-action="cancel"]')) {
    recruiterForm.dirty = false;
    location.hash = '#/recruiters';
  }
}

function saveRecruiter(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const rec = recruiterForm.routeId === 'new' ? null : recruiters.find((x) => x.id === Number(recruiterForm.routeId));
  const input = form.elements.name;
  const name = input.value.trim();
  const taken = recruiters.some((x) => x !== rec && x.name.toLowerCase() === name.toLowerCase());
  input.setCustomValidity(taken ? 'taken' : '');
  $('#rcNameFeedback').textContent = taken ? 'Another recruiter already has this name.' : 'Enter a name.';
  form.classList.add('was-validated');
  if (!form.checkValidity()) {
    input.focus();
    return;
  }
  recruiterForm.dirty = false;
  if (rec) {
    rec.name = name;
    rcl.flashId = rec.id;
    $('#rcDirty').hidden = true;
    form.classList.remove('was-validated');
    document.title = `${name} · Base`;
    $('#recruiterView .page-sub').textContent = `${name} · recruiter #${rec.id} · since ${fmtDate(rec.createdAt)}`;
    showToast(`${name} saved.`);
    return;
  }
  const created = { id: Math.max(0, ...recruiters.map((x) => x.id)) + 1, name, createdAt: Date.now(), stats: [] };
  recruiters.push(created);
  rcl.flashId = created.id;
  location.hash = `#/recruiters/${created.id}`;
  showToast(`${name} created.`);
}
