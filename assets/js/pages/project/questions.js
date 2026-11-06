'use strict';

// Screener and Post Poll tabs.

// Each question is its own form: edits stay in the card until its Save button is pressed.
const QUESTION_KINDS = {
  screener: {
    get library() { return SCREENER_LIBRARY; }, // library.js
    statusKey: 'screenerActive', statusLabel: 'Screener status',
    exportLabel: 'Export screener data', slug: 'screener', actions: true,
  },
  poll: {
    library: POLL_LIBRARY, statusKey: 'pollActive', statusLabel: 'Post poll status',
    exportLabel: 'Export poll data', slug: 'post-poll', actions: false,
  },
};

function renderQuestions(el, kind) {
  const cfg = QUESTION_KINDS[kind];
  const d = pv.project.detail;
  const on = d[cfg.statusKey];
  el.innerHTML = `
    <section class="pv-card">
      <div class="q-settings">
        <div class="q-setting">
          <span class="form-label" id="lbl-${kind}-status">${cfg.statusLabel}</span>
          <div class="segmented seg-field" role="group" aria-labelledby="lbl-${kind}-status">
            <button type="button" data-action="q-status" data-kind="${kind}" data-value="1" class="${on ? 'active' : ''}" aria-pressed="${on}">Active</button>
            <button type="button" data-action="q-status" data-kind="${kind}" data-value="0" class="${on ? '' : 'active'}" aria-pressed="${!on}">Inactive</button>
          </div>
        </div>
        ${kind === 'poll' ? `
          <div class="q-setting q-setting-grow">
            <label class="form-label" for="pollStatuses">Show to statuses</label>
            <div id="pollStatusSelect"></div>
          </div>` : ''}
        <button type="button" class="btn btn-ghost btn-sm-h q-export" data-action="q-export" data-kind="${kind}"><i class="bi bi-download"></i> ${cfg.exportLabel}</button>
      </div>
      <div class="q-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-action="q-new" data-kind="${kind}"><i class="bi bi-plus-circle"></i> Add question</button>
        <button type="button" class="btn btn-ghost btn-sm-h" data-action="q-library" data-kind="${kind}"><i class="bi bi-plus-circle"></i> Add Library question</button>
      </div>
    </section>
    <div class="q-cards" id="qCards-${kind}">
      ${d[kind].map((q, i) => questionCardHtml(kind, q, i)).join('')}
    </div>
    <div class="pv-card pv-empty-block" id="qEmpty-${kind}" ${d[kind].length ? 'hidden' : ''}>
      <i class="bi bi-ui-checks"></i>
      <div class="empty-title">No questions yet</div>
      <div class="empty-text">Add a question, or pick one from the library.</div>
    </div>`;

  if (kind === 'poll') {
    createMultiSelect($('#pollStatusSelect', el), {
      id: 'pollStatuses',
      options: POLL_STATUSES.map(([value, label]) => ({ value, label })),
      selected: d.pollStatuses,
      placeholder: 'Select…',
      onChange: (value) => { d.pollStatuses = value; },
    });
  }
}

function questionCardHtml(kind, q, index) {
  const cfg = QUESTION_KINDS[kind];
  const legend = cfg.actions
    ? '<span class="count-badge c-chose">Chose</span><span class="count-badge c-done">Completed</span><span class="count-badge c-out">Screened out</span>'
    : '<span class="count-badge c-chose">Responses</span>';
  return `
    <form class="pv-card q-card" data-form="q-save" data-kind="${kind}" data-id="${q.id}" novalidate>
      <div class="q-row">
        <span class="q-num">${index + 1}</span>
        <label class="q-label" for="qt-${kind}-${q.id}">Question text</label>
        <input class="form-control q-text-input" id="qt-${kind}-${q.id}" name="text" required maxlength="300"
               value="${escapeHtml(q.text)}" placeholder="Type the question">
        <select class="form-select q-type-select" name="type" aria-label="Question type">${optionsHtml(QUESTION_TYPES.map((t) => [t, t]), q.type)}</select>
        <button type="button" class="icon-btn-sm danger" data-action="q-delete" data-kind="${kind}" data-id="${q.id}"
                title="Delete question" aria-label="Delete question ${index + 1}"><i class="bi bi-trash3"></i></button>
      </div>
      <div class="q-save-row">
        <button type="submit" class="btn btn-primary-grad btn-sm-h"><i class="bi bi-check2"></i> Save</button>
        <button type="button" class="btn btn-ghost btn-sm-h q-cancel" data-action="q-cancel" data-kind="${kind}" data-id="${q.id}" ${q.isNew ? '' : 'hidden'}>Cancel</button>
        <span class="dirty-flag q-dirty" ${q.isNew ? '' : 'hidden'}><i class="bi bi-circle-fill"></i> ${q.isNew ? 'Not saved yet' : 'Unsaved changes'}</span>
      </div>
      <div class="ans-block" ${TYPES_WITHOUT_ANSWERS.has(q.type) ? 'hidden' : ''}>
        <div class="ans-toolbar">
          <button type="button" class="btn btn-ghost btn-xs" data-action="ans-add"><i class="bi bi-plus-circle"></i> Add answer</button>
          <span class="ans-legend" aria-hidden="true">${legend}</span>
          <button type="button" class="icon-btn-sm ms-auto" data-action="ans-refresh" title="Refresh counts" aria-label="Refresh counts"><i class="bi bi-arrow-clockwise"></i></button>
        </div>
        <div class="ans-list">${q.answers.map((a) => answerRowHtml(kind, a)).join('')}</div>
      </div>
    </form>`;
}

function answerRowHtml(kind, a) {
  const withActions = QUESTION_KINDS[kind].actions;
  const c = a.counts || [0, 0, 0];
  return `
    <div class="ans-row" data-aid="${a.id ?? ''}">
      <input class="form-control ans-text" name="answer" value="${escapeHtml(a.text)}" maxlength="200" placeholder="Answer text" aria-label="Answer text">
      ${withActions ? `
        <div class="segmented seg-xs ans-actions" role="radiogroup" aria-label="Action for this answer">
          ${ANSWER_ACTIONS.map(([value, label]) => `
            <button type="button" role="radio" data-action="ans-action" data-value="${value}"
                    class="${a.action === value ? 'active' : ''}" aria-checked="${a.action === value}">${label}</button>`).join('')}
        </div>` : ''}
      <div class="ans-counts">
        ${withActions
          ? `<span class="count-badge c-chose" title="Chose this answer">${fmtInt(c[0])}</span>
             <span class="count-badge c-done" title="Went on to complete">${fmtInt(c[1])}</span>
             <span class="count-badge c-out" title="Screened out on this answer">${fmtInt(c[2])}</span>`
          : `<span class="count-badge c-chose" title="Responses">${fmtInt(c[0])}</span>`}
      </div>
      <button type="button" class="icon-btn-sm danger" data-action="ans-remove" aria-label="Remove answer"><i class="bi bi-trash3"></i></button>
    </div>`;
}

const findQuestion = (kind, id) => pv.project.detail[kind].find((q) => q.id === Number(id));

function markCardDirty(card) {
  if (!card.classList.contains('is-dirty')) {
    card.classList.add('is-dirty');
    $('.q-dirty', card).hidden = false;
    $('.q-cancel', card).hidden = false;
  }
  pv.unsaved.add(card.dataset.kind);
}

function syncQuestionsUnsaved(kind) {
  if ($$(`#qCards-${kind} .q-card.is-dirty`).length) pv.unsaved.add(kind);
  else pv.unsaved.delete(kind);
}

function refreshQuestionList(kind) {
  const cards = $$(`#qCards-${kind} .q-card`);
  cards.forEach((card, i) => {
    $('.q-num', card).textContent = i + 1;
    $('[data-action="q-delete"]', card).setAttribute('aria-label', `Delete question ${i + 1}`);
  });
  $(`#qEmpty-${kind}`).hidden = cards.length > 0;
  syncQuestionsUnsaved(kind);
}

function replaceQuestionCard(kind, q) {
  const card = $(`#qCards-${kind} .q-card[data-id="${q.id}"]`);
  card.outerHTML = questionCardHtml(kind, q, pv.project.detail[kind].indexOf(q));
}

function appendQuestionCard(kind, q) {
  $(`#qCards-${kind}`).insertAdjacentHTML('beforeend', questionCardHtml(kind, q, pv.project.detail[kind].length - 1));
  refreshQuestionList(kind);
  const card = $(`#qCards-${kind} .q-card[data-id="${q.id}"]`);
  card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  return card;
}

function saveQuestion(form) {
  const kind = form.dataset.kind;
  const q = findQuestion(kind, form.dataset.id);
  const text = form.elements.text.value.trim();
  const type = form.elements.type.value;
  form.classList.add('was-validated');
  if (!text) {
    form.elements.text.focus();
    showToast('Enter the question text first.', 'info');
    return;
  }
  const rows = $$('.ans-row', form)
    .map((row) => ({ row, text: $('.ans-text', row).value.trim() }))
    .filter((x) => x.text);
  if (!TYPES_WITHOUT_ANSWERS.has(type) && !rows.length) {
    showToast('Add at least one answer.', 'info');
    return;
  }
  const withActions = QUESTION_KINDS[kind].actions;
  let nextId = Math.max(0, ...q.answers.map((a) => a.id)) + 1;
  const answers = rows.map(({ row, text: answerText }) => {
    const existing = q.answers.find((a) => String(a.id) === row.dataset.aid);
    return {
      id: existing ? existing.id : nextId++,
      text: answerText,
      action: withActions ? ($('.ans-actions .active', row)?.dataset.value || 'none') : 'none',
      counts: existing ? existing.counts : (withActions ? [0, 0, 0] : [0]),
    };
  });
  Object.assign(q, { text, type, answers });
  delete q.isNew;
  replaceQuestionCard(kind, q);
  syncQuestionsUnsaved(kind);
  showToast('Question saved.');
}

function removeQuestion(kind, q) {
  const list = pv.project.detail[kind];
  list.splice(list.indexOf(q), 1);
  $(`#qCards-${kind} .q-card[data-id="${q.id}"]`).remove();
  refreshQuestionList(kind);
}

function addLibraryQuestion(kind) {
  const cfg = QUESTION_KINDS[kind];
  const list = pv.project.detail[kind];
  const country = pv.project.country;
  // Screener questions come from the Screener Library for the project's country.
  const pool = kind === 'screener' ? cfg.library.filter((lib) => lib.country === country.code.toUpperCase()) : cfg.library;
  const available = pool.filter((lib) => !list.some((q) => q.libId === lib.id));
  if (!available.length) {
    showToast(kind === 'screener' && !pool.length
      ? `The Screener Library has no questions for ${country.name} yet.`
      : 'Every library question is already on this project.', 'info');
    return;
  }
  openFormModal({
    title: 'Add Library question',
    subtitle: kind === 'screener'
      ? `From the Screener Library for ${country.name}, with its answers and actions.`
      : 'A ready-made post poll question with its answers.',
    body: `
      <label class="form-label" for="mqLibrary">Question</label>
      <select class="form-select" id="mqLibrary" name="question" required>${optionsHtml(available.map((lib) => [lib.id, lib.name || lib.text]))}</select>`,
    submitLabel: '<i class="bi bi-plus-lg"></i> Add question',
    onSubmit: (form) => {
      const lib = cfg.library.find((x) => String(x.id) === form.elements.question.value);
      const q = questionFromLibrary(lib, Math.max(0, ...list.map((x) => x.id)) + 1);
      if (!cfg.actions) q.answers.forEach((a) => { a.counts = [0]; });
      list.push(q);
      appendQuestionCard(kind, q);
      showToast('Library question added.');
    },
  });
}

// Spreadsheet rows for a project's screener or post poll (used by the Exports page).
function questionExportRows(p, kind) {
  const d = ensureDetail(p);
  const cfg = QUESTION_KINDS[kind];
  const saved = d[kind].filter((q) => !q.isNew);
  const head = [
    [cfg.statusLabel, d[cfg.statusKey] ? 'Active' : 'Inactive'],
    ...(kind === 'poll' ? [['Show to statuses', d.pollStatuses.map((s) => POLL_STATUSES.find(([v]) => v === s)?.[1] ?? s).join(', ')]] : []),
    [],
  ];
  const rows = saved.flatMap((q, i) => {
    const answers = TYPES_WITHOUT_ANSWERS.has(q.type) || !q.answers.length ? [null] : q.answers;
    return answers.map((a) => (cfg.actions
      ? [i + 1, q.text, q.type, a?.text ?? '', a ? ANSWER_ACTIONS.find(([v]) => v === a.action)[1] : '', a?.counts[0] ?? '', a?.counts[1] ?? '', a?.counts[2] ?? '']
      : [i + 1, q.text, q.type, a?.text ?? '', a?.counts[0] ?? '']));
  });
  return [
    ['Project', `#${p.jobNo} ${p.name}`],
    ...head,
    cfg.actions
      ? ['#', 'Question', 'Type', 'Answer', 'Action', 'Chose', 'Completed', 'Screened out']
      : ['#', 'Question', 'Type', 'Answer', 'Responses'],
    ...rows,
  ];
}
