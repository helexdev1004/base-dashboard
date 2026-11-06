'use strict';

// Project exclusions tab.

// Each row: one project, the statuses to exclude from it, and how far back (e.g. 12 months).
const allExclusionStatuses = () => EXCLUSION_STATUSES.map(([code]) => code);
const copyExclusions = (rows) => rows.map((x) => ({ ...x, statuses: [...x.statuses] }));
const newExclusionRow = (rows) => ({
  id: Math.max(0, ...rows.map((x) => x.id)) + 1, projectId: null, statuses: allExclusionStatuses(), period: 12, unit: 'months',
});

function renderExclusions(el) {
  const p = pv.project;
  if (!pv.exDraft) pv.exDraft = copyExclusions(p.detail.exclusions);
  const rows = pv.exDraft;
  const dirty = pv.unsaved.has('exclusions');
  el.innerHTML = `
    <form class="pv-card flush ex-card" id="exForm" novalidate autocomplete="off">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-ex="add"><i class="bi bi-plus-lg"></i> Add project</button>
        <span class="pv-toolbar-note">${SURVEY_GROUP_HELP}</span>
        <span class="dirty-flag ms-auto" id="exDirty" ${dirty ? '' : 'hidden'}><i class="bi bi-circle-fill"></i> Unsaved changes</span>
      </div>
      ${rows.length ? `
        <div class="ex-grid" role="table" aria-label="Project exclusions">
          <div class="ex-row ex-head" role="row">
            <span role="columnheader">Project to exclude</span><span role="columnheader">Statuses to exclude</span>
            <span role="columnheader">Time period</span><span role="columnheader"><span class="visually-hidden">Remove</span></span>
          </div>
          ${rows.map((row) => `
            <div class="ex-row" role="row" data-row="${row.id}">
              <div class="ex-cell" role="cell">
                <label class="visually-hidden" for="exProject-${row.id}">Project to exclude</label>
                <div id="exProjectBox-${row.id}"></div>
                <div class="invalid-feedback" id="exProjectMsg-${row.id}">Select a project.</div>
              </div>
              <div class="ex-cell" role="cell">
                <div class="ex-statuses">
                  <div id="exStatusBox-${row.id}"></div>
                  <button type="button" class="icon-btn-sm ex-reset" data-ex="reset" title="Reset to all statuses" aria-label="Reset to all statuses"><i class="bi bi-arrow-counterclockwise"></i></button>
                </div>
                <div class="invalid-feedback" id="exStatusMsg-${row.id}">Pick at least one status.</div>
              </div>
              <div class="ex-cell" role="cell">
                <div class="ex-period">
                  <input class="form-control" type="number" inputmode="numeric" min="1" max="999" step="1" required value="${row.period}"
                         data-ex-field="period" aria-label="Time period, number of ${row.unit}">
                  <select class="form-select" data-ex-field="unit" aria-label="Weeks or months">${optionsHtml(EXCLUSION_UNITS, row.unit)}</select>
                </div>
                <div class="invalid-feedback" id="exPeriodMsg-${row.id}">Enter a whole number from 1 to 999.</div>
              </div>
              <div class="ex-cell ex-del-cell" role="cell">
                <button type="button" class="icon-btn-sm danger" data-ex="remove" title="Remove this project" aria-label="Remove this project"><i class="bi bi-trash3"></i></button>
              </div>
            </div>`).join('')}
        </div>` : `
        <div class="pv-empty-block">
          <i class="bi bi-funnel"></i>
          <div class="empty-title">No projects excluded</div>
          <div class="empty-text">Add a project to keep its respondents out of this one.</div>
        </div>`}
      <div class="ex-actions">
        <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> Save</button>
        <button type="button" class="btn btn-ghost" data-ex="cancel">Cancel</button>
      </div>
    </form>`;

  const others = projects.filter((x) => x !== p).map((x) => ({ value: String(x.id), label: `#${x.jobNo} ${x.name}`, hint: x.country.name }));
  const statusOpts = EXCLUSION_STATUSES.map(([code, label]) => ({ value: code, label: code, hint: label }));
  rows.forEach((row) => {
    createComboBox($(`#exProjectBox-${row.id}`), {
      id: `exProject-${row.id}`,
      options: others,
      value: row.projectId ? String(row.projectId) : '',
      placeholder: 'Select a project',
      onChange: (value) => {
        row.projectId = value ? Number(value) : null;
        if (value) $(`#exProjectMsg-${row.id}`).classList.remove('d-block');
        markExclusionsDirty();
      },
    });
    row.picker = createCheckSelect($(`#exStatusBox-${row.id}`), {
      id: `exStatuses-${row.id}`,
      options: statusOpts,
      selected: row.statuses,
      allLabel: 'All', // the column says Statuses; "All 15" fits the narrow box
      placeholder: 'Select statuses',
      searchLabel: 'Search statuses…',
      onChange: (value) => {
        row.statuses = value;
        if (value.length) $(`#exStatusMsg-${row.id}`).classList.remove('d-block');
        markExclusionsDirty();
      },
    });
  });

  el.onclick = onExclusionsClick;
  el.oninput = onExclusionsInput;
  el.onchange = onExclusionsInput;
  el.onkeydown = (e) => {
    // The period only takes digits.
    if (e.target.dataset.exField === 'period' && ['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
  };
  el.onsubmit = saveExclusions;
}

function markExclusionsDirty() {
  pv.unsaved.add('exclusions');
  const flag = $('#exDirty');
  if (flag) flag.hidden = false;
}

const exclusionRowOf = (target) => pv.exDraft.find((x) => x.id === Number(target.closest('[data-row]')?.dataset.row));

function onExclusionsClick(e) {
  const el = e.target.closest('[data-ex]');
  if (!el) return;
  const row = exclusionRowOf(el);
  switch (el.dataset.ex) {
    case 'add':
      pv.exDraft.push(newExclusionRow(pv.exDraft));
      markExclusionsDirty();
      renderPanel('exclusions');
      $(`#exProject-${pv.exDraft.at(-1).id}`).focus();
      break;
    case 'remove':
      pv.exDraft.splice(pv.exDraft.indexOf(row), 1);
      markExclusionsDirty();
      renderPanel('exclusions');
      break;
    case 'reset':
      row.statuses = allExclusionStatuses();
      row.picker.setValue(row.statuses);
      $(`#exStatusMsg-${row.id}`).classList.remove('d-block');
      markExclusionsDirty();
      break;
    case 'cancel':
      pv.exDraft = null;
      pv.unsaved.delete('exclusions');
      renderPanel('exclusions');
      break;
    default:
  }
}

function onExclusionsInput(e) {
  const field = e.target.dataset.exField;
  if (!field) return;
  const row = exclusionRowOf(e.target);
  if (field === 'period') {
    row.period = e.target.value === '' ? '' : Number(e.target.value);
    e.target.classList.remove('is-invalid');
    $(`#exPeriodMsg-${row.id}`).classList.remove('d-block');
  } else {
    row.unit = e.target.value;
    e.target.previousElementSibling.setAttribute('aria-label', `Time period, number of ${row.unit}`);
  }
  markExclusionsDirty();
}

function saveExclusions(e) {
  e.preventDefault();
  const seen = new Set();
  let firstBad = null;
  const flag = (control, msg, bad) => {
    control.classList.toggle('is-invalid', bad);
    msg.classList.toggle('d-block', bad);
    return bad;
  };
  pv.exDraft.forEach((row) => {
    const dupe = Boolean(row.projectId) && seen.has(row.projectId);
    if (row.projectId) seen.add(row.projectId);
    $(`#exProjectMsg-${row.id}`).textContent = dupe ? 'This project is already excluded in another row.' : 'Select a project.';
    const badProject = flag($(`#exProjectBox-${row.id}`), $(`#exProjectMsg-${row.id}`), !row.projectId || dupe);
    const badStatuses = flag($(`#exStatusBox-${row.id}`), $(`#exStatusMsg-${row.id}`), !row.statuses.length);
    const period = $(`[data-row="${row.id}"] [data-ex-field="period"]`);
    const badPeriod = flag(period, $(`#exPeriodMsg-${row.id}`), !Number.isInteger(row.period) || row.period < 1 || row.period > 999);
    if (!firstBad && (badProject || badStatuses || badPeriod)) {
      firstBad = badProject ? $(`#exProject-${row.id}`) : badStatuses ? $(`#exStatuses-${row.id}`) : period;
    }
  });
  if (firstBad) {
    firstBad.focus();
    return;
  }
  pv.project.detail.exclusions = pv.exDraft.map(({ id, projectId, statuses, period, unit }) => ({ id, projectId, statuses: [...statuses], period, unit }));
  pv.exDraft = null;
  pv.unsaved.delete('exclusions');
  renderPanel('exclusions');
  const n = pv.project.detail.exclusions.length;
  showToast(n ? `Project exclusions saved (${plural(n, 'project')}).` : 'Project exclusions saved: no projects excluded.');
}
