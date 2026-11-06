'use strict';

// Project page header and tabs. Loads after the tab files because RENDERERS points at them.

function projectHash(p, tab) {
  return `#/project/${p ? p.id : 'new'}${tab && tab !== 'main' ? `/${tab}` : ''}`;
}

function leaveProject() {
  chartObserver?.disconnect();
  Object.assign(pv, { project: null, creating: false, dirty: false, unsaved: new Set(), ipDraft: null, exDraft: null });
}

function openProject(p, tab) {
  const creating = !p;
  const same = currentView === 'project' && pv.creating === creating && pv.project === p;
  // Same project, only the tab changed: keep the panels that are already rendered.
  if (!same) {
    if (p) ensureDetail(p);
    Object.assign(pv, {
      project: p, creating, dirty: false, rendered: new Set(), draftLink: null,
      vendorView: 'chart', vendorFilter: '', campStatus: 'Live', campPanel: '', campSort: 'desc',
      expanded: new Set(), chartIndex: -1, ipDraft: null, unsaved: new Set(), ecOnly: false, exDraft: null,
    });
    renderShell();
    setView('project');
  }
  selectTab(creating ? 'main' : tab, { updateUrl: false });
}

function renderShell() {
  const locked = pv.creating;
  $('#projectView').innerHTML = `
    <header class="pv-header" id="pvHeader"></header>
    <nav class="pv-tabs" role="tablist" aria-label="Project sections">
      ${TABS.map((t) => `
        <button type="button" class="pv-tab" role="tab" id="tab-${t.id}" data-tab="${t.id}"
                aria-controls="panel-${t.id}" aria-selected="false" tabindex="-1"
                ${locked && t.id !== 'main' ? 'disabled title="Save the project first"' : ''}>${t.label}</button>`).join('')}
    </nav>
    ${TABS.map((t) => `<section class="pv-panel" id="panel-${t.id}" role="tabpanel" aria-labelledby="tab-${t.id}" hidden></section>`).join('')}`;
  renderHeader();
}

function renderHeader() {
  const el = $('#pvHeader');
  const p = pv.project;
  const back = '<a class="pv-back-btn" href="#/" title="Back to projects" aria-label="Back to projects"><i class="bi bi-arrow-left"></i></a>';
  if (!p) {
    el.innerHTML = `
      <div class="pv-title-row">
        ${back}
        <div class="pv-title-block">
          <h1 class="pv-title">New project</h1>
          <div class="pv-meta"><span class="status-badge status-draft">Draft</span><span>Not saved yet</span></div>
        </div>
      </div>`;
    return;
  }
  const status = p.status === 'Live'
    ? '<span class="status-badge status-live">Live</span>'
    : '<span class="status-badge status-closed">Closed</span>';
  const chips = [
    ['Completes', fmtInt(p.c1)],
    ['IR / Conv', `${p.ir}% / ${p.conv}%`],
    ['LOI real', p.loiReal == null ? '—' : `${p.loiReal.toFixed(2)} min`],
    ['Last entry', p.lastEntryAt ? relativeTime(p.lastEntryAt) : '—'],
  ];
  el.innerHTML = `
    <div class="pv-title-row">
      ${back}
      <div class="pv-title-block">
        <h1 class="pv-title">${escapeHtml(p.name)}</h1>
        <div class="pv-meta">
          ${status}
          <span class="pv-job" title="MFJN">#${p.jobNo}</span>
          ${p.po ? `<span class="pv-job" title="MFPO">#${escapeHtml(p.po)}</span>` : ''}
          <span><span class="fi fi-${p.country.code}"></span> ${escapeHtml(p.country.name)}</span>
          <span><i class="bi bi-building"></i> ${escapeHtml(p.client)}</span>
          <span><i class="bi bi-tag"></i> ${escapeHtml(p.detail.type)}</span>
          <span><i class="bi bi-person"></i> ${escapeHtml(pmNames(p))}</span>
        </div>
      </div>
      <div class="pv-quick">
        ${chips.map(([label, value]) => `
          <div class="pv-chip"><span class="pv-chip-label">${label}</span><span class="pv-chip-value">${value}</span></div>`).join('')}
      </div>
    </div>`;
}

const RENDERERS = {
  main: renderMain,
  vendors: renderVendors,
  exclusions: renderExclusions,
  progress: renderProgress,
  campaigns: renderCampaigns,
  codes: (el) => renderPool(el, 'codes'),
  links: (el) => renderPool(el, 'links'),
  ips: renderIps,
  screener: (el) => renderQuestions(el, 'screener'),
  poll: (el) => renderQuestions(el, 'poll'),
};

function renderPanel(tab) {
  RENDERERS[tab]($(`#panel-${tab}`));
  pv.rendered.add(tab);
}

function selectTab(tab, { updateUrl = true } = {}) {
  pv.tab = tab;
  $$('#projectView .pv-tab').forEach((btn) => {
    const on = btn.dataset.tab === tab;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
  });
  TABS.forEach((t) => { $(`#panel-${t.id}`).hidden = t.id !== tab; });
  if (!pv.rendered.has(tab)) renderPanel(tab);
  if (updateUrl) history.replaceState(null, '', projectHash(pv.project, tab));
  document.title = `${pv.creating ? 'New project' : pv.project.name} · Base`;
}
