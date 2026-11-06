'use strict';

// Dropdown list of checkboxes with a search field.

// The toggle reads allLabel when everything is ticked, else up to 4 values (3 and "+N" past that).
function createCheckSelect(root, { id, options, selected = [], allLabel = 'All', placeholder = '', searchLabel = 'Search…', onChange = () => {} }) {
  let value = options.map((o) => o.value).filter((v) => selected.includes(v));
  root.className = 'chk';
  root.innerHTML = `
    <button type="button" class="form-select chk-toggle" id="${id}" aria-haspopup="true" aria-expanded="false" aria-controls="${id}-menu">
      <span class="chk-summary"></span>
    </button>
    <div class="chk-menu" id="${id}-menu" hidden>
      <input type="search" class="form-control chk-search" placeholder="${escapeHtml(searchLabel)}" aria-label="${escapeHtml(searchLabel)}">
      <div class="chk-quick">
        <button type="button" data-chk="all">Select all</button>
        <button type="button" data-chk="none">Clear</button>
      </div>
      <ul class="chk-list">
        ${options.map((o, i) => `
          <li data-text="${escapeHtml(`${o.label} ${o.hint || ''}`.toLowerCase())}">
            <label class="chk-option" for="${id}-o${i}">
              <input class="form-check-input" type="checkbox" id="${id}-o${i}" value="${escapeHtml(o.value)}">
              <strong>${escapeHtml(o.label)}</strong>${o.hint ? `<span>${escapeHtml(o.hint)}</span>` : ''}
            </label>
          </li>`).join('')}
      </ul>
    </div>`;
  const toggle = $('.chk-toggle', root);
  const menu = $('.chk-menu', root);
  const search = $('.chk-search', root);
  const boxes = $$('.chk-list input', root);

  function paint() {
    boxes.forEach((b) => { b.checked = value.includes(b.value); });
    const n = value.length;
    let text;
    if (!n) text = `<span class="chk-placeholder">${escapeHtml(placeholder)}</span>`;
    else if (n === options.length) text = `${escapeHtml(allLabel)} <span class="chk-count">${n}</span>`;
    else if (n <= 4) text = escapeHtml(value.join(', '));
    else text = `${escapeHtml(value.slice(0, 3).join(', '))} <span class="chk-count">+${n - 3}</span>`;
    $('.chk-summary', root).innerHTML = text;
    toggle.title = n ? value.join(', ') : placeholder;
  }
  function setOpen(open) {
    menu.hidden = !open;
    root.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      search.value = '';
      $$('.chk-list li', root).forEach((li) => { li.hidden = false; });
      search.focus();
    }
  }
  function commit(next) {
    value = options.map((o) => o.value).filter((v) => next.includes(v));
    paint();
    root.classList.remove('is-invalid');
    onChange([...value]);
  }

  toggle.addEventListener('click', () => setOpen(menu.hidden));
  // Clicking blank space inside the menu keeps it open.
  menu.addEventListener('mousedown', (e) => { if (!e.target.closest('input, label, button')) e.preventDefault(); });
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) setOpen(false); });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      e.stopPropagation();
      setOpen(false);
      toggle.focus();
    }
    if (e.key === 'Enter' && e.target === search) e.preventDefault();
  });
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    $$('.chk-list li', root).forEach((li) => { li.hidden = q && !li.dataset.text.includes(q); });
  });
  menu.addEventListener('change', (e) => {
    if (!e.target.matches('.chk-list input')) return;
    e.stopPropagation();
    commit(boxes.filter((b) => b.checked).map((b) => b.value));
  });
  menu.addEventListener('click', (e) => {
    const quick = e.target.closest('[data-chk]');
    if (quick) commit(quick.dataset.chk === 'all' ? options.map((o) => o.value) : []);
  });
  paint();
  return {
    getValue: () => [...value],
    setValue: (next) => { value = options.map((o) => o.value).filter((v) => next.includes(v)); paint(); root.classList.remove('is-invalid'); },
    setInvalid: (bad) => root.classList.toggle('is-invalid', bad),
  };
}
