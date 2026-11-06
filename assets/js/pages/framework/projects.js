'use strict';

// FW - Active/Closed: lists and the read-only project view.

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
