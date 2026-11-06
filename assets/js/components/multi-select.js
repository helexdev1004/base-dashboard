'use strict';

// Multi-select with chips and type-ahead (PMs, countries, markets...).

function createMultiSelect(root, { id, options, selected = [], placeholder = '', describedBy = '', onChange = () => {} }) {
  let value = selected.filter((v) => options.some((o) => o.value === v));
  let open = false;
  let active = -1;
  let filtered = [];

  root.className = 'ms';
  root.innerHTML = `
    <div class="ms-control">
      <span class="ms-chips"></span>
      <input type="text" class="ms-input" id="${id}" role="combobox" aria-expanded="false" aria-autocomplete="list"
             aria-controls="${id}-list" autocomplete="off" spellcheck="false">
    </div>
    <button type="button" class="ms-clear" aria-label="Clear all" hidden><i class="bi bi-x-lg"></i></button>
    <i class="bi bi-chevron-down ms-caret" aria-hidden="true"></i>
    <ul class="ms-menu" id="${id}-list" role="listbox" aria-multiselectable="true" hidden></ul>`;

  const chips = $('.ms-chips', root);
  const input = $('.ms-input', root);
  const menu = $('.ms-menu', root);
  const clear = $('.ms-clear', root);
  const labelOf = (v) => options.find((o) => o.value === v)?.label ?? v;
  if (describedBy) input.setAttribute('aria-describedby', describedBy);

  function renderChips() {
    chips.innerHTML = value.map((v) => `
      <span class="ms-chip">${escapeHtml(labelOf(v))}<button type="button" data-remove="${escapeHtml(v)}" aria-label="Remove ${escapeHtml(labelOf(v))}"><i class="bi bi-x"></i></button></span>`).join('');
    input.placeholder = value.length ? '' : placeholder;
    clear.hidden = !value.length;
  }

  function renderMenu() {
    const q = input.value.trim().toLowerCase();
    filtered = options.filter((o) => !value.includes(o.value) && o.label.toLowerCase().includes(q)).slice(0, 60);
    active = Math.min(active, filtered.length - 1);
    menu.innerHTML = filtered.length
      ? filtered.map((o, i) => `<li role="option" id="${id}-opt-${i}" data-value="${escapeHtml(o.value)}" class="${i === active ? 'active' : ''}" aria-selected="false">${escapeHtml(o.label)}</li>`).join('')
      : `<li class="ms-empty">${q ? 'No matches' : 'Nothing left to add'}</li>`;
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

  function commit(next) {
    value = next;
    renderChips();
    onChange([...value]);
    if (open) renderMenu();
  }

  // Keep focus in the input while clicking chips, options or the clear button.
  root.addEventListener('mousedown', (e) => {
    if (e.target !== input && e.target.closest('.ms-control, .ms-menu, .ms-clear, .ms-caret')) e.preventDefault();
  });
  root.addEventListener('click', (e) => {
    const option = e.target.closest('.ms-menu li[data-value]');
    const remove = e.target.closest('[data-remove]');
    if (option) {
      input.value = '';
      commit([...value, option.dataset.value]);
    } else if (remove) {
      commit(value.filter((v) => v !== remove.dataset.remove));
    } else if (e.target.closest('.ms-clear')) {
      commit([]);
    }
    input.focus();
    if (!open) setOpen(true);
  });
  input.addEventListener('focus', () => setOpen(true));
  input.addEventListener('blur', () => setOpen(false));
  input.addEventListener('input', () => { active = 0; if (open) renderMenu(); else setOpen(true); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      const n = filtered.length;
      if (n) active = (active + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      renderMenu();
    } else if (e.key === 'Enter') {
      e.preventDefault(); // never submit the surrounding form from here
      if (open && filtered[active]) {
        input.value = '';
        commit([...value, filtered[active].value]);
      }
    } else if (e.key === 'Backspace' && !input.value && value.length) {
      commit(value.slice(0, -1));
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  });

  renderChips();
  return {
    getValue: () => [...value],
    setInvalid: (invalid) => root.classList.toggle('is-invalid', invalid),
  };
}
