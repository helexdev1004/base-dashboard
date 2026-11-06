'use strict';

// Main tab: the project form and the fieldwork metric boxes. Also the New Project form.

// Creating and editing projects lives in project.js (the Main tab).
function nextJobNo() {
  return Math.max(...projects.map((p) => p.jobNo)) + 1;
}

function mainValues() {
  const p = pv.project;
  if (!p) {
    pv.draftLink = pv.draftLink || makeLiveLink();
    return {
      name: '', pms: ['RA'], client: '', surveyNo: nextJobNo(), po: '', length: '',
      geoIp: true, blockDupIp: true, country: '', status: 'Live', type: 'ad hoc',
      notes: '', liveLink: pv.draftLink,
    };
  }
  const d = p.detail;
  return {
    name: p.name, pms: p.pms.map((x) => x.initials), client: p.client, surveyNo: p.jobNo, po: p.po,
    length: p.loiBid, geoIp: d.geoIp, blockDupIp: d.blockDupIp, country: p.country.code, status: p.status,
    type: d.type, notes: d.notes, liveLink: d.liveLink,
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
            <div class="mf-field mf-client">
              <label class="form-label" for="mfClient">Client</label>
              <select class="form-select" id="mfClient" required>${optionsHtml(clientOpts, v.client)}</select>
              <div class="invalid-feedback">Select a client.</div>
            </div>
            <div class="mf-field mf-w-country">
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
            <div class="mf-field mf-w-num">
              <label class="form-label" for="mfSurveyNo">MFJN</label>
              <input class="form-control" id="mfSurveyNo" type="number" min="1" step="1" required value="${v.surveyNo}">
              <div class="invalid-feedback" id="mfSurveyNoFeedback">Enter the MFJN.</div>
            </div>
            <div class="mf-field mf-w-num">
              <label class="form-label" for="mfPo">MFPO</label>
              <input class="form-control" id="mfPo" maxlength="40" value="${escapeHtml(v.po)}" placeholder="MFPO">
            </div>
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
            <div class="mf-field">${toggleHtml('geoIp', 'Geo IP check', v.geoIp)}</div>
            <div class="mf-field">${toggleHtml('blockDupIp', 'Block duplicated IP', v.blockDupIp)}</div>
          </div>

          <div class="mf-field">
            <label class="form-label" for="mfNotes">Notes</label>
            <textarea class="form-control" id="mfNotes" rows="3" maxlength="2000" placeholder="Anything the team should know about this project">${escapeHtml(v.notes)}</textarea>
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
    notes: values.notes, liveLink: values.liveLink,
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
