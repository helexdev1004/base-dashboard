'use strict';

// Interface behaviour shared by every page. The markup is all in the HTML; this only switches
// visible states (tabs, toggles, menus, folded rows) and shows the confirmation toasts.
// Nothing is saved, filtered or sorted: there's no data behind the pages yet.
// $ and $$ come from layout.js.

// ---------- toasts ----------
function showToast(message, tone = 'success') {
  const icon = tone === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill';
  const el = document.createElement('div');
  el.className = `toast app-toast toast-${tone}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <div class="d-flex align-items-center gap-2 px-3 py-2">
      <i class="bi ${icon} toast-icon"></i>
      <div class="flex-grow-1"></div>
      <button type="button" class="btn-close ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  $('.flex-grow-1', el).textContent = message;
  $('#toastStack').append(el);
  el.addEventListener('hidden.bs.toast', () => el.remove());
  new bootstrap.Toast(el, { delay: 3200 }).show();
}

const toastFrom = (el) => el.dataset.toast && showToast(el.dataset.toast, el.dataset.toastTone || 'success');

// ---------- views that swap in place (data-variant-of / data-variant) ----------
// A trigger carries data-variant-target="group:key". Every element of the group is hidden except the
// one for key, and the group's tabs and toggle buttons follow.
function showVariant(target) {
  const [group, key] = target.split(':');
  $$(`[data-variant-of="${group}"]`).forEach((el) => { el.hidden = el.dataset.variant !== key; });
  $$(`[data-variant-target^="${group}:"]`).forEach((btn) => {
    const on = btn.dataset.variantTarget === target;
    if (btn.getAttribute('role') === 'tab') {
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', String(on));
    } else if (btn.hasAttribute('aria-pressed')) {
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    }
  });
}

// ---------- tabs with their own panels ----------
function selectTab(tab) {
  const tabs = $$('[role="tab"]', tab.closest('[role="tablist"]'));
  tabs.forEach((t) => {
    const on = t === tab;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = t.getAttribute('aria-controls') && document.getElementById(t.getAttribute('aria-controls'));
    if (panel) panel.hidden = !on;
  });
  if (tab.dataset.hash) history.replaceState(null, '', `#${tab.dataset.hash}`);
}

// project.html#vendors, fw-project.html#targets...
function openFromHash() {
  const key = location.hash.slice(1);
  const el = key && $(`[data-hash="${CSS.escape(key)}"]`);
  if (el && !el.disabled) el.click();
}

// ---------- buttons ----------
// Destructive buttons ask once: the first click arms them, a second click within 3 s confirms.
function confirmClick(el) {
  if (el.dataset.armed) {
    toastFrom({ dataset: { toast: el.dataset.confirmToast, toastTone: 'info' } });
    if (el.dataset.confirmHref) location.href = el.dataset.confirmHref;
    else if (el.dataset.confirmRemove) el.closest(el.dataset.confirmRemove)?.remove();
    return;
  }
  const original = el.innerHTML;
  el.dataset.armed = '1';
  el.classList.add('is-armed');
  el.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${el.dataset.confirm}`;
  setTimeout(() => {
    if (!el.isConnected) return;
    delete el.dataset.armed;
    el.classList.remove('is-armed');
    el.innerHTML = original;
  }, 3000);
}

// A new blank row, copied from the last one in the list ("scope|list": closest scope, then list inside it).
function addRow(btn) {
  const [scope, list] = btn.dataset.addRow.split('|');
  const into = $(list, btn.closest(scope));
  const last = into?.lastElementChild;
  if (!last) return;
  const row = last.cloneNode(true);
  $$('[id]', row).forEach((el) => el.removeAttribute('id'));
  // Numbered labels (answer IDs like Q45_5) go up by one, here and in the labels that name them.
  $$('[data-seq]', row).forEach((el) => {
    const before = el.textContent.trim();
    const after = before.replace(/\d+$/, (n) => Number(n) + 1);
    el.textContent = after;
    $$('[aria-label]', row).forEach((x) => x.setAttribute('aria-label', x.getAttribute('aria-label').replace(before, after)));
  });
  $$('input:not([type="checkbox"]):not([type="radio"]), textarea', row).forEach((el) => { el.value = ''; el.removeAttribute('value'); });
  into.append(row);
  $('input, textarea', row)?.focus();
  markDirty(row);
}

// Up/down buttons move their [data-move-item] past its neighbour; [data-order] numbers and the
// first/last buttons follow.
function moveItem(btn) {
  const item = btn.closest('[data-move-item]');
  const other = btn.dataset.move === 'up' ? item.previousElementSibling : item.nextElementSibling;
  if (!other?.matches('[data-move-item]')) return;
  if (btn.dataset.move === 'up') other.before(item);
  else other.after(item);
  const items = $$(':scope > [data-move-item]', item.parentElement);
  items.forEach((el, i) => {
    $$('[data-order]', el).forEach((n) => { n.textContent = i + 1; });
    $('[data-move="up"]', el).disabled = i === 0;
    $('[data-move="down"]', el).disabled = i === items.length - 1;
  });
  const focus = $(`[data-move="${btn.dataset.move}"]`, item);
  (focus.disabled ? $(`[data-move="${btn.dataset.move === 'up' ? 'down' : 'up'}"]`, item) : focus).focus();
}

// Exclusive button groups (Live/Closed, Yes/No, Active/Inactive...) and single on/off buttons.
function pressButton(btn) {
  const group = $$(':scope > button[aria-pressed]', btn.parentElement);
  if (group.length > 1) {
    group.forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
  } else {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  }
  markDirty(btn);
}

function checkRadio(btn) {
  $$(':scope > [role="radio"]', btn.parentElement).forEach((b) => {
    b.classList.toggle('active', b === btn);
    b.setAttribute('aria-checked', String(b === btn));
  });
  markDirty(btn);
}

// Fold/unfold: a button that controls another element by aria-controls.
function toggleDisclosure(btn) {
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  const target = document.getElementById(btn.getAttribute('aria-controls'));
  if (target) target.hidden = !open;
  const item = btn.closest('.fwt-item');
  item?.classList.toggle('open', open);
  // A filter row that opens hands focus to its first field.
  if (open && target && !item) $('select:not(:disabled), input:not(:disabled):not([readonly])', target)?.focus();
}

// Batch campaigns: the segment rows follow their campaign's row.
function toggleSegments(caret) {
  const open = caret.getAttribute('aria-expanded') !== 'true';
  caret.classList.toggle('open', open);
  caret.setAttribute('aria-expanded', String(open));
  caret.setAttribute('aria-label', caret.getAttribute('aria-label').replace(/^(Show|Hide)/, open ? 'Hide' : 'Show'));
  let row = caret.closest('tr').nextElementSibling;
  while (row?.classList.contains('camp-sub')) {
    row.hidden = !open;
    row = row.nextElementSibling;
  }
}

function pickPage(btn) {
  const list = btn.closest('.pagination-dark');
  $$('button', list).forEach((b) => {
    if (!/^\d+$/.test(b.textContent.trim())) return;
    const on = b === btn;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
}

// Sort headers: the arrow moves to the clicked column, or flips on the one already sorted.
function sortBy(btn) {
  const th = btn.closest('th');
  const head = th.closest('tr');
  const icon = $('.sort-icon', th);
  if (icon) { // project list: every column has an icon. Text columns start A-Z, number columns highest first.
    const current = th.getAttribute('aria-sort');
    const dir = current === 'none' ? (['name', 'pm', 'status'].includes(th.dataset.sort) ? 'ascending' : 'descending')
      : current === 'descending' ? 'ascending' : 'descending';
    $$('th[data-sort]', head).forEach((other) => {
      const on = other === th;
      other.classList.toggle('is-sorted', on);
      other.setAttribute('aria-sort', on ? dir : 'none');
      $('.sort-icon', other).className = `bi sort-icon ${on ? (dir === 'ascending' ? 'bi-chevron-up' : 'bi-chevron-down') : 'bi-chevron-expand'}`;
    });
    return;
  }
  const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
  $$('th[aria-sort]', head).forEach((other) => {
    const on = other === th;
    other.setAttribute('aria-sort', on ? dir : 'none');
    $('.bi', $('.th-sort', other))?.remove();
  });
  btn.insertAdjacentHTML('beforeend', ` <i class="bi bi-caret-${dir === 'ascending' ? 'up' : 'down'}-fill"></i>`);
}

// ---------- unsaved changes ----------
function markDirty(el) {
  const form = el.closest('form');
  if (!form || form.matches('.modal-content')) return;
  form.classList.add('is-dirty');
  let scope = form;
  while (scope && !$('.dirty-flag', scope)) scope = scope.parentElement;
  if (!scope) return;
  $$('.dirty-flag', scope).forEach((flag) => { flag.hidden = false; });
  $$('.q-cancel', form).forEach((btn) => { btn.hidden = false; });
}

// ---------- multi-select (chips with a type-ahead list) ----------
function initMultiSelect(root) {
  const input = $('.ms-input', root);
  const menu = $('.ms-menu', root);
  const clear = $('.ms-clear', root);
  const setOpen = (open) => {
    menu.hidden = !open;
    root.classList.toggle('open', open);
    input.setAttribute('aria-expanded', String(open));
  };
  const filter = () => {
    const q = input.value.trim().toLowerCase();
    $$('li[data-value]', menu).forEach((li) => { li.hidden = q && !li.textContent.toLowerCase().includes(q); });
  };
  const sync = () => { clear.hidden = !$('.ms-chip', root); };
  const addChip = (li) => {
    $('.ms-chips', root).insertAdjacentHTML('beforeend', `<span class="ms-chip"><span></span><button type="button" aria-label="Remove"><i class="bi bi-x"></i></button></span>`);
    const chip = $('.ms-chips', root).lastElementChild;
    chip.firstChild.replaceWith(li.textContent);
    $('button', chip).dataset.remove = li.dataset.value;
    $('button', chip).setAttribute('aria-label', `Remove ${li.textContent}`);
    li.remove();
    input.value = '';
    filter();
    sync();
    markDirty(root);
  };
  const removeChip = (btn) => {
    const chip = btn.closest('.ms-chip');
    menu.insertAdjacentHTML('afterbegin', '<li role="option" aria-selected="false"></li>');
    menu.firstElementChild.textContent = chip.textContent.trim();
    menu.firstElementChild.dataset.value = btn.dataset.remove;
    $('.ms-empty', menu)?.remove();
    chip.remove();
    sync();
    markDirty(root);
  };

  root.addEventListener('mousedown', (e) => {
    if (e.target !== input && e.target.closest('.ms-control, .ms-menu, .ms-clear, .ms-caret')) e.preventDefault();
  });
  root.addEventListener('click', (e) => {
    const option = e.target.closest('.ms-menu li[data-value]');
    const remove = e.target.closest('[data-remove]');
    if (option) addChip(option);
    else if (remove) removeChip(remove);
    else if (e.target.closest('.ms-clear')) $$('[data-remove]', root).forEach(removeChip);
    input.focus();
    setOpen(true);
  });
  input.addEventListener('focus', () => setOpen(true));
  input.addEventListener('blur', () => setOpen(false));
  input.addEventListener('input', () => { filter(); setOpen(true); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.preventDefault(); // never submit the surrounding form from here
    if (e.key === 'Backspace' && !input.value) { const last = $$('[data-remove]', root).pop(); if (last) removeChip(last); }
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  });
}

// ---------- combo box (single choice with search) ----------
function initComboBox(root) {
  const input = $('.combo-input', root);
  const menu = $('.combo-menu', root);
  const clear = $('.combo-clear', root);
  const chosen = () => $('li.selected', menu)?.querySelector('span')?.textContent ?? '';
  const setOpen = (open) => {
    menu.hidden = !open;
    root.classList.toggle('open', open);
    input.setAttribute('aria-expanded', String(open));
    if (open) $$('li', menu).forEach((li) => { li.hidden = false; });
  };
  menu.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
  menu.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-value]');
    if (!li) return;
    $$('li', menu).forEach((x) => { x.classList.toggle('selected', x === li); x.setAttribute('aria-selected', String(x === li)); });
    input.value = chosen();
    input.title = input.value;
    clear.hidden = false;
    setOpen(false);
    markDirty(root);
  });
  clear.addEventListener('mousedown', (e) => e.preventDefault());
  clear.addEventListener('click', () => {
    $$('li', menu).forEach((x) => { x.classList.remove('selected'); x.setAttribute('aria-selected', 'false'); });
    input.value = '';
    clear.hidden = true;
    input.focus();
    markDirty(root);
  });
  input.addEventListener('focus', () => { input.select(); setOpen(true); });
  input.addEventListener('blur', () => { setOpen(false); input.value = chosen(); });
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    $$('li[data-value]', menu).forEach((li) => { li.hidden = q && !li.textContent.toLowerCase().includes(q); });
    menu.hidden = false;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.preventDefault();
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  });
}

// ---------- check select (dropdown list of checkboxes) ----------
function initCheckSelect(root) {
  const toggle = $('.chk-toggle', root);
  const menu = $('.chk-menu', root);
  const search = $('.chk-search', root);
  const boxes = $$('.chk-list input', root);
  const allLabel = root.dataset.allLabel || 'All';
  const paint = () => {
    const value = boxes.filter((b) => b.checked).map((b) => b.value);
    const n = value.length;
    const summary = $('.chk-summary', root);
    if (!n) summary.innerHTML = `<span class="chk-placeholder">${root.dataset.placeholder || ''}</span>`;
    else if (n === boxes.length) summary.innerHTML = `${allLabel} <span class="chk-count">${n}</span>`;
    else if (n <= 4) summary.textContent = value.join(', ');
    else summary.innerHTML = `${value.slice(0, 3).join(', ')} <span class="chk-count">+${n - 3}</span>`;
    toggle.title = n ? value.join(', ') : (root.dataset.placeholder || '');
    markDirty(root);
  };
  const setOpen = (open) => {
    menu.hidden = !open;
    root.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      search.value = '';
      $$('.chk-list li', root).forEach((li) => { li.hidden = false; });
      search.focus();
    }
  };
  toggle.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('mousedown', (e) => { if (!e.target.closest('input, label, button')) e.preventDefault(); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) setOpen(false); });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { e.stopPropagation(); setOpen(false); toggle.focus(); }
    if (e.key === 'Enter' && e.target === search) e.preventDefault();
  });
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    $$('.chk-list li', root).forEach((li) => { li.hidden = q && !li.dataset.text.includes(q); });
  });
  menu.addEventListener('change', (e) => { if (e.target.matches('.chk-list input')) { e.stopPropagation(); paint(); } });
  menu.addEventListener('click', (e) => {
    const quick = e.target.closest('[data-chk]');
    if (!quick) return;
    boxes.forEach((b) => { b.checked = quick.dataset.chk === 'all'; });
    paint();
  });
}

// ---------- wiring ----------
document.addEventListener('click', (e) => {
  const t = e.target;
  const variant = t.closest('[data-variant-target]');
  if (variant) {
    showVariant(variant.dataset.variantTarget);
    if (variant.getAttribute('role') === 'tab' && variant.dataset.hash) history.replaceState(null, '', `#${variant.dataset.hash}`);
    if (variant.matches('a[href^="#"]')) e.preventDefault();
    if (variant.dataset.pfAction === 'to-points') $('#phPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toastFrom(variant);
    return;
  }
  const tab = t.closest('[role="tab"]');
  if (tab && !tab.disabled) { selectTab(tab); return; }

  const btn = t.closest('button, a');
  if (btn?.hasAttribute('data-confirm')) { confirmClick(btn); return; }
  if (btn?.dataset.addRow) { addRow(btn); return; }
  if (btn?.dataset.move) { moveItem(btn); return; }
  if (btn?.dataset.removeRow) { const row = btn.closest(btn.dataset.removeRow); const form = row?.closest('form'); row?.remove(); if (form) markDirty(form); return; }
  if (btn?.classList.contains('camp-caret')) { toggleSegments(btn); return; }
  if (btn?.matches('.pagination-dark button:not(:disabled)')) { pickPage(btn); return; }
  if (btn?.matches('.th-sort')) { sortBy(btn); return; }
  if (btn?.matches('[data-search-clear]')) { const input = $('input', btn.closest('.search-group')); input.value = ''; input.focus(); return; }
  if (btn?.matches('[data-search-go]')) { $('input', btn.closest('.search-group')).focus(); return; }
  if (btn?.matches('button[aria-pressed]')) pressButton(btn);
  else if (btn?.matches('[role="radio"][aria-checked]')) checkRadio(btn);
  else if (btn?.matches('button[aria-expanded][aria-controls]:not([data-bs-toggle]):not(.chk-toggle):not(.nav-toggle)')) toggleDisclosure(btn);
  // A menu item that opens a modal closes its menu first (menus that stay open while you click inside).
  if (btn?.matches('.dropdown-menu [data-bs-toggle="modal"]')) {
    const toggle = $('[data-bs-toggle="dropdown"]', btn.closest('.dropdown'));
    if (toggle) bootstrap.Dropdown.getInstance(toggle)?.hide();
  }
  if (btn?.hasAttribute('data-spin')) {
    btn.classList.remove('spinning');
    void btn.offsetWidth; // restart the spin on repeat clicks
    btn.classList.add('spinning');
  }
  if (btn?.dataset.toast && !btn.disabled && btn.type !== 'submit') toastFrom(btn);

  // Rows open their page from anywhere on the row.
  const row = t.closest('tr[data-href]');
  if (row && !t.closest('a, button, input, select, textarea, label, .dropdown-menu')) location.href = row.dataset.href;
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.matches('select[data-status]')) el.dataset.status = el.value;
  if (el.dataset.shows) $(el.dataset.shows).hidden = !el.checked;
  if (el.dataset.answers) {
    const block = el.dataset.answers.startsWith('#') ? $(el.dataset.answers) : $(el.dataset.answers, el.closest('form'));
    if (block) block.hidden = ['Numeric', 'Open text'].includes(el.value);
  }
  if (!el.closest('.ms, .combo, .chk') && el.type !== 'search' && el.type !== 'file') markDirty(el);
});

document.addEventListener('input', (e) => {
  if (!e.target.closest('.ms, .combo, .chk') && e.target.type !== 'search') markDirty(e.target);
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  e.preventDefault();
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    form.querySelector(':invalid')?.focus();
    return;
  }
  form.classList.remove('was-validated', 'is-dirty');
  if (form.dataset.variantTarget) showVariant(form.dataset.variantTarget); // e.g. Publish moves the survey to Live
  const modal = form.closest('.modal');
  if (modal) bootstrap.Modal.getInstance(modal)?.hide();
  else {
    let scope = form;
    while (scope && !$('.dirty-flag', scope)) scope = scope.parentElement;
    if (scope) $$('.dirty-flag', scope).forEach((flag) => { flag.hidden = true; });
  }
  toastFrom(form);
});

document.addEventListener('keydown', (e) => {
  const tab = e.target.closest('[role="tab"]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const tabs = $$('[role="tab"]:not(:disabled)', tab.closest('[role="tablist"]'));
  const i = tabs.indexOf(tab);
  const next = e.key === 'Home' ? tabs[0]
    : e.key === 'End' ? tabs[tabs.length - 1]
      : tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
  e.preventDefault();
  next.focus();
  next.click();
});

// The first field of a modal gets focus once it's open.
document.addEventListener('shown.bs.modal', (e) => $('.modal-body input:not([type="hidden"]), .modal-body select', e.target)?.focus());

document.addEventListener('DOMContentLoaded', () => {
  $$('.ms').forEach(initMultiSelect);
  $$('.combo').forEach(initComboBox);
  $$('.chk').forEach(initCheckSelect);
  openFromHash();
});
window.addEventListener('hashchange', openFromHash);
