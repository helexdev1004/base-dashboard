'use strict';

// The shared form modal (#pvModal) and the two-step delete button.

let modalSubmit = null;
// Without a submitLabel the modal is read-only: no submit button, and Cancel reads "Close".
// wide: true for a large modal, 'xl' for an extra-large one (the ratecard grid).
// headerExtra: controls shown in the header next to the title (e.g. Last week / Last month).
function openFormModal({ title, subtitle = '', body, submitLabel, onSubmit, wide = false, headerExtra = '' }) {
  $('#pvModalTitle').textContent = title;
  $('#pvModalSub').textContent = subtitle;
  Object.assign($('#pvModalExtra'), { innerHTML: headerExtra, onclick: null });
  $('#pvModalBody').innerHTML = body;
  // Callers that need clicks or typing inside the body set these after opening.
  Object.assign($('#pvModalBody'), { onclick: null, oninput: null, onchange: null });
  $('#pvModalSubmit').innerHTML = submitLabel || '';
  $('#pvModalSubmit').hidden = !submitLabel;
  $('#pvModalCancel').textContent = submitLabel ? 'Cancel' : 'Close';
  $('#pvModal .modal-dialog').classList.toggle('modal-lg', wide === true);
  $('#pvModal .modal-dialog').classList.toggle('modal-xl', wide === 'xl');
  $('#pvModalForm').classList.remove('was-validated');
  modalSubmit = onSubmit;
  bootstrap.Modal.getOrCreateInstance('#pvModal').show();
}

// Destructive buttons ask once: the first click arms them, a second click within 3 s confirms.
function confirmClick(el, label = 'Delete?') {
  if (el.dataset.armed) return true;
  const original = el.innerHTML;
  el.dataset.armed = '1';
  el.classList.add('is-armed');
  el.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${label}`;
  setTimeout(() => {
    if (!el.isConnected) return;
    delete el.dataset.armed;
    el.classList.remove('is-armed');
    el.innerHTML = original;
  }, 3000);
  return false;
}
