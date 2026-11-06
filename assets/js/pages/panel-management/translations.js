'use strict';

// Translations of the panel sites and emails.

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
