'use strict';

// Vendor info modal, opened by clicking a vendor name on Project vendors.

// Yes/No settings: [key, label, default].
const VENDOR_SWITCHES = [
  ['recaptcha', 'reCAPTCHA enabled', false], ['screener', 'Show screener', true], ['poll', 'Show post poll', true],
  ['s2s', 'Server to server call', false], ['redirect', 'Auto redirect', true],
];
// Screen texts: [key, label, ticked by default, default text]. Ticking one shows its text box.
const VENDOR_TEXTS = [
  ['intro', 'Intro screen text', false, ''], ['terminate', 'Terminate & quotafull screen text', false, ''],
  ['complete', 'Complete screen text', true, 'Thank you for completing this survey!'], ['closed', 'Closed screen text', false, ''],
];

function vendorInfo(v) {
  v.info = v.info || {
    ...Object.fromEntries(VENDOR_SWITCHES.map(([key, , on]) => [key, on])),
    texts: Object.fromEntries(VENDOR_TEXTS.map(([key, , on, text]) => [key, { on, text }])),
  };
  return v.info;
}

// The vendor's entry link, plus the same link in the vendor's own format if the Vendors page has one for it.
function vendorLinks(p, v) {
  const link = `https://fwredirect.com/v/${token(15, seeded(p.id * 977 + v.id).next)}`;
  const format = vendorRegistry.find((x) => x.name === v.name)?.liveLink || `{LIVE_LINK}?vid=${v.id}&rid={RID}`;
  return { link, formatted: format.replace('{LIVE_LINK}', link) };
}

function openVendorInfo(id) {
  const p = pv.project;
  const v = p.detail.vendors.find((x) => x.id === id);
  const info = vendorInfo(v);
  const { link, formatted } = vendorLinks(p, v);
  const yesNo = (key, label) => `
    <div class="vi-row">
      <span class="vi-label" id="vi-${key}-label">${label}</span>
      <div class="segmented seg-sm" role="group" aria-labelledby="vi-${key}-label" data-vi-switch="${key}">
        <button type="button" data-value="1" class="${info[key] ? 'active' : ''}" aria-pressed="${info[key]}">Yes</button>
        <button type="button" data-value="0" class="${info[key] ? '' : 'active'}" aria-pressed="${!info[key]}">No</button>
      </div>
    </div>`;
  const textBox = (key, label) => {
    const { on, text } = info.texts[key];
    return `
      <div class="vi-text">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="vi-${key}" data-vi-text="${key}" ${on ? 'checked' : ''}>
          <label class="form-check-label" for="vi-${key}">${label}</label>
        </div>
        <textarea class="form-control" id="vi-${key}-text" rows="3" maxlength="2000" aria-label="${label}"
                  placeholder="Enter the ${label.toLowerCase()}" ${on ? '' : 'hidden'}>${escapeHtml(text)}</textarea>
      </div>`;
  };
  const linkRow = (label, value) => `
    <div class="vi-row">
      <span class="vi-label">${label}</span>
      <div class="vi-link">
        <span class="mono">${escapeHtml(value)}</span>
        <button type="button" class="icon-btn-sm" data-vi-copy="${escapeHtml(value)}" title="Copy" aria-label="Copy ${label.toLowerCase()}"><i class="bi bi-copy"></i></button>
      </div>
    </div>`;

  openFormModal({
    title: 'Vendor info',
    subtitle: `${v.name} · ${p.name}`,
    wide: true,
    body: `
      <div class="vi-form">
        <div class="vi-row">
          <label class="vi-label" for="viVendor">Vendor</label>
          <select class="form-select vi-vendor" id="viVendor" disabled><option>${escapeHtml(v.name)}</option></select>
        </div>
        <div class="vi-switches">${VENDOR_SWITCHES.map(([key, label]) => yesNo(key, label)).join('')}</div>
        <div class="vi-texts">${VENDOR_TEXTS.map(([key, label]) => textBox(key, label)).join('')}</div>
        <div class="vi-row">
          <label class="vi-label" for="viStatus">Status</label>
          <select class="form-select vi-status" id="viStatus">${optionsHtml(ENTITY_STATUSES.map((s) => [s, s]), v.status)}</select>
        </div>
        ${linkRow('Vendor live link', link)}
        ${linkRow('Vendor live link formatted', formatted)}
      </div>`,
    submitLabel: '<i class="bi bi-check2"></i> Save',
    onSubmit: () => {
      VENDOR_SWITCHES.forEach(([key]) => { info[key] = $(`[data-vi-switch="${key}"] .active`).dataset.value === '1'; });
      VENDOR_TEXTS.forEach(([key]) => {
        info.texts[key] = { on: $(`#vi-${key}`).checked, text: $(`#vi-${key}-text`).value.trim() };
      });
      v.status = $('#viStatus').value;
      renderPanel('vendors');
      showToast(`${v.name} saved.`);
      return true;
    },
  });
  $('#pvModalBody').onclick = (e) => {
    const yes = e.target.closest('[data-vi-switch] button');
    if (yes) {
      $$('button', yes.parentElement).forEach((b) => {
        b.classList.toggle('active', b === yes);
        b.setAttribute('aria-pressed', String(b === yes));
      });
      return;
    }
    const tick = e.target.closest('[data-vi-text]');
    if (tick) {
      const box = $(`#vi-${tick.dataset.viText}-text`);
      box.hidden = !tick.checked;
      if (tick.checked) box.focus();
      return;
    }
    const copy = e.target.closest('[data-vi-copy]');
    if (copy) copyText(copy.dataset.viCopy, 'Link copied.');
  };
}
