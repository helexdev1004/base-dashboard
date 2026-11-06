'use strict';

// FW - Feasibilities: completes per market, with import and export.

const fwf = { search: '', sortKey: 'market', sortDir: 'asc', page: 1, mounted: false, flashMarket: null };

function visibleFwFeasibilities() {
  const q = fwf.search.trim().toLowerCase();
  const dir = fwf.sortDir === 'asc' ? 1 : -1;
  return fwFeasibilities
    .filter((f) => !q || f.market.toLowerCase().includes(q))
    .sort((a, b) => (fwf.sortKey === 'market' ? a.market.localeCompare(b.market) * dir : ((a.value ?? -1) - (b.value ?? -1)) * dir || a.market.localeCompare(b.market)));
}

function renderFwFeasibilities() {
  document.title = 'FW - Feasibilities · Base';
  const root = $('#fwFeasibilitiesView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">FW - Feasibilities</h1>
      <p class="page-sub">How many completes each market can deliver, shown to framework clients when they order.</p>
    </header>
    <div class="tr-note" role="note">
      <i class="bi bi-info-circle"></i>
      <span>Total market feasibility based on suggested CPIs, age range 18-69, 100% incidence rate on gen pop and device agnostic script (all devices allowed)</span>
    </div>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-fwf-action="new"><i class="bi bi-plus-circle"></i> New Feasibility</button>
      </div>
      <div class="list-filters">
        ${searchGroupHtml('fw-feasibilities', 'Search markets…', fwf.search)}
        <div class="fwf-io">
          <input type="file" id="fwfFile" accept=".csv,.txt,.xlsx,.xls" hidden>
          <button type="button" class="btn btn-import btn-sm-h" data-fwf-action="import" title="CSV or Excel file with a market and a feasibility column"><i class="bi bi-upload"></i> Import</button>
          <button type="button" class="btn btn-export btn-sm-h" data-fwf-action="export"><i class="bi bi-download"></i> Export</button>
        </div>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table fwf-table">
          <thead id="fwfHead"></thead>
          <tbody id="fwfRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="fwfFooter"></div>
    </section>`;
  if (!fwf.mounted) {
    root.addEventListener('click', onFwFeasibilitiesClick);
    root.addEventListener('input', (e) => {
      if (e.target.dataset.search !== 'fw-feasibilities') return;
      fwf.search = e.target.value;
      fwf.page = 1;
      renderFwFeasibilityRows();
    });
    root.addEventListener('change', (e) => {
      if (e.target.id === 'fwfFile' && e.target.files.length) importFwFeasibilities(e.target);
    });
    fwf.mounted = true;
  }
  renderFwFeasibilityRows();
}

function renderFwFeasibilityRows() {
  const list = visibleFwFeasibilities();
  const { rows, page, pages, start } = paginate(list, fwf.page, FW_PAGE_SIZE);
  fwf.page = page;
  $('#fwfHead').innerHTML = `<tr>${sortTh('market', 'Market', fwf, 'fwf-sort')}${sortTh('value', 'Feasibility', fwf, 'fwf-sort')}</tr>`;
  $('#fwfRows').innerHTML = rows.length
    ? rows.map((f) => `
        <tr class="${f.market === fwf.flashMarket ? 'row-flash' : ''}">
          <td>${escapeHtml(f.market)}</td>
          <td class="fwf-value">${f.value == null ? '<span class="zero" title="Import feasibility data to fill this in">—</span>' : fmtInt(f.value)}</td>
        </tr>`).join('')
    : emptyRow(2, 'No markets found', fwf.search ? 'Try a different search.' : 'Add a market with New Feasibility.');
  fwf.flashMarket = null;
  $('#fwfFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> markets` : 'No markets to show'}</span>
    <nav aria-label="Feasibility pages">${pagerHtml(page, pages, 'fwf-page')}</nav>`;
}

function onFwFeasibilitiesClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-fwf-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      fwf.page = Number(pageBtn.dataset.fwfPage);
      renderFwFeasibilityRows();
    }
    return;
  }
  const sort = t.closest('[data-fwf-sort]');
  if (sort) {
    const key = sort.dataset.fwfSort;
    fwf.sortDir = fwf.sortKey === key && fwf.sortDir === 'asc' ? 'desc' : 'asc';
    fwf.sortKey = key;
    fwf.page = 1;
    renderFwFeasibilityRows();
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="fw-feasibilities"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    fwf.search = '';
    fwf.page = 1;
    $('[data-search="fw-feasibilities"]').value = '';
    renderFwFeasibilityRows();
    return;
  }
  const action = t.closest('[data-fwf-action]')?.dataset.fwfAction;
  if (action === 'new') openFeasibilityModal();
  else if (action === 'import') $('#fwfFile').click();
  else if (action === 'export') {
    const list = visibleFwFeasibilities();
    downloadCsv(`fw-feasibilities-${today()}.csv`, [['Market', 'Feasibility'], ...list.map((f) => [f.market, f.value ?? ''])]);
    showToast(`Exported ${plural(list.length, 'market')}.`);
  }
}

// New Feasibility: just the market. The number comes in with Import.
function openFeasibilityModal() {
  const listed = new Set(fwFeasibilities.map((f) => f.market));
  openFormModal({
    title: 'Feasibility',
    subtitle: 'Add a market. Its feasibility is filled in with Import.',
    body: `
      <label class="form-label" for="fwfMarket">Market</label>
      <div id="fwfMarketBox"></div>
      <div class="invalid-feedback">Select a market.</div>`,
    submitLabel: '<i class="bi bi-check2"></i> Save',
    onSubmit: () => {
      const market = $('#fwfMarket').value;
      fwFeasibilities.push({ market, value: null });
      Object.assign(fwf, { search: '', sortKey: 'market', sortDir: 'asc' });
      fwf.page = Math.floor(visibleFwFeasibilities().findIndex((f) => f.market === market) / FW_PAGE_SIZE) + 1;
      fwf.flashMarket = market;
      if (currentView === 'fw-feasibilities') renderFwFeasibilities();
      showToast(`${market} added. Import feasibility data to fill in its number.`);
      return true;
    },
  });
  createComboBox($('#fwfMarketBox'), {
    id: 'fwfMarket',
    options: FW_MARKETS.filter((m) => !listed.has(m)).map((m) => ({ value: m, label: m })),
    placeholder: 'Select...',
    onChange: (value) => $('#fwfMarket').setCustomValidity(value ? '' : 'Select a market.'),
  });
  $('#fwfMarket').setCustomValidity('Select a market.');
}

// Import: a CSV or Excel file with a market column and a feasibility column (header row optional).
async function importFwFeasibilities(input) {
  const file = input.files[0];
  input.value = '';
  try {
    const rows = await readTableFile(file);
    const known = new Map(FW_MARKETS.map((m) => [m.toLowerCase(), m]));
    let updated = 0;
    let added = 0;
    let skipped = 0;
    rows.forEach(([name = '', value = '']) => {
      const market = known.get(String(name).trim().toLowerCase());
      const n = Number(String(value).replace(/[\s,]/g, ''));
      if (!market || !Number.isFinite(n) || n < 0) {
        if (!/^market$/i.test(String(name).trim())) skipped += 1;
        return;
      }
      const row = fwFeasibilities.find((f) => f.market === market);
      if (row) {
        row.value = Math.round(n);
        updated += 1;
      } else {
        fwFeasibilities.push({ market, value: Math.round(n) });
        added += 1;
      }
    });
    renderFwFeasibilityRows();
    const parts = [updated && `${plural(updated, 'market')} updated`, added && `${plural(added, 'market')} added`, skipped && `${plural(skipped, 'row')} skipped`].filter(Boolean);
    showToast(parts.length ? `Imported ${file.name}: ${parts.join(', ')}.` : `Nothing to import in ${file.name}.`, updated || added ? 'success' : 'info');
  } catch (err) {
    showToast(err.message || `Couldn't read ${file.name}.`, 'info');
  }
}
