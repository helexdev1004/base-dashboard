'use strict';

// Project vendors tab: vendor table, progress chart/table, add vendor and exports.

const statusSelectHtml = (kind, id, status, extra = '') => `
  <select class="form-select status-select" data-change="${kind}-status" data-id="${id}" data-status="${status}"${extra} aria-label="Status">
    ${ENTITY_STATUSES.map((s) => `<option value="${s}"${s === status ? ' selected' : ''}>${s}</option>`).join('')}
  </select>`;

function shieldHtml(d) {
  const on = [d.geoIp && 'Geo IP check', d.blockDupIp && 'duplicate IP blocking'].filter(Boolean);
  const [cls, icon] = on.length === 2 ? ['on', 'bi-shield-fill-check'] : on.length ? ['partial', 'bi-shield-fill-exclamation'] : ['off', 'bi-shield-slash'];
  const label = on.length ? `Security checks on: ${on.join(' and ')}` : 'Security checks are off';
  return `<span class="shield ${cls}" role="img" title="${label}" aria-label="${label}"><i class="bi ${icon}"></i></span>`;
}

// Show All / Show EC only (Main tab metrics and Project vendors share it). Only the toggle state for now.
function ecToggleHtml() {
  const btn = (value, label, on) => `
    <button type="button" data-action="ec-toggle" data-value="${value}" class="${on ? 'active' : ''}" aria-pressed="${on}">${label}</button>`;
  return `
    <div class="segmented seg-xs ec-toggle" role="group" aria-label="Entries to show">
      ${btn('all', 'Show All', !pv.ecOnly)}${btn('ec', 'Show EC only', pv.ecOnly)}
    </div>`;
}

// Last entry / last complete per vendor. The busiest vendor matches the project's own times; the others are a little earlier.
function vendorActivity(p, v, busiest) {
  if (!v.stats.eb || !p.lastEntryAt) return { lastEntryAt: null, lastCompleteAt: null };
  if (v === busiest) return { lastEntryAt: p.lastEntryAt, lastCompleteAt: v.stats.c1 ? p.lastCompleteAt : null };
  const r = seeded(p.id * 131 + v.id);
  const lastEntryAt = p.lastEntryAt - r.int(4, 180) * MINUTE;
  const lastCompleteAt = v.stats.c1 && p.lastCompleteAt ? Math.min(lastEntryAt, p.lastCompleteAt - r.int(3, 240) * MINUTE) : null;
  return { lastEntryAt, lastCompleteAt };
}

function renderVendors(el) {
  const d = pv.project.detail;
  const total = d.vendors.reduce((acc, v) => addStats(acc, v.stats), emptyStats());
  const busiest = d.vendors.reduce((best, v) => (!best || v.stats.eb > best.stats.eb ? v : best), null);
  const isChart = pv.vendorView === 'chart';
  const subtitle = d.vendors.length === 1 ? `Daily completes (C1) · ${escapeHtml(d.vendors[0].name)}` : 'Daily completes (C1) by vendor';
  const cells = (stats) => VENDOR_COLS.map(([key]) => statCell(stats, key)).join('');

  el.innerHTML = `
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-action="add-vendor"><i class="bi bi-plus-lg"></i> Add vendor</button>
        <button type="button" class="icon-btn-sm" data-action="refresh" data-tab="vendors" title="Refresh" aria-label="Refresh"><i class="bi bi-arrow-clockwise"></i></button>
        <span class="pv-toolbar-note">${plural(d.vendors.length, 'vendor')}</span>
        ${ecToggleHtml()}
      </div>
      <div class="table-responsive">
        <table class="pv-table vendor-table">
          <thead><tr>
            <th>Vendor name</th><th><span class="visually-hidden">Export</span></th><th class="col-progress">Progress</th>
            ${thCells(VENDOR_COLS)}<th>Status</th><th><span class="visually-hidden">Security</span></th>
          </tr></thead>
          <tbody>
            ${d.vendors.length ? d.vendors.map((v) => `
              <tr>
                <td class="cell-name"><button type="button" class="cell-link" data-action="vendor-info" data-id="${v.id}" title="Vendor info">${escapeHtml(v.name)}</button></td>
                <td><button type="button" class="btn btn-ghost btn-xs" data-action="export-vendor" data-id="${v.id}"><i class="bi bi-download"></i> Export data</button></td>
                <td class="activity col-progress">${activityHtml(vendorActivity(pv.project, v, busiest))}</td>
                ${cells(v.stats)}
                <td>${statusSelectHtml('vendor', v.id, v.status)}</td>
                <td>${shieldHtml(d)}</td>
              </tr>`).join('') : emptyRow(VENDOR_COLS.length + 5, 'No vendors yet', 'Add a vendor to start collecting responses.')}
          </tbody>
          ${d.vendors.length > 1 ? `<tfoot><tr><td>Total</td><td></td><td></td>${cells(total)}<td></td><td></td></tr></tfoot>` : ''}
        </table>
      </div>
    </section>

    <section class="pv-card">
      <div class="pv-card-head">
        <div>
          <h2 class="pv-card-title">Progress over time</h2>
          <p class="pv-card-sub">${subtitle}</p>
        </div>
        <div class="segmented seg-sm" role="group" aria-label="Progress view">
          <button type="button" data-action="vendor-view" data-value="chart" class="${isChart ? 'active' : ''}" aria-pressed="${isChart}">Chart</button>
          <button type="button" data-action="vendor-view" data-value="table" class="${isChart ? '' : 'active'}" aria-pressed="${!isChart}">Table</button>
        </div>
      </div>
      ${isChart
        ? '<div class="chart-wrap" id="progressChart" tabindex="0" role="group" aria-roledescription="chart"></div><div class="chart-legend" id="progressLegend"></div>'
        : dailyTableHtml(d)}
    </section>`;

  chartObserver?.disconnect();
  if (isChart) {
    // Redraw whenever the chart's width changes (window resize, sidebar collapse, tab shown again).
    let timer;
    chartObserver = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(drawProgressChart, 80); });
    chartObserver.observe($('#progressChart'));
    drawProgressChart();
  }
}

function dailyRows(d) {
  const vendors = pv.vendorFilter ? d.vendors.filter((v) => String(v.id) === pv.vendorFilter) : d.vendors;
  return d.days.map((date, i) => vendors.reduce((acc, v) => addStats(acc, v.daily[i] || {}), { date, ...emptyStats() }));
}

function dailyTableHtml(d) {
  const rows = dailyRows(d);
  const total = rows.reduce((acc, r) => addStats(acc, r), emptyStats());
  const cells = (r) => DAILY_COLS.map(([key]) => statCell(r, key)).join('');
  return `
    <div class="pv-subbar">
      <select class="form-select form-select-sm pv-filter" data-change="vendor-filter" aria-label="Filter vendor">
        <option value="">All vendors</option>
        ${d.vendors.map((v) => `<option value="${v.id}"${String(v.id) === pv.vendorFilter ? ' selected' : ''}>${escapeHtml(v.name)}</option>`).join('')}
      </select>
      <button type="button" class="btn btn-ghost btn-sm-h ms-auto" data-action="export-daily" ${rows.length ? '' : 'disabled'}><i class="bi bi-download"></i> Export data</button>
    </div>
    <div class="table-responsive pv-table-frame">
      <table class="pv-table">
        <thead><tr><th>Date</th>${thCells(DAILY_COLS)}</tr></thead>
        <tbody>
          ${rows.length
            ? [...rows].reverse().map((r) => `<tr><td>${r.date}</td>${cells(r)}</tr>`).join('') /* newest day first */
            : emptyRow(DAILY_COLS.length + 1, 'No fieldwork days yet', 'Daily numbers appear once respondents start the survey.')}
        </tbody>
        ${rows.length ? `<tfoot><tr><td>Total</td>${cells(total)}</tr></tfoot>` : ''}
      </table>
    </div>`;
}

function niceScale(max, target = 4) {
  const rough = max / target;
  const mag = 10 ** Math.floor(Math.log10(rough));
  // Counts are whole numbers, so only whole-number steps (2.5 is allowed once it scales to 25, 250, …).
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= rough && Number.isInteger(s)));
  return { step, top: Math.ceil(max / step) * step };
}

// Line chart of daily completes per vendor. Colours follow the vendor (its id), never its rank.
function drawProgressChart() {
  const wrap = $('#progressChart');
  const legend = $('#progressLegend');
  if (!wrap || !wrap.clientWidth) return;
  const d = pv.project.detail;
  const dates = d.days;
  const series = d.vendors.map((v) => ({
    name: v.name,
    color: `var(--series-${((v.id - 1) % 8) + 1})`,
    values: dates.map((_, i) => v.daily[i]?.c1 ?? 0),
  }));

  if (!dates.length || !series.length) {
    wrap.innerHTML = `
      <div class="chart-empty">
        <i class="bi bi-graph-up"></i>
        <div class="empty-title">No activity yet</div>
        <div class="empty-text">The chart fills in once completes start coming in.</div>
      </div>`;
    legend.innerHTML = '';
    return;
  }

  const totals = dates.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0));
  const multi = series.length > 1;
  const W = wrap.clientWidth;
  const H = 300;
  const m = { top: 16, right: 20, bottom: 62, left: 56 };
  const plotH = H - m.top - m.bottom;
  const { step, top: yMax } = niceScale(Math.max(1, ...series.flatMap((s) => s.values)));
  const y = (v) => m.top + plotH - (v / yMax) * plotH;

  // Direct end labels for 2–4 vendors, but only when they don't collide (otherwise legend + tooltip carry it).
  let endLabels = false;
  if (multi && series.length <= 4) {
    const ends = series.map((s) => y(s.values[s.values.length - 1])).sort((a, b) => a - b);
    endLabels = ends.every((v, i) => i === 0 || v - ends[i - 1] >= 14);
    if (endLabels) m.right = 18 + Math.min(120, Math.max(...series.map((s) => s.name.length)) * 6.6);
  }
  const plotW = W - m.left - m.right;
  const inset = dates.length > 1 ? 22 : 0;
  const x = (i) => (dates.length === 1 ? m.left + plotW / 2 : m.left + inset + (i / (dates.length - 1)) * (plotW - inset * 2));
  const labelEvery = Math.max(1, Math.ceil((dates.length * 56) / plotW));

  const ticks = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(v);
  const grid = ticks.map((v) => `
    <line class="ch-grid" x1="${m.left}" x2="${W - m.right}" y1="${y(v)}" y2="${y(v)}"></line>
    <text class="ch-tick" x="${m.left - 10}" y="${y(v) + 4}" text-anchor="end">${fmtInt(v)}</text>`).join('');

  const xAxis = dates.map((date, i) => {
    if (i % labelEvery !== 0 && i !== dates.length - 1) return '';
    const label = fmtInt(totals[i]);
    const w = 14 + label.length * 7;
    return `
      <text class="ch-tick" x="${x(i)}" y="${H - m.bottom + 20}" text-anchor="middle">${dayLabel(date)}</text>
      <g class="ch-total"><rect x="${x(i) - w / 2}" y="${H - m.bottom + 30}" width="${w}" height="18" rx="5"></rect>
      <text x="${x(i)}" y="${H - m.bottom + 43}" text-anchor="middle">${label}</text></g>`;
  }).join('');

  const lines = series.map((s) => {
    const pts = s.values.map((v, i) => [x(i), y(v)]);
    const path = smoothPath(pts);
    const area = !multi && pts.length > 1
      ? `<path class="ch-area" d="${path} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z" style="fill:${s.color}"></path>`
      : '';
    const dots = pts.map(([px, py]) => `<circle class="ch-dot" cx="${px}" cy="${py}" r="4" style="fill:${s.color}"></circle>`).join('');
    return `${area}<path class="ch-line" d="${path}" style="stroke:${s.color}"></path>${dots}`;
  }).join('');

  const labels = endLabels
    ? series.map((s) => `<text class="ch-end" x="${x(dates.length - 1) + 10}" y="${y(s.values[s.values.length - 1]) + 4}">${escapeHtml(s.name)}</text>`).join('')
    : '';

  wrap.setAttribute('aria-label', `Daily completes from ${dates[0]} to ${dates[dates.length - 1]}. Use the left and right arrow keys to read each day.`);
  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-hidden="true">
      ${grid}
      <line class="ch-axis" x1="${m.left}" x2="${W - m.right}" y1="${y(0)}" y2="${y(0)}"></line>
      <text class="ch-tick" transform="translate(14 ${m.top + plotH / 2}) rotate(-90)" text-anchor="middle">Completes (C1)</text>
      ${xAxis}
      <line class="ch-cross" x1="0" x2="0" y1="${m.top}" y2="${y(0)}" visibility="hidden"></line>
      ${lines}
      ${labels}
      <rect class="ch-hit" x="${m.left}" y="${m.top}" width="${plotW}" height="${plotH}"></rect>
    </svg>
    <div class="chart-tooltip" aria-live="polite" hidden></div>`;

  legend.innerHTML = multi
    ? series.map((s) => `<span class="legend-item"><span class="legend-key" style="background:${s.color}"></span>${escapeHtml(s.name)}</span>`).join('')
    : '';

  const hit = $('.ch-hit', wrap);
  const cross = $('.ch-cross', wrap);
  const tip = $('.chart-tooltip', wrap);

  const show = (i) => {
    pv.chartIndex = i;
    cross.setAttribute('x1', x(i));
    cross.setAttribute('x2', x(i));
    cross.setAttribute('visibility', 'visible');
    tip.innerHTML = `
      <div class="tt-date">${dates[i]}</div>
      ${series.map((s) => `
        <div class="tt-row"><span class="tt-val">${fmtInt(s.values[i])}</span><span class="tt-key" style="background:${s.color}"></span><span class="tt-name">${escapeHtml(s.name)}</span></div>`).join('')}
      ${multi ? `<div class="tt-row tt-total"><span class="tt-val">${fmtInt(totals[i])}</span><span class="tt-name">Total</span></div>` : ''}`;
    tip.hidden = false;
    const topY = Math.min(...series.map((s) => y(s.values[i])));
    const left = Math.min(Math.max(x(i), tip.offsetWidth / 2 + 4), W - tip.offsetWidth / 2 - 4);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(topY - 12, tip.offsetHeight + 4)}px`;
  };
  const hide = () => {
    pv.chartIndex = -1;
    cross.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  };
  const nearest = (clientX) => {
    const px = clientX - hit.getBoundingClientRect().left + m.left;
    let best = 0;
    dates.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    return best;
  };

  hit.addEventListener('pointermove', (e) => show(nearest(e.clientX)));
  hit.addEventListener('pointerleave', hide);
  wrap.onblur = hide;
  wrap.onkeydown = (e) => {
    if (e.key === 'Escape') { hide(); return; }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const start = pv.chartIndex < 0 ? (dir > 0 ? -1 : dates.length) : pv.chartIndex;
    show(Math.max(0, Math.min(dates.length - 1, start + dir)));
  };
}

function addVendor() {
  const d = pv.project.detail;
  // Every vendor in the Vendors list (vendors.js) that isn't on this project yet.
  const available = vendorRegistry.map((v) => v.name).sort((a, b) => a.localeCompare(b))
    .filter((name) => !d.vendors.some((v) => v.name === name));
  if (!available.length) {
    showToast('All vendors are already on this project.', 'info');
    return;
  }
  openFormModal({
    title: 'Add vendor',
    subtitle: 'The vendor starts with no responses.',
    body: `
      <label class="form-label" for="mvVendor">Vendor</label>
      <select class="form-select" id="mvVendor" name="vendor" required>${optionsHtml(available.map((n) => [n, n]))}</select>
      <label class="form-label mt-3" for="mvStatus">Status</label>
      <select class="form-select" id="mvStatus" name="status">${optionsHtml([['active', 'active'], ['paused', 'paused']], 'active')}</select>`,
    submitLabel: '<i class="bi bi-plus-lg"></i> Add vendor',
    onSubmit: (form) => {
      const name = form.elements.vendor.value;
      const id = Math.max(0, ...d.vendors.map((v) => v.id)) + 1;
      d.vendors.push({
        id, name, status: form.elements.status.value,
        stats: emptyStats(),
        daily: d.days.map((date) => ({ date, ...emptyStats() })),
      });
      pv.rendered.delete('progress');
      renderPanel('vendors');
      showToast(`${name} added to the project.`);
    },
  });
}

function exportVendor(id) {
  const p = pv.project;
  const v = p.detail.vendors.find((x) => x.id === id);
  downloadCsv(`project-${p.jobNo}-${slugify(v.name)}-daily-${today()}.csv`, [
    ['Date', ...DAILY_COLS.map(([, label]) => label)],
    ...[...v.daily].reverse().map((r) => [r.date, ...DAILY_COLS.map(([key]) => statCsv(r, key))]),
    ['Total', ...DAILY_COLS.map(([key]) => statCsv(v.stats, key))],
  ]);
  showToast(`Exported daily data for ${v.name}.`);
}

function exportDaily() {
  const p = pv.project;
  const rows = dailyRows(p.detail);
  const vendor = p.detail.vendors.find((v) => String(v.id) === pv.vendorFilter);
  downloadCsv(`project-${p.jobNo}-${vendor ? slugify(vendor.name) : 'all-vendors'}-daily-${today()}.csv`, [
    ['Date', ...DAILY_COLS.map(([, label]) => label)],
    ...[...rows].reverse().map((r) => [r.date, ...DAILY_COLS.map(([key]) => statCsv(r, key))]),
  ]);
  showToast('Daily progress exported.');
}
