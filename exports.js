'use strict';

/* =========================================================
   Base · Exports
   Files queued from projects ("Export screener data" / "Export poll
   data"). A file is prepared in the background, then downloaded once:
   after the download it is removed from the list.
   Uses helpers from script.js and project.js.
   ========================================================= */

const EXPORTS_PAGE_SIZE = 10;
const EXPORT_PREP_MS = 2500;

const exportJobs = [];
const exportsState = { sortDir: 'desc', page: 1 };
let nextExportId = 278;

const exportFileName = (projectId, kind) => `export-project-${projectId}-${kind === 'poll' ? 'poll' : 'screener'}-data.xlsx`;

// A few finished files from earlier, so the page isn't empty on first visit.
(function seedExports() {
  const now = Date.now();
  const pickProject = (i) => projects[(i * 7) % projects.length];
  [
    { id: 277, project: pickProject(1), kind: 'screener', daysAgo: 0.4, tookMs: 2000 },
    { id: 195, project: pickProject(3), kind: 'screener', daysAgo: 68, tookMs: 15.3 * 3600 * 1000 },
    { id: 193, project: pickProject(5), kind: 'poll', daysAgo: 81, tookMs: 2.1 * 3600 * 1000 },
  ].forEach(({ id, project, kind, daysAgo, tookMs }) => {
    const createdAt = now - daysAgo * DAY;
    exportJobs.push({
      id, projectId: project.id, kind, fileName: exportFileName(project.id, kind),
      status: 'finished', createdAt, finishedAt: createdAt + tookMs, rows: null,
    });
  });
}());

function queueExport(project, kind) {
  const job = {
    id: nextExportId++,
    projectId: project.id,
    kind,
    fileName: exportFileName(project.id, kind),
    status: 'processing',
    createdAt: Date.now(),
    finishedAt: null,
    rows: questionExportRows(project, kind), // snapshot at the time of the request
  };
  exportJobs.push(job);
  refreshExports();
  setTimeout(() => {
    job.status = 'finished';
    job.finishedAt = Date.now();
    refreshExports();
    showToast(`${job.fileName} is ready on the Exports page.`);
  }, EXPORT_PREP_MS);
  return job;
}

function refreshExports() {
  const ready = exportJobs.filter((j) => j.status === 'finished').length;
  const badge = $('#exportsBadge');
  badge.textContent = ready;
  badge.hidden = ready === 0;
  badge.title = `${plural(ready, 'file')} ready to download`;
  if (currentView === 'exports') renderExports();
}

function renderExports() {
  document.title = 'Exports · Base';
  const root = $('#exportsView');
  const sorted = [...exportJobs].sort((a, b) => (exportsState.sortDir === 'desc' ? b.id - a.id : a.id - b.id));
  const { rows, page, pages, start } = paginate(sorted, exportsState.page, EXPORTS_PAGE_SIZE);
  exportsState.page = page;
  const desc = exportsState.sortDir === 'desc';

  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Exports</h1>
      <p class="page-sub">Files exported from your projects. Use "Export screener data" or "Export poll data" in a project to add one.</p>
    </header>

    <div class="alert-attention" role="note">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <span><strong>Attention!</strong> Once a file is downloaded, the system deletes it.</span>
    </div>

    <section class="pv-card flush">
      <div class="table-responsive">
        <table class="pv-table exports-table">
          <thead>
            <tr>
              <th aria-sort="${desc ? 'descending' : 'ascending'}">
                <button type="button" class="th-sort" data-ex-action="sort">ID <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button>
              </th>
              <th>File name</th>
              <th>Status</th>
              <th>Created</th>
              <th>Finished</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((job) => `
              <tr>
                <td class="col-id">${job.id}</td>
                <td>
                  ${job.status === 'finished'
                    ? `<button type="button" class="file-link" data-ex-action="download" data-id="${job.id}" title="Download (the file is then removed)">
                         <i class="bi bi-file-earmark-spreadsheet"></i>${escapeHtml(job.fileName)}<i class="bi bi-download file-link-dl"></i>
                       </button>`
                    : `<span class="file-pending"><i class="bi bi-file-earmark-spreadsheet"></i>${escapeHtml(job.fileName)}</span>`}
                </td>
                <td>
                  ${job.status === 'finished'
                    ? '<span class="ex-status is-done"><i class="bi bi-check-circle-fill"></i> finished</span>'
                    : '<span class="ex-status is-busy"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> processing</span>'}
                </td>
                <td class="t-muted">${fmtDateTime(job.createdAt)}</td>
                <td class="t-muted">${job.finishedAt ? fmtDateTime(job.finishedAt) : '—'}</td>
              </tr>`).join('') : emptyRow(5, 'No exports waiting', 'Exported files show up here until you download them.')}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span class="page-info">${sorted.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${sorted.length}</strong> files` : 'Nothing to download'}</span>
        <nav aria-label="Export pages">${pagerHtml(page, pages, 'ex-page')}</nav>
      </div>
    </section>`;
}

async function downloadExport(job, button) {
  const project = projects.find((p) => p.id === job.projectId);
  const rows = job.rows || questionExportRows(project, job.kind);
  button.disabled = true;
  try {
    const XLSX = await loadXlsx();
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), job.kind === 'poll' ? 'Post poll' : 'Screener');
    XLSX.writeFile(book, job.fileName);
  } catch {
    // The spreadsheet reader couldn't load (offline?): fall back to a CSV of the same data.
    downloadCsv(job.fileName.replace(/\.xlsx$/, '.csv'), rows);
  }
  exportJobs.splice(exportJobs.indexOf(job), 1);
  refreshExports();
  showToast(`${job.fileName} downloaded and removed from Exports.`);
}

function onExportsClick(e) {
  const pageBtn = e.target.closest('[data-ex-page]');
  if (pageBtn && !pageBtn.disabled) {
    exportsState.page = Number(pageBtn.dataset.exPage);
    renderExports();
    return;
  }
  const el = e.target.closest('[data-ex-action]');
  if (!el || el.disabled) return;
  if (el.dataset.exAction === 'sort') {
    exportsState.sortDir = exportsState.sortDir === 'desc' ? 'asc' : 'desc';
    renderExports();
  } else if (el.dataset.exAction === 'download') {
    const job = exportJobs.find((j) => j.id === Number(el.dataset.id));
    if (job) downloadExport(job, el);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('#exportsView').addEventListener('click', onExportsClick);
  refreshExports();
});
