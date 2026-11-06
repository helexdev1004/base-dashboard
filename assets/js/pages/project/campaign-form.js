'use strict';

// Create Campaign / Campaign info modal. Same form for both; once a campaign exists, its vendor, source and samples are locked.

// [key, label, conditions, kind of value]. Reliable is on every new campaign; the rest are added with +.
const CAMPAIGN_FILTERS = [
  ['reliable', 'Reliable', ['='], 'yesno'],
  ['lastLogin', 'Last login', ['between', '>=', '=<'], 'date'],
  ['lastDevice', 'Last device', ['=', '!=', 'one of', 'none of'], 'choice'],
  ['activated', 'Activated', ['between', '>=', '=<'], 'date'],
  ['points', 'Points', ['between', '>=', '=<'], 'number'],
  ['region', 'Region', ['=', '!=', 'one of', 'none of'], 'choice'],
];
const filterDef = (key) => CAMPAIGN_FILTERS.find(([k]) => k === key);
const DEVICES = ['Desktop', 'Mobile', 'Tablet'];
// Rough share of members each filter keeps, for the "Available" estimate.
const FILTER_SHARE = { lastLogin: 0.65, lastDevice: 0.55, activated: 0.8, points: 0.6, region: 0.3 };
const AUTO_SAMPLE_NOTE = 'With auto sample newly registered panelist will be automatically invited if they fit one of the samples!';

const cf = { campaign: null, draft: null, pointsTouched: false };

const newFilter = (key) => ({ key, op: filterDef(key)[2][0], a: key === 'reliable' ? 'yes' : '', b: '', values: [] });
const filterChoices = (key) => (key === 'lastDevice' ? DEVICES : regionsFor(pv.project.country.code));
const isMulti = (f) => f.op === 'one of' || f.op === 'none of';

function filterIsSet(f) {
  const kind = filterDef(f.key)[3];
  if (kind === 'choice') return isMulti(f) ? f.values.length > 0 : Boolean(f.a);
  if (f.op === 'between') return f.a !== '' && f.b !== '';
  return f.a !== '';
}

// Active members of a panel in a country (counted once; the member arrays don't change).
const activeCountCache = new Map();
function activeMembersIn(code, country) {
  const panel = typeof PANEL_INFO === 'undefined' ? null : PANEL_INFO.find((x) => x.code === code);
  if (!panel) return 0;
  const key = `${code}|${country}`;
  if (!activeCountCache.has(key)) {
    const d = panelData(panel);
    const ci = WORLD_INDEX.get(country);
    let n = 0;
    for (let i = 0; i < d.n; i++) if (d.status[i] === 1 && d.country[i] === ci) n += 1;
    activeCountCache.set(key, n);
  }
  return activeCountCache.get(key);
}

// Share of members of a gender in an age band. Assumes birth years 1950-2006, spread evenly, and 52% female.
function demographicShare(gender, from, to) {
  if (!gender || !from || !to || from > to) return 0;
  const year = new Date().getFullYear();
  const youngest = year - 2006;
  const oldest = year - 1950;
  const overlap = Math.max(0, Math.min(to, oldest) - Math.max(from, youngest) + 1);
  return (gender === 'Female' ? 0.52 : 0.48) * (overlap / (oldest - youngest + 1));
}

// Panelists who fit a sample: active members in the project's country, scaled by the gender/age share and each filter.
function sampleAvailable(draft, s) {
  if (!draft.vendor) return 0;
  let share = demographicShare(s.gender, Number(s.from), Number(s.to));
  if (!share) return 0;
  draft.filters.filter(filterIsSet).forEach((f) => {
    if (f.key === 'reliable') share *= f.a === 'no' ? 0.1 : 0.9;
    else share *= f.op === '!=' || f.op === 'none of' ? 1 - FILTER_SHARE[f.key] / 2 : FILTER_SHARE[f.key];
  });
  return Math.floor(activeMembersIn(draft.vendor, pv.project.country.code) * share);
}

const segButtonsHtml = (name, labelledBy, opts, value, disabled) => `
  <div class="segmented seg-sm" role="group" aria-labelledby="${labelledBy}" data-cf-seg="${name}">
    ${opts.map(([v, label]) => `<button type="button" data-value="${v}" class="${v === value ? 'active' : ''}" aria-pressed="${v === value}" ${disabled ? 'disabled' : ''}>${label}</button>`).join('')}
  </div>`;

function campaignFormHtml(c) {
  const v = cf.draft;
  const info = Boolean(c);
  const vendorName = PANELS.find((x) => x.code === v.vendor)?.name || '';
  const auto = v.autoSample ? '1' : '0';
  return `
    <div class="cf">
      <div class="cf-row">
        <label class="cf-label" for="cfName">Name</label>
        <div class="cf-field cf-w-md">
          <input class="form-control" id="cfName" name="name" required maxlength="60" value="${escapeHtml(c ? c.name : v.name)}">
          <div class="invalid-feedback">Enter a campaign name.</div>
        </div>
      </div>
      <div class="cf-row">
        <label class="cf-label" for="cfVendor">Vendor</label>
        <div class="cf-field cf-w-md">
          ${info ? `<input class="form-control" id="cfVendor" value="${escapeHtml(vendorName)}" disabled>` : '<div id="cfVendorBox"></div>'}
          <div class="invalid-feedback" id="cfVendorMsg">Select a vendor.</div>
        </div>
      </div>
      <div class="cf-row cf-pair">
        <label class="cf-label" for="cfPoints">Survey points</label>
        <div class="cf-field">
          <input class="form-control cf-auto" id="cfPoints" type="number" min="0" max="100000" step="1" required value="${v.points}"
                 title="From Panel management ▸ Survey points, for the vendor and survey length">
          <div class="invalid-feedback">Enter the points.</div>
        </div>
        <label class="cf-label" for="cfLength">Survey length</label>
        <div class="cf-field">
          <input class="form-control cf-auto" id="cfLength" type="number" min="1" max="90" step="1" required value="${v.length}" title="Minutes, from the project">
          <div class="invalid-feedback">1–90 minutes.</div>
        </div>
      </div>
      <div class="cf-row">
        <label class="cf-label" for="cfExtraOn">Extra invite texts</label>
        <div class="cf-field"><input class="form-check-input" type="checkbox" id="cfExtraOn" ${v.extra.on ? 'checked' : ''}></div>
      </div>
      <div class="cf-extra" id="cfExtra" ${v.extra.on ? '' : 'hidden'}>
        <div class="cf-row cf-top">
          <label class="cf-label" for="cfInviteText">Invite text</label>
          <div class="cf-field"><textarea class="form-control" id="cfInviteText" rows="3" maxlength="4000" placeholder="Enter invite text">${escapeHtml(v.extra.text)}</textarea></div>
        </div>
        <div class="cf-row cf-top">
          <label class="cf-label" for="cfInviteHtml">Invite HTML</label>
          <div class="cf-field"><textarea class="form-control mono" id="cfInviteHtml" rows="3" maxlength="20000" spellcheck="false" placeholder="Enter invite HTML">${escapeHtml(v.extra.html)}</textarea></div>
        </div>
      </div>
      <div id="cfSource"></div>
      <div class="cf-row">
        <label class="cf-label" for="cfBatch">Create a batch</label>
        <div class="cf-field"><input class="form-check-input" type="checkbox" id="cfBatch" ${v.batch ? 'checked' : ''} ${info ? 'disabled' : ''}></div>
      </div>
      <div class="cf-batch" id="cfBatchBox"></div>
      <div class="cf-row cf-pair">
        <label class="cf-label" for="cfStatus">Status</label>
        <div class="cf-field"><select class="form-select cf-w-sm" id="cfStatus">${optionsHtml(ENTITY_STATUSES.map((s) => [s, s]), v.status)}</select></div>
        <span class="cf-label" id="cfAutoLabel">Auto sample</span>
        <div class="cf-field">${segButtonsHtml('autoSample', 'cfAutoLabel', [['1', 'Yes'], ['0', 'No']], auto, false)}</div>
      </div>
      <div class="cf-note" id="cfAutoNote" role="note" ${v.autoSample ? '' : 'hidden'}><i class="bi bi-info-circle"></i><span>${AUTO_SAMPLE_NOTE}</span></div>
      ${info ? `
        <ul class="cf-stats" aria-label="Statuses of ${escapeHtml(c.name)}">
          ${CAMPAIGN_INFO_STATS.map(([key, label]) => {
            const n = campStat(c.stats, key);
            return `<li><span>${label}</span><span class="cf-count${n ? '' : ' is-zero'}">${fmtInt(n)}</span></li>`;
          }).join('')}
        </ul>` : ''}
    </div>`;
}

// Not a batch: invite a list of panelists by ID or PUUID, typed in or from a file.
function renderCfSource() {
  const v = cf.draft;
  const locked = Boolean(cf.campaign);
  const box = $('#cfSource');
  if (v.batch) {
    box.innerHTML = '';
    return;
  }
  const what = v.source.field === 'puuid' ? 'PUUIDs' : 'IDs';
  const typed = v.source.type === 'text' || locked;
  box.innerHTML = `
    <div class="cf-source">
      <div class="cf-row cf-pair">
        <span class="cf-label" id="cfSourceLabel">Source</span>
        <div class="cf-field">${segButtonsHtml('sourceType', 'cfSourceLabel', [['file', 'file'], ['text', 'text']], v.source.type, locked)}</div>
        <span class="cf-label" id="cfFieldLabel">Match field</span>
        <div class="cf-field">${segButtonsHtml('sourceField', 'cfFieldLabel', [['id', 'ID'], ['puuid', 'PUUID']], v.source.field, locked)}</div>
      </div>
      <div class="cf-list">
        ${typed
          ? `<textarea class="form-control mono" id="cfIds" rows="3" ${locked ? 'disabled' : 'required'} spellcheck="false"
                       aria-label="${what}, one per line" aria-describedby="cfIdsHelp">${escapeHtml(v.source.ids)}</textarea>`
          : `<input class="form-control" type="file" id="cfFile" accept=".csv,.txt,.xlsx,.xls" required aria-label="File of ${what}" aria-describedby="cfIdsHelp">`}
        <div class="field-help" id="cfIdsHelp">${locked && v.source.fileName ? `From ${escapeHtml(v.source.fileName)}` : typed ? `Enter ${what}, one per line.` : `A CSV or Excel file with one ${what.slice(0, -1)} per row.`}</div>
        <div class="invalid-feedback">${typed ? `Enter at least one ${what.slice(0, -1)}.` : 'Choose a file.'}</div>
      </div>
    </div>`;
}

function renderCfBatch() {
  const v = cf.draft;
  const locked = Boolean(cf.campaign);
  const box = $('#cfBatchBox');
  if (!v.batch) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `
    <div class="cf-row">
      <span class="cf-label">Filters</span>
      <div class="cf-field">
        ${locked ? '' : `<button type="button" class="cf-round add" data-cf="filter-add" title="Add a filter" aria-label="Add a filter"
                                 aria-expanded="false" aria-controls="cfPicker"><i class="bi bi-plus-circle-fill"></i></button>`}
      </div>
    </div>
    <div class="cf-picker" id="cfPicker" hidden></div>
    <div class="cf-filters" id="cfFilters"></div>
    <div class="cf-sub">Samples</div>
    <div class="cf-samples" id="cfSamples"></div>`;
  renderCfFilters();
  renderCfSamples();
}

function renderCfPicker(open) {
  const picker = $('#cfPicker');
  $('[data-cf="filter-add"]')?.setAttribute('aria-expanded', String(open));
  picker.hidden = !open;
  if (!open) return;
  const left = CAMPAIGN_FILTERS.filter(([key]) => !cf.draft.filters.some((f) => f.key === key));
  picker.innerHTML = `
    <div class="cf-picker-head"><button type="button" class="btn-link-sm" data-cf="filter-cancel">Cancel</button></div>
    ${left.length
      ? left.map(([key, label]) => `<button type="button" class="cf-picker-item" data-cf="filter-pick" data-key="${key}">${label}</button>`).join('')
      : '<div class="cf-picker-empty">Every filter is already added.</div>'}`;
  $('.cf-picker-item, [data-cf="filter-cancel"]', picker)?.focus();
}

function filterValueHtml(f, i, label, locked) {
  const kind = filterDef(f.key)[3];
  const dis = locked ? 'disabled' : '';
  const input = (field, type, placeholder, what) => `
    <input class="form-control" type="${type}" data-cf-f="${field}" data-i="${i}" value="${escapeHtml(f[field])}"
           ${placeholder ? `placeholder="${placeholder}"` : ''} aria-label="${label}, ${what}" ${type === 'number' ? 'min="0" step="1"' : ''} ${dis}>`;
  if (kind === 'yesno') {
    return `<select class="form-select" data-cf-f="a" data-i="${i}" aria-label="${label}" ${dis}>${optionsHtml([['yes', 'Yes'], ['no', 'No']], f.a)}</select>`;
  }
  if (kind === 'choice') {
    if (!isMulti(f)) {
      return `<select class="form-select" data-cf-f="a" data-i="${i}" aria-label="${label}" ${dis}>
        <option value="">Select...</option>${optionsHtml(filterChoices(f.key).map((x) => [x, x]), f.a)}</select>`;
    }
    return locked
      ? `<input class="form-control" value="${escapeHtml(f.values.join(', '))}" aria-label="${label}" disabled>`
      : `<div id="cfMulti-${i}"></div>`;
  }
  const type = kind === 'date' ? 'date' : 'number';
  if (f.op === 'between') return `<div class="cf-range">${input('a', type, type === 'number' ? 'Start' : '', 'from')}<span>-</span>${input('b', type, type === 'number' ? 'End' : '', 'to')}</div>`;
  return `<div class="cf-range cf-one">${input('a', type, type === 'number' ? 'Points' : '', f.op === '>=' ? 'from' : 'up to')}</div>`;
}

function renderCfFilters() {
  const locked = Boolean(cf.campaign);
  const filters = cf.draft.filters;
  $('#cfFilters').innerHTML = filters.length
    ? filters.map((f, i) => {
        const [, label, ops] = filterDef(f.key);
        return `
          <div class="cf-filter">
            ${locked ? '<span></span>' : `<button type="button" class="cf-round del" data-cf="filter-del" data-i="${i}" title="Remove" aria-label="Remove the ${label} filter"><i class="bi bi-dash-circle-fill"></i></button>`}
            <span class="cf-filter-label">${label}</span>
            <select class="form-select" data-cf-f="op" data-i="${i}" aria-label="${label}: condition" ${locked ? 'disabled' : ''}>${optionsHtml(ops.map((o) => [o, o]), f.op)}</select>
            <div class="cf-filter-value">${filterValueHtml(f, i, label, locked)}</div>
          </div>`;
      }).join('')
    : '<div class="cf-empty">No filters: any active member of the panel can be invited.</div>';
  if (locked) return;
  filters.forEach((f, i) => {
    if (filterDef(f.key)[3] !== 'choice' || !isMulti(f)) return;
    createCheckSelect($(`#cfMulti-${i}`), {
      id: `cfMultiSel-${i}`,
      options: filterChoices(f.key).map((x) => ({ value: x, label: x })),
      selected: f.values,
      allLabel: 'All',
      placeholder: 'Select...',
      searchLabel: 'Search…',
      onChange: (values) => { f.values = values; updateCfAvailability(); },
    });
  });
}

function renderCfSamples() {
  const locked = Boolean(cf.campaign);
  const rows = cf.draft.samples;
  const dis = locked ? 'disabled' : '';
  const age = (s, i, field, placeholder) => `
    <input class="form-control" type="number" min="1" max="120" step="1" required data-cf-s="${field}" data-i="${i}" value="${escapeHtml(s[field])}"
           placeholder="${placeholder}" aria-label="Sample ${i + 1}, age ${field === 'from' ? 'from' : 'to'}" ${dis}>`;
  $('#cfSamples').innerHTML = `
    <table class="cf-sample-table">
      <thead><tr>
        <th>Gender</th><th>Age</th><th>Requested</th><th><span class="visually-hidden">Refresh</span></th><th>Available</th><th><span class="visually-hidden">Remove</span></th>
      </tr></thead>
      <tbody>
        ${rows.map((s, i) => `
          <tr>
            <td><select class="form-select" data-cf-s="gender" data-i="${i}" required aria-label="Sample ${i + 1}, gender" ${dis}>
              ${optionsHtml([['', '-- Select --'], ['Male', 'Male'], ['Female', 'Female']], s.gender)}</select></td>
            <td><div class="cf-range">${age(s, i, 'from', 'Start')}<span>-</span>${age(s, i, 'to', 'End')}</div></td>
            <td><input class="form-control cf-req" type="number" min="1" max="100000" step="1" required data-cf-s="requested" data-i="${i}"
                       value="${escapeHtml(s.requested)}" aria-label="Sample ${i + 1}, requested" ${dis}></td>
            ${i === 0 ? `<td class="cf-refresh-cell" rowspan="${rows.length}">${locked ? '' : `
              <button type="button" class="icon-btn-sm cf-refresh" data-cf="sample-refresh" title="Refresh the available panelists" aria-label="Refresh the available panelists"><i class="bi bi-arrow-clockwise"></i></button>`}</td>` : ''}
            <td><span class="cf-pill" id="cfAvail-${i}"></span></td>
            <td>${locked ? '' : `<button type="button" class="cf-round del" data-cf="sample-del" data-i="${i}" title="Remove" aria-label="Remove sample ${i + 1}"><i class="bi bi-dash-circle-fill"></i></button>`}</td>
          </tr>`).join('')}
      </tbody>
      <tfoot><tr>
        <td>Total</td><td></td><td><span class="cf-pill is-total" id="cfReqTotal" title="Requested in total"></span></td><td></td>
        <td><span class="cf-pill is-total" id="cfAvailTotal" title="Available in total"></span></td>
        <td>${locked ? '' : '<button type="button" class="cf-round add" data-cf="sample-add" title="Add a sample" aria-label="Add a sample"><i class="bi bi-plus-circle-fill"></i></button>'}</td>
      </tr></tfoot>
    </table>`;
  updateCfAvailability();
}

// Available per sample: green if it covers what's requested, yellow if not. Also flags age ranges that run backwards.
function updateCfAvailability() {
  const v = cf.draft;
  if (!v.batch || !$('#cfReqTotal')) return;
  let requested = 0;
  let available = 0;
  v.samples.forEach((s, i) => {
    const n = sampleAvailable(v, s);
    const r = Number(s.requested) || 0;
    requested += r;
    available += n;
    const pill = $(`#cfAvail-${i}`);
    pill.textContent = fmtInt(n);
    pill.classList.toggle('is-ok', n >= r);
    pill.classList.toggle('is-short', n < r);
    pill.title = n < r ? `Only ${fmtInt(n)} of the ${fmtInt(r)} requested fit this sample` : 'Enough panelists fit this sample';
    const to = $(`[data-cf-s="to"][data-i="${i}"]`);
    to?.setCustomValidity(s.from !== '' && s.to !== '' && Number(s.from) > Number(s.to) ? 'The age range ends before it starts.' : '');
  });
  $('#cfReqTotal').textContent = fmtInt(requested);
  $('#cfAvailTotal').textContent = fmtInt(available);
}

function setCfPoints() {
  const points = campaignPoints(cf.draft.vendor, Number($('#cfLength').value));
  $('#cfPoints').value = points;
  cf.draft.points = points;
}

function openCampaignForm(c) {
  const p = pv.project;
  const nextId = Math.max(0, ...p.detail.campaigns.map((x) => x.id)) + 1;
  Object.assign(cf, {
    campaign: c,
    pointsTouched: Boolean(c),
    draft: c
      ? { ...structuredClone(c.setup), vendor: c.panel, status: c.status }
      : {
          name: `Campaign ${pad2(nextId)}`, vendor: '', points: '', length: p.loiBid,
          extra: { on: false, text: '', html: '' }, batch: true, filters: [newFilter('reliable')], samples: [],
          source: { type: 'text', field: 'id', ids: '' }, autoSample: false, status: 'active',
        },
  });
  openFormModal({
    title: c ? 'Campaign info' : 'Create Campaign',
    subtitle: c ? `${c.name} · created ${fmtStamp(c.created)}` : `Invite panelists to ${p.name}.`,
    wide: true,
    body: campaignFormHtml(c),
    submitLabel: c ? '<i class="bi bi-check2"></i> Save' : '<i class="bi bi-plus-lg"></i> Create',
    onSubmit: saveCampaign,
  });
  if (!c) {
    createComboBox($('#cfVendorBox'), {
      id: 'cfVendor',
      options: PANELS.map((x) => ({ value: x.code, label: x.name, hint: x.code })),
      placeholder: 'Select vendor...',
      onChange: (code) => {
        cf.draft.vendor = code;
        $('#cfVendor').setCustomValidity(code ? '' : 'Select a vendor.');
        $('#cfVendorMsg').classList.remove('d-block');
        if (!cf.pointsTouched) setCfPoints();
        updateCfAvailability();
      },
    });
    $('#cfVendor').setCustomValidity('Select a vendor.'); // checked with the rest of the form until one is picked
  }
  renderCfSource();
  renderCfBatch();
  Object.assign($('#pvModalBody'), { onclick: onCfClick, oninput: onCfInput, onchange: onCfInput });
}

function onCfClick(e) {
  const seg = e.target.closest('[data-cf-seg] button');
  if (seg) {
    if (seg.disabled) return;
    const group = seg.parentElement;
    $$('button', group).forEach((b) => {
      b.classList.toggle('active', b === seg);
      b.setAttribute('aria-pressed', String(b === seg));
    });
    const v = cf.draft;
    if (group.dataset.cfSeg === 'autoSample') {
      v.autoSample = seg.dataset.value === '1';
      $('#cfAutoNote').hidden = !v.autoSample;
    } else {
      v.source[group.dataset.cfSeg === 'sourceType' ? 'type' : 'field'] = seg.dataset.value;
      renderCfSource();
    }
    return;
  }
  const el = e.target.closest('[data-cf]');
  if (!el) return;
  const v = cf.draft;
  const i = Number(el.dataset.i);
  switch (el.dataset.cf) {
    case 'filter-add':
      renderCfPicker($('#cfPicker').hidden);
      break;
    case 'filter-cancel':
      renderCfPicker(false);
      $('[data-cf="filter-add"]').focus();
      break;
    case 'filter-pick':
      v.filters.push(newFilter(el.dataset.key));
      renderCfPicker(false);
      renderCfFilters();
      updateCfAvailability();
      $(`[data-cf-f="op"][data-i="${v.filters.length - 1}"]`).focus();
      break;
    case 'filter-del':
      v.filters.splice(i, 1);
      renderCfFilters();
      updateCfAvailability();
      if (!$('#cfPicker').hidden) renderCfPicker(true);
      break;
    case 'sample-add':
      v.samples.push({ gender: '', from: '', to: '', requested: 0 });
      renderCfSamples();
      $(`[data-cf-s="gender"][data-i="${v.samples.length - 1}"]`).focus();
      break;
    case 'sample-del':
      v.samples.splice(i, 1);
      renderCfSamples();
      break;
    case 'sample-refresh':
      el.classList.remove('spinning');
      void el.offsetWidth; // restart the spin on repeated clicks
      el.classList.add('spinning');
      updateCfAvailability();
      break;
    default:
  }
}

function onCfInput(e) {
  const t = e.target;
  const v = cf.draft;
  switch (t.id) {
    case 'cfExtraOn':
      v.extra.on = t.checked;
      $('#cfExtra').hidden = !t.checked;
      return;
    case 'cfInviteText': v.extra.text = t.value; return;
    case 'cfInviteHtml': v.extra.html = t.value; return;
    case 'cfIds': v.source.ids = t.value; return;
    case 'cfBatch':
      if (v.batch === t.checked) return;
      v.batch = t.checked;
      renderCfSource();
      renderCfBatch();
      return;
    case 'cfLength':
      v.length = t.value;
      if (!cf.pointsTouched) setCfPoints();
      return;
    case 'cfPoints':
      if (e.type === 'input') cf.pointsTouched = true; // typed points stay put when the vendor or length changes
      v.points = t.value;
      return;
    default:
  }
  if (t.dataset.cfF) {
    const f = v.filters[Number(t.dataset.i)];
    if (t.dataset.cfF === 'op') {
      if (e.type !== 'change' || f.op === t.value) return;
      const wasMulti = isMulti(f);
      f.op = t.value;
      if (f.op !== 'between') f.b = '';
      if (wasMulti !== isMulti(f)) Object.assign(f, { a: '', values: [] });
      renderCfFilters();
    } else {
      f[t.dataset.cfF] = t.value;
    }
    updateCfAvailability();
    return;
  }
  if (t.dataset.cfS) {
    v.samples[Number(t.dataset.i)][t.dataset.cfS] = t.value;
    updateCfAvailability();
  }
}

function saveCampaign(form) {
  const v = cf.draft;
  const c = cf.campaign;
  const name = $('#cfName').value.trim();
  const points = Number($('#cfPoints').value);
  const length = Number($('#cfLength').value);
  const status = $('#cfStatus').value;
  if (c) {
    // The batch was already sent, so only these change.
    Object.assign(c, { name, status });
    c.segments.forEach((s) => { s.status = status; });
    Object.assign(c.setup, { points, length, extra: { ...v.extra }, autoSample: v.autoSample });
    renderPanel('campaigns');
    showToast(`${name} saved.`);
    return true;
  }
  if (!v.vendor) {
    $('#cfVendorBox').classList.add('is-invalid');
    $('#cfVendorMsg').classList.add('d-block');
    $('#cfVendor').focus();
    return false;
  }
  if (v.batch && !v.samples.length) {
    showToast('Add at least one sample with the + button under Samples.', 'info');
    $('[data-cf="sample-add"]').focus();
    return false;
  }
  if (!v.batch && v.source.type === 'file') {
    const file = $('#cfFile').files[0];
    withBusyButton(form, async () => {
      const ids = await readFileValues(file);
      if (!ids.length) throw new Error(`There are no ${v.source.field === 'puuid' ? 'PUUIDs' : 'IDs'} in that file.`);
      Object.assign(v.source, { ids: ids.join('\n'), fileName: file.name });
      createCampaign(name, points, length, status);
      bootstrap.Modal.getInstance('#pvModal').hide();
    });
    return false;
  }
  createCampaign(name, points, length, status);
  return true;
}

function createCampaign(name, points, length, status) {
  const v = cf.draft;
  const d = pv.project.detail;
  const id = Math.max(0, ...d.campaigns.map((x) => x.id)) + 1;
  const ids = v.batch ? [] : [...new Set(v.source.ids.split(/\r?\n/).map((x) => x.trim()).filter(Boolean))];
  // A batch invites up to the requested number of the panelists who fit each sample.
  const perSample = v.batch ? v.samples.map((s) => Math.min(Number(s.requested), sampleAvailable(v, s))) : [];
  const inv = v.batch ? perSample.reduce((a, b) => a + b, 0) : ids.length;
  const created = Date.now();
  const c = {
    id, name, panel: v.vendor, status, created, stats: zeroCampaignStats(inv),
    setup: {
      points, length, extra: { ...v.extra }, batch: v.batch, autoSample: v.autoSample,
      filters: structuredClone(v.filters),
      samples: v.samples.map((s, j) => ({ id: j + 1, gender: s.gender, from: Number(s.from), to: Number(s.to), requested: Number(s.requested) })),
      source: { ...v.source, ids: ids.join('\n') },
    },
  };
  c.segments = c.setup.batch
    ? c.setup.samples.map((s, j) => ({ id: j + 1, name: sampleName(s), status, created, stats: zeroCampaignStats(perSample[j]) }))
    : [];
  d.campaigns.push(c);
  pv.campStatus = status === 'closed' ? 'Closed' : 'Live';
  renderPanel('campaigns');
  showToast(inv
    ? `${name} created: ${plural(inv, 'invitation')} queued.`
    : `${name} created. No panelists fit the samples yet${v.autoSample ? '; new ones are invited as they register' : ''}.`, inv ? 'success' : 'info');
}
