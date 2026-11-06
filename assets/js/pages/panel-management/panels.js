'use strict';

// Panels page (one card per panel).

function panelLogoHtml(panel) {
  const { mark, text, color, lines } = panel.logo;
  const words = lines.map((w) => escapeHtml(w).replace('&amp;', '<em>&amp;</em>')).join('<br>');
  const word = `<span class="pl-word${lines.length > 1 ? ' two' : ''}">${words}</span>`;
  const ink = color === 'ink' ? ' is-ink' : '';
  switch (mark) {
    case 'letter':
      return `<span class="pl-letter" style="--mark:${color}" aria-hidden="true">${text}</span><span class="pl-bar" aria-hidden="true"></span>${word}`;
    case 'tile':
      return `<span class="pl-tile${text.length > 2 ? ' is-script' : ''}" style="--mark:${color}" aria-hidden="true"${text.length > 2 ? ' lang="ar" dir="rtl"' : ''}>${text}</span>${word}`;
    case 'bubble':
      return `<span class="pl-bubble${ink}" style="${ink ? '' : `--mark:${color}`}" aria-hidden="true"><i class="bi bi-check-lg"></i></span>${word}`;
    default:
      return `<span class="pl-word two pl-amp">${words}</span>`;
  }
}

function renderPanels() {
  document.title = 'Panels · Base';
  $('#panelsView').innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Panels</h1>
      <p class="page-sub">Members of each panel by status. Open a panel to see and manage its members.</p>
    </header>
    <div class="pl-grid">
      ${PANEL_INFO.map((panel) => {
        const c = statusCounts(panel);
        return `
          <a class="pl-card" href="#/panels/${panel.slug}" aria-label="${escapeHtml(panelLabel(panel))}: ${fmtInt(c.active)} active, ${fmtInt(c.pending)} pending, ${fmtInt(c.deleted)} deleted">
            <span class="pl-logo">${panelLogoHtml(panel)}</span>
            <span class="pl-stats">
              <span class="pl-stat is-active"><span>Active:</span><strong>${fmtInt(c.active)}</strong></span>
              <span class="pl-stat"><span>Pending:</span><strong>${fmtInt(c.pending)}</strong></span>
              <span class="pl-stat"><span>Deleted:</span><strong>${fmtInt(c.deleted)}</strong></span>
            </span>
          </a>`;
      }).join('')}
    </div>`;
}
