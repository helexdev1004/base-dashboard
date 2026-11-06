'use strict';

// Survey points per panel and survey length.

// { id, panel, countries: ['fr'], points: [[minutes, points]] }
const surveyPoints = [];
const defaultPoints = (upTo) => Array.from({ length: upTo }, (_, i) => [i + 1, Math.ceil((i + 1) / 5) * 5]);

(function seedSurveyPoints() {
  const all = WORLD_COUNTRIES.map((c) => c.code);
  [
    ['gavenze', all],
    ['encuestat', ['ar', 'at', 'be', 'bo', 'br', 'ca', 'cl', 'co', 'fr', 'de', 'ie', 'it', 'mx', 'nl', 'pe', 'pl', 'pt', 'es', 'ch', 'gb', 'us']],
    ['sondage', ['fr']],
    ['mening', ['nl']],
    ['opinion', ['gb']],
    ['sondaggi', ['it']],
  ].forEach(([panel, countries], i) => surveyPoints.push({ id: i + 1, panel, countries, points: defaultPoints(50) }));
}());

const sp = { page: 1, mounted: false, flashId: null };
const countryNames = (codes) => codes.map(countryName).sort((a, b) => a.localeCompare(b)).join(', ');

function renderSurveyPoints() {
  document.title = 'Survey points · Base';
  const root = $('#surveyPointsView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Survey points</h1>
      <p class="page-sub">The points respondents see for a survey, by survey length. Open a panel to change its points per minute.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-sp-action="new"><i class="bi bi-plus-circle"></i> New Points</button>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table sp-table">
          <thead><tr><th>Panel</th><th>Countries</th></tr></thead>
          <tbody id="spRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="spFooter"></div>
    </section>`;
  if (!sp.mounted) {
    root.addEventListener('click', onSurveyPointsClick);
    sp.mounted = true;
  }
  renderSurveyPointRows();
}

function renderSurveyPointRows() {
  const { rows, page, pages, start } = paginate(surveyPoints, sp.page, 10);
  sp.page = page;
  $('#spRows').innerHTML = rows.length
    ? rows.map((x) => `
        <tr class="row-link${x.id === sp.flashId ? ' row-flash' : ''}" data-sp="${x.id}">
          <td class="sp-panel"><button type="button" class="cell-link">${escapeHtml(panelLabel(panelBySlug(x.panel)))}</button></td>
          <td class="sp-countries">${escapeHtml(countryNames(x.countries))}</td>
        </tr>`).join('')
    : emptyRow(2, 'No survey points yet', 'Add points for a panel to get started.');
  sp.flashId = null;
  $('#spFooter').innerHTML = `
    <span class="page-info">${surveyPoints.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${surveyPoints.length}</strong>` : 'Nothing to show'}</span>
    <nav aria-label="Survey points pages">${pagerHtml(page, pages, 'sp-page')}</nav>`;
}

function onSurveyPointsClick(e) {
  const pageBtn = e.target.closest('[data-sp-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      sp.page = Number(pageBtn.dataset.spPage);
      renderSurveyPointRows();
    }
    return;
  }
  if (e.target.closest('[data-sp-action="new"]')) {
    openSurveyPoints(null);
    return;
  }
  const row = e.target.closest('tr[data-sp]');
  if (row) openSurveyPoints(surveyPoints.find((x) => x.id === Number(row.dataset.sp)));
}

const pointRowHtml = (minutes, points) => `
  <div class="sp-row">
    <div class="input-group input-group-sm sp-loi">
      <input class="form-control" type="number" value="${minutes}" readonly tabindex="-1" aria-label="Survey length">
      <span class="input-group-text">min</span>
    </div>
    <input class="form-control form-control-sm sp-pts" type="number" min="0" max="100000" step="1" required value="${points}" aria-label="Points for ${minutes} minutes">
    <button type="button" class="icon-btn-sm sp-del" data-sp-del title="Remove ${minutes} min" aria-label="Remove ${minutes} minutes"><i class="bi bi-trash3"></i></button>
  </div>`;

function openSurveyPoints(entry) {
  const taken = new Set(surveyPoints.filter((x) => x !== entry).map((x) => x.panel));
  const panelOpts = PANEL_INFO.filter((p) => entry ? p.slug === entry.panel : !taken.has(p.slug)).map((p) => [p.slug, panelLabel(p)]);
  openFormModal({
    title: 'Survey Points',
    subtitle: entry ? `${entry.points.length} minutes set` : 'Points per minute of survey length for a panel.',
    body: `
      <label class="form-label" for="spPanel">Panel</label>
      <select class="form-select" id="spPanel" name="panel" required ${entry ? 'disabled' : ''}>
        ${entry ? '' : '<option value="">Select a panel</option>'}${optionsHtml(panelOpts, entry?.panel)}
      </select>
      <div class="invalid-feedback">Select a panel.</div>
      <label class="form-label mt-3" for="spMarketsInput">Markets</label>
      <div id="spMarkets"></div>
      <div class="invalid-feedback" id="spMarketsFeedback">Pick at least one market.</div>
      <div class="sp-head">
        <span class="form-label m-0">Points</span>
        <button type="button" class="icon-btn-sm" data-sp-add title="Add the next minute" aria-label="Add the next minute"><i class="bi bi-plus-circle"></i></button>
      </div>
      <div class="sp-cols"><span>LOI</span><span>Point</span><span></span></div>
      <div class="sp-list" id="spList">${(entry ? entry.points : [[1, '']]).map(([m, pts]) => pointRowHtml(m, pts)).join('')}</div>`,
    submitLabel: entry ? '<i class="bi bi-check2"></i> Save' : '<i class="bi bi-plus-lg"></i> Create',
    onSubmit: (form) => {
      const markets = picker.getValue();
      picker.setInvalid(!markets.length);
      $('#spMarketsFeedback').classList.toggle('d-block', !markets.length);
      if (!markets.length) return false;
      const points = $$('#spList .sp-row').map((row) => [Number($('.sp-loi input', row).value), Number($('.sp-pts', row).value)]);
      if (!points.length) {
        showToast('Add at least one minute.', 'info');
        return false;
      }
      if (entry) {
        Object.assign(entry, { countries: markets, points });
        sp.flashId = entry.id;
        showToast(`Survey points for ${panelLabel(panelBySlug(entry.panel))} saved.`);
      } else {
        const created = { id: Math.max(0, ...surveyPoints.map((x) => x.id)) + 1, panel: form.elements.panel.value, countries: markets, points };
        surveyPoints.push(created);
        Object.assign(sp, { page: Infinity, flashId: created.id });
        showToast(`Survey points for ${panelLabel(panelBySlug(created.panel))} added.`);
      }
      if (currentView === 'survey-points') renderSurveyPointRows();
      return true;
    },
  });
  const picker = createMultiSelect($('#spMarkets'), {
    id: 'spMarketsInput',
    options: countryOptions().map(([value, label]) => ({ value, label })),
    selected: entry ? entry.countries : [],
    placeholder: 'Select markets…',
    onChange: (value) => {
      if (!value.length) return;
      picker.setInvalid(false);
      $('#spMarketsFeedback').classList.remove('d-block');
    },
  });
  $('#pvModalBody').onclick = (e) => {
    const list = $('#spList');
    if (e.target.closest('[data-sp-add]')) {
      const next = Math.max(0, ...$$('.sp-loi input', list).map((i) => Number(i.value))) + 1;
      list.insertAdjacentHTML('beforeend', pointRowHtml(next, ''));
      const input = $('.sp-row:last-child .sp-pts', list);
      list.scrollTop = list.scrollHeight;
      input.focus();
      return;
    }
    const del = e.target.closest('[data-sp-del]');
    if (del) del.closest('.sp-row').remove();
  };
}
