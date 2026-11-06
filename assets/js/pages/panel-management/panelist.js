'use strict';

// Panelist page: profile form, project history and point history.

const panelistForm = { routeId: null, dirty: false, hash: '', label: 'on this panelist' };
formGuards.panelist = panelistForm;
const pp = { key: '', panel: null, index: -1, tab: 'basic', hist: 'projects', projSearch: '', projSort: 'asc', projPage: 1, pointSort: 'desc', pointPage: 1 };

function renderPanelist(slug, id) {
  const panel = panelBySlug(slug);
  const m = panel && findMember(panel, id);
  if (!m) {
    const back = panel ? `#/panels/${panel.slug}` : '#/panels';
    history.replaceState(null, '', back);
    showToast("That panelist couldn't be found.", 'info');
    if (panel) showPage('panel', { panel: panel.slug });
    else showPage('panels');
    return;
  }
  const key = `${slug}/${id}`;
  if (pp.key !== key) Object.assign(pp, { key, tab: 'basic', hist: 'projects', projSearch: '', projSort: 'asc', projPage: 1, pointSort: 'desc', pointPage: 1 });
  Object.assign(pp, { panel, index: m.index });
  Object.assign(panelistForm, { routeId: key, dirty: false, hash: `#/panels/${slug}/${id}` });
  document.title = `${memberName(m)} · ${panelLabel(panel)} · Base`;

  const root = $('#panelistView');
  root.innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/panels/${panel.slug}" title="Back to ${escapeHtml(panelLabel(panel))}" aria-label="Back to ${escapeHtml(panelLabel(panel))}"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">Panelist</h1>
        <p class="page-sub" id="pfSub"></p>
      </div>
    </header>

    <section class="pv-card pf-card">
      <div class="pv-tabs pf-tabs" role="tablist" aria-label="Panelist details">
        ${[['basic', 'Basic'], ['profiling', 'Profiling']].map(([tab, label]) => `
          <button type="button" class="pv-tab${pp.tab === tab ? ' active' : ''}" role="tab" id="pfTab-${tab}" data-pf-tab="${tab}"
                  aria-controls="pfPanel-${tab}" aria-selected="${pp.tab === tab}" tabindex="${pp.tab === tab ? 0 : -1}">${label}</button>`).join('')}
        <span class="dirty-flag ms-auto" id="pfDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
      </div>
      <div class="pf-tabpanel" role="tabpanel" id="pfPanel-basic" aria-labelledby="pfTab-basic" ${pp.tab === 'basic' ? '' : 'hidden'}></div>
      <div class="pf-tabpanel" role="tabpanel" id="pfPanel-profiling" aria-labelledby="pfTab-profiling" ${pp.tab === 'profiling' ? '' : 'hidden'}>
        <div class="pv-empty-block">
          <i class="bi bi-person-lines-fill"></i>
          <div class="empty-title">No profiling data yet</div>
          <div class="empty-text">Answers from profiling surveys will show up here.</div>
        </div>
      </div>
    </section>

    <section class="pv-card flush">
      <div class="pv-tabs pf-hist-tabs" role="tablist" aria-label="History">
        ${[['projects', 'Project history'], ['points', 'Point history']].map(([tab, label]) => `
          <button type="button" class="pv-tab${pp.hist === tab ? ' active' : ''}" role="tab" id="phTab-${tab}" data-ph-tab="${tab}"
                  aria-controls="phPanel" aria-selected="${pp.hist === tab}" tabindex="${pp.hist === tab ? 0 : -1}">${label}</button>`).join('')}
      </div>
      <div role="tabpanel" id="phPanel" aria-labelledby="phTab-${pp.hist}"></div>
    </section>`;

  renderPanelistForm();
  renderHistoryPanel();
  root.onclick = onPanelistClick;
  root.oninput = onPanelistInput;
  root.onchange = onPanelistChange;
  root.onsubmit = savePanelist;
  root.onkeydown = onPanelistKeys;
}

function renderPanelistSub(m) {
  $('#pfSub').innerHTML = `${escapeHtml(memberName(m))} · #${m.id} · ${escapeHtml(panelLabel(pp.panel))} · ${memberStatusHtml(m.status)}`;
}

function renderPanelistForm() {
  const panel = pp.panel;
  const m = memberAt(panel, pp.index);
  const points = memberPoints(panel, pp.index);
  renderPanelistSub(m);
  const row = (label, field, id) => `
    <div class="pf-row">
      ${id ? `<label class="form-label" for="${id}">${label}</label>` : `<span class="form-label">${label}</span>`}
      <div class="pf-field">${field}</div>
    </div>`;
  const select = (id, name, opts, value, blank) => `
    <select class="form-select" id="${id}" name="${name}">${blank ? `<option value="">${blank}</option>` : ''}${optionsHtml(opts, value)}</select>`;
  const regionOpts = (country, value) => {
    const list = regionsFor(country);
    return (value && !list.includes(value) ? [value, ...list] : list).map((r) => [r, r]);
  };

  $('#pfPanel-basic').innerHTML = `
    <form id="panelistForm" class="pf-form" novalidate autocomplete="off">
      <div class="pf-grid">
        ${row('Email', `
          <input class="form-control" type="email" id="pfEmail" name="email" required maxlength="120" value="${escapeHtml(m.email)}">
          <div class="invalid-feedback" id="pfEmailFeedback">Enter a valid email address.</div>`, 'pfEmail')}
        ${row('Reliable', `
          <div class="segmented seg-field" role="group" aria-label="Reliable" data-pf-reliable>
            <button type="button" data-pf-action="reliable" data-value="1" class="${m.reliable ? 'active' : ''}" aria-pressed="${m.reliable}">Yes</button>
            <button type="button" data-pf-action="reliable" data-value="0" class="${m.reliable ? '' : 'active'}" aria-pressed="${!m.reliable}">No</button>
          </div>`)}
        <div class="pf-row pf-wide">
          <span class="form-label">PUUID / RESPID</span>
          <div class="pf-field"><span class="pf-static mono">${escapeHtml(m.puuid)}</span>
            <button type="button" class="icon-btn-sm" data-pf-action="copy-puuid" title="Copy" aria-label="Copy PUUID"><i class="bi bi-copy"></i></button></div>
        </div>
        ${row('First name', `<input class="form-control" id="pfFirst" name="first" maxlength="60" value="${escapeHtml(m.first)}">`, 'pfFirst')}
        ${row('Last name', `<input class="form-control" id="pfLast" name="last" maxlength="60" value="${escapeHtml(m.last)}">`, 'pfLast')}
        ${row('Birthdate', `<input class="form-control" type="date" id="pfBirth" name="birthdate" min="1900-01-01" max="${isoDay(Date.now())}" value="${m.birthdate}">`, 'pfBirth')}
        ${row('Gender', select('pfGender', 'gender', GENDERS.map((g) => [g, g]), m.gender, m.gender ? '' : 'Not set'), 'pfGender')}
        ${row('Country', `${select('pfCountry', 'country', countryOptions(), m.country)}`, 'pfCountry')}
        ${row('Region', select('pfRegion', 'region', regionOpts(m.country, m.region), m.region, 'Not set'), 'pfRegion')}
        ${row('Postal code', `<input class="form-control" id="pfPostal" name="postal" maxlength="12" value="${escapeHtml(m.postal)}">`, 'pfPostal')}
        ${row('Language', select('pfLanguage', 'language', LANGUAGES.map((l) => [l, l]), m.language), 'pfLanguage')}
        ${row('Created', `<span class="pf-static mono">${new Date(m.createdAt).toISOString()}</span>`)}
        ${row('Last login', `<span class="pf-static mono">${m.lastLoginAt ? new Date(m.lastLoginAt).toISOString() : 'Never'}</span>`)}
        ${row('Status', select('pfStatus', 'status', MEMBER_STATUSES.map((s) => [s, s]), m.status), 'pfStatus')}
        ${row('Points', `<span class="pf-static"><strong class="num">${fmtInt(points)}</strong>
          <button type="button" class="btn-link-sm" data-pf-action="to-points">Point history</button></span>`)}
      </div>
      <div class="pv-form-actions">
        <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> Save</button>
        <button type="button" class="btn btn-ghost" data-pf-action="cancel">Cancel</button>
        <button type="button" class="btn btn-ghost ms-auto" data-pf-action="forgot" ${m.status === 'deleted' ? 'disabled title="Deleted accounts can\'t sign in"' : ''}>
          <i class="bi bi-envelope"></i> Forgot password
        </button>
      </div>
    </form>`;
}

function markPanelistDirty() {
  if (panelistForm.dirty) return;
  panelistForm.dirty = true;
  $('#pfDirty').hidden = false;
}

function selectPanelistTab(attr, tab, focus) {
  if (attr === 'pf') {
    pp.tab = tab;
    $$('[data-pf-tab]').forEach((b) => {
      const on = b.dataset.pfTab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      $(`#pfPanel-${b.dataset.pfTab}`).hidden = !on;
      if (on && focus) b.focus();
    });
  } else {
    pp.hist = tab;
    $$('[data-ph-tab]').forEach((b) => {
      const on = b.dataset.phTab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    $('#phPanel').setAttribute('aria-labelledby', `phTab-${tab}`);
    renderHistoryPanel();
  }
}

function onPanelistKeys(e) {
  const tab = e.target.closest('[data-pf-tab], [data-ph-tab]');
  if (!tab || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const attr = tab.dataset.pfTab ? 'pf' : 'ph';
  const tabs = $$(`[data-${attr}-tab]`);
  const next = tabs[(tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  e.preventDefault();
  selectPanelistTab(attr, next.dataset[`${attr}Tab`], true);
}

function onPanelistClick(e) {
  const t = e.target;
  const pfTab = t.closest('[data-pf-tab]');
  if (pfTab) { selectPanelistTab('pf', pfTab.dataset.pfTab); return; }
  const phTab = t.closest('[data-ph-tab]');
  if (phTab) { selectPanelistTab('ph', phTab.dataset.phTab); return; }
  const pageBtn = t.closest('[data-ph-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      pp[pp.hist === 'projects' ? 'projPage' : 'pointPage'] = Number(pageBtn.dataset.phPage);
      renderHistoryPanel();
    }
    return;
  }
  if (t.closest('[data-search-go]')) { $('[data-search="history"]').focus(); return; }
  if (t.closest('[data-search-clear]')) {
    pp.projSearch = '';
    pp.projPage = 1;
    $('[data-search="history"]').value = '';
    renderHistoryRows();
    return;
  }
  const el = t.closest('[data-pf-action]');
  if (!el || el.disabled) return;
  const panel = pp.panel;
  const m = memberAt(panel, pp.index);
  switch (el.dataset.pfAction) {
    case 'reliable':
      $$('button', el.parentElement).forEach((b) => {
        b.classList.toggle('active', b === el);
        b.setAttribute('aria-pressed', String(b === el));
      });
      markPanelistDirty();
      break;
    case 'copy-puuid': copyText(m.puuid, 'PUUID copied.'); break;
    case 'to-points':
      selectPanelistTab('ph', 'points');
      $('#phPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    case 'cancel':
      panelistForm.dirty = false;
      $('#pfDirty').hidden = true;
      renderPanelistForm();
      break;
    case 'forgot': showToast(`Password reset email sent to ${m.email}.`); break;
    case 'proj-sort':
      pp.projSort = pp.projSort === 'asc' ? 'desc' : 'asc';
      renderHistoryRows();
      break;
    case 'point-sort':
      pp.pointSort = pp.pointSort === 'asc' ? 'desc' : 'asc';
      renderHistoryRows();
      break;
    case 'proj-export': exportProjectHistory(); break;
    case 'add-point': openAddPoint(); break;
    default:
  }
}

function onPanelistInput(e) {
  if (e.target.dataset.search === 'history') {
    pp.projSearch = e.target.value;
    pp.projPage = 1;
    renderHistoryRows();
    return;
  }
  if (e.target.closest('#panelistForm')) markPanelistDirty();
}

function onPanelistChange(e) {
  if (!e.target.closest('#panelistForm')) return;
  markPanelistDirty();
  if (e.target.name === 'country') {
    const regions = regionsFor(e.target.value);
    $('#pfRegion').innerHTML = `<option value="">Not set</option>${optionsHtml(regions.map((r) => [r, r]), '')}`;
    $('#pfLanguage').value = COUNTRY_LANGUAGE[e.target.value] || $('#pfLanguage').value;
  }
}

function savePanelist(e) {
  if (e.target.id !== 'panelistForm') return;
  e.preventDefault();
  const form = e.target;
  const panel = pp.panel;
  const d = panelData(panel);
  const m = memberAt(panel, pp.index);
  const email = form.elements.email.value.trim();
  let problem = '';
  if (!EMAIL_RE.test(email)) problem = 'Enter a valid email address.';
  else if (email.toLowerCase() !== m.email.toLowerCase() && emailTaken(panel, email, pp.index)) problem = 'Another member of this panel already uses this email.';
  form.elements.email.setCustomValidity(problem);
  $('#pfEmailFeedback').textContent = problem || 'Enter a valid email address.';
  form.classList.add('was-validated');
  if (!form.checkValidity()) {
    form.querySelector(':invalid')?.focus();
    return;
  }
  memberHistory(panel, pp.index); // keep the history as it was before the edit
  const saved = {
    ...m,
    email,
    reliable: $('[data-pf-reliable] .active').dataset.value === '1',
    first: form.elements.first.value.trim(),
    last: form.elements.last.value.trim(),
    birthdate: form.elements.birthdate.value,
    gender: form.elements.gender.value,
    country: form.elements.country.value,
    region: form.elements.region.value,
    postal: form.elements.postal.value.trim(),
    language: form.elements.language.value,
    status: form.elements.status.value,
  };
  if (pp.index < d.n) {
    d.edits.set(pp.index, saved);
    d.status[pp.index] = MEMBER_STATUSES.indexOf(saved.status);
    d.country[pp.index] = WORLD_INDEX.get(saved.country);
    if (d.keys) d.keys[pp.index] = undefined;
  } else {
    d.extra[pp.index - d.n] = saved;
  }
  panelistForm.dirty = false;
  $('#pfDirty').hidden = true;
  pl.flashId = saved.id;
  renderPanelistForm();
  showToast(`${memberName(saved)} saved.`);
}

/* History tables */
function renderHistoryPanel() {
  const projectsTab = pp.hist === 'projects';
  $('#phPanel').innerHTML = `
    <div class="list-filters">
      ${projectsTab
        ? `${searchGroupHtml('history', 'Search projects…', pp.projSearch)}
           <button type="button" class="btn btn-export btn-sm-h" data-pf-action="proj-export"><i class="bi bi-download"></i> Export data</button>`
        : `<button type="button" class="btn btn-ghost btn-sm-h" data-pf-action="add-point"><i class="bi bi-plus-circle"></i> Add point</button>
           <span class="pv-toolbar-note" id="phBalance"></span>`}
    </div>
    <div class="table-responsive">
      <table class="pv-table list-table ph-table">
        <thead id="phHead"></thead>
        <tbody id="phRows"></tbody>
      </table>
    </div>
    <div class="table-footer" id="phFooter"></div>`;
  renderHistoryRows();
}

const sortHead = (label, dir, action) => `
  <th aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}">
    <button type="button" class="th-sort" data-pf-action="${action}">${label} <i class="bi bi-caret-${dir === 'asc' ? 'up' : 'down'}-fill"></i></button>
  </th>`;

function visibleInvites() {
  const h = memberHistory(pp.panel, pp.index);
  const q = pp.projSearch.trim().toLowerCase();
  const list = h.invites.filter((v) => !q || `${v.id} ${v.project.jobNo} ${v.project.id} ${v.project.name} ${v.status}`.toLowerCase().includes(q));
  return pp.projSort === 'asc' ? list : [...list].reverse();
}

function renderHistoryRows() {
  const panel = pp.panel;
  const h = memberHistory(panel, pp.index);
  if (pp.hist === 'projects') {
    const list = visibleInvites();
    const { rows, page, pages, start } = paginate(list, pp.projPage, HISTORY_PAGE_SIZE);
    pp.projPage = page;
    $('#phHead').innerHTML = `<tr><th>ID</th><th>Survey number</th><th>Project ID</th><th>Project</th><th>Status</th><th class="t-end">Points</th>${sortHead('Earned', pp.projSort, 'proj-sort')}</tr>`;
    $('#phRows').innerHTML = rows.length
      ? rows.map((v) => `
          <tr>
            <td class="col-id">${v.id}</td>
            <td>${v.project.jobNo}</td>
            <td>${projects.includes(v.project) ? `<a class="cell-link" href="#/project/${v.project.id}">${v.project.id}</a>` : v.project.id}</td>
            <td>${escapeHtml(v.project.name)}</td>
            <td><span class="inv-status is-${v.status.replace(' ', '-')}">${v.status}</span></td>
            <td class="t-end num">${v.points ? fmtInt(v.points) : ''}</td>
            <td class="t-muted">${fmtStampSec(v.at)}</td>
          </tr>`).join('')
      : emptyRow(7, pp.projSearch ? 'No projects found' : 'No project history yet', pp.projSearch ? 'Try a different search.' : 'Survey invitations will show up here.');
    $('#phFooter').innerHTML = `
      <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> invitations` : 'Nothing to show'}</span>
      <nav aria-label="Project history pages">${pagerHtml(page, pages, 'ph-page')}</nav>`;
    return;
  }
  const list = [...h.log].sort((a, b) => (pp.pointSort === 'asc' ? a.at - b.at : b.at - a.at));
  const { rows, page, pages, start } = paginate(list, pp.pointPage, HISTORY_PAGE_SIZE);
  pp.pointPage = page;
  $('#phBalance').innerHTML = `Balance: <strong>${plural(pointsBalance(h), 'point')}</strong>`;
  $('#phHead').innerHTML = `<tr><th>ID</th><th>Type</th><th>Reference ID</th><th class="t-end">Points</th>${sortHead('Earned', pp.pointSort, 'point-sort')}</tr>`;
  $('#phRows').innerHTML = rows.length
    ? rows.map((e) => `
        <tr>
          <td class="col-id">${e.id}</td>
          <td>${e.type}</td>
          <td>${e.type === 'exchange' || e.type === 'refund' ? `<a class="cell-link" href="#/redeem" data-redeem-ref="${e.ref}">${e.ref}</a>` : e.ref}</td>
          <td class="t-end num ${e.points < 0 ? 'pts-neg' : 'pts-pos'}">${e.points > 0 ? '+' : ''}${fmtInt(e.points)}</td>
          <td class="t-muted">${fmtStampSec(e.at)}</td>
        </tr>`).join('')
    : emptyRow(5, 'No points yet', 'Points are added when the member completes surveys or profiling.');
  $('#phFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> entries` : 'Nothing to show'}</span>
    <nav aria-label="Point history pages">${pagerHtml(page, pages, 'ph-page')}</nav>`;
  $$('[data-redeem-ref]', $('#phRows')).forEach((a) => {
    a.addEventListener('click', () => { redeemState.search = a.dataset.redeemRef; redeemState.status = ''; redeemState.page = 1; });
  });
}

function exportProjectHistory() {
  const m = memberAt(pp.panel, pp.index);
  const list = visibleInvites();
  downloadCsv(`panelist-${m.id}-project-history-${today()}.csv`, [
    ['ID', 'Survey number', 'Project ID', 'Project', 'Status', 'Points', 'Earned'],
    ...list.map((v) => [v.id, v.project.jobNo, v.project.id, v.project.name, v.status, v.points || '', fmtStampSec(v.at)]),
  ]);
  showToast(`Exported ${plural(list.length, 'invitation')}.`);
}

function openAddPoint() {
  const panel = pp.panel;
  const i = pp.index;
  const m = memberAt(panel, i);
  const balance = pointsBalance(memberHistory(panel, i));
  openFormModal({
    title: 'Add point',
    subtitle: `${memberName(m)} · balance ${plural(balance, 'point')}`,
    body: `
      <div class="row g-3">
        <div class="col-sm-6">
          <label class="form-label" for="apType">Type</label>
          <select class="form-select" id="apType" name="type">${optionsHtml(POINT_TYPES.map((t) => [t, t]), 'bonus')}</select>
        </div>
        <div class="col-sm-6">
          <label class="form-label" for="apRef">Reference ID</label>
          <input class="form-control" type="number" id="apRef" name="ref" min="1" step="1" value="1" required>
          <div class="invalid-feedback">Enter a reference ID.</div>
        </div>
        <div class="col-12">
          <label class="form-label" for="apPoints">Points</label>
          <input class="form-control" type="number" id="apPoints" name="points" step="1" min="-100000" max="100000" required aria-describedby="apPointsHelp">
          <div class="invalid-feedback" id="apPointsFeedback">Enter a whole number other than 0.</div>
          <div class="field-help" id="apPointsHelp">Use a negative number to take points away.</div>
        </div>
      </div>`,
    submitLabel: '<i class="bi bi-plus-lg"></i> Add',
    onSubmit: (form) => {
      const input = form.elements.points;
      const points = Number(input.value);
      let problem = '';
      if (!Number.isInteger(points) || points === 0) problem = 'Enter a whole number other than 0.';
      else if (balance + points < 0) problem = `The balance can't go below 0 (it's ${fmtInt(balance)} now).`;
      if (problem) {
        input.setCustomValidity(problem);
        $('#apPointsFeedback').textContent = problem;
        form.classList.add('was-validated');
        input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
        return false;
      }
      addPointEntry(panel, i, { type: form.elements.type.value, ref: Number(form.elements.ref.value), points });
      Object.assign(pp, { pointSort: 'desc', pointPage: 1 });
      if (currentView === 'panelist' && pp.panel === panel && pp.index === i) {
        renderHistoryRows();
        const strong = $('#panelistForm .pf-static strong');
        if (strong) strong.textContent = fmtInt(balance + points);
      }
      showToast(`${points > 0 ? 'Added' : 'Took away'} ${plural(Math.abs(points), 'point')}.`);
      return true;
    },
  });
}
