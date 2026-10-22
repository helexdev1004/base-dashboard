'use strict';

/* =========================================================
   Base · Blacklisted RESPIDs (#/blacklist)
   Respondent IDs that can't enter any survey. Add or remove them
   one at a time, or in bulk from a CSV/XLSX file.
   Uses helpers from script.js and project.js.
   ========================================================= */

const BLACKLIST_PAGE_SIZE = 10;
const RESPID_RE = /^[A-Za-z0-9_-]{4,64}$/;
const blacklist = []; // { id, respid, createdAt }
const bl = { mode: 'import', search: '', page: 1, mounted: false };

function sampleUuid(next) {
  const hex = (n) => Array.from({ length: n }, () => Math.floor(next() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[Math.floor(next() * 4)]}${hex(3)}-${hex(12)}`;
}

(function seedBlacklist() {
  const r = seeded(9091);
  const at = (iso) => new Date(iso).getTime();
  // The first ten match the reference design; the rest came in one bulk import.
  const known = [
    ['3fe19810-ba59-479e-b671-7966126956a0', '2026-09-28T20:03:24'],
    ['3dd1fdd8-8f47-4b1f-a24b-46e3cf7766bb', '2026-10-05T20:28:23'],
    ['8f44410f-f336-4a3c-be37-37692aa9a644'], ['07c9b01e-35ec-47fe-9c76-e2a28567f5d0'],
    ['054e75dd-5a65-461e-9031-5c8671a5b4ed'], ['a5ea9905-800d-44fc-b938-b31bdd8e5258'],
    ['5def37c9-3bc7-4fb8-94db-bf7392367e47'], ['8760dbc6-f34d-47a3-a66e-a44659b8e151'],
    ['dd8fdcbd-575c-473f-9d4b-f6081829ff84'], ['c58f7dd2-c68f-427f-ae66-2a0df414aeb8'],
  ];
  const bulk = at('2026-10-08T13:41:37');
  for (let id = 1; id <= 47; id++) {
    const [respid, iso] = known[id - 1] || [sampleUuid(r.next)];
    blacklist.push({ id, respid, createdAt: iso ? at(iso) : bulk });
  }
}());

function visibleBlacklist() {
  const q = bl.search.trim().toLowerCase();
  return blacklist.filter((x) => !q || x.respid.toLowerCase().includes(q) || String(x.id) === q).sort((a, b) => a.id - b.id);
}

function renderBlacklist() {
  document.title = 'Blacklisted RESPIDs · Base';
  const root = $('#blacklistView');
  const importing = bl.mode === 'import';
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Blacklisted RESPIDs</h1>
      <p class="page-sub">Respondent IDs that are blocked from entering any survey.</p>
    </header>

    <section class="pv-card bl-tools">
      <div class="bl-row">
        <div class="bl-mode">
          <div class="segmented seg-field" role="group" aria-label="Import or remove">
            <button type="button" data-bl-mode="import" class="${importing ? 'active' : ''}" aria-pressed="${importing}">Import</button>
            <button type="button" data-bl-mode="remove" class="${importing ? '' : 'active'}" aria-pressed="${!importing}">Remove</button>
          </div>
          <div class="field-help">${importing ? 'RESPIDs you process are added to the blacklist.' : 'RESPIDs you process are taken off the blacklist.'}</div>
        </div>
        <form class="bl-file" data-bl-form="file" novalidate>
          <div class="upload-row">
            <input class="form-control" type="file" id="blFile" name="file" aria-label="CSV or XLSX file of RESPIDs"
                   accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel">
            <button type="submit" class="btn btn-ghost">Process</button>
          </div>
          <div class="field-help">Select a CSV or XLSX file to process, one RESPID per row.</div>
        </form>
      </div>
      <div class="bl-row">
        <form class="bl-one" data-bl-form="one" novalidate>
          <div class="input-group">
            <input class="form-control mono" id="blRespid" name="respid" placeholder="Enter RESPID" aria-label="RESPID" autocomplete="off" spellcheck="false">
            <button type="submit" class="btn btn-ghost">${importing ? 'Register' : 'Remove'}</button>
          </div>
        </form>
        <button type="button" class="btn btn-export btn-sm-h ms-auto" data-bl-action="export"><i class="bi bi-download"></i> Export data</button>
      </div>
    </section>

    <section class="pv-card flush">
      <div class="list-filters">${searchGroupHtml('blacklist', 'Search RESPIDs…', bl.search)}</div>
      <div class="table-responsive">
        <table class="pv-table list-table">
          <thead><tr><th>ID</th><th>RESPID</th><th>Created</th><th><span class="visually-hidden">Delete</span></th></tr></thead>
          <tbody id="blRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="blFooter"></div>
    </section>`;
  if (!bl.mounted) {
    root.addEventListener('click', onBlacklistClick);
    root.addEventListener('input', onBlacklistInput);
    root.addEventListener('submit', onBlacklistSubmit);
    bl.mounted = true;
  }
  renderBlacklistRows();
}

function renderBlacklistRows() {
  const list = visibleBlacklist();
  const { rows, page, pages, start } = paginate(list, bl.page, BLACKLIST_PAGE_SIZE);
  bl.page = page;
  $('#blRows').innerHTML = rows.length
    ? rows.map((x) => `
        <tr>
          <td class="col-id">${x.id}</td>
          <td class="mono">${escapeHtml(x.respid)}</td>
          <td class="t-muted">${fmtDateTime(x.createdAt)}</td>
          <td class="t-end"><button type="button" class="btn btn-danger-solid btn-xs" data-bl-delete="${x.id}" aria-label="Delete ${escapeHtml(x.respid)}">Delete</button></td>
        </tr>`).join('')
    : emptyRow(4, bl.search ? 'No matches' : 'The blacklist is empty', bl.search ? 'Try a different search.' : 'Register a RESPID or import a file to block respondents.');
  $('#blFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> RESPIDs` : 'Nothing to show'}</span>
    <nav aria-label="Blacklist pages">${pagerHtml(page, pages, 'bl-page')}</nav>`;
}

// Adds (import mode) or removes (remove mode) RESPIDs. Returns counts for the toast.
function applyRespids(values) {
  const result = { changed: 0, skipped: 0, invalid: 0 };
  if (bl.mode === 'import') {
    const known = new Set(blacklist.map((x) => x.respid.toLowerCase()));
    let nextId = Math.max(0, ...blacklist.map((x) => x.id)) + 1;
    values.forEach((raw) => {
      const respid = raw.trim();
      if (!RESPID_RE.test(respid)) result.invalid += 1;
      else if (known.has(respid.toLowerCase())) result.skipped += 1;
      else {
        known.add(respid.toLowerCase());
        blacklist.push({ id: nextId++, respid, createdAt: Date.now() });
        result.changed += 1;
      }
    });
  } else {
    const remove = new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean));
    const before = blacklist.length;
    for (let i = blacklist.length - 1; i >= 0; i--) {
      if (remove.has(blacklist[i].respid.toLowerCase())) blacklist.splice(i, 1);
    }
    result.changed = before - blacklist.length;
    result.skipped = remove.size - result.changed;
  }
  return result;
}

function respidSummary({ changed, skipped, invalid }) {
  if (bl.mode === 'import') {
    const notes = [skipped && `${fmtInt(skipped)} already listed`, invalid && `${fmtInt(invalid)} not valid`].filter(Boolean).join(', ');
    return `Added ${plural(changed, 'RESPID')} to the blacklist.${notes ? ` (${notes})` : ''}`;
  }
  return `Removed ${plural(changed, 'RESPID')} from the blacklist.${skipped ? ` (${fmtInt(skipped)} ${skipped === 1 ? "wasn't" : "weren't"} on it)` : ''}`;
}

async function processBlacklistFile(form) {
  const file = form.elements.file.files[0];
  if (!file) {
    showToast('Choose a CSV or XLSX file first.', 'info');
    return;
  }
  await withBusyButton(form, async () => {
    const values = await readFileValues(file);
    if (!values.length) {
      showToast(`No RESPIDs found in ${file.name}.`, 'info');
      return;
    }
    const result = applyRespids(values);
    form.reset();
    if (bl.mode === 'import' && result.changed) bl.page = Infinity; // new entries are on the last page
    renderBlacklistRows();
    showToast(respidSummary(result), result.changed ? 'success' : 'info');
  });
}

function registerOne(form) {
  const input = form.elements.respid;
  const respid = input.value.trim();
  if (!respid) {
    input.focus();
    return;
  }
  if (bl.mode === 'import' && !RESPID_RE.test(respid)) {
    input.classList.add('is-invalid');
    input.focus();
    showToast("That doesn't look like a RESPID (4–64 letters, numbers, - or _).", 'info');
    return;
  }
  const result = applyRespids([respid]);
  if (!result.changed) {
    input.select();
    showToast(bl.mode === 'import' ? `${respid} is already on the blacklist.` : `${respid} isn't on the blacklist.`, 'info');
    return;
  }
  input.value = '';
  if (bl.mode === 'import') bl.page = Infinity;
  renderBlacklistRows();
  showToast(bl.mode === 'import' ? `${respid} added to the blacklist.` : `${respid} removed from the blacklist.`);
}

function onBlacklistSubmit(e) {
  const form = e.target.closest('[data-bl-form]');
  if (!form) return;
  e.preventDefault();
  if (form.dataset.blForm === 'file') processBlacklistFile(form);
  else registerOne(form);
}

function onBlacklistClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-bl-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      bl.page = Number(pageBtn.dataset.blPage);
      renderBlacklistRows();
    }
    return;
  }
  const mode = t.closest('[data-bl-mode]');
  if (mode) {
    if (mode.dataset.blMode !== bl.mode) {
      bl.mode = mode.dataset.blMode;
      renderBlacklist();
    }
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="blacklist"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    bl.search = '';
    bl.page = 1;
    $('[data-search="blacklist"]').value = '';
    renderBlacklistRows();
    return;
  }
  if (t.closest('[data-bl-action="export"]')) {
    const list = visibleBlacklist();
    downloadCsv(`blacklisted-respids-${today()}.csv`, [
      ['ID', 'RESPID', 'Created'],
      ...list.map((x) => [x.id, x.respid, new Date(x.createdAt).toISOString()]),
    ]);
    showToast(`Exported ${plural(list.length, 'RESPID')}.`);
    return;
  }
  const del = t.closest('[data-bl-delete]');
  if (del && confirmClick(del, 'Sure?')) {
    const entry = blacklist.find((x) => x.id === Number(del.dataset.blDelete));
    blacklist.splice(blacklist.indexOf(entry), 1);
    renderBlacklistRows();
    showToast(`${entry.respid} removed from the blacklist.`, 'info');
  }
}

function onBlacklistInput(e) {
  const el = e.target;
  if (el.id === 'blRespid') el.classList.remove('is-invalid');
  if (el.dataset.search !== 'blacklist') return;
  bl.search = el.value;
  bl.page = 1;
  renderBlacklistRows();
}
