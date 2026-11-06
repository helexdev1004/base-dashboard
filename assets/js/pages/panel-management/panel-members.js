'use strict';

// One panel: member list, statistics, import, export and emails.

const pl = { slug: null, search: '', status: '', country: '', filtersOpen: false, page: 1, mounted: false, flashId: null, timer: 0 };

function panelCountryOptions(panel) {
  const d = panelData(panel);
  const codes = new Set(panel.countries.map((c) => c[0]));
  d.edits.forEach((m) => codes.add(m.country));
  d.extra.forEach((m) => codes.add(m.country));
  return [...codes].map((code) => [code, countryName(code)]).sort((a, b) => a[1].localeCompare(b[1]));
}

function visibleMembers(panel) {
  const d = panelData(panel);
  const q = pl.search.trim().toLowerCase();
  const out = [];
  for (let i = 0, n = memberTotal(d); i < n; i++) {
    if (pl.status && statusAt(d, i) !== pl.status) continue;
    if (pl.country && countryAt(d, i) !== pl.country) continue;
    if (q && !searchKey(panel, d, i).includes(q)) continue;
    out.push(i);
  }
  return out;
}

function renderPanelPage(slug) {
  const panel = panelBySlug(slug);
  if (!panel) {
    history.replaceState(null, '', '#/panels');
    showToast("That panel couldn't be found.", 'info');
    showPage('panels');
    return;
  }
  if (pl.slug !== slug) Object.assign(pl, { slug, search: '', status: '', country: '', filtersOpen: false, page: 1 });
  document.title = `${panelLabel(panel)} · Base`;
  const root = $('#panelView');
  root.innerHTML = `
    <header class="page-head page-head-back pl-head">
      <a class="pv-back-btn" href="#/panels" title="Back to panels" aria-label="Back to panels"><i class="bi bi-arrow-left"></i></a>
      <div class="pl-head-title">
        <h1 class="page-title">${escapeHtml(panelLabel(panel))}</h1>
        <p class="page-sub">Search for an account, or open one to see its profile and history.</p>
      </div>
      <div class="pl-head-actions">
        <button type="button" class="btn btn-ghost btn-sm-h" data-pl-action="stats"><i class="bi bi-bar-chart-fill"></i> Panel statistics</button>
        <button type="button" class="btn btn-ghost btn-sm-h" data-pl-action="import"><i class="bi bi-upload"></i> Import data</button>
        <button type="button" class="btn btn-export btn-sm-h" data-pl-action="export"><i class="bi bi-download"></i> Export data</button>
        <div class="dropdown">
          <button type="button" class="icon-btn-sm pl-mail" data-bs-toggle="dropdown" aria-expanded="false" title="Email members" aria-label="Email members"><i class="bi bi-envelope"></i></button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><button type="button" class="dropdown-item" data-pl-action="mail-active"><i class="bi bi-envelope"></i> Email all active members…</button></li>
            <li><button type="button" class="dropdown-item" data-pl-action="mail-pending"><i class="bi bi-envelope-exclamation"></i> Remind pending members to confirm…</button></li>
          </ul>
        </div>
      </div>
    </header>
    <section class="pl-strip" id="plStrip" aria-label="Members by status"></section>
    <section class="pv-card flush">
      <div class="list-filters">
        ${searchGroupHtml('members', 'Search by ID, name or email…', pl.search)}
        <button type="button" class="btn btn-dark-chip btn-sm-h pl-filter-btn" data-pl-action="filters" aria-expanded="${pl.filtersOpen}" aria-controls="plFilterRow">
          <i class="bi bi-funnel"></i> Filter <span class="pl-filter-count" id="plFilterCount" hidden></span>
        </button>
      </div>
      <div class="list-filters pl-filter-row" id="plFilterRow" ${pl.filtersOpen ? '' : 'hidden'}>
        <select class="form-select pv-filter" data-pl-filter="status" aria-label="Status">
          <option value="">All statuses</option>
          ${optionsHtml(MEMBER_STATUSES.map((s) => [s, s[0].toUpperCase() + s.slice(1)]), pl.status)}
        </select>
        <select class="form-select pv-filter" data-pl-filter="country" aria-label="Country">
          <option value="">All countries</option>
          ${optionsHtml(panelCountryOptions(panel), pl.country)}
        </select>
        <button type="button" class="btn btn-ghost btn-sm-h" data-pl-action="clear-filters">Clear filters</button>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table pl-table">
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Country</th><th>Status</th><th class="t-end">Points</th><th>Created</th><th><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody id="plRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="plFooter"></div>
    </section>`;
  if (!pl.mounted) {
    root.addEventListener('click', onPanelClick);
    root.addEventListener('input', onPanelInput);
    root.addEventListener('change', onPanelChange);
    pl.mounted = true;
  }
  renderPanelStrip(panel);
  renderMemberRows(panel);
}

function renderPanelStrip(panel) {
  const c = statusCounts(panel);
  $('#plStrip').innerHTML = MEMBER_STATUSES.map((s) => `
    <button type="button" class="pl-strip-item${pl.status === s ? ' active' : ''}" data-pl-status="${s}" aria-pressed="${pl.status === s}"
            title="${pl.status === s ? 'Show every status' : `Show only ${s} members`}">
      <span class="pl-strip-label">${s[0].toUpperCase() + s.slice(1)}</span>
      <span class="pl-strip-value">${fmtInt(c[s])}</span>
    </button>`).join('');
}

function memberStatusHtml(status) {
  return `<span class="m-status is-${status}">${status}</span>`;
}

function renderMemberRows(panel) {
  const list = visibleMembers(panel);
  const { rows, page, pages, start } = paginate(list, pl.page, MEMBERS_PAGE_SIZE);
  pl.page = page;
  const filters = (pl.status ? 1 : 0) + (pl.country ? 1 : 0);
  const count = $('#plFilterCount');
  count.textContent = filters;
  count.hidden = !filters;
  $('#plRows').innerHTML = rows.length
    ? rows.map((i) => {
        const m = memberAt(panel, i);
        const href = `#/panels/${panel.slug}/${m.id}`;
        return `
          <tr class="row-link${m.id === pl.flashId ? ' row-flash' : ''}" data-href="${href}">
            <td class="col-id">${m.id}</td>
            <td><a class="cell-link" href="${href}">${escapeHtml(memberName(m))}</a></td>
            <td class="pl-email">${escapeHtml(m.email)}</td>
            <td>${m.country.toUpperCase()}</td>
            <td>${memberStatusHtml(m.status)}</td>
            <td class="t-end num">${fmtInt(memberPoints(panel, i))}</td>
            <td class="t-muted">${fmtDate(m.createdAt)}</td>
            <td class="t-end">${m.status === 'active' ? `
              <div class="dropdown">
                <button type="button" class="icon-btn-sm pl-mail" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false"
                        title="Email ${escapeHtml(memberName(m))}" aria-label="Email ${escapeHtml(memberName(m))}"><i class="bi bi-envelope"></i><i class="bi bi-caret-down-fill pl-mail-caret"></i></button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><button type="button" class="dropdown-item" data-pl-action="mail-reset" data-index="${i}"><i class="bi bi-key"></i> Send password reset</button></li>
                  <li><button type="button" class="dropdown-item" data-pl-action="mail-one" data-index="${i}"><i class="bi bi-envelope"></i> Send a message…</button></li>
                </ul>
              </div>` : ''}</td>
          </tr>`;
      }).join('')
    : emptyRow(8, 'No members found', pl.search || filters ? 'Try a different search or filter.' : 'Import members to get started.');
  pl.flashId = null;
  $('#plFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${fmtInt(start + 1)}–${fmtInt(start + rows.length)}</strong> of <strong>${fmtInt(list.length)}</strong> members` : 'No members to show'}</span>
    <nav aria-label="Member pages">${pagerHtml(page, pages, 'pl-page')}</nav>`;
}

function onPanelClick(e) {
  const t = e.target;
  const panel = panelBySlug(pl.slug);
  const pageBtn = t.closest('[data-pl-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      pl.page = Number(pageBtn.dataset.plPage);
      renderMemberRows(panel);
    }
    return;
  }
  const statusBtn = t.closest('[data-pl-status]');
  if (statusBtn) {
    pl.status = pl.status === statusBtn.dataset.plStatus ? '' : statusBtn.dataset.plStatus;
    pl.page = 1;
    $('[data-pl-filter="status"]').value = pl.status;
    renderPanelStrip(panel);
    renderMemberRows(panel);
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="members"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    pl.search = '';
    pl.page = 1;
    $('[data-search="members"]').value = '';
    renderMemberRows(panel);
    return;
  }
  const el = t.closest('[data-pl-action]');
  if (el) {
    const m = el.dataset.index !== undefined ? memberAt(panel, Number(el.dataset.index)) : null;
    switch (el.dataset.plAction) {
      case 'filters': {
        pl.filtersOpen = !pl.filtersOpen;
        el.setAttribute('aria-expanded', String(pl.filtersOpen));
        $('#plFilterRow').hidden = !pl.filtersOpen;
        if (pl.filtersOpen) $('[data-pl-filter="status"]').focus();
        break;
      }
      case 'clear-filters':
        Object.assign(pl, { status: '', country: '', page: 1 });
        $$('[data-pl-filter]').forEach((s) => { s.value = ''; });
        renderPanelStrip(panel);
        renderMemberRows(panel);
        break;
      case 'stats': openPanelStats(panel); break;
      case 'import': openImportMembers(panel); break;
      case 'export': exportMembers(panel); break;
      case 'mail-active': openCompose(panel, { status: 'active' }); break;
      case 'mail-pending': openCompose(panel, { status: 'pending' }); break;
      case 'mail-one': openCompose(panel, { member: m }); break;
      case 'mail-reset': showToast(`Password reset email sent to ${m.email}.`); break;
      default:
    }
    return;
  }
  const row = t.closest('tr[data-href]');
  if (row && !t.closest('a, button, .dropdown-menu')) location.hash = row.dataset.href;
}

function onPanelInput(e) {
  if (e.target.dataset.search !== 'members') return;
  pl.search = e.target.value;
  pl.page = 1;
  clearTimeout(pl.timer);
  pl.timer = setTimeout(() => renderMemberRows(panelBySlug(pl.slug)), 120);
}

function onPanelChange(e) {
  const kind = e.target.dataset.plFilter;
  if (!kind) return;
  pl[kind] = e.target.value;
  pl.page = 1;
  const panel = panelBySlug(pl.slug);
  if (kind === 'status') renderPanelStrip(panel);
  renderMemberRows(panel);
}

// Members per country by status, and how many signed up in the last week or month.
const PANEL_STAT_PERIODS = { week: [7, 'Last week'], month: [30, 'Last month'] };
let panelStatPeriod = 'month';

function openPanelStats(panel) {
  const d = panelData(panel);
  const byCountry = new Map();
  const since = { week: PANEL_NOW - 7 * DAY, month: PANEL_NOW - 30 * DAY };
  for (let i = 0, n = memberTotal(d); i < n; i++) {
    const code = countryAt(d, i);
    const row = byCountry.get(code) || { pending: 0, active: 0, deleted: 0, week: 0, month: 0 };
    row[statusAt(d, i)] += 1;
    const joined = i < d.n ? joinedAt(panel, i) : d.extra[i - d.n].createdAt;
    if (joined >= since.month) row.month += 1;
    if (joined >= since.week) row.week += 1;
    byCountry.set(code, row);
  }
  const rows = [...byCountry].map(([code, r]) => ({ code, ...r, total: r.pending + r.active + r.deleted })).sort((a, b) => b.total - a.total);
  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  const totals = Object.fromEntries(['pending', 'active', 'deleted', 'total', 'week', 'month'].map((k) => [k, sum(k)]));
  const cells = (r) => `<td>${fmtInt(r.pending)}</td><td>${fmtInt(r.active)}</td><td>${fmtInt(r.deleted)}</td><td>${fmtInt(r.total)}</td>
    <td class="pl-new">${fmtInt(r[panelStatPeriod])}</td>`;
  const newHead = () => {
    const days = PANEL_STAT_PERIODS[panelStatPeriod][0];
    return `<th class="pl-new" title="Signed up in the last ${days} days">New (${days} days)</th>`;
  };
  const tableHtml = () => `
    <thead><tr><th>Country</th><th>Pending</th><th>Active</th><th>Deleted</th><th>Total</th>${newHead()}</tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${escapeHtml(countryName(r.code))}</td>${cells(r)}</tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td>${cells(totals)}</tr></tfoot>`;
  const toggleHtml = () => Object.entries(PANEL_STAT_PERIODS).map(([key, [, label]]) => `
    <button type="button" data-period="${key}" class="${key === panelStatPeriod ? 'active' : ''}" aria-pressed="${key === panelStatPeriod}">${label}</button>`).join('');
  openFormModal({
    title: 'Panel statistics',
    subtitle: `${panelLabel(panel)} · launched ${fmtDate(panel.start)}`,
    wide: true,
    headerExtra: `<div class="segmented pl-period" role="group" aria-label="New members in the">${toggleHtml()}</div>`,
    body: `
      <div class="pv-table-frame table-responsive pl-stats-table">
        <table class="pv-table" id="plStatsTable">${tableHtml()}</table>
      </div>`,
  });
  $('#pvModalExtra').onclick = (e) => {
    const btn = e.target.closest('[data-period]');
    if (!btn || btn.dataset.period === panelStatPeriod) return;
    panelStatPeriod = btn.dataset.period;
    $('#pvModalExtra .pl-period').innerHTML = toggleHtml();
    $('#plStatsTable').innerHTML = tableHtml();
  };
}

function exportMembers(panel) {
  const list = visibleMembers(panel);
  const big = list.length > 5000;
  if (big) showToast(`Preparing ${fmtInt(list.length)} members…`, 'info');
  setTimeout(() => {
    downloadCsv(`${panel.slug}-panel-members-${today()}.csv`, [
      ['ID', 'First name', 'Last name', 'Email', 'Country', 'Status', 'Points', 'Created'],
      ...list.map((i) => {
        const m = memberAt(panel, i);
        return [m.id, m.first, m.last, m.email, m.country.toUpperCase(), m.status, memberPoints(panel, i, false), fmtDate(m.createdAt)];
      }),
    ]);
    showToast(`Exported ${plural(list.length, 'member')}.`);
  }, big ? 60 : 0);
}

// Emails are composed here and handed to the mailer; this preview only confirms them.
function openCompose(panel, { status, member }) {
  const count = member ? 1 : statusCounts(panel)[status];
  const to = member ? `${memberName(member)} <${member.email}>` : `All ${status} members of ${panelLabel(panel)} (${fmtInt(count)})`;
  const subject = status === 'pending' ? `Please confirm your ${panel.name} account` : '';
  openFormModal({
    title: member ? 'Send a message' : status === 'pending' ? 'Remind pending members' : 'Email active members',
    subtitle: to,
    body: `
      <label class="form-label" for="mailSubject">Subject</label>
      <input class="form-control" id="mailSubject" name="subject" required maxlength="120" value="${escapeHtml(subject)}">
      <div class="invalid-feedback">Enter a subject.</div>
      <label class="form-label mt-3" for="mailBody">Message</label>
      <textarea class="form-control" id="mailBody" name="body" rows="6" required maxlength="4000">${status === 'pending' ? 'Hi,\n\nYou signed up but haven\'t confirmed your email address yet. Click the link in this email to activate your account and start earning points.\n\nThank you!' : ''}</textarea>
      <div class="invalid-feedback">Write a message.</div>`,
    submitLabel: '<i class="bi bi-send"></i> Send',
    onSubmit: () => {
      showToast(member ? `Message sent to ${member.email}.` : `Message queued for ${plural(count, `${status} member`)}.`);
      return true;
    },
  });
}

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const delim = [';', '\t', ','].reduce((best, ch) => (firstLine.split(ch).length > firstLine.split(best).length ? ch : best), ',');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}

async function readTableFile(file) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That file is larger than 5 MB.');
  if (/\.xlsx?$/i.test(file.name)) {
    const XLSX = await loadXlsx();
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, blankrows: false })
      .map((r) => r.map((c) => String(c ?? '').trim()));
  }
  return parseCsv((await file.text()).replace(/^﻿/, ''));
}

const IMPORT_COLUMNS = {
  email: /^e-?mail(\s*address)?$/i,
  first: /^first[\s_-]*name$|^firstname$|^first$/i,
  last: /^last[\s_-]*name$|^lastname$|^surname$|^last$/i,
  country: /^country([\s_-]*code)?$/i,
};

function openImportMembers(panel) {
  openFormModal({
    title: 'Import data',
    subtitle: `Add members to ${panelLabel(panel)} from a CSV or Excel file.`,
    body: `
      <label class="form-label" for="imFile">File</label>
      <input class="form-control" type="file" id="imFile" name="file" required accept=".csv,.txt,.xlsx,.xls">
      <div class="invalid-feedback">Choose a file.</div>
      <div class="field-help">Columns: email (required), first name, last name and country (a 2-letter code such as PL). A header row is optional.</div>
      <span class="form-label d-block mt-3" id="imStatusLabel">New members are</span>
      <div class="segmented seg-field" role="group" aria-labelledby="imStatusLabel" data-im-status>
        <button type="button" class="active" data-value="pending" aria-pressed="true">Pending</button>
        <button type="button" data-value="active" aria-pressed="false">Active</button>
      </div>
      <div class="field-help">Pending members get an email asking them to confirm their account.</div>`,
    submitLabel: '<i class="bi bi-upload"></i> Import',
    onSubmit: (form) => {
      const status = $('[data-im-status] .active', form).dataset.value;
      withBusyButton(form, async () => {
        const rows = await readTableFile(form.elements.file.files[0]);
        const result = importMembers(panel, rows, status);
        bootstrap.Modal.getInstance('#pvModal').hide();
        const notes = [result.dupes && `${plural(result.dupes, 'email')} already in the panel`, result.invalid && `${fmtInt(result.invalid)} without a valid email`].filter(Boolean).join(', ');
        showToast(result.added ? `Imported ${plural(result.added, 'member')}${notes ? ` (${notes} skipped)` : ''}.` : `Nothing imported${notes ? `: ${notes}` : ''}.`, result.added ? 'success' : 'info');
        if (currentView === 'panel' && pl.slug === panel.slug) {
          if (result.added) Object.assign(pl, { search: '', status: '', country: '', page: Infinity, flashId: result.lastId });
          renderPanelPage(panel.slug);
        }
      });
      return false;
    },
  });
  $('#pvModalBody').onclick = (e) => {
    const btn = e.target.closest('[data-im-status] button');
    if (!btn) return;
    $$('[data-im-status] button').forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
  };
}

function importMembers(panel, rows, status) {
  const d = panelData(panel);
  let cols = { email: 0, first: 1, last: 2, country: 3 };
  if (rows.length && !rows[0].some((c) => EMAIL_RE.test(c))) {
    const header = rows.shift();
    const found = Object.fromEntries(Object.entries(IMPORT_COLUMNS).map(([key, re]) => [key, header.findIndex((h) => re.test(h))]));
    if (found.email !== -1) cols = found;
  }
  const known = new Set();
  for (let i = 0; i < memberTotal(d); i++) known.add(searchKey(panel, d, i).split(' ').pop());
  const result = { added: 0, dupes: 0, invalid: 0, lastId: null };
  rows.forEach((r) => {
    const email = (r[cols.email] || '').toLowerCase();
    if (!EMAIL_RE.test(email)) { result.invalid += 1; return; }
    if (known.has(email)) { result.dupes += 1; return; }
    known.add(email);
    const code = (r[cols.country] || '').toLowerCase();
    const country = WORLD_INDEX.has(code) ? code : panel.countries[0][0];
    const at = Date.now();
    const m = {
      panel: panel.slug, index: memberTotal(d), id: panel.base + memberTotal(d), status, country, imported: true,
      first: cols.first >= 0 ? r[cols.first] || '' : '', last: cols.last >= 0 ? r[cols.last] || '' : '', email,
      gender: '', birthdate: '', region: '', postal: '', language: COUNTRY_LANGUAGE[country] || 'English',
      puuid: randomUuid(), reliable: true, createdAt: at, lastLoginAt: null,
    };
    d.extra.push(m);
    result.added += 1;
    result.lastId = m.id;
  });
  return result;
}
