'use strict';

/* =========================================================
   Base · Translations, Survey points and First surveys
   Panel management ▸ Translations (#/translations): the panel sites' texts
   per category and language. Panel management ▸ Survey points
   (#/survey-points): points shown to respondents per survey length.
   First surveys (#/first-surveys): the survey new panelists get first.
   Uses helpers from script.js, project.js and panels.js.
   ========================================================= */

/* ---------- Translations ---------- */
const TRANSLATION_CATEGORIES = [
  'Portal', 'Invite Email', 'Reminder Email', 'Forgot Password Email', 'Registration Email', 'Reward request Email', 'Import registration Email',
];
const TRANSLATION_LANGUAGES = [
  'Arabic', 'Bulgarian', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Estonian', 'French', 'German', 'Greek',
  'Hungarian', 'Italian', 'Polish', 'Portuguese', 'Romanian', 'Slovak', 'Slovenian', 'Spanish', 'Swedish',
];
// The English text of each category, as it appears on the panel site or in the email.
const TRANSLATION_STRINGS = {
  Portal: [
    'No', 'FAQ', 'Yes', 'Code', 'Copy', 'Date', 'Points', 'My points', 'Rewards', 'Redeem', 'My account', 'Profile', 'Sign in',
    'Sign out', 'Email address', 'Password', 'Forgot your password?', 'Start survey', 'Available surveys', 'Survey history',
    'Contact us', 'Privacy policy', 'Terms and conditions', 'Save', 'Cancel',
  ],
  'Invite Email': [
    'A new survey is waiting for you', 'Hi {FIRST_NAME},', 'We have a new survey that matches your profile.',
    'It takes about {LOI} minutes.', 'You will earn {POINTS} points when you complete it.', 'Start the survey',
    "If the button doesn't work, copy this link into your browser:", 'Thank you for taking part!',
  ],
  'Reminder Email': [
    'Reminder: your survey is still open', 'Hi {FIRST_NAME},', 'You still have a survey waiting for you.',
    "It closes soon, so don't miss your {POINTS} points.", 'Continue the survey', 'Thank you!',
  ],
  'Forgot Password Email': [
    'Reset your password', 'Hi {FIRST_NAME},', 'We received a request to reset your password.', 'Choose a new password',
    "If you didn't ask for this, you can ignore this email.", 'This link expires in 24 hours.',
  ],
  'Registration Email': [
    'Please confirm your email address', 'Welcome to {PANEL}!', 'Please confirm your email address to activate your account.',
    'Confirm my email', 'You will get {POINTS} points as a welcome bonus.',
  ],
  'Reward request Email': [
    'We received your reward request', 'Hi {FIRST_NAME},', 'Thank you for your reward request: {REWARD}.',
    '{POINTS} points have been taken from your balance.', 'Your reward will be sent within 10 working days.',
  ],
  'Import registration Email': [
    'Your account is ready', 'Hi {FIRST_NAME},', 'An account has been created for you on {PANEL}.',
    'Set your password to sign in.', 'Set my password',
  ],
};
// Translations that are already filled in (the portal texts in a few languages).
const PORTAL_TRANSLATIONS = {
  Danish: ['Nej', 'Ofte stillede spørgsmål (FAQ)', 'Ja', 'Kode', 'Kopier', 'Dato', 'Point', 'Mine point', 'Belønninger', 'Indløs',
    'Min konto', 'Profil', 'Log ind', 'Log ud', 'E-mailadresse', 'Adgangskode', 'Glemt din adgangskode?', 'Start undersøgelse',
    'Tilgængelige undersøgelser', 'Undersøgelseshistorik', 'Kontakt os', 'Privatlivspolitik', 'Vilkår og betingelser', 'Gem', 'Annuller'],
  German: ['Nein', 'Häufige Fragen (FAQ)', 'Ja', 'Code', 'Kopieren', 'Datum', 'Punkte', 'Meine Punkte', 'Prämien', 'Einlösen',
    'Mein Konto', 'Profil', 'Anmelden', 'Abmelden', 'E-Mail-Adresse', 'Passwort', 'Passwort vergessen?', 'Umfrage starten',
    'Verfügbare Umfragen', 'Umfrageverlauf', 'Kontakt', 'Datenschutzerklärung', 'Allgemeine Geschäftsbedingungen', 'Speichern', 'Abbrechen'],
  Spanish: ['No', 'Preguntas frecuentes (FAQ)', 'Sí', 'Código', 'Copiar', 'Fecha', 'Puntos', 'Mis puntos', 'Recompensas', 'Canjear',
    'Mi cuenta', 'Perfil', 'Iniciar sesión', 'Cerrar sesión', 'Correo electrónico', 'Contraseña', '¿Olvidaste tu contraseña?', 'Empezar encuesta',
    'Encuestas disponibles', 'Historial de encuestas', 'Contáctanos', 'Política de privacidad', 'Términos y condiciones', 'Guardar', 'Cancelar'],
  French: ['Non', 'Foire aux questions (FAQ)', 'Oui', 'Code', 'Copier', 'Date', 'Points', 'Mes points', 'Récompenses', 'Échanger',
    'Mon compte', 'Profil', 'Se connecter', 'Se déconnecter', 'Adresse e-mail', 'Mot de passe', 'Mot de passe oublié ?', "Commencer l'enquête",
    'Enquêtes disponibles', 'Historique des enquêtes', 'Nous contacter', 'Politique de confidentialité', 'Conditions générales', 'Enregistrer', 'Annuler'],
};

const savedTranslations = new Map(); // "<panel>|<category>|<language>" → [text]
const tr = { panel: '', category: '', language: '', mounted: false };
const trForm = { dirty: false, hash: '#/translations', label: 'on these translations' };
formGuards.translations = trForm;

const trKey = () => `${tr.panel}|${tr.category}|${tr.language}`;
function translationsFor(category, language, key) {
  if (savedTranslations.has(key)) return savedTranslations.get(key);
  const english = TRANSLATION_STRINGS[category];
  const known = category === 'Portal' ? PORTAL_TRANSLATIONS[language] : null;
  return english.map((_, i) => known?.[i] ?? '');
}

function renderTranslations() {
  document.title = 'Translations · Base';
  trForm.dirty = false;
  const root = $('#translationsView');
  const select = (name, blank, opts, value) => `
    <select class="form-select" id="tr-${name}" data-tr="${name}" aria-label="${blank.replace(/-- /g, '').replace(/ --/g, '')}">
      <option value="">${blank}</option>${optionsHtml(opts, value)}
    </select>`;
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Translations</h1>
      <p class="page-sub">The texts on each panel's site and in its emails. English is on the left, the translation on the right.</p>
    </header>
    <section class="pv-card tr-pickers">
      ${select('panel', '-- Select panel --', PANEL_INFO.map((p) => [p.slug, panelLabel(p)]), tr.panel)}
      ${select('category', '-- Select category --', TRANSLATION_CATEGORIES.map((c) => [c, c]), tr.category)}
      ${select('language', '-- Select language --', TRANSLATION_LANGUAGES.map((l) => [l, l]), tr.language)}
    </section>
    <div id="trBody"></div>`;
  if (!tr.mounted) {
    root.addEventListener('change', onTranslationsChange);
    root.addEventListener('input', onTranslationsInput);
    root.addEventListener('click', onTranslationsClick);
    tr.mounted = true;
  }
  renderTranslationRows();
}

function renderTranslationRows() {
  const body = $('#trBody');
  if (!tr.panel || !tr.category || !tr.language) {
    body.innerHTML = `
      <div class="tr-note" role="note">
        <i class="bi bi-info-circle"></i>
        <span>To edit translations please select a <strong>panel</strong>, <strong>category</strong> and <strong>language</strong>.</span>
      </div>`;
    return;
  }
  const english = TRANSLATION_STRINGS[tr.category];
  const texts = translationsFor(tr.category, tr.language, trKey());
  const done = texts.filter((t) => t.trim()).length;
  body.innerHTML = `
    <form id="trForm" class="vendor-form" novalidate>
      <section class="pv-card flush">
        <div class="pv-toolbar">
          <span class="pv-toolbar-title">${escapeHtml(panelLabel(panelBySlug(tr.panel)))} · ${escapeHtml(tr.category)} · ${escapeHtml(tr.language)}</span>
          <span class="pv-toolbar-note" id="trDone">${done} of ${english.length} translated</span>
          <span class="dirty-flag ms-auto" id="trDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
        </div>
        <div class="tr-list">
          <div class="tr-row tr-head"><span>English</span><span>${escapeHtml(tr.language)}</span></div>
          ${english.map((text, i) => `
            <div class="tr-row">
              <label class="tr-source" for="tr-text-${i}">${escapeHtml(text)}</label>
              <textarea class="form-control tr-text" id="tr-text-${i}" rows="1" maxlength="1000" placeholder="${escapeHtml(tr.language)} translation">${escapeHtml(texts[i])}</textarea>
            </div>`).join('')}
        </div>
      </section>
      <div class="form-actions-bar">
        <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> Save translations</button>
        <button type="button" class="btn btn-ghost" data-tr-action="cancel">Cancel</button>
      </div>
    </form>`;
  $('#trForm').addEventListener('submit', saveTranslations);
}

function onTranslationsChange(e) {
  const name = e.target.dataset.tr;
  if (!name) return;
  if (trForm.dirty) {
    e.target.value = tr[name];
    showToast('You have unsaved translations. Save or cancel them first.', 'info');
    return;
  }
  tr[name] = e.target.value;
  renderTranslationRows();
}

function onTranslationsInput(e) {
  if (!e.target.classList.contains('tr-text')) return;
  const total = $$('.tr-text').length;
  $('#trDone').textContent = `${$$('.tr-text').filter((t) => t.value.trim()).length} of ${total} translated`;
  if (!trForm.dirty) {
    trForm.dirty = true;
    $('#trDirty').hidden = false;
  }
}

function onTranslationsClick(e) {
  if (!e.target.closest('[data-tr-action="cancel"]')) return;
  trForm.dirty = false;
  renderTranslationRows();
}

function saveTranslations(e) {
  e.preventDefault();
  savedTranslations.set(trKey(), $$('.tr-text').map((t) => t.value.trim()));
  trForm.dirty = false;
  $('#trDirty').hidden = true;
  showToast(`${tr.category} translations in ${tr.language} saved.`);
}

/* ---------- Survey points ---------- */
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

/* ---------- First surveys ---------- */
// The survey each panel sends new members first: one live project per panel, in a country the panel covers.
let firstSurveys = null;
const fs = { sortDir: 'desc', page: 1, mounted: false };

function ensureFirstSurveys() {
  if (firstSurveys) return firstSurveys;
  const used = new Set();
  firstSurveys = [];
  PANEL_INFO.forEach((panel) => {
    const codes = new Set(panel.countries.map((c) => c[0]));
    const picks = projects.filter((p) => codes.has(p.country.code) && !used.has(p.id)).sort((a, b) => b.id - a.id);
    const take = (panel.slug === 'gavenze' ? 2 : 1);
    picks.filter((p, i, arr) => arr.findIndex((x) => x.country.code === p.country.code) === i).slice(0, take).forEach((p) => {
      used.add(p.id);
      firstSurveys.push({ projectId: p.id, panel: panel.slug });
    });
  });
  return firstSurveys;
}

function renderFirstSurveys() {
  document.title = 'First surveys · Base';
  const root = $('#firstSurveysView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">First surveys</h1>
      <p class="page-sub">The survey each panel sends to new members first.</p>
    </header>
    <section class="pv-card flush">
      <div class="table-responsive">
        <table class="pv-table list-table fs-table">
          <thead id="fsHead"></thead>
          <tbody id="fsRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="fsFooter"></div>
    </section>`;
  if (!fs.mounted) {
    root.addEventListener('click', onFirstSurveysClick);
    fs.mounted = true;
  }
  renderFirstSurveyRows();
}

function renderFirstSurveyRows() {
  const desc = fs.sortDir === 'desc';
  const list = ensureFirstSurveys()
    .map((f) => ({ ...f, project: projects.find((p) => p.id === f.projectId) }))
    .filter((f) => f.project)
    .sort((a, b) => (desc ? b.projectId - a.projectId : a.projectId - b.projectId));
  const { rows, page, pages, start } = paginate(list, fs.page, 10);
  fs.page = page;
  $('#fsHead').innerHTML = `
    <tr>
      <th aria-sort="${desc ? 'descending' : 'ascending'}"><button type="button" class="th-sort" data-fs-action="sort">ID <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button></th>
      <th>Project name</th><th>Panel</th><th class="t-num col-hl">C1</th><th>Status</th>
    </tr>`;
  $('#fsRows').innerHTML = rows.length
    ? rows.map(({ project: p, panel }) => `
        <tr class="row-link" data-href="#/project/${p.id}">
          <td class="col-id">${p.id}</td>
          <td><a class="cell-link" href="#/project/${p.id}">${p.jobNo} ${escapeHtml(p.name)} ${escapeHtml(p.country.name.toUpperCase())}</a></td>
          <td>${escapeHtml(panelLabel(panelBySlug(panel)))}</td>
          <td class="t-num col-hl${p.c1 ? '' : ' zero'}">${fmtInt(p.c1)}</td>
          <td><span class="fs-status is-${p.status.toLowerCase()}">${p.status.toLowerCase()}</span></td>
        </tr>`).join('')
    : emptyRow(5, 'No first surveys yet', 'Pick a project as a panel’s first survey to see it here.');
  $('#fsFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> surveys` : 'Nothing to show'}</span>
    <nav aria-label="First survey pages">${pagerHtml(page, pages, 'fs-page')}</nav>`;
}

function onFirstSurveysClick(e) {
  const pageBtn = e.target.closest('[data-fs-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      fs.page = Number(pageBtn.dataset.fsPage);
      renderFirstSurveyRows();
    }
    return;
  }
  if (e.target.closest('[data-fs-action="sort"]')) {
    fs.sortDir = fs.sortDir === 'desc' ? 'asc' : 'desc';
    renderFirstSurveyRows();
    return;
  }
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button')) location.hash = row.dataset.href;
}
