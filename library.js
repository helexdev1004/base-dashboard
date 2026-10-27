'use strict';

/* =========================================================
   Base · Screener Library
   Reusable screener questions per country (#/screener-library) and the
   question editor (#/screener-library/<id|new>). Questions marked
   "Project default" start the screener of every new project in that
   country. Uses helpers from script.js and project.js.
   ========================================================= */

const LIBRARY_PAGE_SIZE = 10;
const LIBRARY_ACTIONS = [
  ['none', 'No action'], ['S1', 'S1'], ['S2', 'S2'], ['Q2', 'Q2'], ['QFAIL2', 'QFAIL2'], ['Required', 'Required'], ['Qualify', 'Qualify'],
];

// { id, name, country ('AT'), text, type, projectDefault, answers: [[text, action]] }
const SCREENER_LIBRARY = [];

(function seedLibrary() {
  // Austria, as in the reference design.
  const austria = [
    [25, 'Quality - Brands', 'Welche der folgenden Marken kennst du?', 'Multiple choice', false,
      [['Red Bull'], ['Manner'], ['Billa'], ['Spar'], ['Velmora', 'QFAIL2'], ['Keine davon']]],
    [122, 'Education', 'Was ist Ihre höchste abgeschlossene Schulbildung?', 'Single radio', true,
      [['Pflichtschule'], ['Lehre'], ['Berufsbildende mittlere Schule'], ['Matura'], ['Universität / Hochschule']]],
    [26, 'Quality - Math', 'Wieviel ist 2 + 2?', 'Single radio', false,
      [['3', 'QFAIL2'], ['4'], ['5', 'QFAIL2'], ['22', 'QFAIL2'], ['Weiß nicht', 'QFAIL2']]],
    [27, 'Quality - Activities', 'Welche der folgenden Aktivitäten haben Sie in den letzten 12 Monaten durchgeführt?', 'Multiple choice', false,
      [['Urlaub im Ausland'], ['Ein Konzert besucht'], ['Ein Auto gekauft'], ['Den Mond besucht', 'QFAIL2'], ['Ein Buch gelesen'],
        ['Sport getrieben'], ['Ein Restaurant besucht'], ['Umgezogen'], ['Nichts davon']]],
    [23, 'Region - NUTS-2', 'In welchem Bundesland in Österreich lebst du?', 'Single dropdown', true,
      regionsFor('at').map((r) => [r])],
    [22, 'Gender', 'Sind Sie ...?', 'Single radio', false, [['Männlich'], ['Weiblich']]],
    [303, 'HHI monthly', 'Wenn Sie alle Einkommen Ihres Haushaltes zusammenzählen, wie hoch ist das monatliche Nettoeinkommen Ihres gesamten Haushaltes? Ist das...', 'Single dropdown', false,
      [['unter 500 €'], ['500 – 999 €'], ['1.000 – 1.499 €'], ['1.500 – 1.999 €'], ['2.000 – 2.499 €'], ['2.500 – 2.999 €'],
        ['3.000 – 3.499 €'], ['3.500 – 3.999 €'], ['4.000 – 4.499 €'], ['4.500 – 4.999 €'], ['5.000 – 5.499 €'], ['5.500 – 5.999 €'],
        ['6.000 – 6.499 €'], ['6.500 – 6.999 €'], ['7.000 € und mehr'], ['Weiß nicht'], ['Keine Angabe', 'S2']]],
    [24, 'Quality - Sky', 'Welche Farbe hat der Himmel?', 'Single radio', false,
      [['Blau'], ['Grün', 'QFAIL2'], ['Rot', 'QFAIL2'], ['Gelb', 'QFAIL2'], ['Weiß nicht', 'QFAIL2']]],
  ];
  austria.forEach(([id, name, text, type, projectDefault, answers]) => {
    SCREENER_LIBRARY.push({
      id, name: `Austria - ${name}`, country: 'AT', text, type, projectDefault,
      answers: answers.map(([answer, action = 'none']) => [answer, action]),
    });
  });

  // A standard set for every country projects run in.
  const used = new Set(austria.map(([id]) => id));
  const template = (id) => SCREENER_TEMPLATES.find((t) => t.id === id);
  let nextId = 30;
  COUNTRIES.forEach((c) => {
    [
      ['Gender', template('gender'), true],
      ['Age', template('age'), true],
      ['Region', { text: `Which region of ${c.name} do you live in?`, type: 'Single dropdown', answers: regionsFor(c.code).map((r) => [r]) }, true],
      ['Education', template('education'), false],
      ['Employment', template('employment'), false],
    ].forEach(([label, t, projectDefault]) => {
      while (used.has(nextId)) nextId += 1;
      used.add(nextId);
      SCREENER_LIBRARY.push({
        id: nextId,
        name: `${c.name} - ${label}`,
        country: c.code.toUpperCase(),
        text: t.text,
        type: t.type,
        projectDefault,
        answers: t.answers.map(([answer, action = 'none']) => [answer, action === 'QFAIL1' ? 'QFAIL2' : action]),
      });
    });
  });
}());

/* ---------- List ---------- */
const lib = { country: 'AT', defaultsOnly: false, page: 1, mounted: false, flashId: null };

function libraryCountries() {
  return [...new Set(SCREENER_LIBRARY.map((q) => q.country))]
    .map((code) => [code, countryName(code)])
    .sort((a, b) => a[1].localeCompare(b[1]));
}

function visibleLibrary() {
  return SCREENER_LIBRARY.filter((q) => (!lib.country || q.country === lib.country) && (!lib.defaultsOnly || q.projectDefault));
}

function renderLibrary() {
  document.title = 'Screener Library · Base';
  const root = $('#libraryView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Screener Library</h1>
      <p class="page-sub">Reusable screener questions. Project defaults are added to every new project in their country.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <a class="btn btn-ghost btn-sm-h" href="#/screener-library/new"><i class="bi bi-plus-circle"></i> New Question</a>
      </div>
      <div class="list-filters">
        <select class="form-select pv-filter" data-lib-filter="country" aria-label="Country">
          <option value="">All countries</option>
          ${optionsHtml(libraryCountries(), lib.country)}
        </select>
        <div class="form-check form-switch m-0 lib-switch">
          <input class="form-check-input" type="checkbox" role="switch" id="libDefaults" data-lib-filter="defaults" ${lib.defaultsOnly ? 'checked' : ''}>
          <label class="form-check-label" for="libDefaults">Project defaults</label>
        </div>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table">
          <thead><tr><th>ID</th><th>Name</th><th>Country</th><th>Question</th><th>Project default</th><th>Answers</th></tr></thead>
          <tbody id="libRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="libFooter"></div>
    </section>`;
  if (!lib.mounted) {
    root.addEventListener('click', onLibraryClick);
    root.addEventListener('change', onLibraryChange);
    lib.mounted = true;
  }
  renderLibraryRows();
}

function renderLibraryRows() {
  const list = visibleLibrary();
  const { rows, page, pages, start } = paginate(list, lib.page, LIBRARY_PAGE_SIZE);
  lib.page = page;
  $('#libRows').innerHTML = rows.length
    ? rows.map((q) => `
        <tr class="row-link${q.id === lib.flashId ? ' row-flash' : ''}" data-href="#/screener-library/${q.id}">
          <td class="col-id">${q.id}</td>
          <td><a class="cell-link" href="#/screener-library/${q.id}">${escapeHtml(q.name)}</a></td>
          <td>${q.country}</td>
          <td class="lib-question">${escapeHtml(q.text)}</td>
          <td>${q.projectDefault ? '<span class="pill pill-yes">Yes</span>' : '<span class="t-muted">No</span>'}</td>
          <td>${fmtInt(q.answers.length)}</td>
        </tr>`).join('')
    : emptyRow(6, 'No questions found', lib.defaultsOnly ? 'No project defaults for this country yet.' : 'Add a question to start this country’s library.');
  lib.flashId = null;
  $('#libFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> questions` : 'No questions to show'}</span>
    <nav aria-label="Library pages">${pagerHtml(page, pages, 'lib-page')}</nav>`;
}

function onLibraryClick(e) {
  const pageBtn = e.target.closest('[data-lib-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      lib.page = Number(pageBtn.dataset.libPage);
      renderLibraryRows();
    }
    return;
  }
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button')) location.hash = row.dataset.href;
}

function onLibraryChange(e) {
  const kind = e.target.dataset.libFilter;
  if (kind === 'country') lib.country = e.target.value;
  else if (kind === 'defaults') lib.defaultsOnly = e.target.checked;
  else return;
  lib.page = 1;
  renderLibraryRows();
}

/* ---------- Question editor ---------- */
const libForm = { routeId: null, dirty: false, hash: '', label: 'on this question' };
formGuards['library-form'] = libForm;

function libraryAnswerRow(answer = '', action = 'none') {
  return `
    <div class="ans-row">
      <input class="form-control ans-text" value="${escapeHtml(answer)}" maxlength="200" placeholder="Answer text" aria-label="Answer text">
      <div class="segmented seg-xs ans-actions" role="radiogroup" aria-label="Action for this answer">
        ${LIBRARY_ACTIONS.map(([value, label]) => `
          <button type="button" role="radio" data-lib-action="answer-action" data-value="${value}"
                  class="${action === value ? 'active' : ''}" aria-checked="${action === value}">${label}</button>`).join('')}
      </div>
      <button type="button" class="icon-btn-sm danger" data-lib-action="answer-remove" aria-label="Remove answer"><i class="bi bi-trash3"></i></button>
    </div>`;
}

function renderLibraryForm(id) {
  const q = id === 'new' ? null : SCREENER_LIBRARY.find((x) => x.id === Number(id));
  const root = $('#libraryFormView');
  if (id !== 'new' && !q) {
    history.replaceState(null, '', '#/screener-library');
    showToast("That question couldn't be found.", 'info');
    showPage('screener-library');
    return;
  }
  Object.assign(libForm, { routeId: id, dirty: false, hash: `#/screener-library/${id}` });
  document.title = `${q ? q.name : 'New question'} · Base`;
  const country = q ? q.country : lib.country || 'AT';
  const isDefault = q ? q.projectDefault : false;
  const answers = q ? q.answers : [['', 'none'], ['', 'none']];

  root.innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/screener-library" title="Back to the Screener Library" aria-label="Back to the Screener Library"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">${q ? escapeHtml(q.name) : 'New question'}</h1>
        <p class="page-sub">${q ? `Question #${q.id} · ${escapeHtml(countryName(q.country))}` : 'Add a reusable screener question.'}</p>
      </div>
    </header>

    <form id="libQuestionForm" class="vendor-form" novalidate autocomplete="off">
      <section class="pv-card">
        <div class="pv-card-head">
          <h2 class="pv-card-title">Question</h2>
          <span class="dirty-flag" id="libDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
        </div>
        <div class="row g-3">
          <div class="col-lg-6">
            <label class="form-label" for="lqName">Name</label>
            <input class="form-control" id="lqName" name="name" required maxlength="100" value="${q ? escapeHtml(q.name) : ''}" placeholder="e.g. Austria - Gender">
            <div class="invalid-feedback">Enter a name.</div>
          </div>
          <div class="col-lg-4 col-sm-8">
            <label class="form-label" for="lqCountry">Country</label>
            <select class="form-select" id="lqCountry" name="country" required>
              <option value="">Select a country</option>
              ${optionsHtml(countryOptions().map(([code, name]) => [code.toUpperCase(), name]), country)}
            </select>
            <div class="invalid-feedback">Select a country.</div>
          </div>
          <div class="col-lg-2 col-sm-4">
            <span class="form-label d-block" id="lqDefaultLabel">Project default</span>
            <div class="segmented seg-field" role="group" aria-labelledby="lqDefaultLabel" data-lq-default>
              <button type="button" data-lib-action="default" data-value="1" class="${isDefault ? 'active' : ''}" aria-pressed="${isDefault}">Yes</button>
              <button type="button" data-lib-action="default" data-value="0" class="${isDefault ? '' : 'active'}" aria-pressed="${!isDefault}">No</button>
            </div>
          </div>
          <div class="col-lg-9">
            <label class="form-label" for="lqText">Question text</label>
            <input class="form-control" id="lqText" name="text" required maxlength="400" value="${q ? escapeHtml(q.text) : ''}" placeholder="Type the question">
            <div class="invalid-feedback">Enter the question text.</div>
          </div>
          <div class="col-lg-3">
            <label class="form-label" for="lqType">Type</label>
            <select class="form-select" id="lqType" name="type">${optionsHtml(QUESTION_TYPES.map((t) => [t, t]), q ? q.type : 'Single radio')}</select>
          </div>
        </div>
        <div class="pv-form-actions">
          <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> ${q ? 'Save' : 'Create question'}</button>
          ${q ? '<button type="button" class="btn btn-danger-solid" data-lib-action="delete"><i class="bi bi-trash3"></i> Delete</button>' : ''}
          <button type="button" class="btn btn-ghost" data-lib-action="cancel">Cancel</button>
        </div>
      </section>

      <section class="pv-card" id="lqAnswers" ${TYPES_WITHOUT_ANSWERS.has(q ? q.type : 'Single radio') ? 'hidden' : ''}>
        <div class="ans-toolbar">
          <button type="button" class="btn btn-ghost btn-xs" data-lib-action="answer-add"><i class="bi bi-plus-circle"></i> Add answer</button>
          <span class="pv-toolbar-note">Choose what happens when a respondent picks each answer.</span>
          <button type="button" class="icon-btn-sm ms-auto" data-lib-action="refresh" title="Refresh" aria-label="Refresh"><i class="bi bi-arrow-clockwise"></i></button>
        </div>
        <div class="ans-list" id="lqAnswerList">${answers.map(([a, act]) => libraryAnswerRow(a, act)).join('')}</div>
      </section>
    </form>`;

  const form = $('#libQuestionForm');
  form.addEventListener('input', markLibraryDirty);
  form.addEventListener('change', onLibraryFormChange);
  form.addEventListener('click', onLibraryFormClick);
  form.addEventListener('submit', saveLibraryQuestion);
  if (!q) $('#lqName').focus();
}

function markLibraryDirty() {
  if (libForm.dirty) return;
  libForm.dirty = true;
  $('#libDirty').hidden = false;
}

function onLibraryFormChange(e) {
  markLibraryDirty();
  if (e.target.name === 'type') $('#lqAnswers').hidden = TYPES_WITHOUT_ANSWERS.has(e.target.value);
}

function onLibraryFormClick(e) {
  const el = e.target.closest('[data-lib-action]');
  if (!el) return;
  const pick = (group) => $$('button', group).forEach((b) => {
    const on = b === el;
    b.classList.toggle('active', on);
    b.setAttribute(b.getAttribute('role') === 'radio' ? 'aria-checked' : 'aria-pressed', String(on));
  });
  switch (el.dataset.libAction) {
    case 'default':
    case 'answer-action':
      pick(el.parentElement);
      markLibraryDirty();
      break;
    case 'answer-add':
      $('#lqAnswerList').insertAdjacentHTML('beforeend', libraryAnswerRow());
      $('#lqAnswerList .ans-row:last-child .ans-text').focus();
      markLibraryDirty();
      break;
    case 'answer-remove':
      el.closest('.ans-row').remove();
      markLibraryDirty();
      break;
    case 'refresh':
      showToast('The library question is up to date.', 'info');
      break;
    case 'cancel':
      libForm.dirty = false;
      location.hash = '#/screener-library';
      break;
    case 'delete': {
      if (!confirmClick(el, 'Click again to delete')) return;
      const q = SCREENER_LIBRARY.find((x) => x.id === Number(libForm.routeId));
      SCREENER_LIBRARY.splice(SCREENER_LIBRARY.indexOf(q), 1);
      libForm.dirty = false;
      location.hash = '#/screener-library';
      showToast(`${q.name} deleted.`, 'info');
      break;
    }
    default:
  }
}

function saveLibraryQuestion(e) {
  e.preventDefault();
  const form = e.currentTarget;
  form.classList.add('was-validated');
  if (!form.checkValidity()) {
    form.querySelector(':invalid')?.focus();
    return;
  }
  const type = form.elements.type.value;
  const answers = $$('#lqAnswerList .ans-row')
    .map((row) => [$('.ans-text', row).value.trim(), $('.ans-actions .active', row)?.dataset.value || 'none'])
    .filter(([text]) => text);
  if (!TYPES_WITHOUT_ANSWERS.has(type) && !answers.length) {
    showToast('Add at least one answer.', 'info');
    return;
  }
  const data = {
    name: form.elements.name.value.trim(),
    country: form.elements.country.value,
    text: form.elements.text.value.trim(),
    type,
    projectDefault: $('[data-lq-default] .active').dataset.value === '1',
    answers,
  };
  const existing = libForm.routeId === 'new' ? null : SCREENER_LIBRARY.find((x) => x.id === Number(libForm.routeId));
  let saved;
  if (existing) {
    saved = Object.assign(existing, data);
  } else {
    saved = { id: Math.max(0, ...SCREENER_LIBRARY.map((x) => x.id)) + 1, ...data };
    SCREENER_LIBRARY.push(saved);
  }
  // Show it in the list: its country, last page for a new question.
  Object.assign(lib, { country: saved.country, flashId: saved.id, page: existing ? lib.page : Infinity });
  if (lib.defaultsOnly && !saved.projectDefault) lib.defaultsOnly = false;
  libForm.dirty = false;
  location.hash = '#/screener-library';
  showToast(existing ? `${saved.name} saved.` : `${saved.name} added to the library.`);
}
