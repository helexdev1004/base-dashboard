'use strict';

// Redeem: reward requests and their status.

const REDEEM_PAGE_SIZE = 12;
const REDEEM_STATUSES = ['pending', 'completed', 'rejected'];

const redeemState = { search: '', status: '', sortDir: 'desc', page: 1, mounted: false, timer: 0 };

function redemptionMember(red) {
  return memberAt(panelBySlug(red.panel), red.index);
}

function visibleRedemptions() {
  const q = redeemState.search.trim().toLowerCase();
  const list = redemptions.filter((red) => {
    if (redeemState.status && red.status !== redeemState.status) return false;
    if (!q) return true;
    const m = redemptionMember(red);
    return `${red.id} ${red.panelistId} ${red.reward} ${m.email} ${m.first} ${m.country}`.toLowerCase().includes(q);
  });
  return list.sort((a, b) => (redeemState.sortDir === 'desc' ? b.requestedAt - a.requestedAt || b.id - a.id : a.requestedAt - b.requestedAt || a.id - b.id));
}

function renderRedeem() {
  ensureRedemptions();
  document.title = 'Redeem · Base';
  const root = $('#redeemView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Redeem</h1>
      <p class="page-sub">Requests to exchange points for rewards. Rejecting a request gives the points back to the panelist.</p>
    </header>
    <section class="pv-card flush">
      <div class="list-filters">
        ${searchGroupHtml('redeem', 'Search requests…', redeemState.search)}
        <select class="form-select pv-filter" data-rd-filter aria-label="Status filter">
          <option value="">All statuses</option>
          ${optionsHtml(REDEEM_STATUSES.map((s) => [s, s[0].toUpperCase() + s.slice(1)]), redeemState.status)}
        </select>
        <span class="pv-toolbar-note" id="rdPending"></span>
        <button type="button" class="btn btn-export btn-sm-h ms-auto" data-rd-action="export"><i class="bi bi-download"></i> Export</button>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table rd-table">
          <thead id="rdHead"></thead>
          <tbody id="rdRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="rdFooter"></div>
    </section>`;
  if (!redeemState.mounted) {
    root.addEventListener('click', onRedeemClick);
    root.addEventListener('input', onRedeemInput);
    root.addEventListener('change', onRedeemChange);
    redeemState.mounted = true;
  }
  renderRedeemRows();
}

function renderRedeemRows() {
  const list = visibleRedemptions();
  const { rows, page, pages, start } = paginate(list, redeemState.page, REDEEM_PAGE_SIZE);
  redeemState.page = page;
  const pending = redemptions.filter((x) => x.status === 'pending').length;
  $('#rdPending').innerHTML = pending ? `<strong>${fmtInt(pending)}</strong> waiting for review` : 'Nothing waiting for review';
  const desc = redeemState.sortDir === 'desc';
  $('#rdHead').innerHTML = `
    <tr>
      <th>ID</th><th>Panelist ID</th><th>Reward</th><th>Email</th><th>First name</th><th>Country</th><th>Value</th><th>Points</th><th>Status</th>
      <th aria-sort="${desc ? 'descending' : 'ascending'}"><button type="button" class="th-sort" data-rd-action="sort">Requested <i class="bi bi-caret-${desc ? 'down' : 'up'}-fill"></i></button></th>
    </tr>`;
  $('#rdRows').innerHTML = rows.length
    ? rows.map((red) => {
        const m = redemptionMember(red);
        return `
          <tr>
            <td class="col-id">${red.id}</td>
            <td><a class="cell-link" href="#/panels/${red.panel}/${red.panelistId}" title="${escapeHtml(panelLabel(panelBySlug(red.panel)))}">${red.panelistId}</a></td>
            <td>${escapeHtml(red.reward)}</td>
            <td class="pl-email">${escapeHtml(m.email)}</td>
            <td>${escapeHtml(m.first || '—')}</td>
            <td>${m.country.toUpperCase()}</td>
            <td class="num-l">${escapeHtml(rewardValue(red.value, red.currency))}</td>
            <td class="num-l">${fmtInt(red.points)}</td>
            <td>
              <select class="form-select status-select rd-status" data-status="${red.status}" data-rd-id="${red.id}" aria-label="Status of request ${red.id}">
                ${optionsHtml(REDEEM_STATUSES.map((s) => [s, s]), red.status)}
              </select>
            </td>
            <td class="t-muted">${fmtDate(red.requestedAt)}</td>
          </tr>`;
      }).join('')
    : emptyRow(10, 'No requests found', redeemState.search || redeemState.status ? 'Try a different search or status.' : 'Requests show up here when panelists redeem their points.');
  $('#rdFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> requests` : 'No requests to show'}</span>
    <nav aria-label="Request pages">${pagerHtml(page, pages, 'rd-page')}</nav>`;
}

function onRedeemClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-rd-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      redeemState.page = Number(pageBtn.dataset.rdPage);
      renderRedeemRows();
    }
    return;
  }
  if (t.closest('[data-search-go]')) {
    $('[data-search="redeem"]').focus();
    return;
  }
  if (t.closest('[data-search-clear]')) {
    redeemState.search = '';
    redeemState.page = 1;
    $('[data-search="redeem"]').value = '';
    renderRedeemRows();
    return;
  }
  const el = t.closest('[data-rd-action]');
  if (el?.dataset.rdAction === 'sort') {
    redeemState.sortDir = redeemState.sortDir === 'desc' ? 'asc' : 'desc';
    renderRedeemRows();
  } else if (el?.dataset.rdAction === 'export') {
    exportRedemptions();
  }
}

function onRedeemInput(e) {
  if (e.target.dataset.search !== 'redeem') return;
  redeemState.search = e.target.value;
  redeemState.page = 1;
  clearTimeout(redeemState.timer);
  redeemState.timer = setTimeout(renderRedeemRows, 100);
}

function onRedeemChange(e) {
  if (e.target.matches('[data-rd-filter]')) {
    redeemState.status = e.target.value;
    redeemState.page = 1;
    renderRedeemRows();
    return;
  }
  const select = e.target.closest('[data-rd-id]');
  if (!select) return;
  const red = redemptions.find((x) => x.id === Number(select.dataset.rdId));
  if (!setRedemptionStatus(red, select.value)) {
    select.value = red.status;
    return;
  }
  select.dataset.status = red.status;
  // Keep the row in view until the next re-render, unless it no longer matches the filter.
  if (redeemState.status && red.status !== redeemState.status) renderRedeemRows();
  else $('#rdPending').innerHTML = (() => {
    const pending = redemptions.filter((x) => x.status === 'pending').length;
    return pending ? `<strong>${fmtInt(pending)}</strong> waiting for review` : 'Nothing waiting for review';
  })();
}

// Moving a request into or out of "rejected" gives the points back or takes them again.
function setRedemptionStatus(red, status) {
  if (status === red.status) return true;
  const panel = panelBySlug(red.panel);
  const h = memberHistory(panel, red.index); // the log as it was before this change
  const wasRejected = red.status === 'rejected';
  const nowRejected = status === 'rejected';
  if (wasRejected && !nowRejected) {
    const balance = pointsBalance(h);
    if (balance < red.points) {
      showToast(`Panelist ${red.panelistId} only has ${plural(balance, 'point')} left, so this request can't be reopened.`, 'info');
      return false;
    }
    addPointEntry(panel, red.index, { type: 'exchange', ref: red.id, points: -red.points });
  } else if (nowRejected && !wasRejected) {
    addPointEntry(panel, red.index, { type: 'refund', ref: red.id, points: red.points });
  }
  red.status = status;
  const note = nowRejected && !wasRejected ? ` ${plural(red.points, 'point')} returned to panelist ${red.panelistId}.`
    : wasRejected && !nowRejected ? ` ${plural(red.points, 'point')} taken from panelist ${red.panelistId} again.` : '';
  showToast(`Request ${red.id} marked as ${status}.${note}`, nowRejected ? 'info' : 'success');
  return true;
}

function exportRedemptions() {
  const list = visibleRedemptions();
  downloadCsv(`redeem-requests-${today()}.csv`, [
    ['ID', 'Panel', 'Panelist ID', 'Reward', 'Email', 'First name', 'Country', 'Value', 'Currency', 'Points', 'Status', 'Requested'],
    ...list.map((red) => {
      const m = redemptionMember(red);
      return [red.id, panelLabel(panelBySlug(red.panel)), red.panelistId, red.reward, m.email, m.first, m.country.toUpperCase(),
        red.value, red.currency, red.points, red.status, fmtDate(red.requestedAt)];
    }),
  ]);
  showToast(`Exported ${plural(list.length, 'request')}.`);
}
