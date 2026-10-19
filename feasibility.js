'use strict';

/* =========================================================
   Base · MF+A Feasibility
   Estimates how many completes are available, and the cost per
   interview, for each country and quota cell. The numbers come from
   a sample panel model (panel size and age/gender mix per country),
   scaled by incidence rate, survey length and device.
   Uses helpers from script.js and project.js.
   ========================================================= */

/* ---------- Reference data ---------- */
// base = completes available at 100% incidence, 6-10 min, device agnostic.
// cpi  = euros at 90-100% incidence, 6-10 min, device agnostic.
const FZ_COUNTRIES = [
  { code: 'us', name: 'United States', base: 10800, female: 0.62, profile: 'older', cpi: 1.3 },
  { code: 'ca', name: 'Canada', base: 3200, female: 0.58, profile: 'balanced', cpi: 1.3 },
  { code: 'de', name: 'Germany', base: 6450, female: 0.53, profile: 'younger', cpi: 1.3 },
  { code: 'gb', name: 'United Kingdom', base: 7200, female: 0.57, profile: 'older', cpi: 1.4 },
  { code: 'fr', name: 'France', base: 5600, female: 0.55, profile: 'balanced', cpi: 1.35 },
  { code: 'es', name: 'Spain', base: 4100, female: 0.54, profile: 'younger', cpi: 1.15 },
  { code: 'it', name: 'Italy', base: 4300, female: 0.53, profile: 'balanced', cpi: 1.2 },
  { code: 'nl', name: 'Netherlands', base: 2600, female: 0.55, profile: 'older', cpi: 1.5 },
  { code: 'be', name: 'Belgium', base: 1250, female: 0.54, profile: 'older', cpi: 1.45 },
  { code: 'se', name: 'Sweden', base: 1500, female: 0.56, profile: 'balanced', cpi: 1.7 },
  { code: 'pl', name: 'Poland', base: 3100, female: 0.55, profile: 'younger', cpi: 0.95 },
  { code: 'cz', name: 'Czech Republic', base: 1400, female: 0.54, profile: 'balanced', cpi: 0.95 },
  { code: 'hu', name: 'Hungary', base: 1300, female: 0.57, profile: 'balanced', cpi: 0.9 },
  { code: 'ro', name: 'Romania', base: 1200, female: 0.56, profile: 'younger', cpi: 0.85 },
  { code: 'pt', name: 'Portugal', base: 1100, female: 0.57, profile: 'balanced', cpi: 1.05 },
  { code: 'au', name: 'Australia', base: 3300, female: 0.6, profile: 'older', cpi: 1.55 },
  { code: 'mx', name: 'Mexico', base: 2900, female: 0.56, profile: 'younger', cpi: 0.9 },
  { code: 'br', name: 'Brazil', base: 4800, female: 0.57, profile: 'younger', cpi: 0.85 },
  { code: 'jp', name: 'Japan', base: 5200, female: 0.5, profile: 'older', cpi: 1.9 },
];

// [id, label, share of panel that qualifies, CPI multiplier]
const FZ_IR_BREAKS = [
  ['90-100', '90-100%', 0.95, 1], ['80-89', '80-89%', 0.845, 1.05], ['70-79', '70-79%', 0.745, 1.12],
  ['60-69', '60-69%', 0.645, 1.2], ['50-59', '50-59%', 0.545, 1.3], ['40-49', '40-49%', 0.445, 1.45],
  ['30-39', '30-39%', 0.345, 1.65], ['20-29', '20-29%', 0.245, 2], ['15-19', '15-19%', 0.17, 2.5],
  ['10-14', '10-14%', 0.12, 3.2], ['5-9', '5-9%', 0.07, 4.5], ['1-4', '1-4%', 0.025, 7],
].map(([id, label, share, cpi]) => ({ id, label, share, cpi }));

// [id, label, availability multiplier, CPI multiplier]
const FZ_LOI_BREAKS = [
  ['1-5', '1-5 minutes', 1.1, 0.8], ['6-10', '6-10 minutes', 1, 1], ['11-15', '11-15 minutes', 0.88, 1.25],
  ['16-20', '16-20 minutes', 0.76, 1.5], ['21-25', '21-25 minutes', 0.66, 1.8], ['26-30', '26-30 minutes', 0.57, 2.1],
  ['31-35', '31-35 minutes', 0.49, 2.4], ['36-40', '36-40 minutes', 0.42, 2.7], ['41-45', '41-45 minutes', 0.36, 3],
  ['46+', '46+ minutes', 0.3, 3.5],
].map(([id, label, avail, cpi]) => ({ id, label, avail, cpi }));

const FZ_DEVICES = {
  DA: { label: 'DA', title: 'Device agnostic: desktop, tablet and mobile', avail: 1, cpi: 1 },
  'non-DA': { label: 'non-DA', title: 'Desktop only', avail: 0.6, cpi: 1.1 },
};

// Client rate cards (CPI multiplier).
const FZ_CLIENT_RATES = {
  'Northwind Research': 1, 'Bluepeak Insights': 1.05, 'Kestrel Analytics': 0.97, 'Meridian Panels': 1.02,
  'Orbit Consumer Lab': 1, 'Vantage Media Group': 1.08, 'Cobalt Strategy': 0.95,
};

const FZ_GENDERS = ['All', 'Male', 'Female'];
const AGE_MIN = 18;
const AGE_MAX = 99;
const LOW_AVAILABILITY = 50;
const FZ_TEMPLATE_KEY = 'base.feasibilityTemplates';

// Panel age mix: relative share of panelists at each age (linearly interpolated between anchors).
const AGE_PROFILES = {
  older: [[18, 0.5], [25, 0.9], [35, 1.3], [45, 1.5], [55, 1.6], [65, 1.4], [75, 0.8], [85, 0.25], [99, 0.02]],
  balanced: [[18, 0.9], [25, 1.1], [35, 1.1], [45, 1.05], [55, 0.95], [65, 0.8], [75, 0.45], [85, 0.15], [99, 0.02]],
  younger: [[18, 1.4], [25, 1.3], [35, 1], [45, 0.85], [55, 0.7], [65, 0.5], [75, 0.25], [85, 0.08], [99, 0.01]],
};

const breaks = (...pairs) => pairs.flatMap(([from, to]) => [['Male', from, to], ['Female', from, to]])
  .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] === 'Male' ? -1 : 1))
  .map(([gender, from, to]) => ({ gender, from, to }));

const DEFAULT_TEMPLATES = () => [
  { id: 'mf-6', name: 'MF - 6 age breaks', rows: breaks([18, 24], [25, 34], [35, 44], [45, 54], [55, 64], [65, 99]) },
  { id: 'mf-totals', name: 'MF - totals', rows: breaks([18, 99]) },
  { id: 'mf-4', name: 'MF - 4 breaks', rows: breaks([18, 24], [25, 34], [35, 44], [45, 99]) },
];

/* ---------- Model ---------- */
const ageWeights = Object.fromEntries(Object.entries(AGE_PROFILES).map(([name, anchors]) => {
  const weights = [];
  for (let age = AGE_MIN; age <= AGE_MAX; age++) {
    const i = anchors.findIndex(([a]) => a >= age);
    const [a1, w1] = anchors[Math.max(0, i - 1)];
    const [a2, w2] = anchors[i];
    weights.push(a2 === a1 ? w2 : w1 + ((w2 - w1) * (age - a1)) / (a2 - a1));
  }
  return [name, { weights, total: weights.reduce((s, w) => s + w, 0) }];
}));

function ageShare(profile, from, to) {
  const { weights, total } = ageWeights[profile];
  let sum = 0;
  for (let age = from; age <= to; age++) sum += weights[age - AGE_MIN];
  return sum / total;
}

const fzBreak = (list, id) => list.find((b) => b.id === id);
const rowValid = (row) => Number.isInteger(row.from) && Number.isInteger(row.to)
  && row.from >= AGE_MIN && row.to <= AGE_MAX && row.from <= row.to;

function available(country, row) {
  if (!rowValid(row)) return null;
  const genderShare = row.gender === 'All' ? 1 : row.gender === 'Female' ? country.female : 1 - country.female;
  return Math.round(country.base * genderShare * ageShare(country.profile, row.from, row.to)
    * fzBreak(FZ_IR_BREAKS, fz.ir).share * fzBreak(FZ_LOI_BREAKS, fz.loi).avail * FZ_DEVICES[fz.device].avail);
}

function suggestedCpi(country) {
  const raw = country.cpi * fzBreak(FZ_IR_BREAKS, fz.ir).cpi * fzBreak(FZ_LOI_BREAKS, fz.loi).cpi
    * FZ_DEVICES[fz.device].cpi * (FZ_CLIENT_RATES[fz.client] ?? 1);
  return Math.round(raw * 100) / 100;
}

/* ---------- State ---------- */
let fzRowSeq = 0;
const withIds = (rows) => rows.map((r) => ({ id: ++fzRowSeq, gender: r.gender, from: r.from, to: r.to }));

function loadTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem(FZ_TEMPLATE_KEY));
    if (Array.isArray(saved)) {
      return saved.filter((t) => t && typeof t.name === 'string' && Array.isArray(t.rows)).map((t) => ({
        id: String(t.id),
        name: t.name,
        rows: t.rows.filter((r) => FZ_GENDERS.includes(r.gender)).map((r) => ({ gender: r.gender, from: Number(r.from), to: Number(r.to) })),
      }));
    }
  } catch { /* storage unavailable or corrupt: fall back to defaults */ }
  return DEFAULT_TEMPLATES();
}

function saveTemplates() {
  try { localStorage.setItem(FZ_TEMPLATE_KEY, JSON.stringify(fz.templates)); } catch { /* storage unavailable */ }
}

const fz = {
  mounted: false,
  client: CLIENTS[0],
  countries: ['us', 'ca', 'de'],
  ir: '90-100',
  loi: '6-10',
  device: 'DA',
  rows: [],
  cpiOverrides: {},
  templates: [],
};

/* ---------- Rendering ---------- */
function renderFeasibility() {
  document.title = 'MF+A Feasibility · Base';
  if (fz.mounted) return;
  fz.templates = loadTemplates();
  fz.rows = withIds((fz.templates.find((t) => t.id === 'mf-4') || DEFAULT_TEMPLATES()[2]).rows);

  const root = $('#feasibilityView');
  const clientOpts = [...CLIENTS].sort().map((c) => [c, c]);
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">MF+A Feasibility</h1>
      <p class="page-sub">Estimate available completes and cost per interview by country and quota.</p>
    </header>

    <section class="pv-card fz-filters" aria-label="Feasibility settings">
      <div class="fz-filter-row">
        <div class="fz-field fz-w-client">
          <label class="form-label" for="fzClient">Client</label>
          <select class="form-select" id="fzClient" data-fz-setting="client">${optionsHtml(clientOpts, fz.client)}</select>
        </div>
        <div class="fz-field fz-grow">
          <label class="form-label" for="fzCountries">Country</label>
          <div id="fzCountrySelect"></div>
        </div>
        <div class="fz-field fz-w-break">
          <label class="form-label" for="fzIr">Incidence rate</label>
          <select class="form-select" id="fzIr" data-fz-setting="ir">${optionsHtml(FZ_IR_BREAKS.map((b) => [b.id, b.label]), fz.ir)}</select>
        </div>
        <div class="fz-field fz-w-break">
          <label class="form-label" for="fzLoi">Survey length</label>
          <select class="form-select" id="fzLoi" data-fz-setting="loi">${optionsHtml(FZ_LOI_BREAKS.map((b) => [b.id, b.label]), fz.loi)}</select>
        </div>
        <div class="fz-field">
          <span class="form-label d-block" id="fzDeviceLabel">Devices</span>
          <div class="segmented seg-field" role="group" aria-labelledby="fzDeviceLabel">
            ${Object.entries(FZ_DEVICES).map(([id, d]) => `
              <button type="button" data-fz-action="device" data-value="${id}" title="${d.title}"
                      class="${fz.device === id ? 'active' : ''}" aria-pressed="${fz.device === id}">${d.label}</button>`).join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="pv-card flush fz-quotas" aria-label="Quotas">
      <div class="pv-toolbar">
        <span class="pv-toolbar-title">Quotas</span>
        <div class="dropdown">
          <button type="button" class="btn btn-sm-h btn-dark-chip" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false" id="fzTemplatesBtn">
            <i class="bi bi-list-ul"></i> Templates <i class="bi bi-caret-down-fill fz-caret"></i>
          </button>
          <div class="dropdown-menu fz-templates" id="fzTemplates"></div>
        </div>
        <span class="pv-toolbar-note ms-auto" id="fzSummary"></span>
      </div>
      <div class="table-responsive">
        <table class="pv-table fz-table" id="fzTable"></table>
      </div>
    </section>`;

  createMultiSelect($('#fzCountrySelect'), {
    id: 'fzCountries',
    options: FZ_COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
    selected: fz.countries,
    placeholder: 'Select countries…',
    onChange: (value) => {
      fz.countries = value;
      renderQuotaTable();
    },
  });

  root.addEventListener('click', onFzClick);
  root.addEventListener('change', onFzChange);
  root.addEventListener('input', onFzInput);
  fz.mounted = true;
  renderTemplatesMenu();
  renderQuotaTable();
}

function renderTemplatesMenu() {
  $('#fzTemplates').innerHTML = `
    <button type="button" class="dropdown-item" data-fz-action="template-save"><i class="bi bi-floppy"></i> Save as template</button>
    ${fz.templates.length ? '<div class="dropdown-divider"></div>' : ''}
    ${fz.templates.map((t) => `
      <div class="fz-template">
        <button type="button" class="dropdown-item" data-fz-action="template-apply" data-id="${escapeHtml(t.id)}">${escapeHtml(t.name)}
          <span class="fz-template-meta">${plural(t.rows.length, 'quota')}</span></button>
        <button type="button" class="icon-btn-sm danger" data-fz-action="template-delete" data-id="${escapeHtml(t.id)}" aria-label="Delete template ${escapeHtml(t.name)}"><i class="bi bi-trash3"></i></button>
      </div>`).join('')}`;
}

function selectedCountries() {
  return fz.countries.map((code) => FZ_COUNTRIES.find((c) => c.code === code)).filter(Boolean);
}

function renderQuotaTable() {
  const table = $('#fzTable');
  const countries = selectedCountries();
  if (!countries.length) {
    table.innerHTML = `<tbody>${emptyRow(4, 'Pick at least one country', 'Availability and cost per interview appear here for each country.')}</tbody>`;
    $('#fzSummary').textContent = '';
    return;
  }
  const genderOpts = FZ_GENDERS.map((g) => [g, g]);
  table.innerHTML = `
    <thead>
      <tr class="fz-head-countries">
        <th colspan="3"></th>
        ${countries.map((c) => `<th class="fz-country"><span class="fi fi-${c.code}"></span> ${escapeHtml(c.name)}</th>`).join('')}
        <th></th>
      </tr>
      <tr class="fz-head-cpi">
        <th colspan="3" class="fz-cpi-label">Cost per interview</th>
        ${countries.map((c) => `
          <th>
            <div class="input-group fz-cpi">
              <input class="form-control" type="number" min="0" step="0.01" data-fz-cpi="${c.code}" aria-label="Cost per interview in euros, ${escapeHtml(c.name)}">
              <span class="input-group-text">€</span>
            </div>
          </th>`).join('')}
        <th></th>
      </tr>
      <tr class="fz-head-cols">
        <th>Gender</th><th>Age</th><th><span class="visually-hidden">Recalculate</span></th>
        ${countries.map(() => '<th>Available</th>').join('')}
        <th><span class="visually-hidden">Remove</span></th>
      </tr>
    </thead>
    <tbody>
      ${fz.rows.length ? fz.rows.map((row, i) => `
        <tr data-row="${row.id}">
          <td><select class="form-select fz-gender" data-fz-row="gender" aria-label="Gender, quota ${i + 1}">${optionsHtml(genderOpts, row.gender)}</select></td>
          <td>
            <div class="fz-age">
              <input class="form-control" type="number" min="${AGE_MIN}" max="${AGE_MAX}" step="1" value="${row.from}" data-fz-row="from" aria-label="Age from, quota ${i + 1}">
              <span aria-hidden="true">–</span>
              <input class="form-control" type="number" min="${AGE_MIN}" max="${AGE_MAX}" step="1" value="${row.to}" data-fz-row="to" aria-label="Age to, quota ${i + 1}">
            </div>
          </td>
          ${i === 0 ? `
            <td class="fz-recalc-cell" rowspan="${fz.rows.length}">
              <button type="button" class="icon-btn-sm fz-recalc" data-fz-action="recalc" title="Recalculate and reset costs per interview" aria-label="Recalculate"><i class="bi bi-arrow-repeat"></i></button>
            </td>` : ''}
          ${countries.map((c) => `<td><span class="fz-avail" data-cell="${row.id}:${c.code}"></span></td>`).join('')}
          <td><button type="button" class="icon-btn-sm danger" data-fz-action="remove-row" data-id="${row.id}" title="Remove quota" aria-label="Remove quota ${i + 1}"><i class="bi bi-dash-circle"></i></button></td>
        </tr>`).join('') : emptyRow(countries.length + 4, 'No quotas yet', 'Add a quota with the + button, or apply a template.')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="fz-total-label">Total available:</td>
        ${countries.map((c) => `<td><span class="fz-total" data-total="${c.code}"></span></td>`).join('')}
        <td><button type="button" class="icon-btn-sm success" data-fz-action="add-row" title="Add quota" aria-label="Add quota"><i class="bi bi-plus-circle"></i></button></td>
      </tr>
    </tfoot>`;
  updateFeasibility();
}

// Refreshes every computed number in place (keeps focus in the inputs).
function updateFeasibility() {
  const countries = selectedCountries();
  countries.forEach((c) => {
    let total = 0;
    fz.rows.forEach((row) => {
      const n = available(c, row);
      const badge = $(`[data-cell="${row.id}:${c.code}"]`);
      if (!badge) return;
      badge.textContent = n == null ? '—' : fmtInt(n);
      badge.className = `fz-avail${n == null || n === 0 ? ' is-none' : n < LOW_AVAILABILITY ? ' is-low' : ''}`;
      badge.title = n == null ? 'Check the age range' : n < LOW_AVAILABILITY ? 'Low availability' : '';
      total += n || 0;
    });
    const totalEl = $(`[data-total="${c.code}"]`);
    if (totalEl) totalEl.textContent = fmtInt(total);

    const input = $(`[data-fz-cpi="${c.code}"]`);
    if (input && document.activeElement !== input) {
      const override = fz.cpiOverrides[c.code];
      input.value = (override ?? suggestedCpi(c)).toFixed(2);
      input.classList.toggle('is-edited', override != null);
      input.title = override != null ? `Edited (suggested ${suggestedCpi(c).toFixed(2)} €). Recalculate to reset.` : 'Suggested cost per interview';
    }
  });

  $$('#fzTable tr[data-row]').forEach((tr) => {
    const row = fz.rows.find((r) => r.id === Number(tr.dataset.row));
    const bad = row && !rowValid(row);
    $$('.fz-age input', tr).forEach((input) => input.classList.toggle('is-invalid', Boolean(bad)));
  });

  const summary = $('#fzSummary');
  if (summary) {
    summary.textContent = countries.length
      ? `${plural(fz.rows.length, 'quota')} · ${plural(countries.length, 'country', 'countries')} · ${fzBreak(FZ_IR_BREAKS, fz.ir).label} IR · ${fzBreak(FZ_LOI_BREAKS, fz.loi).label}`
      : '';
  }
}

/* ---------- Events ---------- */
function onFzClick(e) {
  const el = e.target.closest('[data-fz-action]');
  if (!el || el.disabled) return;
  const id = el.dataset.id;
  switch (el.dataset.fzAction) {
    case 'device':
      fz.device = el.dataset.value;
      $$('button', el.parentElement).forEach((b) => {
        b.classList.toggle('active', b === el);
        b.setAttribute('aria-pressed', String(b === el));
      });
      updateFeasibility();
      break;
    case 'recalc':
      fz.cpiOverrides = {};
      el.classList.remove('spin');
      void el.offsetWidth; // restart the spin animation
      el.classList.add('spin');
      updateFeasibility();
      showToast('Recalculated. Costs per interview are back to the suggested rates.', 'info');
      break;
    case 'remove-row':
      fz.rows = fz.rows.filter((r) => r.id !== Number(id));
      renderQuotaTable();
      break;
    case 'add-row': {
      const last = fz.rows[fz.rows.length - 1];
      const from = last && last.to < AGE_MAX ? last.to + 1 : AGE_MIN;
      fz.rows.push({ id: ++fzRowSeq, gender: last ? last.gender : 'All', from, to: AGE_MAX });
      renderQuotaTable();
      $('#fzTable tbody tr:last-child .fz-gender')?.focus();
      break;
    }
    case 'template-apply': {
      const t = fz.templates.find((x) => x.id === id);
      fz.rows = withIds(t.rows);
      bootstrap.Dropdown.getOrCreateInstance('#fzTemplatesBtn').hide();
      renderQuotaTable();
      showToast(`Applied "${t.name}".`);
      break;
    }
    case 'template-delete': {
      if (!confirmClick(el, '')) return;
      const t = fz.templates.find((x) => x.id === id);
      fz.templates = fz.templates.filter((x) => x.id !== id);
      saveTemplates();
      renderTemplatesMenu();
      showToast(`Template "${t.name}" deleted.`, 'info');
      break;
    }
    case 'template-save':
      bootstrap.Dropdown.getOrCreateInstance('#fzTemplatesBtn').hide();
      saveTemplatePrompt();
      break;
    default:
  }
}

function onFzChange(e) {
  const el = e.target;
  if (el.classList.contains('ms-input')) return;
  if (el.dataset.fzSetting) {
    fz[el.dataset.fzSetting] = el.value;
    updateFeasibility();
  } else if (el.dataset.fzRow === 'gender') {
    rowFor(el).gender = el.value;
    updateFeasibility();
  }
}

function onFzInput(e) {
  const el = e.target;
  if (el.dataset.fzRow === 'from' || el.dataset.fzRow === 'to') {
    rowFor(el)[el.dataset.fzRow] = el.value === '' ? NaN : Number(el.value);
    updateFeasibility();
  } else if (el.dataset.fzCpi) {
    const value = Number(el.value);
    if (el.value === '' || !(value >= 0)) delete fz.cpiOverrides[el.dataset.fzCpi];
    else fz.cpiOverrides[el.dataset.fzCpi] = Math.round(value * 100) / 100;
    el.classList.toggle('is-edited', fz.cpiOverrides[el.dataset.fzCpi] != null);
  }
}

const rowFor = (el) => fz.rows.find((r) => r.id === Number(el.closest('tr').dataset.row));

function saveTemplatePrompt() {
  const valid = fz.rows.filter(rowValid);
  if (!valid.length) {
    showToast('Add at least one valid quota before saving a template.', 'info');
    return;
  }
  openFormModal({
    title: 'Save as template',
    subtitle: `Saves the ${plural(valid.length, 'quota')} currently in the table. A template with the same name is replaced.`,
    body: `
      <label class="form-label" for="fzTemplateName">Template name</label>
      <input class="form-control" id="fzTemplateName" name="name" required maxlength="60" placeholder="e.g. MF - 5 age breaks">
      <div class="invalid-feedback">Enter a name.</div>`,
    submitLabel: '<i class="bi bi-floppy"></i> Save template',
    onSubmit: (form) => {
      const name = form.elements.name.value.trim();
      const rows = valid.map(({ gender, from, to }) => ({ gender, from, to }));
      const existing = fz.templates.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (existing) Object.assign(existing, { name, rows });
      else fz.templates.push({ id: `t-${Date.now().toString(36)}`, name, rows });
      saveTemplates();
      renderTemplatesMenu();
      showToast(existing ? `Template "${name}" updated.` : `Template "${name}" saved.`);
    },
  });
}
