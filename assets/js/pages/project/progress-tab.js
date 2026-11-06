'use strict';

// Progress tab: summary tiles and one combined totals row.

function renderProgress(el) {
  const p = pv.project;
  const totals = projectStats(p);
  const tiles = [
    ['Completes (C1)', fmtInt(p.c1), p.cMonth ? `${fmtInt(p.cMonth)} this month` : 'None this month'],
    ['Incidence rate', `${p.ir}%`, ''],
    ['Conversion', `${p.conv}%`, ''],
    ['Length of interview', p.loiReal == null ? '—' : `${p.loiReal.toFixed(2)} min`, `Bid ${p.loiBid.toFixed(2)} min`],
    ['Last complete', p.lastCompleteAt ? relativeTime(p.lastCompleteAt) : '—', p.lastEntryAt ? `Last entry ${relativeTime(p.lastEntryAt)}` : 'No entries yet'],
  ];
  el.innerHTML = `
    <div class="sum-tiles">
      ${tiles.map(([label, value, sub]) => `
        <div class="sum-tile"><div class="sum-label">${label}</div><div class="sum-value">${value}</div>${sub ? `<div class="sum-sub">${sub}</div>` : ''}</div>`).join('')}
    </div>
    <section class="pv-card flush">
      <div class="pv-toolbar"><span class="pv-toolbar-title">Overall progress</span><span class="pv-toolbar-note">All sources combined</span></div>
      <div class="table-responsive">
        <table class="pv-table">
          <thead><tr><th>Vendor name</th>${thCells(VENDOR_COLS)}</tr></thead>
          <tbody><tr><td class="cell-name">Main Frame</td>${VENDOR_COLS.map(([key]) => statCell(totals, key)).join('')}</tr></tbody>
        </table>
      </div>
    </section>`;
}
