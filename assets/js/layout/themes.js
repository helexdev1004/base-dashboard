'use strict';

// Theme picker. The chosen theme is kept in localStorage.

const THEME_KEY = 'base.theme';

// Ids and modes must match the inline script in index.html; colours live in style.css.
// preview = [page, sidebar, header, card, accent] for the mini dashboard in the picker.
const THEMES = [
  { id: 'midnight', name: 'Midnight', desc: 'Deep navy with a violet glow', mode: 'dark',
    preview: ['#06070f', '#0b0d1b', '#121638', '#1f234c', '#6d5cff'] },
  { id: 'ocean', name: 'Ocean', desc: 'Deep sea blues with cyan', mode: 'dark',
    preview: ['#071a26', '#0a2738', '#0b2f45', '#0e3b54', '#06b6d4'] },
  { id: 'forest', name: 'Forest', desc: 'Deep greens with emerald', mode: 'dark',
    preview: ['#08140f', '#0d2018', '#0f2a1f', '#163a2b', '#10b981'] },
  { id: 'sunset', name: 'Sunset', desc: 'Plum with pink-to-orange', mode: 'dark',
    preview: ['#1a0b1f', '#2a1030', '#3a1238', '#4a1848', 'linear-gradient(90deg, #ec4899, #f97316)'] },
  { id: 'daylight', name: 'Daylight', desc: 'Clean white with indigo', mode: 'light',
    preview: ['#f3f5fb', '#ffffff', '#ffffff', '#dfe3f3', '#5b4bff'] },
  { id: 'arctic', name: 'Arctic', desc: 'Ice blue with a teal sidebar', mode: 'light',
    preview: ['#edf3f7', '#0e2a3b', '#ffffff', '#d5e3ea', '#0891b2'] },
  { id: 'sand', name: 'Sand', desc: 'Warm cream with terracotta', mode: 'light',
    preview: ['#f6f1e9', '#fbf7f1', '#fffdf9', '#e8dccb', '#c2410c'] },
  { id: 'rose', name: 'Rose', desc: 'Soft blush with magenta', mode: 'light',
    preview: ['#fdf2f6', '#fff7fa', '#ffffff', '#f6d5e2', '#db2777'] },
];

function saveTheme(id) {
  try { localStorage.setItem(THEME_KEY, id); } catch { /* storage unavailable */ }
}

function renderThemeOptions() {
  $('#themeOptions').innerHTML = THEMES.map((t) => {
    const [bg, side, top, card, accent] = t.preview;
    return `
      <button type="button" class="dropdown-item theme-tile" role="menuitemradio" aria-checked="false"
              data-theme-id="${t.id}" title="${t.desc}">
        <span class="theme-preview" style="--p-bg:${bg};--p-side:${side};--p-top:${top};--p-card:${card};--p-accent:${accent}" aria-hidden="true">
          <span class="tp-side"></span>
          <span class="tp-top"></span>
          <span class="tp-body">
            <span class="tp-cards"><span></span><span></span></span>
            <span class="tp-accent"></span>
          </span>
        </span>
        <span class="theme-tile-name">${t.name}<i class="bi bi-check-circle-fill" aria-hidden="true"></i></span>
      </button>`;
  }).join('');
}

function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-bs-theme', theme.mode);
  $('meta[name="theme-color"]').setAttribute('content', theme.preview[0]);
  $('#themeLabel').textContent = theme.name;
  $$('#themeOptions [data-theme-id]').forEach((btn) => {
    btn.setAttribute('aria-checked', String(btn.dataset.themeId === theme.id));
  });
  return theme;
}
