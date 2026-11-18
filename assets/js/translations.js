'use strict';

// Translations (translations.html): once a panel, a category and a language are picked, that category's
// texts open with the language's translations filled in where there are any (#trData).

const trData = JSON.parse($('#trData').textContent);
const trPickers = () => ['#tr-panel', '#tr-category', '#tr-language'].map((sel) => $(sel));

function countTranslated(list) {
  const areas = $$('.tr-text', list);
  $('#trDone').textContent = `${areas.filter((area) => area.value.trim()).length} of ${areas.length} translated`;
}

function showTranslations() {
  const [panel, category, language] = trPickers();
  const ready = Boolean(panel.value && category.value && language.value);
  $('#trNote').hidden = ready;
  $('#trForm').hidden = !ready;
  if (!ready) return;

  let list = null;
  $$('#trForm [data-category]').forEach((el) => {
    el.hidden = el.dataset.category !== category.value;
    if (!el.hidden) list = el;
  });
  const known = trData[category.value]?.[language.value] || [];
  $$('.tr-text', list).forEach((area, i) => {
    area.value = known[i] || '';
    area.placeholder = `${language.value} translation`;
  });
  $('.tr-lang', list).textContent = language.value;
  $('#trTitle').textContent = `${panel.selectedOptions[0].textContent} · ${category.value} · ${language.value}`;
  $('#trForm').dataset.toast = `${category.value} translations in ${language.value} saved.`;
  $('#trDirty').hidden = true;
  countTranslated(list);
}

document.addEventListener('DOMContentLoaded', () => {
  trPickers().forEach((select) => select.addEventListener('change', showTranslations));
  $('#trForm').addEventListener('input', (e) => {
    if (e.target.matches('.tr-text')) countTranslated(e.target.closest('[data-category]'));
  });
  $('[data-tr-action="cancel"]').addEventListener('click', showTranslations); // puts the texts back
  showTranslations();
});
