'use strict';

/* =========================================================
   Base · Rewards and Redeem
   Panel management ▸ Rewards (#/rewards): what panelists can exchange
   their points for. Panel management ▸ Redeem (#/redeem): the exchange
   requests. Rejecting a request returns the points to the panelist.
   Uses helpers from script.js, project.js, vendors.js and panels.js.
   ========================================================= */

const REWARDS_PAGE_SIZE = 10;
const REDEEM_PAGE_SIZE = 12;
const REDEEM_STATUSES = ['pending', 'completed', 'rejected'];

// { id, name, panel (slug), points, value, currency, countries: ['at', …], active }
const rewards = [];

(function seedRewards() {
  const cc = (s) => s.toLowerCase().split(/,\s*/);
  // [name, panel, points, value, currency, countries, active]
  [
    // The first ten are the rows in the reference design.
    ['PayPal', 'gavenze', 550, 30, 'EUR', 'AT, BE, BG, HR, CZ, FR, DE, GR, HU, IT, NL, PL, PT, RO, SK, SI, ES, SE'],
    ['Allegro - gift card', 'gavenze', 430, 100, 'ZŁ', 'PL'],
    ['Amazon - gift card', 'gavenze', 430, 100, 'ZŁ', 'PL'],
    ['Amazon - gift card', 'gavenze', 550, 130, 'ZŁ', 'PL'],
    ['H&M - gift card - 125 lei', 'gavenze', 450, 125, 'LEI', 'RO'],
    ['EMAG - gift card', 'gavenze', 370, 100, 'LEI', 'RO'],
    ['PayPal', 'gavenze', 275, 15, 'EUR', 'AT, BE, HR, FR, DE, IT, NL, PT, SI, SE, ES'],
    ['IKEA - gift card', 'gavenze', 370, 100, 'LEI', 'RO'],
    ['PlayStation - gift card', 'gavenze', 370, 100, 'LEI', 'RO'],
    ['Decathlon - gift card', 'gavenze', 370, 100, 'LEI', 'RO'],
    ['Ozone.bg - gift card', 'gavenze', 275, 15, 'EUR', 'BG'],
    ['eMAG.bg - gift card', 'gavenze', 370, 20, 'EUR', 'BG'],
    ['Adidas - gift card', 'gavenze', 400, 500, 'KČ', 'CZ'],
    ['H&M - gift card', 'gavenze', 400, 500, 'KČ', 'CZ'],
    ['Alza.cz - gift card', 'gavenze', 550, 700, 'KČ', 'CZ'],
    ['Kaufland - gift card', 'gavenze', 400, 20, 'EUR', 'SK'],
    ['Decathlon - gift card', 'gavenze', 400, 8000, 'FT', 'HU'],
    ['eMAG.hu - gift card', 'gavenze', 550, 12000, 'FT', 'HU'],
    ['Zalando - gift card', 'gavenze', 550, 30, 'EUR', 'DE, AT'],
    ['Americanas - gift card', 'gavenze', 450, 100, 'BRL', 'BR'],
    ['Allegro - gift card', 'gavenze', 860, 200, 'ZŁ', 'PL', false],
    ['Amazon.sa - gift card', 'jafenzi', 450, 50, 'SAR', 'SA'],
    ['Amazon.ae - gift card', 'jafenzi', 450, 50, 'AED', 'AE'],
    ['Noon - gift card', 'jafenzi', 550, 100, 'AED', 'AE, SA'],
    ['Carrefour - gift card', 'jafenzi', 400, 500, 'EGP', 'EG'],
    ['Jumia - gift card', 'jafenzi', 350, 200, 'MAD', 'MA, EG'],
    ['PayPal', 'encuestat', 500, 25, 'EUR', 'ES'],
    ['Amazon.es - gift card', 'encuestat', 275, 15, 'EUR', 'ES'],
    ['Mercado Libre - gift card', 'encuestat', 450, 300, 'MXN', 'MX'],
    ['Mercado Libre - gift card', 'encuestat', 450, 15000, 'ARS', 'AR'],
    ['Falabella - gift card', 'encuestat', 450, 20000, 'CLP', 'CL'],
    ['Éxito - gift card', 'encuestat', 450, 80000, 'COP', 'CO'],
    ['Plaza Vea - gift card', 'encuestat', 400, 50, 'PEN', 'PE'],
    ['Mobile top-up', 'encuestat', 200, 50, 'BOB', 'BO'],
    ['PayPal', 'sondage', 550, 30, 'EUR', 'FR, BE'],
    ['Amazon.fr - gift card', 'sondage', 275, 15, 'EUR', 'FR'],
    ['Fnac - gift card', 'sondage', 450, 25, 'EUR', 'FR, BE'],
    ['Decathlon - gift card', 'sondage', 450, 25, 'EUR', 'FR, BE'],
    ['Migros - gift card', 'sondage', 450, 25, 'CHF', 'CH'],
    ['Tim Hortons - gift card', 'sondage', 350, 20, 'CAD', 'CA'],
    ['Jumia - gift card', 'sondage', 350, 200, 'MAD', 'MA'],
    ['Bol.com - gift card', 'mening', 450, 25, 'EUR', 'NL, BE'],
    ['PayPal', 'mening', 550, 30, 'EUR', 'NL, BE'],
    ['VVV gift card', 'mening', 275, 15, 'EUR', 'NL'],
    ['Albert Heijn - gift card', 'mening', 350, 20, 'EUR', 'NL'],
    ['Kinepolis - cinema voucher', 'mening', 300, 20, 'EUR', 'BE', false],
    ['PayPal', 'opinion', 500, 20, 'GBP', 'GB'],
    ['Amazon.co.uk - gift card', 'opinion', 275, 10, 'GBP', 'GB'],
    ['Tesco - gift card', 'opinion', 450, 20, 'GBP', 'GB'],
    ['PayPal', 'opinion', 550, 25, 'USD', 'US'],
    ['Amazon.com - gift card', 'opinion', 275, 10, 'USD', 'US'],
    ['Starbucks - gift card', 'opinion', 300, 10, 'USD', 'US, CA'],
    ['Amazon.ca - gift card', 'opinion', 450, 25, 'CAD', 'CA'],
    ['Woolworths - gift card', 'opinion', 450, 25, 'AUD', 'AU'],
    ['Dunnes Stores - gift card', 'opinion', 450, 25, 'EUR', 'IE'],
    ['Charity donation', 'opinion', 200, 5, 'GBP', 'GB, IE', false],
    ['Amazon.it - buono regalo', 'sondaggi', 275, 15, 'EUR', 'IT'],
    ['PayPal', 'sondaggi', 550, 30, 'EUR', 'IT'],
    ['Esselunga - buono spesa', 'sondaggi', 450, 25, 'EUR', 'IT'],
    ['Zalando - gift card', 'sondaggi', 550, 30, 'EUR', 'IT'],
    ['Migros - gift card', 'sondaggi', 450, 25, 'CHF', 'CH'],
  ].forEach(([name, panel, points, value, currency, countries, active = true], i) => {
    rewards.push({ id: i + 1, name, panel, points, value, currency, countries: cc(countries), active });
  });
}());

const rewardValue = (value, currency) => `${fmtInt(value)} ${currency}`;

/* ---------- Redemptions ---------- */
// { id, panel, index (member), panelistId, rewardId, reward, value, currency, points, status, requestedAt }
const redemptions = [];
const redemptionIndex = new Map(); // "<panel>:<panelistId>" → [redemption]
let redemptionsReady = false;

function indexRedemption(red) {
  const key = `${red.panel}:${red.panelistId}`;
  if (!redemptionIndex.has(key)) redemptionIndex.set(key, []);
  redemptionIndex.get(key).push(red);
}
const redemptionsOf = (slug, panelistId) => {
  ensureRedemptions();
  return redemptionIndex.get(`${slug}:${panelistId}`) || [];
};

// Built the first time they're needed: it reads every panel's members.
function ensureRedemptions() {
  if (redemptionsReady) return;
  redemptionsReady = true;
  const r = seeded(9090);
  const now = Date.now();
  const weights = PANEL_INFO.map((p) => (p.slug === 'gavenze' ? p.size * 6 : p.size)); // most requests come from Gavenze
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const pickPanel = () => {
    let roll = r.next() * totalWeight;
    return PANEL_INFO.find((p, k) => (roll -= weights[k]) < 0) || PANEL_INFO[0];
  };
  let id = 3871;
  let at = now - 112 * DAY;
  while (at < now - 2 * 3600 * 1000) {
    const panel = pickPanel();
    const options = rewards.filter((x) => x.panel === panel.slug && x.active);
    const reward = r.pick(options);
    const d = panelData(panel);
    let index = -1;
    for (let tries = 0; tries < 400 && index < 0; tries++) {
      const i = r.int(0, d.n - 1);
      if (statusAt(d, i) === 'active' && reward.countries.includes(countryAt(d, i)) && joinedAt(panel, i) < at - 14 * DAY) index = i;
    }
    if (index >= 0) {
      const age = now - at;
      const status = age < 2 * DAY ? (r.chance(0.85) ? 'pending' : 'completed')
        : age < 7 * DAY ? (r.chance(0.35) ? 'pending' : r.chance(0.94) ? 'completed' : 'rejected')
          : (r.chance(0.95) ? 'completed' : 'rejected');
      const red = {
        id, panel: panel.slug, index, panelistId: panel.base + index, rewardId: reward.id, reward: reward.name,
        value: reward.value, currency: reward.currency, points: reward.points, status, requestedAt: Math.round(at),
      };
      redemptions.push(red);
      indexRedemption(red);
      id += r.chance(0.6) ? 2 : 1;
    }
    at += r.between(1, 20) * 3600 * 1000; // about two requests a day
  }
}

/* ---------- Rewards list ---------- */
const rw = { country: '', sortKey: 'id', sortDir: 'asc', page: 1, mounted: false, flashId: null };
const RW_SORTERS = {
  id: (x) => x.id,
  name: (x) => x.name.toLowerCase(),
  panel: (x) => panelLabel(panelBySlug(x.panel)).toLowerCase(),
  points: (x) => x.points,
  value: (x) => `${x.currency} ${String(x.value).padStart(8, '0')}`,
  status: (x) => (x.active ? 0 : 1),
};

function rewardCountryOptions() {
  return [...new Set(rewards.flatMap((x) => x.countries))].map((c) => [c, countryName(c)]).sort((a, b) => a[1].localeCompare(b[1]));
}

function visibleRewards() {
  const get = RW_SORTERS[rw.sortKey];
  const dir = rw.sortDir === 'asc' ? 1 : -1;
  return rewards
    .filter((x) => !rw.country || x.countries.includes(rw.country))
    .sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x < y) return -dir;
      if (x > y) return dir;
      return a.id - b.id;
    });
}

function renderRewards() {
  document.title = 'Rewards · Base';
  const root = $('#rewardsView');
  root.innerHTML = `
    <header class="page-head">
      <h1 class="page-title">Rewards</h1>
      <p class="page-sub">What panelists can exchange their survey points for, per panel and country.</p>
    </header>
    <section class="pv-card flush">
      <div class="pv-toolbar">
        <button type="button" class="btn btn-ghost btn-sm-h" data-rw-action="new"><i class="bi bi-plus-circle"></i> New Reward</button>
        <select class="form-select pv-filter rw-country" data-rw-filter aria-label="Filter on country">
          <option value="">All countries</option>
          ${optionsHtml(rewardCountryOptions(), rw.country)}
        </select>
      </div>
      <div class="table-responsive">
        <table class="pv-table list-table rw-table">
          <thead id="rwHead"></thead>
          <tbody id="rwRows"></tbody>
        </table>
      </div>
      <div class="table-footer" id="rwFooter"></div>
    </section>`;
  if (!rw.mounted) {
    root.addEventListener('click', onRewardsClick);
    root.addEventListener('change', onRewardsChange);
    rw.mounted = true;
  }
  renderRewardRows();
}

function renderRewardRows() {
  const list = visibleRewards();
  const { rows, page, pages, start } = paginate(list, rw.page, REWARDS_PAGE_SIZE);
  rw.page = page;
  $('#rwHead').innerHTML = `
    <tr>
      ${sortTh('id', 'ID', rw, 'rw-sort')}${sortTh('name', 'Name', rw, 'rw-sort')}${sortTh('panel', 'Panel', rw, 'rw-sort')}
      ${sortTh('points', 'Points', rw, 'rw-sort')}${sortTh('value', 'Value', rw, 'rw-sort')}<th>Countries</th>${sortTh('status', 'Status', rw, 'rw-sort')}
    </tr>`;
  $('#rwRows').innerHTML = rows.length
    ? rows.map((x) => `
        <tr class="row-link${x.id === rw.flashId ? ' row-flash' : ''}" data-reward="${x.id}">
          <td class="col-id">${x.id}</td>
          <td><button type="button" class="cell-link" data-reward-open="${x.id}">${escapeHtml(x.name)}</button></td>
          <td>${escapeHtml(panelLabel(panelBySlug(x.panel)))}</td>
          <td class="num-l">${fmtInt(x.points)}</td>
          <td class="num-l">${escapeHtml(rewardValue(x.value, x.currency))}</td>
          <td class="rw-countries">${x.countries.map((c) => c.toUpperCase()).join(', ')}</td>
          <td><span class="rw-status ${x.active ? 'is-on' : 'is-off'}">${x.active ? 'Active' : 'Inactive'}</span></td>
        </tr>`).join('')
    : emptyRow(7, 'No rewards found', rw.country ? `No rewards for ${escapeHtml(countryName(rw.country))} yet.` : 'Add a reward to get started.');
  rw.flashId = null;
  $('#rwFooter').innerHTML = `
    <span class="page-info">${list.length ? `Showing <strong>${start + 1}–${start + rows.length}</strong> of <strong>${list.length}</strong> rewards` : 'No rewards to show'}</span>
    <nav aria-label="Reward pages">${pagerHtml(page, pages, 'rw-page')}</nav>`;
}

function onRewardsClick(e) {
  const t = e.target;
  const pageBtn = t.closest('[data-rw-page]');
  if (pageBtn) {
    if (!pageBtn.disabled) {
      rw.page = Number(pageBtn.dataset.rwPage);
      renderRewardRows();
    }
    return;
  }
  const sort = t.closest('[data-rw-sort]');
  if (sort) {
    const key = sort.dataset.rwSort;
    rw.sortDir = rw.sortKey === key && rw.sortDir === 'asc' ? 'desc' : 'asc';
    rw.sortKey = key;
    rw.page = 1;
    renderRewardRows();
    return;
  }
  if (t.closest('[data-rw-action="new"]')) {
    openRewardModal(null);
    return;
  }
  const row = t.closest('tr[data-reward]');
  if (row) openRewardModal(rewards.find((x) => x.id === Number(row.dataset.reward)));
}

function onRewardsChange(e) {
  if (!e.target.matches('[data-rw-filter]')) return;
  rw.country = e.target.value;
  rw.page = 1;
  renderRewardRows();
}

function openRewardModal(reward) {
  ensureRedemptions();
  const used = reward ? redemptions.filter((x) => x.rewardId === reward.id).length : 0;
  const active = reward ? reward.active : true;
  openFormModal({
    title: reward ? 'Reward' : 'New reward',
    subtitle: reward ? `Reward #${reward.id} · redeemed ${plural(used, 'time')}` : 'Panelists can exchange their points for it once it is active.',
    body: `
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label" for="rwName">Name</label>
          <input class="form-control" id="rwName" name="name" required maxlength="80" value="${reward ? escapeHtml(reward.name) : ''}" placeholder="e.g. IKEA - gift card">
          <div class="invalid-feedback">Enter a name.</div>
        </div>
        <div class="col-12">
          <label class="form-label" for="rwPanel">Panel</label>
          <select class="form-select" id="rwPanel" name="panel" required>
            <option value="">Select a panel</option>
            ${optionsHtml(PANEL_INFO.map((p) => [p.slug, panelLabel(p)]), reward ? reward.panel : '')}
          </select>
          <div class="invalid-feedback">Select a panel.</div>
        </div>
        <div class="col-6">
          <label class="form-label" for="rwPoints">Points</label>
          <input class="form-control" type="number" id="rwPoints" name="points" required min="1" max="1000000" step="1" value="${reward ? reward.points : ''}">
          <div class="invalid-feedback">Enter the points needed (a whole number above 0).</div>
        </div>
        <div class="col-6">
          <span class="form-label d-block" id="rwActiveLabel">Active</span>
          <div class="segmented seg-field" role="group" aria-labelledby="rwActiveLabel" data-rw-active>
            <button type="button" data-value="1" class="${active ? 'active' : ''}" aria-pressed="${active}">Yes</button>
            <button type="button" data-value="0" class="${active ? '' : 'active'}" aria-pressed="${!active}">No</button>
          </div>
        </div>
        <div class="col-6">
          <label class="form-label" for="rwValue">Currency value</label>
          <input class="form-control" type="number" id="rwValue" name="value" required min="0.01" max="100000000" step="0.01" value="${reward ? reward.value : ''}">
          <div class="invalid-feedback">Enter the value.</div>
        </div>
        <div class="col-6">
          <label class="form-label" for="rwCurrency">Currency code</label>
          <input class="form-control" id="rwCurrency" name="currency" required maxlength="4" pattern="\\S{2,4}" value="${reward ? escapeHtml(reward.currency) : ''}" placeholder="e.g. EUR" autocapitalize="characters">
          <div class="invalid-feedback">Enter a 2–4 letter code.</div>
        </div>
        <div class="col-12">
          <label class="form-label" for="rwCountriesInput">Countries</label>
          <div id="rwCountries"></div>
          <div class="invalid-feedback" id="rwCountriesFeedback">Select at least one country.</div>
        </div>
      </div>`,
    submitLabel: reward ? '<i class="bi bi-check2"></i> Save' : '<i class="bi bi-plus-lg"></i> Create reward',
    onSubmit: (form) => {
      const countries = picker.getValue();
      picker.setInvalid(!countries.length);
      $('#rwCountriesFeedback').classList.toggle('d-block', !countries.length);
      if (!countries.length) {
        $('#rwCountriesInput').focus();
        return false;
      }
      const data = {
        name: form.elements.name.value.trim(),
        panel: form.elements.panel.value,
        points: Math.round(Number(form.elements.points.value)),
        value: Number(form.elements.value.value),
        currency: form.elements.currency.value.trim().toUpperCase(),
        countries,
        active: $('[data-rw-active] .active', form).dataset.value === '1',
      };
      if (reward) {
        Object.assign(reward, data);
        rw.flashId = reward.id;
        showToast(`${data.name} saved.`);
      } else {
        const created = { id: Math.max(0, ...rewards.map((x) => x.id)) + 1, ...data };
        rewards.push(created);
        Object.assign(rw, { sortKey: 'id', sortDir: 'asc', page: Infinity, flashId: created.id });
        if (rw.country && !countries.includes(rw.country)) rw.country = '';
        showToast(`${data.name} created.`);
      }
      if (currentView === 'rewards') renderRewards();
      return true;
    },
  });
  const picker = createMultiSelect($('#rwCountries'), {
    id: 'rwCountriesInput',
    options: countryOptions().map(([value, label]) => ({ value, label })),
    selected: reward ? reward.countries : [],
    placeholder: 'Select countries…',
    onChange: (value) => {
      if (value.length) {
        picker.setInvalid(false);
        $('#rwCountriesFeedback').classList.remove('d-block');
      }
    },
  });
  $('#pvModalBody').onclick = (e) => {
    const btn = e.target.closest('[data-rw-active] button');
    if (!btn) return;
    $$('[data-rw-active] button').forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
  };
}

/* ---------- Redeem ---------- */
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
