'use strict';

// FW - Ratecard: ratecards, their markets and the CPI grid.

const fwr = { page: 1, sortDir: 'desc', mounted: false, flashId: null };

function renderFwRatecards() {
  document.title = 'FW - Ratecard · Base';
  const root = $('#fwRatecardsView');
  const desc = fwr.sortDir === 'desc';
  const list = [...fwRatecards].sort((a, b) => (desc ? b.id - a.id : a.id - b.id));
  const { rows, page, pages, start } = paginate(list, fwr.page, FW_PAGE_SIZE);
  fwr.page = page;
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">FW - Ratecard</h1>
      <p class="page-sub">CPI price lists for framework clients, per market, survey length and incidence rate.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <a class="btn btn-ghost btn-sm-h" href="#/fw-ratecards/new"><i class="bi bi-plus-circle"></i> New Ratecard</a>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table fwr-table">
          <thead><tr>
            <th aria-sort="${desc ? 'descending' : 'ascending'}"><button type="button" class="th-sort" data-fwr-action="sort">ID <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button></th>
            <th>Name</th><th class="t-num">Markets</th><th class="t-num">Countries</th>
          </tr></thead>
          <tbody>
            ${rows.map((rc) => `
              <tr class="row-link${rc.id === fwr.flashId ? ' row-flash' : ''}" data-href="#/fw-ratecards/${rc.id}">
                <td class="col-id">${rc.id}</td>
                <td><a class="cell-link" href="#/fw-ratecards/${rc.id}">${escapeHtml(rc.name)}</a></td>
                <td class="t-num">${rc.markets.length}</td>
                <td class="t-num">${rc.markets.reduce((s, m) => s + m.countries.length, 0)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span class="page-info">Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> ratecards</span>
        <nav aria-label="Ratecard pages">${pagerHtml(page, pages, 'fwr-page')}</nav>
      </div>
    </section>`;
  fwr.flashId = null;
  if (!fwr.mounted) {
    root.addEventListener('click', (e) => {
      const pageBtn = e.target.closest('[data-fwr-page]');
      if (pageBtn) {
        if (!pageBtn.disabled) {
          fwr.page = Number(pageBtn.dataset.fwrPage);
          renderFwRatecards();
        }
        return;
      }
      if (e.target.closest('[data-fwr-action="sort"]')) {
        fwr.sortDir = fwr.sortDir === 'desc' ? 'asc' : 'desc';
        renderFwRatecards();
        return;
      }
      const row = e.target.closest('tr[data-href]');
      if (row && !e.target.closest('a, button')) location.hash = row.dataset.href;
    });
    fwr.mounted = true;
  }
}

/* One ratecard: its name and markets. */
const fwRatecardForm = { routeId: null, dirty: false, hash: '', label: 'on this ratecard' };
formGuards['fw-ratecard'] = fwRatecardForm;
const fwm = { search: '', sortDir: 'desc', page: 1 };

function renderFwRatecard(id) {
  const rc = id === 'new' ? null : fwRatecards.find((x) => x.id === Number(id));
  if (id !== 'new' && !rc) {
    history.replaceState(null, '', '#/fw-ratecards');
    showToast("That ratecard couldn't be found.", 'info');
    showPage('fw-ratecards');
    return;
  }
  if (fwRatecardForm.routeId !== id) Object.assign(fwm, { search: '', sortDir: 'desc', page: 1 });
  Object.assign(fwRatecardForm, { routeId: id, dirty: false, hash: `#/fw-ratecards/${id}` });
  document.title = `${rc ? rc.name : 'New ratecard'} · Base`;
  const root = $('#fwRatecardView');
  root.innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/fw-ratecards" title="Back to ratecards" aria-label="Back to ratecards"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">Ratecard</h1>
        <p class="page-sub">${rc ? `${escapeHtml(rc.name)} · ratecard #${rc.id} · ${plural(rc.markets.length, 'market')}` : 'Name the ratecard, then add its markets.'}</p>
      </div>
    </header>
    <section class="pv-card">
      <form id="fwrForm" novalidate autocomplete="off">
        <div class="uf-row fwr-name">
          <label class="form-label" for="fwrName">Name</label>
          <div><input class="form-control" id="fwrName" name="name" required maxlength="60" value="${rc ? escapeHtml(rc.name) : ''}">
            <div class="invalid-feedback" id="fwrNameFeedback">Enter a name.</div></div>
        </div>
        <div class="pv-form-actions">
          <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> ${rc ? 'Save' : 'Create ratecard'}</button>
          <button type="button" class="btn btn-ghost" data-fwr-action="cancel">Cancel</button>
          <span class="dirty-flag" id="fwrDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
        </div>
      </form>
    </section>
    ${rc ? `
      <section class="pv-card flush">
        <div class="pv-toolbar">
          <button type="button" class="btn btn-ghost btn-sm-h" data-fwr-action="new-market"><i class="bi bi-plus-circle"></i> New Market</button>
        </div>
        <div class="list-filters">${searchGroupHtml('fw-markets', 'Search markets…', fwm.search)}</div>
        <div class="table-responsive">
          <table class="pv-table list-table fwm-table">
            <thead id="fwmHead"></thead>
            <tbody id="fwmRows"></tbody>
          </table>
        </div>
        <div class="table-footer" id="fwmFooter"></div>
      </section>` : ''}`;
  if (rc) renderFwMarketRows(rc);

  const form = $('#fwrForm');
  form.addEventListener('input', () => {
    if (fwRatecardForm.dirty) return;
    fwRatecardForm.dirty = true;
    $('#fwrDirty').hidden = false;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.elements.name;
    const name = input.value.trim();
    const clash = fwRatecards.some((x) => x !== rc && x.name.toLowerCase() === name.toLowerCase());
    input.setCustomValidity(clash ? 'taken' : '');
    $('#fwrNameFeedback').textContent = clash ? 'Another ratecard already has this name.' : 'Enter a name.';
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      input.focus();
      return;
    }
    fwRatecardForm.dirty = false;
    if (rc) {
      rc.name = name;
      fwr.flashId = rc.id;
      showToast(`${name} saved.`);
      renderFwRatecard(String(rc.id));
      return;
    }
    const created = { id: Math.max(0, ...fwRatecards.map((x) => x.id)) + 1, name, markets: [] };
    fwRatecards.push(created);
    fwr.flashId = created.id;
    location.hash = `#/fw-ratecards/${created.id}`;
    showToast(`${name} created. Add its markets with New Market.`);
  });
  root.onclick = (e) => {
    const t = e.target;
    if (t.closest('[data-fwr-action="cancel"]')) {
      fwRatecardForm.dirty = false;
      location.hash = '#/fw-ratecards';
      return;
    }
    if (!rc) return;
    if (t.closest('[data-fwr-action="new-market"]')) {
      openMarketModal(rc, null);
      return;
    }
    const pageBtn = t.closest('[data-fwm-page]');
    if (pageBtn) {
      if (!pageBtn.disabled) {
        fwm.page = Number(pageBtn.dataset.fwmPage);
        renderFwMarketRows(rc);
      }
      return;
    }
    if (t.closest('[data-fwm-action="sort"]')) {
      fwm.sortDir = fwm.sortDir === 'desc' ? 'asc' : 'desc';
      renderFwMarketRows(rc);
      return;
    }
    if (t.closest('[data-search-go]')) {
      $('[data-search="fw-markets"]').focus();
      return;
    }
    if (t.closest('[data-search-clear]')) {
      fwm.search = '';
      fwm.page = 1;
      $('[data-search="fw-markets"]').value = '';
      renderFwMarketRows(rc);
      return;
    }
    const row = t.closest('tr[data-market]');
    if (row) openMarketModal(rc, rc.markets.find((m) => m.id === Number(row.dataset.market)));
  };
  root.oninput = (e) => {
    if (e.target.dataset.search !== 'fw-markets') return;
    fwm.search = e.target.value;
    fwm.page = 1;
    renderFwMarketRows(rc);
  };
  if (!rc) $('#fwrName').focus();
}

function renderFwMarketRows(rc, flashId = null) {
  const q = fwm.search.trim().toLowerCase();
  const desc = fwm.sortDir === 'desc';
  const list = rc.markets
    .filter((m) => !q || `${m.id} ${m.countries.join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => (desc ? b.id - a.id : a.id - b.id));
  const { rows, page, pages, start } = paginate(list, fwm.page, FW_PAGE_SIZE);
  fwm.page = page;
  $('#fwmHead').innerHTML = `
    <tr>
      <th aria-sort="${desc ? 'descending' : 'ascending'}"><button type="button" class="th-sort" data-fwm-action="sort">ID <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button></th>
      <th>Markets</th>
    </tr>`;
  $('#fwmRows').innerHTML = rows.length
    ? rows.map((m) => `
        <tr class="row-link${m.id === flashId ? ' row-flash' : ''}" data-market="${m.id}">
          <td class="col-id">${m.id}</td>
          <td class="fwm-countries"><button type="button" class="cell-link fwm-link">${escapeHtml(m.countries.join(', '))}</button></td>
        </tr>`).join('')
    : emptyRow(2, q ? 'No markets found' : 'No markets yet', q ? 'Try a different search.' : 'Add a market with New Market to price it.');
  $('#fwmFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> markets` : 'No markets to show'}</span>
    <nav aria-label="Market pages">${pagerHtml(page, pages, 'fwm-page')}</nav>`;
}

// Ratecard details: the markets this price list covers and the CPI per survey length and incidence rate.
function openMarketModal(rc, market) {
  const grid = market ? market.cpi || cpiGrid(market.factor) : emptyCpiGrid();
  openFormModal({
    title: 'Ratecard details',
    subtitle: `${rc.name} · ${market ? `market #${market.id}` : 'new market'}`,
    wide: 'xl',
    body: `
      <div class="rc-import">
        <div class="input-group">
          <input class="form-control" type="file" id="rcFile" accept=".xlsx,.xls" aria-describedby="rcFileHelp">
          <button type="button" class="btn btn-import" id="rcImport" disabled><i class="bi bi-upload"></i> Import</button>
        </div>
        <div class="field-help" id="rcFileHelp">Select XLSX file to import CPI data</div>
      </div>
      <label class="form-label mt-3" for="rcMarketsInput">Market</label>
      <div id="rcMarkets"></div>
      <div class="invalid-feedback" id="rcMarketsFeedback">Select at least one market.</div>
      <div class="rc-wrap">
        <table class="rc-grid">
          <thead>
            <tr><th class="rc-corner"></th><th class="rc-ir-title" colspan="${FW_IR.length}">Incidence Rate</th></tr>
            <tr><th class="rc-loi-head">LOI</th>${FW_IR.map((ir) => `<th>${ir}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${FW_LOI.map((loi, r) => `
              <tr>
                <th class="rc-loi" scope="row">${loi}</th>
                ${FW_IR.map((ir, c) => `
                  <td><div class="rc-cell">
                    ${FW_CURRENCIES.map(([cur, sign]) => `
                      <label class="rc-price"><span aria-hidden="true">${sign}</span><input type="number" min="0" step="0.01" inputmode="decimal"
                        data-cur="${cur}" data-r="${r}" data-c="${c}" value="${grid[cur][r][c]}" aria-label="${loi}, ${ir}, ${cur.toUpperCase()}"></label>`).join('')}
                  </div></td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`,
    submitLabel: '<i class="bi bi-check2"></i> Save',
    onSubmit: () => {
      const countries = picker.getValue();
      const taken = countries.filter((c) => rc.markets.some((m) => m !== market && m.countries.includes(c)));
      const msg = $('#rcMarketsFeedback');
      msg.textContent = !countries.length ? 'Select at least one market.' : `Already priced in another market of this ratecard: ${taken.join(', ')}.`;
      const bad = !countries.length || taken.length > 0;
      picker.setInvalid(bad);
      msg.classList.toggle('d-block', bad);
      if (bad) {
        $('#rcMarketsInput').focus();
        return false;
      }
      const cpi = emptyCpiGrid();
      $$('#pvModalBody .rc-price input').forEach((input) => {
        cpi[input.dataset.cur][Number(input.dataset.r)][Number(input.dataset.c)] = Number(input.value) || 0;
      });
      let saved = market;
      if (market) {
        Object.assign(market, { countries, cpi });
      } else {
        const id = Math.max(0, ...fwRatecards.flatMap((x) => x.markets.map((m) => m.id))) + 1;
        saved = { id, countries, factor: 1, cpi };
        rc.markets.push(saved);
        fwm.page = 1;
      }
      if (currentView === 'fw-ratecard') {
        renderFwMarketRows(rc, saved.id);
        $('#fwRatecardView .page-sub').textContent = `${rc.name} · ratecard #${rc.id} · ${plural(rc.markets.length, 'market')}`;
      }
      showToast(market ? `${countries.join(', ')} saved.` : `Market ${countries.join(', ')} added to ${rc.name}.`);
      return true;
    },
  });
  const picker = createMultiSelect($('#rcMarkets'), {
    id: 'rcMarketsInput',
    options: FW_MARKETS.map((m) => ({ value: m, label: m })),
    selected: market ? market.countries : [],
    placeholder: 'Select...',
    onChange: (value) => {
      if (!value.length) return;
      picker.setInvalid(false);
      $('#rcMarketsFeedback').classList.remove('d-block');
    },
  });
  const body = $('#pvModalBody');
  body.onchange = (e) => {
    if (e.target.id === 'rcFile') $('#rcImport').disabled = !e.target.files.length;
  };
  body.onclick = (e) => {
    if (!e.target.closest('#rcImport')) return;
    const file = $('#rcFile').files[0];
    showToast(`Importing CPI data from ${file.name} isn't connected yet in this preview. Type the prices in the grid instead.`, 'info');
  };
}
