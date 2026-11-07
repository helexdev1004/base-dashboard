'use strict';

// Project list (index.html): KPI count-up, the Progress chart tooltip, My projects, More filters and the / shortcut.

// KPI numbers count up from 0 on first paint.
function countUp() {
  const els = $$('.kpi-value[data-value]');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const format = (el, v) => (el.dataset.type === 'pct' ? `${v.toFixed(1)}%` : Math.round(v).toLocaleString('en-US'));
  const start = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - start) / 900);
    const eased = 1 - Math.pow(1 - k, 3);
    els.forEach((el) => { el.textContent = format(el, Number(el.dataset.value) * eased); });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// One shared tooltip for all the Progress charts: day, hour range (hourly only), completes, conversion.
function initSparkTips() {
  const tip = $('.spark-tip');
  let current = null;
  const hide = () => {
    tip.hidden = true;
    current?.classList.remove('is-hover');
    current = null;
  };
  const panels = $$('.table-panel');
  panels.forEach((panel) => panel.addEventListener('mouseover', (e) => {
    const slot = e.target.closest('.spark-slot');
    if (!slot) return;
    current?.classList.remove('is-hover');
    current = slot;
    slot.classList.add('is-hover');
    const n = Number(slot.dataset.n);
    const entries = Number(slot.dataset.e);
    const conversion = entries ? `${Math.round((n / entries) * 100)}% conversion` : 'No entries';
    tip.innerHTML = `<span>${slot.dataset.day}</span>${slot.dataset.hours ? `<span>${slot.dataset.hours}</span>` : ''}
      <span class="spark-tip-hl">${n.toLocaleString('en-US')} complete${n === 1 ? '' : 's'}</span><span class="spark-tip-hl">${conversion}</span>`;
    tip.hidden = false;
    const r = slot.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2))}px`;
    tip.style.top = `${r.bottom + 10}px`;
    tip.style.setProperty('--arrow-x', `${r.left + r.width / 2 - parseFloat(tip.style.left)}px`);
  }));
  panels.forEach((panel) => panel.addEventListener('mouseout', (e) => {
    if (e.target.closest('.spark-slot') && !e.relatedTarget?.closest?.('.spark-slot')) hide();
  }));
  window.addEventListener('scroll', hide, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {
  countUp();
  initSparkTips();

  // My projects only flips the button: there's no list behind it to filter. (ui.js has already
  // flipped aria-pressed: its document listener was added first.)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#mineBtn');
    if (btn) $('i', btn).className = btn.getAttribute('aria-pressed') === 'true' ? 'bi bi-person-check-fill' : 'bi bi-person';
  });

  $('#sparkMode').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-spark]');
    if (btn) $('.project-table th.col-spark').title = btn.dataset.spark === 'daily' ? 'Completes per day, past 14 days' : 'Completes per hour, past 24 hours';
  });

  // More filters
  const filters = ['#fCountry', '#fClient', '#fPm', '#fActivity'];
  $('#applyFilters').addEventListener('click', () => {
    const count = filters.filter((sel) => $(sel).value).length;
    $('#filterCount').textContent = count;
    $('#filterCount').classList.toggle('d-none', !count);
    bootstrap.Offcanvas.getOrCreateInstance('#filtersCanvas').hide();
  });
  $('#resetFilters').addEventListener('click', () => {
    filters.forEach((sel) => { $(sel).value = ''; });
    $('#filterCount').classList.add('d-none');
  });

  // / jumps to the MFJN search (Tab moves on to MFPO and the name search).
  document.addEventListener('keydown', (e) => {
    const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]');
    if (e.key === '/' && !typing && !$('.modal.show, .offcanvas.show')) {
      e.preventDefault();
      $('#searchJob').focus();
    }
  });
});
