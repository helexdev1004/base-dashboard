'use strict';

// Toast notifications (bottom right).

function showToast(message, tone = 'success') {
  const icon = tone === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill';
  const el = document.createElement('div');
  el.className = `toast app-toast toast-${tone}`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <div class="d-flex align-items-center gap-2 px-3 py-2">
      <i class="bi ${icon} toast-icon"></i>
      <div class="flex-grow-1">${escapeHtml(message)}</div>
      <button type="button" class="btn-close ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  $('#toastStack').append(el);
  el.addEventListener('hidden.bs.toast', () => el.remove());
  new bootstrap.Toast(el, { delay: 3200 }).show();
}
