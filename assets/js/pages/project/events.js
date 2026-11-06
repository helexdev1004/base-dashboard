'use strict';

// Event handlers for the project page. Buttons name their handler in data-action.

const ACTIONS = {
  toggle(el) {
    $$('button', el.closest('[data-field]')).forEach((b) => {
      b.classList.toggle('active', b === el);
      b.setAttribute('aria-pressed', String(b === el));
    });
    markDirty();
  },
  'cancel-main'() {
    pv.dirty = false;
    if (pv.creating) location.hash = '#/';
    else renderPanel('main');
  },
  'export-main': exportMain,
  'insert-var'(el) {
    const input = $('#mfLink');
    const start = input.selectionStart ?? input.value.length;
    input.setRangeText(el.dataset.value, start, input.selectionEnd ?? start, 'end');
    input.focus();
    markDirty();
  },
  'copy-link'() { copyText($('#mfLink').value.trim(), 'Live link copied.'); },
  'copy-var'(el) { copyText(el.dataset.value, `${el.dataset.value} copied.`); },
  'add-vendor': addVendor,
  refresh(el) {
    renderPanel(el.dataset.tab);
    showToast('Numbers are up to date.', 'info');
  },
  'export-vendor'(el) { exportVendor(Number(el.dataset.id)); },
  'vendor-info'(el) { openVendorInfo(Number(el.dataset.id)); },
  'ec-toggle'(el) {
    pv.ecOnly = el.dataset.value === 'ec';
    $$('#projectView .ec-toggle button').forEach((b) => {
      const on = (b.dataset.value === 'ec') === pv.ecOnly;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  },
  'vendor-view'(el) {
    pv.vendorView = el.dataset.value;
    renderPanel('vendors');
  },
  'export-daily': exportDaily,
  'new-campaign'() { openCampaignForm(null); },
  'camp-status'(el) {
    pv.campStatus = el.dataset.value;
    renderPanel('campaigns');
  },
  'camp-sort'() {
    pv.campSort = pv.campSort === 'desc' ? 'asc' : 'desc';
    renderPanel('campaigns');
  },
  'camp-toggle'(el) {
    const id = Number(el.dataset.id);
    if (pv.expanded.has(id)) pv.expanded.delete(id);
    else pv.expanded.add(id);
    renderPanel('campaigns');
  },
  'camp-mail'(el) {
    const c = findCampaign(el.dataset.id, el.dataset.parent);
    const waiting = Math.max(0, c.stats.inv - c.stats.eb);
    showToast(`Reminder email queued for ${plural(waiting, 'panelist')} who haven't started ${c.name}.`);
  },
  'camp-info'(el) { openCampaignForm(findCampaign(el.dataset.id)); },
  'camp-duplicate'(el) {
    const d = pv.project.detail;
    const src = findCampaign(el.dataset.id);
    const id = Math.max(0, ...d.campaigns.map((c) => c.id)) + 1;
    const created = Date.now();
    const copy = {
      id, name: `Campaign ${pad2(id)}`, panel: src.panel, status: 'active', created,
      stats: zeroCampaignStats(src.stats.inv), setup: structuredClone(src.setup),
    };
    copy.segments = segmentsFor(copy, copy.stats);
    d.campaigns.push(copy);
    pv.campStatus = 'Live';
    renderPanel('campaigns');
    showToast(`${src.name} duplicated as Campaign ${pad2(id)}.`);
  },

  // Unique codes / Custom Link
  'pool-export'(el) { exportPool(el.dataset.kind); },

  // Exclude IPs (draft until Save)
  'ips-remove'(el) {
    pv.ipDraft.splice(Number(el.dataset.index), 1);
    renderPanel('ips');
  },
  'ips-save'() {
    pv.project.detail.ips = pv.ipDraft.map((x) => ({ ...x }));
    renderPanel('ips');
    showToast(`Exclusion list saved (${plural(pv.ipDraft.length, 'address', 'addresses')}).`);
  },
  'ips-discard'() {
    pv.ipDraft = null;
    renderPanel('ips');
    showToast('Changes discarded.', 'info');
  },

  // Screener / Post poll
  'q-status'(el) {
    const { kind } = el.dataset;
    const cfg = QUESTION_KINDS[kind];
    const on = el.dataset.value === '1';
    pv.project.detail[cfg.statusKey] = on;
    $$('button', el.parentElement).forEach((b) => {
      b.classList.toggle('active', b === el);
      b.setAttribute('aria-pressed', String(b === el));
    });
    showToast(`${kind === 'screener' ? 'Screener' : 'Post poll'} is now ${on ? 'active' : 'inactive'}.`, 'info');
  },
  'q-export'(el) {
    const job = queueExport(pv.project, el.dataset.kind); // pages/exports.js
    showToast(`Preparing ${job.fileName}. You'll find it on the Exports page.`, 'info');
  },
  'q-new'(el) {
    const { kind } = el.dataset;
    const list = pv.project.detail[kind];
    const blank = (id) => ({ id, text: '', action: 'none', counts: QUESTION_KINDS[kind].actions ? [0, 0, 0] : [0] });
    const q = { id: Math.max(0, ...list.map((x) => x.id)) + 1, text: '', type: 'Single dropdown', answers: [blank(1), blank(2)], isNew: true };
    list.push(q);
    const card = appendQuestionCard(kind, q);
    markCardDirty(card);
    card.elements.text.focus();
  },
  'q-library'(el) { addLibraryQuestion(el.dataset.kind); },
  'q-delete'(el) {
    if (!confirmClick(el)) return;
    const { kind, id } = el.dataset;
    removeQuestion(kind, findQuestion(kind, id));
    showToast('Question deleted.', 'info');
  },
  'q-cancel'(el) {
    const { kind, id } = el.dataset;
    const q = findQuestion(kind, id);
    if (q.isNew) removeQuestion(kind, q);
    else {
      replaceQuestionCard(kind, q);
      syncQuestionsUnsaved(kind);
    }
  },
  'ans-add'(el) {
    const card = el.closest('.q-card');
    $('.ans-list', card).insertAdjacentHTML('beforeend', answerRowHtml(card.dataset.kind, { id: null, text: '', action: 'none' }));
    markCardDirty(card);
    $('.ans-row:last-child .ans-text', card).focus();
  },
  'ans-remove'(el) {
    const card = el.closest('.q-card');
    el.closest('.ans-row').remove();
    markCardDirty(card);
  },
  'ans-action'(el) {
    $$('button', el.parentElement).forEach((b) => {
      b.classList.toggle('active', b === el);
      b.setAttribute('aria-checked', String(b === el));
    });
    markCardDirty(el.closest('.q-card'));
  },
  'ans-refresh'() { showToast('Answer counts are up to date.', 'info'); },
};

function onClick(e) {
  const tab = e.target.closest('.pv-tab');
  if (tab) {
    if (!tab.disabled) selectTab(tab.dataset.tab);
    return;
  }
  const el = e.target.closest('[data-action]');
  if (el && !el.disabled && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el, e);
}

function onChange(e) {
  const el = e.target;
  if (el.classList.contains('ms-input') || el.type === 'file') return; // multi-select search text or a picked file isn't an edit
  if (el.closest('#mainForm')) {
    markDirty();
    return;
  }
  const card = el.closest('.q-card');
  if (card) {
    markCardDirty(card);
    if (el.name === 'type') $('.ans-block', card).hidden = TYPES_WITHOUT_ANSWERS.has(el.value);
    return;
  }
  const d = pv.project?.detail;
  switch (el.dataset.change) {
    case 'vendor-status': {
      const v = d.vendors.find((x) => x.id === Number(el.dataset.id));
      v.status = el.value;
      el.dataset.status = el.value;
      showToast(`${v.name} is now ${el.value}.`, 'info');
      break;
    }
    case 'vendor-filter':
      pv.vendorFilter = el.value;
      renderPanel('vendors');
      break;
    case 'campaign-status': {
      const c = findCampaign(el.dataset.id, el.dataset.parent);
      c.status = el.value;
      // Closing or reopening a campaign applies to its segments too.
      if (!el.dataset.parent) c.segments.forEach((s) => { s.status = el.value; });
      renderPanel('campaigns');
      showToast(`${c.name} is now ${el.value}.`, 'info');
      break;
    }
    case 'camp-panel':
      pv.campPanel = el.value;
      renderPanel('campaigns');
      break;
    default:
  }
}

function onInput(e) {
  const el = e.target;
  if (el.classList.contains('ms-input')) return;
  if (el.closest('#mainForm')) markDirty();
  else if (el.closest('.q-card')) markCardDirty(el.closest('.q-card'));
  else if (el.id === 'ipInput') el.classList.remove('is-invalid');
}

function onSubmit(e) {
  const form = e.target;
  if (form.id === 'mainForm') {
    e.preventDefault();
    saveMain();
    return;
  }
  const handlers = {
    'pool-upload': uploadPool,
    'ips-file': processIpFile,
    'ips-add': addOneIp,
    'q-save': saveQuestion,
  };
  const handler = handlers[form.dataset.form];
  if (!handler) return;
  e.preventDefault();
  handler(form);
}

function onTabKeys(e) {
  const tab = e.target.closest('.pv-tab');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const tabs = $$('#projectView .pv-tab:not(:disabled)');
  const i = tabs.indexOf(tab);
  const next = e.key === 'Home' ? tabs[0]
    : e.key === 'End' ? tabs[tabs.length - 1]
      : tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
  e.preventDefault();
  next.focus();
  selectTab(next.dataset.tab);
}

function initProjectView() {
  const root = $('#projectView');
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', onInput);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('keydown', onTabKeys);

  $('#pvModalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      form.querySelector(':invalid')?.focus();
      return;
    }
    if (modalSubmit && modalSubmit(form) !== false) bootstrap.Modal.getInstance('#pvModal').hide();
  });
  $('#pvModal').addEventListener('shown.bs.modal', () => $('#pvModalBody input, #pvModalBody select')?.focus());

  window.addEventListener('hashchange', route);
  route();
}
