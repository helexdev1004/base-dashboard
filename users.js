'use strict';

/* =========================================================
   Base · Users and Statistics
   Users (#/users), a user (#/users/<id|new>) with their access control,
   and Statistics (#/statistics): setups, completes and conversion per user.
   Uses helpers from script.js, project.js and vendors.js.
   ========================================================= */

const USERS_PAGE_SIZE = 10;
const USER_ROLES = [['admin', 'Admin'], ['user', 'User'], ['visitor', 'Visitor']];

// [key, label, icon, menu group]: one switch per menu item on the user page.
const ACCESS_ITEMS = [
  ['projects', 'Projects', 'bi-folder2-open', ''],
  ['feasibility', 'MF+A Feasibility', 'bi-sliders', ''],
  ['exports', 'Exports', 'bi-download', ''],
  ['clients', 'Clients', 'bi-people', ''],
  ['vendors', 'Vendors list', 'bi-list-ul', 'Vendors'],
  ['vendor-groups', 'Vendor groups', 'bi-folder2', 'Vendors'],
  ['blacklist', 'Blacklisted RESPIDs', 'bi-slash-circle', ''],
  ['screener-library', 'Screener Library', 'bi-shield-check', ''],
  ['first-surveys', 'First surveys', 'bi-globe2', ''],
  ['response-rates', 'Response rates', 'bi-percent', ''],
  ['panels', 'Panels', 'bi-people-fill', 'Panel management'],
  ['rewards', 'Rewards', 'bi-gift', 'Panel management'],
  ['redeem', 'Redeem', 'bi-cart3', 'Panel management'],
  ['translations', 'Translations', 'bi-translate', 'Panel management'],
  ['survey-points', 'Survey points', 'bi-arrow-down-up', 'Panel management'],
  ['profiling', 'Profiling', 'bi-window-sidebar', 'Panel management'],
  ['recruiters', 'Recruiters', 'bi-person-badge', 'Panel management'],
  ['fw-accounts', 'FW - Accounts', 'bi-asterisk', 'Framework'],
  ['fw-active', 'FW - Active/Closed', 'bi-asterisk', 'Framework'],
  ['fw-ratecard', 'FW - Ratecard', 'bi-asterisk', 'Framework'],
  ['fw-feasibilities', 'FW - Feasibilities', 'bi-asterisk', 'Framework'],
  ['toluna', 'Toluna', 'bi-box-arrow-up-right', 'External surveys'],
  ['ipsos', 'Ipsos', 'bi-box-arrow-up-right', 'External surveys'],
  ['dynata', 'Dynata', 'bi-box-arrow-up-right', 'External surveys'],
  ['statistics', 'Statistics', 'bi-bar-chart-line', ''],
  ['users', 'Users', 'bi-person-lines-fill', ''],
];
const ACCESS_KEYS = ACCESS_ITEMS.map(([key]) => key);
const VISITOR_ACCESS = ['projects', 'feasibility', 'exports'];
// Users and Statistics are for selected people: admins get them, others when switched on in Access control.
const DEFAULT_USER_ACCESS = ACCESS_KEYS.filter((k) => k !== 'users' && k !== 'statistics');

// { id, name, initials, color, email, role, enabled, projectCreator, progressView, lastLoginAt, access: Set }
const users = [];

(function seedUsers() {
  const r = seeded(7070);
  const now = Date.now();
  const emailOf = (name) => `${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@base.example.com`;
  const pm = (initials) => PMS.find((x) => x.initials === initials).name;
  // The project managers, then two accounts that don't run projects.
  // [id, name, initials, colour, role, account created, extra]
  [
    [1, pm('RG'), 'RG', '#2f7d32', 'admin', '2022-03-14'],
    [2, pm('RA'), 'RA', '#111111', 'admin', '2022-09-05'],
    [3, pm('AL'), 'AL', '#d9382c', 'user', '2023-04-17'],
    [4, pm('MK'), 'MK', '#3b74f2', 'user', '2023-11-02'],
    [5, pm('JS'), 'JS', '#3fb6cc', 'user', '2024-06-10', { progressView: 'table' }],
    [6, pm('TD'), 'TD', '#8a3b1e', 'user', '2025-02-24'],
    [7, 'Omar Haddad', 'OH', '#c9b458', 'visitor', '2025-09-08', { projectCreator: false }],
    [8, 'Lena Brandt', 'LB', '#cbd5e1', 'user', '2024-01-15', { enabled: false, projectCreator: false }],
  ].forEach(([id, name, initials, color, role, created, extra = {}]) => {
    const enabled = extra.enabled ?? true;
    users.push({
      id, name, initials, color, role, enabled,
      email: emailOf(name),
      projectCreator: true,
      progressView: 'chart',
      createdAt: new Date(`${created}T09:00:00`).getTime(),
      lastLoginAt: enabled ? now - r.between(0.05, 3) * DAY : now - r.int(60, 200) * DAY,
      access: new Set(role === 'visitor' ? VISITOR_ACCESS : role === 'admin' ? ACCESS_KEYS : DEFAULT_USER_ACCESS),
      ...extra,
    });
  });
}());

const userProjects = (u) => projects.filter((p) => p.pms.some((x) => x.initials === u.initials));
const userCounts = (u) => {
  const list = userProjects(u);
  return { live: list.filter((p) => p.status === 'Live').length, paused: 0, closed: list.filter((p) => p.status === 'Closed').length };
};

// Initials on the user's colour, with dark or light text to keep it readable.
function userBadgeHtml(u) {
  const hex = u.color.replace('#', '');
  const [rr, gg, bb] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const light = (rr * 299 + gg * 587 + bb * 114) / 1000 > 150;
  return `<span class="user-badge" style="--badge:${u.color};--badge-fg:${light ? '#1f2937' : '#fff'}" title="${escapeHtml(u.name)}">${escapeHtml(u.initials)}</span>`;
}
const fmtLogin = (ts) => (ts ? fmtStamp(ts) : 'Never');

/* ---------- Users list ---------- */
const ul = { page: 1, mounted: false, flashId: null };

function renderUsers() {
  document.title = 'Users · Base';
  const root = $('#usersView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Users</h1>
      <p class="page-sub">Everyone who can sign in to Base, their role and what they can open.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <a class="btn btn-ghost btn-sm-h" href="#/users/new"><i class="bi bi-plus-circle"></i> New User</a>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table users-table">
          <thead><tr>
            <th>ID</th><th>User name</th><th>Initials</th><th>Email</th><th>Role</th>
            <th class="t-num">Live</th><th class="t-num">Paused</th><th class="t-num">Closed</th><th>Status</th><th>Last login</th>
          </tr></thead>
          <tbody id="ulRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="ulFooter"></div>
    </section>`;
  if (!ul.mounted) {
    root.addEventListener('click', onUsersClick);
    ul.mounted = true;
  }
  renderUserRows();
}

function renderUserRows() {
  const list = [...users].sort((a, b) => a.id - b.id);
  const { rows, page, pages, start } = paginate(list, ul.page, USERS_PAGE_SIZE);
  ul.page = page;
  $('#ulRows').innerHTML = rows.map((u) => {
    const c = userCounts(u);
    return `
      <tr class="row-link${u.id === ul.flashId ? ' row-flash' : ''}" data-href="#/users/${u.id}">
        <td class="col-id">${u.id}</td>
        <td><a class="cell-link" href="#/users/${u.id}">${escapeHtml(u.name)}</a></td>
        <td>${userBadgeHtml(u)}</td>
        <td class="t-muted-2">${escapeHtml(u.email)}</td>
        <td>${u.role}</td>
        <td class="t-num">${fmtInt(c.live)}</td>
        <td class="t-num${c.paused ? '' : ' zero'}">${fmtInt(c.paused)}</td>
        <td class="t-num">${fmtInt(c.closed)}</td>
        <td>${u.enabled
          ? '<i class="bi bi-person-check user-on" role="img" title="Enabled" aria-label="Enabled"></i>'
          : '<i class="bi bi-person-slash user-off" role="img" title="Disabled" aria-label="Disabled"></i>'}</td>
        <td class="t-muted">${fmtLogin(u.lastLoginAt)}</td>
      </tr>`;
  }).join('');
  ul.flashId = null;
  $('#ulFooter').innerHTML = `
    <span class="page-info">Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> users</span>
    <nav aria-label="User pages">${pagerHtml(page, pages, 'ul-page')}</nav>`;
}

function onUsersClick(e) {
  const pageBtn = e.target.closest('[data-ul-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      ul.page = Number(pageBtn.dataset.ulPage);
      renderUserRows();
    }
    return;
  }
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button')) location.hash = row.dataset.href;
}

/* ---------- User ---------- */
const userForm = { routeId: null, dirty: false, hash: '', label: 'on this user' };
formGuards.user = userForm;

function segHtml(name, options, value, label) {
  return `
    <div class="segmented seg-field" role="group" aria-label="${label}" data-uf-seg="${name}">
      ${options.map(([v, text]) => `<button type="button" data-value="${v}" class="${v === value ? 'active' : ''}" aria-pressed="${v === value}">${text}</button>`).join('')}
    </div>`;
}

function accessRowsHtml(access) {
  let group = '';
  return ACCESS_ITEMS.map(([key, label, icon, g]) => {
    const head = g && g !== group ? `<li class="ac-group">${g}</li>` : '';
    group = g;
    const on = access.has(key);
    return `${head}
      <li class="ac-row${g ? ' ac-sub' : ''}">
        <span class="ac-label" id="ac-${key}"><i class="bi ${icon}"></i>${label}</span>
        <div class="segmented seg-xs" role="group" aria-labelledby="ac-${key}" data-access="${key}">
          <button type="button" data-value="1" class="${on ? 'active' : ''}" aria-pressed="${on}">Active</button>
          <button type="button" data-value="0" class="${on ? '' : 'active'}" aria-pressed="${!on}">Inactive</button>
        </div>
      </li>`;
  }).join('');
}

function renderUser(id) {
  const u = id === 'new' ? null : users.find((x) => x.id === Number(id));
  if (id !== 'new' && !u) {
    history.replaceState(null, '', '#/users');
    showToast("That user couldn't be found.", 'info');
    showPage('users');
    return;
  }
  Object.assign(userForm, { routeId: id, dirty: false, hash: `#/users/${id}` });
  document.title = `${u ? u.name : 'New user'} · Base`;
  const access = u ? u.access : new Set(DEFAULT_USER_ACCESS);
  const v = u || { name: '', initials: '', color: '#3b74f2', email: '', role: 'user', enabled: true, projectCreator: true, progressView: 'chart' };

  $('#userView').innerHTML = `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/users" title="Back to users" aria-label="Back to users"><i class="bi bi-arrow-left"></i></a>
      <div>
        <h1 class="page-title">User</h1>
        <p class="page-sub">${u ? `${escapeHtml(u.name)} · user #${u.id} · last login ${fmtLogin(u.lastLoginAt)}` : 'Give someone access to Base.'}</p>
      </div>
    </header>

    <form id="userForm" class="vendor-form" novalidate autocomplete="off">
      <section class="pv-card">
        <div class="pv-card-head">
          <h2 class="pv-card-title">Details</h2>
          <span class="dirty-flag" id="ufDirty" hidden><i class="bi bi-circle-fill"></i> Unsaved changes</span>
        </div>
        <div class="uf-grid">
          <div class="uf-row">
            <label class="form-label" for="ufName">Name</label>
            <div><input class="form-control" id="ufName" name="name" required maxlength="60" value="${escapeHtml(v.name)}">
              <div class="invalid-feedback">Enter a name.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="ufInitials">Initials</label>
            <div><input class="form-control uf-initials" id="ufInitials" name="initials" required maxlength="3" pattern="[A-Za-z]{1,3}" value="${escapeHtml(v.initials)}">
              <div class="invalid-feedback" id="ufInitialsFeedback">Enter 1–3 letters.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="ufColor">Color</label>
            <div class="uf-color"><input class="form-control form-control-color" type="color" id="ufColor" name="color" value="${v.color}" title="Badge colour">
              <span id="ufBadge">${userBadgeHtml({ ...v, initials: v.initials || 'AB', color: v.color })}</span></div>
          </div>
          <div class="uf-row uf-span-2">
            <label class="form-label" for="ufEmail">Email</label>
            <div><input class="form-control" type="email" id="ufEmail" name="email" required maxlength="120" value="${escapeHtml(v.email)}">
              <div class="invalid-feedback" id="ufEmailFeedback">Enter a valid email address.</div></div>
          </div>
          <div class="uf-row">
            <label class="form-label" for="ufPassword">Password</label>
            <div><input class="form-control" type="password" id="ufPassword" name="password" minlength="8" maxlength="100" autocomplete="new-password"
                        ${u ? 'placeholder="••••••••••••" aria-describedby="ufPasswordHelp"' : 'required'}>
              ${u ? '<div class="field-help" id="ufPasswordHelp">Leave empty to keep the current password.</div>' : ''}
              <div class="invalid-feedback">Use at least 8 characters.</div></div>
          </div>
          <div class="uf-row">
            <span class="form-label">Status</span>
            ${segHtml('enabled', [['1', 'Enabled'], ['0', 'Disabled']], v.enabled ? '1' : '0', 'Status')}
          </div>
          <div class="uf-row">
            <span class="form-label">Role</span>
            ${segHtml('role', USER_ROLES, v.role, 'Role')}
          </div>
          <div class="uf-row">
            <span class="form-label">Project creator</span>
            ${segHtml('projectCreator', [['1', 'Show'], ['0', 'Hide']], v.projectCreator ? '1' : '0', 'Project creator')}
          </div>
          <div class="uf-row uf-col-3">
            <span class="form-label">Progress over time</span>
            ${segHtml('progressView', [['chart', 'Chart'], ['table', 'Table']], v.progressView, 'Progress over time')}
          </div>
        </div>
      </section>

      <section class="pv-card ac-card">
        <button type="button" class="ac-toggle" data-uf-action="access" aria-expanded="true" aria-controls="ufAccess">
          <i class="bi bi-chevron-down ac-caret"></i>
          <span class="ac-title">Access control</span>
          <span class="ac-count" id="ufAccessCount" title="Menu items this user can open">${access.size}</span>
        </button>
        <ul class="ac-list" id="ufAccess">${accessRowsHtml(access)}</ul>
      </section>

      <div class="form-actions-bar">
        <button type="submit" class="btn btn-primary-grad"><i class="bi bi-check2"></i> ${u ? 'Save' : 'Create user'}</button>
        <button type="button" class="btn btn-ghost" data-uf-action="cancel">Cancel</button>
      </div>
    </form>`;

  const form = $('#userForm');
  form.addEventListener('input', onUserInput);
  form.addEventListener('click', onUserClick);
  form.addEventListener('submit', saveUser);
  if (!u) $('#ufName').focus();
}

function markUserDirty() {
  if (userForm.dirty) return;
  userForm.dirty = true;
  $('#ufDirty').hidden = false;
}

function onUserInput(e) {
  markUserDirty();
  if (e.target.id === 'ufColor' || e.target.id === 'ufInitials') {
    const initials = $('#ufInitials').value.trim().toUpperCase() || 'AB';
    $('#ufBadge').innerHTML = userBadgeHtml({ name: $('#ufName').value, initials, color: $('#ufColor').value });
  }
}

function onUserClick(e) {
  const seg = e.target.closest('[data-uf-seg] button, [data-access] button');
  if (seg) {
    $$('button', seg.parentElement).forEach((b) => {
      b.classList.toggle('active', b === seg);
      b.setAttribute('aria-pressed', String(b === seg));
    });
    $('#ufAccessCount').textContent = $$('[data-access] .active[data-value="1"]').length;
    markUserDirty();
    return;
  }
  const el = e.target.closest('[data-uf-action]');
  if (!el) return;
  if (el.dataset.ufAction === 'access') {
    const open = el.getAttribute('aria-expanded') !== 'true';
    el.setAttribute('aria-expanded', String(open));
    $('#ufAccess').hidden = !open;
  } else if (el.dataset.ufAction === 'cancel') {
    userForm.dirty = false;
    location.hash = '#/users';
  }
}

function saveUser(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const u = userForm.routeId === 'new' ? null : users.find((x) => x.id === Number(userForm.routeId));
  const email = form.elements.email.value.trim();
  const initials = form.elements.initials.value.trim().toUpperCase();
  const emailTakenBy = users.find((x) => x !== u && x.email.toLowerCase() === email.toLowerCase());
  const initialsTakenBy = users.find((x) => x !== u && x.initials === initials);
  form.elements.email.setCustomValidity(emailTakenBy ? 'taken' : '');
  form.elements.initials.setCustomValidity(initialsTakenBy ? 'taken' : '');
  $('#ufEmailFeedback').textContent = emailTakenBy ? `${emailTakenBy.name} already uses this email.` : 'Enter a valid email address.';
  $('#ufInitialsFeedback').textContent = initialsTakenBy ? `${initialsTakenBy.name} already uses these initials.` : 'Enter 1–3 letters.';
  form.classList.add('was-validated');
  if (!form.checkValidity()) {
    form.querySelector(':invalid')?.focus();
    return;
  }
  const seg = (name) => $(`[data-uf-seg="${name}"] .active`).dataset.value;
  const data = {
    name: form.elements.name.value.trim(),
    initials,
    color: form.elements.color.value,
    email,
    role: seg('role'),
    enabled: seg('enabled') === '1',
    projectCreator: seg('projectCreator') === '1',
    progressView: seg('progressView'),
    access: new Set($$('[data-access]').filter((g) => $('.active', g).dataset.value === '1').map((g) => g.dataset.access)),
  };
  let saved;
  if (u) {
    saved = Object.assign(u, data);
  } else {
    saved = { id: Math.max(0, ...users.map((x) => x.id)) + 1, createdAt: Date.now(), lastLoginAt: null, ...data };
    users.push(saved);
    ul.page = Infinity;
  }
  ul.flashId = saved.id;
  userForm.dirty = false;
  syncStatisticsMenu(); // the signed-in user's access may have changed
  location.hash = '#/users';
  showToast(u ? `${saved.name} saved.` : `${saved.name} added.`);
}

/* ---------- Who is signed in, and who sees Statistics ---------- */
const currentUser = () => users.find((u) => u.initials === 'RA'); // Ray, as in the top bar
const canSeeStatistics = () => Boolean(currentUser()?.access.has('statistics'));

// The Statistics menu item is only there for people with Statistics switched on in Access control.
function syncStatisticsMenu() {
  const link = $('#sideNav a[data-view="statistics"]');
  if (link) link.closest('li').hidden = !canSeeStatistics();
}

function statisticsBlocked() {
  if (canSeeStatistics()) return false;
  history.replaceState(null, '', '#/');
  showToast('Statistics is only available to selected people. An admin can switch it on in Users ▸ Access control.', 'info');
  showList();
  return true;
}

document.addEventListener('DOMContentLoaded', syncStatisticsMenu);

/* ---------- Statistics per month (Personal statistics, and a user from Statistics) ---------- */
const MONTH_STATS_PAGE_SIZE = 12;
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (d) => `${monthKey(d)} - ${d.toLocaleDateString('en-GB', { month: 'long' })}`;

// One row per month from the month the account was created up to this month, newest first.
// This month comes from the user's projects; earlier months are sample history.
function monthlyStats(u) {
  const now = new Date();
  const first = new Date(u.createdAt || Date.now());
  const rows = [];
  const list = userProjects(u);
  for (let d = new Date(now.getFullYear(), now.getMonth(), 1); d >= new Date(first.getFullYear(), first.getMonth(), 1); d.setMonth(d.getMonth() - 1)) {
    const current = rows.length === 0;
    let setups = 0;
    let completes = 0;
    let entries = 0;
    if (u.projectCreator && list.length) {
      const r = seeded(u.id * 977 + d.getFullYear() * 13 + d.getMonth());
      if (current) {
        setups = Math.max(1, Math.round(list.length * r.between(0.15, 0.35)));
        completes = list.reduce((s, p) => s + p.cMonth, 0);
        entries = list.reduce((s, p) => s + p.ebMonth, 0);
      } else {
        const quiet = r.chance(0.08); // the odd month without new projects
        setups = quiet ? 0 : r.int(2, 14);
        completes = quiet ? r.int(0, 40) : Math.round(setups * r.between(40, 180));
        entries = completes ? Math.round(completes / r.between(0.08, 0.32)) : 0;
      }
    }
    rows.push({ month: monthLabel(d), setups, completes, entries });
  }
  return rows;
}

function monthlyTableHtml(rows, page) {
  const { rows: shown, page: cur, pages, start } = paginate(rows, page, MONTH_STATS_PAGE_SIZE);
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const conv = (r) => (r.entries ? fmtPct1(pctOf(r.completes, r.entries)) : '<span class="zero">—</span>');
  const num = (v, cls = '') => `<td class="t-num${cls}${v ? '' : ' zero'}">${fmtInt(v)}</td>`;
  return {
    page: cur,
    html: `
      <div class="table-responsive">
        <table class="pv-table list-table mstat-table">
          <thead><tr>
            <th>Year and month</th><th class="t-num">Setups created</th><th class="t-num col-hl">Completes delivered</th>
            <th class="t-num" title="Completes ÷ entries">Conversion</th>
          </tr></thead>
          <tbody>
            ${shown.map((r) => `
              <tr><td class="mstat-month">${r.month}</td>${num(r.setups)}${num(r.completes, ' col-hl')}<td class="t-num">${conv(r)}</td></tr>`).join('')}
          </tbody>
          <tfoot><tr>
            <td>All ${plural(rows.length, 'month')}</td>${num(sum('setups'))}${num(sum('completes'), ' col-hl')}
            <td class="t-num">${conv({ completes: sum('completes'), entries: sum('entries') })}</td>
          </tr></tfoot>
        </table>
      </div>
      <div class="table-footer">
        <span class="page-info">Showing <strong>${start + 1}–${start + shown.length}</strong> of <strong>${rows.length}</strong> months</span>
        <nav aria-label="Month pages">${pagerHtml(cur, pages, 'mstat-page')}</nav>
      </div>`,
  };
}

const msState = { key: '', page: 1 };

// root: the view; u: whose statistics; head: the page header.
function renderMonthlyStats(root, u, head) {
  const key = `${root.id}|${u.id}`;
  if (msState.key !== key) Object.assign(msState, { key, page: 1 });
  const rows = monthlyStats(u);
  const draw = () => {
    const table = monthlyTableHtml(rows, msState.page);
    msState.page = table.page;
    $('.mstat-card', root).innerHTML = table.html;
  };
  root.innerHTML = `${head}<section class="pv-card flush mstat-card"></section>`;
  draw();
  root.onclick = (e) => {
    const btn = e.target.closest('[data-mstat-page]');
    if (!btn || btn.disabled) return;
    msState.page = Number(btn.dataset.mstatPage);
    draw();
  };
}

const sinceText = (u) => new Date(u.createdAt || Date.now()).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

function renderMyStatistics() {
  const u = currentUser();
  document.title = 'Personal statistics · Base';
  renderMonthlyStats($('#myStatisticsView'), u, `
    <header class="page-head">
      <h1 class="page-title">Personal statistics</h1>
      <p class="page-sub">${escapeHtml(u.name)} · your project setups, completes delivered and conversion per month, since your account was created in ${sinceText(u)}.</p>
    </header>`);
}

function renderUserStatistics(id) {
  if (statisticsBlocked()) return;
  const u = users.find((x) => x.id === Number(id));
  if (!u) {
    history.replaceState(null, '', '#/statistics');
    showToast("That user couldn't be found.", 'info');
    showPage('statistics');
    return;
  }
  document.title = `${u.name} · Statistics · Base`;
  renderMonthlyStats($('#userStatisticsView'), u, `
    <header class="page-head page-head-back">
      <a class="pv-back-btn" href="#/statistics" title="Back to Statistics" aria-label="Back to Statistics"><i class="bi bi-arrow-left"></i></a>
      <div class="mstat-head">
        ${userBadgeHtml(u)}
        <div>
          <h1 class="page-title">${escapeHtml(u.name)}</h1>
          <p class="page-sub">Project setups, completes delivered and conversion per month, since the account was created in ${sinceText(u)}.</p>
        </div>
      </div>
    </header>`);
}

/* ---------- Statistics ---------- */
const st = { selected: null, mounted: false };

// P1W = the past week, P2W = the past two weeks. Live / Closed come from the project list.
function userStats(u) {
  const list = userProjects(u);
  const r = seeded(u.id * 4241 + 7);
  const c = userCounts(u);
  if (!list.length) return { setups1: 0, setups2: 0, ...c, c1w1: 0, c1w2: 0, conv1: null, conv2: null };
  const month = list.reduce((s, p) => s + p.cMonth, 0);
  const ebMonth = list.reduce((s, p) => s + p.ebMonth, 0);
  const setups2 = Math.max(1, Math.round(list.length * r.between(0.25, 0.6)));
  const c1w2 = Math.round(month * r.between(0.45, 0.65));
  const conv2 = ebMonth ? Math.round((month / ebMonth) * 100) : 0;
  return {
    setups1: Math.round(setups2 * r.between(0.3, 0.6)),
    setups2,
    ...c,
    c1w1: Math.round(c1w2 * r.between(0.4, 0.6)),
    c1w2,
    conv1: Math.max(0, conv2 + r.int(-4, 4)),
    conv2,
  };
}

function renderStatistics() {
  if (statisticsBlocked()) return;
  document.title = 'Statistics · Base';
  // Everyone who runs projects is picked at first.
  if (!st.selected) st.selected = users.filter((u) => u.enabled && userProjects(u).length).map((u) => String(u.id));
  const root = $('#statisticsView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Statistics</h1>
      <p class="page-sub">Project setups, completes and conversion per user. P1W is the past week, P2W the past two weeks. Click a user for their statistics per month.</p>
    </header>
    <section class="pv-card flush">
      <div class="list-filters st-filters">
        <label class="visually-hidden" for="stUsersInput">Users</label>
        <div id="stUsers" class="st-users"></div>
        <button type="button" class="icon-btn-sm st-refresh" data-st-action="refresh" title="Refresh the statistics" aria-label="Refresh the statistics"><i class="bi bi-arrow-clockwise"></i></button>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table st-table">
          <thead><tr>
            <th>User name</th><th>Initials</th><th class="t-num">Setups P1W</th><th class="t-num">Setups P2W</th><th class="t-num">Live</th><th class="t-num">Closed</th>
            <th class="t-num col-hl">C1 P1W</th><th class="t-num col-hl">C1 P2W</th><th class="t-num">Conv P1W</th><th class="t-num">Conv P2W</th>
          </tr></thead>
          <tbody id="stRows"></tbody>
        </table>
      </div>
    </section>`;
  createMultiSelect($('#stUsers'), {
    id: 'stUsersInput',
    options: users.map((u) => ({ value: String(u.id), label: u.name })),
    selected: st.selected,
    placeholder: 'Pick users…',
    onChange: (value) => {
      st.selected = value;
      renderStatRows();
    },
  });
  if (!st.mounted) {
    root.addEventListener('click', onStatisticsClick);
    st.mounted = true;
  }
  renderStatRows();
}

function renderStatRows() {
  const picked = users.filter((u) => st.selected.includes(String(u.id))).sort((a, b) => a.id - b.id);
  const pct = (v) => (v == null ? '<span class="zero">—</span>' : `${v}%`);
  const num = (v, cls = '') => `<td class="t-num${cls}${v ? '' : ' zero'}">${fmtInt(v)}</td>`;
  $('#stRows').innerHTML = picked.length
    ? picked.map((u) => {
        const s = userStats(u);
        return `
          <tr class="row-link" data-href="#/statistics/${u.id}">
            <td><a class="cell-link" href="#/statistics/${u.id}" title="Statistics per month">${escapeHtml(u.name)}</a></td>
            <td>${userBadgeHtml(u)}</td>
            ${num(s.setups1)}${num(s.setups2)}${num(s.live)}${num(s.closed)}
            ${num(s.c1w1, ' col-hl')}${num(s.c1w2, ' col-hl')}
            <td class="t-num">${pct(s.conv1)}</td><td class="t-num">${pct(s.conv2)}</td>
          </tr>`;
      }).join('')
    : emptyRow(10, 'No users picked', 'Pick one or more users above to see their statistics.');
}

function onStatisticsClick(e) {
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button')) {
    location.hash = row.dataset.href;
    return;
  }
  const btn = e.target.closest('[data-st-action="refresh"]');
  if (!btn) return;
  btn.classList.remove('spinning');
  void btn.offsetWidth; // restart the spin on repeated clicks
  btn.classList.add('spinning');
  renderStatRows();
}
