'use strict';

// First surveys: the survey each panel sends its new members first.

// Built on first render: the newest project in a country the panel covers (Gavenze gets two, different countries).
let firstSurveys = null;
const fs = { sortDir: 'desc', page: 1, mounted: false };

function ensureFirstSurveys() {
  if (firstSurveys) return firstSurveys;
  const used = new Set();
  firstSurveys = [];
  PANEL_INFO.forEach((panel) => {
    const codes = new Set(panel.countries.map((c) => c[0]));
    const picks = projects.filter((p) => codes.has(p.country.code) && !used.has(p.id)).sort((a, b) => b.id - a.id);
    const take = (panel.slug === 'gavenze' ? 2 : 1);
    picks.filter((p, i, arr) => arr.findIndex((x) => x.country.code === p.country.code) === i).slice(0, take).forEach((p) => {
      used.add(p.id);
      firstSurveys.push({ projectId: p.id, panel: panel.slug });
    });
  });
  return firstSurveys;
}

function renderFirstSurveys() {
  document.title = 'First surveys · Base';
  const root = $('#firstSurveysView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">First surveys</h1>
      <p class="page-sub">The survey each panel sends to new members first.</p>
    </header>
    <section class="pv-card flush">
      <div class="table-responsive">
        <table class="pv-table list-table fs-table">
          <thead id="fsHead"></thead>
          <tbody id="fsRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="fsFooter"></div>
    </section>`;
  if (!fs.mounted) {
    root.addEventListener('click', onFirstSurveysClick);
    fs.mounted = true;
  }
  renderFirstSurveyRows();
}

function renderFirstSurveyRows() {
  const desc = fs.sortDir === 'desc';
  const list = ensureFirstSurveys()
    .map((f) => ({ ...f, project: projects.find((p) => p.id === f.projectId) }))
    .filter((f) => f.project)
    .sort((a, b) => (desc ? b.projectId - a.projectId : a.projectId - b.projectId));
  const { rows, page, pages, start } = paginate(list, fs.page, 10);
  fs.page = page;
  $('#fsHead').innerHTML = `
    <tr>
      <th aria-sort="${desc ? 'descending' : 'ascending'}"><button type="button" class="th-sort" data-fs-action="sort">ID <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button></th>
      <th>Project name</th><th>Panel</th><th class="t-num col-hl">C1</th><th>Status</th>
    </tr>`;
  $('#fsRows').innerHTML = rows.length
    ? rows.map(({ project: p, panel }) => `
        <tr class="row-link" data-href="#/project/${p.id}">
          <td class="col-id">${p.id}</td>
          <td><a class="cell-link" href="#/project/${p.id}">${p.jobNo} ${escapeHtml(p.name)} ${escapeHtml(p.country.name.toUpperCase())}</a></td>
          <td>${escapeHtml(panelLabel(panelBySlug(panel)))}</td>
          <td class="t-num col-hl${p.c1 ? '' : ' zero'}">${fmtInt(p.c1)}</td>
          <td><span class="fs-status is-${p.status.toLowerCase()}">${p.status.toLowerCase()}</span></td>
        </tr>`).join('')
    : emptyRow(5, 'No first surveys yet', 'Pick a project as a panel’s first survey to see it here.');
  $('#fsFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> surveys` : 'Nothing to show'}</span>
    <nav aria-label="First survey pages">${pagerHtml(page, pages, 'fs-page')}</nav>`;
}

function onFirstSurveysClick(e) {
  const pageBtn = e.target.closest('[data-fs-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      fs.page = Number(pageBtn.dataset.fsPage);
      renderFirstSurveyRows();
    }
    return;
  }
  if (e.target.closest('[data-fs-action="sort"]')) {
    fs.sortDir = fs.sortDir === 'desc' ? 'asc' : 'desc';
    renderFirstSurveyRows();
    return;
  }
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button')) location.hash = row.dataset.href;
}
