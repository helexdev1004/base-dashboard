'use strict';

// Single-choice search box.

function createComboBox(root, { id, options, value = '', placeholder = '', onChange = () => {} }) {
  let current = value;
  let open = false;
  let active = -1;
  let filtered = [];
  root.className = 'combo';
  root.innerHTML = `
    <i class="bi bi-search combo-icon" aria-hidden="true"></i>
    <input type="text" class="form-control combo-input" id="${id}" role="combobox" aria-expanded="false" aria-autocomplete="list"
           aria-controls="${id}-list" autocomplete="off" spellcheck="false" placeholder="${escapeHtml(placeholder)}">
    <button type="button" class="combo-clear" aria-label="Clear" hidden><i class="bi bi-x-lg"></i></button>
    <ul class="combo-menu" id="${id}-list" role="listbox" hidden></ul>`;
  const input = $('.combo-input', root);
  const menu = $('.combo-menu', root);
  const clear = $('.combo-clear', root);
  const labelOf = (v) => options.find((o) => o.value === v)?.label ?? '';

  function sync() {
    input.value = labelOf(current);
    input.title = input.value; // the full name when the box is too narrow to show it
    clear.hidden = !current;
  }
  function renderMenu() {
    const q = input.value.trim().toLowerCase();
    const showAll = !q || (current && input.value === labelOf(current));
    filtered = options.filter((o) => showAll || `${o.label} ${o.hint || ''}`.toLowerCase().includes(q)).slice(0, 60);
    active = Math.min(Math.max(active, 0), filtered.length - 1);
    menu.innerHTML = filtered.length
      ? filtered.map((o, i) => `
          <li role="option" id="${id}-opt-${i}" data-value="${escapeHtml(o.value)}" class="${i === active ? 'active' : ''}${o.value === current ? ' selected' : ''}" aria-selected="${o.value === current}">
            <span>${escapeHtml(o.label)}</span>${o.hint ? `<small>${escapeHtml(o.hint)}</small>` : ''}
          </li>`).join('')
      : '<li class="combo-empty">No matches</li>';
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', `${id}-opt-${active}`);
      $(`#${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }
  function setOpen(next) {
    open = next;
    menu.hidden = !open;
    root.classList.toggle('open', open);
    input.setAttribute('aria-expanded', String(open));
    if (open) renderMenu();
  }
  function choose(v) {
    current = v;
    sync();
    setOpen(false);
    root.classList.remove('is-invalid');
    onChange(current);
  }

  menu.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
  menu.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-value]');
    if (li) choose(li.dataset.value);
  });
  clear.addEventListener('mousedown', (e) => e.preventDefault());
  clear.addEventListener('click', () => { choose(''); input.focus(); });
  input.addEventListener('focus', () => { input.select(); active = -1; setOpen(true); });
  input.addEventListener('blur', () => { setOpen(false); sync(); });
  input.addEventListener('input', () => { active = 0; if (open) renderMenu(); else setOpen(true); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      const n = filtered.length;
      if (n) active = (active + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      renderMenu();
    } else if (e.key === 'Enter') {
      e.preventDefault(); // never submit the form from here
      if (open && filtered[active]) choose(filtered[active].value);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      sync();
    }
  });
  sync();
  return { getValue: () => current };
}
