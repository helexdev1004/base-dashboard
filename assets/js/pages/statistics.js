'use strict';

// Statistics, statistics per month and Personal statistics.

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
