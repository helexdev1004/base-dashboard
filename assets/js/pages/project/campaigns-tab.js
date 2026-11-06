'use strict';

// Campaigns tab: the campaign table. Batch campaigns expand to show one sub-row per segment.

function findCampaign(id, parentId) {
  const list = pv.project.detail.campaigns;
  if (parentId) return list.find((c) => c.id === Number(parentId))?.segments.find((s) => s.id === Number(id));
  return list.find((c) => c.id === Number(id));
}

function mailMenuHtml(c, parent) {
  const ref = `data-id="${c.id}"${parent ? ` data-parent="${parent.id}"` : ''}`;
  return `
    <div class="dropdown">
      <button type="button" class="icon-btn-sm mail-btn" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}'
              aria-expanded="false" aria-label="Email options for ${escapeHtml(c.name)}">
        <i class="bi bi-envelope"></i><i class="bi bi-chevron-down mail-caret"></i>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><button type="button" class="dropdown-item" data-action="camp-mail" data-kind="reminder" ${ref}><i class="bi bi-bell"></i> Reminder email</button></li>
      </ul>
    </div>`;
}

function campaignRowHtml(c, parent) {
  const s = c.stats;
  const isSub = Boolean(parent);
  const open = pv.expanded.has(c.id);
  const caret = !isSub && c.segments.length
    ? `<button type="button" class="camp-caret${open ? ' open' : ''}" data-action="camp-toggle" data-id="${c.id}"
               aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Show'} segments of ${escapeHtml(c.name)}"><i class="bi bi-caret-right-fill"></i></button>`
    : '<span class="camp-caret-spacer"></span>';
  const value = (key) => (key === 'rr' ? `<td>${s.inv ? Math.round(ratio(s.eb, s.inv)) : 0}%</td>` : statCell(s, key));
  const name = isSub
    ? `<span>${escapeHtml(c.name)}</span>`
    : `<button type="button" class="cell-link" data-action="camp-info" data-id="${c.id}" title="Campaign info">${escapeHtml(c.name)}</button>`;
  return `
    <tr class="${isSub ? 'camp-sub' : ''}">
      <td><div class="camp-name">${isSub ? '' : caret}${name}</div></td>
      <td>${isSub ? '' : c.panel}</td>
      ${CAMPAIGN_COLS.map(([key]) => value(key)).join('')}
      <td>${statusSelectHtml('campaign', c.id, c.status, isSub ? ` data-parent="${parent.id}"` : '')}</td>
      <td class="t-muted">${fmtStamp(c.created)}</td>
      <td>
        <div class="row-actions">
          ${mailMenuHtml(c, parent)}
          ${isSub ? '' : `<button type="button" class="icon-btn-sm" data-action="camp-duplicate" data-id="${c.id}" title="Duplicate campaign" aria-label="Duplicate ${escapeHtml(c.name)}"><i class="bi bi-repeat"></i></button>`}
        </div>
      </td>
    </tr>`;
}

function renderCampaigns(el) {
  const d = pv.project.detail;
  const live = pv.campStatus === 'Live';
  const desc = pv.campSort === 'desc';
  const list = d.campaigns
    .filter((c) => (c.status === 'closed') !== live)
    .filter((c) => !pv.campPanel || c.panel === pv.campPanel)
    .sort((a, b) => (desc ? b.created - a.created : a.created - b.created));
  const span = CAMPAIGN_COLS.length + 5;

  el.innerHTML = `
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-action="new-campaign"><i class="bi bi-plus-circle"></i> New Campaign</button>
        <button type="button" class="icon-btn-sm" data-action="refresh" data-tab="campaigns" title="Refresh" aria-label="Refresh"><i class="bi bi-arrow-clockwise"></i></button>
        <div class="segmented seg-sm" role="group" aria-label="Campaign status">
          <button type="button" data-action="camp-status" data-value="Live" class="${live ? 'active' : ''}" aria-pressed="${live}">Live</button>
          <button type="button" data-action="camp-status" data-value="Closed" class="${live ? '' : 'active'}" aria-pressed="${!live}">Closed</button>
        </div>
        <select class="form-select form-select-sm pv-filter" data-change="camp-panel" aria-label="Filter on panel">
          <option value="">All panels</option>
          ${PANELS.map((x) => `<option value="${x.code}"${x.code === pv.campPanel ? ' selected' : ''}>${x.code} · ${escapeHtml(x.name)}</option>`).join('')}
        </select>
        ${ecToggleHtml()}
      </div>
      <div class="table-responsive">
        <table class="pv-table camp-table">
          <thead><tr>
            <th>Campaign</th><th>Panel</th>${thCells(CAMPAIGN_COLS)}<th>Status</th>
            <th aria-sort="${desc ? 'descending' : 'ascending'}">
              <button type="button" class="th-sort" data-action="camp-sort">Created <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button>
            </th>
            <th><span class="visually-hidden">Actions</span></th>
          </tr></thead>
          <tbody>
            ${list.length
              ? list.map((c) => campaignRowHtml(c) + (pv.expanded.has(c.id) ? c.segments.map((s) => campaignRowHtml(s, c)).join('') : '')).join('')
              : emptyRow(span, `No ${live ? 'live' : 'closed'} campaigns`, live ? 'Create a campaign to invite panelists.' : 'Closed campaigns show up here.')}
          </tbody>
        </table>
      </div>
    </section>`;
}
