'use strict';

// FW - Accounts: list and account form.

const fwa = { search: '', client: '', sortKey: 'id', sortDir: 'desc', page: 1, mounted: false, flashId: null };
const FWA_SORTERS = {
  id: (a) => a.id,
  name: (a) => a.name.toLowerCase(),
  client: (a) => a.client.toLowerCase(),
  login: (a) => a.lastLoginAt || 0,
};

function visibleFwAccounts() {
  const q = fwa.search.trim().toLowerCase();
  const get = FWA_SORTERS[fwa.sortKey];
  const dir = fwa.sortDir === 'asc' ? 1 : -1;
  return fwAccounts
    .filter((a) => !fwa.client || a.client === fwa.client)
    .filter((a) => !q || `${a.id} ${a.name} ${a.initials} ${a.email} ${a.client}`.toLowerCase().includes(q))
    .sort((a, b) => (get(a) < get(b) ? -dir : get(a) > get(b) ? dir : b.id - a.id));
}

function renderFwAccounts() {
  document.title = 'FW - Accounts · Base';
  const root = $('#fwAccountsView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">FW - Accounts</h1>
      <p class="page-sub">Client logins for the framework: who can order sample, for which client, and with which packages.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <a class="btn btn-ghost btn-sm-h" href="#/fw-accounts/new"><i class="bi bi-plus-circle"></i> New Account</a>
      </div>
      <div class="list-filters">
        ${searchGroupHtml('fw-accounts', 'Search accounts…', fwa.search)}
        <select class="form-select pv-filter" data-fwa-filter aria-label="Filter on client">
          <option value="">All clients</option>
          ${optionsHtml([...new Set(fwAccounts.map((a) => a.client))].sort().map((c) => [c, c]), fwa.client)}
        </select>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table fwa-table">
          <thead id="fwaHead"></thead>
          <tbody id="fwaRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="fwaFooter"></div>
    </section>`;
  if (!fwa.mounted) {
    root.addEventListener('click', onFwAccountsClick);
    root.addEventListener('input', (e) => {
      if (e.target.dataset.search !== 'fw-accounts') return;
      fwa.search = e.target.value;
      fwa.page = 1;
      renderFwAccountRows();
    });
    root.addEventListener('change', (e) => {
      if (!e.target.matches('[data-fwa-filter]')) return;
      fwa.client = e.target.value;
      fwa.page = 1;
      renderFwAccountRows();
    });
    fwa.mounted = true;
  }
  renderFwAccountRows();
}

function renderFwAccountRows() {
  const list = visibleFwAccounts();
  const { rows, page, pages, start } = paginate(list, fwa.page, FW_PAGE_SIZE);
  fwa.page = page;
  $('#fwaHead').innerHTML = `
    <tr>
      ${sortTh('id', 'ID', fwa, 'fwa-sort')}${sortTh('name', 'Name', fwa, 'fwa-sort')}<th>Initials</th><th>Email</th>${sortTh('client', 'Client', fwa, 'fwa-sort')}
      <th class="t-num">Draft</th><th class="t-num">Live</th><th class="t-num">Closed</th><th>Status</th>${sortTh('login', 'Last login', fwa, 'fwa-sort')}
    </tr>`;
  $('#fwaRows').innerHTML = rows.length
    ? rows.map((a) => {
        const c = fwCounts(a);
        return `
          <tr class="row-link${a.id === fwa.flashId ? ' row-flash' : ''}" data-href="#/fw-accounts/${a.id}">
            <td class="col-id">${a.id}</td>
            <td><a class="cell-link" href="#/fw-accounts/${a.id}">${escapeHtml(a.name)}</a></td>
            <td>${userBadgeHtml(a)}</td>
            <td class="t-muted-2">${escapeHtml(a.email)}</td>
            <td>${escapeHtml(a.client)}</td>
            <td class="t-num${c.draft ? '' : ' zero'}">${c.draft}</td>
            <td class="t-num${c.active ? '' : ' zero'}">${c.active}</td>
            <td class="t-num${c.closed ? '' : ' zero'}">${c.closed}</td>
            <td>${a.enabled
              ? '<i class="bi bi-person-check user-on" role="img" title="Enabled" aria-label="Enabled"></i>'
              : '<i class="bi bi-person-slash user-off" role="img" title="Disabled" aria-label="Disabled"></i>'}</td>
            <td class="t-muted">${fmtLogin(a.lastLoginAt)}</td>
          </tr>`;
      }).join('')
    : emptyRow(10, 'No accounts found', fwa.search || fwa.client ? 'Try a different search or client.' : 'Add an account to let a client order sample.');
  fwa.flashId = null;
  $('#fwaFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> accounts` : 'No accounts to show'}</span>
    <nav aria-label="Account pages">${pagerHtml(page, pages, 'fwa-page')}</nav>`;
}

function onFwAccountsClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-fwa-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      fwa.page = Number(pageBtn.dataset.fwaPage);
      renderFwAccountRows();
    }
    return;
  }
  const sort = t.closest('[data-fwa-sort]');
  if (sort) {
    const key = sort.dataset.fwaSort;
    fwa.sortDir = fwa.sortKey === key && fwa.sortDir === 'asc' ? 'desc' : 'asc';
    fwa.sortKey = key;
    fwa.page = 1;
    renderFwAccountRows();
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="fw-accounts"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    fwa.search = '';
    fwa.page = 1;
    $('[data-search="fw-accounts"]').value = '';
    renderFwAccountRows();
    return;
  }
  const row = t.closest('tr[data-href]');
  if (row && !t.closest('a, button')) location.hash = row.dataset.href;
}

/* Account form */
const fwAccountForm = { routeId: null, dirty: false, hash: '', label: 'on this account' };
formGuards['fw-account'] = fwAccountForm;

function renderFwAccount(id) {
  const a = id === 'new' ? null : fwAccount(Number(id));
  if (id !== 'new' && !a) {
    history.replaceState(null, '', '#/fw-accounts');
    showToast("That account couldn't be found.", 'info');
    showPage('fw-accounts');
    return;
  }
  Object.assign(fwAccountForm, { routeId: id, dirty: false, hash: `#/fw-accounts/${id}` });
  document.title = `${a ? a.name : 'New account'} · Base`;
  const v = a || { name: '', client: '', email: '', packages: [], enabled: true, initials: '', color: '#111111' };
  const c = a ? fwCounts(a) : null;
  $('#fwAccountView').innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/fw-accounts" title="Back to accounts" aria-label="Back to accounts"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">Framework - Account</h1>
        <p class="page-sub">${a ? `${escapeHtml(a.name)} · account #${a.id} · ${c.draft} draft, ${c.active} live, ${c.closed} closed · last login ${fmtLogin(a.lastLoginAt)}` : 'Give a client a login to order sample through the framework.'}</p>
      </div>
    </header>
    <form id="fwAccountForm" class="vendor-form" novalidate autocomplete="off">
      <section class="pv-card">
        <div class="pv-card-head">
          <h2 class="pv-card-title">Account</h2>
          <span class="dirty-flag" id="fwaDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
        </div>
        <div class="fwa-grid">
          <div class="uf-row">
            <label class="form-label" for="fwaName">Name</label>
            <div><input class="form-control" id="fwaName" name="name" required maxlength="80" value="${escapeHtml(v.name)}">
              <div class="invalid-feedback">Enter a name.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaClient">Client</label>
            <div><div id="fwaClientBox"></div><div class="invalid-feedback" id="fwaClientMsg">Select a client.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaEmail">Email</label>
            <div><input class="form-control" type="email" id="fwaEmail" name="email" required maxlength="120" value="${escapeHtml(v.email)}">
              <div class="invalid-feedback" id="fwaEmailFeedback">Enter a valid email address.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaPassword">Password</label>
            <div><input class="form-control" type="password" id="fwaPassword" name="password" minlength="8" maxlength="100" autocomplete="new-password"
                        ${a ? 'placeholder="••••••••••••" aria-describedby="fwaPasswordHelp"' : 'required'}>
              ${a ? '<div class="field-help" id="fwaPasswordHelp">Leave empty to keep the current password.</div>' : ''}
              <div class="invalid-feedback">Use at least 8 characters.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaPackagesInput">Packages</label>
            <div><div id="fwaPackages"></div></div>
          </div>
          <div class="uf-row">
            <span class="form-label" id="fwaStatusLabel">Status</span>
            ${fwSegHtml('enabled', 'fwaStatusLabel', [['1', 'Enabled'], ['0', 'Disabled']], v.enabled ? '1' : '0')}
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaInitials">Initials</label>
            <div><input class="form-control uf-initials" id="fwaInitials" name="initials" required maxlength="3" pattern="[A-Za-z]{1,3}" value="${escapeHtml(v.initials)}">
              <div class="invalid-feedback" id="fwaInitialsFeedback">Enter 1–3 letters.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="fwaColor">Color</label>
            <div class="uf-color"><input class="form-control form-control-color" type="color" id="fwaColor" name="color" value="${v.color}" title="Badge colour">
              <span id="fwaBadge">${userBadgeHtml({ name: v.name, initials: v.initials || 'AB', color: v.color })}</span></div>
          </div>
        </div>
        <div class="pv-form-actions">
          <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> ${a ? 'Save' : 'Create account'}</button>
          <button type="button" class="btn btn-ghost" data-fwa-action="cancel">Cancel</button>
        </div>
      </section>
    </form>`;

  const markDirty = () => {
    if (fwAccountForm.dirty) return;
    fwAccountForm.dirty = true;
    $('#fwaDirty').hidden = false;
  };
  createComboBox($('#fwaClientBox'), {
    id: 'fwaClient',
    options: FW_CLIENTS.map((c2) => ({ value: c2, label: c2 })),
    value: v.client,
    placeholder: 'Select client...',
    onChange: (value) => {
      $('#fwaClient').setCustomValidity(value ? '' : 'Select a client.');
      markDirty();
    },
  });
  $('#fwaClient').setCustomValidity(v.client ? '' : 'Select a client.');
  const packages = createMultiSelect($('#fwaPackages'), {
    id: 'fwaPackagesInput',
    options: FW_PACKAGES.map((p) => ({ value: p, label: p })),
    selected: v.packages,
    placeholder: 'Select packages...',
    onChange: markDirty,
  });
  const form = $('#fwAccountForm');
  form.addEventListener('input', (e) => {
    if (e.target.classList.contains('ms-input') || e.target.classList.contains('combo-input')) return;
    markDirty();
    if (e.target.id === 'fwaColor' || e.target.id === 'fwaInitials' || e.target.id === 'fwaName') {
      $('#fwaBadge').innerHTML = userBadgeHtml({ name: $('#fwaName').value, initials: $('#fwaInitials').value.trim().toUpperCase() || 'AB', color: $('#fwaColor').value });
    }
  });
  form.addEventListener('click', (e) => {
    const seg = e.target.closest('[data-fw-seg] button');
    if (seg) {
      pickSeg(seg);
      markDirty();
      return;
    }
    if (e.target.closest('[data-fwa-action="cancel"]')) {
      fwAccountForm.dirty = false;
      location.hash = '#/fw-accounts';
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim();
    const initials = form.elements.initials.value.trim().toUpperCase();
    const clash = fwAccounts.find((x) => x !== a && x.email.toLowerCase() === email.toLowerCase());
    form.elements.email.setCustomValidity(clash ? 'taken' : '');
    $('#fwaEmailFeedback').textContent = clash ? `${clash.name} already uses this email.` : 'Enter a valid email address.';
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      form.querySelector(':invalid')?.focus();
      return;
    }
    const data = {
      name: form.elements.name.value.trim(),
      client: $('#fwaClient').value,
      email,
      packages: packages.getValue(),
      enabled: $('[data-fw-seg="enabled"] .active').dataset.value === '1',
      initials,
      color: form.elements.color.value,
    };
    let saved;
    if (a) {
      saved = Object.assign(a, data);
    } else {
      saved = { id: Math.max(0, ...fwAccounts.map((x) => x.id)) + 1, lastLoginAt: null, ...data };
      fwAccounts.push(saved);
      Object.assign(fwa, { search: '', client: '', sortKey: 'id', sortDir: 'desc', page: 1 });
    }
    fwa.flashId = saved.id;
    fwAccountForm.dirty = false;
    location.hash = '#/fw-accounts';
    showToast(a ? `${saved.name} saved.` : `${saved.name} added.`);
  });
  if (!a) $('#fwaName').focus();
}
